import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'apps/web/dist');
const reportPath = join(root, 'docs/build-size-report.md');
const budgetBytes = 300 * 1000;

if (!existsSync(join(dist, 'index.html'))) {
  console.error('Build first: pnpm --filter @circuits/web build');
  process.exit(1);
}

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const initialScripts = new Set(
  [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => match[1]),
);
for (const match of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g)) {
  initialScripts.add(match[1]);
}
const initialStyles = new Set(
  [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((match) => match[1]),
);

const files = walk(join(dist, 'assets')).map((path) => {
  const buffer = readFileSync(path);
  const archive = gzipSync(buffer);
  return {
    path,
    url: `/${relative(dist, path).split('\\').join('/')}`,
    ext: extname(path),
    rawBytes: buffer.byteLength,
    gzipBytes: archive.byteLength,
    initial:
      initialScripts.has(`/${relative(dist, path).split('\\').join('/')}`) ||
      initialStyles.has(`/${relative(dist, path).split('\\').join('/')}`),
    gzip: archive,
  };
});

const initialJs = files.filter((file) => file.initial && file.ext === '.js');
const initialCss = files.filter((file) => file.initial && file.ext === '.css');
const initialJsBytes = sum(initialJs, 'gzipBytes');
const initialCssBytes = sum(initialCss, 'gzipBytes');
const lazyChunks = files.filter(
  (file) => file.ext === '.js' && !file.initial,
);
const lazyStyles = files.filter(
  (file) => file.ext === '.css' && !file.initial,
);
const bitmapAssets = files.filter((file) =>
  ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(file.ext),
);
const levelMarker = 'light-02-wire-1';
const initialCode = initialJs
  .map((file) => readFileSync(file.path, 'utf8'))
  .join('\n');
const lazyCode = lazyChunks
  .map((file) => readFileSync(file.path, 'utf8'))
  .join('\n');
const levelDataInInitial = initialCode.includes(levelMarker);
const levelDataLazy = lazyCode.includes(levelMarker);
const ok =
  initialJsBytes <= budgetBytes &&
  bitmapAssets.length === 0 &&
  !levelDataInInitial &&
  levelDataLazy;

const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

const lines = [
  '# Rapport de taille des ressources',
  '',
  `Généré le ${generatedAt} UTC depuis \`apps/web/dist\`.`,
  '',
  '## Budget du premier écran',
  '',
  '| Mesure | Taille gzip | Budget | État |',
  '|---|---:|---:|:---:|',
  `| JavaScript initial | ${format(initialJsBytes)} | 300 Ko | ${initialJsBytes <= budgetBytes ? 'OK' : 'DÉPASSÉ'} |`,
  `| CSS initial | ${format(initialCssBytes)} | — | information |`,
  `| Total JS + CSS initial | ${format(initialJsBytes + initialCssBytes)} | — | information |`,
  '',
  'Le JavaScript initial est le script module référencé par `index.html`.',
  '`GameShell` (écrans de jeu et définitions de niveaux), `AdminApp` et',
  '`ParentSettingsPage` sont des importations dynamiques : elles ne sont',
  'téléchargées qu’à l’ouverture de leur route.',
  '',
  '## JavaScript initial',
  '',
  '| Fichier | Brut | Gzip |',
  '|---|---:|---:|',
  ...initialJs.map(
    (file) => `| \`${file.url}\` | ${format(file.rawBytes)} | ${format(file.gzipBytes)} |`,
  ),
  '',
  '## CSS initial',
  '',
  '| Fichier | Brut | Gzip |',
  '|---|---:|---:|',
  ...initialCss.map(
    (file) => `| \`${file.url}\` | ${format(file.rawBytes)} | ${format(file.gzipBytes)} |`,
  ),
  '',
  '## JavaScript chargé à la demande',
  '',
  'Ces fichiers ne sont pas présents sur le premier écran.',
  '',
  '| Fichier | Brut | Gzip |',
  '|---|---:|---:|',
  ...lazyChunks.map(
    (file) => `| \`${file.url}\` | ${format(file.rawBytes)} | ${format(file.gzipBytes)} |`,
  ),
  '',
  '## CSS chargé à la demande',
  '',
  '| Fichier | Brut | Gzip |',
  '|---|---:|---:|',
  ...lazyStyles.map(
    (file) => `| \`${file.url}\` | ${format(file.rawBytes)} | ${format(file.gzipBytes)} |`,
  ),
  '',
  '## Polices auto-hébergées',
  '',
  '| Fichier | Brut | Gzip |',
  '|---|---:|---:|',
  ...files
    .filter((file) => file.ext === '.woff2')
    .map(
      (file) => `| \`${file.url}\` | ${format(file.rawBytes)} | ${format(file.gzipBytes)} |`,
    ),
  '',
  '## Vérifications',
  '',
  `- Images bitmap dans le build : ${bitmapAssets.length === 0 ? 'aucune (tout est en SVG)' : bitmapAssets.map((file) => file.url).join(', ')}`,
  '- Les vignettes de l’atelier sont des images créées par l’enfant à la volée ;',
  '  elles ne font pas partie du build.',
  `- JavaScript initial sous 300 Ko gzip : ${initialJsBytes <= budgetBytes ? 'oui' : 'non'}`,
  `- Données complètes des niveaux hors du JavaScript initial : ${levelDataInInitial ? 'non' : 'oui'}`,
  `- Données complètes des niveaux dans un module différé : ${levelDataLazy ? 'oui' : 'non'}`,
  '',
];

mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(reportPath, lines.join('\n'));

console.log(
  `Rapport écrit dans ${relative(root, reportPath)} : ${format(initialJsBytes)} de JS initial (gzip).`,
);

if (!ok) {
  process.exitCode = 1;
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function sum(items, key) {
  return items.reduce((total, item) => total + item[key], 0);
}

function format(bytes) {
  return `${(bytes / 1000).toFixed(2)} Ko`;
}

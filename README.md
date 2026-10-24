# Les Circuits de Zap

Jeu web d'initiation aux circuits électriques pour les enfants de 8 ans.

Monorepo pnpm :

| Paquet | Rôle |
|---|---|
| `apps/web` | Front React 18 + Vite + Zustand + framer-motion |
| `apps/api` | API Node 20 + Fastify 4 |
| `packages/shared` | Moteur de circuit, niveaux, règles et schémas partagés |

## Prérequis

- Node.js 20 ou plus récent (`nvm use` lit `.nvmrc`)
- pnpm 10 ou plus récent

## Démarrage

```bash
pnpm install
pnpm dev
```

- Front : http://127.0.0.1:5173/
- API de développement : http://127.0.0.1:3101/api/health

Le serveur Vite redirige `/api` vers l'API locale (port 3101). L'API de
production tourne séparément dans Docker sur le port 3100.

## Commandes

```bash
pnpm dev        # front + api + veille de packages/shared
pnpm test       # tests de tous les paquets
pnpm typecheck  # vérification TypeScript de tous les paquets
pnpm build      # build de production de tous les paquets
pnpm verify     # typecheck + tests + build
```

## Moteur de circuit

`@circuits/shared` expose un moteur pur TypeScript, sans React ni DOM :

- `createComponent(type, options)` et `createWire(id, from, to)`
- `simulateCircuit(circuit)` : courants des composants et des fils, états qualitatifs
  (`off`, `dim`, `normal`, `bright`) et diagnostics
- `describeCircuit(circuit)` : court-circuit, circuit ouvert, interrupteur ouvert,
  LED inversée, matériau isolant, terminal non connecté
- `serializeCircuit(circuit)` / `deserializeCircuit(json)` : format JSON versionné

Les tests couvrent le circuit simple, le série, le parallèle, les courts-circuits,
les LED, les matériaux conducteurs/isolants et la sérialisation.

## Plan de travail

Le bouton « Jouer » ouvre le plan de travail :

- palette de composants avec glisser-déposer et aimantation à la grille ;
- câblage par deux appuis sur des bornes, ou en glissant d'une borne à l'autre ;
- sélection d'un composant avec rotation et suppression, interrupteurs activables
  d'un simple appui ;
- suppression par glisser vers la corbeille et bouton d'annulation ;
- trois affichages : réaliste, symboles normalisés, ou les deux côte à côte ;
- ampoule, moteur, buzzer et LED réagissent au courant ; le court-circuit secoue
  la pile et fait clignoter le fil responsable ;
- petits points jaunes animés sur les fils, dans le sens du courant et à une vitesse
  proportionnelle à son intensité.

Le moteur recalcule le circuit après chaque modification ; pendant un déplacement,
seul l'aperçu visuel bouge.

## Narration et Zap

Tous les textes français sont dans `apps/web/src/narration/fr.ts`, indexés par un
identifiant (`zap.hint.open.1`, `workbench.statusClosed`, etc.).

- La voix utilise la Web Speech API en `fr-FR`, avec une préférence pour les voix
  Google, Amélie et Thomas, un débit de 0,9 et une hauteur légèrement plus aiguë.
  La liste `voiceschanged` est écoutée pour iOS.
- Si un enregistrement existe, `/audio/{textId}.mp3` est préféré à la synthèse.
  Pour l'activer, déposer le MP3 dans `apps/web/public/audio/` et ajouter son
  identifiant dans `apps/web/public/audio/manifest.json`.
- Sans voix française, la bulle de texte reste visible.
- Le premier appui sur « Jouer » débloque l'audio (son silencieux + `speak('')`).
- Zap est dans le coin du plan de travail : appuyer sur le robot donne un indice
  de plus en plus précis. Le troisième indice surligne les bornes ou le composant
  concerné. Le bouton 🔊 permet de réécouter, et le bouton haut-parleur coupe
  tout le son.
- La page qui passe en arrière-plan arrête la narration ; elle ne reprend pas
  automatiquement.

## Déploiement

L'application est publiée sous `https://circuit-learning.87543362.xyz/`.

- Le front est compilé pour la racine du domaine puis copié dans
  `/srv/circuits/web` (servi par Caddy).
- L'API tourne dans Docker Compose et écoute uniquement sur `127.0.0.1:3100`.
- Caddy sert le front à la racine et `/api/*` en reverse proxy. Le bloc de site
  est fourni dans `deploy/caddy/circuit-learning.caddy`.
- Les anciennes URL `kulmb.87543362.xyz/circuit/*` redirigent en 301 vers le
  nouveau domaine.

```bash
# Une seule fois : créer le dossier servi par Caddy
sudo install -d -o "$(id -un)" -g "$(id -gn)" -m 755 /srv/circuits/web

# Déployer l'API et le front
./scripts/deploy.sh
```

Vérification :

```bash
curl -fsS https://circuit-learning.87543362.xyz/api/health
```

## Notes

- La police Nunito est auto-hébergée dans `apps/web/src/assets/fonts` (licence OFL) :
  aucune ressource n'est chargée depuis un CDN.
- Les secrets et fichiers d'environnement ne sont jamais versionnés.

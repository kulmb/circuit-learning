# Rapport de taille des ressources

Généré le 2026-10-25 15:30 UTC depuis `apps/web/dist`.

## Budget du premier écran

| Mesure | Taille gzip | Budget | État |
|---|---:|---:|:---:|
| JavaScript initial | 130.18 Ko | 300 Ko | OK |
| CSS initial | 4.26 Ko | — | information |
| Total JS + CSS initial | 134.44 Ko | — | information |

Le JavaScript initial est le script module référencé par `index.html`.
`GameShell` (écrans de jeu et définitions de niveaux), `AdminApp` et
`ParentSettingsPage` sont des importations dynamiques : elles ne sont
téléchargées qu’à l’ouverture de leur route.

## JavaScript initial

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/index-DLJzdwuY.js` | 428.88 Ko | 130.18 Ko |

## CSS initial

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/index-Dx_jN9hy.css` | 15.96 Ko | 4.26 Ko |

## JavaScript chargé à la demande

Ces fichiers ne sont pas présents sur le premier écran.

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/AdminApp-BxZoQzVZ.js` | 429.71 Ko | 117.53 Ko |
| `/assets/GameShell-BVMhXs3V.js` | 125.77 Ko | 35.87 Ko |
| `/assets/ParentSettingsPage-CrYWwSyK.js` | 6.51 Ko | 1.69 Ko |
| `/assets/haptics-k8aB_QHZ.js` | 0.28 Ko | 0.21 Ko |
| `/assets/levels-DxwijXU1.js` | 28.55 Ko | 5.56 Ko |
| `/assets/workbox-window.prod.es5-BqEJf4Xk.js` | 5.71 Ko | 2.34 Ko |

## CSS chargé à la demande

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/AdminApp-GZt0Yr8w.css` | 16.96 Ko | 3.87 Ko |
| `/assets/GameShell-_6woonKC.css` | 54.69 Ko | 9.51 Ko |
| `/assets/ParentSettingsPage-wph3yc7p.css` | 6.17 Ko | 1.52 Ko |

## Fichiers PWA

Entrées préchargées par Workbox : 28.

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/manifest.webmanifest` | 0.87 Ko | 0.35 Ko |
| `/sw.js` | 3.10 Ko | 1.50 Ko |
| `/workbox-0fb4b014.js` | 22.88 Ko | 7.73 Ko |

## Polices auto-hébergées

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/nunito-latin-ext-wght-normal-CXYtwYOx.woff2` | 35.59 Ko | 35.62 Ko |
| `/assets/nunito-latin-wght-normal-BzFMHfZw.woff2` | 39.13 Ko | 39.16 Ko |

## Vérifications

- Illustrations du jeu en bitmap : aucune (SVG uniquement)
- Icônes PWA PNG (iOS et maskable) : 10, générées depuis `/icons/icon.svg`.
- Les vignettes de l’atelier sont des images créées par l’enfant à la volée ;
  elles ne font pas partie du build.
- JavaScript initial sous 300 Ko gzip : oui
- Données complètes des niveaux hors du JavaScript initial : oui
- Données complètes des niveaux dans un module différé : oui
- Entrées précachées par le service worker : 28
- Les réponses API personnelles sont en `Cache-Control: no-store` ; seul `/api/health` est public et cachable.

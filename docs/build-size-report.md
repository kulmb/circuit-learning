# Rapport de taille des ressources

Généré le 2026-10-24 16:55 UTC depuis `apps/web/dist`.

## Budget du premier écran

| Mesure | Taille gzip | Budget | État |
|---|---:|---:|:---:|
| JavaScript initial | 124.97 Ko | 300 Ko | OK |
| CSS initial | 3.71 Ko | — | information |
| Total JS + CSS initial | 128.68 Ko | — | information |

Le JavaScript initial est le script module référencé par `index.html`.
`GameShell` (écrans de jeu et définitions de niveaux), `AdminApp` et
`ParentSettingsPage` sont des importations dynamiques : elles ne sont
téléchargées qu’à l’ouverture de leur route.

## JavaScript initial

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/index-D7WXPaj4.js` | 407.81 Ko | 124.97 Ko |

## CSS initial

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/index-BxV6-47d.css` | 12.75 Ko | 3.71 Ko |

## JavaScript chargé à la demande

Ces fichiers ne sont pas présents sur le premier écran.

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/AdminApp-Ce4gr3A6.js` | 429.42 Ko | 117.44 Ko |
| `/assets/GameShell-maWfBO-h.js` | 107.19 Ko | 29.86 Ko |
| `/assets/ParentSettingsPage-B02ekBHL.js` | 6.51 Ko | 1.68 Ko |
| `/assets/haptics-CeX1U2nY.js` | 0.28 Ko | 0.21 Ko |
| `/assets/levels-Dy_0fid-.js` | 8.74 Ko | 2.12 Ko |
| `/assets/workbox-window.prod.es5-BqEJf4Xk.js` | 5.71 Ko | 2.34 Ko |

## CSS chargé à la demande

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/AdminApp-DvgUKgpy.css` | 16.81 Ko | 3.83 Ko |
| `/assets/GameShell-CPh2F4o0.css` | 51.70 Ko | 8.81 Ko |
| `/assets/ParentSettingsPage-wph3yc7p.css` | 6.17 Ko | 1.52 Ko |

## Fichiers PWA

Entrées préchargées par Workbox : 28.

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/manifest.webmanifest` | 0.87 Ko | 0.35 Ko |
| `/sw.js` | 3.08 Ko | 1.48 Ko |
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

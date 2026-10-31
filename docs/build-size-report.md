# Rapport de taille des ressources

Généré le 2026-10-31 14:26 UTC depuis `apps/web/dist`.

## Budget du premier écran

| Mesure | Taille gzip | Budget | État |
|---|---:|---:|:---:|
| JavaScript initial | 168.12 Ko | 300 Ko | OK |
| CSS initial | 4.78 Ko | — | information |
| Total JS + CSS initial | 172.91 Ko | — | information |

Le JavaScript initial est le script module référencé par `index.html`.
`GameShell` (écrans de jeu et définitions de niveaux), `AdminApp` et
`ParentSettingsPage` sont des importations dynamiques : elles ne sont
téléchargées qu’à l’ouverture de leur route.

## JavaScript initial

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/index-DleI1wo-.js` | 560.63 Ko | 168.12 Ko |

## CSS initial

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/index-CnaTKrCR.css` | 18.26 Ko | 4.78 Ko |

## JavaScript chargé à la demande

Ces fichiers ne sont pas présents sur le premier écran.

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/AdminApp-_JsfzXd_.js` | 453.42 Ko | 125.42 Ko |
| `/assets/GameShell-Bu9U0hNt.js` | 142.78 Ko | 39.73 Ko |
| `/assets/ParentSettingsPage-DpJTpUgC.js` | 6.54 Ko | 1.70 Ko |
| `/assets/haptics-C3XkECzL.js` | 0.28 Ko | 0.21 Ko |
| `/assets/levels-BAKbuD0K.js` | 49.47 Ko | 10.03 Ko |
| `/assets/workbox-window.prod.es5-BqEJf4Xk.js` | 5.71 Ko | 2.34 Ko |

## CSS chargé à la demande

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/AdminApp-CApOn6fC.css` | 17.30 Ko | 4.01 Ko |
| `/assets/GameShell-D5FI5NVh.css` | 55.33 Ko | 9.60 Ko |
| `/assets/ParentSettingsPage-CmvvkCYX.css` | 6.27 Ko | 1.55 Ko |

## Fichiers PWA

Entrées préchargées par Workbox : 28.

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/manifest.webmanifest` | 0.87 Ko | 0.35 Ko |
| `/sw.js` | 3.10 Ko | 1.49 Ko |
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

# Rapport de taille des ressources

Généré le 2026-10-24 16:37 UTC depuis `apps/web/dist`.

## Budget du premier écran

| Mesure | Taille gzip | Budget | État |
|---|---:|---:|:---:|
| JavaScript initial | 124.32 Ko | 300 Ko | OK |
| CSS initial | 3.71 Ko | — | information |
| Total JS + CSS initial | 128.03 Ko | — | information |

Le JavaScript initial est le script module référencé par `index.html`.
`GameShell` (écrans de jeu et définitions de niveaux), `AdminApp` et
`ParentSettingsPage` sont des importations dynamiques : elles ne sont
téléchargées qu’à l’ouverture de leur route.

## JavaScript initial

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/index-BBPtw5EV.js` | 406.14 Ko | 124.32 Ko |

## CSS initial

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/index-BxV6-47d.css` | 12.75 Ko | 3.71 Ko |

## JavaScript chargé à la demande

Ces fichiers ne sont pas présents sur le premier écran.

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/AdminApp-Cx3wA12C.js` | 426.39 Ko | 116.64 Ko |
| `/assets/GameShell-s2Oo-_oK.js` | 106.91 Ko | 29.79 Ko |
| `/assets/ParentSettingsPage-CX8NI_gM.js` | 6.51 Ko | 1.68 Ko |
| `/assets/haptics-DkSb7DuL.js` | 0.28 Ko | 0.21 Ko |
| `/assets/levels-EGkmjaGq.js` | 8.74 Ko | 2.12 Ko |

## CSS chargé à la demande

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/AdminApp-CITrau_S.css` | 16.07 Ko | 3.71 Ko |
| `/assets/GameShell-a6tiqE93.css` | 51.00 Ko | 8.72 Ko |
| `/assets/ParentSettingsPage-wph3yc7p.css` | 6.17 Ko | 1.52 Ko |

## Polices auto-hébergées

| Fichier | Brut | Gzip |
|---|---:|---:|
| `/assets/nunito-latin-ext-wght-normal-CXYtwYOx.woff2` | 35.59 Ko | 35.62 Ko |
| `/assets/nunito-latin-wght-normal-BzFMHfZw.woff2` | 39.13 Ko | 39.16 Ko |

## Vérifications

- Images bitmap dans le build : aucune (tout est en SVG)
- Les vignettes de l’atelier sont des images créées par l’enfant à la volée ;
  elles ne font pas partie du build.
- JavaScript initial sous 300 Ko gzip : oui
- Données complètes des niveaux hors du JavaScript initial : oui
- Données complètes des niveaux dans un module différé : oui

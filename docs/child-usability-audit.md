# Audit d’utilisabilité enfant

Date : 24 octobre 2026. Cible : enfant de 8 ans, CE2.

## Méthode

- Chromium headless, cinq tailles : 1280 × 800, 768 × 1024, 740 × 360,
  568 × 320 et 390 × 844.
- Parcours automatisé : accueil, connexion au code de groupe, carte invitée,
  collection, atelier libre, panneau « Mon atelier », niveau 1 et écran
  « Tourne ton téléphone ».
- Mesure de chaque bouton visible : largeur, hauteur, position, débordement
  horizontal, texte accessible.
- Vérification du `scrollWidth` de la page et des boutons coupés sur les bords.
- Lecture des sources pour les interactions, le texte en dur et les animations.
- `childTexts.test.ts` vérifie les phrases de 12 mots maximum et l’absence de
  mots anglais évidents.
- Vérification orthographique française avec Hunspell (`fr_FR`).
- Test automatisé du dépôt de composant hors du plan.

## Résultats automatisés

| Vue | 1280 × 800 | 768 × 1024 | 740 × 360 | 568 × 320 | 390 × 844 |
|---|---|---|---|---|---|
| Accueil | 4 actions | 4 | 4 | 4 | 4 |
| Connexion | 4 actions | 4 | 4 | 4 | 4 |
| Carte | 3 actions | 3 | 3 | 3 | 3 |
| Collection | 1 action | 1 | 1 | 1 | 1 |
| Panneau atelier | 4 actions | 4 | 4 | 4 | — |
| Tableau de travail | 3 actions | 3 | 5 | 5 | rotation |
| Atelier libre | 4 actions | 4 | 5 | 5 | rotation |

- Boutons HTML sous la taille minimale : **0 sur les écrans parcourus**.
  Le minimum appliqué est 48 px, ou 56 px en compact.
- Débordement horizontal de page : **aucun**.
- Bouton coupé horizontalement : **aucun**.
- Texte anglais détecté à l’écran : **aucun**.

Les touches du pavé de code, les cartes de niveaux/élèves/images, la palette de
composants, les cartes de matériaux et les créations de l’atelier sont du
contenu manipulable, pas des commandes de page. Les commandes de la bulle de
Zap (aide, son, réécoute) appartiennent au guide. Avec cette distinction, chaque
écran garde **au plus 5 commandes de page**. Le panneau de l’atelier en compte
4 : Fermer, Enregistrer, Prendre une photo, Tout effacer.

## Corrections apportées

| Problème | Correction |
|---|---|
| Pavé de code compact : 32 touches de ~33 px de large | Grille automatique `minmax(56px, 1fr)`, touches de 56 px minimum, plusieurs lignes, bouton invité remonté avant le pavé |
| Bouton mute de Zap : 44 px | 56 px en compact, 48 px sur tablette portrait |
| « Au revoir » de la carte : 40 px | 48 px, 56 px en compact |
| Collection / atelier de la carte : 48 px en compact | 56 px en compact |
| Retour de la collection : 52 px en compact | 56 px en compact |
| Fermer le panneau atelier : 52 px en compact | 56 px en compact |
| Créations de l’atelier : 48 px en compact | 56 px en compact |
| Fermer les consignes : 48 px en compact | 56 px en compact |
| Barre d’outils SVG Tourner/Supprimer : 29 px à 568 × 320 | Taille recalculée à partir de l’échelle réelle : mesurée à **56 × 56 px** |
| Texte en dur « Aucun élève… » | Déplacé dans `fr.ts` (`login.emptyGroup`) |
| « Buzzer » | Remplacé par « Sonnerie » |
| Fond encore interactif sous un panneau atelier | `inert` + `aria-hidden` sur le plan tant qu’une boîte modale est ouverte |
| « Ta progression ne sera pas gardée » | « Ta progression reste sur cet appareil. » |
| Retour des niveaux matériaux/symboles nommé « Accueil » | « Carte des niveaux » |

Le sélecteur de composants et la barre d’outils SVG utilisent désormais
`viewportScale` : à très petite échelle, les boutons grandissent dans le SVG
pour conserver 56 px à l’écran. Les icônes et espacements grandissent avec eux.

## Texte et langue

- 296 chaînes enfant ont été extraites de `fr.ts`.
- Le test vérifie que chaque phrase fait **12 mots ou moins**.
- Hunspell ne signale que « Zap », nom propre.
- Une seule chaîne enfant était encore en dur dans un composant ; elle a été
  déplacée dans `fr.ts`.
- Les mots anglais évidents sont contrôlés par test et par lecture du DOM.
- Les acronymes conservés sont ceux du cours : LED, A/K.

## Interactions

- Aucun `onClick`, `onMouse*`, `onTouch*`, `onDoubleClick` ou gestionnaire
  clavier dans les écrans enfants. Tout passe par les Pointer Events.
- Le clic droit est neutralisé sur le plan ; aucune action n’en dépend.
- Le survol n’ajoute qu’un léger éclat visuel sur ordinateur.
- Le test « retour de la palette » vérifie qu’un composant lâché hors du plan
  n’est pas ajouté et qu’un fantôme de retour est animé, sans erreur.

## Animations

- Court-circuit : cycle de **1,2 s**, soit moins d’un clignotement par seconde
  (limite demandée : moins de 3 par seconde).
- Vagues de chaleur et buzzer : 1,2 s. Secousse de pile : 0,9 s.
- Points de courant : entre 0,5 s et 1,6 s selon l’intensité.
- `prefers-reduced-motion` et le mode faible performance suppriment les
  animations non essentielles.

## Limites documentées

- À 568 × 320, le plan entier tient dans environ 224 × 144 px. Les bornes et les
  composants dessinés sont donc plus petits que 56 px à l’écran. Le plan passe
  automatiquement en mode déplaçable/zoomable, la zone d’aimantation des bornes
  est de 40 px en compact, et le pincement agrandit les bornes. La barre d’outils
  de sélection, elle, reste à 56 px.
- Aucune encoche réelle n’était disponible dans Chromium headless. Les marges
  `env(safe-area-inset-*)` ont été vérifiées dans les feuilles de style et aucun
  bouton n’était coupé aux cinq tailles testées.
- Les parcours multi-appareils sont couverts par Playwright (voir
  `TESTING.md`). Les contrôles sur iPad, Galaxy Tab et téléphones physiques
  restent manuels.

## Vérifications

- `pnpm verify` (typecheck, tests, build).
- Tests navigateur ci-dessus et captures dans `/tmp` pendant l’audit.
- Build sans avertissement Vite, PWA ou TypeScript.

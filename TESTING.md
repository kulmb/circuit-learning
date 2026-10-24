# Tests et vérifications sur appareils

Mise à jour : 24 octobre 2026.

La suite automatisée couvre les parcours adultes et enfants sur sept profils de
navigateur. Les contrôles qui dépendent du matériel réel (voix, gestes, PWA)
restent à faire sur les appareils de l’école.

## Suite automatisée

La première installation des navigateurs Playwright se fait une seule fois par
machine (Ubuntu aarch64) :

```bash
pnpm exec playwright install --with-deps chromium webkit
```

Puis :

```bash
pnpm test:e2e
```

La commande construit `@circuits/shared` et le front, puis lance Playwright.
Pour ne lancer qu’un appareil ou qu’un scénario :

```bash
pnpm exec playwright test --project=ipad-landscape
pnpm exec playwright test --project=galaxy-tab-s4 --grep "hors ligne"
```

Le rapport HTML est écrit dans `playwright-report/`. Une trace, une capture et
une vidéo sont conservées dans `test-results/` quand un test échoue.

### Profils Playwright

| Projet | Appareil | Fenêtre | Moteur | Mise en page |
|---|---|---|---|---|
| `desktop-chrome` | Desktop Chrome | 1280 × 800 | Chromium | large |
| `desktop-safari` | Desktop Safari | 1280 × 800 | WebKit | large |
| `ipad-landscape` | iPad (gen 7) paysage | 1080 × 810 | WebKit | medium paysage |
| `ipad-portrait` | iPad (gen 7) portrait | 810 × 1080 | WebKit | medium portrait |
| `galaxy-tab-s4` | Galaxy Tab S4 paysage | 1138 × 712 | Chromium | large |
| `iphone-13-landscape` | iPhone 13 paysage | 750 × 342 | WebKit | compact |
| `pixel-7-landscape` | Pixel 7 paysage | 863 × 360 | Chromium | compact |

Les quatre points de rupture sont donc couverts : large, medium paysage, medium
portrait et compact.

### Base de données de test

Playwright démarre `apps/api/test/e2e/server.ts`. Ce serveur :

- crée un replica set MongoDB **en mémoire** (`mongodb-memory-server`) ;
- utilise la base `circuits_e2e`, jamais la base locale ou de production ;
- crée des comptes et des groupes déterministes pour les tests ;
- écoute sur `127.0.0.1:3101`, derrière le proxy de `vite preview` sur
  `127.0.0.1:4174`.

Le serveur est arrêté à la fin de la suite. Deux enfants distincts sont prévus
pour chaque projet, afin qu’un projet ne dépende pas de la progression laissée
par un autre.

Comptes de test (mot de passe `Circuits-E2E-2026`) :

- `maitresse-a` : encadrante du groupe A ;
- `maitresse-b` : encadrante du groupe B ;
- `parent-lina` : parent de Lina ;
- code du groupe A : `AAAAAA`.

Les enfants de test utilisent la suite d’images Renard, Pomme, Ballon.

### Scénarios couverts

| Fichier | Vérification |
|---|---|
| `e2e/teacher.spec.ts` | Connexion encadrante, création d’un groupe, ajout d’un élève, affichage unique des images, fixation de l’appareil, puis connexion enfant sans code de groupe. |
| `e2e/child.spec.ts` | Connexion enfant avec code, avatar et trois images ; câblage par toucher et par glisser-déposer ; apparition des trois étoiles sur le niveau et sur la carte. |
| `e2e/offline.spec.ts` | Niveau terminé hors ligne, étoiles visibles depuis le cache, file d’attente locale, retour du réseau, progression `completed` sur le serveur et file vidée. |
| `e2e/parent.spec.ts` | Connexion parente sur téléphone, deux niveaux terminés, cinq étoiles, groupe et fiche de l’enfant accessibles. |
| `e2e/permissions.spec.ts` | L’encadrante B reçoit `403 forbidden` et un message d’accès refusé sur la fiche d’un élève du groupe A. |
| `e2e/screenshots.spec.ts` | Capture de la carte et de l’écran de niveau sur chaque appareil, avec contrôle du point de rupture. |

### Captures de référence

Les 14 captures (7 appareils × 2 écrans) sont dans
`e2e/__screenshots__/`. Elles sont comparées avec une tolérance de 1 % des
pixels et une échelle CSS, pour rester stables entre les densités d’écran.

Après un changement visuel volontaire :

```bash
pnpm test:e2e:update
```

Relire les images modifiées avant de les valider. Ne pas mettre à jour les
captures pour masquer une régression.

### Vérifications statiques

```bash
pnpm typecheck
pnpm test
pnpm build
```

`pnpm typecheck` inclut `tsc -p e2e/tsconfig.json`, donc les tests Playwright et
le serveur de test sont typés comme le reste du projet.

## Vérifications manuelles sur matériel réel

Ces contrôles ne peuvent pas être remplacés par l’émulation : le matériel, les
haut-parleurs, le commutateur silencieux et le système d’installation changent
le comportement.

### 1. iPad Safari — déverrouillage de la voix

1. Ouvrir le jeu dans Safari sur iPad, sans casque.
2. Vérifier qu’aucune voix ne démarre avant une action de l’enfant.
3. Toucher « Jouer » : Zap doit parler après ce geste.
4. Toucher « Réécouter » dans la bulle : la phrase doit être répétée.
5. Mettre le commutateur silencieux, puis relancer : la voix doit respecter le
   réglage du système ; les bulles restent lisibles.
6. Verrouiller puis déverrouiller l’iPad : la voix doit fonctionner de nouveau
   après un toucher.
7. Régler « Voix » sur Lent, Normal puis Rapide dans « Réglages parents » et
   vérifier que le débit change sans couper les phrases.

### 2. Tablette Android — fluidité du glisser

1. Ouvrir un niveau avec la palette sur Galaxy Tab S4 ou une tablette Android.
2. Glisser plusieurs composants depuis la palette avec un doigt, sans lever.
3. Vérifier que le composant suit le doigt, que la grille l’aimante et qu’un
   dépôt hors du plan le renvoie dans la palette.
4. Relier deux bornes au doigt, puis tester la connexion par deux touchers.
5. Vérifier qu’aucun défilement de page ni zoom involontaire ne se déclenche.
6. Activer « Mode faible performance » dans « Réglages parents » et refaire le
   geste : l’interface doit rester fluide et les animations réduites.
7. Vérifier qu’un appui long ne sélectionne pas le texte ou une image.

### 3. Téléphone — invitation à tourner

1. Ouvrir un niveau en portrait sur iPhone et sur Android.
2. Vérifier le message « Tourne ton téléphone » et l’absence de plan tronqué.
3. Tourner l’appareil : le plan doit apparaître en paysage sans rechargement.
4. Revenir en portrait : le message doit revenir.
5. Recommencer depuis la connexion et depuis l’atelier libre.

### 4. Installation PWA et jeu hors ligne

1. Sur iPad, ouvrir l’adresse dans Safari, puis Partager → « Sur l’écran
   d’accueil » → « Ajouter ».
2. Sur Android, ouvrir l’adresse dans Chrome, puis menu → « Installer
   l’application ».
3. Lancer l’application installée : elle doit s’ouvrir en plein écran, en
   paysage, sans barre d’adresse.
4. Sur iPad, se connecter avec le compte encadrant puis **refixer l’appareil**
   au groupe : l’application installée a son propre stockage.
5. Ouvrir une première fois la carte et un niveau avec le réseau, puis couper
   le Wi-Fi et lancer l’application : l’accueil, la carte et les niveaux déjà
   chargés doivent rester jouables.
6. Vérifier que les polices et les sons déjà utilisés restent disponibles.
7. Relancer l’application avec le réseau : si une nouvelle version existe,
   elle doit s’installer automatiquement au chargement, la page se recharger,
   puis afficher « Mise à jour terminée ! » sur la page courante. Vérifier
   qu’aucun rechargement ne se produit pendant une partie déjà ouverte.

### 5. Resynchronisation de la progression hors ligne

1. Connecter un élève, ouvrir le niveau 1 avec le réseau.
2. Activer le mode avion, puis terminer le niveau.
3. Vérifier que l’écran « Bravo ! » et les trois étoiles apparaissent.
4. Revenir à la carte : les étoiles doivent être visibles depuis l’appareil.
5. Désactiver le mode avion et attendre quelques secondes.
6. Ouvrir la fiche de l’élève avec un compte encadrant ou parent : le niveau
   doit être terminé et les étoiles enregistrées.
7. Refaire le test en fermant complètement le jeu hors ligne, puis en le
   rouvrant : la progression en attente doit être conservée.
8. Vérifier qu’une tentative déjà envoyée n’est pas comptée deux fois après
   plusieurs retours du réseau.

### 6. Contrôles complémentaires

- Vérifier les zones tactiles réelles sur les bords et avec une coque épaisse.
- Vérifier les marges autour de l’encoche et de la barre de gestes.
- Tester un changement de réseau Wi-Fi → 4G pendant un niveau.
- Tester plusieurs comptes adultes dans le même navigateur, puis la
  déconnexion.
- Vérifier qu’un appareil fixé à un groupe ne propose plus le code de groupe.
- Vérifier qu’un appareil non fixé redemande le code après déconnexion.
- Tester l’export JSON et la suppression définitive d’un élève de test.

## Limites connues

- Les projets Playwright émulent les appareils mais ne remplacent pas un iPad,
  une tablette Android et un téléphone physiques.
- Sur Chromium, le glisser tactile est envoyé par le protocole de débogage,
  avec de vrais événements tactiles. Sur WebKit, Playwright ne fournit pas de
  glisser tactile : les mêmes événements `pointerType: "touch"` sont envoyés
  directement, avec un remplacement local de la capture de pointeur.
- Les captures sont liées aux polices et au rendu de la machine qui les a
  générées. Les régénérer sur une autre version de navigateur peut produire
  des différences attendues.
- La voix Web Speech dépend des voix installées sur l’appareil. La qualité et
  la disponibilité doivent être vérifiées sur chaque iPad de l’école.

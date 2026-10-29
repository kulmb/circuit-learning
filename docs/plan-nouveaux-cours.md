# Plan — nouveaux chapitres d’après le livre « 少年电子入门 元件和电路 »

Date : 28 octobre 2026
Statut : proposition, non implémentée.

## 1. Lecture du livre

Le PDF est un scan de 605 pages, sans couche texte. Le plan s’appuie sur le
sommaire complet et sur les chapitres clés lus page par page : résistances,
condensateurs, inductances, relais et lames souples, diodes, optoélectronique.

### 1.1 Structure du livre

| Chapitre du livre | Page | Contenu | Usage proposé |
|---|---:|---|---|
| 1. 电阻器 — Résistances | 1 | résistance, potentiomètre, code, expériences | déjà couvert par le chapitre 2 du jeu |
| 2. 电容器 — Condensateurs | 40 | charge, décharge, capacité, série/parallèle | nouveau chapitre 8 |
| 3. 电感器 — Inductances | 69 | expérience d’Ørsted, bobine, électroaimant, transformateur | nouveau chapitre 6 |
| 4. 继电器与干簧管 — Relais et lames souples | 126 | relais électromagnétique, interrupteur commandé par aimant | nouveau chapitre 6 |
| 5. 半导体二极管 — Diodes | 145 | semiconducteurs, sens unique, redressement, LED | nouveau chapitre 5 |
| 6. 半导体三极管 — Transistors | 193 | amplification, commutation, oscillateurs | écarté : trop abstrait pour 8 ans |
| 7. 电声器件 — Électroacoustique | 314 | micro, haut-parleur, écouteur | chapitre bonus « sons » avec la sonnerie existante |
| 8. 光电元件 — Optoélectronique | 333 | photorésistance, photodiode, cellule solaire, LED | nouveau chapitre 7 |
| 9. 可控硅 — Thyristors | 387 | redressement commandé | écarté |
| 10. 场效应管 — FET | 412 | amplification, commutation | écarté |
| 11. 双基极二极管 — UJT | 433 | oscillateur à relaxation | écarté |
| 12. 综合制作电路 — Projets | 460 | 45 montages pratiques | inspiration pour les niveaux « projet » |
| 13. 电池 — Piles | 538 | piles en série/parallèle, charge | déjà partiellement couvert |

### 1.2 Idées fortes retenues

- **La résistance freine le courant** : le livre part de l’analogie de l’eau
  dans un tuyau. Le jeu l’utilise déjà (chapitre 2).
- **Le condensateur est un réservoir** : le livre l’appelle « 储电器 », appareil
  qui stocke l’électricité. Il se charge, se décharge, et sa taille compte.
- **Le courant crée un aimant** : expérience d’Ørsted (1820), fil + boussole,
  puis fil enroulé + clou. C’est une découverte visuelle parfaite pour le jeu.
- **Le relais est un interrupteur commandé par un aimant** : un petit courant
  attire une armature et ferme un gros circuit.
- **La lame souple est un interrupteur aimanté** : un aimant approché ferme
  deux lamelles dans un tube de verre.
- **La diode est une porte à sens unique** : le livre la compare à un clapet
  anti-retour. La LED est la version qui brille.
- **La photorésistance change avec la lumière** : utile pour une veilleuse
  automatique ; la cellule solaire transforme la lumière en électricité.
- **Sécurité** : le livre insiste sur les condensateurs qui restent chargés,
  les courts-circuits et le secteur. Le jeu doit garder ces réflexes, sans
  effrayer l’enfant.

### 1.3 Ce qu’on écarte

- Tous les chiffres à l’écran (ohms, volts, farads, ampères) : le jeu est
  qualitatif.
- Le courant alternatif, les transformateurs, le secteur, la soudure.
- La physique des jonctions P-N, le dopage, les transistors, thyristors, FET
  et UJT.
- Les montages à plus de 5 composants ou à plus de 3 interrupteurs.

## 2. Principes d’adaptation

- Un seul nouveau concept par niveau.
- Du concret vers l’abstrait : objet réaliste, puis symbole, puis les deux.
- Phrases de 12 mots maximum, tutoiement, ton encourageant.
- Aucun échec punitif : une erreur donne un indice, jamais « Perdu ».
- Aucun nombre, aucune unité. On dit « petit/grand », « faible/fort »,
  « jour/nuit », « vide/plein ».
- Une interaction par Pointer Events, jamais de survol obligatoire.
- Cibles tactiles de 48 px minimum, 56 px en compact.
- Animations douces : pas plus de 3 flashs par seconde, respect de
  `prefers-reduced-motion`.
- L’adulte garde la main : les nouveaux composants n’ajoutent aucune donnée
  personnelle.

## 3. Curriculum proposé

Quatre nouveaux chapitres, 17 niveaux, placés après le chapitre 4 « Les défis
de Zap ». Les défis restent un point d’étape ; le nouvel arc raconte les
composants qui « choisissent » le courant.

| Chapitre | Titre | Niveaux | Idée directrice |
|---|---|---:|---|
| 5 | Une porte à sens unique | 3 | la diode ne laisse passer que dans un sens |
| 6 | L’aimant électrique | 5 | le courant crée un aimant ; relais et lame souple |
| 7 | La lumière commande | 3 | photorésistance et cellule solaire |
| 8 | Le réservoir d’électricité | 6 | le condensateur stocke et rend l’énergie |

### 3.1 Chapitre 5 — « Une porte à sens unique » (diode)

| ID | Titre | Objectif | Concept | Composants | Réussite | Affichage | Livre |
|---|---|---|---|---|---|---|---|
| `diode-01` | La porte à sens unique | Allume l’ampoule avec la diode dans le bon sens. | La diode conduit dans un seul sens. | pile, diode, ampoule, interrupteur | ampoule allumée ; à l’envers, indice « la diode bloque » | réaliste | 5.2 |
| `diode-02` | Le bon sens | Fais sonner la sonnerie dans le bon sens. | La diode bloque le courant inverse. | pile, diode, sonnerie, interrupteur | sonnerie allumée ; à l’envers, silence et indice | superposition | 5.2 |
| `diode-03` | Deux chemins, un seul sens | Allume l’ampoule avec l’une ou l’autre pile. | Deux diodes font un choix de source sans retour. | 2 piles, 2 diodes, ampoule | ampoule allumée avec chaque pile ; retirer une pile ne coupe pas l’autre chemin | symboles | 5.3, 5.8 |

Note : `diode-03` est un niveau capstone à valider en test enfant. Si trop
complexe, le remplacer par un niveau « reconnaître diode et LED » (matching).

### 3.2 Chapitre 6 — « L’aimant électrique » (électroaimant, lame souple, relais)

| ID | Titre | Objectif | Concept | Composants | Réussite | Affichage | Livre |
|---|---|---|---|---|---|---|---|
| `mag-01` | Le fil qui aimante | Attire les trombones avec le courant. | Un courant crée un champ magnétique ; la bobine le concentre. | pile, interrupteur, électroaimant, trombones | au moins un trombone attiré | réaliste | 3.1 |
| `mag-02` | Plus de tours ! | Prends la bobine qui attire tous les trombones. | Plus de tours = aimant plus fort. | pile, interrupteur, 2 électroaimants (peu/beaucoup de tours), trombones | tous les trombones avec la grande bobine | réaliste | 3.1 |
| `mag-03` | L’interrupteur aimanté | Allume l’ampoule avec un aimant. | La lame souple se ferme quand un aimant approche. | pile, lame souple, ampoule, aimant | ampoule allumée aimant proche, éteinte aimant loin | réaliste | 4.2 |
| `mag-04` | Le relais de Zap | Commande la lampe avec un petit courant. | Le relais est un interrupteur commandé par un électroaimant. | pile A, interrupteur, relais, pile B, ampoule | ampoule allumée quand la bobine est alimentée | superposition | 4.1 |
| `mag-05` | Le portier | Fais sonner la sonnette quand la porte s’ouvre. | Lame souple + sonnerie = alarme. | pile, lame souple, sonnerie, aimant | sonnerie quand l’aimant approche, silence sinon | superposition | 4.5 |

Option : `mag-06` « La grue de Zap » — l’électroaimant attrape le métal, pas
le plastique. Nécessite un attribut `magnetic` sur les objets ; à garder pour
la finition.

### 3.3 Chapitre 7 — « La lumière commande » (photorésistance, solaire)

| ID | Titre | Objectif | Concept | Composants | Réussite | Affichage | Livre |
|---|---|---|---|---|---|---|---|
| `light-01` | La résistance qui aime le soleil | Couvre le capteur et regarde l’ampoule. | La photorésistance conduit mieux à la lumière. | pile, capteur de lumière, ampoule | ampoule forte à la lumière, faible ou éteinte à l’ombre | réaliste | 8.1 |
| `light-02` | La veilleuse automatique | Allume la lampe quand il fait nuit. | Photorésistance + relais inversent la réponse. | pile, capteur, relais, ampoule, bouton jour/nuit | lampe allumée la nuit, éteinte le jour | superposition | 8.5 |
| `light-03` | Le panneau solaire | Fais tourner le moteur avec la lumière. | La cellule solaire transforme la lumière en électricité. | panneau solaire, moteur, bouton jour/nuit | moteur allumé à la lumière, arrêté à l’ombre | réaliste | 8.3 |

Option : `light-04` « La voiture solaire » — panneau + moteur + interrupteur,
capstone de la série.

### 3.4 Chapitre 8 — « Le réservoir d’électricité » (condensateur)

| ID | Titre | Objectif | Concept | Composants | Réussite | Affichage | Livre |
|---|---|---|---|---|---|---|---|
| `cap-01` | La réserve de Zap | Ouvre l’interrupteur et regarde l’ampoule rester allumée. | Le condensateur stocke l’énergie et la rend. | pile, interrupteur, condensateur, ampoule | ampoule encore allumée après ouverture, puis extinction douce | réaliste | 2.2 |
| `cap-02` | Ça se remplit | Regarde l’ampoule faiblir pendant la charge. | Le courant de charge diminue quand le condensateur se remplit. | pile, ampoule, condensateur, interrupteur | ampoule allumée au début, éteinte à la fin, condensateur plein | réaliste | 2.2.1 |
| `cap-03` | Ça se vide | Allume l’ampoule avec le condensateur chargé. | Le condensateur chargé peut alimenter un circuit. | condensateur préchargé, ampoule, interrupteur | ampoule allumée puis éteinte, condensateur vide | réaliste | 2.2.2 |
| `cap-04` | La veilleuse | Fais une lumière qui s’éteint doucement. | Un grand condensateur prolonge la lumière. | pile, interrupteur, grand condensateur, ampoule | ampoule allumée au moins 2 s après ouverture | superposition | 2.4, 2.10 |
| `cap-05` | Petit ou grand ? | Choisis le grand condensateur pour éclairer plus longtemps. | La capacité est la taille du réservoir. | pile, interrupteur, petit et grand condensateurs, ampoule | ampoule encore allumée après 3 s avec le grand | réaliste | 2.4 |
| `cap-06` | Le flash de Zap | Charge, puis libère l’énergie d’un coup. | Le condensateur charge lentement et libère vite. | pile, résistance, condensateur, LED, 2 interrupteurs | un flash bref et fort après l’appui | superposition | 2.2, 2.10 |

Note : ces niveaux ont besoin d’une simulation temporelle, pas seulement du
calcul statique actuel. Voir § 4.1.7.

### 3.5 Option rapide — un chapitre « sons » sans nouveau composant

La sonnerie existe déjà dans le moteur et dans la palette, mais aucun niveau
ne l’utilise. Un petit chapitre de 3 niveaux peut être livré sans toucher au
moteur :

| ID | Titre | Objectif | Concept |
|---|---|---|---|
| `sound-01` | La sonnerie | Fais sonner la sonnerie. | un composant qui transforme le courant en son |
| `sound-02` | Deux boutons | Il faut appuyer sur les deux boutons. | deux interrupteurs en série |
| `sound-03` | Le moteur et la sonnerie | Fais tourner le moteur et sonner la sonnerie. | deux appareils en parallèle |

Ce chapitre peut servir de rodage avant les nouveaux composants. Il ne fait
pas partie des 17 niveaux ci-dessus.

## 4. Architecture technique

### 4.1 Moteur partagé (`packages/shared`)

#### 4.1.1 Nouveaux types de composants

| Type | Bornes | Champs | Simulation | Interaction |
|---|---|---|---|---|
| `diode` | anode, cathode | `resistance`, `forwardVoltage` | même modèle que la LED, sans lumière | rotation pour orienter |
| `electromagnet` | a, b | `resistance`, `turns` | charge ; force = courant × tours | trombones animés |
| `reed` | a, b | `magnetNear`, `normallyOpen` | interrupteur fermé si aimant proche | aimant déplacé sur le composant |
| `relay` | coilA, coilB, contactA, contactB | `coilResistance`, `threshold`, `closed` | contact recalculé par itération | armature et « clac » |
| `ldr` | a, b | `lightResistance`, `darkResistance`, `lightLevel` | résistance dynamique | couvrir avec le doigt ; jour/nuit |
| `solar` | positive, negative | `voltage`, `lightLevel` | source de tension si éclairée | bouton jour/nuit |
| `capacitor` | a, b | `capacitance`, `initialVoltage` | modèle transitoire (Euler arrière) | réservoir qui se remplit, bouton vider |

L’aimant et les trombones sont des accessoires visuels, pas des composants
électriques : cela évite des composants sans borne et garde le modèle MNA
simple.

#### 4.1.2 Diode

- Réutiliser la logique itérative de la LED (`ledOn`, tension de seuil,
  diagnostic « à l’envers »).
- Généraliser `LedComponent` en `DiodeComponent` ou ajouter un type
  `diode` avec le même comportement.
- Diagnostic `diode_reversed`, message « La diode bloque le courant. »
- Aucun changement lourd : le solveur MNA sait déjà traiter une source de
  tension seuil.

#### 4.1.3 Électroaimant

- Composant résistif à deux bornes.
- `magneticStrength = |courant| × tours`, normalisé en `weak`, `normal`,
  `strong` pour l’affichage et les conditions de réussite.
- Pas de nouveau calcul électrique : c’est une charge comme le moteur.
- L’animation des trombones est purement visuelle.

#### 4.1.4 Lame souple

- Interrupteur à deux bornes dont l’état est `magnetNear`.
- L’aimant est un accessoire d’interface : l’enfant le pose près du tube.
- Conditions : `reed_state` (fermé/ouvert), `reed_controls` (allume/éteint
  un autre composant).
- Aucun calcul magnétique : on reste qualitatif.

#### 4.1.5 Relais

- Composant à quatre bornes : deux pour la bobine, deux pour le contact.
- Le contact est recalculé par itération : résoudre, lire le courant de
  bobine, fermer/ouvrir le contact, résoudre à nouveau, avec hystérésis et
  un maximum de 8 itérations.
- `model.ts` doit gérer quatre bornes : `EXPECTED_TERMINAL_IDS` passe de
  tuple à tableau, et `nodesFor` gagne un helper `nodesForTerminals`.
- Le contact doit être inclus dans la détection de court-circuit.
- Si le chantier est trop lourd, option de repli : ne pas ajouter le relais
  et utiliser seulement la lame souple. Mais `light-02` (veilleuse) en a
  besoin pour inverser la lumière ; sans relais, il faudrait un module
  « capteur » moins fidèle au livre.

#### 4.1.6 Photorésistance et cellule solaire

- Photorésistance : `resistance = lerp(darkResistance, lightResistance,
  lightLevel)`. Brancher le calcul dans `assembleSystem` comme le
  rhéostat.
- Cellule solaire : source de tension `voltage × lightLevel`. `analysis.ts`
  doit reconnaître une source autre qu’une pile (`hasSource`), et les
  diagnostics « il manque une pile » deviennent « il manque une source ».
- Contrôle de lumière : bouton jour/nuit dans les niveaux concernés, ou
  interaction « couvrir le capteur » avec le doigt. Le bouton est plus
  simple à tester et à comprendre ; l’interaction au doigt est plus
  magique. Proposition : bouton jour/nuit pour les niveaux, et « couvrir »
  en atelier libre.

#### 4.1.7 Condensateur et simulation temporelle

C’est le plus gros chantier. Le solveur actuel est statique (MNA continu).
Un condensateur en régime continu est un circuit ouvert : sans simulation
temporelle, les niveaux ne montreraient rien.

Proposition : ajouter `packages/shared/src/circuit/transient.ts`.

- État transitoire : `Record<componentId, voltage>` pour les condensateurs.
- Pas de temps fixe (par exemple 16 ms), méthode d’Euler arrière :
  - conductance équivalente `C / dt` ;
  - source de courant `C / dt × v_prev` ;
  - on résout le MNA à chaque pas, puis on met à jour `v`.
- Réutiliser `assembleSystem` en ajoutant les contributions des condensateurs.
- Itérer les diodes/LED comme aujourd’hui ; itérer le relais si présent.
- `simulateCircuit` reste le calcul statique pour les niveaux sans
  condensateur (aucune régression).
- Le niveau déclare `transient?: { durationMs, stepMs }` et la page de jeu
  fait tourner la boucle avec `requestAnimationFrame`, en pause quand
  l’onglet est caché.
- Les conditions de réussite temporelles ont besoin d’un petit historique :
  `LevelRuntime` avec `elapsedMs`, événements d’interrupteur et pics de
  courant. Exemples : `capacitor_filled`, `capacitor_empty`,
  `lamp_stays_on_after_open`, `flash_seen`.
- Tests unitaires : charge RC (63 % après une constante de temps, sans
  afficher de chiffre), décharge, conservation de l’énergie, absence de
  NaN, interrupteur ouvert/fermé, condensateur initialement chargé.

Option de repli si le temps manque : modèle qualitatif « réservoir »
(`charge` 0..1) sans MNA transitoire. Plus rapide (4-5 jours), mais moins
fidèle et non réutilisable pour le flash ou le couple RC. Recommandation :
faire le vrai solveur, au moins une fois, car il servira aussi aux niveaux
« flash » et « veilleuse ».

#### 4.1.8 Nouvelles conditions de réussite

Ajouter dans `levels/types.ts` et `levels/success.ts` :

- `capacitor_filled` / `capacitor_empty`
- `lamp_stays_on_after_open` (composant, interrupteur, durée minimale)
- `flash_seen` (pic de courant, durée maximale)
- `magnet_attracts` (nombre de trombones : quelques-uns/tous)
- `reed_state` / `reed_controls`
- `relay_state` / `relay_controls`
- `diode_conducts` / `diode_blocks`
- `ldr_changes` (simuler lumière et ombre, comparer l’ampoule)
- `solar_powers`

Les conditions temporelles reçoivent un `TransientSnapshot` optionnel ;
les conditions statiques gardent la signature actuelle pour ne pas casser
les niveaux existants.

#### 4.1.9 Compteurs qualitatifs

Ajouter `charge` (vide/moitié/plein) et `aimant` (faible/fort) à
`METER_IDS`. Réutiliser les trois segments existants et les libellés
`meter.charge.*`, `meter.aimant.*`. Aucun nombre à l’écran.

#### 4.1.10 Sérialisation, compatibilité, défis

- Mettre à jour les schémas zod, `createComponent`, les valeurs par défaut
  et la sérialisation de l’atelier.
- Les anciens circuits enregistrés ne contiennent pas les nouveaux types :
  aucune migration de données n’est nécessaire.
- Le générateur de défis garde son pool actuel de composants dans un
  premier temps. On l’étendira après les tests enfants, avec vérification
  de solvabilité.

### 4.2 Front (`apps/web`)

- `workbench/ComponentArt.tsx` : art réaliste et symbole pour chaque
  composant, plus l’aimant, les trombones et le réservoir qui se remplit.
- `workbench/paletteItems.ts` : nouvelles entrées et variantes
  (petit/grand condensateur, bobine courte/longue). Les variantes passent
  par `LevelAvailableComponent.options`.
- `workbench/WorkbenchSvg.tsx` :
  - bornes du relais (quatre anneaux, cibles ≥ 48 px) ;
  - interaction « couvrir le capteur » ou bouton jour/nuit ;
  - aimant déplaçable près de la lame souple ;
  - bouton « Vider » pour le condensateur, avec un seul contrôle
    supplémentaire à la fois ;
  - animation des trombones et de l’armature du relais.
- `workbench/WorkbenchPage.tsx` : boucle transitoire, évaluation continue
  de la réussite, pause en arrière-plan, remise à zéro.
- `workbench/ZapMeter.tsx` : icônes et libellés des nouveaux compteurs.
- `narration/fr.ts` : chapitres, niveaux, indices, vocabulaire, messages de
  réussite. Respecter 12 mots maximum et l’absence d’anglais.
- `admin` : les nouveaux concepts apparaissent dans les tableaux de bord
  via `PROGRESS_CONCEPTS`; aucune route API nouvelle.
- PWA : version mineure suivante, notes de mise à jour, aucun CDN.

### 4.3 Contenu et pédagogie

- Chaque chapitre commence par une situation concrète : une lampe qui
  reste allumée, un aimant qui attrape des trombones, une porte qui
  sonne, un panneau qui fait tourner un moteur.
- Chaque niveau a 3 indices progressifs, jamais « Perdu ».
- Vocabulaire nouveau : condensateur, réserve, charge, décharge, diode,
  sens unique, électroaimant, bobine, relais, lame souple, capteur de
  lumière, panneau solaire.
- Sécurité : « Un gros condensateur peut garder son électricité. » et
  « Ne touche jamais aux prises. » Le court-circuit reste expliqué.
- Les mots « photorésistance » et « cellule solaire » peuvent rester dans
  le vocabulaire adulte ; à l’écran, préférer « capteur de lumière » et
  « panneau solaire ».

### 4.4 Tests et migration

- `packages/shared/src/circuit/*.test.ts` : nouveaux composants, diode,
  relais, photorésistance, solaire, transitoire.
- `packages/shared/src/levels/levels.test.ts` : nombre de niveaux, ordre,
  liens `nextLevelId`, metadata, conditions de réussite.
- `apps/web/src/narration/levelTexts.test.ts` et `childTexts.test.ts` :
  toutes les chaînes existent, 12 mots maximum, pas d’anglais.
- Tests de composants React : palette, art, interactions, compteurs,
  boucle transitoire avec faux timers.
- E2E : un spec par nouveau chapitre, mise à jour de la capture de la
  carte des niveaux, vérification tactile et `prefers-reduced-motion`.
- Migration de progression : `defi-04.nextLevelId` pointe vers
  `diode-01`; les nouveaux niveaux sont ajoutés à `ALL_LEVEL_METADATA`.
  `reconcileProgress` débloque le premier niveau pour les joueurs qui ont
  fini les défis. Aucune migration MongoDB.
- Si l’on préfère mettre les nouveaux chapitres avant les défis, il faut
  relier `assembly-04` au premier nouveau niveau et accepter que les
  défis ne soient plus le final. L’ajout après le chapitre 4 est plus sûr.

## 5. Découpage et estimation

Ordre de grandeur pour une personne, tests inclus. À ajuster après le
prototype.

| Phase | Contenu | Livrables | Estimation |
|---|---|---|---:|
| 0 | Cadrage, maquettes, option « sons » | 3 niveaux sonores, décisions figées | 2-3 j |
| 1 | Diode | composant, art, 3 niveaux, tests | 4-5 j |
| 2 | Électroaimant, lame souple, relais | 3 composants, art, 5 niveaux, tests | 10-12 j |
| 3 | Photorésistance, solaire | 2 composants, contrôle lumière, 3 niveaux | 6-8 j |
| 4 | Condensateur | solveur transitoire, art, 6 niveaux, tests | 10-12 j |
| 5 | Finition | E2E, iPad, accessibilité, docs, PWA | 4-5 j |

Total : environ 36-45 jours de développement. Avec un prototype réussi du
solveur transitoire, la phase 4 peut descendre à 8-10 jours.

## 6. Risques et décisions

| Risque | Impact | Réduction |
|---|---|---|
| Solveur transitoire instable ou lent | niveaux condensateur impossibles | prototype isolé, pas de temps fixe, tests RC, retour au modèle qualitatif si besoin |
| Relais à quatre bornes | modèle et UI plus lourds | commencer par lame souple, relais en phase 2 ; hystérésis et 8 itérations max |
| Palette surchargée | choix difficile pour l’enfant | palette filtrée par niveau, variantes regroupées, 5 commandes maximum |
| Textes français trop longs | test enfant en échec | écrire court dès le départ, faire relire par un adulte francophone |
| Défis générés incohérents | régression du chapitre 4 | ne pas ajouter les nouveaux composants au générateur avant la phase 5 |
| Progression des anciens joueurs | niveaux bloqués | ajouter après `defi-04`, `reconcileProgress` débloque le premier niveau |
| Sécurité perçue | peur du condensateur | message doux, jamais de tension réelle, rappel des prises |

Décisions à prendre avant de coder :

1. Ajouter les chapitres après les défis (recommandé) ou avant.
2. Vrai solveur transitoire (recommandé) ou modèle qualitatif.
3. Relais maintenant ou plus tard ; la veilleuse `light-02` en dépend.
4. Chapitre « sons » en rodage ou plus tard.
5. Ordre final : diode → aimant → lumière → condensateur, ou l’ordre du
   livre (condensateur d’abord).

## 7. Recommandation

Commencer par la phase 1 (diode) : c’est le composant le plus proche de la
LED déjà connue, le moteur est presque prêt, et cela valide la chaîne
« composant → art → niveau → narration → tests » sans risque.

Ensuite la phase 2 (électroaimant, lame souple, relais), qui donne les
niveaux les plus spectaculaires (trombones, portier, relais). Puis la
lumière, et enfin le condensateur, qui demande le plus de travail mais
offre la plus belle conclusion (veilleuse, flash).

Le chapitre « sons » peut être livré en parallèle comme quick win : il ne
touche pas au moteur et donne immédiatement du contenu nouveau.

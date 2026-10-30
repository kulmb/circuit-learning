# Plan — version 0.5.0 « Le Labo Robot »

Date : 30 octobre 2026
Statut : proposition, non implémentée.
Dépendance : la version 0.4.0 (chapitres 5 à 8, composants électroniques)
doit être livrée avant. Les nouveaux chapitres de ce plan portent donc les
numéros 9 à 12. Si 0.4.0 change de numérotation, renuméroter les chapitres
et les identifiants de niveaux avant de commencer.

## 1. Sources

Deux livres ont été lus et résumés pour préparer cette version.

| Livre | Édition | Apport principal |
|---|---|---|
| 《乐高机器人设计技巧：EV3 结构设计与编程指导》 (码高机器人教育) | 人民邮电出版社, 2017 | 14 montages mécaniques, structures, capteurs, programmation EV3 |
| 《人工智能+机器人入门与实战：用树莓派+Python+OpenCV 制作计算机视觉机器人》 (陈宇航、侯俊萍、叶昶) | 人民邮电出版社, 2020 | IA, Python, GPIO, OpenCV, bras robotisé, suivi de visage |

Les deux livres sont en chinois. Le jeu reste en français par défaut, avec
l’anglais et le chinois disponibles par le sélecteur.

### 1.1 Ce que retient le livre EV3

Le livre est un recueil de 14 montages, du plus simple au plus complexe :
véhicule à une roue, balance à ultrasons, bras mécanique, convoyeur, voiture,
etc. Il ne faut pas recopier les modèles : le jeu n’a ni briques physiques
ni LEGO. On retient les **principes** :

- un moteur ne suffit pas : il faut transmettre son mouvement ;
- les engrenages échangent la vitesse contre la force ;
- le ver sans fin ralentit beaucoup et bloque le retour ;
- le levier et la crémaillère transforment le mouvement ; la poulie,
  absente des 14 montages, peut être ajoutée en atelier libre ;
- la bielle et la manivelle transforment une rotation en mouvement de va-et-vient ;
- une structure doit être stable, triangulée et équilibrée ;
- les capteurs (contact, ultrasons, couleur) ferment la boucle de décision ;
- un programme se construit par étapes : séquence, boucle, condition,
  puis réglage fin.

Le livre contient aussi des montages à thème d’arme (pistolet, canon,
mitrailleuse). Ils sont **écartés** : le jeu les remplace par des mécanismes
non violents (catapulte de balles, distributeur, pont, grue).

Le livre ne couvre pas le gyroscope, le suivi de ligne PID, le travail
d’équipe ni la présentation de projet. Ces compétences viennent des
règlements de concours et de la page coach ; le jeu les introduit sans
formalisme.

### 1.2 Ce que retient le livre IA

Le livre suit une progression en trois projets :

1. **La baguette magique** : la caméra voit, OpenCV isole une couleur,
   trouve le contour et dessine le trajet.
2. **Le bras trie les objets** : la caméra donne une position, le bras
   s’aligne, descend, aspire et dépose.
3. **Le robot suit un visage** : un visage est détecté, le support à deux
   axes (gimbal) le garde au centre, puis le robot reconnaît une personne
   précise.

Les idées transférables sont :

- **percevoir → décider → agir** : c’est le cœur de tout robot ;
- une image est une grille de pixels ; une vidéo est une suite d’images ;
- une couleur se filtre (HSV), puis devient un masque noir et blanc ;
- un contour donne la position et la taille d’un objet ;
- **détecter** répond « il y a un visage, ici » ; **reconnaître** répond
  « c’est cette personne » ;
- un robot suit une cible en comparant sa position au centre de l’image ;
- on règle un paramètre à la fois, puis on observe.

Le livre ne traite pas de châssis roulant ni de suivi de ligne. Le
châssis vient du livre EV3 ; le suivi de ligne et le gyroscope viennent
des règlements de concours.

### 1.3 Synthèse du livre EV3 (14 montages)

| # | Montage | Mécanisme | Programmation | Adaptation |
|---|---|---|---|---|
| 01 | Véhicule à une roue | courroie/roue friction, renvoi d’angle, centre de masse | variable de vitesse, boucle | `meca-01`, `meca-02` |
| 02 | Balance à ultrasons | levier, contrepoids coulissant, quatre-barres | contact, distance, boucle | `meca-04` |
| 03 | Pistolet à répétition | double élastique, gâchette motorisée, chargeur | variable, 6 tirs, affichage | écarté (arme) ; idée d’interlock pour `robo-01` |
| 04 | Canon anti-aérien | tourelle, balayage, élastique | reset moteur, balayage, arrêt/tir | écarté (arme) ; idée de balayage pour `robo-05` |
| 05 | Voiture poseuse de pont | crémaillère, pont télescopique | capteur de couleur, distance, état | `meca-05`, `robo-06` |
| 06 | Pelleteuse | chenilles, petit→grand engrenage, bras | boutons, angle moteur | `meca-02`, `meca-04` |
| 07 | Véhicule foreuse | chenilles, engrenages multi-étages, tourelle | distance, couleur, mapping inverse | `meca-02` ; atelier libre |
| 08 | Roue de la fortune | roue 6 couleurs, liens, capteur couleur | hasard, comparaison | jeu de couleur, atelier libre |
| 09 | Barque à rames | manivelle-bielle, deux moteurs | distance, vitesse, différence | `meca-06`, `robo-05` |
| 10 | Bras mécanique | tourelle 360°, ver sans fin, pince | boutons, contact | `meca-03` ; prise/dépose |
| 11 | Ligne de production | glissière, deux tourelles, rythme | séquence multi-moteurs | `robo-06`, `mission-02` |
| 12 | Voiture décapotable | propulsion arrière, différentiel, crémaillère | télécommande Bluetooth | `meca-01`, `meca-02` ; atelier libre |
| 13 | Mitrailleuse lourde | chaîne, alimentation, 3 moteurs | séquence, attentes | écarté (arme) |
| 14 | Moto custom | boîte de vitesses, direction | télécommande Bluetooth | atelier libre / démonstration |

Le livre est un recueil de projets, pas un cours : il ne donne ni objectifs
pédagogiques ni grille de difficulté. La progression ci-dessus est une
reconstruction pour le jeu. Les montages 03, 04, 08 et 13 sont des
lanceurs ; ils sont écartés ou transformés en mécanismes non violents.

### 1.4 Synthèse du livre IA (7 chapitres)

| Chapitre | Contenu | Projet | Adaptation |
|---|---|---|---|
| 1 | IA, histoire, robots, capteurs/actionneurs | discussion | vocabulaire de `vision-05`, page coach |
| 2 | Raspberry Pi, Linux, GPIO | mise en route | hors jeu, fiche adulte |
| 3 | Python : variables, types, if/while, fonctions | calculatrice, factorielle | blocs ; pas de syntaxe pour 8-9 ans |
| 4 | GPIO : LED, bouton, sonnerie, logique, hasard | clignotant, bouton, quiz | `robo-01` ; rappel des circuits |
| 5 | pixels, frames, HSV, masque, contours | baguette magique | `vision-01` à `vision-03` |
| 6 | bras 3 axes, servos, ventouse, coordonnées, prise/dépose | tri d’objets | `mission-02` ; bras en atelier |
| 7 | peau/Haar, détection vs reconnaissance, ML, ANN, support à deux axes | suivi de visage | `vision-04`, `vision-05` |

Le livre ne couvre ni châssis roulant, ni suivi de ligne, ni gyroscope.
Ces briques viennent du livre EV3 et des règlements. Le livre IA apporte
surtout la **chaîne perception → décision → action** et le vocabulaire de
la vision.

## 2. Public et principes

Public : enfants de 8 à 12 ans, débutants, qui préparent un concours de
robotique. Deux niveaux internes, sans contenu dupliqué :

- **Découverte** (8-9 ans) : séquences courtes, aides visibles, une seule
  idée par niveau.
- **Défi** (10-12 ans) : mêmes niveaux, avec blocs avancés débloqués,
  missions mélangées et moins d’indices.

Règles conservées :

- un seul nouveau concept par niveau ;
- du concret vers l’abstrait : objet réaliste, puis schéma, puis les deux ;
- phrases de 12 mots maximum, tutoiement, ton encourageant ;
- aucun échec punitif : une erreur donne un indice, jamais « Perdu » ;
- aucun nombre à l’écran (volts, ohms, dents, degrés, secondes) ; les
  quantités sont montrées par des pictogrammes ou des barres ;
- retour visuel immédiat : ça tourne, ça monte, ça s’allume, ça avance ;
- sécurité : le jeu reste virtuel, mais chaque chapitre rappelle les gestes
  sûrs avec un vrai robot.

## 3. Concours visé : EuroBot et EuroBot Junior

La cible est **EuroBot**. Les 8-12 ans concourent en **EuroBot Junior**,
la catégorie jeune, avec un robot piloté ; EuroBot Open est la suite, avec
un robot autonome sur le même terrain et les mêmes règles.

| Point | EuroBot Open | EuroBot Junior |
|---|---|---|
| Public | équipes open | moins de 18 ans, au moins 2 jeunes + 1 encadrant |
| Robot | autonome | piloté/télécommandé, même terrain et mêmes règles |
| Terrain | 3000 × 2000 mm, bordures de 70 mm | identique |
| Manche | 100 s | identique |
| Thème 2026 | « Squirrels & Hazelnuts » / « Gardons les noisettes au chaud ! » | identique |
| Actions | nid (6 caisses max, 2 pts), garde-manger (3 pts), zones bonus (5 pts), frigos et SIMA | identique, robot piloté |
| Homologation | statique + dynamique, au moins 3 manches de qualification | identique |
| Présentation | poster A1 et dossier | identique |

Ce que le jeu doit entraîner :

- lire un terrain et choisir une stratégie ;
- prendre, porter et déposer des caisses de noisettes ;
- respecter des zones et une manche de 100 s ;
- piloter avec précision (EuroBot Junior) ;
- programmer un enchaînement autonome (passerelle vers EuroBot Open) ;
- recommencer, mesurer, améliorer ;
- préparer l’homologation, le poster A1 et les rôles d’équipe.

Conséquences pour le jeu :

- **deux modes** : « Piloter » (Junior) et « Programmer » (passerelle
  Open) ;
- un tapis EuroBot simplifié : 3 m × 2 m, zones, caisses, nid,
  garde-manger, zones bonus ;
- une manche de 100 s visualisée par une barre, sans chiffres ;
- des essais multiples, sans pénalité ;
- un journal de conception et des rôles d’équipe ;
- une page coach avec checklist d’homologation, poster A1, rôles et
  sécurité ;
- un pack de saison 2026 « Gardons les noisettes au chaud ! », mis à jour
  chaque année.

WRO et FLL ne sont pas la cible. Leur méthode de conception (identifier,
concevoir, créer, itérer, communiquer) reste utile au coach, mais les
missions, le vocabulaire et les critères suivent EuroBot.

## 4. Nouveau mode : « Le Labo Robot »

Le mode est accessible depuis l’accueil et depuis la carte des niveaux.
Il ajoute quatre chapitres après le chapitre 4 (ou après les chapitres 5-8
de la 0.4.0), soit 21 niveaux.

| Chapitre | Titre | Niveaux | Idée directrice | Livre |
|---|---|---:|---|---|
| 9 | Les machines de Zap | 6 | transmettre et transformer le mouvement | EV3 |
| 10 | Le cerveau du robot | 6 | capter, décider, répéter | EV3 + IA ch. 3-4 |
| 11 | Les yeux du robot | 5 | voir, filtrer, trouver, reconnaître | IA ch. 5-7 |
| 12 | Mission Robot | 4 | préparer et réussir une manche EuroBot | EuroBot / EuroBot Junior |

Chaque niveau garde la structure existante : titre, objectif, introduction,
trois indices, vocabulaire, étoiles selon les indices utilisés.

### 4.1 Chapitre 9 — « Les machines de Zap » (6 niveaux)

| ID | Titre | Objectif | Concept | Pièces | Réussite | Source |
|---|---|---|---|---|---|---|
| `meca-01` | La roue qui tourne | Fais tourner la roue avec le moteur. | l’axe transmet la rotation | moteur, axe, roue | la roue tourne | EV3 01, 12 |
| `meca-02` | Plus vite ou plus fort ? | Choisis les engrenages pour grimper ou pour courir. | petit menant / grand mené = lent et fort ; l’inverse = rapide et faible | moteur, petits et grands engrenages, roue | la charge monte (fort) ou le drapeau est atteint (vite) | EV3 06, 07, 12 |
| `meca-03` | La pince qui tient | Ferme la pince et garde l’objet. | le ver ralentit, force et bloque le retour | moteur, ver, pince, objet | la pince tient l’objet sans moteur | EV3 10 (ver), 06 (réduction) |
| `meca-04` | La balance de Zap | Place le contrepoids pour équilibrer le plateau. | levier : appui et distance changent l’effort | levier, appui, contrepoids, plateau | la balance est équilibrée | EV3 02 |
| `meca-05` | Le pont qui se déplie | Déplie le pont pour traverser. | crémaillère : rotation → translation | moteur, pignon, crémaillère, pont | le pont atteint l’autre rive | EV3 05 |
| `meca-06` | Le robot qui marche | Relie la manivelle et la bielle pour faire avancer les jambes. | rotation → va-et-vient | moteur, manivelle, bielle, jambes | le robot fait trois pas | EV3 09 (manivelle) |

Interaction : un banc en SVG avec des chevilles. L’enfant glisse les pièces
sur les chevilles ; elles s’aimantent. Il lance la manivelle avec le doigt
ou appuie sur « Tourner ». Les engrenages tournent à la bonne vitesse
relative, le levier se balance, la crémaillère pousse le pont. Aucun nombre
de dents n’est affiché : on montre « lent/rapide », « faible/fort »,
« bloque ».

Le solveur reste qualitatif. En interne, il connaît les tailles et les
dents pour être exact ; à l’écran, il ne renvoie que trois classes
(`lent`, `moyen`, `rapide` et `faible`, `moyen`, `fort`), un sens de
rotation et un état `bloqué`. Il détecte les conflits (deux moteurs qui se
contredisent) et les boucles impossibles, et donne un indice.

### 4.2 Chapitre 10 — « Le cerveau du robot » (6 niveaux)

| ID | Titre | Objectif | Concept | Capteur | Blocs | Réussite | Source |
|---|---|---|---|---|---|---|---|
| `robo-01` | Écoute ton doigt | Avance quand on touche le capteur. | entrée → action | contact | attendre, avancer | le robot avance après l’appui | EV3 02, IA ch. 4 |
| `robo-02` | Attention au mur ! | Arrête-toi avant le mur. | condition | distance | si, arrêter | le robot s’arrête près du mur | EV3 02 |
| `robo-03` | Répète après moi | Traverse le pont en répétant. | boucle | — | répéter, avancer | le robot atteint l’autre rive | EV3 01 |
| `robo-04` | Suis la ligne | Suis la ligne noire jusqu’au drapeau. | boucle + condition | couleur | répéter, si, tourner | le robot suit la ligne | EV3 05 (capteur de couleur) ; entraînement général |
| `robo-05` | Contourne l’obstacle | Va au drapeau sans toucher la caisse. | distance + décision | distance | si, tourner, avancer | le robot arrive sans collision | EV3 02, 09 ; entraînement général |
| `robo-06` | La mission de Zap | Livre la caisse dans la zone. | séquence + boucle + condition | contact, distance, couleur | tous | la caisse est déposée | EV3 11 ; EuroBot (transport) |

Note : le livre EV3 ne traite ni le gyroscope ni le PID. Le suivi de ligne
est introduit ici comme exigence de concours, avec une règle simple
(« si noir, avancer ; sinon, tourner »), sans formule. Le mode Défi peut
ajouter une correction douce, mais le PID formel reste hors du jeu.

Interaction : un programme en blocs empilés verticalement. L’enfant touche
un bloc pour l’ajouter, le glisse pour le déplacer, le touche à nouveau pour
le retirer. Cinq blocs maximum visibles à la fois ; les blocs avancés
apparaissent quand le niveau les demande.

Le robot est sur une grille (12 × 8). Il avance d’une case, tourne d’un
quart de tour, attend un capteur, répète ou choisit. Chaque bloc s’exécute
en environ 400 ms ; le bloc courant est surligné. Boutons : Démarrer,
Pause, Pas à pas, Recommencer. Vitesse : lent, normal, rapide. Aucun
chiffre : les répétitions sont des pastilles, le temps est une barre.

Capteurs :

- **contact** : un obstacle ou un bouton devant le robot ;
- **distance** : `loin`, `proche`, `très proche` (pas de centimètres) ;
- **couleur** : la case sous le robot (`blanc`, `noir`, `rouge`, `vert`,
  `bleu`).

Le programme est limité (200 pas, 20 répétitions par boucle). Si la limite
est atteinte, Zap explique « On tourne en rond ? » et propose de regarder
le capteur, jamais « Perdu ».

### 4.3 Chapitre 11 — « Les yeux du robot » (5 niveaux)

| ID | Titre | Objectif | Concept | Interaction | Réussite | Source |
|---|---|---|---|---|---|---|
| `vision-01` | Que voit le robot ? | Trouve la case allumée dans l’image. | pixel, image | grille de pixels | la bonne case est touchée | IA ch. 5.1-5.2 |
| `vision-02` | Le monde en couleurs | Isole l’objet rouge. | filtre de couleur, masque | pastilles de couleur | le masque ne garde que le rouge | IA ch. 5.3.1-5.3.2 |
| `vision-03` | Trouve l’objet | Trouve le plus grand contour. | contour, cadre, centre | toucher la forme | la forme et son centre sont trouvés | IA ch. 5.3.3 |
| `vision-04` | Vise le centre | Garde la cible au centre. | suivi, correction | boutons gauche/droite/haut/bas | la cible reste au centre | IA ch. 6.4-6.5, 7.4 |
| `vision-05` | Reconnais ton ami | Dis si c’est Zap ou Robo. | détecter ≠ reconnaître | cartes de visages | le bon ami est reconnu | IA ch. 7.1-7.7 |

Interaction : une « caméra » simulée, une grille SVG de 16 × 12 cases
colorées. Aucune caméra réelle n’est demandée. L’enfant peut :

- choisir une couleur cible parmi quatre pastilles ;
- voir le masque noir et blanc ;
- voir le contour et le cadre du plus grand objet ;
- déplacer le cadre de visée avec quatre gros boutons ;
- comparer un visage cartoon à deux « fiches d’identité ».

Le vocabulaire distingue clairement :

- **détecter** : « Je vois un visage. »
- **reconnaître** : « C’est Zap. »
- **suivre** : « Je garde Zap au centre. »

Aucune photo réelle, aucun visage d’enfant, aucune donnée biométrique.
Les visages sont des dessins de Zap et de Robo.

### 4.4 Chapitre 12 — « Mission Robot » (4 missions)

| ID | Titre | Objectif | Compétence | Inspiration EuroBot 2026 |
|---|---|---|---|---|
| `mission-01` | Le nid | Rapporte les caisses de noisettes au nid, six au maximum. | prise/dépose, stratégie | « Gardons les noisettes au chaud ! » |
| `mission-02` | Le garde-manger | Range les caisses dans le garde-manger et les zones bonus. | tri, zones, score | « Trouver, c’est garder ! », « Douce maison » |
| `mission-03` | Ni trop chaud, ni trop froid | Place chaque caisse dans la zone à la bonne température. | capteur, curseur, choix | « Ni trop chaud, ni trop froid » |
| `mission-04` | La grande manche | Marque un maximum de points en 100 s. | stratégie, pilotage ou programme, temps | « À table ! » et manche complète |

Une mission se joue sur un tapis de 16 × 12 cases, qui représente le
terrain EuroBot de 3 m × 2 m : zone de départ, nid, garde-manger, zones
bonus, caisses de noisettes et, en option, un petit frigo ou un SIMA.

Deux façons de jouer :

- **Piloter** (EuroBot Junior) : quatre gros boutons avant, arrière,
  gauche, droite, plus « Prendre » et « Déposer ». Le robot avance d’une
  case à chaque appui maintenu. C’est le mode des 8-9 ans et de la
  catégorie Junior.
- **Programmer** (passerelle EuroBot Open) : l’enfant écrit un programme
  en blocs, puis appuie sur « Démarrer ». Le robot exécute tout seul.
  C’est le mode des 10-12 ans et de la préparation à l’Open.

Dans les deux modes, une barre de temps se vide (pas de chiffres). À la
fin, les caisses bien placées donnent des étoiles. Le nid accepte au plus
six caisses ; le garde-manger et les zones bonus rapportent plus. On peut
recommencer autant de fois que nécessaire.

Éléments aléatoires : certaines missions mélangent la position des caisses
à chaque essai, comme en concours. Un bouton « Nouvelle disposition »
relance un tirage. Le tirage est déterministe à partir d’une graine, pour
pouvoir rejouer et tester.

Après la manche, l’enfant appuie sur trois tampons : « J’ai construit »,
« J’ai programmé », « J’ai testé ». Ces tampons restent sur l’appareil et
ne sont pas envoyés au serveur ; l’adulte peut les voir sur le même
appareil.

## 5. Architecture technique

### 5.1 Principe

Le moteur de circuit existant ne doit pas être détourné pour simuler de la
mécanique ou des programmes. On ajoute des modules purs, testables, dans
`packages/shared` :

```
packages/shared/src/
  mechanics/     pièces, engrenages, leviers, poulies, liaisons, solveur
  robot/         grille, pose, déplacement, capteurs, objets
  blocks/        programme en blocs, interpréteur, limites, validation
  vision/        image simulée, filtre de couleur, contours, visages
  missions/      tapis, objectifs, tirage aléatoire, score
  levels/        nouveaux chapitres et types de niveaux
```

Chaque module est du TypeScript strict, sans React, sans dépendance
native. Les tests Vitest vivent à côté.

### 5.2 Modèle de niveau

`LevelDefinition` devient une union discriminée :

```ts
type LevelDefinition =
  | CircuitLevelDefinition      // kind: 'circuit' | 'materials' | 'matching'
  | MechanismLevelDefinition    // kind: 'mechanism'
  | ProgrammingLevelDefinition  // kind: 'programming'
  | VisionLevelDefinition       // kind: 'vision'
  | MissionLevelDefinition;     // kind: 'mission'
```

Les champs communs (id, chapitre, ordre, titre, objectif, indices,
vocabulaire, niveau suivant) restent dans une base. Les champs propres au
circuit deviennent obligatoires seulement dans `CircuitLevelDefinition`.
C’est un refactor de typage, pas une migration de données.

Nouvelles conditions de réussite :

- `mechanism_moves`, `mechanism_speed`, `mechanism_torque`,
  `mechanism_direction`, `mechanism_lifts`, `mechanism_walks` ;
- `program_succeeds` (objectif atteint à la fin de l’exécution) ;
- `vision_task` (case, couleur, contour, centre, visage) ;
- `mission_score` (nombre d’objectifs, seuil d’étoiles).

`evaluateLevelSuccess` reste la fonction d’entrée et délègue aux
évaluateurs de chaque type. Les niveaux de circuit existants ne changent
pas.

### 5.3 Mécanique

Le banc est une scène SVG avec des chevilles. Les pièces sont des objets
purement visuels, reliés par un graphe :

- `gear` : taille `small | medium | large`, dents internes 8/16/24 ;
- `worm` : vis sans fin, axe perpendiculaire ;
- `rack` : crémaillère, rotation → translation ;
- `lever` : point d’appui `near_load | middle | near_effort` ;
- `crank` + `rod` + `slider` : manivelle, bielle, coulisseau ;
- `pulley` : `fixed | movable`, prévu pour l’atelier libre et la 0.5.1 ;
- `motor` : source de rotation ;
- `load` : masse à soulever ou à pousser.

Le solveur construit le graphe, propage les classes de vitesse et de
couple, le sens, et renvoie un diagnostic (`blocked`, `conflict`,
`disconnected`). Il ne calcule pas de frottement ni de rendement : on
reste qualitatif. Les tests couvrent les cas célèbres (petit menant →
grand mené, ver, levier, crémaillère, bielle, poulie de l’atelier libre).

Animations : rotation des engrenages à vitesse relative, fil de corde,
levier, jambes. `requestAnimationFrame` avec pause quand l’onglet est
caché ; `prefers-reduced-motion` remplace l’animation par des états
successifs.

### 5.4 Programmation et robot

Le robot vit sur une grille de 12 × 8 cases pour les niveaux d’apprentissage
et de 16 × 12 cases pour les missions EuroBot. La pose est
`{ x, y, heading }`. Les déplacements sont discrets : une case, un quart de
tour. Les objets occupent une case. Un mur bloque le déplacement ; Zap
donne un indice.

Deux modes partagent le même simulateur :

- **Piloter** : les commandes `forward`, `backward`, `left`, `right`,
  `pick`, `drop` sont envoyées par les boutons ; un appui maintenu avance
  d’une case toutes les 300 ms. Aucun interpréteur.
- **Programmer** : les mêmes actions passent par l’interpréteur de blocs.

L’interpréteur est une machine à états pas à pas :

```ts
interface BlockProgram {
  blocks: Block[];
}

type Block =
  | { type: 'move'; direction: 'forward' | 'backward' }
  | { type: 'turn'; direction: 'left' | 'right' }
  | { type: 'wait'; sensor: SensorId; test: SensorTest }
  | { type: 'repeat'; times: 2 | 3 | 4; body: Block[] }
  | { type: 'if'; sensor: SensorId; test: SensorTest; body: Block[] }
  | { type: 'pick' }
  | { type: 'drop' };
```

L’exécution renvoie un journal d’étapes (`step`, `blockId`, `robot`,
`sensor`, `message`). L’interface surligne le bloc courant et peut
avancer pas à pas. Limites : 200 pas, 20 répétitions, profondeur
d’imbrication 2. En cas de dépassement, message doux et retour au
programme.

Capteurs : contact (case devant bloquée ou bouton), distance (raycast
jusqu’au premier mur/objet, classe qualitative), couleur (couleur de la
case sous le robot). Les valeurs sont des énumérations, jamais des
nombres.

### 5.5 Vision

L’image simulée est une grille de 16 × 12 cellules, chacune avec une
couleur. Les objets sont des formes dessinées dans la grille (caisse,
carré, triangle, visage cartoon). Le module `vision` fournit :

- `toMask(frame, color)` : masque booléen ;
- `connectedComponents(mask)` : composantes connexes ;
- `largestComponent` : plus grande composante et son cadre ;
- `centerOf(component)` : centre ;
- `classifyFace(frame)` : détection de visage cartoon ;
- `recognizeFriend(frame)` : comparaison à deux modèles (Zap/Robo).

Aucune image réelle, aucun appel caméra, aucun modèle externe. Tout est
déterministe et testable.

### 5.6 Missions

Le tapis est une grille avec des cellules typées (`floor`, `wall`,
`start`, `nest`, `pantry`, `bonus`, `temperature`), des objets (`crate`,
`fridge`, `sima`) et des objectifs (`deliver_nest`, `deliver_pantry`,
`bonus`, `temperature`, `collect`). Le module `missions` :

- `createMission(seed)` : disposition reproductible ;
- `applyAction(state, action)` : prise, dépose, pousse ;
- `evaluateMission(state, mission)` : objectifs atteints, étoiles ;
- `timer` : 100 s en ticks, pas en secondes affichées.

Le nid compte au plus six caisses. Le garde-manger et les zones bonus
rapportent plus d’étoiles. Les frigos et le SIMA restent optionnels en
0.5.0 : on les montre dans la page coach et l’atelier libre, sans en faire
une condition de réussite.

Le tirage réutilise `challenges/rng.ts`. Le générateur de défis de
circuit reste inchangé.

### 5.7 Front

Nouvelles pages, chargées à la demande :

- `MechanismLevelPage` : banc mécanique ;
- `ProgrammingLevelPage` : blocs + robot + capteurs ;
- `VisionLevelPage` : caméra simulée ;
- `MissionLevelPage` : tapis + programme + score.

Composants SVG : `MechanismBench`, `GearArt`, `RobotArt`, `SensorPanel`,
`BlockPalette`, `ProgramStack`, `VisionGrid`, `MissionField`,
`MissionScore`.

`GameShell` route selon `level.kind`. `useLevelSession` est réutilisé
pour les tentatives, les indices et les étoiles. `LevelMapPage` affiche
les nouveaux chapitres avec une couleur et une icône par chapitre.

Interactions : Pointer Events uniquement. Ajouter un bloc = toucher ;
déplacer = glisser ; retirer = toucher. Les pièces de mécanique
s’aimantent aux chevilles. Aucune action ne dépend du survol, du
double-clic, du clic droit ou du clavier.

### 5.8 Narration, textes et voix

Tous les textes passent par `narration/fr.ts`, `texts.en.ts`,
`texts.zh.ts` et `admin/fr.ts`, `admin/texts.en.ts`, `admin/texts.zh.ts`.
Aucun texte en dur.

Nouveau vocabulaire :

- mécanique : engrenage, axe, roue, ver sans fin, levier, point d’appui,
  crémaillère, manivelle, bielle, structure ; poulie et corde en atelier
  libre ;
- robot : capteur, contact, distance, couleur, programme, séquence,
  boucle, condition, essai, debug ;
- vision : pixel, image, masque, contour, cadre, centre, détecter,
  reconnaître, suivre ;
- concours : mission, équipe, rôle, manche, stratégie, journal.

Chaque niveau a trois indices progressifs. Les phrases font 12 mots
maximum. La voix française utilise le service existant ; les nouveaux
textes peuvent d’abord passer par la synthèse vocale, puis être
enregistrés en MP3 dans un second temps.

### 5.9 Progression et espace adulte

Les nouveaux niveaux sont ajoutés à `ALL_LEVEL_METADATA` et à
`PROGRESS_CONCEPTS` :

- `engrenage`, `levier`, `cremaillere`, `liaison` ;
- `capteur`, `boucle`, `condition`, `programme` ;
- `pixel`, `couleur`, `contour`, `visage` ;
- `mission`, `equipe`.

Aucune nouvelle route API, aucune nouvelle collection MongoDB. Les
tentatives existantes acceptent un `levelId` sous forme de chaîne. Les
tableaux de bord encadrant et parent affichent les nouveaux concepts.

Nouvelle page adulte `/admin/competition` (encadrant et admin, pas
parent) :

- plan de préparation en huit semaines ;
- grille de compétences par élève (mécanique, pilotage, programmation,
  vision, stratégie, équipe) calculée à partir des niveaux terminés ;
- checklist d’homologation EuroBot : dimensions, hauteur, arrêt
  d’urgence, tension, câble de commande en Junior, poster A1, au moins
  trois manches de qualification ;
- méthode d’itération générique : identifier, concevoir, créer, itérer,
  communiquer ;
- fiches imprimables de mission et liste de matériel ;
- rappels de sécurité pour un vrai robot.

Aucune donnée personnelle nouvelle : on réutilise les prénoms/pseudos,
les groupes et la progression existants. Les rôles d’équipe et les
tampons du journal restent sur l’appareil.

### 5.10 PWA, version et déploiement

- Version 0.5.0 dans la racine, `apps/web`, `apps/api` et
  `packages/shared`, et dans le fallback de `version.ts`.
- Les nouveaux chapitres sont chargés à la demande ; le premier écran ne
  grossit pas.
- Toutes les images sont des SVG locaux ; aucun CDN, aucune police
  externe.
- Le mode robot fonctionne hors ligne après le premier chargement ; la
  progression se synchronise quand le réseau revient.
- Aucune dépendance native nouvelle : le build linux/arm64 n’est pas
  affecté.
- `pnpm verify`, `pnpm test:e2e`, build arm64 et test iPad restent les
  portes de sortie.

### 5.11 Protection des enfants

- Pas de caméra réelle, pas de micro, pas de photo de visage.
- Les visages sont des dessins ; aucune donnée biométrique.
- Pas de classement public, pas de comparaison entre élèves.
- Pas de nouveau champ personnel ; les rôles et tampons sont locaux.
- Les exports et suppressions RGPD existants continuent de couvrir la
  progression.
- Les messages de sécurité rappellent : couper l’alimentation avant de
  toucher un robot, ne jamais toucher aux prises, attention aux pignons
  qui pincent, les servos chauffent, la batterie et le bouton d’arrêt
  d’urgence, la tension maximale de 48 V, le câble de commande de 5 m en
  Junior.

## 6. Contenu et progressivité

### 6.1 Difficulté

| Chapitre | Découverte (8-9) | Défi (10-12) |
|---|---|---|
| 9 Mécanique | deux pièces, un seul effet | trois pièces, choisir le bon montage |
| 10 Robot | séquence et attente | boucle, condition, capteurs combinés |
| 11 Vision | pixel, couleur | contour, centre, détection vs reconnaissance |
| 12 Mission | pilotage assisté, une caisse | programmation autonome, plusieurs caisses, 100 s |

Le mode Défi n’est pas un autre chapitre : c’est une option de niveau
(blocs avancés, indices réduits) pour éviter de doubler le contenu.

### 6.2 Ce qu’on écarte

- Les armes et les projectiles : remplacés par des mécanismes non violents.
- Les nombres de dents, les rapports, les degrés, les centimètres, les
  secondes à l’écran.
- La soudure, le secteur, les tensions réelles, les moteurs physiques.
- Le code Python syntaxique pour les 8-9 ans ; on reste sur des blocs.
- Les réseaux de neurones, le PID formalisé, Haar en détail : mentionnés
  comme « coulisses », pas exigés.
- La caméra réelle et la reconnaissance faciale réelle.
- Les classements et les scores chiffrés visibles par les enfants.

## 7. Tests et critères d’acceptation

### 7.1 Tests unitaires (packages/shared)

- Mécanique : sens alterné, petit→grand lent/fort, grand→petit
  rapide/faible, ver bloquant, levier, crémaillère, bielle, conflit,
  pièce non reliée ; poulie de l’atelier libre.
- Blocs : séquence, répétition, condition, attente, capteurs, limite de
  pas, boucle infinie, prise/dépose.
- Robot : déplacement, collision, distance, couleur, objets, pilotage
  case par case, appui maintenu, prise/dépose.
- Vision : masque, composantes, plus grand contour, centre, visage,
  reconnaissance.
- Missions : objectifs, tirage reproductible, score, temps.
- Niveaux : 21 identifiants uniques, ordre, `nextLevelId`, trois indices,
  vocabulaire, clés de texte.

### 7.2 Tests React

- Les quatre pages s’affichent et se terminent.
- Ajouter/déplacer/retirer un bloc au doigt.
- Glisser un engrenage sur une cheville.
- Démarrer, pause, pas à pas, recommencer.
- Piloter avec les quatre boutons et prendre/déposer une caisse.
- Changer de couleur, voir le masque, trouver le contour.
- Réussite, indices, étoiles, changement de langue.
- `prefers-reduced-motion`.
- Cibles ≥ 48 px (56 px en compact).

### 7.3 Tests navigateur

- Un spec Playwright par nouveau chapitre.
- iPad 768 × 1024, téléphone 740 × 360.
- Rechargement hors ligne après un premier chargement.
- Capture de la carte des niveaux mise à jour.
- Vérification que le premier écran ne charge pas les nouveaux modules.

### 7.4 Manuel

- Safari iPad : voix, audio, gestes, pointer events.
- Chrome Android, Firefox/Edge desktop.
- Build Docker linux/arm64.
- `pnpm verify` sans avertissement.

### 7.5 Définition de « terminé »

- Les 21 niveaux sont jouables, avec trois indices et des étoiles.
- Les textes existent en FR/EN/ZH, sans texte en dur.
- Les tests unitaires, React et E2E passent.
- La progression des anciens joueurs n’est pas bloquée.
- Aucun nouvel appel caméra, aucune donnée personnelle nouvelle.
- La version 0.5.0 est visible et la PWA se met à jour.

## 8. Migration et compatibilité

- Les chapitres 9 à 12 se placent après le dernier niveau de la 0.4.0
  (`cap-06`). `cap-06.nextLevelId = 'meca-01'`.
- Si la 0.4.0 n’est pas encore livrée, ne pas démarrer la 0.5.0 : les
  numéros de chapitres et les liens se chevaucheraient.
- `reconcileProgress` débloque le premier niveau pour les joueurs qui ont
  terminé le chapitre précédent.
- Aucune migration MongoDB : les tentatives stockent déjà un `levelId`
  libre.
- Les circuits et programmes enregistrés localement ne sont pas touchés.
- Les anciens niveaux gardent leur comportement ; le refactor de type ne
  change pas les données.

## 9. Découpage et estimation

Estimation pour une personne, tests inclus. À ajuster après le prototype.

| Phase | Contenu | Livrables | Jours |
|---|---|---|---:|
| 0 | Fondation | union de niveaux, modules vides, prototype banc + blocs | 5-7 |
| 1 | Mécanique | solveur, art, 6 niveaux, textes, tests | 8-10 |
| 2 | Robot | interpréteur, grille, capteurs, 6 niveaux, tests | 12-15 |
| 3 | Vision | image simulée, filtres, contours, 5 niveaux, tests | 8-10 |
| 4 | Missions | tapis EuroBot, pilotage, 4 missions, score, journal, page coach | 12-14 |
| 5 | Finition | i18n, voix, PWA, E2E, iPad, accessibilité, docs | 6-8 |

Total : environ 51 à 64 jours. À deux développeurs, les phases 1 et 3
peuvent avancer en parallèle après la phase 0 ; compter 6 à 8 semaines.

Découpe de secours si le temps manque :

- **0.5.0** : chapitres 9 et 10 (mécanique + cerveau), 12 niveaux.
- **0.5.1** : chapitres 11 et 12 (vision + missions), 9 niveaux.

Cette découpe garde une histoire complète : on construit, on programme,
puis on voit et on concourt.

## 10. Risques

| Risque | Impact | Réduction |
|---|---|---|
| Nouveau domaine trop large | 0.5.0 jamais finie | découpe 0.5.0/0.5.1, prototype avant art |
| Mécanique qualitative floue | l’enfant ne comprend pas | animations, classes lent/fort, test enfant |
| Blocs difficiles au doigt | frustration | ajout par toucher, 5 blocs, pas de double-clic |
| Vision simulée magique | l’enfant ne relie pas au réel | grille de pixels visible, masque, contour |
| Temps de manche stressant | peur de l’échec | barre visuelle, essais illimités, pas de « Perdu » |
| Textes trop longs | test enfant en échec | 12 mots, relecture adulte, tests |
| Règlements qui changent | missions obsolètes | missions génériques + pack saisonnier |
| Marques et armes | problème juridique/éthique | pièces génériques, pas de logo LEGO, pas d’arme |
| Performance iPad | saccades | grilles limitées, SVG memoïsé, chargement à la demande |
| Dépendance à la 0.4.0 | conflit de chapitres | attendre la 0.4.0 ou renuméroter |

## 11. Décisions à prendre avant de coder

1. Livrer les quatre chapitres en 0.5.0, ou couper en 0.5.0 + 0.5.1 ?
   Recommandation : préparer les quatre, livrer 9-10 puis 11-12 si besoin.
2. Refactor `LevelDefinition` en union discriminée, ou champs optionnels ?
   Recommandation : union, plus sûre avec TypeScript strict.
3. Robot sur grille ou en mouvement continu ?
   Recommandation : grille, plus lisible et testable pour 8-12 ans.
4. Caméra simulée ou vraie caméra ?
   Recommandation : simulée, pour la vie privée et la compatibilité.
5. Étoiles seulement, ou points chiffrés pour les adultes ?
   Recommandation : étoiles pour l’enfant, points dans la fiche coach.
6. Faut-il un mode Défi séparé pour les 10-12 ans ?
   Recommandation : option de niveau, pas de contenu dupliqué.
7. Que faire des montages à thème d’arme du livre EV3 ?
   Recommandation : les exclure et les remplacer par des mécanismes non
   violents.
8. Faut-il proposer le pilotage et la programmation dès la 0.5.0 ?
   Recommandation : oui, le pilotage pour EuroBot Junior et la
   programmation comme passerelle vers EuroBot Open.
9. Comment suivre le thème EuroBot annuel ?
   Recommandation : missions génériques + un pack de saison mis à jour
   chaque année, sans toucher au moteur.

## 12. Recommandation

Commencer par la mécanique et l’interpréteur de blocs. Ce sont les deux
briques qui rendent les missions possibles ; la vision est indépendante et
peut être développée en parallèle. Livrer ensuite les missions, qui
donnent du sens à tout le reste.

Ordre conseillé :

1. prototype du banc mécanique et du programme en blocs ;
2. chapitre 9 (mécanique) ;
3. chapitre 10 (cerveau) ;
4. chapitre 11 (vision) ;
5. chapitre 12 (missions) ;
6. page coach, i18n, PWA, tests iPad.

Le premier jalon doit rester petit : un engrenage qui tourne, un robot qui
avance, un capteur qui arrête. Si ces trois gestes sont agréables au
doigt, le reste suit.

## 13. Références

- EuroBot 2026, règlement officiel FR :
  https://www.eurobot.org/wp-content/uploads/2025/10/Eurobot2026_Rules_1.0_FR.pdf
- EuroBot 2026, règlement officiel EN :
  https://www.eurobot.org/wp-content/uploads/2025/10/Eurobot2026_Rules_1.0_EN.pdf
- EuroBot Junior, règlement général :
  https://www.coupederobotique.fr/wp-content/uploads/Eurobot_General_Rules_JR_EN.pdf
- Site officiel EuroBot :
  https://www.eurobot.org/
- Livres :
  - 码高机器人教育, 《乐高机器人设计技巧：EV3 结构设计与编程指导》,
    人民邮电出版社, 2017.
  - 陈宇航, 侯俊萍, 叶昶, 《人工智能+机器人入门与实战：用树莓派+
    Python+OpenCV 制作计算机视觉机器人》, 人民邮电出版社, 2020.

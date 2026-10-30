# Plan — version 0.4.0 « Les composants qui choisissent »

Date : 30 octobre 2026
Statut : implémenté dans la version 0.4.0.
Source principale : `docs/plan-nouveaux-cours.md`, lui-même issu de la lecture
du livre 《少年电子入门 元件和电路》.
Dépendance : aucune. En revanche, la version 0.5.0 « Le Labo Robot » dépend de
cette version : ses chapitres passent de 9-12 à 10-13.

## 1. Pourquoi cette version

Le jeu s'arrête aujourd'hui après les défis du chapitre 4. L'enfant sait
allumer une ampoule, comprendre le courant, la tension, la résistance, monter
en série et en parallèle. Il ne sait pas encore que certains composants
**choisissent** le courant : une diode le laisse passer dans un seul sens, un
électroaimant le transforme en aimant, une photorésistance change avec la
lumière, un condensateur le stocke.

La 0.4.0 raconte cette étape. Elle ajoute cinq chapitres et vingt niveaux :

| Chapitre | Titre | Niveaux |
|---|---|---:|
| 5 | Le coin des sons | 3 |
| 6 | Une porte à sens unique | 3 |
| 7 | L'aimant électrique | 5 |
| 8 | La lumière commande | 3 |
| 9 | Le réservoir d'électricité | 6 |

Le chapitre 5 est un rodage volontaire : il ne introduce aucun composant
nouveau et réutilise la sonnerie déjà présente dans le moteur. Il permet de
valider la chaîne « niveau → textes → carte → tests » avant les composants
nouveaux.

## 2. Décisions de cadrage

1. **Livrer les quatre chapitres d'électronique** prévus par
   `docs/plan-nouveaux-cours.md`, soit 17 niveaux.
2. **Ajouter le chapitre « sons »** comme chapitre 5, soit 20 niveaux et
   46 niveaux au total.
3. **Vrai solveur transitoire** pour le condensateur : modèle MNA et Euler
   arrière, pas de réservoir qualitatif. Il servira aussi au flash et à la
   veilleuse.
4. **Relais à quatre bornes** conservé, avec contact normalement ouvert ou
   normalement fermé. Le contact normalement fermé est nécessaire à la
   veilleuse automatique `sensor-02`.
5. **Aucun identifiant existant renommé** : les nouveaux niveaux lumineux
   utilisent `sensor-01..03`, pas `light-01..03` déjà pris par le chapitre 1.
6. **Atelier libre inchangé en 0.4.0** : les nouveaux composants ne sont pas
   exposés dans la palette du bac à sable. Cela évite qu'un circuit sauvegardé
   avec un type inconnu casse la liste des anciens clients, et évite de
   dupliquer la boucle transitoire dans `SandboxPage`.
7. **Le plan 0.5.0 est renuméroté** : ses chapitres 9-12 deviennent 10-13.

## 3. Principes pédagogiques

Les règles de `CLAUDE.md` restent la référence :

- un seul nouveau concept par niveau ;
- du concret vers l'abstrait : objet réaliste, puis symbole, puis les deux ;
- phrases de 12 mots maximum, tutoiement, ton encourageant ;
- aucun échec punitif : une erreur donne un indice, jamais « Perdu » ;
- aucun nombre à l'écran : « brille fort », « faiblement », « vide », « plein »,
  « aimant fort », « aimant faible » ;
- retour visuel immédiat : l'ampoule s'allume, la sonnerie sonne, les trombones
  bougent, le réservoir se remplit ;
- sécurité : le condensateur garde son électricité, on ne touche jamais aux
  prises, le court-circuit reste expliqué ;
- Pointer Events uniquement, cibles ≥ 48 px, 56 px en compact ;
- cinq boutons visibles au maximum, un seul nouveau contrôle à la fois.

## 4. Curriculum détaillé

Les colonnes « Affichage » suivent les trois modes existants : `realistic`,
`overlay` (réaliste + badge symbole) et `symbol`. La colonne « Livre » renvoie
aux chapitres du livre source.

### 4.1 Chapitre 5 — « Le coin des sons » (3 niveaux)

Objectif du chapitre : réinvestir le circuit fermé et les interrupteurs avec
un appareil que l'enfant entend. Aucun composant nouveau.

| ID | Titre | Objectif | Concept | Composants | Réussite | Affichage | Livre |
|---|---|---|---|---|---|---|---|
| `sound-01` | La sonnerie | Fais sonner la sonnerie. | Un composant transforme le courant en son. | pile, sonnerie, interrupteur | la sonnerie sonne | réaliste | 7 |
| `sound-02` | Deux boutons | Il faut appuyer sur les deux boutons. | Deux interrupteurs en série. | pile, sonnerie, 2 interrupteurs | la sonnerie sonne seulement si les deux sont fermés | superposition | 7 |
| `sound-03` | Le moteur et la sonnerie | Fais tourner le moteur et sonner la sonnerie. | Deux appareils en parallèle. | pile, moteur, sonnerie, interrupteur | le moteur tourne et la sonnerie sonne | symboles | 7 |

Notes :

- `sound-02` utilise `components_series` sur les deux interrupteurs, pas
  seulement « les deux fermés » : sinon un montage en parallèle passerait.
- `sound-03` utilise `components_parallel` sur le moteur et la sonnerie.
- La sonnerie est déjà dans le moteur et dans la palette ; le chapitre ne
  touche ni au solveur ni à la sérialisation.

### 4.2 Chapitre 6 — « Une porte à sens unique » (3 niveaux)

Objectif du chapitre : la diode ne laisse passer le courant que de l'anode
vers la cathode. À l'envers, elle bloque.

| ID | Titre | Objectif | Concept | Composants | Réussite | Affichage | Livre |
|---|---|---|---|---|---|---|---|
| `diode-01` | La porte à sens unique | Allume l'ampoule avec la diode dans le bon sens. | La diode conduit dans un seul sens. | pile, diode, ampoule, interrupteur | ampoule allumée ; à l'envers, indice « la diode bloque » | réaliste | 5.2 |
| `diode-02` | Le bon sens | Fais sonner la sonnerie dans le bon sens. | La diode bloque le courant inverse. | pile, diode, sonnerie, interrupteur | sonnerie allumée ; à l'envers, silence et indice | superposition | 5.2 |
| `diode-03` | Deux chemins, un seul sens | Allume l'ampoule avec l'une ou l'autre pile. | Deux diodes font un choix de source sans retour. | 2 piles, 2 diodes, ampoule | ampoule allumée avec chaque pile ; retirer une pile ne coupe pas l'autre chemin | symboles | 5.3, 5.8 |

Notes :

- `diode-01` et `diode-02` sont volontairement proches pour que l'enfant
  retrouve le geste : retourner la diode avec le bouton de rotation.
- `diode-03` est un capstone à valider en test enfant. Si la condition
  « chaque source alimente l'ampoule » est trop difficile à exprimer ou à
  comprendre, le remplacer par un niveau de reconnaissance diode/LED.
- Le diagnostic `diode_reversed` n'est pas bloquant globalement : dans
  `diode-03`, une diode peut être à l'envers sur un chemin inactif pendant que
  l'autre conduit. La réussite passe par l'ampoule allumée.

### 4.3 Chapitre 7 — « L'aimant électrique » (5 niveaux)

Objectif du chapitre : un courant crée un aimant. La bobine le concentre, la
lame souple réagit à un aimant, le relais commande un autre circuit.

| ID | Titre | Objectif | Concept | Composants | Réussite | Affichage | Livre |
|---|---|---|---|---|---|---|---|
| `mag-01` | Le fil qui aimante | Attire les trombones avec le courant. | Un courant crée un champ magnétique ; la bobine le concentre. | pile, interrupteur, électroaimant, trombones | au moins un trombone attiré | réaliste | 3.1 |
| `mag-02` | Plus de tours ! | Prends la bobine qui attire tous les trombones. | Plus de tours = aimant plus fort. | pile, interrupteur, 2 électroaimants (peu/beaucoup de tours), trombones | tous les trombones avec la grande bobine | réaliste | 3.1 |
| `mag-03` | L'interrupteur aimanté | Allume l'ampoule avec un aimant. | La lame souple se ferme quand un aimant approche. | pile, lame souple, ampoule, aimant | ampoule allumée aimant proche, éteinte aimant loin | réaliste | 4.2 |
| `mag-04` | Le relais de Zap | Commande la lampe avec un petit courant. | Le relais est un interrupteur commandé par un électroaimant. | pile A, interrupteur, relais, pile B, ampoule | ampoule allumée quand la bobine est alimentée | superposition | 4.1 |
| `mag-05` | Le portier | Fais sonner la sonnette quand la porte s'ouvre. | Lame souple + sonnerie = alarme. | pile, lame souple, sonnerie, aimant | sonnerie quand l'aimant approche, silence sinon | superposition | 4.5 |

Notes :

- L'aimant et les trombones sont des **accessoires visuels**, pas des
  composants électriques. L'aimant se déplace au doigt ; sa proximité met à
  jour `reed.magnetNear`.
- `mag-02` utilise deux variantes de palette : `electromagnet-short` (peu de
  tours) et `electromagnet-long` (beaucoup de tours). L'art de la bobine suit
  le nombre de tours.
- Le relais `mag-04` est normalement ouvert. `sensor-02` utilisera la variante
  normalement fermée.
- Option écartée pour 0.4.0 : `mag-06` « La grue de Zap » (attribut
  `magnetic` sur les objets). À garder pour une finition.

### 4.4 Chapitre 8 — « La lumière commande » (3 niveaux)

Objectif du chapitre : la lumière modifie une résistance ou produit une
tension. L'enfant bascule jour/nuit et observe la réponse.

| ID | Titre | Objectif | Concept | Composants | Réussite | Affichage | Livre |
|---|---|---|---|---|---|---|---|
| `sensor-01` | La résistance qui aime le soleil | Couvre le capteur et regarde l'ampoule. | La photorésistance conduit mieux à la lumière. | pile, capteur de lumière, ampoule | ampoule forte à la lumière, faible ou éteinte à l'ombre | réaliste | 8.1 |
| `sensor-02` | La veilleuse automatique | Allume la lampe quand il fait nuit. | Photorésistance + relais inversent la réponse. | pile, capteur, relais normalement fermé, ampoule, bouton jour/nuit | lampe allumée la nuit, éteinte le jour | superposition | 8.5 |
| `sensor-03` | Le panneau solaire | Fais tourner le moteur avec la lumière. | La cellule solaire transforme la lumière en électricité. | panneau solaire, moteur, bouton jour/nuit | moteur allumé à la lumière, arrêté à l'ombre | réaliste | 8.3 |

Notes :

- Le contrôle jour/nuit est un bouton unique qui règle `lightLevel` à 0 ou 1
  sur tous les composants sensibles. Il n'y a pas de nombre affiché.
- `sensor-02` utilise un relais **normalement fermé** : la nuit, la bobine
  n'est pas alimentée, le contact reste fermé et la lampe s'allume. Le jour,
  la bobine est alimentée, le contact s'ouvre et la lampe s'éteint.
- `sensor-03` n'a pas de pile. `analysis.hasSource` reconnaît le panneau comme
  source, même la nuit (tension nulle). La réussite ne demande pas
  `circuit_ok` la nuit : c'est le moteur arrêté qui prouve la réponse.
- Option écartée : `light-04` « La voiture solaire » (panneau + moteur +
  interrupteur), capstone possible plus tard.

### 4.5 Chapitre 9 — « Le réservoir d'électricité » (6 niveaux)

Objectif du chapitre : le condensateur stocke de l'énergie, se remplit
lentement et la rend doucement. C'est le chapitre qui introduit la simulation
temporelle.

| ID | Titre | Objectif | Concept | Composants | Réussite | Affichage | Livre |
|---|---|---|---|---|---|---|---|
| `cap-01` | La réserve de Zap | Ouvre l'interrupteur et regarde l'ampoule rester allumée. | Le condensateur stocke l'énergie et la rend. | pile, interrupteur, condensateur, ampoule | ampoule encore allumée après ouverture, puis extinction douce | réaliste | 2.2 |
| `cap-02` | Ça se remplit | Regarde l'ampoule faiblir pendant la charge. | Le courant de charge diminue quand le condensateur se remplit. | pile, ampoule, condensateur, interrupteur | ampoule allumée au début, éteinte à la fin, condensateur plein | réaliste | 2.2.1 |
| `cap-03` | Ça se vide | Allume l'ampoule avec le condensateur chargé. | Le condensateur chargé peut alimenter un circuit. | condensateur préchargé, ampoule, interrupteur | ampoule allumée puis éteinte, condensateur vide | réaliste | 2.2.2 |
| `cap-04` | La veilleuse | Fais une lumière qui s'éteint doucement. | Un grand condensateur prolonge la lumière. | pile, interrupteur, grand condensateur, ampoule | ampoule allumée un peu après ouverture | superposition | 2.4, 2.10 |
| `cap-05` | Petit ou grand ? | Choisis le grand condensateur pour éclairer plus longtemps. | La capacité est la taille du réservoir. | pile, interrupteur, petit et grand condensateurs, ampoule | ampoule encore allumée longtemps avec le grand | réaliste | 2.4 |
| `cap-06` | Le flash de Zap | Charge, puis libère l'énergie d'un coup. | Le condensateur charge lentement et libère vite. | pile, résistance, condensateur, LED, 2 interrupteurs | un flash bref et fort après l'appui | superposition | 2.2, 2.10 |

Notes :

- Les durées « 2 s » et « 3 s » sont **internes** aux conditions de réussite.
  Les textes enfant disent « un peu » et « longtemps ».
- `cap-02` et `cap-03` demandent une simulation temporelle, pas seulement le
  calcul statique.
- `cap-06` a besoin d'une LED qui accepte un courant de décharge élevé pendant
  un temps très court ; les valeurs seront réglées en test (voir § 5.3).

## 5. Architecture du moteur (`packages/shared`)

### 5.1 Nouveaux composants

Dans `packages/shared/src/circuit/types.ts` :

| Type | Bornes | Champs | Valeurs par défaut |
|---|---|---|---|
| `diode` | `anode`, `cathode` | `resistance`, `forwardVoltage` | 100 Ω, 0.6 V |
| `electromagnet` | `a`, `b` | `resistance`, `turns` | 8 Ω, 40 tours (courte) / 120 (longue) |
| `reed` | `a`, `b` | `magnetNear`, `normallyOpen`, `resistanceWhenClosed` | false, true, 0.01 Ω |
| `relay` | `coilA`, `coilB`, `contactA`, `contactB` | `coilResistance`, `contactResistance`, `threshold`, `normallyClosed`, `closed` | 100 Ω, 0.01 Ω, 0.005 A, false, état initial |
| `ldr` | `a`, `b` | `lightResistance`, `darkResistance`, `lightLevel` | 2 Ω, 1000 Ω, 1 |
| `solar` | `positive`, `negative` | `voltage`, `internalResistance`, `lightLevel` | 4.5 V, 0.5 Ω, 1 |
| `capacitor` | `a`, `b` | `capacitance`, `initialVoltage` | 0.2 F (petit) / 0.5 F (grand), 0 |

`ComponentState` gagne des champs optionnels :

- `charge` : 0..1 pour le condensateur ;
- `magneticStrength` : 0..1 pour l'électroaimant ;
- `magnetNear` : booléen pour la lame souple ;
- `relayClosed` : booléen pour le relais ;
- `branchCurrents` : courants bobine/contact du relais.

L'aimant et les trombones ne sont pas des composants électriques : ce sont des
accessoires d'interface. Cela garde le modèle MNA simple.

### 5.2 Modèle multi-bornes

`EXPECTED_TERMINAL_IDS` passe de
`Record<ComponentType, readonly [string, string]>` à
`Record<ComponentType, readonly string[]>`.

`model.ts` :

- `buildCircuitModel` valide déjà un nombre quelconque de bornes ; seule la
  vérification `expectedTerminals` doit accepter un tableau.
- `nodesFor(component): [number, number]` reste pour les composants à deux
  bornes. Ajouter `nodesForTerminals(component, terminalIds): number[]` pour
  le relais.
- `validateComponent` traite chaque nouveau type et vérifie ses champs.

Consommateurs à adapter : `analysis.ts`, `simulate.ts`, `wireCurrents.ts`,
`serialization.ts`, `topology.ts`, `workbenchStore.addComponentOnWire` et
`wireSplice.ts`.

### 5.3 Analyse et diagnostics

`analysis.ts` ne doit plus traiter un type inconnu comme `load` par défaut :
chaque nouveau type reçoit une arête explicite.

| Type | Arête | Coût |
|---|---|---|
| `diode` | `diode` | 0 |
| `electromagnet` | `load` | 0 |
| `reed` | `closed-switch` ou `open-switch` selon `magnetNear` | 0 / 1 |
| `relay` bobine | `relay-coil` | 0 |
| `relay` contact | `relay-contact` | 0 (chemin potentiel) |
| `ldr` | `load` | 0 |
| `solar` | `source` | 0 |
| `capacitor` | `load` (circuit ouvert en statique) | 0 |

Règles importantes :

- **Relais** : le contact est un chemin *potentiel* pour que `analysis.closed`
  laisse le solveur tourner, mais il est exclu du graphe des courts-circuits
  (`isZeroResistanceEdge`). C'est le courant post-solve qui détecte un vrai
  court-circuit quand le contact est fermé.
- **Solaire** : `hasBattery` devient `hasSource`. Une pile ou un panneau suffit,
  même la nuit. Le panneau est estampillé `voltage × lightLevel` (0 la nuit) ;
  `missing_source` n'apparaît que s'il n'y a ni pile ni panneau.
- **Diode** : `diode_reversed` est un diagnostic d'information, non bloquant
  global. La réussite passe par `component_on`.
- **Condensateur** : en statique, c'est un circuit ouvert ; en transitoire, le
  modèle compagnon assure le courant. `analysis` le traite comme un chemin
  `load` pour que le solveur transitoire tourne.

Nouveaux diagnostics : `missing_source`, `diode_reversed`. Ils doivent être
ajoutés à `DIAGNOSTIC_PRIORITY`, `severityFor`, `BLOCKING_DIAGNOSTICS` si
nécessaire, `hints.ts`, `WorkbenchPage.getStatus` et aux trois dictionnaires
admin.

### 5.4 Solveur statique

`simulate.ts` généralise la boucle d'itération LED en une boucle de point de
fonctionnement :

1. initialiser les états commandés : LED éteinte, diode bloquée, relais dans
   son état initial ;
2. assembler le système MNA ;
3. résoudre ;
4. mettre à jour les états : LED/diode selon la tension de seuil, relais selon
   le courant de bobine avec hystérésis ;
5. répéter au maximum 12 fois, puis résoudre une dernière fois si nécessaire.

Le relais a deux branches :

- bobine : résistance `coilResistance` entre `coilA` et `coilB` ;
- contact : résistance `contactResistance` entre `contactA` et `contactB`
  quand le contact est fermé, circuit ouvert sinon.

Hystérésis : fermeture quand `|I_coil| > threshold`, ouverture quand
`|I_coil| < threshold × 0.6`. Pour un relais normalement fermé, l'état initial
est fermé et la logique est inversée.

`wireCurrents.ts` doit ajouter une demande de courant sur les quatre bornes du
relais (bobine et contact) et suivre la même convention de signe que la pile
pour le panneau solaire.

### 5.5 Solveur transitoire

Nouveau fichier `packages/shared/src/circuit/transient.ts`.

- État : `Record<capacitorId, voltage>`.
- Pas fixe `stepMs` (16 ms par défaut).
- Euler arrière : conductance `C / dt`, source de courant `C / dt × v_prev`.
- `createTransientSimulator(circuit, options)` expose `step()`, `reset()`,
  `snapshot()`.
- Le transitoire ne se gate pas sur `analysis.closed` : après l'ouverture de
  l'interrupteur (`cap-01`), le graphe est ouvert mais le condensateur se
  décharge encore. Résoudre dès qu'il existe une source ou une tension de
  condensateur non nulle.
- Extraire `assembleSystem` dans un helper exporté
  (`circuit/assembly.ts` ou export depuis `simulate.ts`) avec des options
  `{ conducting, relayClosed, capacitorVoltages, stepMs }`, pour que le
  statique et le transitoire partagent le même code.
- `simulateCircuit` reste le calcul statique : aucune régression pour les
  niveaux existants.

Tests RC : charge, décharge, conservation de l'énergie, absence de NaN,
condensateur préchargé, interrupteur ouvert/fermé, court-circuit.

### 5.6 Suivi temporel des réussites

Nouveau fichier `packages/shared/src/levels/runtime.ts`.

`LevelRuntime` accumule :

- temps écoulé ;
- tensions des condensateurs ;
- événements d'interrupteur (ouvert/fermé, instant) ;
- durées d'allumage des ampoules ;
- pics de courant des LED/ampoules ;
- drapeaux latchés.

Conditions temporelles :

| Condition | Signification |
|---|---|
| `capacitor_filled` | le condensateur a atteint un seuil de charge |
| `capacitor_empty` | le condensateur est redescendu sous un seuil |
| `lamp_stays_on_after_open` | l'ampoule reste allumée après l'ouverture d'un interrupteur |
| `flash_seen` | un pic de courant bref et fort a été vu |

Conditions statiques nouvelles :

| Condition | Signification |
|---|---|
| `magnet_attracts` | l'électroaimant attire un nombre donné de trombones |
| `reed_state` | la lame souple est ouverte/fermée |
| `reed_controls` | la lame souple commande un autre composant |
| `relay_state` | le contact du relais est ouvert/fermé |
| `relay_controls` | le relais commande un autre composant |
| `light_response` | un composant réagit différemment à la lumière et à l'ombre |
| `diode_conducts` / `diode_blocks` | la diode conduit ou bloque |

`evaluateLevelSuccess(level, circuit, simulation, runtime?)` garde la
signature actuelle pour les anciens niveaux. Les drapeaux temporels sont
latchés : `lamp_stays_on_after_open`, `flash_seen`, `capacitor_filled` et
`capacitor_empty` ne dépendent pas du frame où la réussite est relue.

Les niveaux temporels ou nocturnes n'incluent pas `circuit_ok` quand l'état
réussi est volontairement ouvert ou dans l'obscurité (`cap-01`, `cap-04`,
`sensor-03`). Les conditions explicites portent la réussite.

### 5.7 Compteurs qualitatifs

`METER_IDS` gagne `charge` et `aimant`. `readCircuitMeters` somme la tension
des piles et des panneaux pour `tension`, et calcule :

- `charge` : vide / à moitié / plein, depuis `ComponentState.charge` ;
- `aimant` : faible / moyen / fort, depuis `ComponentState.magneticStrength`.

Aucun nombre n'est affiché. Les libellés `meter.charge.*` et `meter.aimant.*`
existent en FR/EN/ZH.

### 5.8 Sérialisation et compatibilité

`serialization.ts` est un parseur manuel, pas zod. `CIRCUIT_FORMAT_VERSION`
reste 1 : les ajouts sont additifs.

- Ajouter les 7 types à `parseComponent`, avec leurs champs et valeurs par
  défaut.
- Mettre à jour `completeCircuit()` dans `serialization.test.ts` (liste
  explicite de tous les types).
- `COMPONENT_TYPES` est déclaré avec `satisfies` : ajouter un test qui vérifie
  que `COMPONENT_TYPES`, `EXPECTED_TERMINAL_IDS` et `TERMINAL_LAYOUTS`
  couvrent exactement `ComponentType`.
- `workbenchStore.addComponentOnWire` et `wireSplice.ts` supposent deux
  bornes : interdire l'insertion du relais sur un fil.
- Atelier libre : masquer les nouveaux composants dans `SANDBOX_HIDDEN_KEYS`.
  Un circuit sauvegardé avec un type inconnu casserait la liste des anciens
  clients, car `ApiProgressRepository` re-sérialise tous les documents.
- API : aucun changement de schéma Mongo ni migration. Les `levelId` restent
  des chaînes libres ; `reconcileProgress` gère les nouveaux niveaux.
  Déployer shared/API avant le front.

## 6. UI et art (`apps/web`)

### 6.1 Art des composants

`workbench/ComponentArt.tsx` doit fournir, pour chaque nouveau type, un art
réaliste et un symbole :

- diode : corps cylindrique, anneau de cathode, symbole triangle + barre ;
- électroaimant : bobine de cuivre autour d'un noyau, nombre de spires visible,
  trombones attirés selon `magneticStrength` ;
- lame souple : tube de verre, deux lamelles, aimant à proximité ;
- relais : boîtier, bobine, armature, contact, quatre bornes ;
- photorésistance : capteur rond avec motif en zigzag, soleil/lune ;
- panneau solaire : panneau bleu quadrillé, rayons ;
- condensateur : cylindre ou boîtier, réservoir qui se remplit selon `charge`.

Les switches `RealisticArt` et `SymbolArt` n'ont pas de `default` : ajouter
chaque cas explicitement, sinon l'écran reste vide sans erreur de type. Idem
pour `MeterIcon` dans `ZapMeter.tsx`.

L'art doit rester en attributs SVG (pas de styles externes) pour que
`SandboxSnapshot` et la capture PNG conservent les couleurs et l'état.

### 6.2 Palette et variantes

`LevelAvailableComponent` gagne `options?: PaletteComponentOptions`.
`WorkbenchPage` fusionne `offer.options` dans l'item de palette ; sinon les
variantes n'ont aucun effet.

Variantes :

- `capacitor-small` (0.2 F) et `capacitor-large` (0.5 F) ;
- `electromagnet-short` (40 tours) et `electromagnet-long` (120 tours).

`restoredAvailableCounts` doit retrouver l'offre par clé, ou par égalité des
champs d'options, et non par type : sinon supprimer un grand condensateur rend
un petit.

### 6.3 Interactions

- **Relais** : quatre bornes, cibles ≥ 48 px ; l'art montre la bobine et le
  contact.
- **Aimant** : accessoire déplaçable avec `data-magnet-id` ; nouveau geste dans
  l'union des gestes, branches `pointerdown`/`pointermove`/`pointerup`. La
  proximité met à jour `reed.magnetNear`.
- **Jour/nuit** : un bouton unique dans la barre d'en-tête ou la surcouche du
  plan ; il règle `lightLevel` sur tous les composants sensibles.
- **Condensateur** : bouton « Vider » dans la barre de sélection, sur le modèle
  de `RheostatToolbar`. Un seul contrôle supplémentaire à la fois.
- **Trombones / armature / remplissage** : animations SVG douces, pas plus de
  trois flashs par seconde, respect de `prefers-reduced-motion`.
- Cinq boutons visibles au maximum ; vérifier les modes compact, medium et
  large.

### 6.4 Boucle transitoire

Nouveau hook `useTransientSimulation` appelé dans `WorkbenchPage` près des
lignes 196-228.

- Boucle `requestAnimationFrame` uniquement pour les niveaux `transient`.
- Pause quand `document.hidden`.
- Remise à zéro au chargement du niveau, pas à chaque mutation de circuit.
  Les tensions sont conservées par identifiant de condensateur ; un composant
  ajouté démarre à `initialVoltage`.
- Ne pas passer par le store à 60 Hz : garder les tensions dans une `ref` et
  publier un snapshot d'état à fréquence raisonnable.
- Passer la simulation transitoire à `evaluateLevelSuccess`, `WorkbenchSvg`,
  `ZapMeter` et au snapshot photo.
- Garde `import.meta.env.MODE === 'test'` ou horloge injectable pour les tests.

## 7. Narration et i18n

Les trois dictionnaires `narration/fr.ts`, `texts.en.ts`, `texts.zh.ts` doivent
recevoir :

- 5 titres de chapitre ;
- 20 niveaux × 6 clés = 120 clés (titre, objectif, intro, 3 indices) ;
- 12 mots de vocabulaire × 2 clés = 24 clés ;
- 7 libellés de composants ;
- 10 clés de compteurs (`charge` et `aimant` : base + low/medium/high/off) ;
- les indices et statuts des nouveaux diagnostics ;
- les libellés des contrôles jour/nuit, aimant et vider.

Soit environ 170 nouvelles clés par langue. Les tests `levelTexts.test.ts` et
`i18n.test.ts` découvrent les nouvelles clés automatiquement ;
`childTexts.test.ts` impose 12 mots maximum ; `hints.test.ts` demande des cas
explicites.

`fr.ts` utilise un Proxy et des alias hérités : ajouter aussi les nouveaux
composants dans `frBase.components`, sinon `paletteItems` reçoit `undefined`.
Les variantes ont besoin de libellés distincts (« petit condensateur »,
« grand condensateur », « bobine courte », « bobine longue »).

`PROGRESS_CONCEPTS` porte des libellés français codés en dur. Ajouter un
`labelTextId` et les libellés admin FR/EN/ZH pour tous les concepts, anciens et
nouveaux, sinon les nouveaux concepts resteraient en français en anglais et en
chinois.

## 8. Progression et migration

- `metadata.ts` : 20 entrées, ordres 27 à 46 ; `defi-04.nextLevelId =
  'sound-01'` ; `cap-06.nextLevelId = null`.
- `chapterChallenges.ts` : mettre à jour `defi-04.nextLevelId`.
- `reconcileProgress` ajoute les nouveaux niveaux verrouillés puis débloque le
  suivant d'un niveau terminé. Un joueur qui a fini `defi-04` accède donc à
  `sound-01` sans rejouer.
- `initialPlayerProgress` débloque l'index 0 : `light-01` reste le premier.
- Ajouter les nouveaux concepts à `PROGRESS_CONCEPTS` comme objets séparés. Ne
  jamais ajouter un vocabulaire à un concept existant : les élèves déjà
  évalués perdraient leur maîtrise.
- Aucune migration MongoDB : les `levelId` sont des chaînes libres et les
  circuits existants ne contiennent pas les nouveaux types.
- Les niveaux existants ne sont jamais renumérotés.

## 9. Tests

### 9.1 Moteur

- `simulate.test.ts` : diode directe/bloquée, électroaimant, lame souple,
  relais (bobine, contact, hystérésis, normalement fermé), LDR clair/sombre,
  panneau solaire éclairé/obscur, condensateur statique.
- `transient.test.ts` : charge RC, décharge, conservation, absence de NaN,
  condensateur préchargé, interrupteur ouvert/fermé.
- `serialization.test.ts` : les 7 nouveaux types, champs invalides, ancien
  document v1 toujours accepté.
- `meters.test.ts` : `charge`, `aimant`, tension avec panneau.
- `topology.test.ts` : composants à deux bornes uniquement ; le relais est
  exclu proprement.

### 9.2 Niveaux

- `levels.test.ts` : 46 niveaux, ordre 1..46, tableaux `number` par chapitre,
  `defi-04` n'est plus le dernier, `getNextLevel('defi-04') === sound-01`.
- Toutes les conditions de réussite sont testées avec un circuit minimal.
- `applyAttempt.test.ts` : réconciliation d'une progression 0.3.0 et déblocage
  `defi-04` → `sound-01`.

### 9.3 Web

- `ComponentArt` : rendu réaliste et symbole de chaque nouveau type.
- `WorkbenchPage.test.tsx` : palette, aimant, jour/nuit, bouton vider,
  boucle transitoire avec horloge injectable, compteurs.
- `ZapMeter.test.tsx` : fixture `CircuitMeters` avec `charge` et `aimant`.
- `sandbox.test.ts` : la palette du bac à sable reste à 9 si les nouveaux
  composants sont masqués.
- `apps/api/test/dashboard.test.ts` : le fixture de vocabulaire inclut les
  nouveaux concepts.

### 9.4 E2E

- Un spec par nouveau chapitre : `chapter5-sound`, `chapter6-diode`,
  `chapter7-magnet`, `chapter8-sensor`, `chapter9-capacitor`.
- `e2e/support/game.ts` : 26 → 46 nœuds.
- Les 14 captures Playwright (7 projets × carte + écran) sont régénérées et
  relues.
- Vérifier le tactile, `prefers-reduced-motion`, le mode compact et iPad.

### 9.5 Vérification finale

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm build:report
pnpm test:e2e
```

Le build report doit rester sous 300 KB de JS initial et conserver les données
de niveau hors du bundle initial. Le build arm64 doit rester inchangé.

## 10. Découpage et estimation

| Phase | Contenu | Estimation |
|---|---|---:|
| 0 | Plan détaillé, chapitre sons, métadonnées | 3-4 j |
| 1 | Diode, art, 3 niveaux, textes, tests | 4-5 j |
| 2 | Électroaimant, lame souple, relais, 5 niveaux | 10-12 j |
| 3 | Photorésistance, solaire, 3 niveaux | 6-8 j |
| 4 | Condensateur, transitoire, 6 niveaux | 10-12 j |
| 5 | Finition, E2E, iPad, docs, version | 4-5 j |

Total : environ 37-46 jours de développement, tests inclus. Avec un prototype
réussi du solveur transitoire, la phase 4 peut descendre à 8-10 jours.

## 11. Risques et décisions

| Risque | Impact | Réduction |
|---|---|---|
| Solveur transitoire instable ou lent | niveaux condensateur impossibles | prototype isolé, pas fixe, tests RC, repli qualitatif documenté |
| Relais 4 bornes | modèle et UI plus lourds | commencer par lame souple, relais ensuite, 8 itérations max |
| Contact de relais et court-circuit | faux positif ou simulation bloquée | contact potentiel pour `closed`, exclu du graphe de court-circuit, courant post-solve |
| `analysis.ts` traite un type inconnu comme `load` | diagnostic silencieux | ajouter chaque type explicitement, tests de diagnostic |
| Switches d'art sans `default` | composant invisible | ajouter les cas réaliste et symbole, test de rendu |
| Palette surchargée | choix difficile | variantes regroupées, filtrage par niveau, 5 boutons max |
| Variantes petit/grand | mauvais retour de palette | retrouver l'offre par clé, pas par type |
| Collision d'IDs `light-*` | niveau inaccessible | renommer en `sensor-*` dès le plan |
| Anciens joueurs bloqués | accès impossible | `reconcileProgress` + test de migration |
| Textes trop longs | test enfant en échec | tests ≤ 12 mots, relecture FR |
| Boucle 60 Hz trop lourde | saccades sur tablette | hook local + ref, pas de store par frame, pause onglet caché |
| Chapitre 5 ajouté | décalage du plan 0.5.0 | mise à jour explicite en chapitres 10-13 |
| Anciens clients et sandbox | liste de circuits cassée | nouveaux composants masqués dans l'atelier libre |

## 12. Critères d'acceptation

- 9 chapitres, 46 niveaux ; `defi-04` mène à `sound-01` ; les anciens joueurs
  retrouvent leur progression.
- Les 7 composants ont un art réaliste et un symbole ; le relais a quatre
  bornes utilisables au doigt ; l'aimant se déplace ; le jour/nuit change la
  scène.
- Le condensateur se charge et se décharge visiblement ; `cap-01`, `cap-04` et
  `cap-06` réussissent sur un comportement temporel, pas sur une frame isolée.
- Aucun nombre affiché ; les compteurs restent qualitatifs.
- Aucun texte codé en dur ; FR/EN/ZH complets ; phrases ≤ 12 mots.
- Aucune régression sur les 26 niveaux existants, l'atelier libre, le
  back-office, l'API et la PWA.
- `pnpm verify`, `pnpm build:report` et `pnpm test:e2e` verts ; build arm64
  identique.

## 13. Impact sur le plan 0.5.0

`docs/plan-robot-0.5.0.md` doit être mis à jour :

- la dépendance devient « 0.4.0, chapitres 5 à 9 » ;
- les chapitres du Labo Robot passent de 9-12 à 10-13 ;
- les lignes 6-8, 192-193, 677 et 708-709 sont concernées ;
- les identifiants de niveaux `meca-*`, `robo-*`, `vision-*`, `mission-*` ne
  changent pas.

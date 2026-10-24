# Les Circuits de Zap

Jeu web d'initiation aux circuits électriques pour les enfants de 8 ans.

Monorepo pnpm :

| Paquet | Rôle |
|---|---|
| `apps/web` | Front React 18 + Vite + Zustand + framer-motion |
| `apps/api` | API Node 20 + Fastify 4 |
| `packages/shared` | Moteur de circuit, niveaux, règles et schémas partagés |

## Prérequis

- Node.js 20.19 ou plus récent (`nvm use` lit `.nvmrc`)
- pnpm 10 ou plus récent
- Docker, pour MongoDB 7 en développement

## Démarrage

```bash
# MongoDB 7, en replica set à un seul nœud (transactions)
docker compose -f docker-compose.dev.yml up -d

cp .env.example .env       # puis adapter ADMIN_USERNAME / ADMIN_PASSWORD
openssl rand -base64 48    # coller le résultat dans COOKIE_SECRET
pnpm install
pnpm --filter @circuits/api db:migrate
pnpm --filter @circuits/api db:seed

pnpm dev
```

- Front : http://127.0.0.1:5173/
- API de développement : http://127.0.0.1:3101/api/health

Le serveur Vite redirige `/api` vers l'API locale (port 3101). L'API se
connecte à MongoDB au démarrage : sans base, elle s'arrête avec une erreur.
L'API de production tourne séparément dans Docker sur le port 3100.

Le seed est idempotent. Il affiche le code à six caractères du groupe
« Équipe Camelot » et le motif de démonstration des trois élèves
(`renard → pomme → ballon`).

### Compte administrateur

Un compte adulte est identifié par un **nom court**, pas par une adresse
e-mail : 3 à 32 caractères (lettres minuscules, chiffres, `.`, `-`, `_`).
L'e-mail reste un champ optionnel du modèle mais n'est pas utilisé pour la
connexion. Pour la production, `admin:create` crée uniquement l'administrateur
(sans le groupe ni les élèves de démonstration) :

```bash
ADMIN_USERNAME='...' ADMIN_PASSWORD='...' ADMIN_NAME='...' \
  pnpm --filter @circuits/api admin:create
```

Le mot de passe se change ensuite **sans demander l'ancien** :

```bash
ADMIN_USERNAME='...' pnpm --filter @circuits/api admin:password
```

La commande demande deux fois le nouveau mot de passe sans l'afficher (12
caractères minimum), révoque les sessions existantes et inscrit l'action dans
`auditlogs`. Pour un script, `ADMIN_NEW_PASSWORD` évite l'invite, mais le secret
apparaît alors dans l'environnement du processus : à réserver à l'automatisation.
L'interface web « Mon compte » arrivera avec l'écran de connexion des adultes.

## Authentification

### Adultes

Les adultes se connectent avec leur **nom court + mot de passe**, jamais avec
un e-mail. L'API vérifie le mot de passe avec argon2id, limite les tentatives
par IP et bloque un compte après huit échecs pendant quinze minutes.

- `POST /api/auth/login` ouvre une session de **30 jours** rangée dans
  `sessions` ; le cookie `zap_session` est `httpOnly`, `SameSite=Lax` et
  `Secure` en production. Chaque requête authentifiée repousse l'expiration à
  trente jours (session glissante).
- `GET /api/auth/me` renvoie l'adulte connecté, `POST /api/auth/logout` ferme
  la session.
- `POST /api/auth/password` change son propre mot de passe **sans demander
  l'ancien**, révoque toutes les sessions et en ouvre une nouvelle.
- `POST /api/auth/invites` (admin ou encadrant) crée un lien **à usage unique
  valable 7 jours** pour un futur encadrant ou parent. La réponse contient
  l'URL à copier ; aucun e-mail n'est envoyé. Un encadrant ne peut inviter un
  parent que pour un élève de ses propres groupes.
- `GET /api/auth/invites/:token` affiche l'invitation, et
  `POST /api/auth/invites/:token/accept` fixe le mot de passe et ouvre la
  session.
- `POST /api/auth/password-resets` (admin) crée le même type de lien pour
  réinitialiser le mot de passe d'un adulte.

Les jetons d'invitation et de session ne sont conservés qu'en SHA-256. Les
requêtes qui modifient l'état sont refusées si l'en-tête `Origin` vient d'un
autre domaine.

### Enfants

1. `GET /api/auth/children/group/:joinCode` liste les élèves du groupe à
   partir du code à six caractères. Si l'appareil est fixé (`GET
   /api/auth/device-pin`), l'écran saute cette étape.
2. `POST /api/auth/children/login` reçoit l'élève et **trois images dans
   l'ordre** parmi les neuf de `PICTURE_PATTERNS` (renard, panda, grenouille,
   pomme, banane, fraise, ballon, voiture, étoile).
3. Cinq erreurs consécutives bloquent l'élève dix minutes avec le message
   « Demande de l’aide à ton encadrant. ». Une réussite remet le compteur à
   zéro.
4. La session enfant dure **huit heures**, sans prolongation, et son cookie
   disparaît au `POST /api/auth/logout` (« Au revoir »).

Un encadrant ou un administrateur peut régénérer la suite d'images d'un élève
avec `POST /api/auth/students/:studentId/picture-password/reset` : la nouvelle
suite est affichée une seule fois, seule son empreinte argon2id est stockée,
et les sessions enfant de l'élève sont révoquées.

### Fixation d'appareil

`POST /api/auth/device-pin` (admin ou encadrant ayant accès au groupe) pose un
cookie `zap_device` **signé** qui retient le groupe pendant trente jours. Les
enfants de cette tablette n'ont alors plus à saisir le code. `DELETE
/api/auth/device-pin` l'efface.

### Configuration

| Variable | Rôle |
|---|---|
| `COOKIE_SECRET` | signature des cookies, 32 caractères minimum ; obligatoire en production |
| `PUBLIC_ORIGIN` | origine utilisée pour les liens d'invitation et le contrôle d'origine |
| `COOKIE_SECURE` | force l'attribut `Secure` (activé par défaut en production) |
| `TRUST_PROXY` | lit `X-Forwarded-For` derrière Caddy, pour la limitation par IP |

## Groupes, élèves et parents

Les routes de gestion vivent sous `/api` et renvoient des DTO validés par zod.
Elles exigent une session adulte ; un élève reçoit toujours `403`.

### Groupes

| Route | Rôle |
|---|---|
| `GET /api/groups` | liste les groupes accessibles (`?includeArchived=true`) |
| `POST /api/groups` | crée un groupe et son code à six caractères |
| `GET /api/groups/:id` | détail avec la liste des élèves |
| `PATCH /api/groups/:id` | renomme (`name`) ou archive (`archived`) |
| `POST /api/groups/:id/join-code` | régénère le code d’invitation |
| `POST /api/groups/:id/students` | ajoute un élève (`displayName`, `avatarId`) |
| `POST /api/groups/:id/students/bulk` | ajoute jusqu’à 40 prénoms d’un coup |

Seul le créateur d’un groupe (ou un admin) peut le renommer, l’archiver ou
changer son code. Un co-encadrant membre peut voir le groupe et y ajouter des
élèves. Archiver un groupe déconnecte ses enfants et invalide le code ; les
élèves et l’historique restent en base.

### Élèves

| Route | Rôle |
|---|---|
| `GET /api/students` | admin : tous ; encadrant : ses groupes ; parent : ses enfants |
| `GET /api/students/:id` | détail autorisé |
| `PATCH /api/students/:id/group` | déplace l’élève vers un autre groupe |
| `GET /api/students/:id/export` | export JSON complet, en pièce jointe |
| `DELETE /api/students/:id` | suppression définitive, `confirmName` obligatoire |
| `GET/POST /api/students/:id/parents` | liste ou rattache un parent existant |
| `DELETE /api/students/:id/parents/:parentId` | retire le lien parent |

À la création, l’API génère une suite de trois images et la renvoie **une seule
fois** avec son élève ; seule son empreinte argon2id est stockée. Le prénom et
l’avatar sont les seules données demandées à l’adulte. Un déplacement révoque
les sessions enfant de l’élève.

Un parent peut être rattaché à plusieurs enfants : le lien d’invitation crée le
compte pour un premier enfant, puis `POST /api/students/:id/parents` ajoute les
autres avec son identifiant.

### Administration

| Route | Rôle |
|---|---|
| `GET /api/users` | tous les comptes, filtre `role`, pagination `limit`/`offset` |
| `GET /api/users/:id` | détail d’un compte |
| `PATCH /api/users/:id/status` | active ou désactive (`disabled`) |
| `PATCH /api/users/:id/role` | change un rôle adulte |
| `GET /api/audit-logs` | journal des actions sensibles, paginé |

Un compte désactivé perd immédiatement ses sessions et ne peut plus se
connecter. Un administrateur ne peut ni se désactiver ni changer son propre
rôle, et il doit toujours rester un administrateur actif. Les rôles d’un élève
ne se modifient pas depuis cette route : sa fiche se gère par son groupe.

L’export et la suppression écrivent tous deux dans `auditlogs` ; la suppression
passe par la transaction `deleteStudent` et le prénom doit être saisi à
l’identique. Un parent peut exporter ou supprimer ses propres enfants, un
encadrant seulement les élèves de ses groupes.

## Connexion des enfants

Le bouton « Jouer » ouvre la connexion enfant, sauf si une session enfant est
déjà reconnue :

1. le code du groupe se saisit sur un clavier à grands boutons (deux rangées
   de seize touches en compact ; il ne contient ni `0`, ni `O`, ni `1`, ni `I`) ;
2. l’enfant choisit son avatar et son prénom ;
3. il touche trois images dans l’ordre. Chaque appui fait dire son nom à Zap.

Sur un appareil fixé à un groupe, l’étape du code est sautée. Un bouton
« Jouer en invité » reste disponible pour utiliser la progression locale.
Cinq erreurs d’images bloquent l’élève dix minutes avec le message
« Demande de l’aide à ton encadrant ».

La carte des niveaux affiche l’avatar et le prénom de l’enfant, un bouton
« Ma collection » (mots débloqués, chacun prononcé au toucher) et
« Au revoir » pour fermer la session. La session est détectée au chargement
via `GET /api/auth/me` ; après une connexion, l’écran appelle
`ProgressProvider.setSession()` pour basculer immédiatement vers le dépôt API.

## Espace adulte (`/admin`)

Le back-office est chargé à la demande dans un chunk séparé (`AdminApp`), avec
un style volontairement sobre, distinct du jeu. Les routes sont protégées côté
client par le rôle de la session et côté serveur par les contrôles de l’API.

| Rôle | Pages |
|---|---|
| admin | groupes, utilisateurs, journal d’audit, mon compte |
| encadrant | ses groupes, mon compte |
| parent | ses enfants, fiche enfant en lecture, mon compte |

- `/invitation/:token` accepte une invitation ou un lien de réinitialisation et
  permet de choisir un mot de passe (12 caractères minimum).
- La fiche groupe permet de renommer, archiver, changer le code, ajouter un
  élève seul ou par liste, afficher une seule fois les images initiales,
  imprimer les cartes de connexion (avatar, prénom, code) et fixer/détacher
  l’appareil.
- La fiche élève permet d’exporter le JSON, de réinitialiser les images, de
  générer et copier un lien d’invitation parent, de rattacher un parent existant
  et de supprimer l’élève après saisie exacte de son prénom.
- La page utilisateurs charge les comptes paginés, filtre par rôle, active ou
  désactive un compte et change un rôle adulte. Le rôle élève reste géré par
  les groupes. Elle crée aussi les liens d’invitation encadrant et les liens de
  réinitialisation de mot de passe, à copier et transmettre.
- « Mon compte » change le mot de passe sans demander l’ancien.
- En compact, la navigation passe en barre d’onglets fixe en bas et les
  tableaux deviennent des cartes.

## Tableaux de progression

Les adultes disposent de deux niveaux de lecture, calculés côté serveur :

- `GET /api/groups/:groupId/dashboard` (admin ou encadrant du groupe) renvoie
  la matrice élèves × niveaux, les statistiques par niveau (taux de réussite,
  essais moyens, indices moyens), les difficultés les plus fréquentes et le
  nombre d’élèves actifs sur sept jours.
- `GET /api/students/:studentId/dashboard` (admin, encadrant du groupe ou
  parent lié) renvoie les 25 dernières tentatives, les huit concepts maîtrisés
  (vocabulaire), et les créations de l’atelier libre avec leur vignette.

Les erreurs sont regroupées par niveau et par code, en comptant des **élèves
distincts** : « 7 élèves ont fait un court-circuit au niveau 7 ». Le serveur
utilise des pipelines MongoDB `$match → $group → $project`, avec des `hint()`
sur les index :

| Requête | Index |
|---|---|
| progression des élèves | `levelprogress_user_level_unique` |
| difficultés et activité du groupe | `levelattempts_group_started` |
| chronologie d’un élève | `levelattempts_user_started` |
| créations de l’atelier | `sandbox_user_updated` |

Le test d’intégration `dashboard.test.ts` exécute `explain('executionStats')`
sur ces agrégations et vérifie que le plan contient `IXSCAN` et le bon index.

Dans l’interface, le tableau de bord de groupe affiche un graphique Recharts
(`ResponsiveContainer`) du taux de réussite par niveau, les statistiques et la
matrice. En compact, la matrice devient une carte dépliable par élève. Les
fiches élève et la page parent reprennent la chronologie, les concepts et les
vignettes, avec un vocabulaire plus simple pour les parents et sans comparaison
entre enfants.

## Commandes

```bash
pnpm dev        # front + api + veille de packages/shared
pnpm test       # tests de tous les paquets
pnpm typecheck  # vérification TypeScript de tous les paquets
pnpm build      # build de production de tous les paquets
pnpm verify     # typecheck + tests + build

pnpm --filter @circuits/api db:migrate         # applique les migrations
pnpm --filter @circuits/api db:migrate:status  # état des migrations
pnpm --filter @circuits/api db:migrate:down    # annule la dernière
pnpm --filter @circuits/api db:seed            # admin + groupe + 3 élèves (démo)
pnpm --filter @circuits/api admin:create       # administrateur seul (production)
pnpm --filter @circuits/api admin:password     # change un mot de passe
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

Le bouton « Jouer » ouvre la carte des niveaux ; chaque niveau lance le plan de
travail :

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

## Zoom et déplacement

La taille logique du plan vient du niveau (`board.columns` × `board.rows`) et le
`viewBox` du SVG est calculé pour que tout le niveau tienne à l'écran, quelle que
soit la taille disponible. Toutes les conversions écran → coordonnées du plan
vivent dans `apps/web/src/workbench/viewport.ts` (avec tests) : glisser un
composant, créer un fil et déposer depuis la palette restent précis après un
zoom, un déplacement ou une rotation d'écran.

- Quand une borne ferait moins de 44 px à l'écran, le mode « déplaçable »
  s'active : deux doigts zooment (0,75× à 2,5×) et un doigt sur le fond déplace
  le plan.
- Sur ordinateur, la molette zoome autour du pointeur.
- Le bouton « ⤢ Tout voir » en bas à droite ramène le plan entier.
- Un changement de taille ou une rotation ne touche pas au circuit : seul le
  cadrage est recalculé.

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

## Niveaux et progression

Le chapitre 1, « La lumière », contient dix niveaux et une transition
« Les symboles ». Les définitions, conditions de réussite et règles d'étoiles
vivent dans `packages/shared/src/levels` ; le front les consomme sans les
dupliquer.

La progression est enregistrée dans `localStorage` derrière l’interface
`ProgressRepository` (`apps/web/src/progress`). Un niveau réussi débloque le
suivant ; le nombre d’étoiles dépend des indices demandés à Zap.

## Synchronisation de la progression

### API enfant

| Route | Rôle |
|---|---|
| `GET /api/me/progress` | tous les niveaux et le vocabulaire débloqué |
| `POST /api/me/attempts/start` | `{ levelId, attemptId? }` → tentative |
| `POST /api/me/attempts/:attemptId/finish` | résultat, puis progression complète |
| `PUT /api/me/sandbox/:id` | enregistre un circuit libre (200 Ko maximum) |
| `GET /api/me/sandbox` | liste les circuits libres |

Ces routes sont réservées à une session enfant (`eleve`). Le serveur ne fait
pas confiance au client :

- le niveau doit exister dans `packages/shared` et être débloqué ;
- les étoiles sont recalculées avec `starsForHints` ;
- une réussite débloque le niveau suivant et ajoute son vocabulaire ;
- `attempts` est incrémenté avec `$inc`, les étoiles avec `$max`, le meilleur
  temps et le meilleur nombre d’indices avec `$min` ;
- la fin de tentative, la progression, le déblocage et le vocabulaire sont
  écrits dans une seule transaction ;
- terminer deux fois la même tentative (ou rejouer une requête hors ligne) ne
  compte qu’une fois.

`attemptId` et l’identifiant d’un circuit libre sont fournis par le client et
uniques par élève : une requête rejouée met à jour la même ligne au lieu d’en
créer une deuxième.

### Hors ligne et invités

`ApiProgressRepository` garde un cache et une file d’opérations par élève dans
`localStorage`. Quand le réseau manque, début, fin de tentative et sauvegarde
d’atelier sont mis en file ; ils sont rejoués dans l’ordre au retour de
`online`, à l’ouverture de la carte et après une sauvegarde réussie. La carte
se recharge sur l’événement `circuits:progress-synced`.

Sans session enfant, l’application utilise `LocalProgressRepository` : c’est le
mode invité, signalé sur la carte des niveaux. Après une connexion enfant, si
l’appareil contient une progression d’invité, une boîte de dialogue demande à
l’adulte s’il faut la fusionner ; les tentatives sont rejouées avec des
identifiants déterministes pour qu’une fusion interrompue reste sans doublon.
Un refus est mémorisé jusqu’à ce que la progression d’invité change.

Si une sauvegarde échoue vraiment, l’enfant ne voit qu’une phrase de Zap :
« Oups, je n’arrive pas à sauvegarder. On réessaie plus tard ! ».

## Base de données

L'API utilise MongoDB 7 via Mongoose (`apps/api/src/db/models`). Les schémas
sont stricts (`strict: 'throw'`), horodatés et nomment explicitement leur
collection.

| Collection | Contenu |
|---|---|
| `users` | rôle, prénom/pseudo, identifiant et mot de passe adultes, avatar, e-mail optionnel, secret image des élèves, verrouillage, liens parent, vocabulaire |
| `groups` | nom, code d'invitation, créateur, archivage, membres avec leur rôle |
| `sessions` | sessions adultes et enfants, empreinte du jeton, groupe de l'enfant, expiration |
| `invites` | invitations encadrant, parent et réinitialisation |
| `levelprogress` | une ligne par élève et par niveau |
| `levelattempts` | historique des tentatives, identifiant client, durée, groupe dénormalisé |
| `sandboxcircuits` | circuits libres, identifiant client, format partagé, 200 Ko maximum |
| `auditlogs` | actions sensibles des adultes |

Points structurants :

- l'identifiant adulte (`username`) est unique et ne dépend pas d'un e-mail ;
  l'e-mail reste optionnel et n'est pas utilisé pour la connexion ;
- un élève ne peut avoir ni identifiant adulte, ni e-mail, ni mot de passe :
  la minimisation RGPD est appliquée par le schéma ;
- les mots de passe adultes et les secrets image des élèves sont hachés en
  argon2id, jamais stockés en clair ;
- le code de groupe fait six caractères parmi les lettres et chiffres non
  ambigus (`0`, `O`, `1`, `I` exclus) et est unique ;
- les sessions et les invitations expirent par index TTL ;
- `levelprogress` est unique par couple (élève, niveau) et les étoiles vont
  de 0 à 3 ;
- un circuit libre est validé avec `deserializeCircuit` partagé et limité à
  200 Ko ;
- `sanitizeFilter` est activé : les filtres internes qui utilisent volontairement
  des opérateurs (`$in`, `$or`) sont marqués avec `mongoose.trusted`, les
  entrées HTTP seront validées par zod.

Les migrations vivent dans `apps/api/migrations` (configuration
`apps/api/migrate-mongo-config.js`). La première crée les index de base, la
seconde l'index unique des identifiants adultes, la troisième l'index unique
de l'empreinte des sessions, la quatrième les index des identifiants clients
des tentatives et des ateliers, la cinquième les index des tableaux de
progression ; l'API appelle aussi `syncIndexes()` au démarrage, les deux
chemins étant idempotents.

Les sessions ne stockent jamais le jeton du cookie : `tokenHash` contient son
SHA-256 et un index unique partiel empêche deux sessions de partager un jeton.
Une session enfant retient aussi le groupe choisi, ce qui permet de vérifier
l'accès sans redemander le code.

`deleteStudent` (`apps/api/src/services/deleteStudent.ts`) supprime, dans une
transaction, l'élève et ses données (`levelprogress`, `levelattempts`,
`sandboxcircuits`, `sessions`, invitations liées), puis le retire des
`groups.members` et des `users.parentOf`. Les journaux d'audit sont conservés
pour la traçabilité des actions adultes. Les tests vérifient qu'il ne reste
aucune donnée de l'élève.

## Affichage adaptatif

Le mode d'affichage est choisi d'après la taille réelle mesurée par
`ResizeObserver`, jamais d'après le user agent (`apps/web/src/layout`) :

- `compact` : largeur < 700 px ou hauteur < 500 px (téléphone) ;
- `large` : au moins 1100 × 700 px (ordinateur) ;
- `medium` : tout le reste (tablette).

En compact, la palette devient une barre d'icônes en bas, l'annulation et la
corbeille sont regroupées dans un rail à droite, les consignes se replient
derrière un bouton ❓ et la bulle de Zap s'affiche en surimpression puis
disparaît après trois secondes. Sur tablette en portrait, la palette passe en
bas et Zap se place en haut à gauche. Un téléphone tenu verticalement affiche
« Tourne ton téléphone ! » à la place du plan de travail.

Les points de rupture sont exposés sur `.app-root` (`data-layout` et
`data-orientation`) et réutilisés par les feuilles de style ; la carte des
niveaux est horizontale sur ordinateur et tablette, verticale et défilante sur
téléphone.

## Déploiement

L'application est publiée sous `https://circuit-learning.87543362.xyz/`.

- Le front est compilé pour la racine du domaine puis copié dans
  `/srv/circuits/web` (servi par Caddy).
- L'API tourne dans Docker Compose et écoute uniquement sur `127.0.0.1:3100`.
- MongoDB 7 tourne dans le même Compose, en replica set `rs0`, avec le volume
  `mongo-data`. Son port n'est publié que sur `127.0.0.1:27018`, pour les
  migrations et les seeds lancés depuis l'hôte ; l'API le joint par
  `mongo:27017` sur le réseau Compose.
- Caddy sert le front à la racine et `/api/*` en reverse proxy. Le bloc de site
  est fourni dans `deploy/caddy/circuit-learning.caddy`.
- Les anciennes URL `kulmb.87543362.xyz/circuit/*` redirigent en 301 vers le
  nouveau domaine.

```bash
# Une seule fois : créer le dossier servi par Caddy
sudo install -d -o "$(id -un)" -g "$(id -gn)" -m 755 /srv/circuits/web

# Une seule fois : ajouter COOKIE_SECRET au .env de production
printf 'COOKIE_SECRET=%s\n' "$(openssl rand -base64 48)" >> .env

# Déployer MongoDB, l'API et le front
./scripts/deploy.sh

# Appliquer les migrations sur la base de production
MONGODB_URI='mongodb://127.0.0.1:27018/circuits?directConnection=true' \
  pnpm --filter @circuits/api db:migrate

# Créer l'administrateur (une seule fois, avec un vrai mot de passe)
MONGODB_URI='mongodb://127.0.0.1:27018/circuits?directConnection=true' \
ADMIN_USERNAME='...' ADMIN_PASSWORD='...' ADMIN_NAME='...' \
  pnpm --filter @circuits/api admin:create
```

Vérification :

```bash
curl -fsS https://circuit-learning.87543362.xyz/api/health
```

## Notes

- La police Nunito est auto-hébergée dans `apps/web/src/assets/fonts` (licence OFL) :
  aucune ressource n'est chargée depuis un CDN.
- Les secrets et fichiers d'environnement ne sont jamais versionnés.
- `argon2` est épinglé à 0.41.1 : les binaires précompilés de 0.45.x plantent au
  chargement sur Node 20 / arm64. Vérifier ce point avant toute montée de version.

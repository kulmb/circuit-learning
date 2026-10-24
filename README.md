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

cp .env.example .env       # puis adapter ADMIN_EMAIL / ADMIN_PASSWORD
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
pnpm --filter @circuits/api db:seed            # admin + groupe + 3 élèves
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

La progression est enregistrée dans `localStorage` derrière l'interface
`ProgressRepository` (`apps/web/src/progress`). Un niveau réussi débloque le
suivant ; le nombre d'étoiles dépend des indices demandés à Zap.

## Base de données

L'API utilise MongoDB 7 via Mongoose (`apps/api/src/db/models`). Les schémas
sont stricts (`strict: 'throw'`), horodatés et nomment explicitement leur
collection.

| Collection | Contenu |
|---|---|
| `users` | rôle, prénom/pseudo, avatar, e-mail et mot de passe adultes, secret image des élèves, verrouillage, liens parent, vocabulaire |
| `groups` | nom, code d'invitation, créateur, archivage, membres avec leur rôle |
| `sessions` | sessions adultes et enfants, expiration |
| `invites` | invitations encadrant, parent et réinitialisation |
| `levelprogress` | une ligne par élève et par niveau |
| `levelattempts` | historique des tentatives, avec le groupe dénormalisé |
| `sandboxcircuits` | circuits libres, format partagé, 200 Ko maximum |
| `auditlogs` | actions sensibles des adultes |

Points structurants :

- l'e-mail n'est unique que lorsqu'il existe (index partiel), et un élève ne
  peut avoir ni e-mail ni mot de passe : la minimisation RGPD est appliquée par
  le schéma ;
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
`apps/api/migrate-mongo-config.js`). La première crée tous les index ; l'API
appelle aussi `syncIndexes()` au démarrage, les deux chemins étant idempotents.

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

# Déployer MongoDB, l'API et le front
./scripts/deploy.sh

# Appliquer les migrations sur la base de production
MONGODB_URI='mongodb://127.0.0.1:27018/circuits?directConnection=true' \
  pnpm --filter @circuits/api db:migrate

# Créer l'administrateur (une seule fois, avec un vrai mot de passe)
MONGODB_URI='mongodb://127.0.0.1:27018/circuits?directConnection=true' \
ADMIN_EMAIL='...' ADMIN_PASSWORD='...' \
  pnpm --filter @circuits/api db:seed
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

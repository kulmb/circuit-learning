# Projet : « Les Circuits de Zap » — jeu web d'initiation aux circuits électriques

## Public cible
Enfants de 8 ans (CE2), francophones, débutants complets. Préparation à la robotique.
Adultes : encadrants (coachs / enseignants), parents, administrateur.

## Principes pédagogiques (à respecter dans TOUT le code et le contenu)
- Un seul nouveau concept par niveau. Jamais deux à la fois.
- Progression concret → abstrait : d'abord des composants dessinés de façon réaliste
  (vraie pile, vraie ampoule), puis passage progressif aux symboles normalisés.
- Phrases courtes (≤ 12 mots), vocabulaire simple, tutoiement, ton encourageant.
- Pas d'échec punitif : une erreur déclenche un indice, jamais un « Perdu ».
- Pas de chiffres (volts, ohms) à l'écran. Tout est qualitatif : « brille fort », « brille faiblement ».
- Feedback immédiat et visuel : l'ampoule s'allume, le moteur tourne, le courant « coule ».
- Sécurité : le court-circuit est expliqué comme dangereux, avec une animation claire
  (pile qui chauffe), et un rappel que dans la vraie vie on ne touche pas aux prises.

## Personnage
« Zap », un petit robot sympathique, guide l'enfant. Il parle (voix + bulle de texte),
a 4 expressions : content, réfléchit, surpris, alerte.

## Appareils supportés
- Ordinateur (souris), tablette (tactile, priorité), téléphone (tactile, mode simplifié).
- Toutes les interactions passent par les Pointer Events (pointerdown/move/up), jamais
  par mouse* ou touch* séparément. Une seule logique pour souris, doigt et stylet.
- Aucune interaction ne dépend du survol (hover), du double-clic, du clic droit ou du clavier.
  Le survol peut seulement ajouter un bonus visuel sur ordinateur.
- Navigateurs cibles : Safari iOS/iPadOS 16+, Chrome Android, Chrome/Edge/Firefox/Safari desktop récents.
  Tester particulièrement Safari iPad (voix, audio, gestes).

## Points de rupture (selon la taille réelle, pas le type d'appareil)
- compact : largeur < 700 px ou hauteur < 500 px (téléphone)
- medium  : tablette et petits écrans
- large   : ordinateur
Le plan de travail se joue en paysage. En portrait sur téléphone, Zap demande de tourner
l'appareil. Sur tablette en portrait, une mise en page adaptée est proposée.

## Contraintes UI pour enfants
- Cibles tactiles ≥ 48 px partout, ≥ 56 px en compact. Bornes des composants avec grande
  zone de capture (aimantation).
- Grille magnétique : les composants se calent automatiquement.
- Maximum 5 boutons visibles à la fois.
- Icônes + texte, couleurs vives mais pas agressives, police arrondie et lisible (Nunito, auto-hébergée).
- Animations sans clignotement rapide (< 3 flashs par seconde).

## Architecture
Monorepo pnpm workspaces :
- apps/web : front React 18 (Vite, TypeScript strict, Zustand, framer-motion), PWA
- apps/api : back Node 22 + Fastify 5 + TypeScript strict
- packages/shared : moteur de circuit, définitions des niveaux, règles de score, types,
  schémas zod (partagés front/back)

Organisation du front :
- apps/web/src/components/ : composants React (plan de travail, palette, Zap…)
- apps/web/src/narration/ : textes français (fr.ts) + service de voix
- apps/web/src/assets/ : SVG des composants (réaliste + symbole)
- apps/web/src/admin/ : back-office adultes (chargé à la demande)

## Front-end
- Plan de travail rendu en SVG (pas de canvas).
- Voix : Web Speech API (fr-FR) derrière une interface NarrationService, remplaçable par
  des fichiers MP3 pré-enregistrés.
- Progression via une interface ProgressRepository (implémentations locale et API).
- PWA installable (manifest + service worker), jouable hors ligne pour les niveaux déjà chargés.

## Back-end
- MongoDB 7 via Mongoose (schémas stricts, strict: 'throw', timestamps activés).
- MongoDB lancé en replica set à un seul nœud (rs0) pour pouvoir utiliser les transactions.
- Production/dev hébergé : MongoDB exige `--auth` + keyFile ; l'API utilise un compte
  applicatif `readWrite` limité à la base `circuits`.
- Index déclarés dans les schémas Mongoose et créés au démarrage (syncIndexes).
- Évolutions de schéma : scripts de migration versionnés avec migrate-mongo (apps/api/migrations).
- Ne jamais renvoyer un document Mongoose brut au client : toujours passer par un DTO validé
  par zod (pas de _id, __v ni de hash dans les réponses ; exposer un champ id en string).
- Protection contre l'injection NoSQL : toutes les entrées validées par zod, sanitizeFilter activé.
- Sessions par cookie httpOnly + SameSite=Lax + Secure, stockées en base avec un index TTL
  sur expiresAt (pas de JWT dans localStorage).
- Mots de passe adultes : argon2id.
- Rate limiting sur toutes les routes d'authentification.
- Logs structurés (pino), jamais de mot de passe ni de code secret dans les logs.
- Tests : Vitest, mongodb-memory-server en mode replica set.

## Rôles
- admin : gère tout
- encadrant : coach / enseignant, gère ses groupes et ses élèves, voit leur progression
- parent : voit la progression de ses enfants uniquement (lecture seule)
- eleve : joue, ne peut rien administrer

## Protection des données des enfants (RGPD / CNIL)
- Minimisation : pour un élève on stocke uniquement un prénom ou pseudo, un avatar,
  le groupe, et la progression. Pas d'email, pas de nom de famille, pas de date de naissance.
- Aucun traceur tiers, aucune analytics externe, aucune ressource chargée depuis un CDN externe.
- Un encadrant ou un parent peut exporter (JSON) et supprimer définitivement les données d'un élève.
- Les données inactives depuis plus de 24 mois sont signalées à l'admin pour suppression.

## Déploiement
- Serveur cible : instance Oracle Cloud (OCI) Ampere A1, CPU aarch64 (linux/arm64), Ubuntu.
- Docker Compose : mongo, api, et build statique du front. Toutes les images doivent exister
  en linux/arm64 et être testées sur cette architecture.
- Images Node basées sur Debian (node:22-bookworm-slim), pas Alpine : les modules natifs
  (argon2) et mongodb-memory-server sont plus fiables en glibc sur arm64.
- Aucune dépendance qui n'a pas de version arm64 (vérifier avant d'ajouter un paquet natif
  ou une image Docker).
- Reverse proxy : Caddy déjà installé sur l'hôte (hors compose).
- L'URL de l'host: https://circuit-learning.87543362.xyz

## Langue
Code, commentaires et noms de variables en anglais. Tout le texte visible par l'enfant et
par les adultes est en français par défaut, avec l'anglais et le chinois disponibles via
le sélecteur en haut à droite. Les textes passent par les dictionnaires
`narration/fr.ts` + `texts.en.ts` + `texts.zh.ts` et `admin/fr.ts` + `texts.*.ts` ;
aucun texte visible ne doit être codé en dur dans un composant.

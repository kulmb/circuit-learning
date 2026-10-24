# Les Circuits de Zap

Jeu web d'initiation aux circuits électriques pour les enfants de 8 ans.

Monorepo pnpm :

| Paquet | Rôle |
|---|---|
| `apps/web` | Front React 18 + Vite + Zustand + framer-motion |
| `apps/api` | API Node 20 + Fastify 4 |
| `packages/shared` | Moteur de circuit, niveaux, règles et schémas partagés |

## Prérequis

- Node.js 20 ou plus récent (`nvm use` lit `.nvmrc`)
- pnpm 10 ou plus récent

## Démarrage

```bash
pnpm install
pnpm dev
```

- Front : http://127.0.0.1:5173/
- API de développement : http://127.0.0.1:3101/api/health

Le serveur Vite redirige `/api` vers l'API locale (port 3101). L'API de
production tourne séparément dans Docker sur le port 3100.

## Commandes

```bash
pnpm dev        # front + api + veille de packages/shared
pnpm test       # tests de tous les paquets
pnpm typecheck  # vérification TypeScript de tous les paquets
pnpm build      # build de production de tous les paquets
pnpm verify     # typecheck + tests + build
```

## Déploiement

L'application est publiée sous `https://circuit-learning.87543362.xyz/`.

- Le front est compilé pour la racine du domaine puis copié dans
  `/srv/circuits/web` (servi par Caddy).
- L'API tourne dans Docker Compose et écoute uniquement sur `127.0.0.1:3100`.
- Caddy sert le front à la racine et `/api/*` en reverse proxy. Le bloc de site
  est fourni dans `deploy/caddy/circuit-learning.caddy`.
- Les anciennes URL `kulmb.87543362.xyz/circuit/*` redirigent en 301 vers le
  nouveau domaine.

```bash
# Une seule fois : créer le dossier servi par Caddy
sudo install -d -o "$(id -un)" -g "$(id -gn)" -m 755 /srv/circuits/web

# Déployer l'API et le front
./scripts/deploy.sh
```

Vérification :

```bash
curl -fsS https://circuit-learning.87543362.xyz/api/health
```

## Notes

- La police Nunito est auto-hébergée dans `apps/web/src/assets/fonts` (licence OFL) :
  aucune ressource n'est chargée depuis un CDN.
- Les secrets et fichiers d'environnement ne sont jamais versionnés.

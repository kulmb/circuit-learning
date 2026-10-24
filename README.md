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

- Front : http://127.0.0.1:5173
- API : http://127.0.0.1:3100/api/health

Le serveur Vite redirige `/api` vers l'API locale.

## Commandes

```bash
pnpm dev        # front + api + veille de packages/shared
pnpm test       # tests de tous les paquets
pnpm typecheck  # vérification TypeScript de tous les paquets
pnpm build      # build de production de tous les paquets
pnpm verify     # typecheck + tests + build
```

## Notes

- La police Nunito est auto-hébergée dans `apps/web/src/assets/fonts` (licence OFL) :
  aucune ressource n'est chargée depuis un CDN.
- Les secrets et fichiers d'environnement ne sont jamais versionnés.

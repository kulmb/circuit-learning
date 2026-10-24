#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_dir="${WEB_DEPLOY_DIR:-/srv/circuits/web-dev}"
env_file="$root_dir/.env.dev"

cd "$root_dir"

if [[ ! -f "$env_file" ]]; then
  echo "Fichier '.env.dev' absent. Copiez '.env.dev.example' puis renseignez COOKIE_SECRET." >&2
  echo "Générez-le avec : openssl rand -base64 48" >&2
  exit 1
fi

if docker info >/dev/null 2>&1; then
  compose=(docker compose)
else
  compose=(sudo docker compose)
fi

compose_args=(
  --env-file "$env_file"
  -f "$root_dir/docker-compose.dev-deploy.yml"
)

# 1. MongoDB d'abord, pour appliquer les migrations avant le démarrage de l'API.
# --wait attend que le healthcheck (replica set élu primaire) soit au vert.
"${compose[@]}" "${compose_args[@]}" up --detach --wait --build mongo

MONGODB_URI='mongodb://127.0.0.1:27019/circuits?directConnection=true' \
  pnpm --filter @circuits/api db:migrate

# 2. API + front de développement.
"${compose[@]}" "${compose_args[@]}" up --detach --build api

WEB_DEPLOY_DIR="$target_dir" "$root_dir/scripts/deploy-web.sh"

echo "Déploiement de développement terminé (front : $target_dir)."
echo "Vérifiez : curl -fsS https://circuit-learning-dev.87543362.xyz/api/health"

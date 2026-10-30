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

# 1. KeyFile + authentification MongoDB (idempotent).
"$root_dir/scripts/ensure-mongo-keyfile.sh"
"$root_dir/scripts/mongo-auth-setup.sh" \
  "$env_file" \
  "$root_dir/docker-compose.dev-deploy.yml" \
  circuits-de-zap-dev-host

# shellcheck disable=SC1090
set -a
. "$env_file"
set +a

: "${MONGO_APP_USER:?Definis MONGO_APP_USER dans .env.dev}"
: "${MONGO_APP_PASSWORD:?Definis MONGO_APP_PASSWORD dans .env.dev}"

# 2. Migrations avant le démarrage de l'API, avec le compte applicatif.
MONGODB_URI="mongodb://${MONGO_APP_USER}:${MONGO_APP_PASSWORD}@127.0.0.1:27019/${MONGO_APP_DB:-circuits}?directConnection=true&authSource=${MONGO_APP_DB:-circuits}" \
  pnpm --filter @circuits/api db:migrate

# 2. API + front de développement.
"${compose[@]}" "${compose_args[@]}" up --detach --build api

WEB_DEPLOY_DIR="$target_dir" "$root_dir/scripts/deploy-web.sh"

# 3. Standalone architecture page, outside the Vite build. It lives at
#    /technique and is re-copied here because deploy-web.sh uses rsync --delete.
WEB_DEPLOY_DIR="$target_dir" "$root_dir/scripts/deploy-technique.sh"

echo "Déploiement de développement terminé (front : $target_dir)."
echo "Vérifiez : curl -fsS https://circuit-learning-dev.87543362.xyz/api/health"

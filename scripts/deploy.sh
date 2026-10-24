#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_dir="${WEB_DEPLOY_DIR:-/srv/circuits/web}"
prod_branch="${PROD_BRANCH:-master}"
env_file="$root_dir/.env"

cd "$root_dir"

if [[ ! -f "$env_file" ]]; then
  echo "Fichier '.env' absent : COOKIE_SECRET est requis en production." >&2
  exit 1
fi

if [[ ! -d "$target_dir" || ! -w "$target_dir" ]]; then
  echo "Le dossier de déploiement '$target_dir' est absent ou non inscriptible." >&2
  echo "Créez-le une fois avec : sudo install -d -o $(id -un) -g $(id -gn) -m 755 '$target_dir'" >&2
  exit 1
fi

if docker info >/dev/null 2>&1; then
  compose=(docker compose)
else
  compose=(sudo docker compose)
fi

# La production est toujours compilée depuis la branche de production
# distante, jamais depuis l'arbre de travail courant (souvent develop).
if git remote get-url origin >/dev/null 2>&1; then
  git fetch --prune origin "$prod_branch"
  prod_ref="origin/$prod_branch"
else
  prod_ref="$prod_branch"
fi

deployed_commit="$(git rev-parse --short "$prod_ref")"

temp_root="$(mktemp -d "${TMPDIR:-/tmp}/circuits-prod.XXXXXX")"
temp_dir="$temp_root/src"
worktree_added=0

cleanup() {
  # Se placer hors du worktree avant de le supprimer.
  cd "$root_dir" 2>/dev/null || true
  if [[ "$worktree_added" -eq 1 ]]; then
    git -C "$root_dir" worktree remove --force "$temp_dir" >/dev/null 2>&1 \
      || rm -rf "$temp_dir"
    git -C "$root_dir" worktree prune >/dev/null 2>&1 || true
  fi
  rm -rf "$temp_root"
}
trap cleanup EXIT

echo "Extraction de $prod_ref ($deployed_commit) dans $temp_dir"
git worktree add --detach "$temp_dir" "$prod_ref"
worktree_added=1

echo "Installation des dépendances et compilation du front"
cd "$temp_dir"
pnpm install --frozen-lockfile
pnpm --filter @circuits/shared build
pnpm --filter @circuits/web build

echo "Construction de l'image API"
"${compose[@]}" \
  --env-file "$env_file" \
  -p circuits-de-zap \
  -f "$temp_dir/docker-compose.yml" \
  up --detach --build --no-deps api

echo "Publication du front dans $target_dir"
rsync --archive --delete --chmod=D755,F644 "$temp_dir/apps/web/dist/" "$target_dir/"

echo "Déploiement de production terminé (commit $deployed_commit)."
echo "Vérifiez : curl -fsS https://circuit-learning.87543362.xyz/api/health"

#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_dir="${WEB_DEPLOY_DIR:-/srv/circuits/web}"

cd "$root_dir"

if [[ ! -d "$target_dir" || ! -w "$target_dir" ]]; then
  echo "Le dossier de déploiement '$target_dir' est absent ou non inscriptible." >&2
  echo "Créez-le une fois avec : sudo install -d -o $(id -un) -g $(id -gn) -m 755 '$target_dir'" >&2
  exit 1
fi

pnpm --filter @circuits/shared build
pnpm --filter @circuits/web build

rsync --archive --delete --chmod=D755,F644 "$root_dir/apps/web/dist/" "$target_dir/"

echo "Frontend déployé dans $target_dir"

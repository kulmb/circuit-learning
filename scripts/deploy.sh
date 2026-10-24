#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

if docker info >/dev/null 2>&1; then
  compose=(docker compose)
else
  compose=(sudo docker compose)
fi

"${compose[@]}" up --detach --build api
"$root_dir/scripts/deploy-web.sh"

echo "Déploiement terminé."
echo "Vérifiez : curl -fsS https://kulmb.87543362.xyz/circuit/api/health"

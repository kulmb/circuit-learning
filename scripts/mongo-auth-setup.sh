#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${1:-$root_dir/.env}"
compose_file="${2:-$root_dir/docker-compose.yml}"
project_name="${3:-circuits-de-zap}"

if [[ ! -f "$env_file" ]]; then
  echo "Fichier d'environnement absent : $env_file" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
. "$env_file"
set +a

: "${MONGO_APP_USER:?Definis MONGO_APP_USER dans $env_file}"
: "${MONGO_APP_PASSWORD:?Definis MONGO_APP_PASSWORD dans $env_file}"
MONGO_APP_DB="${MONGO_APP_DB:-circuits}"
MONGO_ROOT_USER="${MONGO_ROOT_USER:-zapRoot}"
MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-}"

if docker info >/dev/null 2>&1; then
  compose=(docker compose)
else
  compose=(sudo docker compose)
fi

compose_args=(
  --env-file "$env_file"
  -p "$project_name"
  -f "$compose_file"
)

"${compose[@]}" "${compose_args[@]}" up --detach --wait mongo

# 1. If the app user already authenticates, there is nothing to do.
if "${compose[@]}" "${compose_args[@]}" exec -T \
  mongo mongosh --quiet \
  --username "$MONGO_APP_USER" \
  --password "$MONGO_APP_PASSWORD" \
  --authenticationDatabase "$MONGO_APP_DB" \
  --eval 'db.getSiblingDB(process.env.MONGO_APP_DB).runCommand({ ping: 1 })' \
  >/dev/null 2>&1; then
  echo "Utilisateur MongoDB applicatif déjà opérationnel."
  exit 0
fi

# 2. No user yet: the localhost exception allows creating the first root
#    account and initiating the replica set.
if [[ -z "$MONGO_ROOT_PASSWORD" ]]; then
  echo "Aucun utilisateur applicatif et MONGO_ROOT_PASSWORD est vide." >&2
  echo "Renseigne MONGO_ROOT_PASSWORD dans $env_file pour la première installation." >&2
  exit 1
fi

"${compose[@]}" "${compose_args[@]}" exec -T \
  mongo mongosh --quiet --eval '
    const admin = db.getSiblingDB("admin");
    try {
      rs.initiate({
        _id: "rs0",
        members: [{
          _id: 0,
          host: process.env.MONGO_REPLICA_HOST || "localhost:27017",
        }],
      });
    } catch (error) {
      if (!/already initialized/i.test(error.message)) {
        throw error;
      }
    }
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (db.hello().isWritablePrimary === true) {
        break;
      }
      sleep(100);
    }
    if (db.hello().isWritablePrimary !== true) {
      throw new Error("Le replica set ne peut pas elire de primaire.");
    }
    try {
      admin.createUser({
        user: process.env.MONGO_ROOT_USER,
        pwd: process.env.MONGO_ROOT_PASSWORD,
        roles: [{ role: "root", db: "admin" }],
      });
      print("root-created");
    } catch (error) {
      if (!/already exists/i.test(error.message)) {
        throw error;
      }
    }
  '

# 3. Authenticate as root and create the least-privilege application user.
"${compose[@]}" "${compose_args[@]}" exec -T \
  mongo mongosh --quiet \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --eval '
    const dbName = process.env.MONGO_APP_DB;
    const appDb = db.getSiblingDB(dbName);
    try {
      appDb.createUser({
        user: process.env.MONGO_APP_USER,
        pwd: process.env.MONGO_APP_PASSWORD,
        roles: [{ role: "readWrite", db: dbName }],
      });
      print("app-created");
    } catch (error) {
      if (!/already exists/i.test(error.message)) {
        throw error;
      }
      print("app-exists");
    }
  '

echo "Authentification MongoDB configurée."

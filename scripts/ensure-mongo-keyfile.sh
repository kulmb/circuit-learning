#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
keyfile="${MONGO_KEYFILE_PATH:-$root_dir/deploy/mongo/keyfile}"

if [[ -e "$keyfile" && ! -f "$keyfile" ]]; then
  echo "$keyfile existe mais n'est pas un fichier." >&2
  exit 1
fi

if [[ -s "$keyfile" ]]; then
  # Repair permissions left by an earlier deploy or a manual copy.
  if [[ "$(id -u)" -eq 0 ]]; then
    chown 999:999 "$keyfile"
    chmod 400 "$keyfile"
  elif sudo -n true 2>/dev/null; then
    sudo -n chown 999:999 "$keyfile"
    sudo -n chmod 400 "$keyfile"
  fi
  exit 0
fi

mkdir -p "$(dirname "$keyfile")"
umask 077
openssl rand -base64 756 > "$keyfile"
chmod 400 "$keyfile"

# The official mongo image runs mongod as uid 999. A bind-mounted keyfile
# must be readable by that user and must not be group/world readable.
if [[ "$(id -u)" -eq 0 ]]; then
  chown 999:999 "$keyfile"
elif sudo -n true 2>/dev/null; then
  sudo -n chown 999:999 "$keyfile"
  sudo -n chmod 400 "$keyfile"
else
  echo "Clé MongoDB créée : $keyfile" >&2
  echo "Rends-la lisible par l'utilisateur 999 du conteneur :" >&2
  echo "  sudo chown 999:999 '$keyfile' && sudo chmod 400 '$keyfile'" >&2
fi

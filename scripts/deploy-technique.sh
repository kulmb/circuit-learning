#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_dir="${WEB_DEPLOY_DIR:-/srv/circuits/web-dev}"
source_file="$root_dir/docs/architecture-zap.html"
target_file="$target_dir/technique"

if [[ ! -f "$source_file" ]]; then
  echo "Fichier source absent : $source_file" >&2
  exit 1
fi

if [[ ! -d "$target_dir" || ! -w "$target_dir" ]]; then
  echo "Le dossier de déploiement '$target_dir' est absent ou non inscriptible." >&2
  exit 1
fi

temp_file="$(mktemp "${TMPDIR:-/tmp}/zap-technique.XXXXXX")"
trap 'rm -f "$temp_file"' EXIT

# The dev CSP only allows same-origin fonts (font-src 'self'); drop the Google
# Fonts stylesheet so the page uses its system font stack.
sed '/fonts\.googleapis\.com/d' "$source_file" > "$temp_file"

install -m 644 "$temp_file" "$target_file"

echo "Page d'architecture déployée : $target_file"

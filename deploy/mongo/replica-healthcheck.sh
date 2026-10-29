#!/usr/bin/env bash
set -euo pipefail

# Liveness only. The replica set is initiated by scripts/mongo-auth-setup.sh
# after the container is up, because keyFile authentication and the localhost
# exception must be handled in a specific order. `ping` is allowed without
# authentication; `rs.status`/`hello` are not reliable before the set exists.
mongosh --quiet --host 127.0.0.1:27017 --eval \
  'db.adminCommand({ ping: 1 }).ok' | grep -q 1

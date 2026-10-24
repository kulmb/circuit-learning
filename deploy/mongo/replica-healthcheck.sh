#!/usr/bin/env bash
set -euo pipefail

# A single-node replica set is required for transactions. The first health
# check initialises it; later checks only read its status.
readonly host="${MONGO_REPLICA_HOST:-localhost:27017}"

mongosh --quiet --host 127.0.0.1:27017 --eval "
try {
  rs.status().ok
} catch (error) {
  rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '${host}' }] }).ok
}
"

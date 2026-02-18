#!/bin/bash
set -e

if [ "$WORKER_MODE" != "worker" ]; then
  echo "Running migrations for $WORKER_MODE"
  until npx medusa db:migrate; do
    echo "Migration failed — retrying in 5s..."
    sleep 5
  done
else
  echo "Skipping migrations because WORKER_MODE=worker"
fi

exec "$@"

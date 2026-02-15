#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8787}"
HOST="${HOST:-127.0.0.1}"

if command -v ss >/dev/null 2>&1; then
  while ss -ltn "sport = :${PORT}" | grep -q ":${PORT}"; do
    PORT="$((PORT + 1))"
  done
fi

echo "Serving Chinese Flash Cards at http://${HOST}:${PORT}"
echo "Press Ctrl+C to stop"
python3 -m http.server "${PORT}" --bind "${HOST}"

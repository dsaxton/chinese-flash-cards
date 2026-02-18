#!/usr/bin/env bash
set -euo pipefail

INPUT_FILE="${1:-data/deck-data.json}"
OUTPUT_FILE="${2:-}"

FILTER='
  (.vocab + .radicals)
  | map(select(.mnemonicData.soundAnchor == ""))
  | map(del(.mnemonicData.components))
  | .[]
'

if [[ -n "$OUTPUT_FILE" ]]; then
  jq -c "$FILTER" "$INPUT_FILE" > "$OUTPUT_FILE"
else
  jq -c "$FILTER" "$INPUT_FILE"
fi

#!/usr/bin/env bash

set -euo pipefail

TUNNEL_URL="${1:-${OLLAMA_BASE_URL:-}}"
MODEL="${OLLAMA_CHAT_MODEL:-qwen3.5:0.8b}"

if [[ -z "$TUNNEL_URL" ]]; then
  echo "Passa l'URL del tunnel come primo argomento o imposta OLLAMA_BASE_URL." >&2
  exit 1
fi

curl -fsS "$TUNNEL_URL/api/tags" >/dev/null
curl -fsS "$TUNNEL_URL/api/chat" \
  -H 'content-type: application/json' \
  -d "{\"model\":\"$MODEL\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Rispondi solo con OK\"}]}" \
  | sed -n '1,20p'

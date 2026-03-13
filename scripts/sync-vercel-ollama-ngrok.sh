#!/usr/bin/env bash

set -euo pipefail

ENVIRONMENT="${VERCEL_ENVIRONMENT:-production}"
CHAT_MODEL="${OLLAMA_CHAT_MODEL:-qwen3.5:0.8b}"
EMBED_MODEL="${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}"
LOCAL_OLLAMA_URL="${LOCAL_OLLAMA_URL:-http://127.0.0.1:11434}"
NGROK_API_URL="${NGROK_API_URL:-http://127.0.0.1:4040/api/tunnels}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="$PROJECT_DIR/.ngrok"
STATE_FILE="$STATE_DIR/current-url.txt"

mkdir -p "$STATE_DIR"

cd "$PROJECT_DIR"

if ! curl -fsS "$LOCAL_OLLAMA_URL/api/tags" >/dev/null 2>&1; then
  echo "Ollama locale non raggiungibile su $LOCAL_OLLAMA_URL" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx non disponibile nel PATH." >&2
  exit 1
fi

TUNNEL_JSON="$(curl -fsS "$NGROK_API_URL")"
TUNNEL_URL="$(
  printf '%s' "$TUNNEL_JSON" | python3 -c '
import json
import sys

data = json.load(sys.stdin)
for tunnel in data.get("tunnels", []):
    url = tunnel.get("public_url", "")
    if url.startswith("https://"):
        print(url)
        break
' || true
)"

if [[ -z "$TUNNEL_URL" ]]; then
  echo "URL ngrok non trovato in $NGROK_API_URL" >&2
  exit 1
fi

PREVIOUS_URL=""
if [[ -f "$STATE_FILE" ]]; then
  PREVIOUS_URL="$(cat "$STATE_FILE")"
fi

if [[ "$TUNNEL_URL" == "$PREVIOUS_URL" ]]; then
  echo "Tunnel invariato: $TUNNEL_URL"
  exit 0
fi

printf '%s' "$TUNNEL_URL" >"$STATE_FILE"

echo "Aggiorno Vercel ($ENVIRONMENT) con $TUNNEL_URL"
printf '%s' "$TUNNEL_URL" | npx vercel env add OLLAMA_BASE_URL "$ENVIRONMENT" --force
printf '%s' 'ollama' | npx vercel env add AI_PROVIDER "$ENVIRONMENT" --force
printf '%s' "$CHAT_MODEL" | npx vercel env add OLLAMA_CHAT_MODEL "$ENVIRONMENT" --force
printf '%s' "$EMBED_MODEL" | npx vercel env add OLLAMA_EMBEDDING_MODEL "$ENVIRONMENT" --force

echo "Eseguo redeploy production"
npx vercel deploy --prod --yes

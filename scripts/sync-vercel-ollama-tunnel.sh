#!/usr/bin/env bash

set -euo pipefail

ENVIRONMENT="${VERCEL_ENVIRONMENT:-production}"
CHAT_MODEL="${OLLAMA_CHAT_MODEL:-qwen3.5:0.8b}"
EMBED_MODEL="${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared non trovato nel PATH." >&2
  exit 1
fi

if ! curl -fsS "${LOCAL_OLLAMA_URL:-http://127.0.0.1:11434}/api/tags" >/dev/null 2>&1; then
  echo "Ollama locale non raggiungibile." >&2
  exit 1
fi

if ! npx vercel --version >/dev/null 2>&1; then
  echo "Vercel CLI non disponibile tramite npx." >&2
  exit 1
fi

TUNNEL_OUTPUT="$(bash "$SCRIPT_DIR/start-ollama-cloudflare-tunnel.sh")"
printf '%s\n' "$TUNNEL_OUTPUT"

TUNNEL_URL="$(printf '%s\n' "$TUNNEL_OUTPUT" | grep -Eo 'https://[-a-z0-9]+\.trycloudflare\.com' | head -n 1)"
if [[ -z "$TUNNEL_URL" ]]; then
  echo "Impossibile estrarre l'URL del tunnel." >&2
  exit 1
fi

echo "Aggiorno Vercel ($ENVIRONMENT) con $TUNNEL_URL"
npx vercel env update OLLAMA_BASE_URL "$ENVIRONMENT" --value "$TUNNEL_URL" --yes
npx vercel env update OLLAMA_CHAT_MODEL "$ENVIRONMENT" --value "$CHAT_MODEL" --yes
npx vercel env update OLLAMA_EMBEDDING_MODEL "$ENVIRONMENT" --value "$EMBED_MODEL" --yes
npx vercel env update AI_PROVIDER "$ENVIRONMENT" --value ollama --yes

echo "Avvio deploy production"
npx vercel deploy --prod --yes

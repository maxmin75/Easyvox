#!/usr/bin/env bash

set -euo pipefail

LOCAL_OLLAMA_URL="${LOCAL_OLLAMA_URL:-http://127.0.0.1:11434}"
LOG_DIR="${LOG_DIR:-.cloudflared}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/ollama-tunnel.log}"
PID_FILE="${PID_FILE:-$LOG_DIR/ollama-tunnel.pid}"

mkdir -p "$LOG_DIR"

extract_tunnel_url() {
  grep -Eo 'https://[-a-z0-9]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -n 1
}

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared non trovato nel PATH." >&2
  exit 1
fi

if ! curl -fsS "$LOCAL_OLLAMA_URL/api/tags" >/dev/null 2>&1; then
  echo "Ollama non risponde su $LOCAL_OLLAMA_URL" >&2
  exit 1
fi

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" >/dev/null 2>&1; then
  TUNNEL_URL="$(extract_tunnel_url || true)"
  if [[ -n "${TUNNEL_URL:-}" ]]; then
    echo "Tunnel Cloudflare attivo: $TUNNEL_URL"
    echo "Imposta OLLAMA_BASE_URL=$TUNNEL_URL su Vercel o in /admin/system-settings."
    exit 0
  fi
  echo "Tunnel gia attivo con PID $(cat "$PID_FILE"), ma URL non trovato nel log." >&2
  exit 1
fi

rm -f "$LOG_FILE"

nohup cloudflared tunnel --no-autoupdate --url "$LOCAL_OLLAMA_URL" >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

for _ in {1..40}; do
  TUNNEL_URL="$(extract_tunnel_url || true)"
  if [[ -n "${TUNNEL_URL:-}" ]]; then
    echo "Tunnel Cloudflare attivo: $TUNNEL_URL"
    echo "Imposta OLLAMA_BASE_URL=$TUNNEL_URL su Vercel o in /admin/system-settings."
    exit 0
  fi
  sleep 1
done

echo "Tunnel avviato ma URL non trovato ancora. Controlla $LOG_FILE" >&2
exit 1

#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-4173}"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/facharbeit-ui-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  if curl --silent --fail "http://127.0.0.1:${PORT}/" >/dev/null; then
    break
  fi
  sleep 0.1
done
curl --silent --fail "http://127.0.0.1:${PORT}/data/requirements.json" >/dev/null

CHROME=""
for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    CHROME="$(command -v "$candidate")"
    break
  fi
done
if [[ -z "$CHROME" ]]; then
  echo "Kein Chrome/Chromium für Browser-Smoke gefunden." >&2
  exit 1
fi

run_smoke() {
  local size="$1"
  local dump
  dump="$($CHROME --headless=new --no-sandbox --disable-gpu --window-size="$size" --virtual-time-budget=2500 --dump-dom "http://127.0.0.1:${PORT}/" 2>/tmp/facharbeit-chrome.log)"
  grep -q "Woran arbeitest du jetzt?" <<<"$dump"
  grep -q "Schritt 1" <<<"$dump"
  grep -q "Selbst geprüfte Leitfragen" <<<"$dump"
  grep -q "Daten &amp; Backup" <<<"$dump"
  grep -q "Belegte Anforderungen" <<<"$dump"
  if grep -q "Die Daten konnten nicht geladen werden" <<<"$dump"; then
    echo "App-Daten konnten im Browser-Smoke nicht geladen werden." >&2
    exit 1
  fi
}

run_smoke "1440,1200"
run_smoke "390,844"

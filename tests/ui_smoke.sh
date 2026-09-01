#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-4173}"
SEED_FILE=".ui-smoke-seed.html"
cat >"$SEED_FILE" <<'EOF'
<!doctype html>
<meta charset="utf-8">
<script>
localStorage.setItem("facharbeit-pt3-guide-v1", JSON.stringify({
  version: 2,
  mode: "facharbeit",
  activePhase: "verstehen-analysieren",
  specialization: "heilpaedagogik",
  topic: "",
  answers: {},
  answerStatus: {},
  checks: {}
}));
location.replace("/");
</script>
EOF

python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/facharbeit-ui-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true; rm -f "$SEED_FILE"' EXIT

for _ in $(seq 1 40); do
  if curl --silent --fail "http://127.0.0.1:${PORT}/" >/dev/null; then
    break
  fi
  sleep 0.1
done
curl --silent --fail "http://127.0.0.1:${PORT}/data/requirements.json" >/dev/null
curl --silent --fail "http://127.0.0.1:${PORT}/clarity.js" >/dev/null
curl --silent --fail "http://127.0.0.1:${PORT}/clarity.css" >/dev/null

grep -q 'href="clarity.css"' index.html
grep -q 'src="clarity.js"' index.html

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

run_gate_smoke() {
  local size="$1"
  local dump
  dump="$($CHROME --headless=new --no-sandbox --disable-gpu --window-size="$size" --virtual-time-budget=2500 --dump-dom "http://127.0.0.1:${PORT}/" 2>/tmp/facharbeit-chrome.log)"
  grep -q "Vertiefung auswählen" <<<"$dump"
  grep -q "Heilpädagogik" <<<"$dump"
  grep -q "Andere Vertiefung – nur allgemeine Vorgaben vorhanden" <<<"$dump"
  grep -q "Daten &amp; Backup" <<<"$dump"
  grep -q "Alle schulischen Dokumente" <<<"$dump"
  if grep -q "Die Daten konnten nicht geladen werden" <<<"$dump"; then
    echo "App-Daten konnten im Browser-Smoke nicht geladen werden." >&2
    exit 1
  fi
}

run_guided_smoke() {
  local size="$1"
  local dump
  dump="$($CHROME --headless=new --no-sandbox --disable-gpu --window-size="$size" --virtual-time-budget=3500 --dump-dom "http://127.0.0.1:${PORT}/${SEED_FILE}" 2>/tmp/facharbeit-chrome-guided.log)"
  grep -q "Bereich wählen &amp; weiterarbeiten" <<<"$dump"
  grep -q "Hier weitermachen" <<<"$dump"
  grep -q "Von mir abgeglichene Anforderungen" <<<"$dump"
  grep -q "Du arbeitest in der Gliederung an:" <<<"$dump"
  grep -q "2.1 Empathisches Verstehen und Analysieren mit dem Fünf Ebenen Modell" <<<"$dump"
  grep -q "Arbeitsorientierung · keine zusätzliche Bewertungsvorgabe" <<<"$dump"
  grep -q "Hier geht es um:" <<<"$dump"
  grep -q "Noch nicht:" <<<"$dump"
  grep -q "Deckt diese belegten Anforderungen ab:" <<<"$dump"
  grep -q "größter Bewertungsanteil" <<<"$dump"
  grep -q "Arbeitsstand wird lokal im Browser gespeichert" <<<"$dump"
  if grep -q "Die Daten konnten nicht geladen werden" <<<"$dump"; then
    echo "App-Daten konnten im geführten Browser-Smoke nicht geladen werden." >&2
    exit 1
  fi
}

run_gate_smoke "1440,1200"
run_gate_smoke "390,844"
run_guided_smoke "1440,1200"
run_guided_smoke "390,844"

#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-4173}"
GUIDED_SEED=".ui-smoke-guided-seed.html"
FORMAL_SEED=".ui-smoke-formal-seed.html"
REFERENCE_SEED=".ui-smoke-reference-seed.html"

cat >"$GUIDED_SEED" <<'EOF'
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

cat >"$FORMAL_SEED" <<'EOF'
<!doctype html>
<meta charset="utf-8">
<script>
localStorage.setItem("facharbeit-pt3-guide-v1", JSON.stringify({
  version: 2,
  mode: "facharbeit",
  activePhase: "start",
  specialization: "heilpaedagogik",
  topic: "",
  answers: {},
  answerStatus: {},
  checks: {}
}));
location.replace("/");
</script>
EOF

cat >"$REFERENCE_SEED" <<'EOF'
<!doctype html>
<meta charset="utf-8">
<script>
localStorage.setItem("facharbeit-pt3-guide-v1", JSON.stringify({
  version: 2,
  mode: "facharbeit",
  activePhase: "start",
  specialization: "heilpaedagogik",
  topic: "",
  answers: {},
  answerStatus: {},
  checks: {}
}));
location.replace("/#sources");
</script>
EOF

python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/facharbeit-ui-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true; rm -f "$GUIDED_SEED" "$FORMAL_SEED" "$REFERENCE_SEED"' EXIT

for _ in $(seq 1 40); do
  if curl --silent --fail "http://127.0.0.1:${PORT}/" >/dev/null; then
    break
  fi
  sleep 0.1
done
curl --silent --fail "http://127.0.0.1:${PORT}/data/requirements.json" >/dev/null
curl --silent --fail "http://127.0.0.1:${PORT}/clarity.js" >/dev/null
curl --silent --fail "http://127.0.0.1:${PORT}/clarity.css" >/dev/null
curl --silent --fail "http://127.0.0.1:${PORT}/focus.js" >/dev/null
curl --silent --fail "http://127.0.0.1:${PORT}/focus.css" >/dev/null

grep -q 'href="clarity.css"' index.html
grep -q 'href="focus.css"' index.html
grep -q 'src="clarity.js"' index.html
grep -q 'src="focus.js"' index.html

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
  dump="$($CHROME --headless=new --no-sandbox --disable-gpu --window-size="$size" --virtual-time-budget=3000 --dump-dom "http://127.0.0.1:${PORT}/" 2>/tmp/facharbeit-chrome.log)"
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
  dump="$($CHROME --headless=new --no-sandbox --disable-gpu --window-size="$size" --virtual-time-budget=4000 --dump-dom "http://127.0.0.1:${PORT}/${GUIDED_SEED}" 2>/tmp/facharbeit-chrome-guided.log)"
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
  grep -q "Nachschlagen, wenn du es brauchst" <<<"$dump"
  if grep -q "Die Daten konnten nicht geladen werden" <<<"$dump"; then
    echo "App-Daten konnten im geführten Browser-Smoke nicht geladen werden." >&2
    exit 1
  fi
}

run_formal_smoke() {
  local size="$1"
  local dump
  dump="$($CHROME --headless=new --no-sandbox --disable-gpu --window-size="$size" --virtual-time-budget=4000 --dump-dom "http://127.0.0.1:${PORT}/${FORMAL_SEED}" 2>/tmp/facharbeit-chrome-formal.log)"
  grep -q "Vor dem Schreiben" <<<"$dump"
  grep -q "Beim Schreiben" <<<"$dump"
  grep -q "Vor der Abgabe" <<<"$dump"
  grep -q "Rahmen, Gliederung, Umfang, Arbeitstitel und Literaturbasis klären" <<<"$dump"
  grep -q "Referenzbereich direkt öffnen" <<<"$dump"
  grep -q "Gliederung" <<<"$dump"
  grep -q "Quellenhierarchie" <<<"$dump"
  grep -q "Offene Punkte" <<<"$dump"
  grep -q "Einordnung" <<<"$dump"
  grep -q "Schuldokumente" <<<"$dump"
  grep -q 'class="reference-fold"' <<<"$dump"
  grep -q "Arbeitsstand sichern oder wiederherstellen" <<<"$dump"
  if grep -Eq '<details class="reference-fold"[^>]* open' <<<"$dump"; then
    echo "Referenzbereiche sollen ohne Direktlink zunächst eingeklappt sein." >&2
    exit 1
  fi
  if grep -q "Die Daten konnten nicht geladen werden" <<<"$dump"; then
    echo "App-Daten konnten im Formalia-Smoke nicht geladen werden." >&2
    exit 1
  fi
}

run_reference_hash_smoke() {
  local size="$1"
  local dump
  dump="$($CHROME --headless=new --no-sandbox --disable-gpu --window-size="$size" --virtual-time-budget=4000 --dump-dom "http://127.0.0.1:${PORT}/${REFERENCE_SEED}" 2>/tmp/facharbeit-chrome-reference.log)"
  grep -Eq '<details class="reference-fold"[^>]*data-reference-id="sources"[^>]*open' <<<"$dump"
  grep -q "Alle schulischen Dokumente" <<<"$dump"
}

run_gate_smoke "1440,1200"
run_gate_smoke "390,844"
run_guided_smoke "1440,1200"
run_guided_smoke "390,844"
run_formal_smoke "1440,1200"
run_formal_smoke "390,844"
run_reference_hash_smoke "1440,1200"
run_reference_hash_smoke "390,844"

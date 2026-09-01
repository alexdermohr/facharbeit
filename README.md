# Facharbeit

Fragengestützte, quellennah aufgebaute Arbeitshilfe für Prüfungsteil III der Erzieherausbildung an der Fachschule für Sozialpädagogik.

## Was hier entsteht

Das Repository trennt drei Ebenen bewusst:

1. **Primärquellen** – die drei schulischen PDF-Dokumente unter [`quellen/`](quellen/).
2. **Anforderungsmodell** – strukturierte, quellenbezogene Anforderungen in [`data/requirements.json`](data/requirements.json) und lesbar in [`docs/ANFORDERUNGSMODELL.md`](docs/ANFORDERUNGSMODELL.md).
3. **Leitfragen** – daraus abgeleitete Fragen in der Website, die beim eigenen Denken und Schreiben helfen. Sie sind keine zusätzlichen offiziellen Bewertungskriterien.

Die Website berechnet **keine Note**.

## Website

`index.html`, `styles.css` und `app.js` bilden eine statische Website ohne Backend. Antworten und Häkchen werden ausschließlich per `localStorage` im eigenen Browser gespeichert. Der Arbeitsstand kann als JSON exportiert werden.

Die Website ist als statische Seite vollständig im Repository enthalten. Für eine öffentliche GitHub-Pages-URL muss im Repository einmalig **Settings → Pages → Source: GitHub Actions** aktiviert werden. Danach kann der Workflow **Deploy GitHub Pages** manuell gestartet werden.

Vorgesehene URL nach Aktivierung:

**https://alexdermohr.github.io/facharbeit/**

## Lokal ansehen

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000/` öffnen.

## Validierung

```bash
python3 -m unittest discover -s tests
```

Die Tests prüfen unter anderem:

- Facharbeit-Gewichte 25/40/35 = 100,
- Kolloquium-Gewichte 40/20/40 = 100,
- eindeutige IDs,
- gültige Quellen- und Seitenverweise,
- jede abgeleitete Leitfrage verweist auf bestehende Anforderungen,
- die drei Primärquellen sind vorhanden.

## Bekannte Lücken

Die Schuldokumente nennen, aber erklären nicht vollständig:

- das „Modell der Fünf Ebenen“ nach Fröhlich-Gildhoff,
- die im Seminar besprochenen Qualitätskriterien für Literatur,
- den vollständigen Zitier- und KI-Leitfaden,
- die genaue Einrechnung einzelner Bestandteile in die 12–15 Seiten,
- konkrete individuelle Termine.

Diese Lücken werden nicht mit allgemeinem Modellwissen aufgefüllt.

## Quellen

- [`250904-Bewertungshinweise-Facharbeit.pdf`](quellen/250904-Bewertungshinweise-Facharbeit.pdf)
- [`251016-Info_Der-Pruefungsteil-III.pdf`](quellen/251016-Info_Der-Pruefungsteil-III.pdf)
- [`251124-Bewertungshinweise-Kolloquium_neu-Mi_Ot_Sti_Ree.pdf`](quellen/251124-Bewertungshinweise-Kolloquium_neu-Mi_Ot_Sti_Ree.pdf)

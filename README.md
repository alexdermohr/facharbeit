# Facharbeit

Fragengestützte, quellennah aufgebaute Arbeitshilfe für Prüfungsteil III der Erzieherausbildung an der Fachschule für Sozialpädagogik.

## Quellenmodell

Das Repository trennt vier Ebenen:

1. **Schuldokumente** – dreizehn PDFs unter [`quellen/`](quellen/), jeweils als Prüfungs-/Bewertungsdokument, verbindliche Vorgabe, schulische Richtlinie oder Unterrichtshilfe klassifiziert.
2. **Anforderungsmodell** – strukturierte, seitenbezogene Aussagen in [`data/requirements.json`](data/requirements.json) und lesbar in [`docs/ANFORDERUNGSMODELL.md`](docs/ANFORDERUNGSMODELL.md).
3. **Leitfragen und Unterrichtshilfen** – navigieren durch die Arbeit, sind aber keine zusätzlichen offiziellen Bewertungskriterien.
4. **Planungskontext** – der mitgeteilte Abgabetermin `13.11.2026` wird separat als nicht PDF-belegte Planungsangabe geführt.

Die detaillierte Quellenhierarchie steht in [`docs/QUELLENMATRIX.md`](docs/QUELLENMATRIX.md). Die Website berechnet **keine Note**.

## Neu aus dem erweiterten Quellenpaket

- verbindliche Endgliederung von `1` bis `3.4`,
- vollständige fünf Analyseebenen nach dem Unterrichtsblatt,
- konkrete Checkliste für die Situationsbeschreibung,
- schulische Zitier- und KI-Richtlinie,
- Rechercheworkflow und Suchoperatoren,
- Kriterien zur Prüfung von Internet- und Textquellen einschließlich Zitierfähigkeit und Herkunft,
- Anleitung zum eigenständigen Verdichten von Fachtexten,
- allgemeine Grundsätze wissenschaftlichen Schreibens.

Die früheren Lücken zum Fünf-Ebenen-Modell, zur KI-/Zitier-Richtlinie und zu den Qualitätskriterien für Textquellen sind damit geschlossen. Offen bleiben unter anderem die genaue Einrechnung in die 12–15 Seiten und die im Gliederungsblatt erwähnten Beispielgliederungen im Anhang.

## Website

`index.html`, `styles.css` und `app.js` bilden eine statische Website ohne Backend. Antworten und Häkchen werden ausschließlich per `localStorage` im eigenen Browser gespeichert. Der Arbeitsstand kann als JSON exportiert werden.

Öffentliche Seite:

**https://alexdermohr.github.io/facharbeit/**

## Lokal ansehen

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000/` öffnen.

## Validierung

```bash
python3 -m unittest discover -s tests
node --check app.js
```

Die Tests prüfen unter anderem Gewichte, eindeutige IDs, Quellen- und Seitenverweise, PDF-Dateien und SHA-256-Bindungen, die verbindliche Gliederung, die fünf Ebenen, KI-Regeln sowie die Trennung des mitgeteilten Termins von PDF-belegten Vorgaben.

# Facharbeit

Fragengestützte, quellennah aufgebaute Arbeitshilfe für Prüfungsteil III der Erzieherausbildung an der Fachschule für Sozialpädagogik.

## Quellenmodell

Das Repository trennt vier Ebenen:

1. **Schuldokumente** – vierzehn Dateien unter [`quellen/`](quellen/) (dreizehn PDFs und ein DOCX), jeweils als Prüfungs-/Bewertungsdokument, verbindliche Vorgabe, schulische Richtlinie oder Unterrichtshilfe klassifiziert.
2. **Anforderungsmodell** – strukturierte, seitenbezogene Aussagen in [`data/requirements.json`](data/requirements.json) und lesbar in [`docs/ANFORDERUNGSMODELL.md`](docs/ANFORDERUNGSMODELL.md).
3. **Leitfragen und Unterrichtshilfen** – navigieren durch die Arbeit, sind aber keine zusätzlichen offiziellen Bewertungskriterien.
4. **Planungskontext** – der mitgeteilte Abgabetermin `13.11.2026` wird separat als nicht PDF-belegte Planungsangabe geführt.

Die detaillierte Quellenhierarchie steht in [`docs/QUELLENMATRIX.md`](docs/QUELLENMATRIX.md). Die Website berechnet **keine Note**.

## Neu aus dem erweiterten Quellenpaket

- verbindliche allgemeine Endgliederung von `1` bis `3.4`,
- eigene verbindliche Gliederung für die Vertiefung Heilpädagogik mit Hinweisen zu ICF-CY, Förderplanung/SMART, Empowerment, kleinschrittiger Planung und Teilhabebarrieren,
- vollständige fünf Analyseebenen nach dem Unterrichtsblatt,
- konkrete Checkliste für die Situationsbeschreibung,
- schulische Zitier- und KI-Richtlinie,
- Rechercheworkflow und Suchoperatoren,
- Kriterien zur Prüfung von Internet- und Textquellen einschließlich Zitierfähigkeit und Herkunft,
- Anleitung zum eigenständigen Verdichten von Fachtexten,
- allgemeine Grundsätze wissenschaftlichen Schreibens.

Die frühere Quellenlücke zum Fünf-Ebenen-Modell und zu den Qualitätskriterien für Textquellen ist geschlossen; auch ein schulisches Richtlinienblatt zu Zitation und KI liegt vor. Für die aktuelle Arbeitsfassung sind zusätzlich mitgeteilte Konkretisierungen hinterlegt: Für die 12–15 Seiten zählt nur der reine Fließtext, als valide Mindestquellen gelten Bücher und Aufsätze aus Fachzeitschriften, zusätzlich ist eine digitale PDF-Fassung abzugeben und die schulische KI-Regelung wird ausdrücklich als noch nicht abschließend geklärt behandelt. Diese Punkte werden auf der Website von den belegten Schuldokument-Aussagen getrennt kenntlich gemacht. Offen bleiben unter anderem die im Gliederungsblatt erwähnten Beispielgliederungen im Anhang.

## Website

`index.html`, `styles.css` und `app.js` bilden eine statische Website ohne Backend. Zu Beginn wird die Vertiefung ausgewählt. Für **Heilpädagogik** schaltet die Website auf die vertiefungsspezifische verbindliche Gliederung und zeigt die dort enthaltenen Orientierungsfragen im passenden Arbeitsschritt; für andere Vertiefungen zeigt sie die allgemeine verbindliche Gliederung nur als Basis und kennzeichnet die fehlende vertiefungsspezifische Quelle. Antworten, Auswahl und Häkchen werden ausschließlich per `localStorage` im eigenen Browser gespeichert. Der Arbeitsstand kann als JSON exportiert werden.

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

Die Tests prüfen unter anderem Gewichte, eindeutige IDs, Quellen- und Seitenverweise, Quelldateien und SHA-256-Bindungen, die verbindlichen Gliederungen einschließlich Heilpädagogik, die fünf Ebenen, KI-Regeln sowie die Trennung des mitgeteilten Termins von PDF-belegten Vorgaben.

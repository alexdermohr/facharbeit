# Facharbeit

Fragengestützte, quellennah aufgebaute Arbeitshilfe für Prüfungsteil III der Erzieherausbildung an der Fachschule für Sozialpädagogik.

## Eigene Facharbeit

Der persönliche Arbeitsbereich zur konkreten eigenen Facharbeit liegt unter [`eigene_facharbeit/`](eigene_facharbeit/README.md).

Dort werden getrennt von der allgemeinen Leitfaden-Website dokumentiert:

- die gewählte **Fanta-Kuchen-Situation** als Ausgangslage,
- die Rekonstruktion von Beobachtung vs. Interpretation,
- die Analyse der eigenen Verstrickung und damaligen Konsequenz,
- die Hypothese zu Sicherung/„Loslassen“, verzögertem Return und sozialer Reziprozität,
- vorläufige Bezüge zu den Fröhlich-Gildhoff-Ebenen,
- offene Rekonstruktionsfragen und Literaturbedarf,
- ein commitgebundener Quellenindex mit direkten Links in das PrepP-Repository.

## Was die Website abbildet

Die Website führt durch Facharbeit und Kolloquium und verbindet die Arbeitsschritte direkt mit den einschlägigen Anforderungen und Schulunterlagen. Enthalten sind insbesondere:

- die Bewertungslogik von Facharbeit und Kolloquium,
- die verbindliche allgemeine Gliederung und die eigene Gliederung für Heilpädagogik,
- das Fünf-Ebenen-Modell nach Fröhlich-Gildhoff,
- Leitfragen für Situationsbeschreibung, Analyse, Planung und Reflexion,
- Regeln zu wissenschaftlichem Schreiben und Zitieren,
- Recherchehilfen und Kriterien zur Quellenqualität,
- Hinweise zur KI-Nutzung,
- Formalia und Abgabeanforderungen,
- lokale Speicherung sowie JSON- und Markdown-Export.

Für die Facharbeit gelten außerdem: 12–15 Seiten reiner Fließtext, mindestens zwei valide Quellen aus Büchern oder Fachzeitschriftenaufsätzen, zusätzlich eine digitale PDF-Abgabe und eine noch nicht abschließend festgelegte schulische KI-Regelung, bei der offene Fragen mit der Lehrkraft geklärt werden sollen.

## Quellen und Verbindlichkeit

Das Repository unterscheidet vier Rollen:

1. **Prüfungs-/Bewertungsdokumente** – Prüfungsaufbau, Gewichte und Leistungserwartungen.
2. **Verbindliche Vorgaben** – allgemeine und heilpädagogische Endgliederung.
3. **Schulische Richtlinie** – wissenschaftliches Arbeiten, Zitation und KI-Nutzung.
4. **Unterrichtshilfen** – zusätzliche Orientierung für die Bearbeitung; keine eigenen Bewertungskriterien.

Die Originalunterlagen liegen unter [`quellen/`](quellen/). Das strukturierte Anforderungsmodell steht in [`data/requirements.json`](data/requirements.json) und wird in [`docs/ANFORDERUNGSMODELL.md`](docs/ANFORDERUNGSMODELL.md) erläutert. Die Quellenrollen sind in [`docs/QUELLENMATRIX.md`](docs/QUELLENMATRIX.md) dokumentiert.

Kursbezogene Angaben, die nicht aus einem verlinkten Originaldokument stammen, werden im Datenmodell getrennt gespeichert. Die Website berechnet **keine Note**.

## Website

`index.html`, `styles.css` und `app.js` bilden eine statische Website ohne Backend. Zu Beginn wird die Vertiefung ausgewählt. Für **Heilpädagogik** zeigt die Website die vertiefungsspezifische Gliederung und die zugehörigen Hinweise; für andere Vertiefungen dient die allgemeine verbindliche Gliederung als Grundlage.

Antworten, Auswahl und Häkchen werden ausschließlich per `localStorage` im eigenen Browser gespeichert. Der Arbeitsstand kann als JSON gesichert und als Markdown exportiert werden.

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

Die Tests prüfen unter anderem Gewichte, eindeutige IDs, Quellen- und Seitenverweise, Quelldateien und SHA-256-Bindungen, die verbindlichen Gliederungen, das Fünf-Ebenen-Modell, KI-Regeln, Backup-Migration und die Browser-Oberfläche auf Desktop und Mobil.

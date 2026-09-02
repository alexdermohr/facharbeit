from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
PROTOCOL = ROOT / "docs" / "USABILITY_TEST_ISSUE_9.md"


class UsabilityProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = PROTOCOL.read_text(encoding="utf-8")

    def test_protocol_requires_real_people_and_device_mix(self):
        for marker in (
            "mindestens **3 Schüler**",
            "mindestens **1 Person ohne vorherige Nutzung**",
            "mindestens **1 Desktop- oder Notebook-Test**",
            "mindestens **2 Smartphone-Tests**",
            "unterschiedliche Displaygrößen",
        ):
            self.assertIn(marker, self.text)

    def test_protocol_has_twelve_atomic_tasks(self):
        numbers = [int(value) for value in re.findall(r"^### Aufgabe (\d+) –", self.text, re.MULTILINE)]
        self.assertEqual(numbers, list(range(1, 13)))
        for marker in (
            "Heilpädagogik auswählen",
            "Nächsten Arbeitsschritt finden",
            "Verstehen & Analysieren öffnen",
            "Gliederungsbezug erkennen",
            "Eine Leitfrage bearbeiten",
            "Belegte Anforderung erkennen",
            "Zugehörige Quelle öffnen",
            "Formale Vorgaben finden",
            "Verbindliche Gliederung nachschlagen",
            "Schuldokumente finden",
            "Zum Arbeitsfluss zurückkehren",
            "Backup oder Export finden",
        ):
            self.assertIn(marker, self.text)

    def test_observer_protocol_captures_reproducible_context(self):
        for marker in (
            "Gerät / Betriebssystem",
            "Browser",
            "Viewport / Displaygröße",
            "Fehlklicks / Umwege",
            "Zögern / Suchscrollen / Zurückspringen",
            "Wörtliche Rückfrage",
            "Technischer Fehler reproduzierbar",
            "Accessibility",
        ):
            self.assertIn(marker, self.text)

    def test_evidence_levels_and_prioritization_are_explicit(self):
        for marker in (
            "### Belegt",
            "### Plausibel",
            "### Spekulativ",
            "Häufigkeit",
            "Schwere",
            "Einfluss auf das Erreichen der Aufgabe",
            "Risiko fachlicher Fehlinterpretation",
            "Behebungsaufwand",
        ):
            self.assertIn(marker, self.text)

    def test_automation_is_not_presented_as_human_evidence(self):
        self.assertIn("keine menschlichen Testergebnisse", self.text)
        self.assertIn("kein menschlicher Nutzertest", self.text)
        self.assertIn("Browser-Smoke ≠ menschlicher Nutzertest", self.text)
        self.assertIn("Issue #11 bleibt offen", self.text)
        self.assertIn("Technische Tests dürfen", self.text)
        self.assertIn("mindestens ein Desktop-/Notebook-Test und mindestens zwei Smartphone-Tests", self.text)
        self.assertIn("nicht** als menschliche Testergebnisse", self.text)


if __name__ == "__main__":
    unittest.main()

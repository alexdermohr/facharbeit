from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ClarityLayerTests(unittest.TestCase):
    def test_clarity_assets_are_loaded_after_base_assets(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="clarity.css"', html)
        self.assertIn('src="clarity.js"', html)
        self.assertLess(html.index('href="styles.css"'), html.index('href="clarity.css"'))
        self.assertLess(html.index('src="app.js"'), html.index('src="clarity.js"'))

    def test_question_guidance_maps_back_to_requirements(self):
        script = (ROOT / "clarity.js").read_text(encoding="utf-8")
        self.assertIn("question.maps_to", script)
        self.assertIn("Deckt diese belegten Anforderungen ab", script)
        self.assertIn("Belegte Anforderungen zum Abgleichen", script)

    def test_phase_boundaries_are_explicitly_non_binding(self):
        script = (ROOT / "clarity.js").read_text(encoding="utf-8")
        self.assertIn("Arbeitsorientierung · keine zusätzliche Bewertungsvorgabe", script)
        self.assertIn("Hier geht es um:", script)
        self.assertIn("Noch nicht:", script)

    def test_self_check_copy_does_not_claim_school_validation(self):
        script = (ROOT / "clarity.js").read_text(encoding="utf-8")
        self.assertIn("Für mich geklärt", script)
        self.assertIn("Von mir abgeglichene Anforderungen", script)
        self.assertIn("Als für mich geklärt markieren", script)

    def test_outline_position_and_largest_weight_are_visible(self):
        script = (ROOT / "clarity.js").read_text(encoding="utf-8")
        self.assertIn("Du arbeitest in der Gliederung an:", script)
        self.assertIn("größter Bewertungsanteil", script)
        self.assertIn("kein separates Prozentgewicht", script)


if __name__ == "__main__":
    unittest.main()

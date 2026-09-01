import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class FocusLayerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.focus_js = (ROOT / "focus.js").read_text(encoding="utf-8")
        cls.focus_css = (ROOT / "focus.css").read_text(encoding="utf-8")
        cls.model = json.loads((ROOT / "data" / "requirements.json").read_text(encoding="utf-8"))

    def test_focus_assets_are_loaded_after_clarity_layer(self):
        self.assertIn('href="focus.css"', self.index)
        self.assertIn('src="focus.js"', self.index)
        self.assertLess(self.index.index('href="clarity.css"'), self.index.index('href="focus.css"'))
        self.assertLess(self.index.index('src="clarity.js"'), self.index.index('src="focus.js"'))

    def test_every_formal_requirement_is_assigned_to_a_time_group(self):
        model_ids = {item["id"] for item in self.model["formal_requirements"]}
        focus_ids = set(re.findall(r'"(formal-[a-z0-9-]+)"', self.focus_js))
        self.assertEqual(model_ids, focus_ids)
        self.assertIn('title: "Vor dem Schreiben"', self.focus_js)
        self.assertIn('title: "Beim Schreiben"', self.focus_js)
        self.assertIn('title: "Vor der Abgabe"', self.focus_js)

    def test_requirements_are_moved_not_recreated(self):
        self.assertIn('body.appendChild(item)', self.focus_js)
        self.assertIn('leftovers.forEach((item) => body.appendChild(item))', self.focus_js)
        self.assertIn('Weitere Vorgaben', self.focus_js)

    def test_reference_sections_are_folded_but_hash_addressable(self):
        for target in ["outlineSection", "referenceHierarchy", "gaps", "tensions", "sources"]:
            self.assertIn(target, self.focus_js)
        self.assertIn('document.createElement("details")', self.focus_js)
        self.assertIn('window.addEventListener("hashchange", focusOpenReferenceFromHash)', self.focus_js)
        self.assertIn('details.open = true', self.focus_js)

    def test_reference_shortcuts_and_mobile_layout_exist(self):
        self.assertIn('id = "referenceShortcuts"', self.focus_js)
        self.assertIn('Schuldokumente', self.focus_js)
        self.assertIn('.reference-shortcuts', self.focus_css)
        self.assertIn('@media (max-width: 620px)', self.focus_css)


if __name__ == "__main__":
    unittest.main()

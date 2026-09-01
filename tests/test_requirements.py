import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "data" / "requirements.json"


class RequirementsModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = json.loads(MODEL_PATH.read_text(encoding="utf-8"))

    def test_schema_version(self):
        self.assertEqual(self.model["schema_version"], 1)

    def test_primary_sources_exist(self):
        for source in self.model["sources"]:
            path = ROOT / source["file"]
            self.assertTrue(path.is_file(), source["file"])
            self.assertGreater(path.stat().st_size, 0)

    def test_weights_sum_to_100(self):
        facharbeit = sum(
            section["weight_percent"] or 0
            for section in self.model["facharbeit"]["sections"]
        )
        kolloquium = sum(
            section["weight_percent"]
            for section in self.model["kolloquium"]["sections"]
        )
        self.assertEqual(facharbeit, 100)
        self.assertEqual(kolloquium, 100)
        self.assertEqual(self.model["exam"]["grade_split_percent"], {"facharbeit": 50, "kolloquium": 50})

    def test_documented_numeric_requirements(self):
        formal = {item["id"]: item for item in self.model["formal_requirements"]}
        self.assertEqual(formal["formal-topic-limit"]["numeric"]["max_chars"], 200)
        self.assertEqual(formal["formal-sources"]["numeric"]["min_sources"], 2)

        va = next(
            section
            for section in self.model["facharbeit"]["sections"]
            if section["id"] == "verstehen-analysieren"
        )
        requirements = {item["id"]: item for item in va["requirements"]}
        self.assertEqual(requirements["fa-va-three-levels"]["numeric"]["min_levels"], 3)

    def test_requirement_ids_are_unique_and_questions_resolve(self):
        ids = []

        ids.extend(item["id"] for item in self.model["formal_requirements"])
        for section in self.model["facharbeit"]["sections"]:
            ids.extend(item["id"] for item in section["requirements"])
        ids.extend(
            item["id"]
            for item in self.model["facharbeit"]["writing_deduction"]["requirements"]
        )
        ids.extend(item["id"] for item in self.model["kolloquium"]["format"])
        for section in self.model["kolloquium"]["sections"]:
            ids.extend(item["id"] for item in section["requirements"])
        ids.extend(
            item["id"]
            for item in self.model["kolloquium"]["presentation_deduction"]["requirements"]
        )

        self.assertEqual(len(ids), len(set(ids)))

        known = set(ids)
        question_ids = []
        for question in self.model["derived_guidance"]["questions"]:
            question_ids.append(question["id"])
            self.assertEqual(question["origin"], "derived_guidance")
            self.assertTrue(question["maps_to"])
            self.assertTrue(set(question["maps_to"]).issubset(known), question["id"])
        self.assertEqual(len(question_ids), len(set(question_ids)))

    def test_all_source_references_point_to_valid_pages(self):
        sources = {source["id"]: source for source in self.model["sources"]}

        def visit(value):
            if isinstance(value, dict):
                if {"source_id", "page"}.issubset(value):
                    source = sources[value["source_id"]]
                    self.assertGreaterEqual(value["page"], 1)
                    self.assertLessEqual(value["page"], source["pages"])
                for child in value.values():
                    visit(child)
            elif isinstance(value, list):
                for child in value:
                    visit(child)

        visit(self.model)

    def test_known_gaps_are_explicit(self):
        gap_ids = {gap["id"] for gap in self.model["documented_gaps"]}
        self.assertIn("gap-five-levels", gap_ids)
        self.assertIn("gap-literature-quality", gap_ids)
        self.assertIn("gap-scientific-ai", gap_ids)


if __name__ == "__main__":
    unittest.main()

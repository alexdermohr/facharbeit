import hashlib
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

    def test_all_twelve_sources_exist_and_match_hashes(self):
        self.assertEqual(len(self.model["sources"]), 12)
        for source in self.model["sources"]:
            path = ROOT / source["file"]
            self.assertTrue(path.is_file(), source["file"])
            self.assertGreater(path.stat().st_size, 0)
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(digest, source["sha256"], source["file"])

    def test_source_roles_are_explicit(self):
        statuses = [source["status"] for source in self.model["sources"]]
        self.assertEqual(statuses.count("exam"), 3)
        self.assertEqual(statuses.count("binding"), 1)
        self.assertEqual(statuses.count("school_rule"), 1)
        self.assertEqual(statuses.count("instructional"), 7)

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

    def test_binding_outline_is_exact_and_source_backed(self):
        outline = self.model["facharbeit"]["required_outline"]
        self.assertEqual(
            [item["number"] for item in outline["items"]],
            ["1", "1.1", "1.2", "2", "2.1", "2.2", "3", "3.1", "3.2", "3.3", "3.4"],
        )
        self.assertEqual(outline["refs"], [{"source_id": "facharbeit-gliederung", "page": 1}])
        formal = {item["id"] for item in self.model["formal_requirements"]}
        self.assertIn("formal-outline", formal)

    def test_five_levels_are_now_explicit(self):
        guide = next(item for item in self.model["instructional_guidance"] if item["id"] == "guide-five-levels")
        self.assertEqual(len(guide["items"]), 5)
        labels = [item["label"] for item in guide["items"]]
        self.assertTrue(labels[0].startswith("1 · Kind/Jugendlicher"))
        self.assertTrue(labels[-1].startswith("5 · Institutioneller Kontext"))
        gap_ids = {gap["id"] for gap in self.model["documented_gaps"]}
        self.assertNotIn("gap-five-levels", gap_ids)

    def test_ai_rules_are_explicit_and_not_a_gap(self):
        formal = {item["id"]: item for item in self.model["formal_requirements"]}
        for requirement_id in ("formal-ai-source", "formal-ai-independent", "formal-ai-disclosure", "formal-ai-verification"):
            self.assertIn(requirement_id, formal)
        guide = next(item for item in self.model["instructional_guidance"] if item["id"] == "guide-ai-policy")
        self.assertEqual(guide["kind_label"], "Schulische Richtlinie")
        self.assertTrue(any("Kolloquium" in item.get("text", "") for item in guide["items"]))
        citation = next(item for item in self.model["instructional_guidance"] if item["id"] == "guide-citation")
        self.assertTrue(any("(vgl. Leitz: 2015, S. 74)" in item.get("text", "") for item in citation["items"]))
        self.assertTrue(any("(Leitz: 2015, S. 74)" in item.get("text", "") for item in citation["items"]))
        gap_ids = {gap["id"] for gap in self.model["documented_gaps"]}
        self.assertNotIn("gap-scientific-ai", gap_ids)

    def test_deadline_is_separate_planning_context(self):
        deadline = self.model["planning_context"]["submission_deadline"]
        self.assertEqual(deadline["date"], "2026-11-13")
        self.assertEqual(deadline["origin"], "user_provided")
        self.assertIn("nicht", deadline["note"].lower())
        self.assertIn("pdf", deadline["note"].lower())

    def test_requirement_ids_are_unique_and_questions_resolve(self):
        ids = []
        ids.extend(item["id"] for item in self.model["formal_requirements"])
        for section in self.model["facharbeit"]["sections"]:
            ids.extend(item["id"] for item in section["requirements"])
        ids.extend(item["id"] for item in self.model["facharbeit"]["writing_deduction"]["requirements"])
        ids.extend(item["id"] for item in self.model["kolloquium"]["format"])
        for section in self.model["kolloquium"]["sections"]:
            ids.extend(item["id"] for item in section["requirements"])
        ids.extend(item["id"] for item in self.model["kolloquium"]["presentation_deduction"]["requirements"])
        self.assertEqual(len(ids), len(set(ids)))

        known = set(ids)
        question_ids = []
        for question in self.model["derived_guidance"]["questions"]:
            question_ids.append(question["id"])
            self.assertEqual(question["origin"], "derived_guidance")
            self.assertTrue(question["maps_to"])
            self.assertTrue(set(question["maps_to"]).issubset(known), question["id"])
        self.assertEqual(len(question_ids), len(set(question_ids)))

        guidance_ids = [item["id"] for item in self.model["instructional_guidance"]]
        self.assertEqual(len(guidance_ids), len(set(guidance_ids)))

    def test_all_source_references_point_to_valid_pages(self):
        sources = {source["id"]: source for source in self.model["sources"]}

        def visit(value):
            if isinstance(value, dict):
                if {"source_id", "page"}.issubset(value):
                    self.assertIn(value["source_id"], sources)
                    source = sources[value["source_id"]]
                    self.assertGreaterEqual(value["page"], 1)
                    self.assertLessEqual(value["page"], source["pages"])
                for child in value.values():
                    visit(child)
            elif isinstance(value, list):
                for child in value:
                    visit(child)

        visit(self.model)

    def test_remaining_gaps_are_explicit(self):
        gap_ids = {gap["id"] for gap in self.model["documented_gaps"]}
        self.assertEqual(
            gap_ids,
            {"gap-literature-quality", "gap-page-scope", "gap-outline-examples", "gap-deadline-source"},
        )


if __name__ == "__main__":
    unittest.main()

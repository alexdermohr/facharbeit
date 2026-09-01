import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class UiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.js = (ROOT / "app.js").read_text(encoding="utf-8")
        cls.css = (ROOT / "styles.css").read_text(encoding="utf-8")

    def test_workflow_first_surface_exists(self):
        self.assertIn('id="workbench-title"', self.html)
        self.assertIn('id="currentStepLabel"', self.html)
        self.assertLess(self.html.index('id="workbench-title"'), self.html.index('id="sources"'))
        self.assertLess(self.html.index('id="workflow"'), self.html.index('id="outlineSection"'))

    def test_mode_switch_uses_button_semantics(self):
        self.assertIn('role="group" aria-label="Prüfungsbereich wählen"', self.html)
        self.assertIn('aria-pressed="true" data-mode="facharbeit"', self.html)
        self.assertNotIn('role="tab"', self.html)
        self.assertIn('setAttribute("aria-pressed"', self.js)

    def test_question_progress_is_explicit_not_length_heuristic(self):
        self.assertIn("answerStatus", self.js)
        self.assertIn('value === "draft" || value === "checked"', self.js)
        self.assertIn("Als selbst geprüft markieren", self.js)
        self.assertNotIn("trim().length >= 20", self.js)

    def test_facharbeit_only_topic_tool_is_scoped_to_start(self):
        self.assertIn('section.hidden = state.mode !== "facharbeit" || state.activePhase !== "start";', self.js)

    def test_backup_roundtrip_controls_exist(self):
        for element_id in ("exportButton", "markdownButton", "importButton", "importInput", "resetButton"):
            self.assertIn(f'id="{element_id}"', self.html)
        self.assertIn("importBackup", self.js)
        self.assertIn("facharbeit-workspace-backup", self.js)

    def test_step_navigation_has_previous_next_and_weights(self):
        self.assertIn('id="previousStepButton"', self.html)
        self.assertIn('id="nextStepButton"', self.html)
        self.assertIn("phaseWeightLabel", self.js)
        self.assertIn('aria-current="step"', self.js)

    def test_accessibility_status_and_focus_contract(self):
        self.assertIn('id="uiStatus"', self.html)
        self.assertIn('aria-live="polite"', self.html)
        self.assertIn('id="stage-title" tabindex="-1"', self.js)
        self.assertIn(":focus-visible", self.css)
        self.assertNotIn('class="stage-content" aria-live=', self.html)

    def test_mobile_step_navigation_does_not_require_horizontal_scroll(self):
        self.assertIn("@media (max-width: 620px)", self.css)
        self.assertIn(".step-nav { grid-template-columns: repeat(2, minmax(0, 1fr));", self.css)
        self.assertNotIn("overflow-x: auto", self.css)


if __name__ == "__main__":
    unittest.main()

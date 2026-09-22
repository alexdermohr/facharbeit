const test = require("node:test");
const assert = require("node:assert/strict");

const { BACKUP_SCHEMA, STATE_VERSION, extractBackupState, normalizeState } = require("../app.js");

function currentState() {
  return {
    version: STATE_VERSION,
    mode: "facharbeit",
    activePhase: "start",
    specialization: "heilpaedagogik",
    topic: "Bindung im pädagogischen Alltag",
    answers: { q1: "Ein belastbarer Entwurf" },
    answerStatus: { q1: "draft" },
    checks: { r1: true },
  };
}

test("current schema backup is accepted", () => {
  const state = currentState();
  const payload = {
    schema: BACKUP_SCHEMA,
    version: STATE_VERSION,
    exported_at: "2026-09-01T17:00:00Z",
    source_model: "Facharbeit",
    state,
  };

  assert.deepEqual(extractBackupState(payload), state);
});

test("version 2 backups are accepted and consolidated safely", () => {
  const state = {
    version: 2,
    mode: "facharbeit",
    activePhase: "verstehen-analysieren",
    specialization: "heilpaedagogik",
    topic: "Ein alter Arbeitsstand",
    answers: {},
    answerStatus: {},
    checks: {
      "formal-ai-source": true,
      "formal-ai-independent": true,
      "formal-ai-disclosure": true,
      "formal-ai-verification": true,
      "fa-va-five-levels": true,
      "fa-va-three-levels": true,
      "fa-va-level-choice": true,
    },
  };
  const payload = {
    schema: BACKUP_SCHEMA,
    version: 2,
    exported_at: "2026-09-02T08:00:00Z",
    source_model: "Facharbeit",
    state,
  };

  const extracted = extractBackupState(payload);
  assert.equal(extracted.version, 2);

  const migrated = normalizeState(extracted);
  assert.equal(migrated.version, STATE_VERSION);
  assert.equal(migrated.checks["formal-ai-use"], true);
  assert.equal(migrated.checks["fa-va-five-levels"], true);
  assert.equal(migrated.checks["formal-ai-source"], undefined);
  assert.equal(migrated.checks["fa-va-three-levels"], undefined);
});

test("partial legacy checks do not become completed consolidated requirements", () => {
  const migrated = normalizeState({
    version: 2,
    mode: "facharbeit",
    activePhase: "verstehen-analysieren",
    specialization: "heilpaedagogik",
    topic: "",
    answers: {},
    answerStatus: {},
    checks: {
      "formal-ai-source": true,
      "fa-va-five-levels": true,
    },
  });

  assert.equal(migrated.checks["formal-ai-use"], undefined);
  assert.equal(migrated.checks["fa-va-five-levels"], undefined);
});

test("legacy exported workspace is explicitly accepted", () => {
  const payload = {
    exported_at: "2026-08-31T17:00:00Z",
    source_model: "Facharbeit",
    planning_context: {},
    mode: "facharbeit",
    topic: "Bindung",
    answers: { q1: "Alter Export" },
    checks: { r1: true },
    note: "legacy",
  };

  assert.deepEqual(extractBackupState(payload), payload);
});

test("arrays and unrelated objects are rejected before confirmation", () => {
  assert.throws(() => extractBackupState([]), /gültiges Backup-Objekt/);
  assert.throws(() => extractBackupState({ foo: "bar" }), /unterstützter Facharbeits-Arbeitsstand/);
  assert.throws(() => extractBackupState({ state: currentState() }), /unterstützter Facharbeits-Arbeitsstand/);
});

test("invalid specialization is rejected", () => {
  const state = currentState();
  state.specialization = "invented";
  assert.throws(
    () => extractBackupState({ schema: BACKUP_SCHEMA, version: STATE_VERSION, state }),
    /keinen gültigen Arbeitsstand/,
  );
});

test("schema backup rejects mismatched payload and state versions", () => {
  const state = currentState();
  state.version = 2;
  assert.throws(
    () => extractBackupState({ schema: BACKUP_SCHEMA, version: STATE_VERSION, state }),
    /passen nicht zusammen/,
  );
});

test("wrong schemas and unsupported versions are rejected", () => {
  assert.throws(
    () => extractBackupState({ schema: "other-app", version: STATE_VERSION, state: currentState() }),
    /Unbekanntes Backup-Schema/,
  );
  assert.throws(
    () => extractBackupState({ schema: BACKUP_SCHEMA, version: STATE_VERSION + 1, state: currentState() }),
    /Nicht unterstützte Backup-Version/,
  );
});

test("current schema requires the expected state fields", () => {
  assert.throws(
    () => extractBackupState({ schema: BACKUP_SCHEMA, version: STATE_VERSION, state: { version: STATE_VERSION, mode: "facharbeit" } }),
    /keinen gültigen Arbeitsstand/,
  );
});

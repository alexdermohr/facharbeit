const test = require("node:test");
const assert = require("node:assert/strict");

const { BACKUP_SCHEMA, STATE_VERSION, extractBackupState } = require("../app.js");

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
    () => extractBackupState({ schema: BACKUP_SCHEMA, version: STATE_VERSION, state: { mode: "facharbeit" } }),
    /keinen gültigen Arbeitsstand/,
  );
});

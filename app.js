const STORAGE_KEY = "facharbeit-pt3-guide-v1";
const DATA_URL = "data/requirements.json";
const STATE_VERSION = 2;
const BACKUP_SCHEMA = "facharbeit-workspace-backup";

const phaseTitles = {
  start: "Start & Formalia",
  einleitung: "Einleitung",
  "wahrnehmen-erleben": "Wahrnehmen & Erleben",
  "verstehen-analysieren": "Verstehen & Analysieren",
  "entscheiden-planen": "Entscheiden & Planen",
  schreibkompetenz: "Schreibkompetenz & Abgabe",
  "umsetzen-interagieren": "Umsetzen & Interagieren",
  "hypothesen-ziele": "Hypothesen & Ziele prüfen",
  "konsequenzen-transfer": "Konsequenzen & Transfer",
  "praesentation-gespraech": "Präsentation & Fachgespräch",
};

const modePhases = {
  facharbeit: [
    "start",
    "einleitung",
    "wahrnehmen-erleben",
    "verstehen-analysieren",
    "entscheiden-planen",
    "schreibkompetenz",
  ],
  kolloquium: [
    "umsetzen-interagieren",
    "hypothesen-ziele",
    "konsequenzen-transfer",
    "praesentation-gespraech",
  ],
};

let model;
let state = createEmptyState();

function createEmptyState() {
  return {
    version: STATE_VERSION,
    mode: "facharbeit",
    activePhase: "start",
    topic: "",
    answers: {},
    answerStatus: {},
    checks: {},
  };
}

function isObjectRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeObject(value) {
  return isObjectRecord(value) ? value : {};
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isImportableState(value, { requireVersion = false, requireActivePhase = false } = {}) {
  if (!isObjectRecord(value)) return false;
  if (!modePhases[value.mode]) return false;
  if (typeof value.topic !== "string") return false;
  if (!isObjectRecord(value.answers) || !isObjectRecord(value.checks)) return false;
  if (requireVersion && value.version !== STATE_VERSION) return false;
  if (requireActivePhase && !modePhases[value.mode].includes(value.activePhase)) return false;
  if (value.answerStatus !== undefined && !isObjectRecord(value.answerStatus)) return false;
  return true;
}

function isLegacyBackupPayload(payload) {
  return (
    isObjectRecord(payload) &&
    !hasOwn(payload, "schema") &&
    !hasOwn(payload, "state") &&
    typeof payload.exported_at === "string" &&
    typeof payload.source_model === "string" &&
    isImportableState(payload)
  );
}

function extractBackupState(payload) {
  if (!isObjectRecord(payload)) {
    throw new Error("Kein gültiges Backup-Objekt gefunden.");
  }

  if (hasOwn(payload, "schema")) {
    if (payload.schema !== BACKUP_SCHEMA) {
      throw new Error("Unbekanntes Backup-Schema.");
    }
    if (payload.version !== STATE_VERSION) {
      throw new Error("Nicht unterstützte Backup-Version.");
    }
    if (!isImportableState(payload.state, { requireVersion: true, requireActivePhase: true })) {
      throw new Error("Das Backup enthält keinen gültigen Arbeitsstand.");
    }
    return payload.state;
  }

  if (isLegacyBackupPayload(payload)) return payload;
  throw new Error("Kein unterstützter Facharbeits-Arbeitsstand gefunden.");
}

function normalizeState(candidate = {}) {
  const next = createEmptyState();
  const source = safeObject(candidate);
  next.mode = modePhases[source.mode] ? source.mode : next.mode;
  next.activePhase = modePhases[next.mode].includes(source.activePhase) ? source.activePhase : modePhases[next.mode][0];
  next.topic = typeof source.topic === "string" ? source.topic.slice(0, 260) : "";

  for (const [id, value] of Object.entries(safeObject(source.answers))) {
    if (typeof value === "string") next.answers[id] = value;
  }
  for (const [id, value] of Object.entries(safeObject(source.checks))) {
    if (value === true) next.checks[id] = true;
  }
  for (const [id, value] of Object.entries(safeObject(source.answerStatus))) {
    if (value === "draft" || value === "checked") next.answerStatus[id] = value;
  }

  // Frühere Versionen kannten nur eine 20-Zeichen-Heuristik. Bestehende Texte
  // werden deshalb bewusst als Entwurf statt automatisch als "geprüft" migriert.
  if (!source.answerStatus) {
    for (const [id, value] of Object.entries(next.answers)) {
      if (value.trim()) next.answerStatus[id] = "draft";
    }
  }
  return next;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    state = normalizeState(JSON.parse(raw));
  } catch (error) {
    console.warn("Lokaler Stand konnte nicht gelesen werden.", error);
  }
}

function saveState() {
  try {
    state.version = STATE_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Lokaler Stand konnte nicht gespeichert werden.", error);
  }
}

function announce(message) {
  const status = document.querySelector("#uiStatus");
  status.textContent = "";
  window.setTimeout(() => {
    status.textContent = message;
  }, 20);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function refsHtml(refs = []) {
  return refs
    .map((item) => {
      const source = model.sources.find((candidate) => candidate.id === item.source_id);
      if (!source) return "";
      const href = `${source.file}#page=${item.page}`;
      return `<a class="ref-link" href="${href}" target="_blank" rel="noopener">${escapeHtml(source.title)}, S. ${item.page}</a>`;
    })
    .join("");
}

function allRequirementsByPhase() {
  const map = Object.fromEntries(Object.keys(phaseTitles).map((phase) => [phase, []]));
  map.start.push(...model.formal_requirements);

  for (const section of model.facharbeit.sections) {
    map[section.id].push(...section.requirements);
  }
  map.schreibkompetenz.push(...model.facharbeit.writing_deduction.requirements);

  for (const section of model.kolloquium.sections) {
    map[section.id].push(...section.requirements);
  }
  map["praesentation-gespraech"].push(...model.kolloquium.presentation_deduction.requirements);
  return map;
}

function sectionForPhase(phase) {
  return (
    model.facharbeit.sections.find((item) => item.id === phase) ||
    model.kolloquium.sections.find((item) => item.id === phase) ||
    (phase === "schreibkompetenz" ? model.facharbeit.writing_deduction : null) ||
    (phase === "praesentation-gespraech" ? model.kolloquium.presentation_deduction : null)
  );
}

function stageDescription(phase) {
  if (phase === "start") {
    return "Prüfe formale Vorgaben, verbindliche Gliederung, Literatur, Zitation und KI-Dokumentation, bevor du tief in den Text gehst.";
  }
  const section = sectionForPhase(phase);
  return section?.expectation || "Bearbeite die belegten Kriterien mit den zugeordneten Leitfragen.";
}

function phaseWeightLabel(phase) {
  const section = sectionForPhase(phase);
  if (section?.weight_percent) return `${section.weight_percent} %`;
  if (phase === "schreibkompetenz") return `bis −${model.facharbeit.writing_deduction.deduction_max_percent} %`;
  if (phase === "praesentation-gespraech") return `bis −${model.kolloquium.presentation_deduction.deduction_max_percent} %`;
  if (phase === "start") return "Formalia";
  return "ohne Einzelgewicht";
}

function questionStatus(questionId) {
  const answer = (state.answers[questionId] || "").trim();
  if (!answer) return "open";
  return state.answerStatus[questionId] === "checked" ? "checked" : "draft";
}

function questionStatusLabel(status) {
  if (status === "checked") return "Selbst geprüft";
  if (status === "draft") return "Entwurf";
  return "Offen";
}

function renderExamSplit() {
  const split = model.exam.grade_split_percent;
  document.querySelector("#examSplit").innerHTML = `
    <article class="split-card ${state.mode === "facharbeit" ? "active" : ""}">
      <span>Facharbeit</span>
      <strong>${split.facharbeit} %</strong>
      <small>schriftlicher Anteil an PT 3</small>
    </article>
    <article class="split-card ${state.mode === "kolloquium" ? "active" : ""}">
      <span>Kolloquium</span>
      <strong>${split.kolloquium} %</strong>
      <small>mündlicher Anteil an PT 3</small>
    </article>
  `;
}

function renderDeadline() {
  const deadline = model.planning_context?.submission_deadline;
  const value = document.querySelector("#deadlineValue");
  const note = document.querySelector("#deadlineNote");
  if (!deadline) {
    value.textContent = "nicht hinterlegt";
    note.textContent = "Kein Planungsdatum im Modell.";
    return;
  }

  value.textContent = deadline.display;
  const now = new Date();
  const [year, month, day] = deadline.date.split("-").map(Number);
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dueUtc = Date.UTC(year, month - 1, day);
  const days = Math.round((dueUtc - todayUtc) / 86400000);
  const timeText = days > 1 ? `Noch ${days} Kalendertage.` : days === 1 ? "Noch 1 Kalendertag." : days === 0 ? "Abgabe heute." : `Termin seit ${Math.abs(days)} Tagen überschritten.`;
  note.textContent = `${timeText} ${deadline.note}`;
}

function renderModeSummary() {
  const box = document.querySelector("#modeSummary");
  if (state.mode === "facharbeit") {
    const pills = model.facharbeit.sections
      .filter((section) => section.weight_percent)
      .map((section) => `<span class="pill">${escapeHtml(section.title)}: ${section.weight_percent} %</span>`)
      .join("");
    box.innerHTML = `
      <p><strong>Schriftlicher Teil:</strong> ${escapeHtml(model.facharbeit.competence)}</p>
      <div class="weight-list">${pills}<span class="pill deduction">Schreibkompetenz: bis −${model.facharbeit.writing_deduction.deduction_max_percent} %</span></div>
    `;
  } else {
    const pills = model.kolloquium.sections
      .map((section) => `<span class="pill">${escapeHtml(section.title)}: ${section.weight_percent} %</span>`)
      .join("");
    const format = Object.fromEntries(model.kolloquium.format.map((item) => [item.id, item.value]));
    box.innerHTML = `
      <p><strong>Mündlicher Teil:</strong> ${escapeHtml(model.kolloquium.competence)}</p>
      <div class="format-strip" aria-label="Rahmen des Kolloquiums">
        <span>${escapeHtml(format["kol-duration"] || "")}</span>
        <span>${escapeHtml(format["kol-talk"] || "")}</span>
        <span>${escapeHtml(format["kol-medium"] || "")}</span>
      </div>
      <div class="weight-list">${pills}<span class="pill deduction">Präsentation/Gespräch: bis −${model.kolloquium.presentation_deduction.deduction_max_percent} %</span></div>
    `;
  }
}

function renderModeButtons() {
  document.querySelectorAll(".mode-tab").forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderOutline() {
  const section = document.querySelector("#outlineSection");
  section.hidden = state.mode !== "facharbeit";
  if (section.hidden) return;
  const outline = model.facharbeit.required_outline;
  document.querySelector("#outlineContent").innerHTML = `
    <div class="outline-notice">
      <p><strong>${escapeHtml(outline.note)}</strong></p>
      <p>${escapeHtml(outline.navigation_note)}</p>
      <div class="refs">${refsHtml(outline.refs)}</div>
    </div>
    <div class="outline-list">
      ${outline.items
        .map(
          (item) => `
            <div class="outline-row ${item.number.includes(".") ? "outline-sub" : ""}">
              <span class="outline-number">${escapeHtml(item.number)}</span>
              <span>${escapeHtml(item.title)}</span>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function setActivePhase(phase, { focusStage = false } = {}) {
  if (!modePhases[state.mode].includes(phase)) return;
  state.activePhase = phase;
  saveState();
  renderStepNav();
  renderStage();
  renderTopicTool();
  updateProgress();
  renderCurrentStep();
  if (focusStage) {
    const heading = document.querySelector("#stage-title");
    heading?.focus({ preventScroll: true });
    document.querySelector("#stageContent")?.scrollIntoView({ block: "start", behavior: "smooth" });
    announce(`${phaseTitles[phase]} geöffnet.`);
  }
}

function renderStepNav() {
  const nav = document.querySelector("#stepNav");
  const phases = modePhases[state.mode];
  if (!phases.includes(state.activePhase)) {
    state.activePhase = phases[0];
    saveState();
  }

  nav.innerHTML = phases
    .map((phase, index) => {
      const active = phase === state.activePhase;
      return `
        <button class="step-button ${active ? "active" : ""}" type="button" data-phase="${phase}" ${active ? 'aria-current="step"' : ""}>
          <span class="step-kicker">Schritt ${index + 1}</span>
          <strong>${escapeHtml(phaseTitles[phase])}</strong>
          <span class="step-weight">${escapeHtml(phaseWeightLabel(phase))}</span>
        </button>
      `;
    })
    .join("");

  nav.querySelectorAll(".step-button").forEach((button) => {
    button.addEventListener("click", () => setActivePhase(button.dataset.phase, { focusStage: true }));
  });

  const index = phases.indexOf(state.activePhase);
  const previous = document.querySelector("#previousStepButton");
  const next = document.querySelector("#nextStepButton");
  previous.disabled = index <= 0;
  next.disabled = index >= phases.length - 1;
  previous.dataset.phase = index > 0 ? phases[index - 1] : "";
  next.dataset.phase = index < phases.length - 1 ? phases[index + 1] : "";
  document.querySelector("#stepPosition").textContent = `${index + 1} von ${phases.length}`;
}

function renderRequirements(phase) {
  const requirements = allRequirementsByPhase()[phase] || [];
  if (!requirements.length) return `<div class="empty-state">Keine einzelnen Kriterien hinterlegt.</div>`;
  return `
    <div class="requirement-list">
      ${requirements
        .map((requirement) => {
          const checked = Boolean(state.checks[requirement.id]);
          const text = requirement.text || `${requirement.label}: ${requirement.value}`;
          return `
            <div class="requirement-item ${checked ? "checked" : ""}">
              <input id="check-${escapeHtml(requirement.id)}" type="checkbox" data-requirement="${escapeHtml(requirement.id)}" ${checked ? "checked" : ""}>
              <label for="check-${escapeHtml(requirement.id)}">
                ${escapeHtml(text)}
                <span class="refs">${refsHtml(requirement.refs)}</span>
              </label>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderQuestions(phase) {
  const questions = model.derived_guidance.questions.filter((question) => question.phase === phase);
  if (!questions.length) return `<div class="empty-state">Für diesen Schritt sind noch keine Leitfragen hinterlegt.</div>`;
  return `
    <div class="question-list">
      ${questions
        .map((question, index) => {
          const answer = state.answers[question.id] || "";
          const status = questionStatus(question.id);
          const actionLabel = status === "checked" ? "Prüfung zurücknehmen" : "Als selbst geprüft markieren";
          return `
            <article class="question-card status-${status}" data-question-card="${escapeHtml(question.id)}">
              <div class="question-topline">
                <span class="question-number">Leitfrage ${index + 1}</span>
                <span class="question-status status-${status}">${questionStatusLabel(status)}</span>
              </div>
              <h5>${escapeHtml(question.prompt)}</h5>
              <p>${escapeHtml(question.hint)}</p>
              ${question.refs?.length ? `<div class="refs question-refs">${refsHtml(question.refs)}</div>` : ""}
              <textarea data-question="${escapeHtml(question.id)}" aria-label="Antwort auf: ${escapeHtml(question.prompt)}" placeholder="Gedanken, Stichpunkte oder Formulierungsentwurf …">${escapeHtml(answer)}</textarea>
              <div class="question-actions">
                <button class="button compact question-check" type="button" data-question-status="${escapeHtml(question.id)}" ${status === "open" ? "disabled" : ""}>${actionLabel}</button>
                <span class="question-status-hint">${status === "checked" ? "Bei einer Änderung wird der Status wieder zum Entwurf." : "Markiere erst nach eigener inhaltlicher Prüfung."}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderGuidance(phase) {
  const cards = (model.instructional_guidance || []).filter((item) => item.phase === phase);
  if (!cards.length) return "";
  return `
    <section class="guidance-panel" aria-labelledby="guidance-heading">
      <div class="guidance-heading">
        <p class="eyebrow">Zusätzliche schulische Hilfen</p>
        <h4 id="guidance-heading">So konkretisieren die Dokumente diesen Schritt</h4>
      </div>
      <div class="guidance-grid">
        ${cards
          .map(
            (card) => `
              <article class="guidance-card ${card.importance === "critical" ? "critical" : ""}">
                <span class="source-badge ${card.importance === "critical" ? "rule" : "help"}">${escapeHtml(card.kind_label)}</span>
                <h5>${escapeHtml(card.title)}</h5>
                <ul>
                  ${card.items
                    .map(
                      (item) => `
                        <li>
                          ${item.label ? `<strong>${escapeHtml(item.label)}:</strong> ` : ""}${escapeHtml(item.text)}
                          <span class="refs">${refsHtml(item.refs)}</span>
                        </li>
                      `,
                    )
                    .join("")}
                </ul>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderStage() {
  const phase = state.activePhase;
  const section = sectionForPhase(phase);
  const good = section?.good_performance
    ? `<div class="good-box"><strong>Orientierung an einer guten Leistung</strong>${escapeHtml(section.good_performance)}</div>`
    : "";

  document.querySelector("#stageContent").innerHTML = `
    <div class="stage-head">
      <div class="stage-label-row">
        <p class="eyebrow">${state.mode === "facharbeit" ? "Facharbeit" : "Kolloquium"}</p>
        <span class="stage-weight">${escapeHtml(phaseWeightLabel(phase))}</span>
      </div>
      <h3 id="stage-title" tabindex="-1">${escapeHtml(phaseTitles[phase])}</h3>
      <p>${escapeHtml(stageDescription(phase))}</p>
    </div>
    <div class="two-column">
      <section class="panel" aria-labelledby="requirements-heading">
        <h4 id="requirements-heading">Belegte Anforderungen</h4>
        ${renderRequirements(phase)}
        ${good}
      </section>
      <section class="panel" aria-labelledby="questions-heading">
        <h4 id="questions-heading">Abgeleitete Leitfragen</h4>
        <p class="panel-intro">Text eingeben erzeugt einen Entwurf. Erst deine bewusste Markierung zählt als selbst geprüft.</p>
        ${renderQuestions(phase)}
      </section>
    </div>
    ${renderGuidance(phase)}
  `;

  document.querySelectorAll("[data-requirement]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      state.checks[checkbox.dataset.requirement] = checkbox.checked;
      if (!checkbox.checked) delete state.checks[checkbox.dataset.requirement];
      saveState();
      renderStage();
      updateProgress();
      announce(checkbox.checked ? "Anforderung als geprüft markiert." : "Prüfmarkierung entfernt.");
    });
  });

  document.querySelectorAll("[data-question]").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      const id = textarea.dataset.question;
      state.answers[id] = textarea.value;
      if (textarea.value.trim()) state.answerStatus[id] = "draft";
      else delete state.answerStatus[id];
      saveState();
      const card = textarea.closest(".question-card");
      const status = questionStatus(id);
      card.className = `question-card status-${status}`;
      card.querySelector(".question-status").className = `question-status status-${status}`;
      card.querySelector(".question-status").textContent = questionStatusLabel(status);
      const button = card.querySelector("[data-question-status]");
      button.disabled = status === "open";
      button.textContent = "Als selbst geprüft markieren";
      card.querySelector(".question-status-hint").textContent = "Markiere erst nach eigener inhaltlicher Prüfung.";
      updateProgress();
    });
  });

  document.querySelectorAll("[data-question-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.questionStatus;
      const current = questionStatus(id);
      if (current === "open") return;
      state.answerStatus[id] = current === "checked" ? "draft" : "checked";
      saveState();
      renderStage();
      updateProgress();
      announce(state.answerStatus[id] === "checked" ? "Leitfrage als selbst geprüft markiert." : "Leitfrage wieder als Entwurf markiert.");
    });
  });
}

function updateProgress() {
  const phases = modePhases[state.mode];
  const visibleQuestions = model.derived_guidance.questions.filter((question) => phases.includes(question.phase));
  const checkedQuestions = visibleQuestions.filter((question) => questionStatus(question.id) === "checked").length;
  const draftQuestions = visibleQuestions.filter((question) => questionStatus(question.id) === "draft").length;

  const requirementMap = allRequirementsByPhase();
  const visibleRequirements = phases.flatMap((phase) => requirementMap[phase] || []);
  const checkedRequirements = visibleRequirements.filter((requirement) => state.checks[requirement.id]).length;

  document.querySelector("#questionProgress").textContent = `${checkedQuestions} / ${visibleQuestions.length}`;
  document.querySelector("#questionProgressNote").textContent = `${draftQuestions} Entwurf${draftQuestions === 1 ? "" : "e"} · ${visibleQuestions.length - checkedQuestions - draftQuestions} offen`;
  document.querySelector("#requirementProgress").textContent = `${checkedRequirements} / ${visibleRequirements.length}`;
  document.querySelector("#requirementProgressNote").textContent = `${visibleRequirements.length - checkedRequirements} noch offen`;
  document.querySelector("#questionProgressBar").style.width = `${visibleQuestions.length ? (checkedQuestions / visibleQuestions.length) * 100 : 0}%`;
  document.querySelector("#requirementProgressBar").style.width = `${visibleRequirements.length ? (checkedRequirements / visibleRequirements.length) * 100 : 0}%`;
}

function renderCurrentStep() {
  const phases = modePhases[state.mode];
  const index = phases.indexOf(state.activePhase);
  document.querySelector("#currentStepLabel").textContent = phaseTitles[state.activePhase];
  document.querySelector("#currentStepMeta").textContent = `Schritt ${index + 1} von ${phases.length} · ${phaseWeightLabel(state.activePhase)}`;
}

function renderTopicTool() {
  const section = document.querySelector("#topicSection");
  section.hidden = state.mode !== "facharbeit" || state.activePhase !== "start";
  const input = document.querySelector("#topicInput");
  input.value = state.topic || "";

  const update = () => {
    state.topic = input.value;
    saveState();
    const count = input.value.length;
    const counter = document.querySelector("#titleCount");
    const feedback = document.querySelector("#titleFeedback");
    counter.textContent = `${count} / 200`;
    counter.classList.toggle("over", count > 200);
    feedback.classList.toggle("error", count > 200);
    feedback.textContent =
      count > 200
        ? `Zu lang: ${count - 200} Zeichen über der dokumentierten Grenze.`
        : `Noch ${200 - count} Zeichen bis zur dokumentierten Höchstgrenze.`;
  };

  input.oninput = update;
  update();
}

function renderGaps() {
  document.querySelector("#gapsList").innerHTML = model.documented_gaps
    .map(
      (gap) => `
        <article class="gap-card">
          <strong>${escapeHtml(gap.title || gap.id.replace("gap-", "").replaceAll("-", " "))}</strong>
          <p>${escapeHtml(gap.text)}</p>
        </article>
      `,
    )
    .join("");
}

function renderTensions() {
  document.querySelector("#tensionsList").innerHTML = (model.documented_tensions || [])
    .map(
      (item) => `
        <article class="gap-card tension-card">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.text)}</p>
          <div class="refs">${refsHtml(item.refs)}</div>
        </article>
      `,
    )
    .join("");
}

function renderSources() {
  document.querySelector("#sourcesList").innerHTML = model.sources
    .map(
      (source) => `
        <article class="source-card">
          <span class="source-badge status-${escapeHtml(source.status)}">${escapeHtml(source.status_label)}</span>
          <a href="${escapeHtml(source.file)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a>
          <p>${escapeHtml(source.role)}</p>
          <p class="source-meta">Stand: ${escapeHtml(source.date)} · ${source.pages} ${source.pages === 1 ? "Seite" : "Seiten"}</p>
          ${source.date_note ? `<p class="source-note">${escapeHtml(source.date_note)}</p>` : ""}
        </article>
      `,
    )
    .join("");
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  const payload = {
    schema: BACKUP_SCHEMA,
    version: STATE_VERSION,
    exported_at: new Date().toISOString(),
    source_model: model.title,
    planning_context: model.planning_context,
    state,
    note: "Lokaler Arbeitsstand; keine schulische Bewertung oder Notenprognose.",
  };
  downloadText(`facharbeit-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
  announce("JSON-Backup exportiert.");
}

function exportMarkdown() {
  const phases = modePhases[state.mode];
  const lines = [
    "# Facharbeit – Arbeitsstand",
    "",
    `Export: ${new Date().toLocaleString("de-DE")}`,
    `Bereich: ${state.mode === "facharbeit" ? "Facharbeit" : "Kolloquium"}`,
    state.topic ? `Arbeitstitel: ${state.topic}` : "Arbeitstitel: –",
    "",
  ];

  for (const phase of phases) {
    lines.push(`## ${phaseTitles[phase]}`, "");
    const requirements = allRequirementsByPhase()[phase] || [];
    if (requirements.length) {
      lines.push("### Anforderungen", "");
      for (const requirement of requirements) {
        const text = requirement.text || `${requirement.label}: ${requirement.value}`;
        lines.push(`- [${state.checks[requirement.id] ? "x" : " "}] ${text}`);
      }
      lines.push("");
    }

    const questions = model.derived_guidance.questions.filter((question) => question.phase === phase);
    if (questions.length) {
      lines.push("### Leitfragen", "");
      for (const question of questions) {
        const status = questionStatusLabel(questionStatus(question.id));
        lines.push(`#### ${question.prompt}`, "", `Status: ${status}`, "", state.answers[question.id] || "_(offen)_", "");
      }
    }
  }

  downloadText(`facharbeit-arbeitsstand-${new Date().toISOString().slice(0, 10)}.md`, lines.join("\n"), "text/markdown;charset=utf-8");
  announce("Markdown-Export erstellt.");
}

async function importBackup(file) {
  try {
    const payload = JSON.parse(await file.text());
    const candidate = extractBackupState(payload);
    const imported = normalizeState(candidate);
    const confirmed = window.confirm("Der Import ersetzt den aktuell lokal gespeicherten Arbeitsstand. Fortfahren?");
    if (!confirmed) return;
    state = imported;
    saveState();
    renderAll();
    announce("Backup importiert und Arbeitsstand wiederhergestellt.");
  } catch (error) {
    console.error(error);
    window.alert("Das Backup konnte nicht importiert werden. Bitte eine von dieser Website exportierte JSON-Datei wählen.");
  } finally {
    document.querySelector("#importInput").value = "";
  }
}

function resetState() {
  const confirmed = window.confirm("Alle lokal gespeicherten Antworten, Statusmarkierungen und Häkchen wirklich löschen?");
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  state = createEmptyState();
  renderAll();
  announce("Lokaler Arbeitsstand gelöscht.");
}

function setMode(mode) {
  if (!modePhases[mode] || mode === state.mode) return;
  state.mode = mode;
  state.activePhase = modePhases[mode][0];
  saveState();
  renderAll();
  announce(`${mode === "facharbeit" ? "Facharbeit" : "Kolloquium"} ausgewählt.`);
}

function wireGlobalActions() {
  document.querySelectorAll(".mode-tab").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  document.querySelector("#previousStepButton").addEventListener("click", (event) => {
    const phase = event.currentTarget.dataset.phase;
    if (phase) setActivePhase(phase, { focusStage: true });
  });
  document.querySelector("#nextStepButton").addEventListener("click", (event) => {
    const phase = event.currentTarget.dataset.phase;
    if (phase) setActivePhase(phase, { focusStage: true });
  });
  document.querySelector("#continueButton").addEventListener("click", () => {
    document.querySelector("#stageContent")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector("#stage-title")?.focus({ preventScroll: true });
  });
  document.querySelector("#exportButton").addEventListener("click", exportBackup);
  document.querySelector("#markdownButton").addEventListener("click", exportMarkdown);
  document.querySelector("#importButton").addEventListener("click", () => document.querySelector("#importInput").click());
  document.querySelector("#importInput").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) importBackup(file);
  });
  document.querySelector("#resetButton").addEventListener("click", resetState);
}

function renderAll() {
  renderExamSplit();
  renderDeadline();
  renderModeButtons();
  renderModeSummary();
  renderStepNav();
  renderTopicTool();
  renderStage();
  renderCurrentStep();
  renderOutline();
  renderGaps();
  renderTensions();
  renderSources();
  updateProgress();
}

async function init() {
  loadState();
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Anforderungsmodell konnte nicht geladen werden (${response.status}).`);
  model = await response.json();
  wireGlobalActions();
  renderAll();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { BACKUP_SCHEMA, STATE_VERSION, extractBackupState, isLegacyBackupPayload, normalizeState };
}

if (typeof document !== "undefined") {
  init().catch((error) => {
    console.error(error);
    document.querySelector("#stageContent").innerHTML = `
      <div class="notice">
        <div>
          <h2>Die Daten konnten nicht geladen werden.</h2>
          <p>Starte die Website über einen lokalen Webserver oder öffne die veröffentlichte GitHub-Pages-Version.</p>
        </div>
      </div>
    `;
  });
}

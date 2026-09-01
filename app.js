const STORAGE_KEY = "facharbeit-pt3-guide-v1";
const DATA_URL = "data/requirements.json";

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
let state = {
  mode: "facharbeit",
  activePhase: "start",
  topic: "",
  answers: {},
  checks: {},
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state = {
      ...state,
      ...saved,
      answers: saved.answers || {},
      checks: saved.checks || {},
    };
  } catch (error) {
    console.warn("Lokaler Stand konnte nicht gelesen werden.", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function refsHtml(refs = []) {
  return refs
    .map((item) => {
      const source = model.sources.find((candidate) => candidate.id === item.source_id);
      if (!source) return "";
      const href = `${source.file}#page=${item.page}`;
      return `<a class="ref-link" href="${href}" target="_blank" rel="noopener">${source.title}, S. ${item.page}</a>`;
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
    return "Prüfe die formalen Mindestvorgaben und kläre Titel, Literatur und Hilfsmittel, bevor du tief in den Text gehst.";
  }
  const section = sectionForPhase(phase);
  return section?.expectation || "Bearbeite die belegten Kriterien mit den zugeordneten Leitfragen.";
}

function renderModeSummary() {
  const box = document.querySelector("#modeSummary");
  if (state.mode === "facharbeit") {
    const pills = model.facharbeit.sections
      .filter((section) => section.weight_percent)
      .map((section) => `<span class="pill">${section.title}: ${section.weight_percent} %</span>`)
      .join("");
    box.innerHTML = `
      <p><strong>Schriftlicher Teil:</strong> ${model.facharbeit.competence}</p>
      <div class="weight-list">${pills}<span class="pill deduction">Schreibkompetenz: bis −${model.facharbeit.writing_deduction.deduction_max_percent} %</span></div>
    `;
  } else {
    const pills = model.kolloquium.sections
      .map((section) => `<span class="pill">${section.title}: ${section.weight_percent} %</span>`)
      .join("");
    box.innerHTML = `
      <p><strong>Mündlicher Teil:</strong> ${model.kolloquium.competence}</p>
      <div class="weight-list">${pills}<span class="pill deduction">Präsentation/Gespräch: bis −${model.kolloquium.presentation_deduction.deduction_max_percent} %</span></div>
    `;
  }
}

function renderModeTabs() {
  document.querySelectorAll(".mode-tab").forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
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
        <button class="step-button ${active ? "active" : ""}" type="button" data-phase="${phase}">
          <span>Schritt ${index + 1}</span>
          <strong>${phaseTitles[phase]}</strong>
        </button>
      `;
    })
    .join("");

  nav.querySelectorAll(".step-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activePhase = button.dataset.phase;
      saveState();
      renderStepNav();
      renderStage();
    });
  });
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
              <input id="check-${requirement.id}" type="checkbox" data-requirement="${requirement.id}" ${checked ? "checked" : ""}>
              <label for="check-${requirement.id}">
                ${text}
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
          const answered = answer.trim().length >= 20;
          return `
            <article class="question-card ${answered ? "answered" : ""}" data-question-card="${question.id}">
              <span class="question-number">Leitfrage ${index + 1}</span>
              <h5>${question.prompt}</h5>
              <p>${question.hint}</p>
              <textarea data-question="${question.id}" aria-label="Antwort auf: ${question.prompt.replaceAll('"', "&quot;")}" placeholder="Gedanken, Stichpunkte oder Formulierungsentwurf …">${answer}</textarea>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStage() {
  const phase = state.activePhase;
  const section = sectionForPhase(phase);
  const good = section?.good_performance
    ? `<div class="good-box"><strong>Orientierung an einer guten Leistung</strong>${section.good_performance}</div>`
    : "";

  document.querySelector("#stageContent").innerHTML = `
    <div class="stage-head">
      <p class="eyebrow">${state.mode === "facharbeit" ? "Facharbeit" : "Kolloquium"}</p>
      <h3>${phaseTitles[phase]}</h3>
      <p>${stageDescription(phase)}</p>
    </div>
    <div class="two-column">
      <section class="panel" aria-labelledby="requirements-heading">
        <h4 id="requirements-heading">Belegte Anforderungen</h4>
        ${renderRequirements(phase)}
        ${good}
      </section>
      <section class="panel" aria-labelledby="questions-heading">
        <h4 id="questions-heading">Abgeleitete Leitfragen</h4>
        ${renderQuestions(phase)}
      </section>
    </div>
  `;

  document.querySelectorAll("[data-requirement]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      state.checks[checkbox.dataset.requirement] = checkbox.checked;
      saveState();
      renderStage();
      updateProgress();
    });
  });

  document.querySelectorAll("[data-question]").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      state.answers[textarea.dataset.question] = textarea.value;
      saveState();
      textarea.closest(".question-card").classList.toggle("answered", textarea.value.trim().length >= 20);
      updateProgress();
    });
  });
}

function updateProgress() {
  const phases = modePhases[state.mode];
  const visibleQuestions = model.derived_guidance.questions.filter((question) => phases.includes(question.phase));
  const answered = visibleQuestions.filter((question) => (state.answers[question.id] || "").trim().length >= 20).length;

  const requirementMap = allRequirementsByPhase();
  const visibleRequirements = phases.flatMap((phase) => requirementMap[phase] || []);
  const checked = visibleRequirements.filter((requirement) => state.checks[requirement.id]).length;

  document.querySelector("#questionProgress").textContent = `${answered} / ${visibleQuestions.length}`;
  document.querySelector("#requirementProgress").textContent = `${checked} / ${visibleRequirements.length}`;
  document.querySelector("#questionProgressBar").style.width = `${visibleQuestions.length ? (answered / visibleQuestions.length) * 100 : 0}%`;
  document.querySelector("#requirementProgressBar").style.width = `${visibleRequirements.length ? (checked / visibleRequirements.length) * 100 : 0}%`;
}

function renderTopicTool() {
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

  input.addEventListener("input", update);
  update();
}

function renderGaps() {
  document.querySelector("#gapsList").innerHTML = model.documented_gaps
    .map(
      (gap) => `
        <article class="gap-card">
          <strong>${gap.id.replace("gap-", "").replaceAll("-", " ")}</strong>
          <p>${gap.text}</p>
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
          <a href="${source.file}" target="_blank" rel="noopener">${source.title}</a>
          <p>${source.role}</p>
          <p class="source-meta">Stand: ${source.date} · ${source.pages} Seiten</p>
        </article>
      `,
    )
    .join("");
}

function exportAnswers() {
  const payload = {
    exported_at: new Date().toISOString(),
    source_model: model.title,
    mode: state.mode,
    topic: state.topic,
    answers: state.answers,
    checks: state.checks,
    note: "Lokaler Arbeitsstand; keine schulische Bewertung oder Notenprognose.",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `facharbeit-arbeitsstand-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resetState() {
  const confirmed = window.confirm("Alle lokal gespeicherten Antworten und Häkchen wirklich löschen?");
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  state = { mode: "facharbeit", activePhase: "start", topic: "", answers: {}, checks: {} };
  renderAll();
}

function wireGlobalActions() {
  document.querySelectorAll(".mode-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      state.activePhase = modePhases[state.mode][0];
      saveState();
      renderAll();
    });
  });
  document.querySelector("#exportButton").addEventListener("click", exportAnswers);
  document.querySelector("#resetButton").addEventListener("click", resetState);
}

function renderAll() {
  renderModeTabs();
  renderModeSummary();
  renderStepNav();
  renderStage();
  renderTopicTool();
  renderGaps();
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

const CLARITY_STATUS_IDLE = "Arbeitsstand wird lokal im Browser gespeichert.";
let claritySaveTimer;

const clarityPhaseBoundaries = {
  start: {
    focus: "Formale Rahmenbedingungen, Gliederung, Literatur, Zitation und KI-Dokumentation klären.",
    notYet: "Noch nicht: den fachlichen Haupttext ausformulieren, bevor die Grundlagen geklärt sind.",
  },
  einleitung: {
    focus: "Die Ausgangslage fokussiert auswählen und den persönlichen sowie beruflichen Bezug begründen.",
    notYet: "Noch nicht: die Situation fachtheoretisch analysieren oder die Arbeitshypothese vorwegnehmen.",
  },
  "wahrnehmen-erleben": {
    focus: "Beobachtbares Geschehen, Kontext und Wechselwirkungen so präzise beschreiben, dass eine spätere Analyse möglich wird.",
    notYet: "Noch nicht: Ursachen erklären oder Vermutungen als beobachtete Tatsachen darstellen.",
  },
  "verstehen-analysieren": {
    focus: "Bedürfnisse und Ressourcen, mindestens drei begründet gewählte Ebenen, passende Fachliteratur und die Arbeitshypothese miteinander verbinden.",
    notYet: "Noch nicht: Planungsschritte festlegen, bevor die Analyse den pädagogischen Fokus trägt.",
  },
  "entscheiden-planen": {
    focus: "Aus der Arbeitshypothese ein beeinflussbares Ziel sowie einen begründeten, ressourcenorientierten und anpassbaren Plan ableiten.",
    notYet: "Noch nicht: die spätere Umsetzung so beschreiben, als wäre sie bereits erfolgt.",
  },
  schreibkompetenz: {
    focus: "Roten Faden, Sprache, Zitation, Formatierung, Eigenständigkeit und Abgabevorgaben abschließend prüfen.",
    notYet: "Noch nicht: neue fachliche Argumentationsstränge eröffnen, die vorher nicht hergeleitet wurden.",
  },
  "umsetzen-interagieren": {
    focus: "Sinnvolle Situationen aus der tatsächlichen Umsetzung rekonstruieren und mit Ausgangslage sowie Planung verknüpfen.",
    notYet: "Noch nicht: vorschnell bewerten, bevor Ablauf, Beteiligte, Dynamiken und Wechselwirkungen nachvollziehbar sind.",
  },
  "hypothesen-ziele": {
    focus: "Abweichungen zwischen Planung und Realität erkennen und die Tragfähigkeit von Ziel und Arbeitshypothese kritisch prüfen.",
    notYet: "Noch nicht: nur Erfolg oder Misserfolg behaupten, ohne förderliche und hinderliche Faktoren zu analysieren.",
  },
  "konsequenzen-transfer": {
    focus: "Begründete Handlungsalternativen, fachliche Konsequenzen, Wertebezug und Transfer aus den Ergebnissen ableiten.",
    notYet: "Noch nicht: allgemein bleiben; Konsequenzen müssen auf konkrete Erkenntnisse aus dem Prozess zurückgehen.",
  },
  "praesentation-gespraech": {
    focus: "Den roten Faden klar und weitgehend frei präsentieren, das Medium gezielt nutzen und im Fachgespräch dialogfähig bleiben.",
    notYet: "Noch nicht: den Vortrag als abgelesenen Ersatz für die fachliche Auseinandersetzung behandeln.",
  },
};

const clarityBaseQuestionStatusLabel = questionStatusLabel;
questionStatusLabel = function clarityQuestionStatusLabel(status) {
  if (status === "checked") return "Für mich geklärt";
  return clarityBaseQuestionStatusLabel(status);
};

const clarityBasePhaseWeightLabel = phaseWeightLabel;
phaseWeightLabel = function clarityPhaseWeightLabel(phase) {
  const label = clarityBasePhaseWeightLabel(phase);
  return label === "ohne Einzelgewicht" ? "kein separates Prozentgewicht" : label;
};

const clarityBaseAnnounce = announce;
announce = function clarityAnnounce(message) {
  const clearer = String(message)
    .replace("Anforderung als geprüft markiert.", "Anforderung als von dir abgeglichen markiert.")
    .replace("Prüfmarkierung entfernt.", "Abgleich-Markierung entfernt.")
    .replace("Leitfrage als selbst geprüft markiert.", "Leitfrage als für dich geklärt markiert.")
    .replace("Leitfrage wieder als Entwurf markiert.", "Leitfrage wieder als Entwurf markiert.");
  clarityBaseAnnounce(clearer);
};

const clarityBaseSaveState = saveState;
saveState = function claritySaveState() {
  clarityBaseSaveState();
  clarityPulseSaveStatus();
};

function clarityRequirementIndex() {
  const index = new Map();
  const add = (requirement) => {
    if (requirement?.id) index.set(requirement.id, requirement);
  };

  (model.formal_requirements || []).forEach(add);
  (model.facharbeit?.sections || []).forEach((section) => (section.requirements || []).forEach(add));
  (model.facharbeit?.writing_deduction?.requirements || []).forEach(add);
  (model.kolloquium?.sections || []).forEach((section) => (section.requirements || []).forEach(add));
  (model.kolloquium?.presentation_deduction?.requirements || []).forEach(add);
  return index;
}

function clarityRequirementText(requirement) {
  const raw = requirement?.text || (requirement?.label ? `${requirement.label}: ${requirement.value || ""}` : "Anforderung");
  const compact = raw.replace(/\s+/g, " ").trim();
  return compact.length > 94 ? `${compact.slice(0, 91).trimEnd()}…` : compact;
}

function clarityQuestionMaps(question) {
  const index = clarityRequirementIndex();
  return (question.maps_to || []).map((id) => index.get(id)).filter(Boolean);
}

function clarityOutlineItemsForPhase(phase) {
  if (state.mode !== "facharbeit" || phase === "start" || phase === "schreibkompetenz") return [];
  const specialization = specializationConfig();
  const outline = specialization?.required_outline || model.facharbeit?.required_outline;
  const items = (outline?.items || []).filter((item) => item.phase === phase);
  const subitems = items.filter((item) => item.number && item.number.includes("."));
  return subitems.length ? subitems : items;
}

function clarityOutlineLabel(item) {
  const number = item.number ? `${item.number} ` : "";
  return `${number}${item.title}`.trim();
}

function clarityHighestWeightNote(phase) {
  if (state.mode !== "facharbeit") return "";
  const weighted = (model.facharbeit?.sections || []).filter((section) => Number.isFinite(section.weight_percent));
  const max = Math.max(...weighted.map((section) => section.weight_percent));
  const section = weighted.find((candidate) => candidate.id === phase);
  return section?.weight_percent === max ? '<span class="clarity-priority-badge">größter Bewertungsanteil</span>' : "";
}

function clarityEnhanceStage() {
  const stage = document.querySelector("#stageContent");
  const head = stage?.querySelector(".stage-head");
  if (!head || !model) return;

  const phase = state.activePhase;
  const boundary = clarityPhaseBoundaries[phase];
  const outlineItems = clarityOutlineItemsForPhase(phase);

  head.querySelector(".clarity-stage-context")?.remove();
  const context = document.createElement("div");
  context.className = "clarity-stage-context";
  context.innerHTML = `
    ${outlineItems.length ? `<p class="clarity-outline-position"><strong>Du arbeitest in der Gliederung an:</strong> ${outlineItems.map((item) => `<span>${escapeHtml(clarityOutlineLabel(item))}</span>`).join("<span aria-hidden=\"true\">·</span>")}</p>` : ""}
    ${boundary ? `
      <div class="clarity-boundary" aria-label="Arbeitsorientierung">
        <span class="clarity-boundary-label">Arbeitsorientierung · keine zusätzliche Bewertungsvorgabe</span>
        <p><strong>Hier geht es um:</strong> ${escapeHtml(boundary.focus)}</p>
        <p><strong>${escapeHtml(boundary.notYet.split(":")[0])}:</strong>${escapeHtml(boundary.notYet.slice(boundary.notYet.indexOf(":") + 1))}</p>
      </div>
    ` : ""}
  `;
  head.appendChild(context);

  const labelRow = head.querySelector(".stage-label-row");
  if (labelRow && !labelRow.querySelector(".clarity-priority-badge")) {
    labelRow.insertAdjacentHTML("beforeend", clarityHighestWeightNote(phase));
  }

  clarityEnhanceQuestionCopy();
  clarityAddQuestionMappings();
  clarityEnhanceRequirementHeading();
}

function clarityEnhanceRequirementHeading() {
  const heading = document.querySelector("#requirements-heading");
  if (heading) heading.textContent = "Belegte Anforderungen zum Abgleichen";
  const questionHeading = document.querySelector("#questions-heading");
  if (questionHeading) questionHeading.textContent = "Leitfragen für deinen Arbeitsentwurf";
  const intro = document.querySelector(".panel-intro");
  if (intro) intro.textContent = "Text eingeben erzeugt einen Entwurf. Erst deine bewusste Markierung zählt als für dich geklärt.";
}

function clarityEnhanceQuestionCopy() {
  document.querySelectorAll("[data-question-status]").forEach((button) => {
    const card = button.closest(".question-card");
    const checked = card?.classList.contains("status-checked");
    button.textContent = checked ? "Klärung zurücknehmen" : "Als für mich geklärt markieren";
  });

  document.querySelectorAll(".question-status-hint").forEach((hint) => {
    if (hint.textContent.includes("eigener inhaltlicher Prüfung")) {
      hint.textContent = "Markiere erst, wenn du die Antwort selbst mit den Anforderungen abgeglichen hast.";
    }
  });
}

function clarityAddQuestionMappings() {
  const questions = model.derived_guidance.questions.filter((question) => question.phase === state.activePhase);
  const cards = document.querySelectorAll("[data-question-card]");

  cards.forEach((card, index) => {
    if (card.querySelector(".question-maps")) return;
    const question = questions[index];
    if (!question) return;
    const requirements = clarityQuestionMaps(question);
    if (!requirements.length) return;

    const block = document.createElement("div");
    block.className = "question-maps";
    const shown = requirements.slice(0, 3);
    block.innerHTML = `
      <span class="question-maps-label">Deckt diese belegten Anforderungen ab:</span>
      <div class="question-map-chips">
        ${shown.map((requirement) => `<span class="question-map-chip" title="${escapeHtml(requirement.text || requirement.value || requirement.label || "")}">${escapeHtml(clarityRequirementText(requirement))}</span>`).join("")}
        ${requirements.length > shown.length ? `<span class="question-map-more">+${requirements.length - shown.length} weitere</span>` : ""}
      </div>
    `;

    const refs = card.querySelector(".question-refs");
    const textarea = card.querySelector("textarea");
    card.insertBefore(block, refs || textarea);
  });
}

function clarityEnsureSaveStatus() {
  const heading = document.querySelector(".workbench-heading");
  if (!heading || heading.querySelector("#saveStatus")) return;
  const status = document.createElement("span");
  status.id = "saveStatus";
  status.className = "save-status";
  status.setAttribute("role", "status");
  status.textContent = CLARITY_STATUS_IDLE;
  heading.appendChild(status);
}

function clarityPulseSaveStatus() {
  const status = document.querySelector("#saveStatus");
  if (!status) return;
  status.textContent = "Lokal gespeichert.";
  status.classList.add("saved");
  window.clearTimeout(claritySaveTimer);
  claritySaveTimer = window.setTimeout(() => {
    status.textContent = CLARITY_STATUS_IDLE;
    status.classList.remove("saved");
  }, 1600);
}

function clarityEnhanceWorkbench() {
  const title = document.querySelector("#workbench-title");
  if (title) title.textContent = "Bereich wählen & weiterarbeiten";

  const intro = document.querySelector("#workbench .section-intro");
  if (intro) intro.textContent = "Wähle Facharbeit oder Kolloquium. Danach führt dich die Seite direkt durch den aktuellen Arbeitsschritt.";

  const split = document.querySelector("#examSplit");
  if (split && !document.querySelector(".clarity-exam-split")) {
    split.insertAdjacentHTML("afterend", '<p class="clarity-exam-split"><strong>PT 3:</strong> Facharbeit 50 % <span aria-hidden="true">·</span> Kolloquium 50 %</p>');
  }

  const dashboard = document.querySelector(".dashboard");
  const current = document.querySelector(".current-step-card");
  if (dashboard && current && current.nextElementSibling !== dashboard) {
    dashboard.parentNode.insertBefore(current, dashboard);
  }

  const currentEyebrow = current?.querySelector(".eyebrow");
  if (currentEyebrow) currentEyebrow.textContent = "Hier weitermachen";
  const continueButton = document.querySelector("#continueButton");
  if (continueButton) continueButton.textContent = "Schritt öffnen";

  const labels = document.querySelectorAll(".dashboard .stat-label");
  if (labels[0]) labels[0].textContent = "Für mich geklärte Leitfragen";
  if (labels[1]) labels[1].textContent = "Von mir abgeglichene Anforderungen";

  const pathTitle = document.querySelector("#path-title");
  if (pathTitle) pathTitle.textContent = "Alle Arbeitsschritte";

  clarityEnsureSaveStatus();
}

function clarityEnhanceSpecializationCopy() {
  const otherButton = document.querySelector('[data-specialization="other"]');
  if (otherButton) {
    const strong = otherButton.querySelector("strong");
    const description = otherButton.querySelector("span");
    if (strong) strong.textContent = "Andere Vertiefung – nur allgemeine Vorgaben vorhanden";
    if (description) description.textContent = "Die allgemeine verbindliche Gliederung ist verfügbar; vertiefungsspezifische Vorgaben sind in der Quellenbasis nicht belegt.";
  }

  if (state.specialization === "other") {
    const selectedStrong = document.querySelector(".specialization-selected strong");
    if (selectedStrong) selectedStrong.textContent = "Andere Vertiefung – nur allgemeine Vorgaben vorhanden";
  }
}

function clarityEnhanceAll() {
  if (!model) return;
  clarityEnhanceWorkbench();
  clarityEnhanceSpecializationCopy();
  clarityEnhanceStage();
}

const clarityBaseRenderStage = renderStage;
renderStage = function clarityRenderStage() {
  clarityBaseRenderStage();
  clarityEnhanceStage();
};

const clarityBaseRenderAll = renderAll;
renderAll = function clarityRenderAll() {
  clarityBaseRenderAll();
  clarityEnhanceAll();
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#stageContent")?.addEventListener("input", (event) => {
    if (event.target.matches("[data-question]")) clarityEnhanceQuestionCopy();
  });
  clarityEnhanceAll();
});

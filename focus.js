const focusFormalGroups = [
  {
    id: "before-writing",
    title: "Vor dem Schreiben",
    note: "Rahmen, Gliederung, Umfang, Arbeitstitel und Literaturbasis klären.",
    requirementIds: [
      "formal-pages",
      "formal-outline",
      "formal-medium",
      "formal-font",
      "formal-lines",
      "formal-margins",
      "formal-topic-limit",
      "formal-sources",
    ],
  },
  {
    id: "while-writing",
    title: "Beim Schreiben",
    note: "Wissenschaftliches Arbeiten, Belege und KI-Nutzung während der Ausarbeitung sauber dokumentieren.",
    requirementIds: [
      "formal-scientific",
      "formal-citation-literature",
      "formal-ai-source",
      "formal-ai-independent",
      "formal-ai-disclosure",
      "formal-ai-verification",
    ],
  },
  {
    id: "before-submission",
    title: "Vor der Abgabe",
    note: "Abgabeform und abschließende Erklärungen vollständig vorbereiten.",
    requirementIds: [
      "formal-submission",
      "formal-declaration",
      "formal-publication-consent",
    ],
  },
];

const focusReferenceSpecs = [
  { selector: "#outlineSection", id: "outlineSection" },
  { selector: ".notice", id: "referenceHierarchy" },
  { selector: "#gaps", id: "gaps" },
  { selector: "#tensions", id: "tensions" },
  { selector: "#sources", id: "sources" },
];

function focusRequirementId(item) {
  return item.querySelector("[data-requirement]")?.dataset.requirement || "";
}

function focusFormalGroupElement(group, itemsById) {
  const groupItems = group.requirementIds.map((id) => itemsById.get(id)).filter(Boolean);
  if (!groupItems.length) return null;

  const checked = groupItems.filter((item) => item.querySelector("[data-requirement]")?.checked).length;
  const section = document.createElement("section");
  section.className = "formal-timeline-group";
  section.setAttribute("aria-labelledby", `formal-group-${group.id}`);
  section.innerHTML = `
    <div class="formal-timeline-head">
      <div>
        <span class="formal-timeline-step">Formalia</span>
        <h5 id="formal-group-${group.id}">${escapeHtml(group.title)}</h5>
        <p>${escapeHtml(group.note)}</p>
      </div>
      <span class="formal-group-progress">${checked} / ${groupItems.length} abgeglichen</span>
    </div>
    <div class="formal-group-items"></div>
  `;

  const body = section.querySelector(".formal-group-items");
  groupItems.forEach((item) => body.appendChild(item));
  return section;
}

function focusGroupFormalRequirements() {
  if (state.mode !== "facharbeit" || state.activePhase !== "start") return;
  const list = document.querySelector("#stageContent .requirement-list");
  if (!list || list.dataset.focusGrouped === "true") return;

  const originalItems = [...list.querySelectorAll(":scope > .requirement-item")];
  if (!originalItems.length) return;

  const itemsById = new Map(originalItems.map((item) => [focusRequirementId(item), item]).filter(([id]) => id));
  const groupedIds = new Set(focusFormalGroups.flatMap((group) => group.requirementIds));
  const leftovers = originalItems.filter((item) => !groupedIds.has(focusRequirementId(item)));

  list.textContent = "";
  list.classList.add("formal-timeline");
  list.dataset.focusGrouped = "true";

  focusFormalGroups.forEach((group) => {
    const section = focusFormalGroupElement(group, itemsById);
    if (section) list.appendChild(section);
  });

  if (leftovers.length) {
    const fallback = document.createElement("section");
    fallback.className = "formal-timeline-group formal-timeline-fallback";
    fallback.setAttribute("aria-labelledby", "formal-group-additional");
    fallback.innerHTML = `
      <div class="formal-timeline-head">
        <div>
          <span class="formal-timeline-step">Formalia</span>
          <h5 id="formal-group-additional">Weitere Vorgaben</h5>
          <p>Zusätzliche belegte Vorgaben, die keiner Zeitgruppe eindeutig zugeordnet sind.</p>
        </div>
        <span class="formal-group-progress">${leftovers.filter((item) => item.querySelector("[data-requirement]")?.checked).length} / ${leftovers.length} abgeglichen</span>
      </div>
      <div class="formal-group-items"></div>
    `;
    const body = fallback.querySelector(".formal-group-items");
    leftovers.forEach((item) => body.appendChild(item));
    list.appendChild(fallback);
  }
}

function focusReferenceMetadata(section) {
  const eyebrow = section.querySelector(".eyebrow")?.textContent?.trim() || "Nachschlagen";
  const heading = section.querySelector("h2")?.textContent?.trim() || "Referenz";
  return { eyebrow, heading };
}

function focusFoldReferenceSection(section, id) {
  if (!section || section.dataset.referenceFolded === "true") return;
  if (!section.id) section.id = id;

  const { eyebrow, heading } = focusReferenceMetadata(section);
  const details = document.createElement("details");
  details.className = "reference-fold";
  details.dataset.referenceId = section.id;

  const summary = document.createElement("summary");
  summary.innerHTML = `
    <span class="reference-fold-label">
      <span class="reference-fold-eyebrow">${escapeHtml(eyebrow)}</span>
      <strong>${escapeHtml(heading)}</strong>
    </span>
    <span class="reference-fold-action" aria-hidden="true">Öffnen</span>
  `;

  const content = document.createElement("div");
  content.className = "reference-fold-content";
  while (section.firstChild) content.appendChild(section.firstChild);

  details.append(summary, content);
  section.appendChild(details);
  section.dataset.referenceFolded = "true";
  section.classList.add("reference-shell");

  details.addEventListener("toggle", () => {
    const action = details.querySelector(".reference-fold-action");
    if (action) action.textContent = details.open ? "Schließen" : "Öffnen";
  });
}

function focusReferenceShortcuts() {
  const intro = document.querySelector(".reference-intro");
  if (!intro) return;

  const heading = intro.querySelector("h2");
  if (heading) heading.textContent = "Nachschlagen, wenn du es brauchst";
  const paragraph = intro.querySelector("p:not(.eyebrow)");
  if (paragraph) {
    paragraph.textContent = "Der Arbeitsweg bleibt oben kurz. Gliederung, Quellenhierarchie, offene Punkte und Originaldokumente kannst du hier gezielt öffnen.";
  }

  let shortcuts = intro.querySelector("#referenceShortcuts");
  if (!shortcuts) {
    shortcuts = document.createElement("nav");
    shortcuts.id = "referenceShortcuts";
    shortcuts.className = "reference-shortcuts";
    shortcuts.setAttribute("aria-label", "Referenzbereich direkt öffnen");
    shortcuts.innerHTML = `
      <a href="#outlineSection" data-reference-target="outlineSection">Gliederung</a>
      <a href="#referenceHierarchy" data-reference-target="referenceHierarchy">Quellenhierarchie</a>
      <a href="#gaps" data-reference-target="gaps">Offene Punkte</a>
      <a href="#tensions" data-reference-target="tensions">Einordnung</a>
      <a href="#sources" data-reference-target="sources">Schuldokumente</a>
    `;
    intro.querySelector("div")?.appendChild(shortcuts);

    shortcuts.querySelectorAll("a[data-reference-target]").forEach((link) => {
      link.addEventListener("click", () => focusOpenReferenceDetails(link.dataset.referenceTarget));
    });
  }

  const outlineLink = shortcuts.querySelector('[data-reference-target="outlineSection"]');
  if (outlineLink) outlineLink.hidden = state.mode !== "facharbeit";

  const directSourceLink = intro.querySelector(":scope > .text-link");
  if (directSourceLink) directSourceLink.textContent = "Schuldokumente öffnen";
}

function focusOpenReferenceDetails(id) {
  if (!id) return;
  const section = document.getElementById(id);
  const details = section?.querySelector(":scope > details.reference-fold");
  if (details) details.open = true;
}

function focusOpenReferenceFromHash() {
  const id = window.location.hash.replace(/^#/, "");
  if (id) focusOpenReferenceDetails(id);
}

function focusEnhanceReferences() {
  focusReferenceSpecs.forEach((spec) => {
    const section = document.querySelector(spec.selector);
    focusFoldReferenceSection(section, spec.id);
  });
  focusReferenceShortcuts();
  focusOpenReferenceFromHash();
}

function focusEnhanceStage() {
  focusGroupFormalRequirements();
}

function focusEnhanceAll() {
  focusEnhanceStage();
  focusEnhanceReferences();
}

const focusBaseRenderStage = renderStage;
renderStage = function focusRenderStage() {
  focusBaseRenderStage();
  focusEnhanceStage();
};

const focusBaseRenderAll = renderAll;
renderAll = function focusRenderAll() {
  focusBaseRenderAll();
  focusEnhanceAll();
};

window.addEventListener("hashchange", focusOpenReferenceFromHash);

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".reference-intro")?.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    focusOpenReferenceDetails(link.getAttribute("href").slice(1));
  });
  focusEnhanceAll();
});

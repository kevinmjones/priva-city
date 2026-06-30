// quests.js — Privacy quest content for Priva-city Phase 1.
//
// Four distinct interactive mechanics, each teaching a concrete privacy concept:
//  1. Consent Switchboard (toggles) — data minimisation & bundled consent
//  2. Rights Request Terminal (multichoice) — GDPR data-subject rights
//  3. Retention Sweep (classify) — data retention & minimisation
//  4. Vault Seal Protocol (sequence) — breach response procedure

// `short` drives the compact MAIN QUEST HUD panel (OTL-97 — keeps the corner
// cluster small so the playfield stays dominant); `label` is the full
// descriptive objective, reserved for briefings / future detail views.
export const QUESTS = [
  { id: "consent",   short: "Revoke consent grab",   label: "Revoke the data broker's bundled consent grab." },
  { id: "rights",    short: "File rights request",   label: "File a data-subject rights request at the Exchange." },
  { id: "retention", short: "Purge stale telemetry", label: "Purge stale telemetry at Retention Rail." },
  { id: "vault",     short: "Seal the Privacy Vault", label: "Seal the Privacy Vault with the breach protocol." },
];

// Dispatch to the correct puzzle maker by quest ID.
export function makePuzzle(questId) {
  switch (questId) {
    case "rights":    return makeRightsPuzzle();
    case "retention": return makeRetentionPuzzle();
    case "vault":     return makeVaultPuzzle();
    default:          return makeConsentPuzzle();
  }
}

// ---- Quest 1: Consent Switchboard ------------------------------------------
// Mechanic: toggle each permission to the privacy-correct state.
// Concept: data minimisation, bundled consent, just-in-time access.
function makeConsentPuzzle() {
  return {
    type: "toggles",
    title: "CONSENT SWITCHBOARD",
    npc: "Mira — user advocate",
    brief: "The broker bundled four permissions behind one “Accept all”. Set each to the privacy-respecting choice, then submit. Grant only what the map feature truly needs — refuse the speculative grabs.",
    wrongHint: "Not yet. Data minimisation: grant precise location only (just-in-time for the map), and deny contacts, browsing history, and always-on diagnostics.",
    toggles: [
      { label: "Precise location — only when map is open", hint: "needed for the core feature",         on: false, correct: true  },
      { label: "Contacts upload",                              hint: "not needed for the service",          on: true,  correct: false },
      { label: "Browsing history sale",                        hint: "speculative data grab",               on: true,  correct: false },
      { label: "Always-on diagnostics",                        hint: "should be optional / off by default", on: true,  correct: false },
    ],
  };
}

// ---- Quest 2: Rights Request Terminal ---------------------------------------
// Mechanic: match each citizen's case to the correct GDPR data-subject right.
// Concept: Right of Access, Right to Rectification, Right to Erasure,
//          Right to Object, Right to Restrict Processing.
function makeRightsPuzzle() {
  return {
    type: "multichoice",
    title: "RIGHTS REQUEST TERMINAL",
    npc: "Zara — data-rights liaison",
    brief: "Three citizens need you to assert the correct GDPR right. Match each case, then file the requests.",
    wrongHint: "Wrong match on at least one case. Think carefully: correct inaccurate data → Rectification; stop ad profiling → Object; delete everything → Erasure.",
    questions: [
      {
        scenario: "Kay’s profile has the wrong birthday on file. She needs the record corrected.",
        options: ["Right of Access", "Right to Rectification", "Right to Erasure"],
        correct: 1,
      },
      {
        scenario: "Theo wants the broker to stop using his location data for ad targeting.",
        options: ["Right to Data Portability", "Right to Object", "Right to Restrict Processing"],
        correct: 1,
      },
      {
        scenario: "Asha closed her account and wants all stored data permanently deleted.",
        options: ["Right to Restrict Processing", "Right of Access", "Right to Erasure"],
        correct: 2,
      },
    ],
    answers: [null, null, null],
  };
}

// ---- Quest 3: Retention Sweep -----------------------------------------------
// Mechanic: classify each data record as KEEP or PURGE.
// Concept: data retention windows, purpose limitation, minimisation.
function makeRetentionPuzzle() {
  return {
    type: "classify",
    title: "RETENTION SWEEP",
    npc: "Dex — pipeline engineer",
    brief: "The rail is clogged with data past its retention window. KEEP what’s still needed for active service; PURGE anything expired or collected beyond its stated purpose.",
    wrongHint: "Check again. Only active-service data stays. Purge expired logs, stale ad history, and anything beyond its retention window.",
    records: [
      { label: "Session logs — 6 months old",           purge: true,  choice: null },
      { label: "Payment tokens — active subscriptions", purge: false, choice: null },
      { label: "Ad-click history — 3 years old",        purge: true,  choice: null },
      { label: "Auth tokens — current sessions",         purge: false, choice: null },
      { label: "Crash reports — EOL app version",        purge: true,  choice: null },
      { label: "User prefs — actively used settings",    purge: false, choice: null },
    ],
  };
}

// ---- Quest 4: Vault Seal Protocol -------------------------------------------
// Mechanic: click the four breach-response steps in the correct order.
// Concept: incident-response protocol — contain, notify, investigate, remediate.
function makeVaultPuzzle() {
  const steps = [
    { label: "Contain — revoke compromised credentials",    order: 1, clicked: 0 },
    { label: "Notify — alert affected users within 72 h", order: 2, clicked: 0 },
    { label: "Investigate — audit access logs for scope",   order: 3, clicked: 0 },
    { label: "Remediate — patch the exploited vector",      order: 4, clicked: 0 },
  ];
  // Shuffle so the correct order isn’t immediately obvious.
  for (let i = steps.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [steps[i], steps[j]] = [steps[j], steps[i]];
  }
  return {
    type: "sequence",
    title: "VAULT SEAL PROTOCOL",
    npc: "ARIA — breach-response AI",
    brief: "Breach detected on the Privacy Vault. Click the response steps in the correct order — contain first, then notify, investigate, remediate.",
    wrongHint: "Wrong order. Reset and try again: contain → notify → investigate → remediate.",
    steps,
    clickSeq: 0,
  };
}

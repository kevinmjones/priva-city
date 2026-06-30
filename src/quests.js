// quests.js — Privacy quest content + the Phase 0 interactive puzzle.
//
// The Phase 0 vertical slice ships ONE fully-built interaction: a "consent
// switchboard" the player must set to the privacy-correct state to revoke a
// data broker's bundled data grab. Phase 1 scales this pattern to the other
// quests (rights request, telemetry purge, breach forensics).

export const QUESTS = [
  { id: "consent", label: "Revoke the data broker's bundled consent grab." },
  { id: "rights", label: "File a data-subject rights request at the Exchange." },
  { id: "retention", label: "Purge stale telemetry at Retention Rail." },
  { id: "vault", label: "Seal the Privacy Trust Hub with the recovered code." },
];

// A single puzzle instance. Toggles represent permissions the broker bundled
// together; the privacy-correct answer grants only what the core service needs,
// just-in-time, and refuses the speculative data grab.
export function makePuzzle() {
  return {
    title: "CONSENT SWITCHBOARD",
    npc: "Mira — user advocate",
    brief:
      "The broker bundled four permissions behind one “Accept all”. Set each to the privacy-respecting choice, then submit. Grant only what the map feature truly needs — refuse the speculative grabs.",
    wrongHint:
      "Not yet. Data minimisation: grant precise location only (just-in-time for the map), and deny contacts, browsing history, and always-on diagnostics.",
    toggles: [
      { label: "Precise location — only when map is open", hint: "needed for the core feature", on: false, correct: true },
      { label: "Contacts upload", hint: "not needed for the service", on: true, correct: false },
      { label: "Browsing history sale", hint: "speculative data grab", on: true, correct: false },
      { label: "Always-on diagnostics", hint: "should be optional / off by default", on: true, correct: false },
    ],
  };
}

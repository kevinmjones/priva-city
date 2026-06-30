# UX and Visual Polish Spec — Priva-city Rebuild

## Objective
Deliver a production-ready visual and interaction spec for the Priva-city rebuild that keeps the current gameplay architecture (Phaser canvas + HTML HUD/modal overlay) and raises visual quality, usability, accessibility, and responsive behavior to a shippable baseline.

## Baseline capture evidence
- Desktop capture: [priva-desktop-1440x900.png](/workspace/projects/priva-city/docs/visual-audit/priva-desktop-1440x900.png)
- Mobile capture: [priva-mobile-390x844.png](/workspace/projects/priva-city/docs/visual-audit/priva-mobile-390x844.png)

Reference behavior inspected from:
- `index.html`
- `styles.css`
- `src/game.js`

## Design direction
Use the existing game palette and HUD patterns, but make hierarchy explicit and reduce "prototype default" feel:
- Keep the cyberpunk-civic trust tone with a stronger hierarchy and cleaner spacing.
- Preserve `:root` CSS tokens; only add scoped UI tokens for density and interaction feedback.
- No new heavy widgets; keep one HUD layer and one modal layer.

## Desktop layout spec (target 1440×900+)
Screen model: `16:9` game viewport inside `#game-wrap`.
- Top-left: Brand + core meters row in a single glass panel cluster.
- Top-right: Quest log panel anchored with max width around `320px`.
- Bottom: Hint strip with a single command row.
- Center modal: anchored to `dialog` center on top of game canvas.

Hierarchy:
- Primary: Game world (`#game`) and active challenge modal.
- Secondary: Quest/log panel and top telemetry meters.
- Tertiary: Hint strip and decorative scene only.

Spacing and scale:
- Use `8px` spacing unit scale from existing density (`6,10,12,14,18`).
- Panel paddings target `12px 14px` on desktop.
- Border and stroke use `1px` with existing `--line` and `rgba` alpha.

Typography:
- Keep `Inter` for now to preserve existing system consistency.
- Apply clear size ladder:
  - Title: `22px`
  - Body: `14px`
  - HUD body/chips: `13px`
  - Hint line: `12px`

## Mobile layout spec (target 390×844)
- Keep `#game-wrap` full width minus `16px` gutter, maintain aspect with vertical fit.
- Top HUD transforms to two rows:
  - Row 1: compact brand marker + title
  - Row 2: timer, code, sigils inline chips
- Quest log remains but moves beneath HUD or to a collapsible drawer if readability drops below 42% width.
- Increase modal and button sizing for thumb comfort:
  - Buttons `min-height: 44px`
  - Modal max width full minus gutter, max height `min(84vh, 760px)`
- Add touch-friendly action affordance in phase 2: virtual `E` and directional zone, because mobile currently has no explicit controls.

## Component treatments

### HUD (`#hud`, `.brand`, `.meters`)
- `.meters` should use segmented chips (`span`) with soft separators.
- Quest progress and sigil counts use icon-like affordance markers.
- Add explicit state colors:
  - Completed: `var(--green)` icon/segment
  - Incomplete: muted neutral `var(--muted)`

### Quest log (`#quest-log`)
- Use numbered list with stronger visual status:
  - `.done`: strike + green + slightly elevated emphasis (`opacity: 1`)
  - active line: amber/cyan callout
- Keep max width from `clamp(250px, 38vw, 320px)` once implemented.

### Prompt and interaction cue (`#hint`, `#promptText`)
- Prompt stays within gameplay flow and appears only when in `interactZones`.
- Hint message updates contextually:
  - near challenge zones: `Press E to interact`
  - near vault: `Press E to enter vault`
  - no input zones: empty/hide.
- Include unobtrusive but high-contrast focus ring when in range.

### Modal (`dialog`, choices, keypad)
- Keep panel max width at current `680px` equivalent but introduce:
  - consistent section rhythm of `24px` vertical rhythm
  - primary/secondary buttons distinguished by border weight
  - result states with clear semantic color:
    - success: green border + success message
    - reject: amber border + retry suggestion
- Keypad spacing for vault entry:
  - `grid-template-columns: repeat(3, minmax(0, 1fr))`
  - `gap: 10px`
  - back and OK are equal hierarchy with icons or labels.
- Close action in top-right has minimum target 34px currently acceptable.

## Animation and feedback spec
- On modal open/close: purposeful fade/scale (`120ms` in, `90ms` out, `ease-out`).
- Correct choice feedback: immediate inline result with no blocking delay.
- Wrong choice feedback: keep selection state and show alternate result, no modal closure.
- Timer label updates at `1s` cadence; keep this visible but not distracting.

## Accessibility spec
- Contrast checks:
  - text on dark glass panels must remain >= `4.5:1`.
  - meter text to line on panel edges > `4.0:1`.
- Focus:
  - focus-visible ring on challenge buttons (`2px solid var(--green)`).
- Motion:
  - do not rely solely on animations for critical game-state communication.
- Touch:
  - action areas on mobile should be at least `44px` touch target where interactive UI is present.
- Cognitive load:
  - show one open task at a time.
  - Keep challenge statement body under 2 short paragraphs.

## Visual risks from current implementation
- Mobile control gap: no dedicated movement/interaction controls for touch leads to non-playable UX on touch-only devices.
- Quest log width on narrow screens can crowd HUD due fixed `calc(100% - 32px)` style.
- Text contrast on interactive overlays should be audited after modal redesign; current yellow-on-green text bands may be low in some simulated dark modes.
- Visual state signals are color-heavy without explicit text labels; add text cues to avoid color-only feedback violations.

## Exact acceptance criteria (must pass)
- At 1440×900 desktop, game canvas and HUD must be fully visible within viewport with 16:9 container and no cropped controls.
- At 390×844 mobile, HUD must remain readable without horizontal scroll and without overlapping controls.
- 100% of interactive controls must have target size >= `44px` (touch-only controls in mobile phase).
- Modal should not exceed viewport both axes on desktop/mobile.
- All primary text must meet WCAG AA contrast against panel background.
- Every successful/failed challenge outcome must show explicit text, icon/colour, and one-step next-action cue.
- Quest state must be legible from first glance (F-pattern): first 2–3 seconds should identify:
  - mission status,
  - timer/code/sigils,
  - active interaction cue.
- Interaction latency on UI:
  - interaction feedback appears < `100ms` after click/select.
- Game loop remains playable after visual updates with no added frame jitter from modal overlays.
- No dark patterns:
  - no forced progression,
  - no hidden/ambiguous penalties.

## Implementation handoff
### To Front End Engineer
Implement directly against these selectors/state classes:
- HUD: `#hud`, `.brand`, `.meters`, `#quest-log`, `#hint`
- Game prompts: `#promptText`, `#timer`, `#code-slots`, `#sigils`, `#quest-list`
- Modal: `#modal`, `#modal-body`, `.choices`, `.result`, `.keypad`
- Challenge state rendering in `src/game.js`:
  - add explicit class hooks for challenge state (`.result--success`, `.result--error`)
  - contextual hint text updates by zone
  - optional touch control layer in a future flag-controlled block for mobile only

### To CTO
- Confirm mobile acceptance boundary:
  - phase 1 can remain desktop-primary if explicitly signed off,
  - phase 2 should approve touch controls and input fallback policy.
- Approve whether mobile touch-controls are in-scope for this heartbeat or a follow-up milestone.

## Open assumptions and risks
- Source reference is Breach: Grid City; this spec preserves desktop-first mission-log + modal rhythm and reuses existing token colors.
- No backend or account model changes in this ticket.
- If modal typography or interaction changes alter tone, a microcopy pass should follow in a separate content pass.

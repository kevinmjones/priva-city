# OTL-60 — Layered Side-Scroller Art Pass

Parent issue: [OTL-59](/OTL/issues/OTL-59)  
Date: 2026-06-29  
Owner: Level Designer

## Goal
Refine the existing world so it reads as a readable, layered neon-city side-scroller while keeping the current Phaser stack intact.

## Level Beat Layout (3 Beats)

## Beat 1 — Consent Arcade Arrival (x: 0–760)

Intent: establish the rhythm anchor and give players a clear first reward/anchor with ground-safe vertical lift.

- **Foreground**: 
  - Add a foreground utility lane immediately above floor from `x 60→290` with a 2-part walkway (`floor`-36 and `floor`-82) and neon catenary rail.
  - Place a canopy over the `Consent Arcade` landmark with a clear triangular awning edge and side rails.
  - Add door-frame clusters and 2 window stacks at nearby facades so player can identify “interactable district” before challenge prompt.
- **Midground**:
  - Increase skyline module density in the `x 80→540` band; alternate dark cobalt and muted lavender towers with small vent/floor cutouts every 60–100 px.
  - Add soft parallax offset (`alpha 0.26`) for this band so the beat reads as distant street depth, not empty sky.
- **Background**:
  - Use low-frequency smog blocks above beat height with vertical gaps to avoid horizon clutter.
- **Gameplay structure**:
  - Keep ground run from start to first challenge as a compression-to-release beat:
    1. Flat run from start.
    2. Low rise via 2-tile mini-platform at `x~320`.
    3. Drop to floor and continue to `Consent Arcade`.
- **Obstacle/platform arrangement**:
  - Replace the current first platform with a stepped pair:
    - `x: 292, y: 628, w: 120, h: 22`
    - `x: 422, y: 566, w: 110, h: 22`
    - jump windows between them (gap 56 px) to force intentful jumps.

## Beat 2 — Rights Exchange / Retention Rail (x: 760–1460)

Intent: create the traversal “compression + read” beat through streetscape complexity.

- **Foreground**:
  - Build a narrow service bridge from right-facing balcony to a rail-side platform.
  - Add guardrail/panel motifs over the `Rights Exchange` and `Retention Rail` zones with one “privacy badge light” cluster each (amber accent + mint halo).
- **Midground**:
  - Add alternating tall/short facade bands; avoid perfect grid.
  - Introduce one stair/columned stairwell motif near `x ~ 1080` so the player can read a vertical route option.
- **Background**:
  - Extend distant building silhouettes with 3 larger blocks (`baseY 720 / 700 / 680`) and one cutout window line cluster.
- **Gameplay structure**:
  - Transition from broad run to jump puzzle:
    - approach `Rights Exchange` at baseline.
    - optional up-route via stairwell.
    - controlled drop to `Retention Rail` platform with clear one-way descent.
- **Obstacle/platform arrangement**:
  - Use three-step traverse:
    1. `x: 900, y: 628, w: 180, h: 22`
    2. `x: 1090, y: 498, w: 130, h: 22`
    3. `x: 1230, y: 590, w: 160, h: 22`
  - Keep at least one landing window (`>= 100 px`) on each landing for forgiveness.

## Beat 3 — Trust Hub Terminal (x: 1460–1920)

Intent: finish on a controlled “goal chamber” read with low clutter and clear vault orientation.

- **Foreground**:
  - Add a raised approach ramp and vault plaza.
  - Add a single large vault pillar pair with vertical privacy-rings and a short queue line marker.
- **Midground**:
  - Use deeper silhouette blocks behind vault so the Trust Hub appears visually dominant but not too dense.
- **Background**:
  - Remove unnecessary horizon clutter for last 2/5ths of camera space.
- **Gameplay structure**:
  - Slight upward pressure into final challenge and a short release after vault interaction.
- **Obstacle/platform arrangement**:
 - End approach should be simple and fair:
   - `x: 1460, y: 612, w: 180, h: 22`
   - `x: 1660, y: 538, w: 110, h: 22`
   - `x: 1760, y: 468, w: 140, h: 22`
   - final descent option from vault approach to baseline for restart-safe exit feeling.

## Character and world visual details

- Keep player silhouette unchanged; only adjust contrast and shadow treatment through environmental context.
- Use only these in-code visual systems:
  - `graphics.fillRect/fillStyle/lineStyle/strokeRect` for skyline, buildings, bridges, signs.
  - existing `assets/style/priva-city-motif-sheet-1024x1024.svg` as design vocabulary (no new art files).
- Reusable generated motif elements to add:
  - canopy tops, balcony rail segments, window cutlines, vent columns, signage strips, privacy bulbs.
- Existing CSS/HTML HUD remains unchanged; do not relocate HUD for this pass.

## Art assets vs in-code generation

- No new external assets required for this beat pass.
- Do not add image sprites for ground/platforms.
- Keep all scenery procedural/canvas-driven to preserve current stack and avoid texture churn.
- If a single static decal is needed, source from motif sheet only and rasterize via generated texture (`generateTexture`) for re-use.

## Acceptance notes

- Parent reference alignment:
  - Side-on city street read with dense FG/MG/BG contrast.
  - Walkable geometry remains the primary affordance.
  - Landmarks remain physical, not abstract map nodes.
- Required verification:
  - `desktop`
    - Start to Arcade: run from `x~0` to `x~750`, ensure challenge prompt activates only near the arcade marker.
    - Midbeat read: `x~1080` camera area shows at least 2 skyline tiers and one usable high route.
    - End: vault and queue marker visible at `x~1760` with HUD still unobstructed.
  - `mobile`
    - At 390x844, each beat still reads with >1 landmark edge in foreground and at least one clear platform.
    - No HUD overlap with prompt during approach to each landmark.
- Screenshot targets:
  - `docs/visual-audit/otl-60-desktop-1440x900-beat1.png`
  - `docs/visual-audit/otl-60-desktop-1440x900-beat2.png`
  - `docs/visual-audit/otl-60-desktop-1440x900-beat3.png`
  - `docs/visual-audit/otl-60-mobile-390x844-beat1.png`
  - `docs/visual-audit/otl-60-mobile-390x844-beat2.png`
  - `docs/visual-audit/otl-60-mobile-390x844-beat3.png`
- Failure checks:
  - No ambiguous jumps into hidden void; all platform edges should carry either edge highlight or underside marker.
  - Keep horizontal player line of sight clear through each beat (avoid full-screen skyline occlusion).

## Handoff for engineering

- Front-end implementation targets:
  - `src/game.js`: `locations`, `platforms`, and `drawCity()` routines.
  - No changes needed to `createPlayer`, `update`, challenge data, or HUD behavior for this heartbeat.
  - Start with platform list in this spec first; then apply FG/MG/BG motif layering in the same draw pass before adding any new interactable behaviors.


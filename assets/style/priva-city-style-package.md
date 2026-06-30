# Priva-city Visual Style Package

Issue: OTL-54
Prepared for: UX Designer and Front End Engineer
Source references:
- `assets/reference/board-target-reference.png`
- `assets/reference/current-build-screenshot.png`

## Target Read

The board reference is a polished 2D side-scroller, not a top-down tactical map. The strongest signals are:

- Side-on street scene with walkable ground, platforms, doors, balconies, and alley depth.
- Layered parallax skyline: near black towers, mid blue towers, distant cloud/smog silhouettes.
- Pixel-art treatment with hard edges, low-detail shapes, and small highlight clusters.
- Neon noir palette: deep navy/black base, saturated cobalt shadows, muted lavender structures, warm amber UI.
- UI feels like game HUD: compact pixel text, icon slots, code boxes, and bottom input hints.
- Interactions are anchored to characters/doors/terminals in the scene, not floating map nodes.

The current build misses that target because it reads as a sparse top-down grid with large empty canvas space, flat buildings, and generic panels.

## Selected Direction

Use Direction A: "Neon Night Drive." It is closest to the board-provided target and preserves OT Labs privacy/trust motifs without inventing a new product direction.

Files:
- `assets/style/priva-city-polish-board-selected-1600x900.svg`
- `assets/style/priva-city-polish-board-alt-1600x900.svg`
- `assets/style/priva-city-motif-sheet-1024x1024.svg`

Direction B was explored as a colder "Compliance Terminal District" variant, but it is too sterile and too close to the current prototype. Use it only as a contrast reference for what to avoid.

## Palette

Primary scene colors:

| Token | Hex | Usage |
| --- | --- | --- |
| `night-950` | `#030711` | Outer void, deepest building silhouettes |
| `night-900` | `#07122a` | Sky base |
| `blue-800` | `#102a63` | Distant buildings and sky forms |
| `blue-650` | `#264d9b` | Midground facade highlights |
| `brick-850` | `#07172f` | Brick wall fill |
| `brick-650` | `#12376f` | Brick line work |
| `slate-500` | `#6f6c9f` | Roof slabs, platforms, railings |
| `amber-300` | `#ffc76d` | HUD, codes, interact bubble |
| `mint-400` | `#38d98b` | Trust growth, sigils, privacy success accents |
| `violet-400` | `#8d73ff` | Data/glyph accents |
| `paper-100` | `#f4f1d6` | Small readable HUD text |

Keep amber and mint as accents only. The dominant read should remain dark navy/blue, with lavender-gray structures.

## Scene Construction

Implement as a side-on 16:9 scene:

- Camera: horizontal side-scroller at 1600x900 design resolution, scaled responsively.
- Ground band: 110px high at the bottom with noisy cobble pixels and a bright blue top edge.
- Foreground buildings: brick modules with doors, windows, vents, stairs, railings, plants, and signs.
- Midground skyline: large silhouettes behind buildings, at 0.45 to 0.7 parallax.
- Background sky: deep blue with chunky cloud/smog shapes and distant tower cutouts.
- Walkable path: player moves left/right with optional vertical platform/stair segments if time allows.
- Privacy challenge locations: make them physical street landmarks:
  - Consent Arcade: neon kiosk or arcade cabinet under an awning.
  - Rights Exchange: desk/window booth with document posters.
  - Retention Rail: train-platform purge console with amber warning strips.
  - Trust Hub: secure tower door or vault kiosk with code slots.

Avoid returning to the map/grid presentation unless the UX spec explicitly changes the target.

## HUD Treatment

Top-right HUD should be compact and high-contrast:

- Panel fill: `rgba(3, 7, 17, 0.88)`.
- Border: 1px `rgba(255, 199, 109, 0.35)`.
- Main quest copy in pixel-styled uppercase.
- Code slots as six amber boxes, not plain text.
- Side quest glyphs as four ring icons with empty/filled states.

Bottom input strip should be a low black band with keycaps:

- Move: `A`, `W`, `D`
- Jump: `Space` if implemented, otherwise omit instead of showing unavailable controls.
- Interact: `E`

## Asset Usage Constraints

- The SVG files are implementation references, not final shipped UI art unless the frontend chooses to embed them.
- They are intentionally vector and repo-local so the Phaser scene can recreate the same shapes procedurally with canvas graphics.
- Use hard edges and nearest-neighbor scaling. Do not blur or gradient the main scene.
- Keep text legible at 1280x720 and avoid tiny HUD copy below 11px CSS-equivalent size.
- Do not include sensitive or real user data in any future screenshot/rendering pass.

## Prompt Iteration Record

Attempt 1 prompt:

> Create a polished pixel-art side-scroller game scene for "Priva-city", a cyberpunk privacy training game. Night city street, layered dark blue skyline, brick buildings, neon amber UI, privacy kiosks, character interaction bubble, HUD with main quest and glyph slots, 16:9, crisp pixels, professional indie game quality.

Resulting direction: strong composition, but too generic and not specific enough to the existing game mechanics.

Attempt 2 refined prompt:

> Create a 16:9 pixel-art side-scroller style reference for "Priva-city", matching a neon noir city street. Include foreground brick buildings with doors, vents, balcony rails, privacy kiosks for consent, rights, retention, and trust hub, layered parallax skyline, amber code-slot HUD, four hidden glyph rings, bottom keycap controls, dark navy/cobalt/lavender palette, tiny mint privacy accents, crisp hard-edged pixels, no top-down map.

Selected rationale: it anchors the privacy mechanics in physical street landmarks and directly corrects the current prototype's top-down sparse-grid read.

## Recommended Frontend Next Step

Front End should use `priva-city-polish-board-selected-1600x900.svg` and `priva-city-motif-sheet-1024x1024.svg` as the visual source of truth while rebuilding the Phaser scene. UX should review for consistency with their polish spec, but no additional standalone art generation is required before implementation can start.

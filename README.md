# Priva-city

A **pixel-art side-scrolling privacy CTF** from OT Labs. Take down data brokers in a
neon night city and restore consent, one district at a time.

> **v2 (OTL-75)** — art-pipeline pivot. The old top-down flat-vector renderer was
> replaced with a custom canvas side-scroller fed by **procedurally-generated
> raster pixel-art** (original art, generated deterministically — no external
> assets), with parallax depth, additive night lighting, particles, an animated
> walk-cycle character, and real interactive privacy quests.

## Stack

- Static HTML/CSS/JavaScript (ES modules) — **no game framework, no build step**
- `src/art.js` — procedural pixel-art generator (sky, parallax skylines, building
  facades, neon signs, street, lamps, animated character, kiosk, fog)
- `src/game.js` — side-scroller engine: physics, camera, parallax, lighting, particles
- `src/audio.js` — procedural WebAudio (SFX + ambient drone)
- `src/quests.js` — privacy quest content + interactive puzzles
- Deploys as static files to GitHub Pages

## Run locally

```bash
npm run serve   # python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Controls

- **Move** `A` / `D` or `←` / `→`
- **Jump** `Space`
- **Interact** `E`
- Touch controls appear on mobile.

## Gameplay

Phase 0 vertical slice: walk the Data Broker District, reach the broker kiosk, and
solve the **Consent Switchboard** — set each bundled permission to the
privacy-respecting choice (data minimisation, just-in-time consent) to revoke the
broker's data grab and earn a Consent Sigil.

## Visual gate

`docs/visual-audit/v2-sidebyside-vs-gridcity.png` — side-by-side against the board's
Grid City reference. Regenerate screenshots with:

```bash
npm run capture
```

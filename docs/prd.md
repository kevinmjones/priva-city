# Priva-city PRD

## Summary

Priva-city is an explorable browser game that teaches practical privacy concepts through short, narrative CTF-style challenges. Players move through a city where data brokers, consent kiosks, and identity systems create privacy risk. The first prototype is a static web game with original procedural art, three challenges, collectibles, and a final code gate.

## Source Research

The reviewed reference game, Breach: Grid City, uses a desktop-first explorable game world with a mission log, character dialogue, hidden glyphs, keypad code entry, and timed/leaderboard CTF framing. The launch article positions the format as a lower-barrier alternative to terminal-only CTFs, with narrative context, approachable onboarding, and challenges mapped to real security risk classes: jailbreaking, command injection, and shared memory exploitation.

## Product Goals

- Teach privacy concepts through interaction instead of slideware.
- Make privacy risk concrete for non-specialist builders, operators, and buyers.
- Produce a shareable prototype that can later grow into chapters, accounts, scoring, and conference demos.

## Audience

- Product and engineering teams building AI/data products.
- Privacy, governance, and security teams explaining risk internally.
- Buyers who need a memorable introduction to privacy controls.

## Prototype Scope

- Single static game page deployable to GitHub Pages.
- Desktop-first 16:9 Phaser scene with original procedural city art.
- Player movement with keyboard controls.
- Quest log, dialogue panel, timer, code inventory, and consent sigil tracker.
- Three privacy challenges:
  - Consent minimization: choose the least invasive permission bundle.
  - Data subject access request: identify and disclose the right data category.
  - Retention purge: delete stale telemetry without breaking service records.
- Final Privacy Trust Hub keypad unlocked by earned codes.
- No player accounts, backend leaderboard, analytics, or external data collection.

## Gameplay

Players enter Priva-city as a privacy engineer helping restore trust after an over-collecting platform rollout. Three districts hold independent privacy failures. Each completed challenge grants two digits of the final vault code. Four hidden consent sigils provide an optional side objective.

## Narrative

The city is divided into the Consent Arcade, Rights Exchange, Retention Rail, and the Privacy Trust Hub. Characters represent product, legal, security, and user advocate perspectives. The player succeeds by balancing data utility with individual rights.

## Architecture

Recommendation: static HTML/CSS/JavaScript with Phaser 3 loaded from CDN.

Rationale:

- YAGNI: a static site is enough for the first playable prototype and GitHub Pages deployment.
- Separation of concerns: Phaser owns world rendering/input, HTML/CSS owns HUD/modal UI, and challenge definitions live in plain JavaScript data objects.
- Observability-before-scale: prototype instrumentation is visible in the quest log and console; production analytics should be designed after consent requirements are specified.

Alternatives considered:

- Canvas from scratch: lower dependency count, but more time spent rebuilding camera, physics, and input primitives.
- p5.js: approachable for sketches, but Phaser better fits tile worlds, collision, and game state.
- React app: unnecessary for a single-screen prototype and adds build/deploy complexity.

## Success Criteria

- A player can complete all three privacy challenges and open the final vault.
- The prototype works from GitHub Pages without a build step.
- The game uses original procedural art rather than copied reference assets.
- Basic QA verifies page load, keyboard movement, modal interactions, final code path, and responsive desktop/mobile behavior.

## Future Scope

- Accounts and privacy-preserving leaderboard.
- More chapters mapped to DPIA, vendor risk, model training consent, cross-border transfers, and breach response.
- Original illustrated sprites, soundtrack, and authored map.
- Accessibility pass with remappable controls and screen-reader-friendly challenge forms.

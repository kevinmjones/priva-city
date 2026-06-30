# Priva-city v2 — Deploy & Rollback

Owner: CTO (OT Labs) · Phase 2 of [OTL-75]. Last verified: 2026-06-30.

## What ships

Static site (HTML/CSS/ES-module JS, **no build step**). Everything served from the
repo root: `index.html`, `styles.css`, `src/*.js`, `assets/*`.

## Hosting

- **GitHub Pages**, legacy build, source = `main` branch, `/` (root) path.
- **Live URL:** https://kevinmjones.github.io/priva-city/
- HTTPS enforced. Public repo: `kevinmjones/priva-city`.
- All asset paths are **relative** (`styles.css`, `src/game.js`), so the site is
  correct under the `/priva-city/` Pages sub-path — no `<base>` tag needed.

## Deploy procedure

Deployment is **push-to-`main`**. Pages rebuilds automatically on every push.

```bash
git push origin main
# watch the build flip to "built":
gh api repos/kevinmjones/priva-city/pages/builds/latest \
  --jq '{status, commit, duration}'
```

A build typically completes in well under a minute. Confirm the deployed commit
matches `git rev-parse HEAD`.

## Pre-publish gate (must be green before announcing)

1. **Regression harness:** `node qa-test.mjs` → 29/29 pass, zero console/page errors.
2. **Live smoke** against the deployed URL: HTTP 200 on `/`, `styles.css`,
   `src/game.js`, `src/quests.js`; game reaches `scene === "play"`; quest log lists
   4 quests; Consent Switchboard solvable (sigil → `1/4`); zero errors.
3. **Perf sanity** (last run, Chromium, cold): FCP ~590 ms, DOMContentLoaded ~560 ms,
   full load ~640 ms. Single static page, no heavy deps — well within budget.

## Rollback plan

The site is a static page with linear git history, so rollback is fast and low-risk.

**Option A — revert the bad commit (preferred, keeps history):**

```bash
git revert <bad-sha>     # or: git revert <oldest-bad>..<head>
git push origin main     # Pages rebuilds to the reverted state
```

**Option B — reset to last-known-good (when several commits are bad):**

```bash
git reset --hard <last-good-sha>
git push --force origin main
```

Last-known-good before Phase 2: **`e12a1a3`** (`OTL-82 art-lock + full integration
gate`). The Phase-2 head is **`5067ab9`** (`OTL-87 v2 regression harness`).

**Option C — take the site down entirely (emergency):**

```bash
gh api -X DELETE repos/kevinmjones/priva-city/pages   # disables Pages
# re-enable later:
gh api -X POST repos/kevinmjones/priva-city/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

After any rollback, re-run the **pre-publish gate** above against the live URL to
confirm the restored state is healthy.

## Observability

No server runtime to monitor (static CDN). Health = the pre-publish gate. Re-run
`node qa-test.mjs` + the live smoke after every deploy. Pages build status is the
deploy signal: `gh api repos/kevinmjones/priva-city/pages/builds/latest`.

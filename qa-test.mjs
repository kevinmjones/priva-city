// qa-test.mjs — Priva-city v2 regression harness (Phase 1).
//
// Replaces the obsolete OTL-56 polish-pass suite, which targeted the pre-pivot
// DOM (#quest-log, #hint, code slots) that no longer exists after the v2
// art-pipeline rebuild. This suite exercises the shipped v2 surface:
//   - title -> game flow
//   - HUD / quest log / control hints
//   - desktop vs. mobile responsive (touch controls, no horizontal scroll)
//   - all 4 privacy quests open with the right content
//   - one quest (Consent Switchboard) solved end-to-end -> sigil increments
//   - audio mute toggle
//   - zero page/console errors throughout
//
// Drives puzzles through the window.__priva test hook so it is deterministic
// (no flaky character walking). Exit code is non-zero on any failure so it can
// gate CI / Phase 2 QA.

import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";

const ROOT = new URL(".", import.meta.url).pathname;
const MIME = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const server = createServer((req, res) => {
  const path = req.url === "/" ? "/index.html" : req.url;
  const file = join(ROOT, path);
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = extname(file);
  const data = readFileSync(file);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": data.length });
  res.end(data);
});

const PASS = [];
const FAIL = [];
function pass(msg) { PASS.push(msg); console.log(`  PASS: ${msg}`); }
function fail(msg) { FAIL.push(msg); console.log(`  FAIL: ${msg}`); }
function check(cond, okMsg, failMsg) { cond ? pass(okMsg) : fail(failMsg || okMsg); return cond; }

async function visible(page, selector) {
  const el = await page.$(selector);
  if (!el) return false;
  const box = await el.boundingBox();
  return !!(box && box.width > 0 && box.height > 0);
}

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const PORT = server.address().port;
  const BASE = `http://127.0.0.1:${PORT}`;
  console.log("=== QA Suite: Priva-city v2 (Phase 1) ===");
  console.log(`Server on ${BASE}\n`);

  const browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const consoleErrors = [];

  // ---- 1. Desktop load + title screen ----
  console.log("--- 1. Desktop 1440x810 — load & title ---");
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  page.on("pageerror", (err) => { pageErrors.push(err.message); console.log(`  [PAGE ERROR] ${err.message}`); });
  page.on("console", (msg) => { if (msg.type() === "error") { consoleErrors.push(msg.text()); console.log(`  [CONSOLE ERROR] ${msg.text()}`); } });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.__priva, null, { timeout: 5000 }).catch(() => {});

  check(await visible(page, "#titleScreen"), "Title screen visible on load");
  check(await visible(page, "#startBtn"), "START button visible");
  check(!(await visible(page, "#hud")), "HUD hidden before start");
  check(await visible(page, ".controls-hint.desktop-hint"), "Title shows desktop control hints");
  check(await page.$("#game"), "Game canvas present");

  // ---- 2. Start the game ----
  console.log("\n--- 2. Title -> game flow ---");
  await page.click("#startBtn");
  await page.waitForTimeout(300);
  check(await visible(page, "#hud"), "HUD visible after START");
  check(!(await visible(page, "#titleScreen")), "Title screen hidden after START");
  check(await visible(page, "#questLog"), "Quest log visible");
  check(await visible(page, "#controlBar"), "In-HUD control hints visible");
  const sceneAfterStart = await page.evaluate(() => window.__priva?.game?.scene);
  check(sceneAfterStart === "play", `Scene is 'play' after start (got '${sceneAfterStart}')`);

  // ---- 3. HUD state ----
  console.log("\n--- 3. HUD state ---");
  const sigil0 = (await page.textContent("#sigilCount"))?.trim();
  check(sigil0 === "0/4", `Sigil count starts at 0/4 (got '${sigil0}')`);
  const questCount = await page.$$eval("#questList li", (els) => els.length);
  check(questCount === 4, `Quest log lists 4 quests (got ${questCount})`);

  // ---- 4. Desktop responsive ----
  console.log("\n--- 4. Desktop responsive ---");
  const touchDesktop = await page.evaluate(() => {
    const el = document.getElementById("touch");
    return el ? getComputedStyle(el).display : "missing";
  });
  check(touchDesktop === "none", `Touch controls hidden on desktop (display:${touchDesktop})`);
  const noScrollDesktop = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
  check(noScrollDesktop, "No horizontal scroll on desktop");

  // ---- 5. All 4 quests open with correct content ----
  console.log("\n--- 5. All 4 quests open ---");
  const expectTitles = ["CONSENT SWITCHBOARD", "RIGHTS REQUEST TERMINAL", "RETENTION SWEEP", "VAULT SEAL PROTOCOL"];
  for (let i = 0; i < 4; i++) {
    await page.evaluate((idx) => window.__priva.openPuzzle(idx), i);
    await page.waitForTimeout(120);
    const open = await visible(page, "#puzzle");
    const title = (await page.textContent(".pz-title"))?.trim();
    check(open && title === expectTitles[i], `Quest ${i + 1} opens: ${expectTitles[i]} (got '${title}')`);
    // close via Esc for clean state
    await page.evaluate(() => window.__priva.closePuzzle(false));
    await page.waitForTimeout(80);
  }

  // ---- 6. Solve Consent Switchboard end-to-end ----
  console.log("\n--- 6. Solve quest 1 (Consent Switchboard) ---");
  await page.evaluate(() => window.__priva.openPuzzle(0));
  await page.waitForTimeout(150);
  // Each toggle's default is the wrong state, so one click on each flips it to correct.
  const toggles = await page.$$("#puzzle .pz-toggle");
  check(toggles.length === 4, `Consent puzzle has 4 toggles (got ${toggles.length})`);
  for (const t of toggles) { await t.click(); await page.waitForTimeout(40); }
  await page.click("#puzzle .pz-confirm");
  await page.waitForTimeout(400);
  const puzzleClosed = !(await visible(page, "#puzzle"));
  check(puzzleClosed, "Puzzle closes on correct solution");
  const sigil1 = (await page.textContent("#sigilCount"))?.trim();
  check(sigil1 === "1/4", `Sigil count increments to 1/4 after solve (got '${sigil1}')`);
  const questDone = await page.evaluate(() => window.__priva.game.quests[0].done);
  check(questDone === true, "Quest 1 marked done in game state");

  // ---- 7. Audio mute toggle ----
  console.log("\n--- 7. Audio mute toggle ---");
  const muteBefore = (await page.textContent("#muteBtn"))?.trim();
  await page.click("#muteBtn");
  await page.waitForTimeout(80);
  const muteAfter = (await page.textContent("#muteBtn"))?.trim();
  check(muteBefore !== muteAfter && /off/i.test(muteAfter), `Mute toggles label ('${muteBefore}' -> '${muteAfter}')`);
  await page.click("#muteBtn"); // restore

  // ---- 8. Mobile responsive ----
  console.log("\n--- 8. Mobile 390x844 ---");
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mErrors = [];
  m.on("pageerror", (err) => { mErrors.push(err.message); console.log(`  [MOBILE PAGE ERROR] ${err.message}`); });
  m.on("console", (msg) => { if (msg.type() === "error") mErrors.push(msg.text()); });
  await m.goto(BASE, { waitUntil: "networkidle" });
  await m.waitForFunction(() => !!window.__priva, null, { timeout: 5000 }).catch(() => {});
  await m.click("#startBtn");
  await m.waitForTimeout(300);
  const touchMobile = await m.evaluate(() => {
    const el = document.getElementById("touch");
    return el ? getComputedStyle(el).display : "missing";
  });
  check(touchMobile !== "none" && touchMobile !== "missing", `Touch controls shown on mobile (display:${touchMobile})`);
  check(await visible(m, "#btnLeft") && await visible(m, "#btnJump"), "Mobile D-pad + jump buttons visible");
  const noScrollMobile = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
  check(noScrollMobile, "No horizontal scroll on mobile");
  check(mErrors.length === 0, `No errors on mobile (found ${mErrors.length})`);

  // ---- 9. Error-free run ----
  console.log("\n--- 9. Error-free run ---");
  check(pageErrors.length === 0, `No uncaught page errors (found ${pageErrors.length})`);
  check(consoleErrors.length === 0, `No console errors (found ${consoleErrors.length})`);

  await browser.close();
  server.close();

  console.log(`\n=== Results: ${PASS.length} passed, ${FAIL.length} failed ===`);
  if (FAIL.length) {
    console.log("FAILURES:");
    FAIL.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log("All checks passed.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  server.close();
  process.exit(1);
});

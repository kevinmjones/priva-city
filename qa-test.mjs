import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";

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

const OUT_DIR = mkdtempSync(join(tmpdir(), "qa-otl-56-"));
const OUT = (name) => join(OUT_DIR, name);

async function screenshot(page, name) {
  await page.screenshot({ path: OUT(name), fullPage: false });
  console.log(`  ✓ Screenshot saved: ${name}`);
}

async function getVisible(page, selector) {
  const el = await page.$(selector);
  if (!el) return null;
  const box = await el.boundingBox();
  return box && box.width > 0 && box.height > 0 ? el : null;
}

const PASS = [];
const FAIL = [];

function pass(msg) { PASS.push(msg); console.log(`  PASS: ${msg}`); }
function fail(msg) { FAIL.push(msg); console.log(`  FAIL: ${msg}`); }

async function findOptionButton(page, text) {
  // Use evaluate to find button whose text content contains the target string
  const found = await page.evaluate((substr) => {
    const buttons = document.querySelectorAll(".choices button");
    for (const btn of buttons) {
      if (btn.textContent.trim().includes(substr)) {
        btn.dataset.qaFound = "true";
        return true;
      }
    }
    return false;
  }, text);
  if (!found) return null;
  return page.$('[data-qa-found="true"]');
}

async function main() {
  console.log("=== QA Test Suite: OTL-56 Priva-city Polish Pass ===\n");

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const PORT = server.address().port;
  const BASE = `http://127.0.0.1:${PORT}`;
  console.log(`Server on ${BASE}\n`);

  const browser = await chromium.launch({ headless: true });
  let allPass = true;

  // ---- 1. Desktop 1440×900 ----
  console.log("--- 1. Desktop 1440×900 ---");
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  let pageErrors = [];
  let consoleErrors = [];
  page.on("pageerror", (err) => { pageErrors.push(err.message); console.log(`  [PAGE ERROR] ${err.message}`); });
  page.on("console", (msg) => { if (msg.type() === "error") { consoleErrors.push(msg.text()); console.log(`  [CONSOLE ERROR] ${msg.text()}`); } });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // HUD visible
  if (await getVisible(page, "#hud")) pass("Desktop: HUD visible");
  else { fail("Desktop: HUD not visible"); allPass = false; }
  if (await getVisible(page, "#game canvas")) pass("Desktop: game canvas visible");
  else { fail("Desktop: canvas not visible"); allPass = false; }
  if (await getVisible(page, "#quest-log")) pass("Desktop: quest log visible");
  else { fail("Desktop: quest log not visible"); allPass = false; }
  if (await getVisible(page, "#hint")) pass("Desktop: hint bar visible");
  else { fail("Desktop: hint not visible"); allPass = false; }

  // Touch controls should be hidden on desktop (>760px)
  const touchDesktop = await page.evaluate(() => window.getComputedStyle(document.getElementById("touch-controls")).display);
  if (touchDesktop === "none") pass("Desktop: touch controls hidden (correct)");
  else { fail(`Desktop: touch controls visible (display:${touchDesktop})`); allPass = false; }

  // No horizontal scroll
  const scrollW = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
  const vpW = await page.evaluate(() => document.documentElement.clientWidth);
  if (scrollW <= vpW + 2) pass("Desktop: no horizontal scroll");
  else { fail(`Desktop: horizontal scroll ${scrollW} > ${vpW}px`); allPass = false; }

  // HUD fields present
  const timerText = await page.$eval("#timer", (el) => el.textContent);
  if (/^\d{2}:\d{2}$/.test(timerText)) pass("Desktop: timer shows MM:SS format");
  else { fail(`Desktop: timer format bad: "${timerText}"`); allPass = false; }
  const codes1 = await page.$eval("#code-slots", (el) => el.textContent);
  if (codes1 === "-- -- --") pass("Desktop: initial code slots empty");
  else { fail(`Desktop: code slots not empty: "${codes1}"`); allPass = false; }
  const sigils1 = await page.$eval("#sigils", (el) => el.textContent);
  if (sigils1 === "0/4") pass("Desktop: sigils 0/4");
  else { fail(`Desktop: sigils: "${sigils1}"`); allPass = false; }

  await screenshot(page, "desktop-1440x900.png");

  await page.close();
  await ctx.close();

  // ---- 2. Mobile 390×844 ----
  console.log("\n--- 2. Mobile 390×844 ---");
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page = await ctx.newPage();
  pageErrors = [];
  consoleErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  if (await getVisible(page, "#hud")) pass("Mobile: HUD visible");
  else { fail("Mobile: HUD not visible"); allPass = false; }
  if (await getVisible(page, "#game canvas")) pass("Mobile: game canvas visible");
  else { fail("Mobile: canvas not visible"); allPass = false; }
  if (await getVisible(page, "#quest-log")) pass("Mobile: quest log visible");
  else { fail("Mobile: quest log not visible"); allPass = false; }
  if (await getVisible(page, "#hint")) pass("Mobile: hint bar visible");
  else { fail("Mobile: hint not visible"); allPass = false; }
  if (await getVisible(page, "#touch-controls")) pass("Mobile: touch controls visible");
  else { fail("Mobile: touch controls not visible"); allPass = false; }

  // No horizontal scroll
  const scrollW2 = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
  const vpW2 = await page.evaluate(() => document.documentElement.clientWidth);
  if (scrollW2 <= vpW2 + 2) pass("Mobile: no horizontal scroll");
  else { fail(`Mobile: horizontal scroll ${scrollW2} > ${vpW2}px`); allPass = false; }

  // Touch control size >= 54px
  const tcSize = await page.evaluate(() => {
    const btn = document.querySelector("#touch-controls button");
    const s = window.getComputedStyle(btn);
    return { w: parseFloat(s.width), h: parseFloat(s.height) };
  });
  if (tcSize.w >= 53 && tcSize.h >= 53) pass(`Mobile: touch controls ${Math.round(tcSize.w)}×${Math.round(tcSize.h)}px`);
  else { fail(`Mobile: touch controls too small ${tcSize.w}×${tcSize.h}`); allPass = false; }

  // No overlapping elements
  const overlaps = await page.evaluate(() => {
    const el = (id) => document.getElementById(id).getBoundingClientRect();
    const r = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
    const hud = el("hud"), quest = el("quest-log"), hint = el("hint"), touch = el("touch-controls");
    const issues = [];
    if (r(hud, quest)) issues.push("hud×quest");
    if (r(hud, hint)) issues.push("hud×hint");
    if (r(quest, hint)) issues.push("quest×hint");
    if (r(quest, touch)) issues.push("quest×touch");
    if (r(hint, touch)) issues.push("hint×touch");
    return issues;
  });
  if (overlaps.length === 0) pass("Mobile: no UI overlap");
  else { fail(`Mobile: overlap: ${overlaps.join(", ")}`); allPass = false; }

  await screenshot(page, "mobile-390x844.png");

  await page.close();
  await ctx.close();

  // ---- 3. Full Playthrough ----
  console.log("\n--- 3. Full Playthrough ---");
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  pageErrors = [];
  consoleErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const holdKey = async (key, durationMs) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(durationMs);
    await page.keyboard.up(key);
    await page.waitForTimeout(80);
  };

  const walkRight = async (durationMs, jumpEveryMs = 0) => {
    const started = Date.now();
    while (Date.now() - started < durationMs) {
      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(200);
      if (jumpEveryMs > 0 && (Date.now() - started) % jumpEveryMs < 300) {
        await page.keyboard.press("Space");
      }
    }
    await page.keyboard.up("ArrowRight");
    await page.waitForTimeout(300);
  };

  const getPromptText = async () => {
    return page.$eval("#promptText", (el) => el.textContent.trim());
  };

  const teleportPlayer = async (x) => {
    await page.evaluate((targetX) => {
      if (!window.__PRIVA_CITY_QA__) throw new Error("QA hooks unavailable");
      window.__PRIVA_CITY_QA__.movePlayerTo(targetX);
    }, x);
    await page.waitForTimeout(250);
  };

  const openPromptAt = async (label, x) => {
    await teleportPlayer(x);
    const prompt = await getPromptText();
    console.log(`  Prompt: "${prompt}"`);
    if (!prompt.includes(label)) return false;
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(400);
    return Boolean(await page.$("dialog[open]"));
  };

  const tryInteract = async (maxAttempts = 4) => {
    for (let i = 0; i < maxAttempts; i++) {
      await page.keyboard.press("KeyE");
      await page.waitForTimeout(500);
      const open = await page.$("dialog[open]");
      if (open) return true;
      // Move a bit more
      await holdKey("ArrowRight", 300);
    }
    return false;
  };

  const clickCorrectAnswer = async (text) => {
    const btn = await page.evaluate((substr) => {
      const buttons = document.querySelectorAll(".choices button");
      for (const b of buttons) {
        if (b.textContent.trim().includes(substr)) {
          b.click();
          return true;
        }
      }
      return false;
    }, text);
    await page.waitForTimeout(400);
    return btn;
  };

  // --- Challenge 1: Consent Arcade ---
  const initialPrompt = await getPromptText();
  if (initialPrompt.includes("Explore the districts")) pass("Initial state: exploration prompt visible before first interact zone");
  else { fail(`Initial state: unexpected prompt "${initialPrompt}"`); allPass = false; }

  // Player starts left of the Consent zone; teleport to the current designed beat for deterministic QA.
  let modalOpen = await openPromptAt("Consent Arcade", 610);
  if (modalOpen) {
    pass("Challenge 1: Consent Arcade modal opened");
  } else {
    fail("Challenge 1: modal never opened");
    allPass = false;
  }

  if (modalOpen) {
    await page.waitForTimeout(200);
    const clicked1 = await clickCorrectAnswer("Ask separately");
    if (clicked1) pass("Challenge 1: correct answer clicked");
    else { fail("Challenge 1: could not find correct answer button"); allPass = false; }
    await page.waitForTimeout(500);
    const success1 = await page.$("#challenge-result.result--success");
    if (success1) pass("Challenge 1: answer marked correct (green)");
    else { fail("Challenge 1: answer not marked correct"); allPass = false; }
    // Close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const after1 = await page.$eval("#code-slots", (el) => el.textContent);
    if (after1.includes("27")) pass("Challenge 1: code 27 in HUD");
    else { fail(`Challenge 1: code not in HUD: "${after1}"`); allPass = false; }
  }

  // --- Challenge 2: Rights Exchange ---
  console.log("  Moving to Rights Exchange...");
  let foundRights = await openPromptAt("Rights Exchange", 840);
  if (foundRights) pass("Challenge 2: found Rights Exchange via prompt");
  else { fail("Challenge 2: never reached Rights Exchange"); allPass = false; }

  modalOpen = foundRights;
  if (modalOpen) pass("Challenge 2: Rights Exchange modal opened");
  else { fail("Challenge 2: modal never opened"); allPass = false; }

  if (modalOpen) {
    await page.waitForTimeout(200);
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".choices button")).map(b => b.textContent.trim().substring(0, 80));
    });
    console.log(`  Available answers: ${JSON.stringify(buttons)}`);
    await screenshot(page, "challenge2-modal.png");
    const clicked2 = await clickCorrectAnswer("Send the resident");
    if (clicked2) pass("Challenge 2: correct answer clicked");
    else { fail("Challenge 2: could not find correct answer"); allPass = false; }
    await page.waitForTimeout(500);
    if (await page.$("#challenge-result.result--success")) pass("Challenge 2: answer marked correct");
    else { fail("Challenge 2: answer not marked correct"); allPass = false; }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  // --- Challenge 3: Retention Rail ---
  console.log("  Moving to Retention Rail...");
  let foundRetention = await openPromptAt("Retention Rail", 1330);
  if (foundRetention) pass("Challenge 3: found Retention Rail via prompt");
  else { fail("Challenge 3: never reached Retention Rail"); allPass = false; }

  modalOpen = foundRetention;
  if (modalOpen) pass("Challenge 3: Retention Rail modal opened");
  else { fail("Challenge 3: modal never opened"); allPass = false; }

  if (modalOpen) {
    await page.waitForTimeout(200);
    const clicked3 = await clickCorrectAnswer("Delete stale");
    if (clicked3) pass("Challenge 3: correct answer clicked");
    else { fail("Challenge 3: could not find correct answer"); allPass = false; }
    await page.waitForTimeout(500);
    if (await page.$("#challenge-result.result--success")) pass("Challenge 3: answer marked correct");
    else { fail("Challenge 3: answer not marked correct"); allPass = false; }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  const finalCodes = await page.$eval("#code-slots", (el) => el.textContent);
  if (finalCodes === "27 49 13") pass("HUD: all three code segments collected");
  else { fail(`HUD: code segments incomplete: "${finalCodes}"`); allPass = false; }

  // --- Vault ---
  console.log("  Moving to Vault...");
  let foundVault = await openPromptAt("Trust Hub", 1810);
  if (foundVault) pass("Vault: found Trust Hub via prompt");
  else { fail("Vault: never reached Trust Hub"); allPass = false; }

  modalOpen = foundVault;
  if (modalOpen) pass("Vault: Trust Hub modal opened");
  else { fail("Vault: modal never opened"); allPass = false; }

  if (modalOpen) {
    // Enter code 274913 via keypad
    const code = "274913";
    for (const digit of code) {
      await page.click(`[data-key="${digit}"]`);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(200);
    await page.click('[data-key="ok"]');
    await page.waitForTimeout(500);

    if (await page.$("#vault-result.result--success")) {
      pass("Vault: code 274913 accepted, success shown");
    } else {
      fail("Vault: code not accepted or success state missing");
      allPass = false;
    }

    if (await page.$("#restart-game")) pass("Vault: restart button present");
    else { fail("Vault: restart button missing"); allPass = false; }

    // Quest log check
    const questClasses = await page.$$eval("#quest-list li", (items) => items.map((li) => li.className));
    const doneCount = questClasses.filter((c) => c === "done").length;
    if (doneCount === 4) pass("Quest log: 4/4 done");
    else { fail(`Quest log: ${doneCount}/4 done`); allPass = false; }

    // Test restart
    await page.click("#restart-game");
    await page.waitForTimeout(1500);

    const resetCodes = await page.$eval("#code-slots", (el) => el.textContent);
    const resetSigils = await page.$eval("#sigils", (el) => el.textContent);
    if (resetCodes === "-- -- --" && resetSigils === "0/4") pass("Restart: state reset correctly");
    else { fail(`Restart: state not reset (codes:"${resetCodes}" sigils:"${resetSigils}")`); allPass = false; }

    await screenshot(page, "completion-playthrough.png");
  }

  // Page errors check
  if (pageErrors.length > 0) {
    fail(`Page errors: ${pageErrors.join("; ")}`);
    allPass = false;
  } else {
    pass("No page errors");
  }

  await page.close();
  await ctx.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));

  // ---- Summary ----
  console.log(`\n=== QA Summary ===`);
  console.log(`Screenshots: ${OUT_DIR}/`);
  console.log(`Passed: ${PASS.length}`);
  console.log(`Failed: ${FAIL.length}`);
  console.log(allPass ? "\nRESULT: PASS ✓" : "\nRESULT: FAIL ✗");
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

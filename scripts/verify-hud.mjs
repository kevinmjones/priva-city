// verify-hud.mjs — OTL-97 HUD sizing/spacing regression gate.
// Boots the in-game HUD at several viewports and asserts, via live bounding
// rects, that the corner HUD clusters never overlap and that the MAIN QUEST
// panel stays within its width budget. Captures an "after" screenshot at each
// size. Exits 1 on any violation so this can run in the art-lock gate.
import { chromium } from "playwright";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join } from "path";

const ROOT = process.cwd();
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const buf = await readFile(join(ROOT, p));
    res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" });
    res.end(buf);
  } catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const OUT = "docs/visual-audit";

// HUD clusters that must never intersect each other.
const IDS = ["hud-brand", "questLog", "muteBtn", "controlBar", "interactPrompt"];

function intersects(a, b) {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

// Viewports: native capture width from the issue (1352), a 16:9 desktop, and a
// smaller desktop window. Touch viewports hide the control bar so they're
// covered by capture.mjs's mobile shot, not the overlap gate.
const VIEWPORTS = [
  { name: "1352x761", w: 1352, h: 761 },
  { name: "1440x810", w: 1440, h: 810 },
  { name: "1024x640", w: 1024, h: 640 },
];

const browser = await chromium.launch();
const failures = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  await page.goto(base, { waitUntil: "networkidle" });
  // Start the game, clear the intro banner, and force the interact prompt visible
  // so we test the worst case (every HUD element on screen at once).
  await page.evaluate(() => {
    window.__priva.startGame();
    window.__priva.game.bannerT = 0;
    document.getElementById("interactPrompt").classList.add("show");
  });
  await page.waitForTimeout(300);

  const rects = await page.evaluate((ids) => {
    const out = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && getComputedStyle(el).display !== "none") {
        const r = el.getBoundingClientRect();
        out[id] = { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: r.width };
      }
    }
    return { rects: out, vw: window.innerWidth, scale: getComputedStyle(document.documentElement).getPropertyValue("--hud-scale") };
  }, IDS);

  // 1. No two HUD clusters overlap.
  const present = Object.keys(rects.rects);
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const a = present[i], b = present[j];
      if (intersects(rects.rects[a], rects.rects[b])) {
        failures.push(`${vp.name}: ${a} overlaps ${b}`);
      }
    }
  }

  // 2. MAIN QUEST panel width budget (AC#2: ~22–25% of viewport width).
  const ql = rects.rects.questLog;
  if (ql) {
    const frac = ql.w / rects.vw;
    if (frac > 0.27) failures.push(`${vp.name}: questLog is ${(frac * 100).toFixed(1)}% of width (>27%)`);
    console.log(`  ${vp.name}: questLog ${(frac * 100).toFixed(1)}% width, scale=${rects.scale.trim()}`);
  }

  await page.screenshot({ path: join(OUT, `otl97-after-hud-${vp.name}.png`) });
  await page.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`\nHUD GATE FAILED — ${failures.length} issue(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nHUD gate passed: no overlaps, quest panel within width budget.");

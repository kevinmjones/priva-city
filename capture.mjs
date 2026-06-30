// capture.mjs — headless screenshots of the full build for the art-lock gate (OTL-82).
// Renders every shipping surface, fails loudly (exit 1) on any console/page error.
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
    const file = join(ROOT, p);
    const buf = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end("nf");
  }
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const base = `http://localhost:${port}`;
const OUT = "docs/visual-audit";

const browser = await chromium.launch();
const allErrors = [];

async function shot(name, w, h, fn) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  if (fn) await fn(page);
  await page.screenshot({ path: join(OUT, name) });
  if (errors.length) { console.log(`  ! ${name} errors:`, errors.slice(0, 4)); allErrors.push(...errors.map((e) => `${name}: ${e}`)); }
  else console.log(`  ✓ ${name}`);
  await page.close();
  return errors;
}

const wait = (p, ms) => p.waitForTimeout(ms);

console.log("Capturing full build (art-lock gate)...");

// 1. Title screen
await shot("v2-title-1440x810.png", 1440, 810, async (p) => { await wait(p, 800); });

// 2. Gameplay — walk the player toward the kiosk, then screenshot the scene
await shot("v2-gameplay-1440x810.png", 1440, 810, async (p) => {
  await p.evaluate(() => window.__priva.startGame());
  await wait(p, 300);
  // walk right toward kiosk
  await p.keyboard.down("KeyD");
  await wait(p, 2600);
  await p.keyboard.up("KeyD");
  await wait(p, 500);
});

// 3. Puzzle overlay — open Quest 1 (Consent Switchboard) at the kiosk
await shot("v2-puzzle-1440x810.png", 1440, 810, async (p) => {
  await p.evaluate(() => {
    const g = window.__priva;
    g.startGame();
    g.player.x = g.QUEST_POS[0];
    g.openPuzzle(0);
  });
  await wait(p, 400);
});

// 4. Success / banner — resolve Quest 1 successfully
await shot("v2-success-1440x810.png", 1440, 810, async (p) => {
  await p.evaluate(() => {
    const g = window.__priva;
    g.startGame();
    g.player.x = g.QUEST_POS[0];
    g.openPuzzle(0);
    g.closePuzzle(true);
  });
  await wait(p, 300);
});

// 5. Mobile portrait
await shot("v2-mobile-390x844.png", 390, 844, async (p) => {
  await p.evaluate(() => window.__priva.startGame());
  await wait(p, 300);
  await p.keyboard.down("KeyD"); await wait(p, 1500); await p.keyboard.up("KeyD");
  await wait(p, 400);
});

// 5b. HUD legibility — 1440 desktop (acceptance criterion: quest panel legible at 1440)
await shot("v2-hud-1440x810.png", 1440, 810, async (p) => {
  await p.evaluate(() => { window.__priva.startGame(); window.__priva.game.bannerT = 0; });
  await wait(p, 400);
});

// 5c. HUD legibility — mobile (acceptance criterion: scales on mobile)
await shot("v2-hud-mobile-390x844.png", 390, 844, async (p) => {
  await p.evaluate(() => { window.__priva.startGame(); window.__priva.game.bannerT = 0; });
  await wait(p, 400);
});

// 6. Clean hero shot (facade + neon + kiosk + character) — no banner
await shot("v2-hero-1440x810.png", 1440, 810, async (p) => {
  await p.evaluate(() => {
    const g = window.__priva;
    g.startGame();
    g.player.x = 1300; g.player.face = -1;
    g.game.bannerT = 0;       // clear intro banner for a clean frame
    g.game.camX = 1300 - 240;
  });
  await wait(p, 700);
});

// 7. Side-by-side vs Grid City reference for the art-bar gate
{
  const page = await browser.newPage({ viewport: { width: 1480, height: 480 }, deviceScaleFactor: 1 });
  const html = `<!doctype html><html><head><style>
    *{margin:0;box-sizing:border-box;font-family:monospace}
    body{background:#0a0d1c;color:#cfe1ff;padding:14px}
    .row{display:flex;gap:14px}
    .col{flex:1}
    .col h3{font-size:13px;margin-bottom:6px;letter-spacing:1px}
    .a h3{color:#ff6a8d}.b h3{color:#34e7ff}
    img{width:100%;display:block;border:1px solid #24305c;border-radius:4px}
    .tag{font-size:10px;color:#7d8db5;margin-top:5px}
  </style></head><body><div class="row">
    <div class="col a"><h3>GRID CITY — board target</h3><img src="${base}/assets/reference/board-target-reference.png"><div class="tag">reference bar</div></div>
    <div class="col b"><h3>PRIVA-CITY v2 — Phase 1 build (ours)</h3><img src="${base}/docs/visual-audit/v2-hero-1440x810.png"><div class="tag">pixel-art · parallax · lighting · animated character · 4 live quests</div></div>
  </div></body></html>`;
  await page.setContent(html, { waitUntil: "networkidle" });
  await wait(page, 500);
  await page.screenshot({ path: join(OUT, "v2-sidebyside-vs-gridcity.png") });
  await page.close();
}

await browser.close();
server.close();

if (allErrors.length) {
  console.error(`\nART-LOCK GATE FAILED — ${allErrors.length} surface error(s):`);
  for (const e of allErrors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("Done -> docs/visual-audit/  (art-lock gate: all surfaces clean)");

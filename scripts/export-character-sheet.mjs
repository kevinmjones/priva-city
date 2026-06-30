// export-character-sheet.mjs — Export the character sprite sheet as PNG
import { chromium } from "playwright";
import { createServer } from "http";
import { readFile, writeFile, mkdir } from "fs/promises";
import { extname, join } from "path";

const ROOT = process.cwd();
const TYPES = {
  ".html": "text/html", ".css": "text/css",
  ".js": "text/javascript", ".mjs": "text/javascript",
  ".png": "image/png", ".json": "application/json",
};

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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 400 } });

// Log all page errors and console messages for diagnosis
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.error("CONSOLE ERR:", m.text());
});

await page.goto(`${base}/scripts/char-export.html`, { waitUntil: "networkidle" });

// Wait for export to complete
let done = false;
for (let i = 0; i < 20; i++) {
  done = await page.evaluate(() => window.__exportDone === true);
  if (done) break;
  await page.waitForTimeout(200);
}

if (!done) {
  console.error("Export timed out — __exportDone not set");
  process.exit(1);
}

const [sheetUrl, previewUrl, fw, fh, frames] = await page.evaluate(() => [
  window.__sheetDataUrl,
  window.__previewDataUrl,
  window.__fw,
  window.__fh,
  window.__frames,
]);

await mkdir("assets/sprites", { recursive: true });

// Save raw sprite sheet
const sheetBuf = Buffer.from(sheetUrl.replace(/^data:image\/png;base64,/, ""), "base64");
const sheetPath = `assets/sprites/character-sheet-${fw}x${fh}x${frames}.png`;
await writeFile(sheetPath, sheetBuf);
console.log(`Saved: ${sheetPath}  (${sheetBuf.length} bytes)`);

// Save zoomed preview
const previewBuf = Buffer.from(previewUrl.replace(/^data:image\/png;base64,/, ""), "base64");
const previewPath = "assets/sprites/character-preview-6x.png";
await writeFile(previewPath, previewBuf);
console.log(`Saved: ${previewPath}  (${previewBuf.length} bytes)`);

await browser.close();
server.close();
console.log("Done.");

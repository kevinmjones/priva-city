// art.js — Procedural pixel-art asset generator for Priva-city v2.
//
// PIPELINE PIVOT (OTL-75): instead of drawing flat vector rectangles at runtime,
// we author real raster pixel-art into offscreen canvases at load time. Every
// sprite is built pixel-by-pixel with palettes, shading, dithering and texture,
// then blitted with nearest-neighbour scaling. This is original art (no Grid
// City assets) generated deterministically from a seed so it is reproducible.

// ---- deterministic RNG (mulberry32) ----------------------------------------
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- tiny pixel canvas helper ----------------------------------------------
export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { c, ctx, w, h };
}

function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, 1, 1);
}
function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

// Palettes -------------------------------------------------------------------
export const PAL = {
  sky: ["#0b0f2a", "#11173d", "#1a2150", "#2a2f63"],
  skyGlow: "#3a2f6e",
  moon: "#dfe6ff",
  star: "#aab4ff",
  farTower: ["#141a3a", "#1a2147", "#202a59"],
  midTower: ["#1d2140", "#262c52", "#313a6b"],
  nearWall: ["#2a2438", "#352b47", "#221c30"],
  brick: ["#3a2c3e", "#473247", "#2e2436"],
  winLitWarm: ["#ffd479", "#ffb74d", "#9a6b2e"],
  winLitCool: ["#7fd4ff", "#4aa8e0", "#2b6a93"],
  winDark: ["#10131f", "#161a2b"],
  neonPink: "#ff4d8d",
  neonCyan: "#34e7ff",
  neonGreen: "#5dff9b",
  lampWarm: "#ffce7a",
  street: ["#171a26", "#1d2130", "#12151f"],
  curb: ["#2b3040", "#373d52"],
  skin: ["#e7b58c", "#c98e64"],
  hoodie: ["#2f6f6b", "#225350", "#3c8a85"],
  pants: ["#2a2f45", "#1f2335"],
  hair: ["#2a211c", "#1c1612"],
};

function pick(rand, arr) { return arr[(rand() * arr.length) | 0]; }

// ---- Parallax sky + skyline layers -----------------------------------------
// Returns a wide canvas to be tiled/scrolled. Each layer scrolls at its own
// rate in the renderer to create depth.

export function buildSky(w, h) {
  const { c, ctx } = makeCanvas(w, h);
  // vertical gradient
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#070a20");
  g.addColorStop(0.45, "#0d1234");
  g.addColorStop(0.8, "#1a1c47");
  g.addColorStop(1, "#33265f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const rand = rng(1337);
  // stars
  for (let i = 0; i < w * 0.35; i++) {
    const x = (rand() * w) | 0;
    const y = (rand() * h * 0.6) | 0;
    const tw = rand();
    ctx.globalAlpha = 0.3 + tw * 0.7;
    px(ctx, x, y, tw > 0.85 ? PAL.moon : PAL.star);
  }
  ctx.globalAlpha = 1;

  // moon with soft halo
  const mx = w * 0.78, my = h * 0.22, mr = 14;
  const halo = ctx.createRadialGradient(mx, my, 2, mx, my, mr * 4);
  halo.addColorStop(0, "rgba(150,170,255,0.55)");
  halo.addColorStop(1, "rgba(150,170,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
  ctx.fillStyle = PAL.moon;
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  // crater shading
  ctx.fillStyle = "rgba(120,140,210,0.5)";
  ctx.beginPath(); ctx.arc(mx + 4, my - 3, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx - 5, my + 4, 3, 0, Math.PI * 2); ctx.fill();
  return c;
}

// One skyline band of silhouette towers with lit windows.
export function buildSkyline(w, h, opts) {
  const { palette, seed, density, litChance, warm } = opts;
  const { c, ctx } = makeCanvas(w, h);
  const rand = rng(seed);
  let x = -((rand() * 20) | 0);
  while (x < w) {
    const bw = 18 + ((rand() * 30) | 0);
    const bh = (h * (0.35 + rand() * 0.6)) | 0;
    const top = h - bh;
    const body = pick(rand, palette);
    rect(ctx, x, top, bw, bh, body);
    // edge highlight
    rect(ctx, x, top, 1, bh, "rgba(255,255,255,0.05)");
    rect(ctx, x + bw - 1, top, 1, bh, "rgba(0,0,0,0.25)");
    // rooftop detail
    if (rand() > 0.6) rect(ctx, x + 2, top - 3, 3, 3, body);
    if (rand() > 0.7) { rect(ctx, x + bw - 6, top - 5, 1, 5, body); px(ctx, x + bw - 6, top - 6, PAL.neonPink); }
    // windows grid
    for (let wy = top + 4; wy < h - 3; wy += 5) {
      for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
        if (rand() < density) {
          const lit = rand() < litChance;
          let col;
          if (lit) col = warm && rand() > 0.4 ? pick(rand, PAL.winLitWarm) : pick(rand, PAL.winLitCool);
          else col = pick(rand, PAL.winDark);
          rect(ctx, wx, wy, 2, 3, col);
          if (lit) px(ctx, wx, wy, "rgba(255,255,255,0.35)");
        }
      }
    }
    x += bw + 2 + ((rand() * 8) | 0);
  }
  return c;
}

// ---- Foreground building facade (the quest hub) ----------------------------
// A detailed, lit street-level building with brick texture, windows, neon sign,
// door, fire escape and AC units. This is the hero asset.
export function buildFacade(w, h, seed, label) {
  const { c, ctx } = makeCanvas(w, h);
  const rand = rng(seed);
  const wallBase = pick(rand, PAL.nearWall);
  rect(ctx, 0, 0, w, h, wallBase);

  // brick texture
  for (let y = 0; y < h; y += 4) {
    const off = (y / 4) % 2 === 0 ? 0 : 4;
    for (let x = -off; x < w; x += 8) {
      const shade = pick(rand, PAL.brick);
      rect(ctx, x, y, 7, 3, shade);
      rect(ctx, x, y, 7, 1, "rgba(255,255,255,0.04)");
    }
  }
  // mortar grime / vignette
  const grime = ctx.createLinearGradient(0, 0, 0, h);
  grime.addColorStop(0, "rgba(0,0,0,0.35)");
  grime.addColorStop(0.5, "rgba(0,0,0,0)");
  grime.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = grime; ctx.fillRect(0, 0, w, h);

  // rows of windows (lit/dark) with sills + glow
  const cols = Math.floor((w - 16) / 26);
  const rows = Math.floor((h - 40) / 30);
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const wx = 12 + col * 26;
      const wy = 8 + r * 30;
      const lit = rand() > 0.32;
      // frame
      rect(ctx, wx - 1, wy - 1, 16, 22, "#0c0d16");
      const glassCol = lit ? pick(rand, PAL.winLitWarm) : "#0f1320";
      rect(ctx, wx, wy, 14, 20, glassCol);
      if (lit) {
        rect(ctx, wx, wy, 14, 6, "rgba(255,255,255,0.18)");
        // silhouette in window sometimes
        if (rand() > 0.7) rect(ctx, wx + 5, wy + 8, 4, 12, "rgba(0,0,0,0.4)");
      }
      // mullions
      rect(ctx, wx + 6, wy, 2, 20, "#0c0d16");
      rect(ctx, wx, wy + 9, 14, 2, "#0c0d16");
      // sill
      rect(ctx, wx - 2, wy + 20, 18, 2, pick(rand, PAL.curb));
    }
  }

  // fire escape (left third)
  const feX = 6;
  for (let y = 26; y < h - 18; y += 26) {
    rect(ctx, feX, y, 40, 2, "#15171f");
    for (let bx = feX; bx < feX + 40; bx += 3) px(ctx, bx, y - 2, "#1b1e29");
    rect(ctx, feX, y, 2, 26, "#15171f");
    rect(ctx, feX + 38, y, 2, 26, "#15171f");
  }

  // door at street level (the entrance)
  const dx = (w / 2 - 14) | 0, dh = 34, dy = h - dh;
  rect(ctx, dx - 3, dy - 4, 34, dh + 4, "#0a0b12");
  rect(ctx, dx, dy, 28, dh, "#171a26");
  rect(ctx, dx + 2, dy + 2, 11, dh - 4, "#23283a");
  rect(ctx, dx + 15, dy + 2, 11, dh - 4, "#23283a");
  px(ctx, dx + 11, dy + dh / 2, PAL.lampWarm);
  px(ctx, dx + 17, dy + dh / 2, PAL.lampWarm);
  // warm light spill from doorway
  const spill = ctx.createRadialGradient(dx + 14, dy + 8, 2, dx + 14, dy + 8, 40);
  spill.addColorStop(0, "rgba(255,200,120,0.5)");
  spill.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = spill; ctx.fillRect(dx - 26, dy - 26, 80, dh + 26);

  // AC units
  for (let i = 0; i < 3; i++) {
    const ax = 30 + ((rand() * (w - 60)) | 0);
    const ay = 20 + ((rand() * (h - 80)) | 0);
    rect(ctx, ax, ay, 9, 6, "#23283a");
    rect(ctx, ax, ay, 9, 1, "#3a4258");
    rect(ctx, ax + 1, ay + 4, 7, 1, "#11141d");
  }
  return { canvas: c, doorX: dx + 14, doorTopY: h - dh };
}

// ---- Neon sign -------------------------------------------------------------
export function buildNeonSign(text, color) {
  const cw = text.length * 11 + 12;
  const ch = 22;
  const { c, ctx } = makeCanvas(cw, ch);
  // dark mounting board
  rect(ctx, 0, 0, cw, ch, "#0a0c18");
  rect(ctx, 0, 0, cw, 1, "#1a2244");
  rect(ctx, 0, ch - 1, cw, 1, "#05060e");
  // brackets
  rect(ctx, 2, 4, 1, ch - 8, "#1a2244");
  rect(ctx, cw - 3, 4, 1, ch - 8, "#1a2244");
  ctx.font = "bold 11px monospace";
  ctx.textBaseline = "middle";
  // outer glow
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillText(text, 7, ch / 2 + 1);
  ctx.fillText(text, 7, ch / 2 + 1);
  ctx.shadowBlur = 0;
  // bright core
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.85;
  ctx.fillText(text, 7, ch / 2 + 1);
  ctx.globalAlpha = 1;
  return c;
}

// ---- Foreground depth prop: street planter / hedge silhouette --------------
export function buildPlanter(w) {
  const { c, ctx } = makeCanvas(w, 26);
  const rand = rng(w * 13 + 5);
  // trough
  rect(ctx, 0, 16, w, 10, "#10131f");
  rect(ctx, 0, 16, w, 2, "#1c2233");
  // foliage clumps
  for (let x = 1; x < w; x += 3) {
    const top = 4 + ((rand() * 8) | 0);
    rect(ctx, x, top, 3, 18 - (top - 4), "#0c2a1e");
    px(ctx, x + 1, top, "#14402c");
    if (rand() > 0.85) px(ctx, x + 1, top + 2, "#1d6e44"); // faint lit leaf
  }
  return c;
}

// ---- Street + sidewalk -----------------------------------------------------
export function buildStreet(w, h) {
  const { c, ctx } = makeCanvas(w, h);
  const rand = rng(99);
  // sidewalk
  rect(ctx, 0, 0, w, h, PAL.street[0]);
  for (let y = 0; y < h; y += 2) {
    rect(ctx, 0, y, w, 1, pick(rand, PAL.street));
  }
  // curb line
  rect(ctx, 0, 0, w, 3, PAL.curb[0]);
  rect(ctx, 0, 0, w, 1, PAL.curb[1]);
  // paving cracks + manholes + puddles
  for (let x = 0; x < w; x += 24) {
    rect(ctx, x, 4, 1, h - 4, "rgba(0,0,0,0.3)");
  }
  for (let i = 0; i < w / 120; i++) {
    const px0 = (rand() * w) | 0;
    // puddle reflection (cool)
    const pg = ctx.createLinearGradient(0, 6, 0, 16);
    pg.addColorStop(0, "rgba(80,120,200,0.18)");
    pg.addColorStop(1, "rgba(80,120,200,0)");
    ctx.fillStyle = pg;
    ctx.fillRect(px0, 6, 30, 10);
  }
  return c;
}

// ---- Street lamp (with warm glow handled in renderer) ----------------------
export function buildLamp() {
  const { c, ctx } = makeCanvas(14, 60);
  rect(ctx, 6, 6, 2, 54, "#1b1e29");
  rect(ctx, 6, 6, 1, 54, "#2b3142");
  // arm + head
  rect(ctx, 6, 6, 6, 2, "#1b1e29");
  rect(ctx, 10, 6, 4, 5, "#23283a");
  rect(ctx, 11, 8, 2, 3, PAL.lampWarm);
  // base
  rect(ctx, 4, 58, 6, 2, "#15171f");
  return c;
}

// ---- Animated character (privacy operative in a teal hoodie) ---------------
// 16x26 frames: idle(1) + walk(4) drawn pixel-by-pixel with shading.
export function buildCharacter() {
  const FW = 16, FH = 26, frames = 6;
  const { c, ctx } = makeCanvas(FW * frames, FH);

  const draw = (ox, legPhase, armPhase, bob) => {
    const sk = PAL.skin, hd = PAL.hoodie, pn = PAL.pants, hr = PAL.hair;
    const cx = ox + 8;
    const y = bob;
    // shadow handled by renderer
    // legs
    const lLeg = Math.round(legPhase);
    const rLeg = -lLeg;
    rect(ctx, cx - 3, y + 18, 3, 6 + Math.max(0, -lLeg), pn[0]);
    rect(ctx, cx + 1, y + 18, 3, 6 + Math.max(0, -rLeg), pn[1]);
    // feet
    rect(ctx, cx - 4 + lLeg, y + 23, 4, 2, "#15151f");
    rect(ctx, cx + 1 - lLeg, y + 23, 4, 2, "#15151f");
    // torso / hoodie
    rect(ctx, cx - 4, y + 9, 9, 10, hd[1]);
    rect(ctx, cx - 4, y + 9, 9, 3, hd[2]); // lit top
    rect(ctx, cx - 4, y + 9, 2, 10, hd[0]); // shaded left
    // hood collar
    rect(ctx, cx - 3, y + 7, 7, 3, hd[2]);
    // arms swinging
    rect(ctx, cx - 5, y + 10 + Math.round(armPhase), 2, 7, hd[0]);
    rect(ctx, cx + 5, y + 10 - Math.round(armPhase), 2, 7, hd[2]);
    // hands
    px(ctx, cx - 5, y + 17 + Math.round(armPhase), sk[1]);
    px(ctx, cx + 6, y + 17 - Math.round(armPhase), sk[1]);
    // head
    rect(ctx, cx - 3, y + 1, 7, 7, sk[0]);
    rect(ctx, cx - 3, y + 1, 7, 2, sk[1]); // brow shade
    rect(ctx, cx - 3, y + 1, 2, 7, sk[1]);
    // hair / hood over head
    rect(ctx, cx - 4, y, 9, 3, hr[0]);
    rect(ctx, cx - 4, y, 2, 5, hr[1]);
    rect(ctx, cx + 3, y, 2, 5, hr[1]);
    // eye glint (cyber visor)
    px(ctx, cx + 1, y + 4, PAL.neonCyan);
    px(ctx, cx + 2, y + 4, "#bff6ff");
  };

  // frame 0: idle
  draw(0, 0, 0, 1);
  // walk frames 1..4
  const phases = [
    [3, 1.5], [0, 0], [-3, -1.5], [0, 0],
  ];
  for (let i = 0; i < 4; i++) {
    draw((i + 1) * FW, phases[i][0], phases[i][1], i % 2 === 0 ? 0 : 1);
  }
  // frame 5: interact (arms up to terminal)
  draw(5 * FW, 0, -3, 0);
  return { canvas: c, fw: FW, fh: FH, frames };
}

// ---- Data-broker kiosk (the quest interactable) ----------------------------
export function buildKiosk() {
  const { c, ctx } = makeCanvas(26, 38);
  // pedestal
  rect(ctx, 4, 10, 18, 26, "#1b2030");
  rect(ctx, 4, 10, 18, 2, "#2c3448");
  rect(ctx, 4, 10, 2, 26, "#0f131d");
  rect(ctx, 20, 10, 2, 26, "#0f131d");
  // screen
  rect(ctx, 6, 13, 14, 12, "#06121a");
  rect(ctx, 7, 14, 12, 10, "#0a2a3a");
  // scanlines + data glyphs
  for (let y = 14; y < 24; y += 2) rect(ctx, 7, y, 12, 1, "rgba(52,231,255,0.18)");
  rect(ctx, 8, 15, 5, 1, PAL.neonCyan);
  rect(ctx, 8, 18, 8, 1, "#1d6e8a");
  rect(ctx, 8, 21, 4, 1, PAL.neonPink);
  // top beacon
  rect(ctx, 12, 4, 2, 6, "#1b2030");
  px(ctx, 12, 3, PAL.neonPink);
  // feet
  rect(ctx, 4, 36, 4, 2, "#0f131d");
  rect(ctx, 18, 36, 4, 2, "#0f131d");
  return c;
}

// ---- Fog band --------------------------------------------------------------
export function buildFog(w, h) {
  const { c, ctx } = makeCanvas(w, h);
  const rand = rng(7);
  for (let i = 0; i < 60; i++) {
    const x = (rand() * w) | 0;
    const y = (rand() * h) | 0;
    const r = 20 + ((rand() * 60) | 0);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(120,140,200,0.05)");
    g.addColorStop(1, "rgba(120,140,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return c;
}

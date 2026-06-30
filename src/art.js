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
  hoodie: ["#2f8f86", "#236f68", "#4fd0c0"],
  hoodieRim: "#7df6e4",
  pants: ["#2a2f45", "#1f2335"],
  hair: ["#2a211c", "#1c1612"],
  outline: "#04050c",
  // continuous street-level storefront wall (kills the mid-ground dead band)
  shopWall: ["#241d30", "#2c2438", "#1c1726"],
  shopWin: ["#ffd479", "#ffb74d", "#ffe6a8"],
  awning: ["#b03555", "#7a2440", "#e0617f"],
  awningCool: ["#2f7d8c", "#1f5662", "#46b3c4"],
  // foreground street furniture silhouettes
  fg: ["#04050c", "#080b16", "#0d1322"],
  fgRim: "rgba(120,150,210,0.4)",
  // Phase 1 warm accent tokens — break cyan/magenta fatigue
  warmAmber: "#d4841a",   // primary warm accent; ~180° from cyan
  warmGold: "#f5a623",    // bright warm highlight for signage
  warmRust: "#9a3f1a",    // warm shadow depth
  neonOrange: "#ff7b30",  // surveillance warning indicator
  tealDark: "#0d2532",    // low-saturation teal (midground alternative to pure cyan)
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

  // striped awning over the doorway (mid-detail vs Grid City)
  const awY = dy - 9, awW = 40, awX = dx + 14 - awW / 2;
  rect(ctx, awX, awY, awW, 2, "#0b0c14");
  for (let i = 0; i < awW; i += 6) {
    rect(ctx, awX + i, awY + 2, 3, 6, PAL.awning[0]);
    rect(ctx, awX + i + 3, awY + 2, 3, 6, PAL.awning[1]);
  }
  rect(ctx, awX, awY + 2, awW, 1, PAL.awning[2]); // lit lip
  // scalloped fringe
  for (let i = 0; i < awW; i += 6) px(ctx, awX + i + 1, awY + 8, PAL.awning[1]);

  // vent pipes + conduit running up the wall (right third)
  const pX = w - 40;
  rect(ctx, pX, 12, 2, h - 30, "#15171f");
  rect(ctx, pX, 12, 1, h - 30, "#2b3142");
  for (let y = 24; y < h - 24; y += 22) rect(ctx, pX - 1, y, 4, 2, "#1b1e29"); // brackets
  // hanging vines off the fire escape (left)
  for (let i = 0; i < 5; i++) {
    const vx = 12 + i * 8, vh = 10 + ((rand() * 14) | 0);
    rect(ctx, vx, 28, 1, vh, "#163a26");
    px(ctx, vx, 28 + vh, "#1d6e44");
  }

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

// ---- Continuous street-level storefront wall -------------------------------
// A lit ground-floor facade band that runs the whole level, sitting directly
// behind the sidewalk. Fills the mid-ground "dead band" so the scene never
// jumps from skyline straight to bare floor. (Lens: uniform connectedness.)
export function buildShopRow(w, h) {
  const { c, ctx } = makeCanvas(w, h);
  const rand = rng(53);
  // dark base wall with brick speckle
  rect(ctx, 0, 0, w, h, PAL.shopWall[2]);
  for (let y = 2; y < h; y += 4) {
    for (let x = (y % 8 ? 0 : 4); x < w; x += 8) {
      rect(ctx, x, y, 7, 3, pick(rand, PAL.shopWall));
    }
  }
  rect(ctx, 0, h - 4, w, 4, "#0c0e16"); // grounding shadow at the pavement
  // repeating storefront modules
  const MOD = 60;
  for (let x = 0; x < w; x += MOD) {
    const lit = rand() > 0.25;
    const cool = rand() > 0.6;
    // shopfront window
    const wy = 8;
    rect(ctx, x + 6, wy - 2, 30, h - wy - 2, "#0a0c14"); // frame
    const glass = lit ? (cool ? "#1d4a5e" : pick(rand, PAL.shopWin)) : "#0e1320";
    rect(ctx, x + 8, wy, 26, h - wy - 5, glass);
    if (lit) {
      rect(ctx, x + 8, wy, 26, 4, "rgba(255,255,255,0.18)");
      // interior silhouettes (shelves / patrons)
      for (let sx = x + 10; sx < x + 32; sx += 5) {
        if (rand() > 0.5) rect(ctx, sx, wy + 6, 3, h - wy - 12, "rgba(0,0,0,0.45)");
      }
    }
    // mullions
    rect(ctx, x + 20, wy, 1, h - wy - 5, "#0a0c14");
    // awning
    if (rand() > 0.4) {
      const aw = cool ? PAL.awningCool : PAL.awning;
      const ay = 4;
      for (let i = 0; i < 30; i += 6) {
        rect(ctx, x + 6 + i, ay, 3, 4, aw[0]);
        rect(ctx, x + 9 + i, ay, 3, 4, aw[1]);
      }
      rect(ctx, x + 6, ay + 4, 30, 1, aw[2]);
    }
    // doorway between modules with warm spill
    const ddx = x + 40;
    rect(ctx, ddx, h - 18, 12, 18, "#0a0b12");
    rect(ctx, ddx + 2, h - 16, 8, 16, lit ? "#241a12" : "#10131d");
    if (lit) px(ctx, ddx + 6, h - 8, PAL.lampWarm);
    // hanging neon dot
    if (rand() > 0.55) px(ctx, x + 50, 6, cool ? PAL.neonCyan : PAL.neonPink);
  }
  return c;
}

// ---- Midground wall-detail band (Phase 1 density pass) --------------------
// A 40px strip that sits ABOVE the shopRow at the same 0.62 parallax, showing
// the upper building face: surveillance cameras, conduit runs, neon signage,
// and wall-mounted environmental props. Together with shopRow this makes a
// continuous 88px deep building facade band from y=122 to y=210.
export function buildWallDetails(w, h) {
  const { c, ctx } = makeCanvas(w, h);
  const rand = rng(83);

  // dark wall base — same family as shopWall, seamless join at bottom edge
  rect(ctx, 0, 0, w, h, PAL.shopWall[2]);
  for (let y = 2; y < h; y += 4) {
    for (let x = (y % 8 ? 0 : 4); x < w; x += 8) {
      rect(ctx, x, y, 7, 3, pick(rand, PAL.shopWall));
    }
  }
  // dark lower edge blends into shopRow top
  rect(ctx, 0, h - 3, w, 3, "#0c0e16");
  // subtle upper shadow from the overhanging building mass above
  rect(ctx, 0, 0, w, 2, "rgba(0,0,0,0.55)");

  // surveillance cameras — mounted to wall, pointing down/outward
  // 1 in 3 chance of warm-lit, rest are cool surveillance blue
  for (let x = 14; x < w; x += 88 + ((rand() * 44) | 0)) {
    if (rand() > 0.2) {
      const warm = rand() > 0.55;
      rect(ctx, x, h - 20, 2, 10, "#1b1e29");          // mounting bracket
      rect(ctx, x + 2, h - 22, 12, 5, "#1b1e29");      // camera body
      rect(ctx, x + 2, h - 22, 12, 1, "#2b3142");      // top highlight
      rect(ctx, x + 2, h - 22, 2, 5, "#2b3142");       // left edge highlight
      rect(ctx, x + 13, h - 21, 3, 3, "#0d1120");      // lens
      px(ctx, x + 3, h - 21, warm ? PAL.warmAmber : PAL.neonCyan);  // status LED
      if (rand() > 0.5) px(ctx, x + 14, h - 21, warm ? PAL.warmGold : PAL.tealDark); // iris
    }
  }

  // horizontal conduit bundles (2-3 tubes running along the wall)
  for (let x = 0; x < w; x += 100 + ((rand() * 60) | 0)) {
    const cy = 6 + ((rand() * (h - 22)) | 0);
    rect(ctx, x, cy, 3 + ((rand() * 60) | 0), 2, "#15171f");      // main conduit
    rect(ctx, x, cy, 3 + ((rand() * 60) | 0), 1, "#2b3142");      // highlight
    if (rand() > 0.5) {
      rect(ctx, x, cy + 3, 2 + ((rand() * 40) | 0), 2, "#15171f"); // secondary run
    }
    // junction bracket
    rect(ctx, x + ((rand() * 20) | 0), cy - 1, 4, 4, "#1b1e29");
  }

  // neon signage strips — warm amber dominant with occasional cool teal
  for (let x = 16; x < w; x += 110 + ((rand() * 80) | 0)) {
    if (rand() > 0.35) {
      const warm = rand() > 0.3;          // 70% warm, 30% cool = palette shift
      const sw = 22 + ((rand() * 28) | 0);
      const sy = 4 + ((rand() * (h - 18)) | 0);
      rect(ctx, x, sy, sw, 5, "#0a0c18");                           // mounting board
      rect(ctx, x, sy, sw, 1, warm ? PAL.warmAmber : PAL.neonCyan); // neon top edge
      rect(ctx, x, sy + 4, sw, 1, warm ? PAL.warmRust : PAL.tealDark); // base shadow
      if (rand() > 0.5) {
        px(ctx, x + (sw / 2) | 0, sy + 2, warm ? PAL.warmGold : "#7fd4ff");
        px(ctx, x + ((sw / 2) | 0) + 2, sy + 2, warm ? PAL.warmAmber : PAL.neonCyan);
      }
    }
  }

  // wall poster/sticker clusters (environmental storytelling texture)
  for (let x = 30; x < w; x += 130 + ((rand() * 100) | 0)) {
    if (rand() > 0.4) {
      const pw = 9 + ((rand() * 12) | 0), ph = 7 + ((rand() * 7) | 0);
      const py = 4 + ((rand() * (h - ph - 6)) | 0);
      rect(ctx, x, py, pw, ph, pick(rand, PAL.shopWall));           // poster body
      rect(ctx, x, py, pw, 2, "#1d2430");                           // poster header
      rect(ctx, x, py, 1, ph, "#242a38");                           // torn edge
      if (rand() > 0.5) rect(ctx, x + 2, py + 4, pw - 4, 1, PAL.warmAmber); // text line
      if (rand() > 0.6) rect(ctx, x + 2, py + 6, pw - 6, 1, "#1a3a50");      // second line
    }
  }

  // AC unit vents along upper face
  for (let x = 50; x < w; x += 160 + ((rand() * 100) | 0)) {
    if (rand() > 0.45) {
      const ax = x, ay = 2;
      rect(ctx, ax, ay, 14, 8, "#23283a");
      rect(ctx, ax, ay, 14, 1, "#3a4258");
      for (let i = ax + 1; i < ax + 13; i += 2) rect(ctx, i, ay + 2, 1, 4, "#11141d");
      rect(ctx, ax, ay + 7, 14, 1, "#15171f");
    }
  }

  return c;
}

// ---- Foreground street-furniture silhouette band ---------------------------
// Phase 1: expanded prop library (11 types) at ~2× denser spacing so the full
// 2200px level never reads empty while scrolling. Surveillance cams, data
// terminals, ad pillars and warning barriers add environmental storytelling.
// Kept low (≤30px) so it never occludes the protagonist above the shins.
export function buildForeground(w, h) {
  const { c, ctx } = makeCanvas(w, h);
  const rand = rng(impureSeed(w));
  const base = h;
  const sil = PAL.fg[0];

  // continuous low railing
  const railY = h - 16;
  rect(ctx, 0, railY, w, 2, PAL.fg[1]);
  rect(ctx, 0, railY, w, 1, PAL.fgRim);
  for (let x = 4; x < w; x += 7) rect(ctx, x, railY, 2, 16, sil);
  rect(ctx, 0, h - 3, w, 3, PAL.fg[0]);

  // tighter spacing: 38–86px avg ~62px → ~35 props in 2200px (was ~18)
  let x = 22 + ((rand() * 30) | 0);
  while (x < w - 22) {
    const t = (rand() * 11) | 0;
    if (t === 0) {
      // fire hydrant
      rect(ctx, x, base - 14, 5, 14, sil);
      rect(ctx, x - 1, base - 14, 7, 2, sil);
      rect(ctx, x - 2, base - 9, 9, 2, sil);
      px(ctx, x + 2, base - 12, PAL.fgRim);
    } else if (t === 1) {
      // trash bin
      rect(ctx, x, base - 18, 12, 18, sil);
      rect(ctx, x - 1, base - 18, 14, 2, PAL.fg[1]);
      rect(ctx, x, base - 18, 1, 18, PAL.fgRim);
    } else if (t === 2) {
      // planter hedge
      rect(ctx, x, base - 9, 20, 9, sil);
      for (let i = 0; i < 20; i += 3) rect(ctx, x + i, base - 13, 2, 5, "#0c2418");
      px(ctx, x + 4, base - 13, "#1a5236");
    } else if (t === 3) {
      // newspaper / vending box
      rect(ctx, x, base - 22, 10, 22, sil);
      rect(ctx, x + 2, base - 18, 6, 6, "#10131d");
      rect(ctx, x, base - 22, 1, 22, PAL.fgRim);
    } else if (t === 4) {
      // bollard pair
      rect(ctx, x, base - 11, 3, 11, sil);
      rect(ctx, x + 8, base - 11, 3, 11, sil);
      px(ctx, x, base - 11, PAL.fgRim);
      px(ctx, x + 8, base - 11, PAL.fgRim);
    } else if (t === 5) {
      // surveillance camera post — warm amber status LED, environmental story
      rect(ctx, x + 1, base - 26, 2, 26, sil);          // pole
      rect(ctx, x + 3, base - 26, 10, 2, sil);          // arm
      rect(ctx, x + 11, base - 26, 8, 5, sil);          // camera body
      rect(ctx, x + 11, base - 26, 8, 1, PAL.fg[1]);    // top highlight
      rect(ctx, x + 18, base - 25, 2, 3, "#0d1020");    // lens
      px(ctx, x + 12, base - 25, PAL.warmAmber);        // status LED warm
      px(ctx, x + 12, base - 24, PAL.neonOrange);       // warning glow dot
    } else if (t === 6) {
      // utility junction box on post
      rect(ctx, x + 2, base - 24, 2, 24, sil);          // post
      rect(ctx, x, base - 22, 14, 10, sil);             // box
      rect(ctx, x, base - 22, 14, 1, PAL.fg[1]);        // top rim
      rect(ctx, x, base - 22, 1, 10, PAL.fgRim);        // side rim
      rect(ctx, x + 3, base - 18, 4, 3, "#0d1120");     // panel recess
      px(ctx, x + 4, base - 17, PAL.warmAmber);         // status light
      px(ctx, x + 10, base - 17, PAL.neonCyan);         // data indicator
    } else if (t === 7) {
      // warning barrier — warm amber band breaks cool palette
      rect(ctx, x, base - 14, 2, 14, sil);              // left post
      rect(ctx, x + 14, base - 14, 2, 14, sil);         // right post
      rect(ctx, x, base - 12, 16, 3, PAL.warmRust);     // amber danger stripe
      rect(ctx, x, base - 12, 16, 1, PAL.warmAmber);    // bright top edge
      rect(ctx, x + 4, base - 10, 3, 1, PAL.warmGold);  // highlight pip
    } else if (t === 8) {
      // holographic ad pillar — tall, glowing display
      rect(ctx, x + 3, base - 30, 2, 30, sil);          // post
      rect(ctx, x - 4, base - 30, 18, 14, "#0a0c18");   // panel frame
      rect(ctx, x - 3, base - 29, 16, 12, PAL.tealDark);// screen
      rect(ctx, x - 3, base - 29, 16, 2, "#1a3a4e");    // scan line
      rect(ctx, x - 2, base - 24, 8, 1, PAL.neonCyan);  // data bar
      rect(ctx, x - 2, base - 21, 5, 1, PAL.warmAmber); // warm text line
      px(ctx, x + 8, base - 18, PAL.warmGold);          // accent pixel
      rect(ctx, x - 4, base - 30, 18, 1, "#1a4a5e");    // top border glow
    } else if (t === 9) {
      // street bench with backrest
      rect(ctx, x + 2, base - 12, 2, 12, sil);          // left leg
      rect(ctx, x + 14, base - 12, 2, 12, sil);         // right leg
      rect(ctx, x, base - 9, 18, 2, sil);               // seat
      rect(ctx, x, base - 9, 18, 1, PAL.fgRim);         // seat rim
      rect(ctx, x + 2, base - 14, 14, 1, PAL.fg[1]);    // backrest
      rect(ctx, x + 2, base - 14, 1, 5, PAL.fgRim);     // backrest post L
      rect(ctx, x + 14, base - 14, 1, 5, PAL.fgRim);    // backrest post R
    } else {
      // bike rack — U-shape with suggestion of parked bike
      rect(ctx, x, base - 18, 2, 18, sil);              // left post
      rect(ctx, x + 10, base - 18, 2, 18, sil);         // right post
      rect(ctx, x, base - 18, 12, 2, sil);              // crossbar
      rect(ctx, x, base - 18, 12, 1, PAL.fgRim);        // crossbar rim
      // bike silhouette suggestion (wheel circles as dark ovals)
      rect(ctx, x - 2, base - 12, 5, 8, sil);           // front wheel
      rect(ctx, x - 1, base - 11, 3, 6, "#080b16");     // wheel hollow
      rect(ctx, x + 9, base - 12, 5, 8, sil);           // rear wheel
      rect(ctx, x + 10, base - 11, 3, 6, "#080b16");
    }
    x += 38 + ((rand() * 48) | 0);
  }
  return c;
}

function impureSeed(n) { return (n * 2654435761) >>> 0; }

// ---- Street + sidewalk -----------------------------------------------------
export function buildStreet(w, h) {
  const { c, ctx } = makeCanvas(w, h);
  const rand = rng(99);
  // sidewalk base
  rect(ctx, 0, 0, w, h, PAL.street[0]);
  // asphalt speckle (textured surface, not a flat/grid field)
  for (let i = 0; i < w * h * 0.04; i++) {
    const sx = (rand() * w) | 0, sy = 4 + ((rand() * (h - 4)) | 0);
    px(ctx, sx, sy, pick(rand, PAL.street));
  }
  // raised curb with a clear lit edge at the top of the sidewalk
  rect(ctx, 0, 0, w, 4, PAL.curb[0]);
  rect(ctx, 0, 0, w, 1, PAL.curb[1]);
  rect(ctx, 0, 4, w, 1, "#0a0c14");
  // sidewalk paving slabs — seams every 40px (reads as pavement, not a grid)
  for (let x = 0; x < w; x += 40) {
    rect(ctx, x, 6, 1, h - 6, "rgba(0,0,0,0.28)");
    rect(ctx, x + 1, 6, 1, h - 6, "rgba(255,255,255,0.03)");
  }
  // expansion gutter line lower down
  rect(ctx, 0, h - 10, w, 1, "rgba(0,0,0,0.35)");
  // manholes + puddle reflections — Phase 1: mix warm amber with cool teal
  // so the street reads as wet without full cyan fatigue.
  for (let i = 0; i < w / 130; i++) {
    const px0 = (rand() * w) | 0;
    rect(ctx, px0, 8, 12, 6, "#10131d");
    rect(ctx, px0, 8, 12, 1, "#23283a");
    rect(ctx, px0 + 3, 10, 6, 1, "#2b3040");  // grate cross detail
    rect(ctx, px0, 11, 12, 1, "#2b3040");
    // alternate puddle reflection color — ~half warm amber, ~half cool teal
    const warmPuddle = rand() > 0.5;
    const pg = ctx.createLinearGradient(0, 14, 0, h - 6);
    if (warmPuddle) {
      pg.addColorStop(0, "rgba(210,132,26,0.18)");   // warm amber reflection
      pg.addColorStop(0.5, "rgba(180,100,20,0.08)");
      pg.addColorStop(1, "rgba(150,80,10,0)");
    } else {
      pg.addColorStop(0, "rgba(52,231,255,0.12)");   // cool teal (reduced from 0.16)
      pg.addColorStop(0.5, "rgba(40,180,210,0.06)");
      pg.addColorStop(1, "rgba(30,130,170,0)");
    }
    ctx.fillStyle = pg;
    ctx.fillRect(px0 - 18, 14, 40, h - 20);
  }
  // neon spill strips along paving slab seams (lamp reflections)
  for (let x = 20; x < w; x += 40) {
    if (rand() > 0.65) {
      const spillCol = rand() > 0.45
        ? "rgba(212,132,26,0.10)"   // warm amber lamp spill
        : "rgba(52,231,255,0.07)";  // teal kiosk spill
      rect(ctx, x, h - 8, 2, 4, spillCol);
    }
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
// 20x32 frames: idle(1) + walk(4) + jump(1) + interact(1) = 7 frames.
// Upsized from 16x26 to fix "small green blob" read at gameplay zoom.
// Design: warm skin face pops against cool neon (value contrast); wide bright
// cyan visor is the strongest facial cue at any scale; 2px cyan rim on right
// torso edge separates figure from dark facades; hood wider than head for a
// distinctive outer silhouette; ±4px leg stride + ±2px arm counter-swing.
export function buildCharacter() {
  const FW = 20, FH = 32, frames = 7;
  const { c, ctx } = makeCanvas(FW * frames, FH);

  const draw = (ox, legPhase, armPhase, bob, interacting) => {
    const sk = PAL.skin, hd = PAL.hoodie, pn = PAL.pants, hr = PAL.hair;
    const cx = ox + 10; // centre of 20px frame
    const y = bob | 0;
    const lStep = Math.round(legPhase);
    const aSwing = Math.round(armPhase);

    // legs (drawn first so torso overlaps the top edge)
    rect(ctx, cx - 4, y + 22, 4, 7, pn[0]);
    rect(ctx, cx - 4, y + 22, 1, 7, "rgba(255,255,255,0.07)");
    rect(ctx, cx + 1, y + 22, 4, 7, pn[1]);
    // shoes shift with stride so feet visibly move
    rect(ctx, cx - 4 + lStep, y + 29, 4, 3, "#1a1a2e");
    rect(ctx, cx - 4 + lStep, y + 29, 4, 1, "#28283e");
    rect(ctx, cx + 1 - lStep, y + 29, 4, 3, "#1a1a2e");
    rect(ctx, cx + 1 - lStep, y + 29, 4, 1, "#28283e");

    // arms
    if (!interacting) {
      rect(ctx, cx - 7, y + 13 + aSwing, 3, 7, hd[0]);
      px(ctx, cx - 7, y + 19 + aSwing, sk[1]);
      px(ctx, cx - 6, y + 19 + aSwing, sk[1]);
      rect(ctx, cx + 5, y + 13 - aSwing, 3, 7, hd[2]);
      px(ctx, cx + 5, y + 19 - aSwing, sk[1]);
      px(ctx, cx + 6, y + 19 - aSwing, sk[1]);
      px(ctx, cx + 7, y + 13 - aSwing, PAL.hoodieRim);
    } else {
      // both arms raised toward terminal
      rect(ctx, cx - 7, y + 5, 3, 13, hd[0]);
      px(ctx, cx - 7, y + 4, sk[1]);
      px(ctx, cx - 6, y + 4, sk[1]);
      rect(ctx, cx + 5, y + 5, 3, 13, hd[2]);
      px(ctx, cx + 5, y + 4, sk[1]);
      px(ctx, cx + 6, y + 4, sk[1]);
      px(ctx, cx + 7, y + 5, PAL.hoodieRim);
    }

    // torso / hoodie
    rect(ctx, cx - 5, y + 12, 11, 10, hd[1]);
    rect(ctx, cx - 5, y + 12, 2, 10, hd[0]);
    rect(ctx, cx - 5, y + 12, 11, 3, hd[2]);
    // 2px bright rim on right — critical separation from dark facades
    rect(ctx, cx + 5, y + 12, 1, 10, PAL.hoodieRim);
    rect(ctx, cx + 4, y + 12, 1, 10, hd[2]);
    // chest privacy sigil — 5-pixel cross
    px(ctx, cx, y + 15, PAL.neonCyan);
    px(ctx, cx - 1, y + 16, PAL.neonCyan);
    px(ctx, cx, y + 16, "#d0ffff");
    px(ctx, cx + 1, y + 16, PAL.neonCyan);
    px(ctx, cx, y + 17, PAL.neonCyan);

    // collar / cowl (wider than torso to suggest hooded shape)
    rect(ctx, cx - 5, y + 9, 11, 4, hd[2]);
    rect(ctx, cx - 6, y + 10, 2, 5, hd[0]);
    rect(ctx, cx + 5, y + 10, 2, 5, hd[2]);
    px(ctx, cx + 6, y + 11, PAL.hoodieRim);
    px(ctx, cx + 6, y + 12, PAL.hoodieRim);

    // head — hood arch behind face (dark, 11px wide, wider than face)
    rect(ctx, cx - 4, y + 0, 9, 4, hr[0]);
    rect(ctx, cx - 5, y + 1, 2, 8, hr[1]);
    rect(ctx, cx + 4, y + 1, 2, 8, hr[1]);
    // face — warm skin, high brightness to pop against cool neon
    rect(ctx, cx - 3, y + 2, 7, 7, sk[0]);
    rect(ctx, cx - 3, y + 2, 2, 7, sk[1]);
    rect(ctx, cx - 3, y + 2, 7, 2, sk[1]);
    // cyber visor — the defining facial feature; must read at smallest zoom
    rect(ctx, cx - 2, y + 5, 6, 2, PAL.neonCyan);
    px(ctx, cx - 1, y + 5, "#b0f4ff");
    px(ctx, cx, y + 5, "#ffffff");
    px(ctx, cx + 1, y + 5, "#b0f4ff");
    // chin shadow
    rect(ctx, cx - 2, y + 8, 5, 1, sk[1]);
  };

  // frame 0: idle
  draw(0 * FW, 0, 0, 1, false);
  // walk frames 1–4 with ±4px stride and ±2px arm counter-swing
  const walkPhases = [[4, 2], [2, 1], [-4, -2], [-2, -1]];
  for (let i = 0; i < 4; i++) {
    draw((i + 1) * FW, walkPhases[i][0], walkPhases[i][1], i % 2 === 0 ? 0 : 1, false);
  }
  // frame 5: jump / airborne
  draw(5 * FW, -2, -3, 0, false);
  // frame 6: interact (both arms raised to terminal height)
  draw(6 * FW, 0, 0, 0, true);

  // baked dark silhouette for the 1px runtime outline pass
  const sil = makeCanvas(FW * frames, FH);
  sil.ctx.drawImage(c, 0, 0);
  sil.ctx.globalCompositeOperation = "source-in";
  sil.ctx.fillStyle = PAL.outline;
  sil.ctx.fillRect(0, 0, FW * frames, FH);

  return { canvas: c, silhouette: sil.c, fw: FW, fh: FH, frames };
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

// ---- Wall-mounted data terminal (quests 2–4; distinct from broker kiosk) ---
// 22×30 sprite: mounting brackets, panel body, screen readout, keyboard strip.
export function buildTerminal(accentColor) {
  const { c, ctx } = makeCanvas(22, 30);
  // mounting brackets (top + bottom bars)
  rect(ctx, 1, 0, 20, 2, "#1b2030");
  rect(ctx, 1, 28, 20, 2, "#1b2030");
  // panel body
  rect(ctx, 2, 2, 18, 26, "#161c2e");
  rect(ctx, 2, 2, 18, 1, "#2c3448");   // lit top edge
  rect(ctx, 2, 2, 1, 26, "#0f131d");   // left shadow
  rect(ctx, 19, 2, 1, 26, "#0f131d");  // right shadow
  // screen recess
  rect(ctx, 4, 5, 14, 11, "#060e1a");
  rect(ctx, 5, 6, 12, 9, "#0a1e2c");
  // scanlines
  for (let y = 6; y < 15; y += 2) rect(ctx, 5, y, 12, 1, "rgba(52,231,255,0.08)");
  // data readout lines
  rect(ctx, 6, 7, 7, 1, accentColor);
  rect(ctx, 6, 10, 5, 1, "#1d4a5e");
  rect(ctx, 6, 13, 8, 1, "#13263a");
  // keyboard strip
  rect(ctx, 4, 18, 14, 4, "#10141e");
  for (let kx = 5; kx < 17; kx += 2) rect(ctx, kx, 19, 1, 2, "#1a2030");
  // status LEDs
  px(ctx, 9,  24, accentColor);
  px(ctx, 11, 24, accentColor);
  px(ctx, 13, 24, "#24305c");
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

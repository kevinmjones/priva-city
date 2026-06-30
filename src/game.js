// game.js — Priva-city v2 side-scroller engine (OTL-75 art-pipeline pivot).
//
// Custom canvas renderer at a low internal resolution scaled with
// nearest-neighbour. Parallax skyline, procedural pixel-art, additive night
// lighting, particles, an animated walk-cycle character and a real interactive
// privacy quest. No game framework — full pixel control.

import * as art from "./art.js";
import { initAudio, resume, setMuted, sfx } from "./audio.js";
import { QUESTS, makePuzzle } from "./quests.js";

const VW = 480, VH = 270;           // internal virtual resolution (16:9)
const WORLD_W = 2200;               // level width (Phase 0 slice)
const GROUND_Y = 210;               // y of sidewalk top in world space
const GRAV = 0.5, MOVE = 1.6, JUMP = 7.4, FRICTION = 0.8;
const CFH = 26;                     // character frame height
const WALL_H = 40;                  // Phase 1: wall-detail band above shopRow

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// ---- offscreen lighting buffer (additive glow) ----
const lightBuf = art.makeCanvas(VW, VH);

// ---- assets ----
const A = {};
function buildAssets() {
  A.sky = art.buildSky(VW, VH);
  A.far = art.buildSkyline(WORLD_W * 0.5, 150, { palette: art.PAL.farTower, seed: 11, density: 0.5, litChance: 0.25, warm: false });
  A.mid = art.buildSkyline(WORLD_W * 0.7, 170, { palette: art.PAL.midTower, seed: 23, density: 0.6, litChance: 0.4, warm: true });
  A.near = art.buildSkyline(WORLD_W, 200, { palette: art.PAL.nearWall, seed: 37, density: 0.55, litChance: 0.62, warm: true });
  A.shops = art.buildShopRow(WORLD_W, 48);      // continuous lit street-level wall
  A.wallDetails = art.buildWallDetails(WORLD_W, WALL_H); // Phase 1: wall face above shopRow
  A.fg = art.buildForeground(WORLD_W, 48);     // foreground furniture silhouettes
  A.street = art.buildStreet(WORLD_W, 60);
  A.lamp = art.buildLamp();
  A.fog = art.buildFog(VW, VH);
  A.kiosk = art.buildKiosk();
  const ch = art.buildCharacter();
  A.char = ch.canvas; A.charSil = ch.silhouette; A.cfw = ch.fw; A.cfh = ch.fh; A.cframes = ch.frames;

  const fac = art.buildFacade(360, 150, 71, "TRUST HUB");
  A.facade = fac.canvas; A.facadeDoorX = fac.doorX;
  A.signHub = art.buildNeonSign("DATA BROKER", art.PAL.neonPink);
}

const SHOP_H = 48, FG_H = 48;

// ---- world entities (Phase 0 slice) ----
const facadeX = 1080;
const lamps = [240, 640, 1040, 1480, 1900];
const kioskX = facadeX + 180;

const player = {
  x: 180, y: GROUND_Y - CFH, vx: 0, vy: 0, onGround: true,
  face: 1, anim: 0, animT: 0, state: "idle", interacting: false, _stepped: false,
};

// ---- particles (embers / dust) ----
const particles = [];
function spawnAmbientParticles() {
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * WORLD_W, y: Math.random() * VH,
      vx: -0.05 - Math.random() * 0.1, vy: -0.02 - Math.random() * 0.05,
      life: Infinity, size: Math.random() > 0.8 ? 2 : 1,
      col: Math.random() > 0.6 ? "rgba(120,150,220,0.5)" : "rgba(255,210,140,0.4)",
    });
  }
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 2.2;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 40 + Math.random() * 30, size: Math.random() > 0.5 ? 2 : 1, col: color, gravity: 0.06 });
  }
}

// ---- input ----
const keys = {};
let interactPressed = false;
window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.code === "KeyE" || e.code === "Enter") interactPressed = true;
  if (game.scene === "puzzle" && e.code === "Escape") closePuzzle(false);
  onKey(e.code);
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

function bindTouch(id, code) {
  const el = document.getElementById(id);
  if (!el) return;
  const set = (v) => (ev) => { ev.preventDefault(); keys[code] = v; if (v && code === "KeyE") interactPressed = true; };
  el.addEventListener("touchstart", set(true), { passive: false });
  el.addEventListener("touchend", set(false), { passive: false });
  el.addEventListener("mousedown", set(true));
  window.addEventListener("mouseup", set(false));
}

// ---- game state ----
const game = {
  scene: "title",
  camX: 0,
  quests: QUESTS.map((q) => ({ ...q, done: false })),
  sigils: 0,
  shake: 0,
  flash: 0,
  t: 0,
  activePuzzle: null,
  banner: null, bannerT: 0,
};

function onKey(code) {
  if (game.scene === "title" && (code === "Enter" || code === "Space")) startGame();
  if (game.scene === "win" && code === "Enter") location.reload();
}

function startGame() {
  initAudio(); resume(); sfx.start();
  document.getElementById("titleScreen").classList.add("hidden");
  document.getElementById("hud").classList.remove("hidden");
  game.scene = "play";
  showBanner("DATA BROKER DISTRICT", "Revoke the broker's consent grab");
}

function showBanner(title, sub) { game.banner = { title, sub }; game.bannerT = 180; }

// ---- the quest interaction (consent switchboard puzzle) ----
function openPuzzle() {
  const p = makePuzzle();
  game.activePuzzle = p;
  game.scene = "puzzle";
  player.interacting = true;
  player.anim = 5;
  sfx.interact();
  renderPuzzleDOM(p);
  document.getElementById("puzzle").classList.remove("hidden");
}

function closePuzzle(success) {
  document.getElementById("puzzle").classList.add("hidden");
  game.scene = "play";
  player.interacting = false;
  game.activePuzzle = null;
  if (success) {
    game.quests[0].done = true;
    game.sigils++;
    game.shake = 14; game.flash = 1;
    burst(kioskX, GROUND_Y - 20, "rgba(93,255,155,0.9)", 60);
    burst(kioskX, GROUND_Y - 20, "rgba(52,231,255,0.9)", 40);
    sfx.success();
    showBanner("CONSENT REVOKED", "+1 Consent Sigil  ·  Broker node offline");
    updateHUD();
    if (game.quests.every((q) => q.done)) setTimeout(() => (game.scene = "win"), 1400);
  } else {
    game.shake = 6;
  }
}

function renderPuzzleDOM(p) {
  const root = document.getElementById("puzzleBody");
  root.innerHTML = "";
  const h = document.createElement("div");
  h.className = "pz-head";
  h.innerHTML = `<div class="pz-title">${p.title}</div><div class="pz-npc">${p.npc}</div><p class="pz-brief">${p.brief}</p>`;
  root.appendChild(h);

  const list = document.createElement("div");
  list.className = "pz-toggles";
  p.toggles.forEach((tg) => {
    const row = document.createElement("button");
    row.className = "pz-toggle" + (tg.on ? " on" : "");
    row.innerHTML = `<span class="pz-knob"></span><span class="pz-label">${tg.label}</span><span class="pz-hint">${tg.hint}</span>`;
    row.onclick = () => { tg.on = !tg.on; row.classList.toggle("on", tg.on); sfx.toggle(); };
    list.appendChild(row);
  });
  root.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "pz-actions";
  const confirm = document.createElement("button");
  confirm.className = "pz-confirm";
  confirm.textContent = "Submit consent settings";
  confirm.onclick = () => {
    const ok = p.toggles.every((tg) => tg.on === tg.correct);
    if (ok) closePuzzle(true);
    else {
      sfx.error();
      const fb = document.getElementById("pzFeedback");
      fb.textContent = p.wrongHint;
      fb.classList.add("show");
      setTimeout(() => fb.classList.remove("show"), 2400);
    }
  };
  const cancel = document.createElement("button");
  cancel.className = "pz-cancel";
  cancel.textContent = "Walk away (Esc)";
  cancel.onclick = () => closePuzzle(false);
  actions.appendChild(confirm); actions.appendChild(cancel);
  root.appendChild(actions);

  const fb = document.createElement("div");
  fb.id = "pzFeedback"; fb.className = "pz-feedback";
  root.appendChild(fb);
}

// ---- update ----
function update() {
  game.t++;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    if (p.gravity) p.vy += p.gravity;
    if (p.life !== Infinity) { p.life--; if (p.life <= 0) { particles.splice(i, 1); continue; } }
    else { if (p.y < 0) p.y = VH; if (p.x < game.camX - 10) p.x = game.camX + VW + 10; }
  }
  if (game.flash > 0) game.flash -= 0.04;
  if (game.shake > 0) game.shake *= 0.86;
  if (game.bannerT > 0) game.bannerT--;

  if (game.scene !== "play") return;

  if (keys.ArrowLeft || keys.KeyA) { player.vx -= MOVE * 0.4; player.face = -1; }
  if (keys.ArrowRight || keys.KeyD) { player.vx += MOVE * 0.4; player.face = 1; }
  if ((keys.ArrowUp || keys.KeyW || keys.Space) && player.onGround) {
    player.vy = -JUMP; player.onGround = false; sfx.jump();
  }
  player.vx *= FRICTION;
  player.vx = Math.max(-MOVE, Math.min(MOVE, player.vx));
  player.x += player.vx;
  player.vy += GRAV;
  player.y += player.vy;

  if (player.y + CFH >= GROUND_Y) {
    if (!player.onGround && player.vy > 2) { sfx.land(); burst(player.x, GROUND_Y, "rgba(150,160,190,0.4)", 6); }
    player.y = GROUND_Y - CFH; player.vy = 0; player.onGround = true;
  }
  player.x = Math.max(20, Math.min(WORLD_W - 20, player.x));

  if (!player.onGround) { player.state = "jump"; player.anim = 2; }
  else if (Math.abs(player.vx) > 0.3) {
    player.state = "walk";
    player.animT += Math.abs(player.vx) * 0.12;
    const f = (player.animT | 0) % 4;
    player.anim = 1 + f;
    if (f === 1 && !player._stepped) { sfx.step(); player._stepped = true; }
    if (f !== 1) player._stepped = false;
  } else { player.state = "idle"; player.anim = 0; }

  const target = player.x - VW / 2;
  game.camX += (target - game.camX) * 0.12;
  game.camX = Math.max(0, Math.min(WORLD_W - VW, game.camX));

  const nearKiosk = !game.quests[0].done && Math.abs(player.x - kioskX) < 26;
  const prompt = document.getElementById("interactPrompt");
  if (nearKiosk) { prompt.classList.add("show"); if (interactPressed) openPuzzle(); }
  else prompt.classList.remove("show");

  interactPressed = false;
}

// ---- render ----
function drawLayer(img, parallax, yOff) {
  const sx = game.camX * parallax;
  const o = -(((sx % img.width) + img.width) % img.width);
  ctx.drawImage(img, o, yOff);
  ctx.drawImage(img, o + img.width, yOff);
}

function render() {
  ctx.clearRect(0, 0, VW, VH);
  const shx = game.shake > 0.4 ? (Math.random() - 0.5) * game.shake : 0;
  const shy = game.shake > 0.4 ? (Math.random() - 0.5) * game.shake : 0;
  ctx.save();
  ctx.translate(Math.round(shx), Math.round(shy));

  ctx.drawImage(A.sky, 0, 0);
  drawLayer(A.far, 0.18, VH - 150 - 12);
  drawLayer(A.mid, 0.38, VH - 170 + 4);
  drawLayer(A.near, 0.62, VH - 200 + 18);
  // Phase 1: upper building wall face (surveillance cams, conduit, signage)
  drawLayer(A.wallDetails, 0.62, GROUND_Y - SHOP_H - WALL_H);
  // continuous lit storefront wall behind the sidewalk (fills the dead band)
  drawLayer(A.shops, 0.62, GROUND_Y - SHOP_H);

  const fx = facadeX - game.camX * 0.85;
  ctx.drawImage(A.facade, Math.round(fx), GROUND_Y - 150);
  ctx.drawImage(A.signHub, Math.round(fx + 110), GROUND_Y - 150 + 6);

  ctx.drawImage(A.street, -game.camX, GROUND_Y);

  lamps.forEach((lx) => {
    const sxp = Math.round(lx - game.camX);
    if (sxp < -20 || sxp > VW + 20) return;
    ctx.drawImage(A.lamp, sxp, GROUND_Y - 60);
  });

  const kx = Math.round(kioskX - game.camX);
  ctx.save();
  if (game.quests[0].done) ctx.globalAlpha = 0.5;
  ctx.drawImage(A.kiosk, kx - 13, GROUND_Y - 38);
  ctx.restore();

  drawPlayer();

  particles.forEach((p) => {
    ctx.fillStyle = p.col;
    ctx.fillRect(Math.round(p.x - game.camX), Math.round(p.y), p.size, p.size);
  });

  // closest parallax layer: foreground street-furniture silhouettes, streaking
  // past faster than everything else for layered depth (Gestalt figure-ground)
  drawLayer(A.fg, 1.18, VH - FG_H);

  // lighting pass
  const lc = lightBuf.ctx;
  lc.clearRect(0, 0, VW, VH);
  lamps.forEach((lx) => {
    const sxp = lx - game.camX;
    glow(lc, sxp + 6, GROUND_Y - 50, 46, "rgba(255,200,120,0.55)");
    glow(lc, sxp + 6, GROUND_Y + 4, 30, "rgba(255,190,110,0.35)");
  });
  if (!game.quests[0].done) glow(lc, kioskX - game.camX, GROUND_Y - 22, 26, "rgba(52,231,255,0.5)");
  glow(lc, facadeX - game.camX * 0.85 + 140, GROUND_Y - 138, 40, "rgba(255,77,141,0.4)");
  glow(lc, facadeX - game.camX * 0.85 + A.facadeDoorX, GROUND_Y - 16, 30, "rgba(255,200,120,0.4)");
  // Phase 1: shopfront ambient warm glows every 120px — breaks cyan dominance
  // with interleaved amber light spill from storefront windows.
  const shopParallax = 0.62;
  const shopScrollOff = game.camX * shopParallax;
  for (let wx = 0; wx < WORLD_W; wx += 120) {
    const sxp = wx - shopScrollOff;
    if (sxp > -40 && sxp < VW + 40) {
      glow(lc, sxp + 14, GROUND_Y - SHOP_H * 0.4, 22, "rgba(212,132,26,0.18)");
    }
  }

  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(lightBuf.c, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  ctx.globalAlpha = 0.55;
  drawLayer(A.fog, 0.15, 0);
  ctx.globalAlpha = 1;

  vignette();
  ctx.restore();

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(180,255,210,${game.flash * 0.5})`;
    ctx.fillRect(0, 0, VW, VH);
  }
  if (game.bannerT > 0) drawBanner();
}

function glow(c, x, y, r, color) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

function vignette() {
  const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.85);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,8,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
}

const PLAYER_SCALE = 1.3;   // scale the avatar up so it reads as the focal element
function drawPlayer() {
  const sx = (player.anim % A.cframes) * A.cfw;
  const px = Math.round(player.x - game.camX);
  const dw = A.cfw * PLAYER_SCALE, dh = A.cfh * PLAYER_SCALE;
  const footY = Math.round(player.y) + A.cfh;   // ground contact (tracks jumps)
  const top = footY - dh;
  // ground contact shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(px, GROUND_Y + 2, 9, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(px, top);
  if (player.face < 0) ctx.scale(-1, 1);
  // 1px dark outline (4-way) so the figure separates from the brick facade
  const o = PLAYER_SCALE;
  for (const [ox, oy] of [[-o, 0], [o, 0], [0, -o], [0, o]]) {
    ctx.drawImage(A.charSil, sx, 0, A.cfw, A.cfh, -dw / 2 + ox, oy, dw, dh);
  }
  ctx.drawImage(A.char, sx, 0, A.cfw, A.cfh, -dw / 2, 0, dw, dh);
  ctx.restore();
}

function drawBanner() {
  const a = Math.min(1, game.bannerT / 30, (180 - game.bannerT) / 16 + 0.1);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.fillStyle = "rgba(8,10,24,0.72)";
  ctx.fillRect(0, 70, VW, 34);
  ctx.fillStyle = art.PAL.neonCyan;
  ctx.fillRect(0, 70, VW, 1); ctx.fillRect(0, 103, VW, 1);
  ctx.textAlign = "center";
  ctx.fillStyle = "#eaf6ff";
  ctx.font = "bold 13px monospace";
  ctx.fillText(game.banner.title, VW / 2, 87);
  ctx.fillStyle = "#9fb4d6";
  ctx.font = "8px monospace";
  ctx.fillText(game.banner.sub, VW / 2, 99);
  ctx.restore();
  ctx.textAlign = "left";
}

// ---- HUD ----
function updateHUD() {
  const ql = document.getElementById("questList");
  if (ql) {
    ql.innerHTML = game.quests.map((q) =>
      `<li class="${q.done ? "done" : ""}">${q.done ? "✔" : "▸"} ${q.label}</li>`).join("");
  }
  const s = document.getElementById("sigilCount");
  if (s) s.textContent = `${game.sigils}/${game.quests.length}`;
}

// ---- scaling ----
function resize() {
  const scale = Math.max(1, Math.min(window.innerWidth / VW, window.innerHeight / VH));
  canvas.style.width = VW * scale + "px";
  canvas.style.height = VH * scale + "px";
}
window.addEventListener("resize", resize);

let titleT = 0;
function loop() {
  update();
  if (game.scene === "win") drawWin();
  else if (game.scene === "title") drawTitle();
  else render();
  requestAnimationFrame(loop);
}

function drawTitle() {
  titleT++;
  ctx.clearRect(0, 0, VW, VH);
  ctx.drawImage(A.sky, 0, 0);
  game.camX = (titleT * 0.3) % (WORLD_W - VW);
  drawLayer(A.far, 0.18, VH - 150 - 12);
  drawLayer(A.mid, 0.3, VH - 170 + 4);
  drawLayer(A.near, 0.5, VH - 200 + 18);
  drawLayer(A.wallDetails, 0.5, GROUND_Y - SHOP_H - WALL_H);
  drawLayer(A.shops, 0.5, GROUND_Y - SHOP_H);
  ctx.drawImage(A.street, -game.camX, GROUND_Y);
  const fx = facadeX - game.camX * 0.85;
  ctx.drawImage(A.facade, Math.round(fx), GROUND_Y - 150);
  ctx.drawImage(A.signHub, Math.round(fx + 110), GROUND_Y - 150 + 6);
  drawLayer(A.fg, 1.0, VH - FG_H);
  const lc = lightBuf.ctx; lc.clearRect(0, 0, VW, VH);
  glow(lc, fx + 140, GROUND_Y - 138, 50, "rgba(255,77,141,0.5)");
  glow(lc, VW * 0.5, GROUND_Y - 30, 70, "rgba(52,231,255,0.14)");
  ctx.globalCompositeOperation = "lighter"; ctx.drawImage(lightBuf.c, 0, 0); ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.5; drawLayer(A.fog, 0.15, 0); ctx.globalAlpha = 1;
  vignette();
}

function drawWin() {
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("interactPrompt").classList.remove("show");
  document.getElementById("winScreen").classList.remove("hidden");
}

// ---- boot ----
function boot() {
  buildAssets();
  spawnAmbientParticles();
  updateHUD();
  resize();
  player.y = GROUND_Y - CFH;
  ["btnLeft", "btnRight", "btnJump", "btnInteract"].forEach((id, i) =>
    bindTouch(id, ["KeyA", "KeyD", "Space", "KeyE"][i]));
  const sb = document.getElementById("startBtn");
  if (sb) sb.addEventListener("click", startGame);
  const mb = document.getElementById("muteBtn");
  if (mb) mb.addEventListener("click", (e) => {
    const m = e.target.classList.toggle("muted");
    setMuted(m); e.target.textContent = m ? "♪ off" : "♪ on";
  });
  requestAnimationFrame(loop);
}

// expose a couple of hooks for headless QA screenshots
window.__priva = { startGame, openPuzzle, closePuzzle, game, player };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

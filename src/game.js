const WORLD = { width: 1920, height: 1080, floor: 914 };
const FINAL_CODE = "274913";

const state = {
  startedAt: Date.now(),
  activePrompt: null,
  codes: {},
  sigils: new Set(),
  completed: new Set(),
  finalOpen: false,
};

const quests = [
  { id: "consent", label: "Restore consent at the Arcade kiosk." },
  { id: "rights", label: "Fulfill the rights request at the Exchange." },
  { id: "retention", label: "Purge stale telemetry at Retention Rail." },
  { id: "vault", label: "Enter the earned code at the Privacy Trust Hub." },
];

const challenges = {
  consent: {
    title: "Consent Arcade",
    npc: "Mira, user advocate",
    body:
      "The product team wants one bundled permission for location, contacts, browsing history, and diagnostics. Which launch option best respects privacy while preserving the core service?",
    options: [
      {
        text: "Collect everything once, then let users opt out later.",
        ok: false,
        result: "Not yet. That buries the privacy choice after collection. Pick a just-in-time option with clear purpose limits.",
      },
      {
        text: "Ask separately for precise location only when the map feature is opened; keep diagnostics optional.",
        ok: true,
        result: "Correct. Specific, just-in-time consent earns code segment 27. Next: carry the segment to the remaining districts.",
        code: "27",
      },
      {
        text: "Hide optional permissions inside the terms so the launch flow stays short.",
        ok: false,
        result: "Not yet. Short is useful, but consent is not valid when the choice is hidden. Choose the transparent option.",
      },
    ],
  },
  rights: {
    title: "Rights Exchange",
    npc: "Noor, access desk lead",
    body:
      "A resident submits a data subject access request asking what profile data trained recommendations. Which response should the city provide?",
    options: [
      {
        text: "Send the resident their account profile, preference signals, and recommendation event categories.",
        ok: true,
        result: "Correct. The response covers the relevant personal data categories and earns code segment 49. Next: check Retention Rail.",
        code: "49",
      },
      {
        text: "Only send the public privacy policy because it describes data use generally.",
        ok: false,
        result: "Not yet. A policy is not a complete access response. The resident asked for their data categories.",
      },
      {
        text: "Reject the request because recommendation logs are too technical.",
        ok: false,
        result: "Not yet. Complexity is not a reason to ignore access rights. Explain the categories in clear language.",
      },
    ],
  },
  retention: {
    title: "Retention Rail",
    npc: "Vale, systems archivist",
    body:
      "Telemetry from a beta feature is older than the documented 30-day retention period. Billing records still need to remain intact. What purge should run?",
    options: [
      {
        text: "Delete stale beta telemetry and keep only billing records required for accounting.",
        ok: true,
        result: "Correct. Purpose-bound deletion earns code segment 13. Next: enter the full code at the Trust Hub.",
        code: "13",
      },
      {
        text: "Keep all telemetry indefinitely in case future models need training data.",
        ok: false,
        result: "Not yet. Future possible use does not override a documented retention limit. Select the purpose-bound purge.",
      },
      {
        text: "Delete every record for beta users, including invoices.",
        ok: false,
        result: "Not yet. Deletion must respect retention duties too. Purge stale telemetry without breaking required records.",
      },
    ],
  },
};

const locations = [
  { id: "consent", x: 300, y: WORLD.floor - 46, accent: 0xffc76d, label: "Consent Arcade", kind: "kiosk" },
  { id: "rights", x: 820, y: WORLD.floor - 48, accent: 0x63d7ff, label: "Rights Exchange", kind: "desk" },
  { id: "retention", x: 1260, y: WORLD.floor - 46, accent: 0x8d73ff, label: "Retention Rail", kind: "terminal" },
  { id: "vault", x: 1660, y: WORLD.floor - 66, accent: 0x38d98b, label: "Trust Hub", kind: "vault" },
];

const sigils = [
  { id: "a", x: 470, y: WORLD.floor - 132 },
  { id: "b", x: 720, y: WORLD.floor - 360 },
  { id: "c", x: 1120, y: WORLD.floor - 238 },
  { id: "d", x: 1510, y: WORLD.floor - 348 },
];

const platforms = [
  { x: 636, y: WORLD.floor - 286, w: 250, h: 22 },
  { x: 1026, y: WORLD.floor - 164, w: 250, h: 22 },
  { x: 1410, y: WORLD.floor - 282, w: 230, h: 22 },
];

const touch = { left: false, right: false, jump: false };
let touchControlsBound = false;

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#07122a",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 1180 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: { preload, create, update },
};

let sceneRef;
let player;
let cursors;
let keys;
let interactZones;
let sigilObjects;
let platformColliders;
let timerId;

new Phaser.Game(config);

function preload() {}

function create() {
  sceneRef = this;
  this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
  drawCity(this);
  createPlayer(this);
  createInteractables(this);
  createInput(this);
  updateHud();
  updateTimer();
  if (timerId) clearInterval(timerId);
  timerId = setInterval(updateTimer, 1000);
}

function drawCity(scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x07122a, 1).fillRect(0, 0, WORLD.width, WORLD.height);

  drawSkyline(g, 0x030711, 0.34, 760, 0);
  drawSkyline(g, 0x102a63, 0.54, 690, 54);
  drawSkyline(g, 0x264d9b, 0.28, 620, 112);

  g.fillStyle(0x0a1932, 1).fillRect(0, 706, WORLD.width, 250);
  g.lineStyle(4, 0x63d7ff, 0.55).lineBetween(0, 706, WORLD.width, 706);

  const buildings = [
    [72, 492, 230, 414, 0x07172f],
    [328, 548, 260, 358, 0x0a1d3b],
    [650, 432, 250, 474, 0x07172f],
    [926, 584, 230, 322, 0x102a63],
    [1190, 500, 260, 406, 0x07172f],
    [1510, 396, 284, 510, 0x0a1d3b],
  ];

  buildings.forEach(([x, y, w, h, color], index) => drawBuilding(g, x, y, w, h, color, index));

  platforms.forEach((platform) => {
    g.fillStyle(0x6f6c9f, 1).fillRect(platform.x, platform.y, platform.w, platform.h);
    g.lineStyle(3, 0xffc76d, 0.5).lineBetween(platform.x, platform.y, platform.x + platform.w, platform.y);
    for (let x = platform.x + 18; x < platform.x + platform.w - 10; x += 32) {
      g.fillStyle(0x030711, 0.52).fillRect(x, platform.y + 8, 18, 4);
    }
  });

  g.fillStyle(0x030711, 1).fillRect(0, WORLD.floor, WORLD.width, WORLD.height - WORLD.floor);
  g.fillStyle(0x07172f, 1).fillRect(0, WORLD.floor + 12, WORLD.width, 86);
  g.lineStyle(5, 0x63d7ff, 0.76).lineBetween(0, WORLD.floor, WORLD.width, WORLD.floor);
  for (let x = 0; x < WORLD.width; x += 38) {
    g.fillStyle(x % 76 === 0 ? 0x12376f : 0x102a63, 0.72).fillRect(x, WORLD.floor + 24, 24, 8);
    g.fillStyle(0x6f6c9f, 0.28).fillRect(x + 14, WORLD.floor + 56, 32, 6);
  }

  platformColliders = [createStaticZone(scene, WORLD.width / 2, WORLD.floor + 14, WORLD.width, 28)];
  platforms.forEach((platform) => {
    platformColliders.push(createStaticZone(scene, platform.x + platform.w / 2, platform.y + platform.h / 2, platform.w, platform.h));
  });

  scene.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
}

function createStaticZone(scene, x, y, w, h) {
  const zone = scene.add.zone(x, y, w, h);
  scene.physics.add.existing(zone, true);
  zone.body.setSize(w, h);
  zone.body.updateFromGameObject();
  return zone;
}

function drawSkyline(g, color, alpha, baseY, offset) {
  g.fillStyle(color, alpha);
  for (let x = -120 + offset; x < WORLD.width + 120; x += 132) {
    const h = 170 + ((x + offset) % 5) * 34;
    const w = 84 + ((x + offset) % 3) * 18;
    g.fillRect(x, baseY - h, w, h);
    if (alpha > 0.4) {
      for (let wy = baseY - h + 28; wy < baseY - 24; wy += 42) {
        g.fillStyle(0xffc76d, 0.12).fillRect(x + 14, wy, 16, 8);
        g.fillStyle(0x63d7ff, 0.1).fillRect(x + 48, wy + 14, 18, 8);
      }
      g.fillStyle(color, alpha);
    }
  }
}

function drawBuilding(g, x, y, w, h, color, index) {
  g.fillStyle(color, 1).fillRect(x, y, w, h);
  g.lineStyle(2, 0x12376f, 0.9).strokeRect(x, y, w, h);
  for (let by = y + 26; by < y + h - 20; by += 34) {
    g.lineStyle(1, 0x12376f, 0.45).lineBetween(x, by, x + w, by);
  }
  for (let wx = x + 24; wx < x + w - 26; wx += 52) {
    for (let wy = y + 44; wy < y + h - 74; wy += 68) {
      const lit = (wx + wy + index) % 3 !== 0;
      g.fillStyle(lit ? 0xffc76d : 0x264d9b, lit ? 0.72 : 0.34).fillRect(wx, wy, 22, 30);
      g.fillStyle(0x030711, 0.42).fillRect(wx + 9, wy, 4, 30);
    }
  }
  g.fillStyle(0x6f6c9f, 1).fillRect(x - 8, y - 14, w + 16, 14);
  if (index % 2 === 0) {
    g.fillStyle(0x38d98b, 0.42).fillRect(x + w - 52, y + 82, 34, 42);
    g.fillStyle(0x38d98b, 0.72).fillRect(x + w - 43, y + 70, 16, 18);
  }
}

function createPlayer(scene) {
  const body = scene.add.graphics();
  body.fillStyle(0xf4f1d6, 1).fillRect(8, 8, 28, 42);
  body.fillStyle(0x38d98b, 1).fillRect(13, 16, 18, 6);
  body.fillStyle(0x8d73ff, 1).fillRect(10, 50, 10, 18);
  body.fillStyle(0x63d7ff, 1).fillRect(24, 50, 10, 18);
  body.fillStyle(0xffc76d, 1).fillRect(12, 0, 20, 10);
  body.generateTexture("player", 44, 72);
  body.destroy();

  player = scene.physics.add.sprite(244, WORLD.floor - 90, "player");
  player.setCollideWorldBounds(true);
  player.body.setSize(30, 64).setOffset(7, 8);
  player.setDragX(1800);
  player.setMaxVelocity(360, 840);
  platformColliders.forEach((platform) => scene.physics.add.collider(player, platform));
  scene.cameras.main.startFollow(player, true, 0.08, 0.08, 0, 118);
}

function createInteractables(scene) {
  interactZones = scene.physics.add.staticGroup();
  sigilObjects = scene.physics.add.staticGroup();

  locations.forEach((loc) => {
    drawLandmark(scene, loc);
    const zone = scene.add.zone(loc.x, loc.y - 26, 260, 170);
    scene.physics.add.existing(zone, true);
    zone.kind = loc.id === "vault" ? "vault" : "challenge";
    zone.challengeId = loc.id;
    zone.label = loc.label;
    interactZones.add(zone);
  });

  sigils.forEach((sigil) => {
    const g = scene.add.graphics();
    g.fillStyle(0xffc76d, 0.26).fillCircle(20, 20, 18);
    g.lineStyle(3, 0xffc76d, 0.94).strokeCircle(20, 20, 18);
    g.lineStyle(3, 0x38d98b, 0.9).lineBetween(10, 20, 30, 20).lineBetween(20, 10, 20, 30);
    g.generateTexture(`sigil-${sigil.id}`, 40, 40);
    g.destroy();
    const sprite = scene.physics.add.staticSprite(sigil.x, sigil.y, `sigil-${sigil.id}`);
    sprite.sigilId = sigil.id;
    sigilObjects.add(sprite);
  });
}

function drawLandmark(scene, loc) {
  const g = scene.add.graphics();
  const x = loc.x;
  const y = loc.y;
  g.fillStyle(0x030711, 0.72).fillRect(x - 82, y + 44, 164, 18);
  g.lineStyle(3, loc.accent, 0.84);
  if (loc.kind === "kiosk") {
    g.fillStyle(0x07172f, 1).fillRect(x - 48, y - 76, 96, 118);
    g.strokeRect(x - 48, y - 76, 96, 118);
    g.fillStyle(loc.accent, 0.62).fillRect(x - 30, y - 52, 60, 18);
    g.fillStyle(0x38d98b, 0.8).fillRect(x - 20, y - 20, 40, 10);
  } else if (loc.kind === "desk") {
    g.fillStyle(0x07172f, 1).fillRect(x - 70, y - 56, 140, 92);
    g.strokeRect(x - 70, y - 56, 140, 92);
    g.fillStyle(0xf4f1d6, 0.8).fillRect(x - 48, y - 32, 36, 42);
    g.fillStyle(loc.accent, 0.55).fillRect(x + 8, y - 34, 38, 12);
  } else if (loc.kind === "terminal") {
    g.fillStyle(0x07172f, 1).fillRect(x - 62, y - 64, 124, 104);
    g.strokeRect(x - 62, y - 64, 124, 104);
    g.fillStyle(loc.accent, 0.52).fillRect(x - 40, y - 44, 80, 16);
    g.fillStyle(0xffc76d, 0.82).fillRect(x - 48, y + 8, 96, 8);
  } else {
    g.fillStyle(0x030711, 1).fillRect(x - 62, y - 112, 124, 154);
    g.strokeRect(x - 62, y - 112, 124, 154);
    g.fillStyle(0x38d98b, 0.42).fillRect(x - 30, y - 62, 60, 70);
    g.lineStyle(2, 0xffc76d, 0.8).strokeRect(x - 38, y - 76, 76, 98);
  }

  scene.add
    .text(x - 78, y + 70, loc.label, {
      color: "#f4f1d6",
      fontSize: "16px",
      backgroundColor: "rgba(3,7,17,0.68)",
      padding: { x: 6, y: 4 },
    })
    .setDepth(5);
}

function createInput(scene) {
  cursors = scene.input.keyboard.createCursorKeys();
  keys = scene.input.keyboard.addKeys("W,A,D,E,SPACE,ESC");
  keys.E.on("down", interact);
  keys.ESC.on("down", closeModal);

  if (touchControlsBound) return;
  touchControlsBound = true;
  document.querySelectorAll("[data-touch]").forEach((button) => {
    const key = button.dataset.touch;
    const down = (event) => {
      event.preventDefault();
      if (key === "interact") interact();
      else touch[key] = true;
    };
    const up = (event) => {
      event.preventDefault();
      if (key !== "interact") touch[key] = false;
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointerleave", up);
    button.addEventListener("pointercancel", up);
  });
}

function update() {
  if (!player) return;
  const left = cursors.left.isDown || keys.A.isDown || touch.left;
  const right = cursors.right.isDown || keys.D.isDown || touch.right;
  const jump = cursors.up.isDown || keys.W?.isDown || keys.SPACE.isDown || touch.jump;

  if (left === right) player.setAccelerationX(0);
  else player.setAccelerationX(left ? -1600 : 1600);

  if (jump && player.body.blocked.down) {
    player.setVelocityY(-610);
  }

  player.setFlipX(left && !right);
  findActivePrompt();
  collectSigils();
}

function findActivePrompt() {
  let active = null;
  sceneRef.physics.overlap(player, interactZones, (_player, zone) => {
    if (!active) {
      active = zone;
    }
  });
  state.activePrompt = active;
  updatePrompt();
}

function collectSigils() {
  sigilObjects.children.iterate((sprite) => {
    if (!sprite?.active) return;
    if (Phaser.Math.Distance.Between(player.x, player.y, sprite.x, sprite.y) < 48) {
      state.sigils.add(sprite.sigilId);
      sprite.destroy();
      updateHud();
      flashCamera(0x38d98b);
    }
  });
}

function updatePrompt() {
  const prompt = document.getElementById("promptText");
  if (!state.activePrompt) {
    prompt.textContent = "Explore the districts and look for amber interaction lights.";
    prompt.classList.remove("ready");
    return;
  }
  const verb = state.activePrompt.kind === "vault" ? "enter vault" : "interact";
  prompt.textContent = `Press E to ${verb}: ${state.activePrompt.label}`;
  prompt.classList.add("ready");
}

function interact() {
  if (!state.activePrompt || document.getElementById("modal").open) return;
  if (state.activePrompt.kind === "vault") {
    openVault();
  } else {
    openChallenge(state.activePrompt.challengeId);
  }
}

function openChallenge(id) {
  const challenge = challenges[id];
  if (state.completed.has(id)) {
    showModal(`
      <h2>${challenge.title}</h2>
      <p><strong>${challenge.npc}</strong></p>
      <p>This district is stable. Carry the code segment forward and keep restoring the remaining tasks.</p>
    `);
    return;
  }

  const options = challenge.options.map((option, index) => `<button data-option="${index}">${option.text}</button>`).join("");
  showModal(`
    <h2>${challenge.title}</h2>
    <p><strong>${challenge.npc}</strong></p>
    <p>${challenge.body}</p>
    <div class="choices">${options}</div>
    <div id="challenge-result" class="result" hidden></div>
  `);

  document.querySelectorAll("[data-option]").forEach((button) => {
    button.addEventListener("click", () => {
      const option = challenge.options[Number(button.dataset.option)];
      const result = document.getElementById("challenge-result");
      result.hidden = false;
      result.textContent = option.result;
      result.className = `result ${option.ok ? "result--success" : "result--error"}`;
      button.classList.toggle("correct", option.ok);
      button.classList.toggle("incorrect", !option.ok);
      if (option.ok) {
        state.completed.add(id);
        state.codes[id] = option.code;
        document.querySelectorAll("[data-option]").forEach((b) => (b.disabled = true));
        updateHud();
        flashCamera(0x38d98b);
      }
    });
  });
}

function openVault() {
  const known = ["consent", "rights", "retention"].map((id) => state.codes[id] || "--").join(" ");
  showModal(`
    <h2>Privacy Trust Hub</h2>
    <p>Enter the six-digit code assembled from the districts. Current segments: <strong>${known}</strong></p>
    <div class="code-readout" id="readout"></div>
    <div class="keypad">
      ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"].map((key) => `<button data-key="${key}">${key.toUpperCase()}</button>`).join("")}
    </div>
    <div id="vault-result" class="result" hidden></div>
  `);

  let input = "";
  const readout = document.getElementById("readout");
  const result = document.getElementById("vault-result");
  const render = () => (readout.textContent = input.padEnd(6, "•"));
  render();

  document.querySelectorAll("[data-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.key;
      if (key === "back") input = input.slice(0, -1);
      else if (key === "ok") submitVault(input, result);
      else if (input.length < 6) input += key;
      render();
    });
  });
}

function submitVault(input, result) {
  result.hidden = false;
  if (input === FINAL_CODE) {
    state.finalOpen = true;
    state.completed.add("vault");
    result.className = "result result--success";
    result.innerHTML = `
      Vault open. Priva-city trust protocol restored.
      <div class="modal-actions"><button class="primary" id="restart-game" type="button">Restart run</button></div>
    `;
    document.getElementById("restart-game").addEventListener("click", restartGame);
    updateHud();
    flashCamera(0x38d98b);
  } else {
    result.className = "result result--error";
    result.textContent = "Code rejected. Finish each district and enter the segments in quest order.";
  }
}

function restartGame() {
  state.startedAt = Date.now();
  state.activePrompt = null;
  state.codes = {};
  state.sigils = new Set();
  state.completed = new Set();
  state.finalOpen = false;
  closeModal();
  sceneRef.scene.restart();
}

function flashCamera(color) {
  sceneRef?.cameras?.main?.flash(110, (color >> 16) & 255, (color >> 8) & 255, color & 255, false);
}

function showModal(html) {
  document.getElementById("modal-body").innerHTML = html;
  document.getElementById("modal").showModal();
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal.open) modal.close();
}

function updateHud() {
  document.getElementById("code-slots").textContent = `${state.codes.consent || "--"} ${state.codes.rights || "--"} ${state.codes.retention || "--"}`;
  document.getElementById("sigils").textContent = `${state.sigils.size}/4`;
  const list = document.getElementById("quest-list");
  const firstOpen = quests.find((quest) => !state.completed.has(quest.id))?.id;
  list.innerHTML = quests
    .map((quest, index) => {
      const status = state.completed.has(quest.id) ? "done" : quest.id === firstOpen ? "active" : "";
      return `<li class="${status}" data-step="${index + 1}"><span>${quest.label}</span></li>`;
    })
    .join("");

  const sideQuest = document.getElementById("side-quest");
  sideQuest.textContent =
    state.sigils.size === 4 ? "All consent sigils recovered." : `Find the four consent sigils hidden around Priva-city. ${state.sigils.size}/4 recovered.`;
  sideQuest.classList.toggle("complete", state.sigils.size === 4);
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");
  document.getElementById("timer").textContent = `${mins}:${secs}`;
}

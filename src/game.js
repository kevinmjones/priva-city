const WORLD = { width: 1920, height: 1080 };
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
        result: "That buries the privacy choice after collection. Try again with minimization and clear purpose limits.",
      },
      {
        text: "Ask separately for precise location only when the map feature is opened; keep diagnostics optional.",
        ok: true,
        result: "Correct. Specific, just-in-time consent earns code segment 27.",
        code: "27",
      },
      {
        text: "Hide optional permissions inside the terms so the launch flow stays short.",
        ok: false,
        result: "Short is useful, but consent is not valid when the choice is hidden.",
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
        result: "Correct. The response covers the relevant personal data categories and earns code segment 49.",
        code: "49",
      },
      {
        text: "Only send the public privacy policy because it describes data use generally.",
        ok: false,
        result: "A policy is not a complete access response. The resident asked for their data categories.",
      },
      {
        text: "Reject the request because recommendation logs are too technical.",
        ok: false,
        result: "Complexity is not a reason to ignore access rights. Explain the categories in clear language.",
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
        result: "Correct. Purpose-bound deletion earns code segment 13.",
        code: "13",
      },
      {
        text: "Keep all telemetry indefinitely in case future models need training data.",
        ok: false,
        result: "Future possible use does not override a documented retention limit.",
      },
      {
        text: "Delete every record for beta users, including invoices.",
        ok: false,
        result: "Deletion must respect retention duties too. Purge stale telemetry without breaking required records.",
      },
    ],
  },
};

const locations = [
  { id: "consent", x: 380, y: 330, color: 0x69e0a3, label: "Consent Arcade" },
  { id: "rights", x: 1420, y: 320, color: 0x63d7ff, label: "Rights Exchange" },
  { id: "retention", x: 500, y: 815, color: 0xffd166, label: "Retention Rail" },
  { id: "vault", x: 1500, y: 820, color: 0xef6461, label: "Trust Hub" },
];

const sigils = [
  { id: "a", x: 170, y: 710 },
  { id: "b", x: 920, y: 180 },
  { id: "c", x: 1110, y: 910 },
  { id: "d", x: 1740, y: 520 },
];

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#0b1513",
  physics: {
    default: "arcade",
    arcade: { debug: false },
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
let promptText;
let interactZones;
let sigilObjects;

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
  setInterval(updateTimer, 1000);
}

function drawCity(scene) {
  const g = scene.add.graphics();
  g.fillStyle(0x101f1b, 1).fillRect(0, 0, WORLD.width, WORLD.height);

  for (let x = 0; x < WORLD.width; x += 160) {
    g.lineStyle(2, 0x31564b, 0.42).lineBetween(x, 0, x, WORLD.height);
  }
  for (let y = 0; y < WORLD.height; y += 120) {
    g.lineStyle(2, 0x31564b, 0.42).lineBetween(0, y, WORLD.width, y);
  }

  const blocks = [
    [120, 120, 290, 170, 0x19342d],
    [540, 100, 320, 250, 0x182c34],
    [1030, 115, 260, 220, 0x202f25],
    [1370, 120, 330, 230, 0x1b3032],
    [160, 470, 360, 210, 0x202f25],
    [720, 440, 300, 220, 0x17352d],
    [1180, 470, 380, 190, 0x19342d],
    [250, 760, 330, 210, 0x172c34],
    [840, 760, 320, 210, 0x202f25],
    [1330, 735, 360, 230, 0x341f25],
  ];

  blocks.forEach(([x, y, w, h, color]) => {
    g.fillStyle(color, 1).fillRect(x, y, w, h);
    g.lineStyle(3, 0x8acfb3, 0.22).strokeRect(x, y, w, h);
    for (let wx = x + 22; wx < x + w - 20; wx += 54) {
      g.fillStyle(0xffd166, 0.5).fillRect(wx, y + 28, 26, 8);
      g.fillStyle(0x63d7ff, 0.36).fillRect(wx, y + h - 36, 28, 8);
    }
  });

  g.fillStyle(0x263f38, 1).fillRect(0, 410, WORLD.width, 70);
  g.fillRect(620, 0, 72, WORLD.height);
  g.fillRect(1260, 0, 72, WORLD.height);
  g.fillRect(0, 690, WORLD.width, 72);
  g.lineStyle(2, 0xffd166, 0.35);
  g.lineBetween(0, 445, WORLD.width, 445);
  g.lineBetween(656, 0, 656, WORLD.height);
  g.lineBetween(1296, 0, 1296, WORLD.height);
  g.lineBetween(0, 726, WORLD.width, 726);

  scene.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
}

function createPlayer(scene) {
  const body = scene.add.graphics();
  body.fillStyle(0xedf7f1, 1).fillRoundedRect(0, 0, 30, 38, 6);
  body.fillStyle(0x69e0a3, 1).fillRect(7, 8, 16, 6);
  body.generateTexture("player", 30, 38);
  body.destroy();

  player = scene.physics.add.sprite(980, 560, "player");
  player.setCollideWorldBounds(true);
  player.body.setSize(24, 30);
  scene.cameras.main.startFollow(player, true, 0.08, 0.08);
}

function createInteractables(scene) {
  interactZones = scene.physics.add.staticGroup();
  sigilObjects = scene.physics.add.staticGroup();

  locations.forEach((loc) => {
    const terminal = scene.add.container(loc.x, loc.y);
    const g = scene.add.graphics();
    g.fillStyle(loc.color, 0.22).fillCircle(0, 0, 58);
    g.lineStyle(3, loc.color, 0.82).strokeCircle(0, 0, 58);
    g.fillStyle(0x0b1513, 1).fillRoundedRect(-36, -24, 72, 48, 6);
    g.lineStyle(2, loc.color, 1).strokeRoundedRect(-36, -24, 72, 48, 6);
    g.fillStyle(loc.color, 1).fillRect(-22, -8, 44, 5);
    terminal.add(g);
    terminal.add(scene.add.text(-66, 68, loc.label, { color: "#edf7f1", fontSize: "15px" }));
    const zone = scene.add.zone(loc.x, loc.y, 145, 145);
    scene.physics.add.existing(zone, true);
    zone.kind = loc.id === "vault" ? "vault" : "challenge";
    zone.challengeId = loc.id;
    interactZones.add(zone);
  });

  sigils.forEach((sigil) => {
    const g = scene.add.graphics();
    g.fillStyle(0xffd166, 0.25).fillCircle(0, 0, 18);
    g.lineStyle(2, 0xffd166, 0.95).strokeCircle(0, 0, 18);
    g.lineStyle(2, 0x69e0a3, 0.9).lineBetween(-10, 0, 10, 0).lineBetween(0, -10, 0, 10);
    g.generateTexture(`sigil-${sigil.id}`, 40, 40);
    g.destroy();
    const sprite = scene.physics.add.staticSprite(sigil.x, sigil.y, `sigil-${sigil.id}`);
    sprite.sigilId = sigil.id;
    sigilObjects.add(sprite);
  });

  promptText = scene.add
    .text(0, 0, "E", {
      color: "#09110f",
      backgroundColor: "#ffd166",
      fontSize: "18px",
      padding: { x: 8, y: 4 },
    })
    .setDepth(20)
    .setVisible(false);
}

function createInput(scene) {
  cursors = scene.input.keyboard.createCursorKeys();
  keys = scene.input.keyboard.addKeys("W,A,S,D,E,ESC");
  keys.E.on("down", interact);
  keys.ESC.on("down", closeModal);
}

function update() {
  if (!player) return;
  const speed = 260;
  const x = Number(Boolean(cursors.right.isDown || keys.D.isDown)) - Number(Boolean(cursors.left.isDown || keys.A.isDown));
  const y = Number(Boolean(cursors.down.isDown || keys.S.isDown)) - Number(Boolean(cursors.up.isDown || keys.W.isDown));
  const len = Math.hypot(x, y) || 1;
  player.setVelocity((x / len) * speed, (y / len) * speed);

  state.activePrompt = null;
  interactZones.children.iterate((zone) => {
    if (Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), zone.getBounds())) {
      state.activePrompt = zone;
    }
  });

  sigilObjects.children.iterate((sprite) => {
    if (!sprite.active) return;
    if (Phaser.Math.Distance.Between(player.x, player.y, sprite.x, sprite.y) < 42) {
      state.sigils.add(sprite.sigilId);
      sprite.destroy();
      updateHud();
    }
  });

  if (state.activePrompt) {
    promptText.setPosition(player.x - 12, player.y - 62).setVisible(true);
  } else {
    promptText.setVisible(false);
  }
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
    showModal(`<h2>${challenge.title}</h2><p>${challenge.npc}: This district is stable. Carry the code segment forward.</p>`);
    return;
  }

  const options = challenge.options
    .map((option, index) => `<button data-option="${index}">${option.text}</button>`)
    .join("");
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
      if (option.ok) {
        state.completed.add(id);
        state.codes[id] = option.code;
        button.classList.add("correct");
        document.querySelectorAll("[data-option]").forEach((b) => (b.disabled = true));
        updateHud();
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
      else if (key === "ok") {
        result.hidden = false;
        if (input === FINAL_CODE) {
          state.finalOpen = true;
          state.completed.add("vault");
          result.textContent = "Vault open. Priva-city trust protocol restored.";
          updateHud();
        } else {
          result.textContent = "Code rejected. Finish each district and enter the segments in quest order.";
        }
      } else if (input.length < 6) {
        input += key;
      }
      render();
    });
  });
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
  document.getElementById("code-slots").textContent = `Code: ${state.codes.consent || "--"} ${state.codes.rights || "--"} ${state.codes.retention || "--"}`;
  document.getElementById("sigils").textContent = `Sigils: ${state.sigils.size}/4`;
  const list = document.getElementById("quest-list");
  list.innerHTML = quests
    .map((quest) => `<li class="${state.completed.has(quest.id) ? "done" : ""}">${quest.label}</li>`)
    .join("");
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");
  document.getElementById("timer").textContent = `${mins}:${secs}`;
}

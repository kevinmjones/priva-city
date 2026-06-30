// audio.js — Procedural WebAudio for Priva-city v2.
// All SFX and the ambient pad are synthesised at runtime, so there are no audio
// files to ship and nothing to copyright-clear. Starts muted until first user
// gesture (browser autoplay policy / fail-fast on locked AudioContext).

let ctx = null;
let master = null;
let enabled = false;
let ambientGain = null;

export function initAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);
  enabled = true;
  startAmbient();
}

export function resume() {
  if (ctx && ctx.state === "suspended") ctx.resume();
}

export function setMuted(m) {
  if (!master) return;
  master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05);
}

function env(node, t0, a, d, peak, sustain) {
  const g = node.gain;
  g.setValueAtTime(0.0001, t0);
  g.exponentialRampToValueAtTime(peak, t0 + a);
  g.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t0 + a + d);
  return g;
}

function blip({ freq = 440, type = "square", dur = 0.12, peak = 0.25, slide = 0 }) {
  if (!enabled) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  env(g, t0, 0.005, dur, peak, 0.0001);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  step() { blip({ freq: 120 + Math.random() * 30, type: "triangle", dur: 0.06, peak: 0.08, slide: -40 }); },
  jump() { blip({ freq: 320, type: "square", dur: 0.18, peak: 0.18, slide: 260 }); },
  land() { blip({ freq: 140, type: "triangle", dur: 0.1, peak: 0.14, slide: -60 }); },
  interact() { blip({ freq: 520, type: "sine", dur: 0.14, peak: 0.2, slide: 180 }); },
  toggle() { blip({ freq: 660, type: "square", dur: 0.07, peak: 0.16 }); },
  error() { blip({ freq: 180, type: "sawtooth", dur: 0.22, peak: 0.2, slide: -60 }); },
  success() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => blip({ freq: f, type: "square", dur: 0.16, peak: 0.18 }), i * 90));
  },
  pickup() { blip({ freq: 880, type: "sine", dur: 0.12, peak: 0.18, slide: 220 }); },
  start() {
    [392, 523, 659].forEach((f, i) =>
      setTimeout(() => blip({ freq: f, type: "square", dur: 0.2, peak: 0.2 }), i * 120));
  },
};

// Slow evolving ambient drone — two detuned saws through a lowpass + slow LFO.
function startAmbient() {
  if (!enabled) return;
  ambientGain = ctx.createGain();
  ambientGain.gain.value = 0.06;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  ambientGain.connect(master);
  filter.connect(ambientGain);

  [55, 55.4, 82.5].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.connect(filter);
    o.start();
  });
  // slow filter sweep LFO
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.05;
  lfoGain.gain.value = 240;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();
}

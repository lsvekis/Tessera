/* =====================================================================
   Part 7: audio — every sound and both songs are synthesised live with
   the Web Audio API (no audio files).
   ===================================================================== */
const SND = (() => {
  let ac = null, out = null, musicBus = null, sfxBus = null, verbIn = null, noise = null;
  let music = null, lastHover = 0, meterNode = null;
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch (e) { return false; }
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    out = ac.createGain(); out.gain.value = 0.9; out.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 1; musicBus.connect(out);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.85; sfxBus.connect(out);
    const verb = ac.createConvolver();
    const len = Math.floor(ac.sampleRate * 2.6), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    verbIn = ac.createGain(); verbIn.gain.value = 0.32; verbIn.connect(verb); verb.connect(out);
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });
    return true;
  }
  function unlock() {
    if (!init()) return false;
    if (ac.state === 'suspended') ac.resume();
    return true;
  }
  function ready() { return !!ac && ac.state === 'running'; }

  /* ---------- building blocks ---------- */
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    if (hold > 0) g.gain.setValueAtTime(Math.max(0.0002, peak), t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function tone(dest, type, f, t, rel, vol, o) {
    o = o || {};
    const a = o.a === undefined ? 0.005 : o.a, hold = o.hold || 0;
    const osc = ac.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || rel));
    if (o.detune) osc.detune.value = o.detune;
    const g = ac.createGain(); env(g, t, a, vol, hold, rel);
    let node = osc;
    if (o.lp) {
      const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); fl.Q.value = o.q || 0.7;
      if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + a + hold + rel * 0.5);
      node.connect(fl); node = fl;
    }
    if (o.bp) { const fb = ac.createBiquadFilter(); fb.type = 'bandpass'; fb.frequency.value = o.bp; fb.Q.value = o.bq || 1; node.connect(fb); node = fb; }
    node.connect(g); g.connect(dest);
    if (o.verb) { const s = ac.createGain(); s.gain.value = o.verb; g.connect(s); s.connect(verbIn); }
    const end = t + a + hold + rel + 0.05;
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(end); }
    osc.start(t); osc.stop(end);
  }
  function burst(dest, t, rel, vol, o) {
    o = o || {};
    const a = o.a === undefined ? 0.003 : o.a, hold = o.hold || 0;
    const src = ac.createBufferSource(); src.buffer = noise;
    const fl = ac.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.frequency.setValueAtTime(o.f || 1000, t); fl.Q.value = o.q || 1;
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + a + hold + rel);
    const g = ac.createGain(); env(g, t, a, vol, hold, rel);
    src.connect(fl); fl.connect(g); g.connect(dest);
    if (o.verb) { const s = ac.createGain(); s.gain.value = o.verb; g.connect(s); s.connect(verbIn); }
    src.start(t, Math.random() * 1.2); src.stop(t + a + hold + rel + 0.05);
  }

  /* ---------- instruments ---------- */
  const I = {
    kick: (d, t, v) => { tone(d, 'sine', 160, t, 0.34, v, { to: 42, glide: 0.22, a: 0.002 }); burst(d, t, 0.025, v * 0.25, { type: 'highpass', f: 2500 }); },
    tom: (d, t, f, v) => { tone(d, 'sine', f, t, 0.42, v, { to: f * 0.55, glide: 0.34, a: 0.002, verb: 0.18 }); burst(d, t, 0.07, v * 0.22, { type: 'bandpass', f: f * 5, q: 0.9 }); },
    shaker: (d, t, v) => burst(d, t, 0.045, v, { type: 'highpass', f: 6500, a: 0.006 }),
    pluck: (d, t, f, v, dur) => { tone(d, 'triangle', f, t, dur || 0.7, v, { a: 0.003, verb: 0.3 }); tone(d, 'sine', f * 4, t, (dur || 0.7) * 0.22, v * 0.22, { a: 0.002 }); },
    flute: (d, t, f, dur, v) => {
      tone(d, 'sine', f, t, 0.28, v, { a: 0.07, hold: Math.max(0.05, dur - 0.12), vib: [5.3, f * 0.011], verb: 0.5 });
      tone(d, 'triangle', f * 2, t, 0.2, v * 0.1, { a: 0.09, hold: Math.max(0.05, dur - 0.15) });
      burst(d, t, 0.14, v * 0.12, { type: 'bandpass', f: f * 2.2, q: 2.5, a: 0.03 });
    },
    pad: (d, t, freqs, dur, v) => { for (const f of freqs) for (const det of [-8, 7]) tone(d, 'sawtooth', f, t, 1.3, v, { a: 0.6, hold: Math.max(0, dur - 0.6), lp: 850, q: 0.4, detune: det, verb: 0.55 }); },
    bass: (d, t, f, dur, v) => { tone(d, 'triangle', f, t, 0.18, v, { a: 0.012, hold: Math.max(0.02, dur - 0.1), lp: 520 }); tone(d, 'sine', f / 2, t, 0.2, v * 0.7, { a: 0.012, hold: Math.max(0.02, dur - 0.1) }); },
    bell: (d, t, f, v, dur) => { dur = dur || 1.6; for (const [m, k] of [[1, 1], [2.76, 0.38], [5.4, 0.18]]) tone(d, 'sine', f * m, t, dur / Math.sqrt(m), v * k, { a: 0.002, verb: 0.55 }); },
    brass: (d, t, f, dur, v) => {
      tone(d, 'sawtooth', f, t, 0.35, v, { a: 0.05, hold: dur, lp: 380, lpTo: 2600, q: 2.2, verb: 0.4 });
      tone(d, 'sawtooth', f * 1.004, t, 0.35, v * 0.7, { a: 0.06, hold: dur, lp: 420, lpTo: 2000, verb: 0.35 });
    },
    metal: (d, t, v) => { for (const m of [1, 2.41, 3.13, 4.72, 6.1]) tone(d, 'square', 520 * m, t, 0.28 / Math.sqrt(m), v / m, { a: 0.001, lp: 7000 }); },
    gong: (d, t, v) => { for (const m of [1, 1.47, 2.09, 2.56, 3.2, 4.1]) tone(d, 'sine', 66 * m, t, 3.2, v / m * 0.7, { a: 0.012, verb: 0.7 }); burst(d, t, 1.1, v * 0.18, { type: 'lowpass', f: 900 }); }
  };

  /* ---------- sound effects ---------- */
  const S = () => sfxBus;
  const FX = {
    hover: (t) => tone(S(), 'sine', 1560, t, 0.045, 0.03, { a: 0.002 }),
    click: (t) => { tone(S(), 'sine', 560, t, 0.08, 0.17, { to: 320, a: 0.002 }); burst(S(), t, 0.035, 0.1, { type: 'bandpass', f: 2000, q: 3 }); },
    back: (t) => tone(S(), 'sine', 400, t, 0.1, 0.16, { to: 230 }),
    toggle: (t) => { tone(S(), 'triangle', 660, t, 0.06, 0.11); tone(S(), 'triangle', 990, t + 0.05, 0.08, 0.1); },
    select: (t) => { I.pluck(S(), t, 660, 0.16, 0.3); I.pluck(S(), t + 0.045, 990, 0.1, 0.3); },
    move: (t) => { for (let k = 0; k < 3; k++) burst(S(), t + k * 0.075, 0.05, 0.13, { type: 'lowpass', f: 650, a: 0.004 }); },
    hit: (t) => { burst(S(), t, 0.12, 0.42, { type: 'lowpass', f: 1500 }); tone(S(), 'sine', 150, t, 0.18, 0.45, { to: 60 }); I.metal(S(), t + 0.01, 0.08); },
    shoot: (t) => { burst(S(), t, 0.2, 0.26, { type: 'bandpass', f: 2600, to: 500, q: 1.4 }); tone(S(), 'triangle', 950, t, 0.09, 0.05, { to: 420 }); },
    boulder: (t) => { burst(S(), t, 0.4, 0.3, { type: 'bandpass', f: 300, to: 1200, q: 0.8, a: 0.05 }); tone(S(), 'sine', 95, t + 0.28, 0.4, 0.6, { to: 38 }); },
    kill: (t) => { I.kick(S(), t, 0.75); burst(S(), t, 0.45, 0.32, { type: 'lowpass', f: 2600, to: 280 }); tone(S(), 'sawtooth', 190, t + 0.05, 0.35, 0.1, { to: 70, lp: 900 }); },
    capture: (t) => { I.tom(S(), t, 110, 0.45); [293.66, 369.99, 440, 587.33].forEach((f, k) => I.brass(S(), t + k * 0.11, f, 0.16, 0.1)); I.bell(S(), t + 0.46, 1174.66, 0.1); },
    level: (t) => [880, 1108.73, 1318.51, 1760].forEach((f, k) => I.bell(S(), t + k * 0.07, f, 0.1, 1.2)),
    build: (t) => { for (let k = 0; k < 3; k++) { burst(S(), t + k * 0.12, 0.05, 0.28, { type: 'bandpass', f: 900 + k * 90, q: 4 }); tone(S(), 'sine', 310 - k * 25, t + k * 0.12, 0.08, 0.22, { to: 170 }); } },
    buy: (t) => { I.bell(S(), t, 1567.98, 0.09, 0.5); I.bell(S(), t + 0.06, 2093, 0.08, 0.6); },
    train: (t) => { I.tom(S(), t, 98, 0.45); I.brass(S(), t + 0.06, 220, 0.22, 0.1); I.brass(S(), t + 0.06, 329.63, 0.22, 0.07); },
    research: (t) => { tone(S(), 'sine', 420, t, 0.7, 0.07, { to: 1700, glide: 0.55, verb: 0.6 }); [1046.5, 1318.5, 1568, 2093].forEach((f, k) => I.bell(S(), t + 0.22 + k * 0.08, f, 0.07, 1.4)); },
    forge: (t) => { I.metal(S(), t, 0.22); I.metal(S(), t + 0.2, 0.16); burst(S(), t, 0.25, 0.1, { type: 'highpass', f: 3500 }); },
    heal: (t) => { [523.25, 659.25, 783.99].forEach((f, k) => tone(S(), 'sine', f, t + k * 0.06, 0.6, 0.07, { a: 0.02, verb: 0.6 })); tone(S(), 'sine', 420, t, 0.5, 0.04, { to: 950 }); },
    promote: (t) => { I.brass(S(), t, 392, 0.12, 0.1); I.brass(S(), t + 0.13, 523.25, 0.3, 0.1); I.bell(S(), t + 0.2, 1567.98, 0.08, 1.2); },
    reward: (t) => { [659.25, 783.99, 987.77, 1318.51].forEach((f, k) => I.bell(S(), t + k * 0.09, f, 0.09, 1.3)); I.pad(S(), t, [329.63, 493.88], 0.4, 0.03); },
    magic: (t) => { tone(S(), 'sine', 300, t, 0.9, 0.06, { to: 1200, glide: 0.8, vib: [9, 30], verb: 0.8 }); [1318.5, 1396.9, 1760].forEach((f, k) => I.bell(S(), t + 0.15 + k * 0.1, f, 0.06, 1.4)); },
    feast: (t) => { I.pluck(S(), t, 523.25, 0.14, 0.4); I.pluck(S(), t + 0.08, 659.25, 0.12, 0.4); I.pluck(S(), t + 0.16, 783.99, 0.12, 0.6); },
    bad: (t) => { tone(S(), 'sawtooth', 165, t, 0.2, 0.1, { lp: 600, to: 125 }); tone(S(), 'sawtooth', 120, t + 0.12, 0.26, 0.1, { lp: 500, to: 90 }); },
    turn: (t) => { I.tom(S(), t, 98, 0.45); I.tom(S(), t + 0.13, 130, 0.35); I.brass(S(), t + 0.2, 293.66, 0.32, 0.1); I.brass(S(), t + 0.2, 440, 0.32, 0.07); },
    endturn: (t) => { I.tom(S(), t, 82, 0.4); I.tom(S(), t + 0.1, 82, 0.28); I.tom(S(), t + 0.2, 110, 0.32); },
    whoosh: (t) => burst(S(), t, 0.45, 0.26, { type: 'bandpass', f: 380, to: 3200, q: 0.8, a: 0.12 }),
    poof: (t) => { burst(S(), t, 0.42, 0.22, { type: 'bandpass', f: 900, to: 260, q: 0.7, a: 0.05 }); burst(S(), t + 0.02, 0.3, 0.1, { type: 'highpass', f: 2600, a: 0.03 }); tone(S(), 'sine', 520, t, 0.3, 0.05, { to: 240, glide: 0.25, a: 0.01 }); [1567.98, 2093].forEach((f, k) => I.bell(S(), t + 0.05 + k * 0.05, f, 0.035, 0.7)); },
    poof: (t) => {
      /* soft cloud puff + springy boing */
      burst(S(), t, 0.35, 0.16, { type: 'lowpass', f: 1400, to: 380, a: 0.02 });
      burst(S(), t + 0.02, 0.18, 0.06, { type: 'bandpass', f: 3200, q: 1.2 });
      tone(S(), 'sine', 520, t, 0.32, 0.09, { to: 780, glide: 0.08, vib: [14, 30] });
      tone(S(), 'triangle', 1040, t + 0.06, 0.2, 0.035, { to: 1400, glide: 0.1 });
    },
    coin: (t) => { for (let k = 0; k < 4; k++) { I.bell(S(), t + k * 0.075, 1567.98 * (k % 2 ? 1.26 : 1), 0.06, 0.5); tone(S(), 'square', 2637 + k * 120, t + k * 0.075, 0.05, 0.012, { a: 0.001, lp: 5000 }); } },
    purchase: (t) => {
      I.kick(S(), t, 0.5);
      burst(S(), t, 0.3, 0.12, { type: 'bandpass', f: 800, to: 5200, q: 1, a: 0.12 });
      [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => I.brass(S(), t + 0.12 + k * 0.07, f, k === 3 ? 0.5 : 0.1, 0.07));
      [2093, 2637.02, 3135.96, 4186.01].forEach((f, k) => I.bell(S(), t + 0.36 + k * 0.05, f, 0.05, 1.2));
    },
    equip: (t) => { burst(S(), t, 0.12, 0.1, { type: 'bandpass', f: 900, to: 2600, q: 1.1 }); I.pluck(S(), t + 0.05, 783.99, 0.12, 0.4); I.pluck(S(), t + 0.1, 1174.66, 0.1, 0.5); },
    meow: (t) => { tone(S(), 'sawtooth', 620, t, 0.28, 0.06, { to: 900, glide: 0.12, bp: 1500, bq: 2.5, a: 0.03 }); tone(S(), 'sawtooth', 900, t + 0.14, 0.3, 0.05, { to: 560, glide: 0.25, bp: 1400, bq: 2.5 }); },
    grab: (t) => { tone(S(), 'triangle', 330, t, 0.09, 0.12, { to: 520, glide: 0.07, a: 0.003 }); burst(S(), t, 0.05, 0.07, { type: 'bandpass', f: 1400, q: 2 }); },
    release: (t) => { tone(S(), 'sine', 520, t, 0.22, 0.1, { to: 260, glide: 0.18, vib: [16, 22] }); tone(S(), 'triangle', 780, t + 0.05, 0.12, 0.05, { to: 600 }); },
    unlock: (t) => {
      /* charge-up along the branch line, then a bright square "stamp" on the tile */
      burst(S(), t, 0.05, 0.16, { type: 'bandpass', f: 500, to: 4800, q: 1.3, a: 0.22 });
      tone(S(), 'sawtooth', 220, t, 0.06, 0.05, { to: 880, glide: 0.24, a: 0.2, lp: 1800 });
      const h = t + 0.24;
      I.kick(S(), h, 0.8); I.tom(S(), h, 98, 0.35);
      burst(S(), h, 0.5, 0.2, { type: 'lowpass', f: 3200, to: 300 });
      [261.63, 329.63, 392, 523.25].forEach((f) => I.brass(S(), h + 0.01, f, 0.42, 0.07));
      [1046.5, 1318.51, 1567.98, 2093, 2637].forEach((f, k) => I.bell(S(), h + 0.06 + k * 0.065, f, 0.075, 1.5));
      for (let k = 0; k < 7; k++) tone(S(), 'sine', 2600 + Math.random() * 2400, h + 0.3 + k * 0.05, 0.12, 0.025, { a: 0.002, verb: 0.7 });
    },
    upgrade: (t) => {
      /* anvil strikes + forge whoosh + bright confirmation */
      I.metal(S(), t, 0.2); I.kick(S(), t, 0.55);
      I.metal(S(), t + 0.13, 0.14);
      burst(S(), t + 0.02, 0.42, 0.18, { type: 'bandpass', f: 2400, to: 360, q: 0.9 });
      I.metal(S(), t + 0.26, 0.22); I.tom(S(), t + 0.26, 110, 0.4);
      [392, 493.88, 587.33].forEach((f) => I.brass(S(), t + 0.27, f, 0.3, 0.07));
      [1567.98, 1975.53, 2349.32].forEach((f, k) => I.bell(S(), t + 0.34 + k * 0.06, f, 0.07, 1.1));
    },
    tick: (t) => { I.tom(S(), t, 120 + Math.random() * 30, 0.32); I.shaker(S(), t + 0.06, 0.08); },
    riser: (t) => {
      burst(S(), t, 0.6, 0.2, { type: 'bandpass', f: 180, to: 5200, q: 1.1, a: 2.3 });
      let dt = 0.3, x = 0;
      while (x < 2.7) { I.tom(S(), t + x, 92 + x * 14, 0.14 + x * 0.1); x += dt; dt = Math.max(0.055, dt * 0.84); }
      I.pad(S(), t, [146.83, 220, 293.66], 2.4, 0.035);
    },
    boom: (t) => {
      I.kick(S(), t, 1); I.gong(S(), t, 0.45);
      [146.83, 220, 293.66, 369.99].forEach((f) => I.brass(S(), t + 0.02, f, 0.9, 0.08));
      for (let k = 0; k < 7; k++) I.bell(S(), t + 0.25 + k * 0.06, 1174.66 * Math.pow(1.12246, k % 4), 0.05, 1.2);
    },
    victory: (t) => {
      I.gong(S(), t, 0.4); I.tom(S(), t, 98, 0.5); I.tom(S(), t + 0.2, 110, 0.5);
      [[293.66, 0], [369.99, 0.22], [440, 0.44], [587.33, 0.66]].forEach(([f, d]) => I.brass(S(), t + d, f, d === 0.66 ? 1.2 : 0.18, 0.11));
      [587.33, 739.99, 880].forEach((f) => I.brass(S(), t + 0.66, f, 1.2, 0.06));
    },
    defeat: (t) => { I.gong(S(), t, 0.35); [[293.66, 0], [261.63, 0.35], [233.08, 0.7], [220, 1.05]].forEach(([f, d]) => I.brass(S(), t + d, f, d > 1 ? 1.1 : 0.3, 0.1)); }
  };
  const TRIBE_MOTIF = {
    ironvale: (t) => { I.metal(S(), t, 0.12); I.brass(S(), t + 0.05, 146.83, 0.3, 0.1); I.brass(S(), t + 0.05, 220, 0.3, 0.07); },
    sunspear: (t) => [293.66, 311.13, 369.99, 392, 440].forEach((f, k) => I.pluck(S(), t + k * 0.07, f * 2, 0.12, 0.5)),
    verdant: (t) => { [392, 440, 523.25, 587.33].forEach((f, k) => I.pluck(S(), t + k * 0.08, f * 2, 0.12, 0.6)); tone(S(), 'sine', 2600, t + 0.35, 0.07, 0.04, { to: 3400 }); tone(S(), 'sine', 2700, t + 0.46, 0.07, 0.04, { to: 3600 }); },
    tidecallers: (t) => { FX.whoosh(t); [523.25, 659.25, 783.99].forEach((f, k) => I.bell(S(), t + 0.1 + k * 0.09, f * 2, 0.07, 1.4)); },
    umbral: (t) => { I.pad(S(), t, [146.83, 174.61, 220], 0.6, 0.05); I.bell(S(), t + 0.05, 293.66, 0.08, 2); },
    frostholm: (t) => { burst(S(), t, 0.8, 0.07, { type: 'highpass', f: 4000, a: 0.3 }); [1318.51, 987.77, 1567.98].forEach((f, k) => I.bell(S(), t + k * 0.1, f, 0.07, 1.6)); }
  };
  function play(kind) {
    if (!ready()) return;
    const t = ac.currentTime + 0.01;
    if (kind === 'hover') { const now = performance.now(); if (now - lastHover < 70) return; lastHover = now; }
    try { if (FX[kind]) FX[kind](t); } catch (e) { /* ignore scheduling errors */ }
  }
  function tribe(key) { if (!ready() || !TRIBE_MOTIF[key]) return; try { TRIBE_MOTIF[key](ac.currentTime + 0.01, sfxBus); } catch (e) { /* ignore */ } }

  /* ---------- music ---------- */
  const MENU_CHORDS = [[50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64], [50, 57, 62, 65], [43, 55, 58, 62], [46, 53, 58, 62], [45, 52, 57, 61]];
  const MENU_MEL = [
    [0, 0, 69, 6], [0, 6, 67, 2], [0, 8, 65, 4], [0, 12, 62, 4],
    [1, 0, 65, 4], [1, 4, 67, 4], [1, 8, 69, 8],
    [2, 0, 72, 6], [2, 6, 69, 2], [2, 8, 67, 4], [2, 12, 65, 4],
    [3, 0, 67, 10], [3, 12, 64, 4],
    [4, 0, 74, 6], [4, 6, 72, 2], [4, 8, 69, 4], [4, 12, 67, 4],
    [5, 0, 67, 4], [5, 4, 70, 4], [5, 8, 74, 8],
    [6, 0, 72, 4], [6, 4, 74, 4], [6, 8, 77, 4], [6, 12, 74, 4],
    [7, 0, 76, 8], [7, 8, 73, 4], [7, 12, 69, 4]
  ];
  const ARP = [1, 2, 3, 2, 1, 3, 2, 3];
  const SONGS = {
    menu: {
      bpm: 94, bars: 8, vol: 0.55,
      play(d, step, t, loop, spb) {
        const bar = step >> 4, s = step & 15, ch = MENU_CHORDS[bar], sec = loop % 4;
        const full = loop > 0 && sec !== 3;
        if (s === 0) I.pad(d, t, ch.slice(1).map(midi), spb * 16, 0.028);
        if ((loop > 0 || bar >= 2) && [0, 6, 8, 12, 14].includes(s)) {
          const n = s === 6 || s === 14 ? ch[0] + 7 : s === 12 ? ch[0] + 12 : ch[0];
          I.bass(d, t, midi(n - 12), spb * (s === 0 ? 5 : 2), 0.16);
        }
        if (s % 2 === 0 && !(sec === 3 && bar >= 6)) I.pluck(d, t, midi(ch[ARP[(s >> 1) % 8]] + 12), 0.05 + (s % 4 === 0 ? 0.02 : 0), 0.6);
        if (full || bar >= 4) {
          if ([0, 7, 10].includes(s)) I.tom(d, t, 88, 0.2);
          if ([4, 12].includes(s)) I.tom(d, t, 132, 0.15);
          if (full && s === 15 && bar % 2 === 1) I.tom(d, t, 160, 0.09);
          if (full && (s === 0 || s === 8)) I.kick(d, t, 0.2);
        }
        if (s % 2 === 0) I.shaker(d, t, s % 4 === 2 ? 0.05 : 0.025);
        if (sec === 1 || sec === 2) {
          for (const [b, st, n, len] of MENU_MEL) if (b === bar && st === s) {
            I.flute(d, t, midi(n + (sec === 2 ? 12 : 0)), len * spb, sec === 2 ? 0.07 : 0.09);
            if (sec === 2) I.bell(d, t, midi(n), 0.025, 1.2);
          }
        }
      }
    },
    game: {
      bpm: 70, bars: 8, vol: 0.3,
      play(d, step, t, loop, spb) {
        const chords = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 55, 58, 62], [45, 52, 57, 61], [50, 57, 62, 65], [41, 53, 57, 60], [48, 55, 60, 64], [45, 52, 57, 61]];
        const bar = step >> 4, s = step & 15, ch = chords[bar];
        if (s === 0) { I.pad(d, t, ch.slice(1).map(midi), spb * 16, 0.022); I.bass(d, t, midi(ch[0] - 12), spb * 8, 0.1); }
        if (s === 0 || s === 10) I.tom(d, t, 80, 0.12);
        if (s === 8 && bar % 2 === 1) I.tom(d, t, 120, 0.07);
        if (s % 4 === 2) I.shaker(d, t, 0.018);
        const pent = [62, 65, 67, 69, 72, 74];
        if ((s === 4 || s === 12) && ((step * 7 + loop * 3) % 5 < 2)) I.pluck(d, t, midi(pent[(step + loop) % 6] + 12), 0.04, 0.9);
      }
    }
  };
  function startMusic(name, opt) {
    if (!ready()) return;
    if (music && music.name === name) return;
    opt = opt || {};
    stopMusic(opt.fadeOut || 0.9);
    const song = SONGS[name]; if (!song) return;
    const bus = ac.createGain();
    bus.gain.setValueAtTime(0.0001, ac.currentTime);
    bus.gain.exponentialRampToValueAtTime(song.vol, ac.currentTime + (opt.fadeIn || 1.8));
    bus.connect(musicBus);
    const m = { name, song, bus, step: 0, loop: 0, next: ac.currentTime + 0.12 };
    const spb = song.spb || 60 / song.bpm / 4, len = song.bars * (song.stepsPerBar || 16);
    m.timer = setInterval(() => {
      if (!ac || ac.state !== 'running') return;
      if (m.next < ac.currentTime - 0.5) m.next = ac.currentTime + 0.05;
      while (m.next < ac.currentTime + 0.35) {
        try { song.play(bus, m.step, m.next, m.loop, spb); } catch (e) { /* ignore */ }
        m.next += spb; m.step++;
        if (m.step >= len) { m.step = 0; m.loop++; }
      }
    }, 60);
    music = m;
  }
  function stopMusic(fade) {
    const m = music; if (!m || !ac) return;
    music = null;
    clearInterval(m.timer);
    const t = ac.currentTime, f = fade || 0.8;
    try { m.bus.gain.cancelScheduledValues(t); m.bus.gain.setValueAtTime(Math.max(0.0001, m.bus.gain.value), t); m.bus.gain.exponentialRampToValueAtTime(0.0001, t + f); } catch (e) { /* ignore */ }
    setTimeout(() => { try { m.bus.disconnect(); } catch (e) { /* ignore */ } }, f * 1000 + 3500);
  }
  function current() { return music ? music.name : null; }
  return { unlock, ready, play, tribe, startMusic, stopMusic, current, I, tone, burst, midi, register: (name, song) => { SONGS[name] = song; },
    /* short tribe "hello" sound: fn(t, dest) schedules notes on dest */
    registerMotif: (key, fn) => { TRIBE_MOTIF[key] = fn; }, hasSong: (name) => !!SONGS[name],
    /* level meter for testing: {rms, peak} of the mixed output right now */
    meter: () => {
      if (!ac) return null;
      if (!meterNode) { meterNode = ac.createAnalyser(); meterNode.fftSize = 2048; out.connect(meterNode); }
      const buf = new Float32Array(meterNode.fftSize); meterNode.getFloatTimeDomainData(buf);
      let sum = 0, peak = 0; for (const v of buf) { sum += v * v; peak = Math.max(peak, Math.abs(v)); }
      return { rms: Math.sqrt(sum / buf.length), peak };
    } };
})();

/* which music belongs to the current screen */
function wantedSong() {
  if (UIState.screen === 'game') return G && !G.allAI && G.tribes[G.human] ? 'tribe_' + G.tribes[G.human].key + '_calm' : 'menu';
  if (UIState.screen === 'setup') return 'tribe_' + UIState.opts.tribe;
  return 'menu';
}
function syncMusic(fast) {
  if (!SND.ready()) return;
  if (!UIState.settings.music || UIState.loading) { SND.stopMusic(0.8); return; }
  SND.startMusic(wantedSong(), fast ? { fadeIn: 0.7, fadeOut: 0.45 } : null);
}

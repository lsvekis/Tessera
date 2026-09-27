/* =====================================================================
   Part 16: tribe music II — themes for the seven newer tribes, built
   exactly like Part 9: one full theme for the picker screen plus a
   thinner, quieter "_calm" variant that plays during a match.
   All melodies here are original.
   ===================================================================== */
Object.assign(TRIBE_THEMES, {
  maccabees: 'Dance of the Undying Flame',
  northpole: 'Carol of the Toy Workshop',
  liberty: 'Fifes of the Open Prairie',
  meowtopia: 'Parade of the Nine Lives',
  rexlands: 'Stomp of the Thunder Lizards',
  cogworks: 'Pulse of the Iron Grid',
  pumpkin: 'Waltz of the Hollow Moon'
});
(() => {
  const { I, tone, burst, midi } = SND;
  const X = {
    /* --- klezmer: reed clarinet, hammered tsimbl, dance hand-drums --- */
    clar: (d, t, f, dur, v) => {
      tone(d, 'square', f, t, 0.16, v * 0.55, { a: 0.028, hold: Math.max(0.04, dur - 0.18), lp: f * 4.2, q: 3.2, vib: [5.6, f * 0.007], verb: 0.35 });
      tone(d, 'sawtooth', f, t, 0.15, v * 0.22, { a: 0.04, hold: Math.max(0.04, dur - 0.18), lp: f * 2.4, q: 1.3, verb: 0.3 });
      tone(d, 'sine', f * 2, t, 0.12, v * 0.1, { a: 0.05, hold: Math.max(0.03, dur - 0.2) });
      burst(d, t, 0.06, v * 0.05, { type: 'bandpass', f: f * 3, q: 3, a: 0.02 });
    },
    krekht: (d, t, f, v) => tone(d, 'square', f, t, 0.05, v, { a: 0.006, lp: f * 3.5, q: 3 }),
    tsimbl: (d, t, f, v) => { tone(d, 'triangle', f, t, 0.5, v, { a: 0.002, verb: 0.3 }); tone(d, 'square', f * 2.01, t, 0.12, v * 0.15, { a: 0.002, lp: 5200 }); tone(d, 'sine', f * 3.02, t, 0.08, v * 0.09, { a: 0.001 }); },
    dof: (d, t, v) => { tone(d, 'sine', 108, t, 0.3, v, { to: 60, glide: 0.24, a: 0.002, verb: 0.14 }); burst(d, t, 0.045, v * 0.26, { type: 'lowpass', f: 430 }); },
    rim: (d, t, v) => { burst(d, t, 0.05, v, { type: 'bandpass', f: 3100, q: 2.2 }); tone(d, 'sine', 1720, t, 0.03, v * 0.2, { a: 0.001 }); },
    clap: (d, t, v) => { for (let k = 0; k < 3; k++) burst(d, t + k * 0.013, 0.07, v * (1 - k * 0.22), { type: 'bandpass', f: 1500, q: 1.1, verb: 0.28 }); },
    /* --- north pole: sleigh bells, tubular bells, glockenspiel --- */
    sleigh: (d, t, v) => { for (let k = 0; k < 5; k++) tone(d, 'sine', 2350 + Math.random() * 2700, t + Math.random() * 0.014, 0.12 + Math.random() * 0.1, v * (0.3 + Math.random() * 0.55), { a: 0.001, verb: 0.35 }); burst(d, t, 0.05, v * 0.28, { type: 'highpass', f: 7200 }); },
    tube: (d, t, f, v) => { for (const [m, k] of [[1, 1], [2.01, 0.46], [3.01, 0.2], [4.17, 0.1]]) tone(d, 'sine', f * m, t, 1.9 / Math.sqrt(m), v * k, { a: 0.004, verb: 0.6 }); },
    glock: (d, t, f, v) => { tone(d, 'sine', f, t, 0.5, v, { a: 0.001, verb: 0.5 }); tone(d, 'sine', f * 2.76, t, 0.14, v * 0.22, { a: 0.001 }); },
    /* --- liberty: piccolo fife, field snare --- */
    fife: (d, t, f, dur, v) => {
      tone(d, 'triangle', f, t, 0.1, v, { a: 0.012, hold: Math.max(0.03, dur - 0.09), vib: [6.6, f * 0.005], verb: 0.3 });
      tone(d, 'sine', f * 2, t, 0.09, v * 0.18, { a: 0.014, hold: Math.max(0.03, dur - 0.1) });
      burst(d, t, 0.08, v * 0.2, { type: 'bandpass', f: f * 1.7, q: 2.2, a: 0.012, verb: 0.25 });
    },
    rattle: (d, t, v) => { burst(d, t, 0.1, v, { type: 'bandpass', f: 2600, q: 0.7, verb: 0.16 }); tone(d, 'triangle', 205, t, 0.05, v * 0.4, { a: 0.001 }); },
    roll: (d, t, v, n, dur) => { for (let k = 0; k < n; k++) burst(d, t + k * dur / n, dur / n * 0.9, v * (0.35 + 0.65 * k / n), { type: 'bandpass', f: 2500, q: 0.9 }); },
    /* --- meowtopia: chiptune square, triangle bass, meow bend --- */
    sq: (d, t, f, dur, v) => { tone(d, 'square', f, t, 0.05, v, { a: 0.004, hold: Math.max(0.02, dur - 0.05), lp: 6200, verb: 0.2 }); tone(d, 'square', f * 2.005, t, 0.04, v * 0.2, { a: 0.004, hold: Math.max(0.02, dur - 0.05), lp: 7000 }); },
    nes: (d, t, f, dur, v) => tone(d, 'triangle', f, t, 0.05, v, { a: 0.003, hold: Math.max(0.02, dur - 0.04), lp: 900 }),
    meow: (d, t, v) => { tone(d, 'sawtooth', 700, t, 0.2, v, { to: 1080, glide: 0.1, bp: 1500, bq: 3, a: 0.02, verb: 0.25 }); tone(d, 'sawtooth', 1050, t + 0.12, 0.26, v * 0.75, { to: 620, glide: 0.22, bp: 1350, bq: 3 }); },
    chip: (d, t, v) => burst(d, t, 0.03, v, { type: 'highpass', f: 8000, a: 0.002 }),
    /* --- rexlands: huge toms, brass roar, bone rattle, chant --- */
    bigtom: (d, t, f, v) => { tone(d, 'sine', f, t, 0.6, v, { to: f * 0.5, glide: 0.45, a: 0.003, verb: 0.26 }); tone(d, 'triangle', f * 1.5, t, 0.16, v * 0.28, { a: 0.002 }); burst(d, t, 0.1, v * 0.22, { type: 'bandpass', f: f * 4, q: 0.8 }); },
    roar: (d, t, f, dur, v) => { tone(d, 'sawtooth', f * 0.86, t, 0.4, v, { to: f, glide: 0.3, a: 0.09, hold: dur, lp: 250, lpTo: 950, q: 3, verb: 0.45 }); tone(d, 'square', f * 0.5, t, 0.4, v * 0.45, { a: 0.1, hold: dur, lp: 420, q: 2 }); burst(d, t, dur * 0.4, v * 0.16, { type: 'bandpass', f: 300, to: 900, q: 0.9, a: 0.12 }); },
    bone: (d, t, v) => { for (let k = 0; k < 4; k++) tone(d, 'square', 1050 + Math.random() * 950, t + k * 0.026, 0.035, v * 0.45, { a: 0.001, lp: 5200 }); burst(d, t, 0.09, v * 0.45, { type: 'bandpass', f: 2200, q: 1.4, verb: 0.2 }); },
    chant: (d, t, f, dur, v) => { for (const det of [-14, 0, 14]) tone(d, 'sawtooth', f, t, 0.3, v, { a: 0.07, hold: Math.max(0.05, dur - 0.3), bp: 640, bq: 3.2, detune: det, verb: 0.5 }); tone(d, 'triangle', f, t, 0.24, v * 0.35, { a: 0.06, hold: Math.max(0.05, dur - 0.26), lp: 1500 }); },
    /* --- cogworks: acid saw, talk-box vox, clanking metal, machine sub --- */
    saw: (d, t, f, v, dur) => { tone(d, 'sawtooth', f, t, 0.09, v, { a: 0.003, hold: dur || 0.04, lp: f * 6, lpTo: f * 1.5, q: 6, verb: 0.15 }); tone(d, 'square', f * 0.997, t, 0.07, v * 0.35, { a: 0.003, hold: dur || 0.04, lp: 3000 }); },
    vox: (d, t, f, dur, v) => { for (const [bp, g] of [[700, 1], [1250, 0.6], [2550, 0.26]]) tone(d, 'sawtooth', f, t, 0.12, v * g, { a: 0.02, hold: Math.max(0.03, dur - 0.1), bp, bq: 7, verb: 0.25 }); tone(d, 'square', f / 2, t, 0.1, v * 0.22, { a: 0.02, hold: Math.max(0.03, dur - 0.1), lp: 900 }); },
    clank: (d, t, v) => { for (const m of [1, 1.83, 2.71, 3.9]) tone(d, 'square', 870 * m, t, 0.09 / Math.sqrt(m), v / m * 0.8, { a: 0.001, lp: 8000 }); burst(d, t, 0.045, v * 0.3, { type: 'bandpass', f: 4200, q: 1.6 }); },
    zap: (d, t, v) => { tone(d, 'square', 1750, t, 0.06, v, { to: 430, glide: 0.05, a: 0.001, lp: 5200 }); burst(d, t, 0.05, v * 0.5, { type: 'bandpass', f: 3000, q: 1.2 }); },
    sub: (d, t, f, dur, v) => { tone(d, 'square', f, t, 0.08, v, { a: 0.004, hold: dur, lp: 540, q: 4 }); tone(d, 'sine', f / 2, t, 0.1, v * 0.75, { a: 0.004, hold: dur }); },
    /* --- pumpkin: music box, creaking drone, distant toll, pizzicato --- */
    box: (d, t, f, v) => { tone(d, 'sine', f, t, 1.1, v, { a: 0.002, verb: 0.5 }); tone(d, 'sine', f * 2, t, 0.42, v * 0.38, { a: 0.002, verb: 0.4 }); tone(d, 'triangle', f * 4.02, t, 0.11, v * 0.11, { a: 0.001 }); burst(d, t, 0.022, v * 0.1, { type: 'bandpass', f: f * 3, q: 3 }); },
    creak: (d, t, v, dur) => { tone(d, 'sawtooth', 58, t, 0.6, v, { to: 47, glide: dur, a: 0.3, hold: dur, lp: 330, q: 5, verb: 0.35 }); burst(d, t, dur * 0.4, v * 0.22, { type: 'bandpass', f: 190, to: 95, q: 2, a: dur * 0.4 }); },
    toll: (d, t, f, v) => { for (const [m, k] of [[1, 1], [2.74, 0.33], [5.1, 0.13]]) tone(d, 'sine', f * m, t, 3.2 / Math.sqrt(m), v * k, { a: 0.004, verb: 0.75 }); },
    pizz: (d, t, f, v) => { tone(d, 'triangle', f, t, 0.15, v, { a: 0.002, lp: 1500, verb: 0.2 }); burst(d, t, 0.028, v * 0.18, { type: 'bandpass', f: f * 4, q: 2 }); },
    owl: (d, t, v) => { tone(d, 'sine', 520, t, 0.26, v, { to: 440, glide: 0.2, vib: [5, 11], a: 0.08, verb: 0.65 }); tone(d, 'sine', 1040, t, 0.2, v * 0.12, { a: 0.09, verb: 0.5 }); }
  };
  const mel = (list, bar, s, fn) => { for (const n of list) if (n[0] === bar && n[1] === s) fn(n[2], n[3]); };
  const ON = (calm, loop) => calm ? loop % 4 === 2 : (loop % 4 === 1 || loop % 4 === 2);

  /* ---------- Maccabees: klezmer freylekh, D Freygish, clarinet + tsimbl ---------- */
  const MC_CH = [[50, 54, 57], [50, 54, 57], [55, 58, 62], [50, 54, 57], [51, 55, 58], [55, 58, 62], [50, 54, 57], [50, 54, 57]];
  const MC_MEL = [[0, 0, 69, 2], [0, 2, 70, 2], [0, 4, 69, 2], [0, 6, 67, 2], [0, 8, 66, 4], [0, 12, 69, 4],
    [1, 0, 70, 2], [1, 2, 69, 2], [1, 4, 67, 2], [1, 6, 66, 2], [1, 8, 63, 4], [1, 12, 62, 4],
    [2, 0, 67, 2], [2, 2, 70, 2], [2, 4, 74, 2], [2, 6, 70, 2], [2, 8, 72, 2], [2, 10, 70, 2], [2, 12, 67, 4],
    [3, 0, 66, 2], [3, 2, 67, 2], [3, 4, 69, 4], [3, 8, 66, 4], [3, 12, 62, 4],
    [4, 0, 75, 4], [4, 4, 72, 2], [4, 6, 70, 2], [4, 8, 67, 4], [4, 12, 70, 4],
    [5, 0, 69, 2], [5, 2, 70, 2], [5, 4, 69, 2], [5, 6, 67, 2], [5, 8, 70, 4], [5, 12, 63, 4],
    [6, 0, 62, 2], [6, 2, 63, 2], [6, 4, 66, 2], [6, 6, 67, 2], [6, 8, 69, 2], [6, 10, 70, 2], [6, 12, 73, 4],
    [7, 0, 74, 6], [7, 6, 69, 2], [7, 8, 66, 4], [7, 12, 62, 4]];
  const maccabees = (calm) => ({
    bpm: 126, bars: 8, vol: calm ? 0.3 : 0.52,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, sec = loop % 4;
      let ch = MC_CH[bar]; if (bar === 6 && s >= 8) ch = [57, 61, 64];
      if (s === 0 || s === 8) I.bass(d, t, midi(ch[0] - 12), spb * 3, calm ? 0.11 : 0.16);
      if (!calm && (s === 4 || s === 12)) I.bass(d, t, midi(ch[2] - 12), spb * 2, 0.1);
      if (s % 2 === 0 && (!calm || s % 8 === 0)) for (const n of (s % 4 === 0 ? ch : [ch[1], ch[2]])) X.tsimbl(d, t, midi(n + 12), calm ? 0.035 : 0.05);
      if (!calm && bar % 4 === 3 && s >= 12) X.tsimbl(d, t, midi(ch[(s - 12) % 3] + 24), 0.04);
      if (s === 0 || s === 8) X.dof(d, t, calm ? 0.2 : 0.3);
      if (!calm && (s === 6 || s === 14)) X.dof(d, t, 0.14);
      if (s === 4 || s === 12) X.rim(d, t, calm ? 0.05 : 0.09);
      if (!calm && [2, 6, 10, 14].includes(s)) X.rim(d, t, 0.04);
      if (!calm && (s === 4 || s === 12)) X.clap(d, t, 0.05);
      if (!calm || s % 4 === 0) I.shaker(d, t, s % 4 === 2 ? 0.035 : 0.018);
      if (ON(calm, loop)) mel(MC_MEL, bar, s, (n, len) => {
        const orn = !calm && len >= 4 && (s === 0 || s === 8);
        if (orn) X.krekht(d, t, midi(n + 2), 0.045);
        X.clar(d, orn ? t + 0.04 : t, midi(n), len * spb, calm ? 0.055 : 0.085);
        if (sec === 2 && !calm) X.tsimbl(d, t, midi(n - 12), 0.035);
      });
    }
  });

  /* ---------- North Pole: original carol, sleigh bells + tubular bells ---------- */
  const NP_CH = [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55], [53, 57, 60], [46, 50, 53], [50, 55, 58], [48, 52, 55]];
  const NP_MEL = [[0, 0, 72, 4], [0, 4, 74, 2], [0, 6, 72, 2], [0, 8, 69, 4], [0, 12, 65, 4],
    [1, 0, 69, 4], [1, 4, 72, 4], [1, 8, 74, 6], [1, 14, 76, 2],
    [2, 0, 77, 4], [2, 4, 74, 2], [2, 6, 72, 2], [2, 8, 70, 4], [2, 12, 69, 4],
    [3, 0, 72, 6], [3, 6, 70, 2], [3, 8, 67, 4], [3, 12, 65, 4],
    [4, 0, 77, 4], [4, 4, 79, 2], [4, 6, 77, 2], [4, 8, 74, 4], [4, 12, 72, 4],
    [5, 0, 74, 4], [5, 4, 70, 4], [5, 8, 72, 8],
    [6, 0, 70, 2], [6, 2, 72, 2], [6, 4, 74, 4], [6, 8, 77, 4], [6, 12, 74, 4],
    [7, 0, 72, 6], [7, 6, 74, 2], [7, 8, 72, 4], [7, 12, 67, 4]];
  const northpole = (calm) => ({
    bpm: 104, bars: 8, vol: calm ? 0.3 : 0.5,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, ch = NP_CH[bar], sec = loop % 4;
      if (s === 0) I.pad(d, t, ch.map(n => midi(n + 12)), spb * 16, calm ? 0.015 : 0.021);
      if (s === 0 || s === 8) I.bass(d, t, midi(ch[0] - 12), spb * 3, calm ? 0.12 : 0.17);
      if (!calm && (s === 4 || s === 12)) I.bass(d, t, midi(ch[2] - 12), spb * 2, 0.11);
      if ((s === 4 || s === 12) && (!calm || s === 12)) for (const n of ch) I.pluck(d, t, midi(n + 12), calm ? 0.035 : 0.05, 0.35);
      if (s % 2 === 0 && (!calm || s % 4 === 0)) X.sleigh(d, t, (s % 4 === 0 ? 0.05 : 0.03) * (calm ? 0.6 : 1));
      if (!calm && (s === 0 || s === 8)) I.kick(d, t, 0.2);
      if (!calm && (s === 4 || s === 12)) burst(d, t, 0.1, 0.05, { type: 'bandpass', f: 2100, q: 0.8 });
      if (s === 0 && bar % 4 === 0) X.tube(d, t, midi(ch[0] + 12), calm ? 0.05 : 0.07);
      if (!calm && bar % 2 === 1 && s === 14) X.glock(d, t, midi(ch[2] + 24), 0.03);
      if (ON(calm, loop)) mel(NP_MEL, bar, s, (n, len) => { X.tube(d, t, midi(n), calm ? 0.055 : 0.075); if (sec === 2 && !calm) X.glock(d, t, midi(n + 12), 0.028); });
    }
  });

  /* ---------- Liberty: original fife-and-drum march in D ---------- */
  const LB_CH = [[50, 54, 57], [50, 54, 57], [43, 47, 50], [45, 49, 52], [50, 54, 57], [43, 47, 50], [45, 49, 52], [45, 49, 52]];
  const LB_MEL = [[0, 0, 81, 2], [0, 2, 81, 2], [0, 4, 86, 4], [0, 8, 85, 2], [0, 10, 83, 2], [0, 12, 81, 4],
    [1, 0, 83, 2], [1, 2, 85, 2], [1, 4, 86, 4], [1, 8, 83, 4], [1, 12, 78, 4],
    [2, 0, 79, 2], [2, 2, 81, 2], [2, 4, 83, 4], [2, 8, 85, 2], [2, 10, 86, 2], [2, 12, 88, 4],
    [3, 0, 86, 6], [3, 6, 85, 2], [3, 8, 83, 4], [3, 12, 81, 4],
    [4, 0, 90, 4], [4, 4, 88, 2], [4, 6, 86, 2], [4, 8, 85, 4], [4, 12, 83, 4],
    [5, 0, 81, 2], [5, 2, 83, 2], [5, 4, 85, 4], [5, 8, 86, 4], [5, 12, 90, 4],
    [6, 0, 88, 2], [6, 2, 86, 2], [6, 4, 85, 2], [6, 6, 83, 2], [6, 8, 81, 4], [6, 12, 85, 4],
    [7, 0, 85, 4], [7, 4, 83, 4], [7, 8, 81, 8]];
  const liberty = (calm) => ({
    bpm: 118, bars: 8, vol: calm ? 0.3 : 0.5,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, ch = LB_CH[bar], sec = loop % 4;
      if (s === 0 || s === 8) I.kick(d, t, calm ? 0.2 : 0.34);
      if (s === 4 || s === 12) X.rattle(d, t, calm ? 0.06 : 0.11);
      if (!calm && [2, 6, 10, 14].includes(s)) X.rattle(d, t, 0.035);
      if (!calm && bar % 4 === 3 && s === 12) X.roll(d, t, 0.085, 8, spb * 4);
      if (!calm && bar === 0 && s === 0) X.roll(d, t, 0.06, 6, spb * 2);
      if ([0, 4, 8, 12].includes(s)) I.bass(d, t, midi((s % 8 === 0 ? ch[0] : ch[2]) - 12), spb * 3, calm ? 0.11 : 0.16);
      if (!calm && (bar === 0 || bar === 4) && (s === 0 || s === 8)) for (const n of ch) I.brass(d, t, midi(n), spb * 2.5, 0.05);
      if (!calm && bar % 2 === 1 && s === 8) for (const n of [ch[0], ch[1]]) I.brass(d, t, midi(n), spb * 1.5, 0.04);
      if (calm && s === 0 && bar % 2 === 0) I.brass(d, t, midi(ch[0]), spb * 6, 0.035);
      if (ON(calm, loop)) mel(LB_MEL, bar, s, (n, len) => { X.fife(d, t, midi(n), len * spb, calm ? 0.05 : 0.07); if (sec === 2 && !calm) X.fife(d, t, midi(n - 12), len * spb, 0.032); });
    }
  });

  /* ---------- Meowtopia: bouncy chiptune, squares + meows + bells ---------- */
  const MW_CH = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62], [60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const MW_ARP = [0, 1, 2, 1, 0, 2, 1, 2];
  const MW_MEL = [[0, 0, 84, 2], [0, 2, 79, 1], [0, 3, 81, 1], [0, 4, 84, 2], [0, 6, 83, 2], [0, 8, 79, 2], [0, 10, 76, 2], [0, 12, 79, 4],
    [1, 0, 81, 2], [1, 2, 76, 2], [1, 4, 81, 2], [1, 6, 79, 2], [1, 8, 76, 4], [1, 12, 72, 4],
    [2, 0, 77, 2], [2, 2, 81, 2], [2, 4, 84, 4], [2, 8, 81, 2], [2, 10, 77, 2], [2, 12, 79, 4],
    [3, 0, 79, 2], [3, 2, 83, 2], [3, 4, 86, 4], [3, 8, 83, 2], [3, 10, 79, 2], [3, 12, 74, 4],
    [4, 0, 84, 2], [4, 2, 88, 2], [4, 4, 86, 4], [4, 8, 84, 2], [4, 10, 81, 2], [4, 12, 84, 4],
    [5, 0, 81, 2], [5, 2, 84, 2], [5, 4, 88, 2], [5, 6, 86, 2], [5, 8, 84, 4], [5, 12, 81, 4],
    [6, 0, 77, 2], [6, 2, 81, 2], [6, 4, 84, 2], [6, 6, 86, 2], [6, 8, 88, 4], [6, 12, 86, 4],
    [7, 0, 83, 4], [7, 4, 79, 2], [7, 6, 81, 2], [7, 8, 83, 4], [7, 12, 86, 2], [7, 14, 88, 2]];
  const meowtopia = (calm) => ({
    bpm: 144, bars: 8, vol: calm ? 0.28 : 0.46,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, ch = MW_CH[bar], sec = loop % 4;
      if ([0, 3, 6, 8, 11, 14].includes(s) && (!calm || s % 8 === 0)) X.nes(d, t, midi(ch[0] - 24 + (s === 6 || s === 14 ? 7 : 0)), spb * 2, calm ? 0.11 : 0.15);
      if (s % 2 === 0 && (!calm || s % 4 === 0)) X.sq(d, t, midi(ch[MW_ARP[(s >> 1) % 8]]), spb * 1.2, calm ? 0.028 : 0.04);
      if (s === 0 || s === 8) I.kick(d, t, calm ? 0.18 : 0.28);
      if (s === 4 || s === 12) burst(d, t, 0.07, calm ? 0.05 : 0.09, { type: 'bandpass', f: 1900, q: 0.9 });
      if (!calm && s % 2 === 1) X.chip(d, t, s % 4 === 3 ? 0.035 : 0.02);
      if (!calm && (s === 7 || s === 15)) I.bell(d, t, midi(ch[2] + 24), 0.025, 0.8);
      if (calm && s === 8 && bar % 4 === 2) I.bell(d, t, midi(ch[2] + 24), 0.02, 0.9);
      if (!calm && s === 14 && (bar === 3 || bar === 7)) X.meow(d, t, 0.05);
      if (calm && s === 0 && bar === 7) X.meow(d, t, 0.035);
      if (ON(calm, loop)) mel(MW_MEL, bar, s, (n, len) => { X.sq(d, t, midi(n), len * spb, calm ? 0.045 : 0.065); if (sec === 2 && !calm) I.bell(d, t, midi(n + 12), 0.018, 0.7); });
    }
  });

  /* ---------- Rexlands: primal stomp, E pentatonic chant, brass roars ---------- */
  const RX_RT = [40, 40, 43, 40, 45, 43, 38, 40];
  const RX_MEL = [[0, 0, 64, 4], [0, 4, 67, 4], [0, 8, 69, 8],
    [1, 0, 67, 4], [1, 4, 64, 4], [1, 8, 62, 8],
    [2, 0, 64, 4], [2, 4, 69, 4], [2, 8, 71, 4], [2, 12, 69, 4],
    [3, 0, 67, 8], [3, 8, 64, 8],
    [4, 0, 71, 4], [4, 4, 74, 4], [4, 8, 71, 8],
    [5, 0, 69, 4], [5, 4, 67, 4], [5, 8, 64, 8],
    [6, 0, 62, 4], [6, 4, 64, 4], [6, 8, 67, 4], [6, 12, 69, 4],
    [7, 0, 64, 16]];
  const rexlands = (calm) => ({
    bpm: 88, bars: 8, vol: calm ? 0.32 : 0.54,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, r = RX_RT[bar], sec = loop % 4;
      if (s === 0 && bar % 2 === 0) I.pad(d, t, [midi(r), midi(r + 7)], spb * 32, calm ? 0.015 : 0.021);
      if (s === 0) X.bigtom(d, t, 66, calm ? 0.3 : 0.5);
      if (s === 8) X.bigtom(d, t, 74, calm ? 0.22 : 0.38);
      if (!calm && (s === 6 || s === 14)) X.bigtom(d, t, 98, 0.24);
      if (!calm && bar % 2 === 1 && (s === 11 || s === 12)) X.bigtom(d, t, 124, 0.15);
      if ((s === 4 || s === 12) && (!calm || s === 12)) X.bone(d, t, calm ? 0.05 : 0.09);
      if (!calm && [2, 10, 15].includes(s)) X.bone(d, t, 0.04);
      if (s === 0 && (bar === 0 || bar === 4)) X.roar(d, t, midi(r + 12), spb * (calm ? 4 : 7), calm ? 0.05 : 0.08);
      if (!calm && bar === 6 && s === 8) X.roar(d, t, midi(r + 15), spb * 6, 0.07);
      if (s === 0) I.bass(d, t, midi(r - 12), spb * 6, calm ? 0.12 : 0.18);
      if (!calm && (s === 8 || s === 11)) I.bass(d, t, midi(r - 12 + (s === 11 ? 7 : 0)), spb * 2, 0.13);
      if (!calm && s % 4 === 2) I.shaker(d, t, 0.028);
      if (ON(calm, loop)) mel(RX_MEL, bar, s, (n, len) => { X.chant(d, t, midi(n), len * spb, calm ? 0.055 : 0.085); if (sec === 2 && !calm) X.chant(d, t, midi(n - 12), len * spb, 0.05); });
    }
  });

  /* ---------- Cogworks: robot funk, saw arp + talk-box lead + clanks ---------- */
  const CG_CH = [[48, 51, 55, 58], [48, 51, 55, 58], [44, 48, 51, 55], [46, 50, 53, 58], [48, 51, 55, 58], [53, 56, 60, 63], [46, 50, 53, 58], [46, 50, 53, 58]];
  const CG_ARP = [0, 2, 1, 3, 2, 0, 3, 1, 2, 1, 3, 0, 1, 3, 2, 3];
  const CG_MEL = [[0, 0, 72, 2], [0, 3, 75, 1], [0, 4, 77, 2], [0, 8, 75, 2], [0, 11, 72, 1], [0, 12, 70, 4],
    [1, 0, 72, 4], [1, 6, 79, 2], [1, 8, 77, 4], [1, 12, 75, 4],
    [2, 0, 68, 2], [2, 2, 72, 2], [2, 4, 75, 4], [2, 8, 72, 2], [2, 10, 68, 2], [2, 12, 67, 4],
    [3, 0, 70, 2], [3, 3, 72, 1], [3, 4, 74, 2], [3, 8, 77, 4], [3, 12, 79, 4],
    [4, 0, 84, 4], [4, 4, 82, 2], [4, 6, 79, 2], [4, 8, 77, 4], [4, 12, 75, 4],
    [5, 0, 77, 2], [5, 2, 80, 2], [5, 4, 84, 4], [5, 8, 82, 2], [5, 10, 79, 2], [5, 12, 77, 4],
    [6, 0, 74, 2], [6, 3, 77, 1], [6, 4, 79, 2], [6, 8, 82, 4], [6, 12, 79, 4],
    [7, 0, 77, 2], [7, 2, 74, 2], [7, 4, 72, 4], [7, 8, 70, 4], [7, 12, 72, 4]];
  const cogworks = (calm) => ({
    bpm: 122, bars: 8, vol: calm ? 0.28 : 0.48,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, ch = CG_CH[bar], sec = loop % 4;
      if (!calm || s % 2 === 0) X.saw(d, t, midi(ch[CG_ARP[s]] + 12 + (s % 8 >= 4 ? 12 : 0)), calm ? 0.03 : 0.045, spb * 0.5);
      if ([0, 6, 10].includes(s)) X.sub(d, t, midi(ch[0] - 12), spb * 2, calm ? 0.12 : 0.17);
      if (!calm && (s === 3 || s === 13)) X.sub(d, t, midi(ch[1] - 12), spb, 0.11);
      if (s === 0 || s === 8) I.kick(d, t, calm ? 0.2 : 0.32);
      if (s === 4 || s === 12) X.zap(d, t, calm ? 0.05 : 0.09);
      if (!calm && s % 2 === 1) X.clank(d, t, s % 4 === 3 ? 0.035 : 0.018);
      if (calm && s % 8 === 6) X.clank(d, t, 0.022);
      if (!calm && s === 14 && bar % 2 === 1) I.metal(d, t, 0.025);
      if (s === 0 && bar % 4 === 0) I.pad(d, t, ch.slice(1).map(n => midi(n + 12)), spb * 64, calm ? 0.012 : 0.016);
      if (ON(calm, loop)) mel(CG_MEL, bar, s, (n, len) => { X.vox(d, t, midi(n), len * spb, calm ? 0.055 : 0.08); if (sec === 2 && !calm) X.saw(d, t, midi(n - 12), 0.03, len * spb * 0.5); });
    }
  });

  /* ---------- Pumpkin Hollow: spooky waltz in 3/4 (12 sixteenth steps) ---------- */
  const PK_CH = [[50, 53, 57], [50, 53, 57], [43, 46, 50], [45, 49, 52], [50, 53, 57], [46, 50, 53], [45, 49, 52], [50, 53, 57]];
  const PK_MEL = [[0, 0, 69, 2], [0, 2, 74, 2], [0, 4, 77, 4], [0, 8, 74, 4],
    [1, 0, 76, 2], [1, 2, 74, 2], [1, 4, 72, 4], [1, 8, 69, 4],
    [2, 0, 70, 2], [2, 2, 67, 2], [2, 4, 70, 4], [2, 8, 74, 4],
    [3, 0, 73, 4], [3, 4, 76, 2], [3, 6, 73, 2], [3, 8, 69, 4],
    [4, 0, 74, 2], [4, 2, 77, 2], [4, 4, 81, 4], [4, 8, 77, 4],
    [5, 0, 79, 2], [5, 2, 77, 2], [5, 4, 74, 4], [5, 8, 70, 4],
    [6, 0, 71, 2], [6, 2, 73, 2], [6, 4, 76, 4], [6, 8, 73, 4],
    [7, 0, 74, 4], [7, 4, 69, 4], [7, 8, 74, 2], [7, 10, 73, 2]];
  const pumpkin = (calm) => ({
    spb: 60 / 138 / 4, stepsPerBar: 12, bars: 8, vol: calm ? 0.3 : 0.5,
    play(d, step, t, loop, spb) {
      const bar = Math.floor(step / 12), s = step % 12, ch = PK_CH[bar], sec = loop % 4;
      if (s === 0) X.pizz(d, t, midi(ch[0] - 12), calm ? 0.13 : 0.19);
      if (s === 4 || s === 8) for (const n of (calm ? [ch[1]] : ch)) X.pizz(d, t, midi(n), calm ? 0.05 : 0.07);
      if (!calm && (s === 6 || s === 10)) X.pizz(d, t, midi(ch[2] - 12), 0.05);
      if (s === 0 && bar % 2 === 0) X.creak(d, t, calm ? 0.05 : 0.07, spb * 22);
      if (s === 0 && (bar === 0 || bar === 4)) X.toll(d, t, midi(ch[0] - 12), calm ? 0.05 : 0.075);
      if (s === 0) I.tom(d, t, 84, calm ? 0.12 : 0.18);
      if (!calm && s === 8) X.bone(d, t, 0.03);
      if (!calm && s === 4) I.shaker(d, t, 0.025);
      if (!calm && bar % 4 === 3 && s === 10) X.toll(d, t, midi(ch[2] + 12), 0.03);
      if ((bar === 3 || bar === 7) && s === 10 && loop % 2 === 0) X.owl(d, t, calm ? 0.022 : 0.038);
      if (ON(calm, loop)) mel(PK_MEL, bar, s, (n, len) => { X.box(d, t, midi(n + 12), calm ? 0.06 : 0.085); if (sec === 2 && !calm) X.box(d, t, midi(n + 24), 0.028); });
    }
  });

  const MAKERS = { maccabees, northpole, liberty, meowtopia, rexlands, cogworks, pumpkin };
  for (const k in MAKERS) { SND.register('tribe_' + k, MAKERS[k](false)); SND.register('tribe_' + k + '_calm', MAKERS[k](true)); }
})();

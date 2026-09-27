/* =====================================================================
   Part 9: tribe music — one theme per tribe, each in its culture's
   style, plus a calmer "_calm" variant that plays during a match.
   ===================================================================== */
const TRIBE_THEMES = {
  ironvale: 'Anvils of the Highlands',
  sunspear: 'Songs of the Dunes',
  verdant: 'Heart of the Canopy',
  tidecallers: 'Call of the Tide',
  umbral: 'Rites of the Long Night',
  frostholm: 'Hymn of the Frozen North'
};
(() => {
  const { I, tone, burst, midi } = SND;
  const X = {
    oud: (d, t, f, v, dur) => { tone(d, 'sawtooth', f * 1.03, t, dur || 0.5, v, { to: f, glide: 0.04, a: 0.002, lp: 2600, lpTo: 520, q: 1.2, verb: 0.25 }); tone(d, 'triangle', f * 2, t, (dur || 0.5) * 0.4, v * 0.3, { a: 0.002 }); },
    doum: (d, t, v) => { tone(d, 'sine', 115, t, 0.38, v, { to: 66, glide: 0.3, a: 0.002, verb: 0.15 }); burst(d, t, 0.05, v * 0.3, { type: 'lowpass', f: 500 }); },
    tek: (d, t, v) => { burst(d, t, 0.04, v, { type: 'bandpass', f: 3600, q: 2.5 }); tone(d, 'sine', 1900, t, 0.025, v * 0.25, { a: 0.001 }); },
    zill: (d, t, v) => { for (const m of [1, 1.47, 2.3]) tone(d, 'sine', 2637 * m, t, 0.9 / m, v / m, { a: 0.001, verb: 0.4 }); },
    marimba: (d, t, f, v) => { tone(d, 'sine', f, t, 0.42, v, { a: 0.002, verb: 0.22 }); tone(d, 'sine', f * 3.99, t, 0.07, v * 0.35, { a: 0.001 }); },
    conga: (d, t, f, v) => { tone(d, 'sine', f, t, 0.24, v, { to: f * 0.78, glide: 0.18, a: 0.002, verb: 0.12 }); burst(d, t, 0.035, v * 0.3, { type: 'bandpass', f: f * 3.2, q: 1.5 }); },
    clave: (d, t, v) => tone(d, 'sine', 2480, t, 0.045, v, { a: 0.001, verb: 0.2 }),
    bird: (d, t, v) => { tone(d, 'sine', 2900, t, 0.06, v, { to: 3900, glide: 0.05, a: 0.004 }); tone(d, 'sine', 3100, t + 0.09, 0.06, v * 0.8, { to: 4200, glide: 0.05, a: 0.004 }); },
    accord: (d, t, freqs, dur, v) => { for (const f of freqs) { tone(d, 'sawtooth', f, t, 0.12, v, { a: 0.015, hold: dur, lp: 1900, vib: [5.5, f * 0.005] }); tone(d, 'square', f * 1.004, t, 0.12, v * 0.45, { a: 0.015, hold: dur, lp: 1400 }); } },
    wave: (d, t, v, dur) => burst(d, t, dur * 0.6, v, { type: 'lowpass', f: 700, a: dur * 0.4, verb: 0.3 }),
    gull: (d, t, v) => tone(d, 'sine', 1900, t, 0.32, v, { to: 1250, glide: 0.28, vib: [13, 35], a: 0.02, verb: 0.4 }),
    choir: (d, t, freqs, dur, v) => { for (const f of freqs) for (const det of [-10, 0, 10]) tone(d, 'sawtooth', f, t, 1.2, v, { a: 0.8, hold: Math.max(0, dur - 0.8), bp: 780, bq: 3.5, detune: det, verb: 0.6 }); },
    drone: (d, t, freqs, dur, v) => { for (const f of freqs) { tone(d, 'sawtooth', f, t, 0.6, v, { a: 0.3, hold: dur, bp: 1100, bq: 1.6, verb: 0.35 }); tone(d, 'square', f * 1.002, t, 0.6, v * 0.5, { a: 0.3, hold: dur, bp: 900, bq: 2 }); } },
    snare: (d, t, v) => { burst(d, t, 0.12, v, { type: 'bandpass', f: 2300, q: 0.8 }); tone(d, 'triangle', 190, t, 0.07, v * 0.5, { a: 0.001 }); },
    wind: (d, t, v, dur) => burst(d, t, dur * 0.5, v, { type: 'bandpass', f: 700, to: 1600, q: 0.7, a: dur * 0.5, verb: 0.4 })
  };
  const mel = (list, bar, s, fn) => { for (const n of list) if (n[0] === bar && n[1] === s) fn(n[2], n[3]); };
  const ON = (calm, loop) => calm ? loop % 4 === 2 : (loop % 4 === 1 || loop % 4 === 2);

  /* ---------- Sunspear: desert, Hijaz scale, darbuka + oud + ney ---------- */
  const SUN_MEL = [[0, 0, 69, 4], [0, 4, 70, 2], [0, 6, 69, 2], [0, 8, 67, 4], [0, 12, 66, 4], [1, 0, 67, 6], [1, 6, 66, 2], [1, 8, 63, 4], [1, 12, 62, 4],
    [2, 0, 62, 2], [2, 2, 63, 2], [2, 4, 66, 4], [2, 8, 67, 2], [2, 10, 69, 2], [2, 12, 70, 4], [3, 0, 69, 12], [3, 12, 67, 4],
    [4, 0, 74, 4], [4, 4, 72, 2], [4, 6, 70, 2], [4, 8, 69, 4], [4, 12, 67, 4], [5, 0, 70, 4], [5, 4, 69, 4], [5, 8, 67, 2], [5, 10, 66, 2], [5, 12, 67, 4],
    [6, 0, 66, 4], [6, 4, 63, 4], [6, 8, 66, 2], [6, 10, 67, 2], [6, 12, 69, 4], [7, 0, 62, 12], [7, 12, 63, 2], [7, 14, 66, 2]];
  const OUD = [50, 50, 51, 54, 55, 54, 51, 50];
  const sunspear = (calm) => ({
    bpm: 104, bars: 8, vol: calm ? 0.32 : 0.55,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, sec = loop % 4;
      if (s === 0 && bar % 2 === 0) I.pad(d, t, [midi(38), midi(45), midi(50)], spb * 32, calm ? 0.018 : 0.024);
      if (s === 0 || s === 8) X.doum(d, t, calm ? 0.2 : 0.3);
      if (s === 2 || s === 6 || s === 12) X.tek(d, t, calm ? 0.06 : 0.1);
      if (!calm && (s === 5 || s === 10 || s === 14 || s === 15)) X.tek(d, t, 0.04);
      if (!calm && s === 4 && bar % 2 === 1) X.zill(d, t, 0.03);
      if (s % 2 === 0 && (!calm || s % 8 === 0) && sec !== 3) X.oud(d, t, midi(OUD[s >> 1] + (bar % 4 === 3 && s >= 8 ? 5 : 0)), calm ? 0.045 : 0.07, 0.45);
      if (ON(calm, loop)) mel(SUN_MEL, bar, s, (n, len) => { I.flute(d, t, midi(n), len * spb, calm ? 0.05 : 0.085); if (sec === 2 && !calm) X.oud(d, t, midi(n - 12), 0.04, 0.4); });
    }
  });

  /* ---------- Verdant: jungle, G pentatonic, marimba + congas + birds ---------- */
  const V_CH = [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57], [55, 59, 62], [52, 55, 59], [45, 48, 52], [50, 54, 57]];
  const V_MEL = [[0, 0, 74, 3], [0, 3, 71, 1], [0, 4, 69, 4], [0, 8, 67, 2], [0, 10, 69, 2], [0, 12, 71, 4], [1, 0, 71, 2], [1, 2, 69, 2], [1, 4, 67, 4], [1, 8, 64, 4], [1, 12, 67, 4],
    [2, 0, 76, 4], [2, 4, 74, 2], [2, 6, 71, 2], [2, 8, 69, 4], [2, 12, 67, 4], [3, 0, 69, 8], [3, 8, 74, 4], [3, 12, 71, 4],
    [4, 0, 74, 3], [4, 3, 76, 1], [4, 4, 74, 4], [4, 8, 71, 2], [4, 10, 69, 2], [4, 12, 67, 4], [5, 0, 64, 4], [5, 4, 67, 4], [5, 8, 69, 4], [5, 12, 71, 4],
    [6, 0, 72, 4], [6, 4, 71, 2], [6, 6, 69, 2], [6, 8, 64, 4], [6, 12, 69, 4], [7, 0, 67, 12]];
  const V_PAT = [0, 2, 1, 2, 0, 2, 1, 2];
  const verdant = (calm) => ({
    bpm: 108, bars: 8, vol: calm ? 0.3 : 0.52,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, ch = V_CH[bar];
      if (s % 2 === 0 && (!calm || s % 4 === 0)) X.marimba(d, t, midi(ch[V_PAT[s >> 1]] + 12), calm ? 0.06 : 0.085);
      if (!calm && (s === 7 || s === 15)) X.marimba(d, t, midi(ch[2] + 24), 0.045);
      if (s === 0 || s === 10) X.marimba(d, t, midi(ch[0] - 12), calm ? 0.12 : 0.18);
      if ([0, 3, 8].includes(s) && (!calm || s !== 3)) X.conga(d, t, 150, calm ? 0.12 : 0.2);
      if (!calm && [6, 10, 11, 14].includes(s)) X.conga(d, t, 240, 0.12);
      if (!calm && (s === 4 || s === 12)) burst(d, t, 0.03, 0.08, { type: 'bandpass', f: 1600, q: 2 });
      if (!calm || s % 2 === 0) I.shaker(d, t, s % 4 === 2 ? 0.04 : 0.02);
      if (!calm && ((bar % 2 === 0 && [0, 6, 12].includes(s)) || (bar % 2 === 1 && [4, 8].includes(s)))) X.clave(d, t, 0.05);
      if (s === 5 && (bar === 2 || bar === 6)) X.bird(d, t, 0.035);
      if (s === 13 && bar === 4 && loop % 2) X.bird(d, t, 0.03);
      if (ON(calm, loop)) mel(V_MEL, bar, s, (n, len) => { I.flute(d, t, midi(n), len * spb, calm ? 0.05 : 0.075); if (loop % 4 === 2 && !calm) X.marimba(d, t, midi(n + 12), 0.03); });
    }
  });

  /* ---------- Tidecallers: sea shanty in 6/8, accordion + bodhran + waves ---------- */
  const T_CH = [[50, 54, 57], [50, 54, 57], [55, 59, 62], [57, 61, 64], [50, 54, 57], [47, 50, 54], [55, 59, 62], [50, 54, 57]];
  const T_MEL = [[0, 0, 69, 4], [0, 4, 66, 2], [0, 6, 69, 4], [0, 10, 74, 2], [1, 0, 71, 4], [1, 4, 69, 2], [1, 6, 66, 4], [1, 10, 62, 2],
    [2, 0, 67, 4], [2, 4, 71, 2], [2, 6, 74, 4], [2, 10, 71, 2], [3, 0, 69, 6], [3, 6, 67, 2], [3, 8, 66, 2], [3, 10, 64, 2],
    [4, 0, 66, 4], [4, 4, 69, 2], [4, 6, 74, 4], [4, 10, 76, 2], [5, 0, 78, 4], [5, 4, 76, 2], [5, 6, 74, 4], [5, 10, 71, 2],
    [6, 0, 67, 2], [6, 2, 71, 2], [6, 4, 74, 2], [6, 6, 76, 2], [6, 8, 74, 2], [6, 10, 73, 2], [7, 0, 74, 10]];
  const tidecallers = (calm) => ({
    spb: 60 / 66 / 6, stepsPerBar: 12, bars: 8, vol: calm ? 0.3 : 0.5,
    play(d, step, t, loop, spb) {
      const bar = Math.floor(step / 12), s = step % 12;
      let ch = T_CH[bar]; if (bar === 6 && s >= 6) ch = [57, 61, 64];
      if (s === 0) I.bass(d, t, midi(ch[0] - 12), spb * 5, calm ? 0.1 : 0.16);
      if (s === 6) I.bass(d, t, midi(ch[0] - 5), spb * 5, calm ? 0.08 : 0.13);
      if ([2, 4, 8, 10].includes(s) && (!calm || s === 2 || s === 8)) X.accord(d, t, ch.map(n => midi(n + 12)), spb * 1.1, calm ? 0.01 : 0.017);
      if (s === 0) I.tom(d, t, 90, calm ? 0.2 : 0.3);
      if (s === 6) I.tom(d, t, 90, calm ? 0.14 : 0.22);
      if (!calm && (s === 3 || s === 9)) I.tom(d, t, 130, 0.1);
      if (!calm && s === 11) I.tom(d, t, 150, 0.07);
      if (bar % 2 === 0 && s === 0) X.wave(d, t, calm ? 0.06 : 0.07, spb * 24);
      if ((bar === 3 || bar === 7) && s === 4) X.gull(d, t, 0.03);
      if (calm && s === 6 && bar % 4 === 1) I.bell(d, t, midi(ch[2] + 24), 0.025, 1.5);
      if (ON(calm, loop)) mel(T_MEL, bar, s, (n, len) => { I.flute(d, t, midi(n), len * spb, calm ? 0.05 : 0.08); if (loop % 4 === 2 && !calm) I.pluck(d, t, midi(n - 12), 0.04, 0.5); });
    }
  });

  /* ---------- Frostholm: Nordic drone, war drums, horns, choir, ice bells ---------- */
  const F_CH = [[50, 57, 62], [46, 53, 58], [48, 55, 60], [50, 57, 62], [50, 57, 62], [43, 50, 55], [48, 55, 60], [50, 57, 62]];
  const F_MEL = [[0, 0, 74, 4], [0, 4, 76, 2], [0, 6, 77, 2], [0, 8, 76, 4], [0, 12, 74, 4], [1, 0, 72, 4], [1, 4, 74, 4], [1, 8, 69, 8],
    [2, 0, 72, 4], [2, 4, 76, 2], [2, 6, 79, 2], [2, 8, 77, 4], [2, 12, 76, 4], [3, 0, 74, 12], [3, 12, 69, 4],
    [4, 0, 77, 4], [4, 4, 79, 2], [4, 6, 81, 2], [4, 8, 79, 4], [4, 12, 77, 4], [5, 0, 74, 4], [5, 4, 77, 4], [5, 8, 70, 8],
    [6, 0, 72, 4], [6, 4, 76, 4], [6, 8, 79, 4], [6, 12, 76, 4], [7, 0, 74, 16]];
  const frostholm = (calm) => ({
    bpm: 76, bars: 8, vol: calm ? 0.34 : 0.55,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, ch = F_CH[bar];
      if (s === 0 && bar % 2 === 0) X.drone(d, t, [midi(38), midi(45)], spb * 32, calm ? 0.009 : 0.014);
      if (s === 0) X.choir(d, t, [ch[0] + 12, ch[1] + 12, ch[0] + 24].map(midi), spb * 16, calm ? 0.005 : 0.008);
      if (s === 0) I.tom(d, t, 70, calm ? 0.25 : 0.45);
      if (!calm && s === 8) I.tom(d, t, 70, 0.35);
      if (!calm && bar % 2 === 1 && (s === 6 || s === 14)) I.tom(d, t, 95, 0.2);
      if (!calm && (bar === 0 || bar === 4)) { if (s === 0) I.brass(d, t, midi(50), spb * 6, 0.07); if (s === 8) I.brass(d, t, midi(57), spb * 6, 0.06); }
      if (bar % 2 === 1 && [0, 6, 10].includes(s)) I.bell(d, t, midi([86, 81, 89][[0, 6, 10].indexOf(s)]), calm ? 0.02 : 0.03, 2.5);
      if (s === 0 && bar % 4 === 0) X.wind(d, t, 0.05, spb * 48);
      if (ON(calm, loop)) mel(F_MEL, bar, s, (n, len) => { if (loop % 4 === 2 && !calm) I.brass(d, t, midi(n - 12), len * spb * 0.9, 0.05); else I.flute(d, t, midi(n), len * spb, calm ? 0.05 : 0.08); });
    }
  });

  /* ---------- Umbral: dark choir, bell tolls, heartbeat, glass arps ---------- */
  const U_CH = [[50, 53, 57], [51, 55, 58], [50, 53, 57], [49, 52, 55], [43, 46, 50], [51, 55, 58], [45, 49, 52], [50, 53, 57]];
  const U_MEL = [[0, 0, 69, 8], [0, 8, 70, 4], [0, 12, 69, 4], [1, 0, 67, 8], [1, 8, 65, 4], [1, 12, 63, 4], [2, 0, 62, 12], [2, 12, 63, 2], [2, 14, 65, 2],
    [3, 0, 61, 8], [3, 8, 64, 4], [3, 12, 69, 4], [4, 0, 74, 8], [4, 8, 73, 4], [4, 12, 70, 4], [5, 0, 69, 8], [5, 8, 67, 4], [5, 12, 65, 4],
    [6, 0, 64, 8], [6, 8, 67, 4], [6, 12, 70, 4], [7, 0, 69, 12]];
  const umbral = (calm) => ({
    bpm: 62, bars: 8, vol: calm ? 0.36 : 0.58,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, ch = U_CH[bar];
      if (s === 0) X.choir(d, t, ch.map(n => midi(n + 12)), spb * 16, calm ? 0.006 : 0.009);
      if (s === 0 && bar % 2 === 0) I.bell(d, t, midi(38), calm ? 0.05 : 0.07, 4);
      if (s === 0 || s === 3) I.kick(d, t, (s === 0 ? 0.16 : 0.1) * (calm ? 0.7 : 1));
      if ((!calm && s % 2 === 0) || (calm && s % 4 === 0)) I.bell(d, t, midi(ch[(s >> 1) % 3] + 24), calm ? 0.012 : 0.018, 1.5);
      if (bar % 4 === 2 && s === 0) X.wind(d, t, 0.04, spb * 16);
      if (ON(calm, loop)) mel(U_MEL, bar, s, (n, len) => I.flute(d, t, midi(n), len * spb, calm ? 0.05 : 0.075));
    }
  });

  /* ---------- Ironvale: highland march, pipes drone, anvils, tin whistle ---------- */
  const IV_CH = [[50, 57, 62], [48, 55, 60], [50, 57, 62], [45, 52, 57], [41, 48, 53], [48, 55, 60], [50, 57, 62], [45, 52, 57]];
  const IV_MEL = [[0, 0, 74, 2], [0, 2, 76, 2], [0, 4, 77, 4], [0, 8, 76, 2], [0, 10, 74, 2], [0, 12, 69, 4], [1, 0, 72, 4], [1, 4, 76, 4], [1, 8, 79, 4], [1, 12, 76, 4],
    [2, 0, 77, 2], [2, 2, 79, 2], [2, 4, 81, 4], [2, 8, 79, 2], [2, 10, 77, 2], [2, 12, 74, 4], [3, 0, 76, 8], [3, 8, 72, 4], [3, 12, 69, 4],
    [4, 0, 81, 4], [4, 4, 79, 2], [4, 6, 77, 2], [4, 8, 76, 4], [4, 12, 72, 4], [5, 0, 79, 4], [5, 4, 77, 2], [5, 6, 76, 2], [5, 8, 74, 4], [5, 12, 72, 4],
    [6, 0, 74, 2], [6, 2, 77, 2], [6, 4, 81, 4], [6, 8, 83, 2], [6, 10, 81, 2], [6, 12, 77, 4], [7, 0, 76, 4], [7, 4, 74, 12]];
  const ironvale = (calm) => ({
    bpm: 100, bars: 8, vol: calm ? 0.3 : 0.52,
    play(d, step, t, loop, spb) {
      const bar = step >> 4, s = step & 15, ch = IV_CH[bar];
      if (s === 0 && bar % 2 === 0) X.drone(d, t, [midi(50), midi(57)], spb * 32, calm ? 0.009 : 0.014);
      if (s === 0 || s === 8) I.kick(d, t, calm ? 0.22 : 0.38);
      if (s === 4 || s === 12) X.snare(d, t, calm ? 0.06 : 0.11);
      if (!calm && bar % 2 === 1 && s >= 13) X.snare(d, t, 0.05);
      if ((s === 4 || s === 12) && (!calm || (s === 12 && bar % 2 === 0))) I.metal(d, t, calm ? 0.02 : 0.03);
      if (s === 0) { I.brass(d, t, midi(ch[0]), spb * 12, calm ? 0.035 : 0.055); I.brass(d, t, midi(ch[1]), spb * 12, calm ? 0.025 : 0.04); }
      if ([0, 6, 10].includes(s)) I.bass(d, t, midi(ch[0] - 12), spb * 3, calm ? 0.1 : 0.14);
      if (ON(calm, loop)) mel(IV_MEL, bar, s, (n, len) => { I.flute(d, t, midi(n), len * spb, calm ? 0.05 : 0.075); if (loop % 4 === 2 && !calm) I.pluck(d, t, midi(n - 12), 0.05, 0.6); });
    }
  });

  const MAKERS = { sunspear, verdant, tidecallers, frostholm, umbral, ironvale };
  for (const k in MAKERS) { SND.register('tribe_' + k, MAKERS[k](false)); SND.register('tribe_' + k + '_calm', MAKERS[k](true)); }
})();

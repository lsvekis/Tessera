/* =====================================================================
   Part 10: tribe art — round chief portraits and the animated homeland
   scenes behind the tribe picker (all drawn in code).
   ===================================================================== */
const CHIEFS = {
  ironvale: { skin: '#f0c29a', bg: ['#3d1720', '#e0894e'], cloth: '#c9393f', clothD: '#8f1f24' },
  sunspear: { skin: '#c68a5a', bg: ['#5a2a55', '#ffb36b'], cloth: '#f4ecd8', clothD: '#d8ccb0' },
  verdant: { skin: '#8d5a3b', bg: ['#0f4a2e', '#8fd87a'], cloth: '#2e9a4a', clothD: '#1d6a32' },
  tidecallers: { skin: '#b0764a', bg: ['#1d4f9e', '#9ad8ff'], cloth: '#2f6fd6', clothD: '#1c4a9a' },
  umbral: { skin: '#b89484', bg: ['#0c0724', '#5b2f9a'], cloth: '#6b3ab0', clothD: '#43207a' },
  frostholm: { skin: '#f3d2bd', bg: ['#27466e', '#c4e5f7'], cloth: '#e9f1f7', clothD: '#b9cad8' }
};
function tribePortrait(key) {
  const ck = 'chief:' + key;
  if (PORTRAITS.has(ck)) return PORTRAITS.get(ck);
  const c = document.createElement('canvas'); c.width = 320; c.height = 320;
  const g = c.getContext('2d'); g.scale(2, 2);
  const C = CHIEFS[key];
  if (!C || !CHIEF_GEAR[key]) {
    /* placeholder until a tribe has its own chief art */
    const T = TRIBES[key] || { color: '#888', dark: '#333', name: '?' };
    const bg = g.createRadialGradient(80, 60, 10, 80, 80, 80); bg.addColorStop(0, T.light || '#fff'); bg.addColorStop(1, T.color);
    g.beginPath(); g.arc(80, 80, 80, 0, Math.PI * 2); g.fillStyle = bg; g.fill();
    g.fillStyle = T.dark; g.font = 'bold 84px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(T.name[0], 80, 86);
    const url = c.toDataURL(); PORTRAITS.set(ck, url); return url;
  }
  g.save(); g.beginPath(); g.arc(80, 80, 80, 0, Math.PI * 2); g.clip();
  const bg = g.createLinearGradient(0, 0, 0, 160); bg.addColorStop(0, C.bg[0]); bg.addColorStop(1, C.bg[1]);
  g.fillStyle = bg; g.fillRect(0, 0, 160, 160);
  chiefBackdrop(g, key);
  if (CHIEF_GEAR[key].pre) CHIEF_GEAR[key].pre(g, C);
  chiefBody(g, key, C);
  CHIEF_GEAR[key].post(g, C);
  g.restore();
  const url = c.toDataURL(); PORTRAITS.set(ck, url); return url;
}
function chiefBackdrop(g, key) {
  if (key === 'ironvale') { poly(g, [[0, 118], [30, 70], [52, 96], [84, 58], [120, 100], [142, 76], [160, 96], [160, 160], [0, 160]], '#4a1c20'); tri(g, 84, 58, 76, 70, 92, 70, '#c9a08a'); for (let k = 0; k < 9; k++) circ(g, 12 + k * 17, 40 + (k * 37) % 50, 1.3, '#ffb35c'); }
  else if (key === 'sunspear') { circ(g, 120, 60, 20, '#ffe29a'); poly(g, [[6, 118], [34, 82], [62, 118]], '#e0a45e'); poly(g, [[34, 82], [62, 118], [42, 118]], '#b8793a'); poly(g, [[0, 120], [60, 108], [120, 122], [160, 110], [160, 160], [0, 160]], '#e8b46a'); }
  else if (key === 'verdant') { for (const [x, y, r] of [[14, 60, 26], [150, 54, 28], [30, 118, 24], [136, 116, 26]]) { circ(g, x, y, r, '#1f6b3a'); circ(g, x - 6, y - 6, r * 0.6, '#2a8a47'); } }
  else if (key === 'tidecallers') { circ(g, 124, 66, 14, '#fff1c4'); g.fillStyle = '#2a7fd0'; g.fillRect(0, 96, 160, 64); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(8 + k * 32, 106 + (k % 2) * 8); g.quadraticCurveTo(16 + k * 32, 100 + (k % 2) * 8, 24 + k * 32, 106 + (k % 2) * 8); g.stroke(); } }
  else if (key === 'umbral') { circ(g, 122, 40, 15, '#efe6ff'); circ(g, 128, 36, 13, '#1a0f3a'); for (let k = 0; k < 14; k++) circ(g, (k * 53) % 160, (k * 29) % 90, 0.9 + (k % 3) * 0.4, '#e8dcff'); poly(g, [[4, 160], [14, 90], [24, 160]], '#2a1850'); poly(g, [[136, 160], [148, 84], [158, 160]], '#2a1850'); }
  else if (key === 'frostholm') { g.fillStyle = 'rgba(120,255,200,.25)'; g.beginPath(); g.moveTo(0, 34); g.quadraticCurveTo(80, 10, 160, 40); g.lineTo(160, 52); g.quadraticCurveTo(80, 24, 0, 46); g.fill(); poly(g, [[0, 120], [26, 72], [50, 108], [80, 78], [112, 110], [136, 70], [160, 104], [160, 160], [0, 160]], '#9fbad0'); for (const [x, y] of [[26, 72], [80, 78], [136, 70]]) tri(g, x, y, x - 8, y + 12, x + 8, y + 12, '#ffffff'); }
}
function chiefBody(g, key, C) {
  poly(g, [[16, 160], [24, 132], [56, 116], [104, 116], [136, 132], [144, 160]], C.cloth);
  poly(g, [[80, 116], [104, 116], [136, 132], [144, 160], [80, 160]], C.clothD);
  poly(g, [[70, 96], [90, 96], [90, 120], [70, 120]], sh(C.skin, -0.14));
  poly(g, [[55, 62], [59, 60], [59, 80], [54, 76]], sh(C.skin, -0.1)); poly(g, [[105, 62], [101, 60], [101, 80], [106, 76]], sh(C.skin, -0.18));
  poly(g, [[58, 50], [66, 38], [94, 38], [102, 50], [103, 80], [93, 98], [67, 98], [57, 80]], C.skin);
  poly(g, [[80, 38], [94, 38], [102, 50], [103, 80], [93, 98], [80, 98]], sh(C.skin, -0.07));
  const glow = key === 'umbral', iris = key === 'frostholm' ? '#5aa9ef' : key === 'umbral' ? '#e7d0ff' : '#2a1d14';
  for (const ex of [70, 90]) {
    if (glow) { circ(g, ex, 69, 7, 'rgba(210,170,255,.35)'); }
    g.beginPath(); g.ellipse(ex, 69, 3.8, 4.6, 0, 0, Math.PI * 2); g.fillStyle = iris; g.fill();
    if (key === 'frostholm') circ(g, ex, 69.5, 2, '#1b2440');
    circ(g, ex + 1.2, 67.4, 1.2, '#ffffff');
  }
  if (key === 'sunspear') { g.strokeStyle = '#1b1208'; g.lineWidth = 1.8; for (const [a, b] of [[66, 58], [94, 102]]) { g.beginPath(); g.moveTo(a, 69); g.lineTo(b, 66); g.stroke(); } }
  const brow = key === 'frostholm' ? '#e8d6b0' : key === 'ironvale' ? '#8a4a24' : '#2b1d14';
  if (key !== 'umbral') { poly(g, [[64, 60], [76, 58], [76, 61], [64, 63]], brow); poly(g, [[84, 58], [96, 60], [96, 63], [84, 61]], brow); }
  tri(g, 80, 70, 76, 83, 83, 83, sh(C.skin, -0.16));
  if (key !== 'ironvale' && key !== 'frostholm') { g.strokeStyle = '#7a3b2e'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(74, 89); g.quadraticCurveTo(80, 92, 86, 89); g.stroke(); }
}
const CHIEF_GEAR = {
  ironvale: {
    post(g) {
      poly(g, [[58, 78], [66, 84], [80, 87], [94, 84], [102, 78], [100, 98], [92, 116], [80, 126], [68, 116], [60, 98]], '#9a4a24');
      poly(g, [[80, 87], [94, 84], [102, 78], [100, 98], [92, 116], [80, 126]], '#7a3818');
      poly(g, [[66, 86], [80, 83], [94, 86], [90, 91], [80, 89], [70, 91]], '#b25a2c');
      circ(g, 72, 118, 2.4, '#ffd54a'); circ(g, 88, 118, 2.4, '#ffd54a');
      poly(g, [[53, 58], [56, 40], [68, 27], [92, 27], [104, 40], [107, 58]], '#a7b0ba');
      poly(g, [[80, 27], [92, 27], [104, 40], [107, 58], [80, 58]], '#7d8690');
      poly(g, [[52, 54], [108, 54], [108, 62], [52, 62]], '#5f6770');
      poly(g, [[77, 56], [83, 56], [83, 80], [77, 80]], '#7d8690');
      poly(g, [[73, 28], [80, 4], [87, 28]], '#e5484d'); poly(g, [[80, 4], [87, 28], [80, 28]], '#a52323');
      for (const x of [58, 68, 92, 102]) circ(g, x, 58, 1.4, '#c9d1d9');
      circ(g, 28, 134, 15, '#8d96a0'); circ(g, 132, 134, 15, '#6f7882');
    }
  },
  sunspear: {
    post(g) {
      const shape = [[53, 60], [56, 38], [68, 27], [92, 27], [104, 38], [107, 60], [114, 106], [102, 116], [100, 66], [60, 66], [58, 116], [46, 106]];
      poly(g, shape, '#f5c02e');
      g.save(); g.beginPath(); g.moveTo(shape[0][0], shape[0][1]); for (const p of shape.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
      g.fillStyle = '#2a5aa8'; for (let y = 30; y < 120; y += 8) g.fillRect(40, y, 80, 3.4);
      g.restore();
      poly(g, [[54, 56], [106, 56], [106, 65], [54, 65]], '#ffd54a');
      g.strokeStyle = '#8a5a12'; g.lineWidth = 1; g.strokeRect(54, 56, 52, 9);
      circ(g, 80, 50, 6.5, '#ffd54a'); circ(g, 80, 50, 4, '#e5484d');
      const cols = ['#ffd54a', '#2a5aa8', '#e5484d', '#ffd54a'];
      for (let k = 0; k < 4; k++) { g.strokeStyle = cols[k]; g.lineWidth = 5; g.beginPath(); g.arc(80, 112, 20 + k * 6, 0.12 * Math.PI, 0.88 * Math.PI); g.stroke(); }
    }
  },
  verdant: {
    post(g) {
      poly(g, [[57, 52], [64, 36], [96, 36], [103, 52], [103, 57], [57, 57]], '#1d1510');
      for (let i = 0; i < 5; i++) {
        const a = (-52 + i * 26) * Math.PI / 180, bx = 80 + Math.sin(a) * 18, by = 44 - Math.cos(a) * 4;
        const tx0 = 80 + Math.sin(a) * 46, ty0 = 40 - Math.cos(a) * 42, px = Math.cos(a) * 7, py = Math.sin(a) * 7;
        poly(g, [[bx - px, by - py], [tx0, ty0], [bx + px, by + py]], i % 2 ? '#3dbb5a' : '#2a8f45');
        poly(g, [[bx, by], [tx0, ty0], [bx + px, by + py]], i % 2 ? '#2e9a4a' : '#1f7438');
      }
      poly(g, [[56, 50], [104, 50], [104, 57], [56, 57]], '#6b4a2b');
      for (const x of [62, 72, 88, 98]) circ(g, x, 53.5, 2.2, '#3dbb5a');
      g.strokeStyle = '#3dbb5a'; g.lineWidth = 2.6; g.lineCap = 'round';
      for (const [x1, y1, x2, y2] of [[62, 76, 69, 80], [63, 82, 70, 86], [98, 76, 91, 80], [97, 82, 90, 86]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
      g.strokeStyle = '#6b4a2b'; g.lineWidth = 1.6; g.beginPath(); g.arc(80, 108, 22, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      for (let k = 0; k < 7; k++) { const a = (0.2 + k * 0.1) * Math.PI, x = 80 + Math.cos(a) * 22, y = 108 + Math.sin(a) * 22; tri(g, x - 2, y, x + 2, y, x, y + 6, '#f5f0e0'); }
    }
  },
  tidecallers: {
    post(g) {
      poly(g, [[56, 64], [52, 84], [58, 92], [60, 66]], '#2b1d14'); poly(g, [[104, 64], [108, 84], [102, 92], [100, 66]], '#2b1d14');
      poly(g, [[57, 50], [64, 37], [96, 37], [103, 50], [103, 54], [57, 54]], '#2b1d14');
      poly(g, [[55, 46], [105, 46], [107, 58], [53, 58]], '#2f7cf6');
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.4;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(58 + k * 10, 54); g.quadraticCurveTo(62 + k * 10, 49, 66 + k * 10, 54); g.stroke(); }
      poly(g, [[105, 50], [118, 44], [114, 56]], '#2f7cf6'); poly(g, [[105, 54], [116, 62], [109, 64]], '#1f5fd0');
      circ(g, 80, 52, 6, '#f6e6c8'); g.strokeStyle = '#a07a4a'; g.lineWidth = 1.2; g.beginPath(); g.arc(80, 52, 3.6, 0, Math.PI * 1.6); g.stroke();
      g.strokeStyle = '#ffd54a'; g.lineWidth = 1.8; g.beginPath(); g.arc(104, 84, 4, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#ffffff'; for (let y = 128; y < 160; y += 9) g.fillRect(20, y, 120, 3);
      for (let k = 0; k < 6; k++) { const a = (0.2 + k * 0.12) * Math.PI; circ(g, 80 + Math.cos(a) * 21, 108 + Math.sin(a) * 21, 2.6, '#f6e6c8'); }
    }
  },
  umbral: {
    pre(g) {
      poly(g, [[34, 160], [38, 96], [48, 50], [64, 24], [80, 16], [96, 24], [112, 50], [122, 96], [126, 160]], '#5b2f9a');
      poly(g, [[80, 16], [96, 24], [112, 50], [122, 96], [126, 160], [80, 160]], '#4a2380');
      poly(g, [[54, 58], [62, 36], [98, 36], [106, 58], [108, 100], [80, 112], [52, 100]], '#1a0f2e');
    },
    post(g) {
      const gr = g.createLinearGradient(0, 36, 0, 74); gr.addColorStop(0, 'rgba(14,6,30,.92)'); gr.addColorStop(1, 'rgba(14,6,30,0)');
      g.fillStyle = gr; g.fillRect(52, 36, 56, 40);
      for (const ex of [70, 90]) { circ(g, ex, 69, 5, 'rgba(210,170,255,.35)'); circ(g, ex, 69, 2.6, '#f3e6ff'); }
      poly(g, [[80, 22], [84, 30], [80, 38], [76, 30]], '#ffd54a');
      g.strokeStyle = '#ffd54a'; g.lineWidth = 3; g.beginPath(); g.moveTo(52, 124); g.lineTo(80, 150); g.lineTo(108, 124); g.stroke();
    }
  },
  frostholm: {
    pre(g) {
      poly(g, [[44, 116], [42, 62], [54, 34], [80, 24], [106, 34], [118, 62], [116, 116]], '#eef3f8');
      for (const [x, y] of [[44, 70], [46, 90], [48, 108], [114, 70], [112, 90], [110, 108]]) circ(g, x, y, 7, '#f7fbfe');
    },
    post(g) {
      poly(g, [[60, 80], [80, 86], [100, 80], [98, 100], [88, 112], [80, 118], [72, 112], [62, 100]], '#f1e4c8');
      poly(g, [[80, 86], [100, 80], [98, 100], [88, 112], [80, 118]], '#dccb9f');
      poly(g, [[67, 85], [80, 82], [93, 85], [88, 90], [80, 88], [72, 90]], '#f8efd8');
      circ(g, 65, 79, 4.5, 'rgba(255,120,120,.35)'); circ(g, 95, 79, 4.5, 'rgba(255,120,120,.35)');
      poly(g, [[54, 54], [58, 38], [80, 30], [102, 38], [106, 54]], '#f5f9fc');
      for (let x = 56; x <= 104; x += 8) circ(g, x, 54, 5, x % 16 ? '#dfeaf2' : '#ffffff');
      poly(g, [[60, 40], [44, 16], [54, 22], [66, 36]], '#efe3c4'); poly(g, [[100, 40], [116, 16], [106, 22], [94, 36]], '#cdbf9c');
      circ(g, 80, 134, 6, '#c9d1d9'); circ(g, 80, 134, 3, '#5aa9ef');
    }
  }
};

/* ---------- animated homeland scenes behind the tribe picker ---------- */
const SCENES = {
  ironvale: { sky: ['#1c0d16', '#5a1e22', '#b8452f', '#f0a35e'], orb: [0.74, 0.44, 0.06, '#ffcf8a'], parts: 'embers',
    layers: [['mount', '#43191f', 0.64, 0.22, 9, 3, '#c9a08a'], ['mount', '#2e1117', 0.76, 0.14, 12, 7], ['hill', '#1a0a0e', 0.9, 0.05, 16, 11]], prop: 'forge' },
  sunspear: { sky: ['#1f1747', '#8a3a6e', '#ff8a5c', '#ffd28f'], orb: [0.7, 0.55, 0.09, '#ffe9a8'], parts: 'sand',
    layers: [['dune', '#e8ad62', 0.7, 0.05, 5, 2], ['dune', '#cf8e48', 0.8, 0.05, 6, 5], ['dune', '#a96c33', 0.91, 0.04, 7, 9]], prop: 'pyramids' },
  verdant: { sky: ['#06261c', '#0f4a32', '#2f8f5b', '#bfe89a'], orb: [0.28, 0.3, 0.05, '#f4ffd0'], parts: 'fireflies',
    layers: [['canopy', '#1f6b3a', 0.62, 0.08, 14, 4], ['canopy', '#16542d', 0.74, 0.07, 18, 8], ['canopy', '#0d3a1f', 0.88, 0.06, 22, 12]], prop: 'rays' },
  tidecallers: { sky: ['#0f2d63', '#2a6fc0', '#7cc4f2', '#ffe0a8'], orb: [0.5, 0.6, 0.07, '#fff1c4'], parts: 'gulls',
    layers: [['sea', '#2f7fd6', 0.64, 0.01, 0, 1], ['sea', '#2a6cbd', 0.75, 0.014, 0, 2], ['sea', '#1f5498', 0.87, 0.018, 0, 3]], prop: 'island' },
  umbral: { sky: ['#05030f', '#140a2e', '#3a1a6a', '#8a4fc0'], orb: [0.72, 0.3, 0.06, '#f1e8ff'], parts: 'motes', stars: true,
    layers: [['spires', '#2a1850', 0.68, 0.2, 10, 6], ['mount', '#1c1038', 0.8, 0.1, 12, 10], ['hill', '#110a24', 0.91, 0.04, 16, 14]], prop: 'tower' },
  frostholm: { sky: ['#0b1730', '#1f3b66', '#5f86b8', '#cfe6f5'], orb: [0.24, 0.26, 0.04, '#ffffff'], parts: 'snow', stars: true,
    layers: [['mount', '#9fbad0', 0.62, 0.26, 8, 5, '#ffffff'], ['mount', '#6f8fb0', 0.76, 0.16, 11, 9, '#e8f4ff'], ['hill', '#dfeefa', 0.9, 0.05, 14, 13]], prop: 'aurora' }
};
function seeded(seed) { let a = seed * 9301 + 49297; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; }
const SCENE_PTS = new Map();
function layerPts(key, li, L, W, H) {
  const ck = key + li + ':' + W + 'x' + H;
  if (SCENE_PTS.has(ck)) return SCENE_PTS.get(ck);
  const [kind, , base, amp, n, seed] = L, r = seeded(seed), pts = [];
  if (kind === 'mount' || kind === 'hill' || kind === 'spires') {
    const cnt = n * 2;
    for (let i = 0; i <= cnt; i++) {
      const x = i / cnt * W + (i && i < cnt ? (r() - 0.5) * W / cnt * 0.6 : 0);
      const peak = i % 2 === 1;
      pts.push([x, H * base - (peak ? H * amp * (0.45 + r() * 0.55) : H * amp * 0.12 * r())]);
    }
  } else if (kind === 'dune' || kind === 'canopy') {
    const cnt = n * 2;
    for (let i = 0; i <= cnt; i++) pts.push([i / cnt * W, H * base - H * amp * (0.3 + 0.7 * r())]);
  }
  SCENE_PTS.set(ck, pts); return pts;
}
function drawScene(c, W, H, key, now) {
  if (!SCENES[key]) key = 'tidecallers';   /* fallback until a tribe has its own scene */
  const S = SCENES[key], t = now / 1000;
  const g = c.createLinearGradient(0, 0, 0, H);
  S.sky.forEach((col, k) => g.addColorStop(k / (S.sky.length - 1) * 0.72, col));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (S.stars) for (let k = 0; k < 70; k++) { const x = ((k * 7919) % 1000) / 1000 * W, y = ((k * 104729) % 1000) / 1000 * H * 0.55; c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + k); c.fillStyle = '#ffffff'; c.fillRect(x, y, 1.6, 1.6); }
  c.globalAlpha = 1;
  if (S.prop === 'aurora') {
    for (let b = 0; b < 3; b++) {
      c.beginPath();
      for (let x = 0; x <= W; x += W / 30) { const y = H * (0.16 + b * 0.06) + Math.sin(x / W * 6 + t * 0.6 + b) * H * 0.03; x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.strokeStyle = b === 1 ? 'rgba(120,255,210,.22)' : 'rgba(90,220,255,.16)'; c.lineWidth = H * 0.05; c.stroke();
    }
  }
  const [ox, oy, orr, ocol] = S.orb, R = Math.min(W, H) * orr * 1.6;
  const og = c.createRadialGradient(ox * W, oy * H, 0, ox * W, oy * H, R * 3.2);
  og.addColorStop(0, rgba(ocol, 0.45)); og.addColorStop(1, rgba(ocol, 0));
  c.fillStyle = og; c.fillRect(0, 0, W, H);
  circ(c, ox * W, oy * H, R, ocol);
  if (key === 'umbral') { c.save(); c.beginPath(); c.arc(ox * W, oy * H, R + 1, 0, Math.PI * 2); c.clip(); c.fillStyle = g; c.beginPath(); c.arc(ox * W + R * 0.38, oy * H - R * 0.18, R * 0.86, 0, Math.PI * 2); c.fill(); c.restore(); }
  if (S.prop === 'rays') { c.save(); c.globalAlpha = 0.08 + 0.04 * Math.sin(t); c.fillStyle = '#f4ffd0'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(ox * W + k * 30, oy * H); c.lineTo(W * (0.2 + k * 0.18), H); c.lineTo(W * (0.28 + k * 0.18), H); c.closePath(); c.fill(); } c.restore(); }
  S.layers.forEach((L, li) => {
    const kind = L[0], col = L[1];
    if (kind === 'sea') {
      const base = H * L[2], amp = H * L[3];
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, base + Math.sin(x / 70 + t * (1.2 + li * 0.3) + li) * amp);
      c.lineTo(W, H); c.closePath(); c.fillStyle = col; c.fill();
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2;
      for (let k = 0; k < 8; k++) { const x = ((k * 211 + t * 30 * (li + 1)) % (W + 80)) - 40, y = base + 14 + (k % 3) * 16; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 26, y); c.stroke(); }
      if (li === 0 && S.prop === 'island') {
        const ix = W * 0.2, iy = base + 4;
        c.fillStyle = '#e8c27a'; c.beginPath(); c.ellipse(ix, iy, W * 0.07, H * 0.018, 0, Math.PI, 0); c.fill();
        c.strokeStyle = '#6b4a2b'; c.lineWidth = 4; c.beginPath(); c.moveTo(ix, iy - 4); c.quadraticCurveTo(ix + 10, iy - 40, ix + 4, iy - 70); c.stroke();
        for (let a = 0; a < 5; a++) { const an = -Math.PI / 2 + (a - 2) * 0.7; tri(c, ix + 4, iy - 70, ix + 4 + Math.cos(an) * 34, iy - 70 + Math.sin(an) * 22 + 12, ix + 4 + Math.cos(an + 0.35) * 16, iy - 70 + Math.sin(an + 0.35) * 10, a % 2 ? '#2e8b57' : '#3fa86a'); }
        const bx = ((t * 18) % (W + 200)) - 100, by = base + 6;
        poly(c, [[bx - 26, by], [bx + 26, by], [bx + 18, by + 10], [bx - 18, by + 10]], '#5a3a22');
        c.strokeStyle = '#3a2614'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by - 46); c.stroke();
        tri(c, bx + 2, by - 44, bx + 24, by - 8, bx + 2, by - 6, '#f7f1e3');
      }
      return;
    }
    const pts = layerPts(key, li, L, W, H);
    c.beginPath(); c.moveTo(0, H);
    if (kind === 'dune') { c.lineTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } c.lineTo(W, pts[pts.length - 1][1]); }
    else if (kind === 'spires') { for (const [x, y] of pts) { c.lineTo(x - 6, H * L[2]); c.lineTo(x, y); c.lineTo(x + 6, H * L[2]); } }
    else for (const [x, y] of pts) c.lineTo(x, y);
    c.lineTo(W, H); c.closePath(); c.fillStyle = col; c.fill();
    if (kind === 'canopy') for (const [x, y] of pts) { circ(c, x, y + 6, W / pts.length * 0.9, col); circ(c, x - 6, y, W / pts.length * 0.55, sh(col, 0.08)); }
    if (kind === 'mount') for (let i = 1; i < pts.length - 1; i += 2) {
      const [px, py] = pts[i], [nx, ny] = pts[i + 1];
      tri(c, px, py, nx, ny, px, ny, sh(col, -0.14));
      if (L[6]) { const f = 0.22; tri(c, px, py, px + (pts[i - 1][0] - px) * f, py + (pts[i - 1][1] - py) * f, px + (nx - px) * f, py + (ny - py) * f, L[6]); }
    }
    if (kind === 'spires') for (const [x, y] of pts) { c.strokeStyle = 'rgba(190,150,255,.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 6, H * L[2]); c.lineTo(x, y); c.stroke(); }
    if (li === 0 && S.prop === 'pyramids') for (const [px, s2] of [[0.26, 1], [0.4, 0.62]]) {
      const bx = W * px, by = H * L[2] - H * 0.02, h = H * 0.2 * s2, w = h * 1.25;
      tri(c, bx, by - h, bx - w, by, bx, by, '#e9b86e'); tri(c, bx, by - h, bx, by, bx + w * 0.55, by, '#b87a3c');
    }
    if (li === 1 && S.prop === 'forge') {
      const bx = W * 0.3, by = H * L[2] + 6;
      poly(c, [[bx - 24, by], [bx - 20, by - 90], [bx + 20, by - 90], [bx + 24, by]], '#24100f');
      for (let k = 0; k < 4; k++) poly(c, [[bx - 22 + k * 12, by - 90], [bx - 22 + k * 12, by - 102], [bx - 14 + k * 12, by - 102], [bx - 14 + k * 12, by - 90]], '#24100f');
      c.fillStyle = `rgba(255,${150 + 40 * Math.sin(t * 5)},60,.9)`; c.fillRect(bx - 6, by - 60, 12, 16); c.fillRect(bx - 6, by - 30, 12, 16);
      for (let k = 0; k < 5; k++) { const p = ((t * 0.3 + k / 5) % 1); circ(c, bx + Math.sin(p * 6 + k) * 10, by - 104 - p * 120, 8 + p * 16, `rgba(70,50,50,${0.35 * (1 - p)})`); }
    }
    if (li === 0 && S.prop === 'tower') {
      const bx = W * 0.8, by = H * L[2];
      poly(c, [[bx - 14, by], [bx - 8, by - 150], [bx + 8, by - 150], [bx + 14, by]], '#1a0f38');
      tri(c, bx - 12, by - 150, bx + 12, by - 150, bx, by - 186, '#24154a');
      circ(c, bx, by - 162, 10 + 3 * Math.sin(t * 2), 'rgba(200,160,255,.35)'); circ(c, bx, by - 162, 5, '#e7d0ff');
    }
  });
  const vg = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
}
const PICK = { on: false, cur: null, prev: null, fadeAt: 0, parts: [], last: 0 };
function pickStart() { if (PICK.on) return; PICK.on = true; PICK.last = 0; requestAnimationFrame(pickFrame); }
function pickStop() { PICK.on = false; }
function pickScene(key) {
  if (PICK.cur === key) return;
  PICK.prev = PICK.cur; PICK.cur = key; PICK.fadeAt = performance.now(); PICK.parts = [];
}
function spawnPart(kind, W, H, init) {
  const r = Math.random;
  if (kind === 'embers') return { x: r() * W, y: init ? r() * H : H + 10, vx: (r() - 0.5) * 20, vy: -(30 + r() * 60), s: 1 + r() * 2.2, c: r() < 0.5 ? '#ffb35c' : '#ff6a3d', life: 0, max: 3 + r() * 4 };
  if (kind === 'sand') return { x: init ? r() * W : W + 10, y: H * (0.45 + r() * 0.5), vx: -(40 + r() * 80), vy: 0, s: 0.8 + r() * 1.6, c: '#f7d9a0', life: 0, max: 6 + r() * 6 };
  if (kind === 'fireflies') return { x: r() * W, y: H * (0.35 + r() * 0.6), vx: (r() - 0.5) * 18, vy: (r() - 0.5) * 12, s: 1.4 + r() * 1.8, c: '#e9ff8a', life: init ? r() * 4 : 0, max: 4 + r() * 5 };
  if (kind === 'gulls') return { x: init ? r() * W : -20, y: H * (0.12 + r() * 0.3), vx: 20 + r() * 30, vy: 0, s: 6 + r() * 5, c: '#ffffff', life: 0, max: 40, gull: true };
  if (kind === 'motes') return { x: r() * W, y: init ? r() * H : H + 10, vx: (r() - 0.5) * 10, vy: -(12 + r() * 26), s: 1 + r() * 2, c: r() < 0.5 ? '#c9a7ff' : '#f3e6ff', life: 0, max: 8 + r() * 8 };
  return { x: r() * W, y: init ? r() * H : -10, vx: (r() - 0.5) * 20, vy: 25 + r() * 45, s: 1 + r() * 2.2, c: '#ffffff', life: 0, max: 20 };
}
function pickFrame(now) {
  if (!PICK.on) return;
  requestAnimationFrame(pickFrame);
  const cvs = document.getElementById('pickSky'); if (!cvs || !PICK.cur) return;
  const W = cvs.clientWidth, H = cvs.clientHeight, dpr = Math.min(1.5, window.devicePixelRatio || 1);
  if (cvs.width !== Math.round(W * dpr) || cvs.height !== Math.round(H * dpr)) { cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr); }
  const c = cvs.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const dt = PICK.last ? Math.min(0.05, (now - PICK.last) / 1000) : 1 / 60; PICK.last = now;
  const f = PICK.prev ? Math.min(1, (now - PICK.fadeAt) / 650) : 1;
  if (PICK.prev && f < 1) { drawScene(c, W, H, PICK.prev, now); c.globalAlpha = f; drawScene(c, W, H, PICK.cur, now); c.globalAlpha = 1; }
  else { PICK.prev = null; drawScene(c, W, H, PICK.cur, now); }
  const kind = (SCENES[PICK.cur] || SCENES.tidecallers).parts, want = kind === 'gulls' ? 6 : kind === 'snow' ? 110 : 70;
  if (!PICK.parts.length) for (let k = 0; k < want; k++) PICK.parts.push(spawnPart(kind, W, H, true));
  while (PICK.parts.length < want) PICK.parts.push(spawnPart(kind, W, H, false));
  for (let k = PICK.parts.length - 1; k >= 0; k--) {
    const p = PICK.parts[k];
    p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (kind === 'snow' || kind === 'sand') p.x += Math.sin(now / 700 + k) * 0.3;
    if (kind === 'fireflies') { p.vx += (Math.random() - 0.5) * 4; p.vy += (Math.random() - 0.5) * 4; }
    if (p.life > p.max || p.y < -30 || p.y > H + 30 || p.x < -40 || p.x > W + 40) { PICK.parts.splice(k, 1); continue; }
    if (p.gull) {
      const flap = Math.sin(now / 160 + k) * p.s * 0.5;
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.8; c.beginPath();
      c.moveTo(p.x - p.s, p.y - flap); c.quadraticCurveTo(p.x - p.s * 0.4, p.y - p.s * 0.4, p.x, p.y); c.quadraticCurveTo(p.x + p.s * 0.4, p.y - p.s * 0.4, p.x + p.s, p.y - flap); c.stroke();
      continue;
    }
    const a = kind === 'fireflies' ? 0.5 + 0.5 * Math.sin(now / 300 + k * 2) : Math.min(1, Math.sin(Math.min(1, p.life / p.max) * Math.PI) * 1.4);
    c.globalAlpha = Math.max(0, a) * (kind === 'snow' ? 0.9 : 0.8);
    if (kind === 'fireflies' || kind === 'embers' || kind === 'motes') circ(c, p.x, p.y, p.s * 2.6, rgba(p.c, 0.18));
    circ(c, p.x, p.y, p.s, p.c);
  }
  c.globalAlpha = 1;
}

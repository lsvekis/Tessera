/* =====================================================================
   Part 5a: renderer — geometry, colours, cached terrain layer
   ===================================================================== */
const TW = 96, TH = 48, HW = 48, HH = 24;
const ELEV = { field: 9, forest: 9, mountain: 9, water: 0, ocean: -3 };
const EDGE = 26;
let cv = null, ctx = null, DPR = 1, VW = 0, VH = 0;
const cam = { x: 0, y: 0, z: 1 };
let terrainCache = null, cacheScale = 0, cacheDirty = true, cacheB = null, lastZoomAt = 0;
let SHOW_STATS = false;

function hexRgb(h) { h = h.replace('#', ''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
const SHC = new Map();
function sh(h, a) {
  const k = h + a; let v = SHC.get(k); if (v) return v;
  const [r, g, b] = hexRgb(h);
  v = a >= 0 ? rgbHex(r + (255 - r) * a, g + (255 - g) * a, b + (255 - b) * a) : rgbHex(r * (1 + a), g * (1 + a), b * (1 + a));
  SHC.set(k, v); return v;
}
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function hash(i, k) { let h = (i * 374761393 + k * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function isoX(x, y) { return (x - y) * HW; }
function isoY(x, y) { return (x + y) * HH; }
function viewExplored(i) { return G.viewAll || G.tribes[G.human].explored[i] === 1; }
function tribeColor(ti) { return ti >= 0 ? G.tribes[ti].color : '#9b8a70'; }
function tribeDark(ti) { return ti >= 0 ? TRIBES[G.tribes[ti].key].dark : '#4a3f30'; }
function isLightTribe(ti) { return ti >= 0 && G.tribes[ti].key === 'frostholm'; }

function poly(c, pts, fill) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); c.closePath(); c.fillStyle = fill; c.fill(); }
function tri(c, ax, ay, bx, by, cx2, cy2, fill) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(cx2, cy2); c.closePath(); c.fillStyle = fill; c.fill(); }
function circ(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function ell(c, x, y, rx, ry, fill) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function diamond(c, cx, cy, k) { c.beginPath(); c.moveTo(cx, cy - HH * k); c.lineTo(cx + HW * k, cy); c.lineTo(cx, cy + HH * k); c.lineTo(cx - HW * k, cy); c.closePath(); }
function forEachDepth(fn) {
  const N = G.size;
  for (let d = 0; d <= 2 * N - 2; d++) for (let x = Math.max(0, d - N + 1); x <= Math.min(d, N - 1); x++) {
    const y = d - x, i = idx(x, y); fn(x, y, i, G.tiles[i]);
  }
}
function worldBounds() { const N = G.size; return { minX: -N * HW - 8, maxX: N * HW + 8, minY: -HH - 90, maxY: (2 * N - 1) * HH + EDGE + 24 }; }

/* ---------- tile slabs ---------- */
function topColor(t) {
  const B = BIOMES[t.biome];
  if (t.t === 'ocean') return '#2a72c0';
  if (t.t === 'water') return B.water;
  return B.field;
}
function drawSlab(c, x, y, i, t) {
  const cx = isoX(x, y), e = ELEV[t.t], cy = isoY(x, y) - e;
  const B = BIOMES[t.biome], land = isLand(t);
  const sideR = land ? sh(B.side, -0.12) : t.t === 'ocean' ? '#1d4f8a' : sh(B.water, -0.35);
  const sideL = land ? B.side : t.t === 'ocean' ? '#245e9f' : sh(B.water, -0.22);
  const nR = tile(x + 1, y), nB = tile(x, y + 1);
  const dR = (!nR || !viewExplored(idx(x + 1, y))) ? EDGE + e : Math.max(0, e - ELEV[nR.t]);
  const dB = (!nB || !viewExplored(idx(x, y + 1))) ? EDGE + e : Math.max(0, e - ELEV[nB.t]);
  if (dR > 0) {
    poly(c, [[cx + HW, cy], [cx, cy + HH], [cx, cy + HH + dR], [cx + HW, cy + dR]], sideR);
    if (dR > 12 && land) poly(c, [[cx + HW, cy + 8], [cx, cy + HH + 8], [cx, cy + HH + dR], [cx + HW, cy + dR]], sh(sideR, -0.25));
  }
  if (dB > 0) {
    poly(c, [[cx - HW, cy], [cx, cy + HH], [cx, cy + HH + dB], [cx - HW, cy + dB]], sideL);
    if (dB > 12 && land) poly(c, [[cx - HW, cy + 8], [cx, cy + HH + 8], [cx, cy + HH + dB], [cx - HW, cy + dB]], sh(sideL, -0.25));
  }
  const base = topColor(t), v = (hash(i, 3) - 0.5) * 0.06;
  const a = sh(base, 0.04 + v), b = sh(base, -0.05 + v);
  if (hash(i, 4) < 0.5) {
    tri(c, cx, cy - HH, cx - HW, cy, cx + HW, cy, a); tri(c, cx - HW, cy, cx, cy + HH, cx + HW, cy, b);
  } else {
    tri(c, cx, cy - HH, cx - HW, cy, cx, cy + HH, a); tri(c, cx, cy - HH, cx + HW, cy, cx, cy + HH, b);
  }
}

/* ---------- flat overlays: farmland, roads, territory ---------- */
const EDGES4 = [[0, -1, 0, 1], [1, 0, 1, 2], [0, 1, 2, 3], [-1, 0, 3, 0]]; // neighbour dx,dy and diamond vertex pair
function diamondPts(cx, cy, k) { return [[cx, cy - HH * k], [cx + HW * k, cy], [cx, cy + HH * k], [cx - HW * k, cy]]; }
function drawFlat(c, x, y, i, t) {
  const cx = isoX(x, y), cy = isoY(x, y) - ELEV[t.t];
  if (t.site && t.site.type === 'farm') {
    const lv = t.site.lvl;
    diamond(c, cx, cy, 0.8); c.fillStyle = lv >= 3 ? '#d9b44a' : lv === 2 ? '#c9a452' : '#b99a58'; c.fill();
    c.save(); diamond(c, cx, cy, 0.8); c.clip();
    c.strokeStyle = lv >= 3 ? '#9c7a22' : '#8e7336'; c.lineWidth = 2.2;
    for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(cx - 40 + k * 10, cy - 20 + k * 5 - 20); c.lineTo(cx + 40 + k * 10, cy + 20 + k * 5 - 20); c.stroke(); }
    c.fillStyle = lv >= 2 ? '#7fb843' : '#8fbf55';
    for (let k = 0; k < 7; k++) { const px = cx - 26 + hash(i, 20 + k) * 52, py = cy - 10 + hash(i, 40 + k) * 20; c.fillRect(px, py - 3, 2, 3); }
    c.restore();
  }
  if (t.road || (t.city >= 0 && G.cities[t.city].owner >= 0)) {
    let any = false;
    for (const [nx, ny] of neighbors(x, y)) {
      const o = tile(nx, ny);
      if (!(o.road || (o.city >= 0 && G.cities[o.city].owner >= 0)) || (!t.road && !o.road)) continue;
      if (!viewExplored(idx(nx, ny))) continue;
      const ox = isoX(nx, ny), oy = isoY(nx, ny) - ELEV[o.t];
      const mx = (cx + ox) / 2, my = (cy + oy) / 2;
      c.lineCap = 'round';
      c.strokeStyle = '#8a6a3c'; c.lineWidth = 9; c.beginPath(); c.moveTo(cx, cy); c.lineTo(mx, my); c.stroke();
      c.strokeStyle = '#c9a36a'; c.lineWidth = 5.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(mx, my); c.stroke();
      any = true;
    }
    if (t.road && !any) { ell(c, cx, cy, 10, 5, '#b8935a'); }
  }
  if (t.owner >= 0) {
    const col = tribeColor(t.owner);
    diamond(c, cx, cy, 1); c.fillStyle = rgba(col, isLand(t) ? (isLightTribe(t.owner) ? 0.16 : 0.2) : 0.16); c.fill();
    const P = diamondPts(cx, cy, 0.93);
    for (const [dx, dy, a, b] of EDGES4) {
      const o = tile(x + dx, y + dy);
      if (o && o.owner === t.owner) continue;
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(8,10,24,0.55)'; c.lineWidth = 7; c.beginPath(); c.moveTo(P[a][0], P[a][1]); c.lineTo(P[b][0], P[b][1]); c.stroke();
      c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.moveTo(P[a][0], P[a][1]); c.lineTo(P[b][0], P[b][1]); c.stroke();
    }
  }
}

/* ---------- objects ---------- */
function drawTree(c, x, y, s, B, k, w) {
  const [l, d] = B.tree, st = B.style, W = w || 0, o1 = W * 0.6, o2 = W * 1.35;
  if (st !== 'lollipop' && st !== 'antenna') poly(c, [[x - 1.6 * s, y], [x + 1.6 * s, y], [x + 1.6 * s + o1, y - 6 * s], [x - 1.6 * s + o1, y - 6 * s]], B.trunk);
  if (st === 'pine' || st === 'snowpine' || st === 'xmas') {
    tri(c, x + o1, y - 24 * s, x - 10 * s, y - 5 * s, x, y - 5 * s, l); tri(c, x + o1, y - 24 * s, x, y - 5 * s, x + 10 * s, y - 5 * s, d);
    tri(c, x + o2, y - 32 * s, x - 7 * s + o1, y - 15 * s, x + o1, y - 15 * s, sh(l, 0.06)); tri(c, x + o2, y - 32 * s, x + o1, y - 15 * s, x + 7 * s + o1, y - 15 * s, sh(d, 0.04));
    if (st === 'snowpine') { tri(c, x + o2, y - 32 * s, x - 3.6 * s + o1, y - 23 * s, x + 3.6 * s + o1, y - 23 * s, '#ffffff'); tri(c, x - 10 * s, y - 5 * s, x - 5 * s, y - 9 * s, x, y - 5 * s, 'rgba(255,255,255,0.8)'); }
    if (st === 'xmas') {
      tri(c, x + o2, y - 32 * s, x - 3.4 * s + o1, y - 23 * s, x + 3.4 * s + o1, y - 23 * s, 'rgba(255,255,255,0.85)');
      const balls = [[-5, -9, '#e5484d'], [4.5, -11, '#ffd54a'], [-2.5, -18, '#4fdc8a'], [5, -20, '#8fd3ff']];
      for (let b = 0; b < balls.length; b++) { const [bx, by, col] = balls[b]; circ(c, x + bx * s + o1 * (1 - by / -26), y + by * s, 1.9 * s, col); }
      const st2 = 6 * s, sy = y - 33 * s;
      poly(c, [[x + o2, sy - st2], [x + o2 + st2 * 0.32, sy - st2 * 0.32], [x + o2 + st2 * 0.52, sy], [x + o2 + st2 * 0.32, sy + st2 * 0.32], [x + o2, sy + st2 * 0.5], [x + o2 - st2 * 0.32, sy + st2 * 0.32], [x + o2 - st2 * 0.52, sy], [x + o2 - st2 * 0.32, sy - st2 * 0.32]], '#ffd54a');
    }
  } else if (st === 'round') {
    const cy = y - 16 * s, r = 9.5 * s, cxw = x + o2;
    poly(c, [[cxw, cy - r], [cxw - r * 0.87, cy - r * 0.5], [x - r * 0.87 + o1, cy + r * 0.5], [x + o1, cy + r]], l);
    poly(c, [[cxw, cy - r], [cxw + r * 0.87, cy - r * 0.5], [x + r * 0.87 + o1, cy + r * 0.5], [x + o1, cy + r]], d);
    tri(c, cxw, cy - r, cxw - r * 0.87, cy - r * 0.5, cxw + r * 0.87, cy - r * 0.5, sh(l, 0.12));
  } else if (st === 'palm') {
    c.strokeStyle = B.trunk; c.lineWidth = 2.6 * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 5 * s + o1, y - 12 * s, x + 2 * s + o2, y - 24 * s); c.stroke();
    const tx0 = x + 2 * s + o2, ty0 = y - 24 * s;
    for (let a = 0; a < 5; a++) {
      const ang = -Math.PI / 2 + (a - 2) * 0.75 + (k || 0) * 0.2 + W * 0.03, L = 13 * s;
      const ex = tx0 + Math.cos(ang) * L, ey = ty0 + Math.sin(ang) * L * 0.8 + 6 * s;
      tri(c, tx0, ty0, ex, ey, tx0 + Math.cos(ang + 0.4) * L * 0.5, ty0 + Math.sin(ang + 0.4) * L * 0.4, a % 2 ? l : d);
    }
  } else if (st === 'crystal') {
    poly(c, [[x, y - 30 * s], [x - 6.5 * s, y - 14 * s], [x, y - 3 * s]], l); poly(c, [[x, y - 30 * s], [x + 6.5 * s, y - 14 * s], [x, y - 3 * s]], d);
    poly(c, [[x + 7 * s, y - 18 * s], [x + 3.5 * s, y - 9 * s], [x + 7 * s, y - 3 * s]], sh(l, 0.1)); poly(c, [[x + 7 * s, y - 18 * s], [x + 10.5 * s, y - 9 * s], [x + 7 * s, y - 3 * s]], sh(d, 0.05));
    c.globalAlpha = 0.25 + 0.25 * Math.sin(W * 1.6 + (k || 0) * 5); circ(c, x, y - 22 * s, 3 * s, '#ffffff'); c.globalAlpha = 1;
  } else if (st === 'lollipop') {
    c.strokeStyle = '#fbf3ea'; c.lineWidth = 2.6 * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + o1, y - 10 * s, x + o2, y - 17 * s); c.stroke();
    const cx2 = x + o2, cy2 = y - 24 * s, r = 8 * s;
    circ(c, cx2, cy2, r, l);
    c.save(); c.beginPath(); c.arc(cx2, cy2, r, 0, Math.PI * 2); c.clip();
    c.strokeStyle = d; c.lineWidth = 2.4 * s; c.beginPath();
    for (let a = 0; a < 26; a++) { const t2 = a / 25 * 7, rr = r * (t2 / 7); const px = cx2 + Math.cos(t2 + W * 0.2) * rr, py = cy2 + Math.sin(t2 + W * 0.2) * rr; a ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.stroke(); c.restore();
    circ(c, cx2 - r * 0.35, cy2 - r * 0.4, r * 0.22, 'rgba(255,255,255,0.75)');
  } else if (st === 'antenna') {
    poly(c, [[x - 4 * s, y], [x + 4 * s, y], [x + 2.6 * s, y - 4 * s], [x - 2.6 * s, y - 4 * s]], '#6f7a8a');
    c.strokeStyle = '#9aa6b6'; c.lineWidth = 2.2 * s; c.beginPath(); c.moveTo(x, y - 3 * s); c.lineTo(x + o1 * 0.4, y - 26 * s); c.stroke();
    c.strokeStyle = '#7d8896'; c.lineWidth = 1.2 * s;
    for (let b = 0; b < 3; b++) { const yy = y - 8 * s - b * 7 * s; c.beginPath(); c.moveTo(x - 3.4 * s, yy); c.lineTo(x + 3.4 * s, yy - 2 * s); c.stroke(); }
    const tipx = x + o1 * 0.4, tipy = y - 26 * s;
    poly(c, [[tipx - 5 * s, tipy - 4 * s], [tipx + 5 * s, tipy - 4 * s], [tipx + 2 * s, tipy], [tipx - 2 * s, tipy]], '#b6c2d2');
    const blink = 0.45 + 0.55 * Math.abs(Math.sin(W * 1.1 + (k || 0) * 3));
    c.globalAlpha = blink; circ(c, tipx, tipy - 6 * s, 2.6 * s, l); c.globalAlpha = blink * 0.4; circ(c, tipx, tipy - 6 * s, 5 * s, l); c.globalAlpha = 1;
  }
}
function drawForest(c, cx, cy, i, B, few, w) {
  const spots = few ? [[-16, -2], [4, -9]] : [[-15, -3], [11, -7], [1, 7], [-3, -12]];
  const n = few ? 2 : 3 + (hash(i, 7) < 0.5 ? 1 : 0);
  const list = spots.slice(0, n).sort((a, b) => a[1] - b[1]);
  for (const [ox, oy] of list) drawTree(c, cx + ox + (hash(i, ox + 50) - 0.5) * 5, cy + oy, 0.85 + hash(i, oy + 60) * 0.3, B, hash(i, ox), (w || 0) * (0.65 + hash(i, ox + 12) * 0.7));
}
function drawMountain(c, cx, cy, i, B) {
  const [l, m, d] = B.mount;
  const bx = cx + 14, by = cy - 2;
  tri(c, bx, by - 30, bx - 18, by + 6, bx + 2, by + 8, sh(l, -0.05)); tri(c, bx, by - 30, bx + 2, by + 8, bx + 20, by + 4, sh(d, -0.05));
  tri(c, bx, by - 30, bx - 5, by - 21, bx + 5, by - 20, B.cap);
  const px = cx - 6 + (hash(i, 1) - 0.5) * 8, py = cy - 44;
  tri(c, px, py, cx - 34, cy + 6, px + 5, cy + 14, l); tri(c, px, py, px + 5, cy + 14, cx + 24, cy + 10, m);
  tri(c, px, py, px + 5, cy + 14, px + 13, cy - 6, d);
  tri(c, px, py, px - 9, py + 15, px + 1, py + 13, B.cap); tri(c, px, py, px + 1, py + 13, px + 8, py + 12, sh(B.cap, -0.12));
}
function drawNuggets(c, cx, cy) {
  for (const [ox, oy, r] of [[-14, 10, 4.5], [-6, 13, 3.6], [-20, 14, 3]]) {
    poly(c, [[cx + ox, cy + oy - r], [cx + ox + r, cy + oy], [cx + ox, cy + oy + r * 0.6], [cx + ox - r, cy + oy]], '#ffd54a');
    tri(c, cx + ox, cy + oy - r, cx + ox + r, cy + oy, cx + ox, cy + oy + r * 0.6, '#e0a91b');
  }
}
function drawGrass(c, cx, cy, i, B, w) {
  const W = (w || 0) * 0.9;
  c.strokeStyle = sh(B.field, -0.18); c.lineWidth = 1.4;
  for (let k = 0; k < 3; k++) {
    const x = cx - 24 + hash(i, 70 + k) * 48, y = cy - 8 + hash(i, 80 + k) * 16, b = W * (0.6 + hash(i, 74 + k) * 0.8);
    c.beginPath(); c.moveTo(x - 2 + b, y - 3); c.lineTo(x, y); c.lineTo(x + 2 + b, y - 4); c.stroke();
  }
}
function drawCrop(c, cx, cy, i, w) {
  const W = (w || 0) * 0.8;
  c.strokeStyle = '#a8862a'; c.lineWidth = 1.6;
  for (let k = 0; k < 6; k++) {
    const x = cx - 14 + (k % 3) * 12 + (hash(i, k) - 0.5) * 4, y = cy - 2 + Math.floor(k / 3) * 8, b = W * (0.7 + hash(i, 20 + k) * 0.6);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + b, y - 11); c.stroke();
    ell(c, x + b * 1.15, y - 12, 2, 4, '#f0c945');
  }
}
function drawBerries(c, cx, cy, i, w) {
  const W = (w || 0) * 0.55, x = cx + 4, y = cy;
  circ(c, x - 6 + W * 0.6, y - 5, 7, '#3f8f46'); circ(c, x + 5 + W * 0.6, y - 4, 6.5, '#357d3c'); circ(c, x + W, y - 9, 6.5, '#4aa152');
  for (let k = 0; k < 5; k++) circ(c, x - 8 + hash(i, 90 + k) * 16 + W * 0.8, y - 12 + hash(i, 95 + k) * 10, 1.9, '#e5484d');
}
function drawGame(c, cx, cy) {
  const x = cx + 10, y = cy + 6;
  c.strokeStyle = '#5e3b1c'; c.lineWidth = 1.8;
  for (const lx of [-5, -2, 3, 6]) { c.beginPath(); c.moveTo(x + lx, y - 2); c.lineTo(x + lx, y + 5); c.stroke(); }
  ell(c, x, y - 4, 8, 4.4, '#9a6532'); circ(c, x + 8, y - 9, 3.4, '#9a6532');
  c.beginPath(); c.moveTo(x + 8, y - 12); c.lineTo(x + 6, y - 18); c.moveTo(x + 9, y - 12); c.lineTo(x + 12, y - 18); c.stroke();
}
function drawFish(c, cx, cy, i, now) {
  const t = (now || 0) * 0.001;
  for (let k = 0; k < 2; k++) {
    const sp = 0.32 + hash(i, 40 + k) * 0.22, ph = t * sp * 1.6 + hash(i, 44 + k) * 6.283;
    const x = cx + Math.cos(ph) * 17, y = cy - 5 + hash(i, 47 + k) * 9 + Math.sin(ph * 2) * 3.2;
    const dir = Math.sin(ph) > 0 ? -1 : 1, sc = 0.78 + hash(i, 52 + k) * 0.35;
    const wig = Math.sin(t * 7 + k * 2.3) * 3.4;
    c.save(); c.translate(x, y); c.scale(dir * sc, sc);
    ell(c, 0, 0, 7.5, 3.4, 'rgba(232,248,255,0.92)');
    tri(c, -6.5, 0, -12, -3.6 + wig, -12, 3.6 + wig, 'rgba(210,238,255,0.9)');
    tri(c, 0, -2.6, 3, -6.4, -3, -3.2, 'rgba(255,255,255,0.55)');
    circ(c, 4.2, -0.6, 0.95, '#12406f');
    c.restore();
    c.globalAlpha = 0.12 + 0.1 * Math.sin(t * 3 + k);
    c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y + 1, 11, 4.5, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
  }
}
function drawWaves(c, cx, cy, i, ocean, now) {
  const t = (now || 0) * 0.001;
  c.lineWidth = 1.5; c.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const ph = t * (0.55 + k * 0.13) + hash(i, 30 + k) * 6.283;
    const x = cx - 4 + Math.sin(ph) * 15, y = cy - 11 + hash(i, 33 + k) * 22 + Math.sin(ph * 1.7) * 1.6;
    const f = 0.5 + 0.5 * Math.sin(ph * 1.3), a = (ocean ? 0.1 : 0.2) * (0.35 + 0.65 * f);
    c.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
    c.beginPath(); c.moveTo(x - 7, y); c.quadraticCurveTo(x - 3.5, y - 3, x, y); c.quadraticCurveTo(x + 3.5, y - 3, x + 7, y); c.stroke();
  }
  if (!ocean) {
    const gl = 0.05 + 0.05 * Math.sin(t * 0.8 + i * 0.6);
    c.globalAlpha = gl; diamond(c, cx + Math.sin(t * 0.4 + i) * 6, cy, 0.42); c.fillStyle = '#ffffff'; c.fill(); c.globalAlpha = 1;
  }
}
function drawBox(c, x, y, w, h, fl, fr, roof, roofH) {
  poly(c, [[x - w, y - w * 0.5], [x, y], [x, y - h], [x - w, y - w * 0.5 - h]], fl);
  poly(c, [[x, y], [x + w, y - w * 0.5], [x + w, y - w * 0.5 - h], [x, y - h]], fr);
  if (roof) {
    const ax = x, ay = y - h - w * 0.5 - roofH;
    tri(c, x - w, y - w * 0.5 - h, x, y - h, ax, ay, roof); tri(c, x, y - h, x + w, y - w * 0.5 - h, ax, ay, sh(roof, -0.28));
  } else poly(c, [[x - w, y - w * 0.5 - h], [x, y - h], [x + w, y - w * 0.5 - h], [x, y - w - h]], sh(fl, 0.15));
}
function drawSite(c, cx, cy, i, t) {
  const type = t.site.type;
  if (type === 'lumber') {
    drawBox(c, cx + 9, cy + 8, 9, 7, '#a0703f', '#7a5230', '#6b4a2b', 6);
    for (const [ox, oy] of [[-10, 12], [-4, 14], [-7, 9]]) { circ(c, cx + ox, cy + oy, 3, '#8a5a2b'); circ(c, cx + ox, cy + oy, 1.6, '#d9a066'); }
  } else if (type === 'mine') {
    poly(c, [[cx + 2, cy + 12], [cx + 2, cy + 1], [cx + 8, cy - 4], [cx + 14, cy + 1], [cx + 14, cy + 9]], '#2a1d14');
    c.strokeStyle = '#8a6236'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(cx + 1, cy + 13); c.lineTo(cx + 1, cy + 1); c.lineTo(cx + 8, cy - 5); c.lineTo(cx + 15, cy + 1); c.lineTo(cx + 15, cy + 10); c.stroke();
    drawBox(c, cx + 22, cy + 13, 5, 4, '#6d5a4a', '#554536', null, 0); circ(c, cx + 21, cy + 7, 2.4, '#ffd54a'); circ(c, cx + 24, cy + 8, 2, '#f5c02e');
  } else if (type === 'fishery') {
    c.fillStyle = '#a4743f';
    poly(c, [[cx - 22, cy + 2], [cx + 4, cy - 11], [cx + 12, cy - 7], [cx - 14, cy + 6]], '#b98450');
    c.strokeStyle = '#7a5230'; c.lineWidth = 1; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(cx - 20 + k * 6, cy + 1 - k * 3); c.lineTo(cx - 12 + k * 6, cy + 5 - k * 3); c.stroke(); }
    drawBox(c, cx - 2, cy - 1, 4, 4, '#c08a4a', '#96683a', null, 0); drawBox(c, cx + 5, cy - 5, 3.5, 3.5, '#c08a4a', '#96683a', null, 0);
  } else if (type === 'windmill') {
    drawBox(c, cx, cy + 10, 8, 20, '#efe7d8', '#cfc4b0', '#b5532e', 8);
    c.strokeStyle = '#5a4630'; c.lineWidth = 1.5;
    const hx = cx + 3, hy = cy - 12;
    for (let a = 0; a < 4; a++) { const ang = a * Math.PI / 2 + 0.4; poly(c, [[hx, hy], [hx + Math.cos(ang) * 17, hy + Math.sin(ang) * 17], [hx + Math.cos(ang + 0.22) * 17, hy + Math.sin(ang + 0.22) * 17]], '#fbf6ea'); }
    circ(c, hx, hy, 2, '#5a4630');
  } else if (type === 'sawmill') {
    drawBox(c, cx + 2, cy + 10, 13, 9, '#b07b45', '#8a5d31', '#7a4d2a', 5);
    circ(c, cx - 13, cy + 2, 7, '#cfd8dc'); circ(c, cx - 13, cy + 2, 2, '#607d8b');
    c.strokeStyle = '#90a4ae'; c.lineWidth = 1; c.beginPath(); c.arc(cx - 13, cy + 2, 7, 0, Math.PI * 2); c.stroke();
  } else if (type === 'smelter') {
    drawBox(c, cx, cy + 10, 12, 10, '#9a9a9a', '#747474', null, 0);
    drawBox(c, cx + 6, cy + 2, 3.5, 16, '#8a8a8a', '#666', null, 0);
    circ(c, cx - 5, cy + 5, 3.5, '#ff8a3d'); circ(c, cx - 5, cy + 5, 1.8, '#ffd54a');
    circ(c, cx + 7, cy - 18, 4, 'rgba(220,220,220,0.7)'); circ(c, cx + 10, cy - 24, 5, 'rgba(220,220,220,0.5)');
  }
  if (SITES[type]) {
    for (let k = 0; k < 3; k++) {
      const px = cx - 9 + k * 9, py = cy + 17;
      circ(c, px, py, 3.6, 'rgba(10,14,30,0.7)');
      circ(c, px, py, 2.6, k < t.site.lvl ? '#ffd54a' : 'rgba(255,255,255,0.18)');
    }
  }
}
function drawRuin(c, cx, cy) {
  drawBox(c, cx - 10, cy + 6, 7, 6, '#a3a3a3', '#7f7f7f', null, 0);
  drawBox(c, cx + 8, cy + 2, 4, 20, '#b8b8b8', '#8f8f8f', null, 0);
  drawBox(c, cx + 2, cy + 12, 5, 4, '#9a9a9a', '#777', null, 0);
  circ(c, cx - 2, cy - 6, 3, 'rgba(180,140,255,0.55)');
}
const CITY_SLOTS = [[0, -10], [-14, -3], [14, -3], [-20, 7], [20, 7], [-7, 11], [8, 12], [0, 2]];
function drawCity(c, cx, cy, city) {
  if (city.owner < 0) {
    for (const [ox, oy] of [[-10, -2], [10, -4], [0, 8]]) {
      const x = cx + ox, y = cy + oy;
      drawBox(c, x, y, 7, 6, '#8a6a4a', '#6e533a', '#c9a15a', 9);
    }
    circ(c, cx - 1, cy + 1, 2.6, '#ff9d3d'); circ(c, cx - 1, cy, 1.4, '#ffe08a');
    return;
  }
  const col = tribeColor(city.owner), dark = tribeDark(city.owner);
  const roof = isLightTribe(city.owner) ? '#dfe8f0' : col;
  diamond(c, cx, cy, 0.72); c.fillStyle = 'rgba(236,226,205,0.55)'; c.fill();
  const n = Math.min(3 + city.level, 8);
  const slots = CITY_SLOTS.slice(0, n).sort((a, b) => a[1] - b[1]);
  const wall = '#ece4d6', wallD = '#c9bda8';
  for (const [ox, oy] of slots) {
    if (city.capital && ox === 0 && oy === -10) continue;
    drawBox(c, cx + ox, cy + oy + 6, 7, 7 + (city.level > 3 ? 3 : 0), wall, wallD, roof, 7);
  }
  if (city.capital) {
    drawBox(c, cx, cy - 2, 9, 28, '#f3ecdf', '#d2c6b2', roof, 12);
    const fx = cx, fy = cy - 58;
    c.strokeStyle = '#4a3b2a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(fx, fy + 12); c.lineTo(fx, fy - 10); c.stroke();
    poly(c, [[fx, fy - 10], [fx + 14, fy - 6], [fx, fy - 2]], col);
    c.strokeStyle = dark; c.lineWidth = 1; c.stroke();
  } else {
    const fx = cx + 14, fy = cy - 22;
    c.strokeStyle = '#4a3b2a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(fx, fy + 16); c.lineTo(fx, fy - 6); c.stroke();
    poly(c, [[fx, fy - 6], [fx + 11, fy - 3], [fx, fy]], col);
  }
  if (city.walls) {
    const P = diamondPts(cx, cy, 0.86);
    c.lineCap = 'round';
    for (const [a, b] of [[1, 2], [2, 3]]) {
      c.strokeStyle = '#6f6a62'; c.lineWidth = 7; c.beginPath(); c.moveTo(P[a][0], P[a][1] + 2); c.lineTo(P[b][0], P[b][1] + 2); c.stroke();
      c.strokeStyle = '#bfb8aa'; c.lineWidth = 5; c.beginPath(); c.moveTo(P[a][0], P[a][1] - 1); c.lineTo(P[b][0], P[b][1] - 1); c.stroke();
    }
    for (const p of P) { drawBox(c, p[0], p[1] + 4, 4, 9, '#cfc8ba', '#a39c8f', null, 0); }
  }
}
function drawCloud(c, x, y, i) {
  const cx = isoX(x, y), cy = isoY(x, y) - 2;
  /* solid base first: the fog is a cloud floor, never a window onto the void */
  diamond(c, cx, cy + 8, 1.03); c.fillStyle = '#5c6987'; c.fill();
  diamond(c, cx, cy + 2, 1.03); c.fillStyle = '#8e9cba'; c.fill();
  const blobs = [[-16, 2, 15], [12, 0, 16], [0, -8, 17], [-2, 8, 13]];
  for (const [ox, oy, r] of blobs) circ(c, cx + ox + (hash(i, ox + 7) - 0.5) * 6, cy + oy + 5, r, '#75849f');
  for (const [ox, oy, r] of blobs) circ(c, cx + ox + (hash(i, ox + 7) - 0.5) * 6, cy + oy, r, hash(i, oy + 3) < 0.5 ? '#b9c6dc' : '#c6d1e4');
  for (const [ox, oy, r] of blobs) if (hash(i, ox + oy) > 0.45) circ(c, cx + ox - r * 0.3 + (hash(i, ox + 7) - 0.5) * 6, cy + oy - r * 0.35, r * 0.42, 'rgba(255,255,255,0.5)');
}
function drawObjects(c, x, y, i, t) {
  const cx = isoX(x, y), cy = isoY(x, y) - ELEV[t.t], B = BIOMES[t.biome];
  if (t.city >= 0) { drawCity(c, cx, cy, G.cities[t.city]); return; }
  if (t.t === 'mountain') { drawMountain(c, cx, cy, i, B); if (t.res === 'ore') drawNuggets(c, cx, cy); }
  /* tiles with a building keep their scenery frozen in the cached layer, so
     the building is never painted over by the live pass */
  if (t.site) { drawDecor(c, cx, cy, i, t, B, 0, 0); drawSite(c, cx, cy, i, t); }
  if (t.ruin) drawRuin(c, cx, cy);
}
function drawDecor(c, cx, cy, i, t, B, w, now) {
  if (t.t === 'forest') { drawForest(c, cx, cy, i, B, t.site && t.site.type === 'lumber', w); if (t.res === 'game') drawGame(c, cx, cy); }
  else if (t.t === 'mountain') { /* mountains are static, drawn into the cache */ }
  else if (t.t === 'field') { if (!t.site) { drawGrass(c, cx, cy, i, B, w); if (t.res === 'crop') drawCrop(c, cx, cy, i, w); if (t.res === 'fruit') drawBerries(c, cx, cy, i, w); } }
  else { drawWaves(c, cx, cy, i, t.t === 'ocean', now); if (t.res === 'fish') drawFish(c, cx, cy, i, now); }
}
/* ---------- live layer: wind, waves, fish and fog puffs ----------
   Everything that moves is left out of the cached terrain and painted
   here every frame, for the tiles actually on screen. */
const FOG_FX = [];
function windAt(i, now) { return Math.sin(now * 0.0012 + i * 0.7) * 1.5 + Math.sin(now * 0.00045 + i * 0.23) * 1.1; }
function fogPoof(i) {
  FOG_FX.push({ x: tx(i), y: ty(i), t0: performance.now() });
  if (FOG_FX.length > 12) FOG_FX.shift();
  if (typeof sfx === 'function') sfx('poof');
}
function drawTerrainAnim(c, now) {
  const hw = VW / 2 / cam.z + 90, hh = VH / 2 / cam.z + 110;
  const x0 = cam.x - hw, x1 = cam.x + hw, y0 = cam.y - hh, y1 = cam.y + hh;
  forEachDepth((x, y, i, t) => {
    if (t.site || t.city >= 0 || t.t === 'mountain' || !viewExplored(i)) return;
    const cx = isoX(x, y); if (cx < x0 || cx > x1) return;
    const cy = isoY(x, y) - ELEV[t.t]; if (cy < y0 || cy > y1) return;
    drawDecor(c, cx, cy, i, t, BIOMES[t.biome], windAt(i, now), now);
  });
  for (let k = FOG_FX.length - 1; k >= 0; k--) {
    const f = FOG_FX[k], age = (now - f.t0) / 1000;
    if (age > 1.1) { FOG_FX.splice(k, 1); continue; }
    const cx = isoX(f.x, f.y), cy = isoY(f.x, f.y) - 2, e = age / 1.1;
    c.globalAlpha = (1 - e) * 0.9;
    for (let b = 0; b < 7; b++) {
      const a = b / 7 * Math.PI * 2 + f.t0 * 0.001, d = 6 + e * 34;
      circ(c, cx + Math.cos(a) * d * 1.9, cy + Math.sin(a) * d * 0.95 + e * -6, 9 * (1 - e * 0.55), b % 2 ? '#dfe7f6' : '#c3cfe6');
    }
    c.globalAlpha = (1 - e) * 0.55; c.lineWidth = 3 * (1 - e) + 0.5; c.strokeStyle = '#ffffff';
    c.beginPath(); c.ellipse(cx, cy, 20 + e * 52, (20 + e * 52) * 0.5, 0, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
  }
}
function drawTerrain(c) {
  forEachDepth((x, y, i, t) => { if (viewExplored(i)) drawSlab(c, x, y, i, t); });
  forEachDepth((x, y, i, t) => { if (viewExplored(i)) drawFlat(c, x, y, i, t); });
  forEachDepth((x, y, i, t) => { if (viewExplored(i)) drawObjects(c, x, y, i, t); else drawCloud(c, x, y, i); });
}
function buildCache() {
  const b = worldBounds(); cacheB = b;
  const want = Math.min(2.4, cam.z * DPR);
  const maxS = Math.sqrt(11e6 / ((b.maxX - b.minX) * (b.maxY - b.minY)));
  const S = Math.max(0.35, Math.min(want, maxS));
  const w = Math.ceil((b.maxX - b.minX) * S), h = Math.ceil((b.maxY - b.minY) * S);
  if (!terrainCache) terrainCache = document.createElement('canvas');
  if (terrainCache.width !== w || terrainCache.height !== h) { terrainCache.width = w; terrainCache.height = h; }
  const c = terrainCache.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
  c.setTransform(S, 0, 0, S, -b.minX * S, -b.minY * S);
  drawTerrain(c);
  cacheScale = S; cacheDirty = false;
}
function invalidateTerrain() { cacheDirty = true; }

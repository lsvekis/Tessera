/* =====================================================================
   Part 12: tech tree — square tiles on a zoomable board, spring-drag,
   unlock animations, and a shared screen-space particle layer
   ===================================================================== */
const BRANCH_COLORS = ['#f5a524', '#3ecf8e', '#b69cff', '#38bdf8', '#fb7185'];
const TIER_NUM = ['', 'I', 'II', 'III'];
const TT = { W: 1400, H: 1400, x: 0, y: 0, z: 0, pos: null, off: {}, vel: {}, drag: null, pan: null, pts: new Map(), pinch: null, raf: 0, last: 0, lines: [], suppress: false };

/* ---------- screen-space particles (tech unlocks, armory upgrades) ---------- */
const FXP = { list: [], raf: 0, last: 0 };
function fxBurst(x, y, o) {
  o = o || {};
  const cols = o.colors || ['#ffd54a', '#ffffff'];
  const n = o.count || 36;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, sp = (o.speed || 420) * (0.3 + Math.random() * 0.85);
    FXP.list.push({ kind: Math.random() < 0.72 ? 'sq' : 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.lift || 170),
      g: o.gravity === undefined ? 720 : o.gravity, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, s: 4 + Math.random() * 7,
      c: cols[k % cols.length], life: 0, max: 0.7 + Math.random() * 0.7 });
  }
  for (let r = 0; r < (o.rings || 0); r++) FXP.list.push({ kind: 'ring', x, y, life: -r * 0.12, max: 0.65, s: o.ringSize || 64, c: o.ringColor || '#ffffff', rot: r % 2 ? Math.PI / 4 : 0 });
  if (!FXP.raf) { FXP.last = 0; FXP.raf = requestAnimationFrame(fxLoop); }
}
function fxLoop(now) {
  const cv = document.getElementById('fxLayer'); if (!cv) { FXP.raf = 0; return; }
  const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const dt = FXP.last ? Math.min(0.05, (now - FXP.last) / 1000) : 1 / 60; FXP.last = now;
  for (let k = FXP.list.length - 1; k >= 0; k--) {
    const p = FXP.list[k];
    p.life += dt;
    if (p.life > p.max) { FXP.list.splice(k, 1); continue; }
    if (p.life < 0) continue;
    const f = p.life / p.max;
    if (p.kind === 'ring') {
      const s = p.s * (0.4 + f * 2.4);
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = (1 - f) * 0.9;
      c.strokeStyle = p.c; c.lineWidth = 5 * (1 - f) + 1; c.strokeRect(-s / 2, -s / 2, s, s); c.restore();
      continue;
    }
    p.vy += p.g * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    c.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1;
    if (p.kind === 'sq') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); c.restore(); }
    else { circ(c, p.x, p.y, p.s * 0.9, rgba(p.c, 0.25)); circ(c, p.x, p.y, p.s * 0.35, p.c); }
  }
  c.globalAlpha = 1;
  if (FXP.list.length) FXP.raf = requestAnimationFrame(fxLoop);
  else { c.clearRect(0, 0, W, H); FXP.raf = 0; }
}

/* ---------- layout ---------- */
function ttPositions() {
  const P = {}, C = 700;
  BRANCH_ROOTS.forEach((root, b) => {
    const a = (-90 + b * 72) * Math.PI / 180;
    P[root] = [C + Math.cos(a) * 190, C + Math.sin(a) * 190];
    Object.keys(TECHS).filter(k => TECHS[k].parent === root).forEach((k, j) => {
      const s = j === 0 ? -1 : 1, a2 = a + s * 17 * Math.PI / 180, a3 = a + s * 19 * Math.PI / 180;
      P[k] = [C + Math.cos(a2) * 372, C + Math.sin(a2) * 372];
      Object.keys(TECHS).filter(q => TECHS[q].parent === k).forEach(q => { P[q] = [C + Math.cos(a3) * 556, C + Math.sin(a3) * 556]; });
    });
  });
  return P;
}
function techStateCls(k) {
  const ti = G.human, st = techState(ti, k);
  if (st === 'done') return 'done';
  if (st === 'available') return 'avail' + (canAfford(ti, techCost(ti, k)) ? ' afford' : '');
  return 'locked';
}
const LOCK_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
function tileInner(k) {
  const st = techState(G.human, k), cost = techCost(G.human, k);
  const badge = st === 'done' ? '<span class="badge">✓</span>' : st === 'locked' ? `<span class="badge">${LOCK_SVG}</span>` : '';
  return `<span class="tier">${TIER_NUM[TECHS[k].tier]}</span>${badge}<span class="ico">${techIcon(k)}</span><span class="nm">${TECHS[k].name}</span>
    <span class="pr">${st === 'done' ? 'Learned' : `${ICON.gold}${cost.gold}`}</span>`;
}
function techHTML() {
  TT.pos = ttPositions();
  const ti = G.human, tr = G.tribes[ti];
  if (!UIState.techSel || !TECHS[UIState.techSel]) UIState.techSel = Object.keys(TECHS).find(k => techState(ti, k) === 'available') || 'riding';
  let lines = '';
  for (const k in TECHS) {
    const p = TECHS[k].parent, a = p ? TT.pos[p] : [700, 700], b = TT.pos[k], col = BRANCH_COLORS[TECHS[k].branch];
    lines += `<g data-ln="${k}" style="--bc:${col}"><line class="ln ln-base" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><line class="ln ln-state" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><line class="ln ln-charge" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/></g>`;
  }
  let tiles = '';
  for (const k in TECHS) {
    const [x, y] = TT.pos[k];
    tiles += `<button class="tile ${techStateCls(k)} ${k === UIState.techSel ? 'cur' : ''}" type="button" data-tile="${k}" style="left:${x}px;top:${y}px;--bc:${BRANCH_COLORS[TECHS[k].branch]}" aria-label="${TECHS[k].name}"><span class="tile-body"><span class="tile-face">${tileInner(k)}</span></span></button>`;
  }
  return `<h2>Technology</h2><p class="lead">Spend gold to unlock new units, buildings and bonuses. Each branch grows outward from your tribe.</p>
    <div class="tt2"><div class="tt2-stage" id="ttStage"><div class="tt2-shake" id="ttShake"><div class="tt2-world" id="ttWorld">
      <svg width="1400" height="1400" viewBox="0 0 1400 1400" aria-hidden="true">${lines}</svg>
      <div class="tt2-halo" aria-hidden="true"></div>
      <div class="tt2-core" style="--tc:${tr.color}"><img src="${tribePortrait(tr.key)}" alt=""></div>${tiles}
    </div></div>
    <div class="tt2-banner" id="ttBanner" aria-live="polite"></div>
    <div class="tt2-hint">Scroll or pinch to zoom · drag to pan · hold a tile to tug it</div>
    <div class="tt2-tools"><button type="button" data-zoom="out" aria-label="Zoom out">−</button><button type="button" class="zl" data-zoom="fit" aria-label="Fit the whole tree">Fit</button><button type="button" data-zoom="in" aria-label="Zoom in">+</button></div>
    </div><div class="tt-side" id="ttSide">${ttSideHTML(UIState.techSel)}</div></div>`;
}
function ttSideHTML(sel) {
  const ti = G.human, tr = G.tribes[ti], T = TECHS[sel], st = techState(ti, sel), cost = techCost(ti, sel);
  const ok = st === 'available' && canAfford(ti, cost) && isHumanTurn();
  const why = st === 'done' ? '' : st === 'locked' ? `Research ${TECHS[T.parent].name} first` : !isHumanTurn() ? 'Wait for your turn' : !canAfford(ti, cost) ? 'Need ' + missingStr(ti, cost) : '';
  const kids = Object.keys(TECHS).filter(q => TECHS[q].parent === sel).map(q => TECHS[q].name).join(' · ');
  return `<div style="display:flex;gap:10px;align-items:center"><div class="ticon sq" style="--bc:${BRANCH_COLORS[T.branch]}">${techIcon(sel)}</div><div><h3>${T.name}</h3><div class="note">Tier ${TIER_NUM[T.tier]} · ${st === 'done' ? 'Researched' : st === 'available' ? 'Available' : 'Locked'}</div></div></div>
    <p style="margin:0;color:#dfe6ff">${T.text}</p>
    ${T.unit ? `<div class="vs"><div class="row"><span class="k">Unit</span>${typeChip(T.unit)}</div>${strongList(T.unit).length ? `<div class="row"><span class="k tag-strong">Strong vs</span>${strongList(T.unit).map(q => typeChip(q, 'good')).join('')}</div>` : ''}</div>` : ''}
    <div class="kv"><dt>Cost</dt><dd>${st === 'done' ? '—' : costHTML(cost, ti)}</dd>${kids ? `<dt>Leads to</dt><dd>${kids}</dd>` : ''}<dt>Progress</dt><dd>${Object.keys(tr.techs).length} / 25 technologies</dd></div>
    ${st !== 'done' ? `<button class="btn primary" data-act="research" data-key="${sel}" ${ok ? '' : 'disabled'}>Research ${T.name}</button>${why ? `<p class="note warn">${why}</p>` : ''}` : '<p class="note" style="color:var(--good)">Researched ✓</p>'}
    <p class="note">Tech costs rise with the number of cities you own${tribeKey(ti) === 'umbral' ? ' (Scholars: −25%)' : ''}${hasTech(ti, 'philosophy') ? ' (Philosophy: −25%)' : ''}.</p>
    <div class="tt-legend"><span><i class="lg done"></i>Researched</span><span><i class="lg afford"></i>Affordable</span><span><i class="lg avail"></i>Available</span><span><i class="lg locked"></i>Locked</span></div>`;
}

/* ---------- view (zoom & pan) ---------- */
function ttApply() {
  const w = document.getElementById('ttWorld'); if (!w) return;
  w.style.transform = `translate(${TT.x}px,${TT.y}px) scale(${TT.z})`;
  const zl = document.querySelector('.tt2-tools .zl'); if (zl) zl.textContent = Math.round(TT.z * 100) + '%';
}
function ttClamp() {
  const st = document.getElementById('ttStage'); if (!st) return;
  const sw = st.clientWidth, sh = st.clientHeight, w = TT.W * TT.z, h = TT.H * TT.z;
  TT.x = Math.min(sw * 0.6, Math.max(sw * 0.4 - w, TT.x));
  TT.y = Math.min(sh * 0.6, Math.max(sh * 0.4 - h, TT.y));
}
/* the tiles span roughly 80..1320 of the 1400px board */
function ttFitZ() {
  const st = document.getElementById('ttStage'); if (!st) return 0.4;
  return Math.max(0.16, Math.min(1, Math.min(st.clientWidth / 1270, st.clientHeight / 1270)));
}
function ttFit() {
  const st = document.getElementById('ttStage'); if (!st) return;
  const sw = st.clientWidth, sh = st.clientHeight;
  TT.z = ttFitZ();
  TT.x = sw / 2 - 700 * TT.z; TT.y = sh / 2 - 700 * TT.z;
  ttApply();
}
function ttZoomAt(sx, sy, f) {
  const nz = Math.max(Math.min(0.3, ttFitZ() * 0.85), Math.min(2.4, TT.z * f));
  const wx = (sx - TT.x) / TT.z, wy = (sy - TT.y) / TT.z;
  TT.z = nz; TT.x = sx - wx * nz; TT.y = sy - wy * nz;
  ttClamp(); ttApply();
}
function ttCenterOn(k) {
  const st = document.getElementById('ttStage'); if (!st) return;
  const [x, y] = TT.pos[k];
  TT.x = st.clientWidth / 2 - x * TT.z; TT.y = st.clientHeight / 2 - y * TT.z; ttClamp(); ttApply();
}
function layoutTech() {
  const st = document.getElementById('ttStage'); if (!st) return;
  TT.off = {}; TT.vel = {}; TT.drag = null; TT.pan = null; TT.pts.clear();
  TT.lines = [...st.querySelectorAll('[data-ln]')].map(g => ({ key: g.dataset.ln, parent: TECHS[g.dataset.ln].parent, els: [...g.querySelectorAll('line')] }));
  if (!TT.z || !TT.seen) { ttFit(); TT.seen = true; } else { ttClamp(); ttApply(); }
  ttBindStage(st);
}
function techMount() { layoutTech(); }
window.addEventListener('resize', () => { if (UIState.overlay === 'tech') { ttClamp(); ttApply(); } });

/* ---------- lines follow tiles ---------- */
function ttOffset(k) { return TT.off[k] || [0, 0]; }
function ttUpdateLines() {
  for (const L of TT.lines) {
    const a = L.parent ? TT.pos[L.parent] : [700, 700], b = TT.pos[L.key];
    const oa = L.parent ? ttOffset(L.parent) : [0, 0], ob = ttOffset(L.key);
    for (const el of L.els) { el.setAttribute('x1', a[0] + oa[0]); el.setAttribute('y1', a[1] + oa[1]); el.setAttribute('x2', b[0] + ob[0]); el.setAttribute('y2', b[1] + ob[1]); }
  }
}
function ttTileBody(k) { return document.querySelector(`#ttWorld [data-tile="${k}"] .tile-body`); }
function ttPaint(k) {
  const b = ttTileBody(k); if (!b) return;
  const [ox, oy] = ttOffset(k), held = TT.drag && TT.drag.key === k && TT.drag.moved;
  b.style.transform = (ox || oy || held) ? `translate(${ox}px,${oy}px) rotate(${ox * 0.35}deg) scale(${held ? 1.1 : 1})` : '';
}
/* rubber-band: follows the pointer but never strays more than ~40px */
function ttRubber(dx, dy) {
  const len = Math.hypot(dx, dy); if (!len) return [0, 0];
  const R = 40, r = R * (1 - Math.exp(-len / R));
  return [dx / len * r, dy / len * r];
}
function ttSpring(now) {
  const dt = TT.last ? Math.min(0.033, (now - TT.last) / 1000) : 1 / 60; TT.last = now;
  let active = false;
  for (const k of Object.keys(TT.off)) {
    if (TT.drag && TT.drag.key === k) { active = true; continue; }
    const o = TT.off[k], v = TT.vel[k] || (TT.vel[k] = [0, 0]);
    for (let a = 0; a < 2; a++) { const acc = -300 * o[a] - 11 * v[a]; v[a] += acc * dt; o[a] += v[a] * dt; }
    if (Math.abs(o[0]) + Math.abs(o[1]) < 0.15 && Math.abs(v[0]) + Math.abs(v[1]) < 2) { delete TT.off[k]; delete TT.vel[k]; ttPaint(k); continue; }
    active = true; ttPaint(k);
  }
  ttUpdateLines();
  TT.raf = active ? requestAnimationFrame(ttSpring) : 0;
  if (!active) TT.last = 0;
}
function ttKick() { if (!TT.raf) { TT.last = 0; TT.raf = requestAnimationFrame(ttSpring); } }

/* ---------- pointer handling ---------- */
function ttBindStage(st) {
  const local = (e) => { const r = st.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  st.addEventListener('dragstart', (e) => e.preventDefault());
  st.addEventListener('wheel', (e) => { e.preventDefault(); const [sx, sy] = local(e); ttZoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  st.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.tt2-tools')) return;
    const p = local(e);
    TT.pts.set(e.pointerId, p);
    TT.suppress = false;
    if (TT.pts.size === 2) {
      TT.drag = null; TT.pan = null;
      const [a, b] = [...TT.pts.values()];
      TT.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: TT.z };
      return;
    }
    const tileEl = e.target.closest('[data-tile]');
    if (tileEl) TT.drag = { key: tileEl.dataset.tile, sx: p[0], sy: p[1], moved: false };
    else TT.pan = { sx: p[0], sy: p[1], x0: TT.x, y0: TT.y, moved: false };
  });
  const grab = (id) => { try { st.setPointerCapture(id); } catch (err) { /* ignore */ } };
  st.addEventListener('pointermove', (e) => {
    if (!TT.pts.has(e.pointerId)) return;
    const p = local(e); TT.pts.set(e.pointerId, p);
    if (TT.pinch && TT.pts.size === 2) {
      const [a, b] = [...TT.pts.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      ttZoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (TT.pinch.z * d / TT.pinch.d) / TT.z);
      return;
    }
    if (TT.drag) {
      const dx = p[0] - TT.drag.sx, dy = p[1] - TT.drag.sy;
      if (!TT.drag.moved && Math.hypot(dx, dy) > 5) { TT.drag.moved = true; grab(e.pointerId); sfx('grab'); ttTileBody(TT.drag.key).parentElement.classList.add('held'); }
      if (TT.drag.moved) { TT.off[TT.drag.key] = ttRubber(dx / TT.z, dy / TT.z); TT.vel[TT.drag.key] = [0, 0]; ttPaint(TT.drag.key); ttUpdateLines(); ttKick(); }
    } else if (TT.pan) {
      if (!TT.pan.moved && Math.hypot(p[0] - TT.pan.sx, p[1] - TT.pan.sy) > 3) { TT.pan.moved = true; grab(e.pointerId); st.classList.add('panning'); }
      if (TT.pan.moved) { TT.x = TT.pan.x0 + p[0] - TT.pan.sx; TT.y = TT.pan.y0 + p[1] - TT.pan.sy; ttClamp(); ttApply(); }
    }
  });
  const end = (e) => {
    TT.pts.delete(e.pointerId);
    if (TT.pts.size < 2) TT.pinch = null;
    st.classList.remove('panning');
    if (TT.drag) {
      const k = TT.drag.key, moved = TT.drag.moved;
      const tileEl = document.querySelector(`#ttWorld [data-tile="${k}"]`); if (tileEl) tileEl.classList.remove('held');
      TT.drag = null;
      if (moved) { TT.suppress = true; sfx('release'); ttPaint(k); ttKick(); }
    }
    TT.pan = null;
  };
  st.addEventListener('pointerup', end);
  st.addEventListener('pointercancel', end);
  st.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zoom]');
    if (z) { const r = st.getBoundingClientRect(); if (z.dataset.zoom === 'fit') ttFit(); else ttZoomAt(r.width / 2, r.height / 2, z.dataset.zoom === 'in' ? 1.25 : 0.8); return; }
    const t = e.target.closest('[data-tile]');
    if (!t) return;
    if (TT.suppress) { TT.suppress = false; return; }
    ttSelect(t.dataset.tile);
  });
}

/* ---------- selection, refresh, unlock ---------- */
function ttSelect(k) {
  UIState.techSel = k;
  document.querySelectorAll('#ttWorld .tile').forEach(t => t.classList.toggle('cur', t.dataset.tile === k));
  const side = document.getElementById('ttSide'); if (side) side.innerHTML = ttSideHTML(k);
}
function refreshTechTree() {
  const w = document.getElementById('ttWorld'); if (!w) return;
  for (const k in TECHS) {
    const t = w.querySelector(`[data-tile="${k}"]`); if (!t) continue;
    const keep = ['tile', 'cur', 'unlocking', 'wake', 'held'].filter(c => t.classList.contains(c));
    t.className = keep.concat(techStateCls(k).split(' ')).join(' ');
    t.querySelector('.tile-face').innerHTML = tileInner(k);
    const g = w.querySelector(`[data-ln="${k}"] .ln-state`);
    if (g) { const st = techState(G.human, k); g.setAttribute('class', 'ln ln-state ' + (st === 'done' ? 'done' : st === 'available' ? 'avail' : '')); }
  }
  const side = document.getElementById('ttSide'); if (side) side.innerHTML = ttSideHTML(UIState.techSel);
}
function ttResearch(k) {
  const before = new Set(Object.keys(TECHS).filter(q => techState(G.human, q) === 'available'));
  UIState.ttAnim = true;
  const ok = doResearch(G.human, k);
  UIState.ttAnim = false;
  if (!ok) { sfx('bad'); return; }
  const fresh = Object.keys(TECHS).filter(q => techState(G.human, q) === 'available' && !before.has(q));
  sfx('unlock');
  const tile = document.querySelector(`#ttWorld [data-tile="${k}"]`), col = BRANCH_COLORS[TECHS[k].branch];
  const charge = document.querySelector(`#ttWorld [data-ln="${k}"] .ln-charge`);
  if (charge) {
    const len = Math.hypot(charge.x2.baseVal.value - charge.x1.baseVal.value, charge.y2.baseVal.value - charge.y1.baseVal.value);
    charge.style.strokeDasharray = len; charge.style.setProperty('--len', len);
    charge.classList.remove('go'); void charge.getBBox(); charge.classList.add('go');
  }
  if (tile) {
    tile.classList.remove('unlocking'); void tile.offsetWidth; tile.classList.add('unlocking');
    const r = tile.getBoundingClientRect();
    setTimeout(() => fxBurst(r.left + r.width / 2, r.top + r.height / 2, { colors: [col, '#ffd54a', '#6ff09a', '#ffffff'], count: 54, rings: 2, ringColor: col, ringSize: r.width * 0.9 }), 240);
    setTimeout(() => tile.classList.remove('unlocking'), 950);
  }
  const shake = document.getElementById('ttShake');
  if (shake) { shake.classList.remove('shake'); void shake.offsetWidth; shake.classList.add('shake'); }
  setTimeout(refreshTechTree, 300);
  setTimeout(() => {
    for (const q of fresh) {
      const t = document.querySelector(`#ttWorld [data-tile="${q}"]`);
      if (t) { t.classList.remove('wake'); void t.offsetWidth; t.classList.add('wake'); setTimeout(() => t.classList.remove('wake'), 700); }
    }
    if (fresh.length) sfx('toggle');
  }, 620);
  const bn = document.getElementById('ttBanner');
  if (bn) {
    bn.innerHTML = `Technology unlocked: ${TECHS[k].name}<small>${TECHS[k].text}</small>`;
    bn.style.setProperty('--bc', col);
    bn.classList.remove('show'); void bn.offsetWidth; bn.classList.add('show');
    clearTimeout(ttResearch.t); ttResearch.t = setTimeout(() => bn.classList.remove('show'), 2600);
  }
  renderTopbar();
}

/* ---------- army upgrade purchase ---------- */
function upgradeBuy(key) {
  UIState.ttAnim = true;
  const ok = doUpgrade(G.human, key);
  UIState.ttAnim = false;
  if (!ok) { sfx('bad'); return; }
  renderOverlay('upgrades'); renderTopbar();
  sfx('upgrade');
  const card = document.querySelector(`[data-card="${key}"]`);
  if (!card) return;
  card.classList.add('bought');
  const pips = card.querySelectorAll('.lvls i.on'), pip = pips[pips.length - 1];
  if (pip) pip.classList.add('new');
  const r = card.getBoundingClientRect();
  fxBurst(r.left + r.width / 2, r.top + r.height * 0.35, { colors: ['#ffd54a', '#ffae00', '#ffffff', '#ff9a57'], count: 44, rings: 1, ringColor: '#ffd54a', ringSize: Math.min(r.width, r.height) * 0.7, speed: 380 });
  setTimeout(() => card.classList.remove('bought'), 900);
}

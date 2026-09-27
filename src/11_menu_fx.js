/* =====================================================================
   Part 8: menu effects, audio unlock, custom loading screen
   ===================================================================== */
const TIPS = [
  'Spearmen deal ×1.5 damage to Riders and Knights — park them in front of your archers.',
  'Swordsmen crush every foot unit, but cavalry cuts them down (×0.5).',
  'Archers hit from 3 tiles away. Keep them behind a wall of Shieldbearers.',
  'A unit standing on a village at the start of your turn can capture it.',
  'Every building makes gold each turn and grows its city. Upgrade them with technology.',
  'Wounded units hit softer. Rest, pay to heal, or bring a Monk.',
  'Every city level adds gold, a unit slot and a reward of your choice.',
  'Forests, mountains and city walls multiply your defence.',
  'Three kills earn a free promotion that also heals the unit to full.',
  'Upgrades make your whole army stronger at once — check the Upgrades button.',
  'Win matches to earn Wins, then spend them on tribes, skins and perks in the Item Shop.',
  'Play the Weekly Challenge once a day and climb the leaderboard.',
  'Ancient ruins hide treasure, technology and lost warriors.'
];
const LOAD_STAGES = ['Shaping the continents', 'Raising the mountains', 'Growing the forests', 'Filling the seas', 'Founding villages', 'Awakening rival tribes', 'Sharpening spears'];
const SPK_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.6 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SPK_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

/* ---------- sound effects entry point ---------- */
const UI_SOUNDS = new Set(['hover', 'click', 'back', 'toggle', 'whoosh', 'tick', 'riser', 'boom', 'grab', 'release', 'unlock', 'upgrade', 'poof', 'coin', 'purchase', 'equip', 'meow', 'bad', 'select', 'level', 'reward']);
function sfx(kind) {
  if (!UIState.settings.sound) return;
  if (!UI_SOUNDS.has(kind) && (UIState.screen !== 'game' || (G && G.allAI))) return;
  SND.play(kind);
}
function tribeSound(key) { if (UIState.settings.sound) SND.tribe(key); }

/* ---------- menu ---------- */
function initMenuFX() {
  const cols = TRIBE_ORDER.map(k => TRIBES[k].color);
  let html = '';
  for (let k = 0; k < 22; k++) {
    const s = 8 + Math.random() * 18, left = Math.random() * 100, d = 10 + Math.random() * 12, dl = -Math.random() * 22;
    html += `<i class="fx-d" style="--s:${s.toFixed(1)}px;left:${left.toFixed(1)}%;--d:${d.toFixed(1)}s;--dl:${dl.toFixed(1)}s;--c:${cols[k % cols.length]}"></i>`;
  }
  $('#menuFx').innerHTML = html;
  const unlock = () => { if (SND.unlock()) setTimeout(() => { syncMusic(); updateSoundBtn(); }, 80); };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  const SEL = '.btn,.dock-btn,.tcard,.seg button,.tn,.reward,.tu,.opt-row,.res,.snd-btn,.ov-close';
  let lastEl = null;
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest(SEL);
    if (el && el !== lastEl && !el.disabled && el.getAttribute('aria-disabled') !== 'true') sfx('hover');
    lastEl = el;
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest(SEL);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (el.id === 'sndBtn') return;
    sfx(el.classList.contains('ghost') || el.classList.contains('ov-close') ? 'back' : 'click');
  });
  $('#sndBtn').addEventListener('click', () => {
    const S = UIState.settings, on = !(S.music || S.sound);
    S.music = on; S.sound = on; saveSettings();
    SND.unlock();
    setTimeout(() => { syncMusic(); updateSoundBtn(); if (on) sfx('toggle'); }, 60);
  });
  updateSoundBtn();
  setInterval(updateSoundBtn, 1500);
}
function updateSoundBtn() {
  const b = $('#sndBtn'); if (!b) return;
  b.hidden = UIState.screen === 'game';
  const wc = $('#winsChip'); if (wc) wc.hidden = UIState.screen === 'game' || UIState.screen === 'shop' || UIState.screen === 'chal';
  const S = UIState.settings, on = S.music || S.sound;
  const label = !on ? 'Sound off' : SND.ready() ? 'Sound on' : 'Tap for sound';
  if (b.dataset.l === label) return;
  b.dataset.l = label;
  b.classList.toggle('off', !on);
  b.innerHTML = `${on ? SPK_ON : SPK_OFF}<span>${label}</span>`;
  b.setAttribute('aria-label', on ? 'Mute sound and music' : 'Turn sound and music on');
  if (UIState.screen === 'setup') renderPickDetail();
}

/* ---------- loading screen ---------- */
const LD = { on: false, t0: 0, tiles: [], sparks: [], explodeAt: 0, cap: null, col: '#ffffff', skip: false, last: 0 };
function mixHex(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function ldTileColor(t) {
  const B = BIOMES[t.biome];
  if (t.t === 'ocean') return '#2a72c0';
  if (t.t === 'water') return B.water;
  if (t.t === 'forest') return B.tree[0];
  if (t.t === 'mountain') return B.mount[1];
  return B.field;
}
function ldPrepare(tribeKey) {
  const N = G.size, cap = capitalOf(G.human) || { x: (N - 1) / 2, y: (N - 1) / 2 };
  LD.cap = cap; LD.col = TRIBES[tribeKey].color; LD.tiles = [];
  const mid = (N - 1) / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = tile(x, y);
    let col = ldTileColor(t);
    if (t.owner === G.human) col = mixHex(col, LD.col, 0.45);
    const dx = (x - y), dy = (x + y - 2 * mid) * 0.5, len = Math.hypot(dx, dy) || 1, sp = 260 + Math.random() * 480;
    LD.tiles.push({ x, y, col, side: sh(col, -0.35), delay: Math.hypot(x - cap.x, y - cap.y) * 58 + Math.random() * 140,
      vx: dx / len * sp, vy: dy / len * sp - 180, rot: (Math.random() - 0.5) * 5 });
  }
}
function easeOutBack(p) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
function ldFrame(now) {
  if (!LD.on) return;
  requestAnimationFrame(ldFrame);
  const cvs = $('#ldCanvas'), c = cvs.getContext('2d');
  const W = cvs.clientWidth, H = cvs.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cvs.width !== Math.round(W * dpr) || cvs.height !== Math.round(H * dpr)) { cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr); }
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const dt = LD.last ? Math.min(0.05, (now - LD.last) / 1000) : 1 / 60; LD.last = now;
  const N = G.size, tw = Math.min(W * 0.8, H * 0.95, 620) / N, th = tw / 2;
  const cx = W / 2, top = H * 0.53 - (N * th) / 2;
  const el = now - LD.t0, wave = (el / 85) % (2 * N + 12) - 6;
  const ex = LD.explodeAt ? Math.min(1, (now - LD.explodeAt) / 750) : 0;
  const dep = Math.max(2, th * 0.4);
  for (const T of LD.tiles) {
    const t = el - T.delay; if (t < 0) continue;
    const p = Math.min(1, t / 420), e = easeOutBack(p);
    let x = cx + (T.x - T.y) * tw / 2, y = top + (T.x + T.y) * th / 2 + (1 - e) * -70;
    let a = Math.min(1, p * 1.8);
    c.save();
    if (ex > 0) { x += T.vx * ex; y += T.vy * ex + 520 * ex * ex; a *= 1 - ex; }
    if (a <= 0.01) { c.restore(); continue; }
    c.globalAlpha = a; c.translate(x, y);
    if (ex > 0) { c.rotate(T.rot * ex); c.scale(1 - 0.4 * ex, 1 - 0.4 * ex); }
    c.fillStyle = T.side; c.beginPath(); c.moveTo(-tw / 2, 0); c.lineTo(0, th / 2); c.lineTo(tw / 2, 0); c.lineTo(tw / 2, dep); c.lineTo(0, th / 2 + dep); c.lineTo(-tw / 2, dep); c.closePath(); c.fill();
    c.fillStyle = T.col; c.beginPath(); c.moveTo(0, -th / 2); c.lineTo(tw / 2, 0); c.lineTo(0, th / 2); c.lineTo(-tw / 2, 0); c.closePath(); c.fill();
    const w = Math.abs(T.x + T.y - wave);
    if (w < 2.2 && !ex) { c.fillStyle = `rgba(255,255,255,${(1 - w / 2.2) * 0.3})`; c.fill(); }
    c.restore();
  }
  if (LD.cap && !LD.explodeAt && el > 250) {
    const bx = cx + (LD.cap.x - LD.cap.y) * tw / 2, by = top + (LD.cap.x + LD.cap.y) * th / 2;
    const g = c.createLinearGradient(bx, by - 190, bx, by);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, rgba(LD.col === '#eef3f8' ? '#ffffff' : LD.col, 0.6));
    c.fillStyle = g; c.fillRect(bx - tw * 0.22, by - 190, tw * 0.44, 190);
    for (let k = 0; k < 2; k++) {
      const pulse = ((el + k * 700) % 1400) / 1400;
      c.globalAlpha = (1 - pulse) * 0.9; c.strokeStyle = LD.col; c.lineWidth = 3;
      c.beginPath(); c.ellipse(bx, by, tw * (0.5 + pulse * 2.6), th * (0.5 + pulse * 2.6), 0, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = 1;
  }
  if (LD.sparks.length < 160) for (let k = 0; k < 3; k++) LD.sparks.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 40, vy: -(50 + Math.random() * 130), life: 0, max: 2 + Math.random() * 3.5, s: 0.8 + Math.random() * 2.4, c: Math.random() < 0.5 ? LD.col : '#ffd54a' });
  for (let k = LD.sparks.length - 1; k >= 0; k--) {
    const s = LD.sparks[k]; s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx += Math.sin(now / 400 + k) * 0.6;
    if (s.life > s.max) { LD.sparks.splice(k, 1); continue; }
    c.globalAlpha = Math.sin(s.life / s.max * Math.PI) * 0.85; c.fillStyle = s.c;
    c.beginPath(); c.arc(s.x, s.y, s.s, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
}
async function runLoader(o) {
  const L = $('#loader'), T = TRIBES[o.tribe];
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quick = !!o.quick || reduced;
  UIState.loading = true; syncMusic();
  L.style.setProperty('--tc', T.color); L.style.setProperty('--tcg', rgba(T.color, 0.34));
  $('#ldCrest').innerHTML = `<img src="${tribePortrait(o.tribe)}" alt="">`;
  let li = 0;
  $('#ldTitle').innerHTML = o.title.split(' ').map(w => `<span class="w">${[...w].map(ch => `<i style="--i:${li++}">${esc(ch)}</i>`).join('')}</span>`).join(' ');
  $('#ldSub').textContent = o.sub || '';
  $('#ldTip').textContent = 'Tip: ' + TIPS[Math.floor(Math.random() * TIPS.length)];
  $('#ldFill').style.width = '0%'; $('#ldStage').textContent = '';
  L.classList.remove('out', 'done', 'in'); L.hidden = false; void L.offsetWidth; L.classList.add('in');
  ldPrepare(o.tribe);
  Object.assign(LD, { on: true, t0: performance.now(), explodeAt: 0, sparks: [], skip: false, last: 0 });
  requestAnimationFrame(ldFrame);
  sfx('riser');
  const stages = quick ? LOAD_STAGES.filter((_, k) => k % 2 === 0) : LOAD_STAGES;
  const per = (quick ? 1400 : 2900) / stages.length;
  const skip = () => { LD.skip = true; };
  L.addEventListener('pointerdown', skip);
  await sleep(quick ? 150 : 350);
  for (let k = 0; k < stages.length; k++) {
    $('#ldStage').textContent = stages[k] + '…';
    $('#ldFill').style.width = ((k + 1) / stages.length * 100).toFixed(1) + '%';
    if (k > 0) sfx('tick');
    if (k === Math.floor(stages.length / 2) && o.onReady) { const f = o.onReady; o.onReady = null; f(); }
    await sleep(LD.skip ? 50 : per);
  }
  if (o.onReady) { const f = o.onReady; o.onReady = null; f(); }
  $('#ldStage').textContent = 'Ready!';
  L.classList.add('done');
  sfx('boom');
  await sleep(LD.skip ? 120 : 480);
  LD.explodeAt = performance.now();
  L.classList.add('out');
  await sleep(780);
  L.removeEventListener('pointerdown', skip);
  LD.on = false; L.hidden = true; L.classList.remove('in', 'out', 'done');
  UIState.loading = false;
}

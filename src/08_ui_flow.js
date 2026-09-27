/* =====================================================================
   Part 6b: UI — sound, toasts, modal, effects hook, input, turn flow
   ===================================================================== */
let GEN = 0;                                   // bumps whenever the game is replaced
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- toasts, banner, modal ---------- */
function toast(text, color) {
  if (UIState.screen !== 'game') return;
  const box = $('#toasts'), d = document.createElement('div');
  d.className = 'toast plate cut'; d.style.setProperty('--tc', color || '#ffcf3f'); d.textContent = text;
  box.appendChild(d);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 420); }, 2700);
}
function showBanner(ti) {
  const b = $('#banner');
  if (ti < 0 || !G || G.allAI) { b.hidden = true; return; }
  const t = G.tribes[ti];
  b.innerHTML = `<i style="background:${t.color}"></i>${esc(t.name)} is taking their turn…`; b.hidden = false;
}
let modalCb = null;
function showModal(html) {
  UIState.modal = true; $('#modalBody').innerHTML = html; $('#modal').hidden = false;
  const f = $('#modalBody').querySelector('button'); if (f) setTimeout(() => f.focus(), 30);
}
function closeModal() { $('#modal').hidden = true; UIState.modal = false; modalCb = null; }
function confirmModal(title, text, yes, cb, no) {
  modalCb = cb;
  showModal(`<h2>${title}</h2><p>${text}</p><div class="modal-actions"><button class="btn" data-act="confirmNo">${no || 'Cancel'}</button><button class="btn primary" data-act="confirmYes">${yes}</button></div>`);
}
function checkRewards() {
  if (!G || G.allAI || UIState.modal || G.over) return;
  const c = G.cities.find(q => q.owner === G.human && q.rewards.length);
  if (!c) return;
  const lv = c.rewards[0];
  showModal(`<h2>${esc(c.name)} grew!</h2><p>Your city reached a new level. Choose one reward:</p>
    <div class="reward-grid">${CITY_REWARDS[lv].map(o => `<button class="reward" data-act="reward" data-city="${c.id}" data-id="${o.id}"><b>${o.name}</b><span>${o.desc}</span></button>`).join('')}</div>`);
  sfx('level');
}

/* ---------- effects hook (engine -> renderer/UI) ---------- */
function onRevealed() { if (G && !G.viewAll) { invalidateTerrain(); miniDirty = true; } }
function onResources() { if (UIState.screen === 'game' && G && !G.allAI) renderTopbar(); }
function onLog() { if (UIState.overlay === 'log') renderOverlay('log'); }
function onFX(type, d) {
  if (!G) return;
  const now = performance.now();
  const vis = (x, y) => viewExplored(idx(x, y));
  const mine = (ti) => ti === G.human && !G.allAI;
  switch (type) {
    case 'move': {
      const u = d.u, p0 = d.path[0];
      if (!vis(u.x, u.y) && !vis(p0[0], p0[1])) return;
      ANIM.set(u.id, { path: d.path, t0: now, dur: Math.max(150, 140 * (d.path.length - 1)) * SPEED });
      const a = d.path[d.path.length - 2], b = d.path[d.path.length - 1];
      const dir = (b[0] - a[0]) - (b[1] - a[1]); if (dir) FACE.set(u.id, dir > 0 ? 1 : -1);
      if (mine(u.owner)) sfx('move');
      break;
    }
    case 'attack': {
      if (!vis(d.dx, d.dy) && !vis(d.ax, d.ay)) return;
      if (d.ranged) { addShot(d.ax, d.ay, d.dx, d.dy, d.aType === 'catapult' ? 'boulder' : 'arrow'); sfx(d.aType === 'catapult' ? 'boulder' : 'shoot'); }
      else if (d.advanced) ANIM.set(d.a.id, { path: [[d.ax, d.ay], [d.dx, d.dy]], t0: now, dur: 240 * SPEED });
      else LUNGE.set(d.a.id, { tx: d.dx, ty: d.dy, t0: now, dur: 300 * SPEED });
      const dir = (d.dx - d.ax) - (d.dy - d.ay); if (dir && !d.died) FACE.set(d.a.id, dir > 0 ? 1 : -1);
      const delay = (d.ranged ? 320 : 150) * SPEED;
      addFloat(d.dx, d.dy, d.killed ? `−${d.dmg}  KO` : `−${d.dmg}`, '#ff6b78', delay, 18);
      if (d.mA > 1) addFloat(d.dx + 0.35, d.dy - 0.35, `STRONG ×${d.mA}`, '#8ff0b8', delay + 180, 12);
      if (d.mA < 1) addFloat(d.dx + 0.35, d.dy - 0.35, `WEAK ×${d.mA}`, '#ff9aa4', delay + 180, 12);
      if (d.ret) addFloat(d.ax, d.ay, `−${d.ret}`, '#ffc94a', delay + 220, 16);
      setTimeout(() => sfx(d.killed || d.died ? 'kill' : 'hit'), delay);
      break;
    }
    case 'death': {
      const u = d.u;
      if (!vis(u.x, u.y)) return;
      GHOSTS.push({ type: u.type, owner: u.owner, x: u.x, y: u.y, boat: !isLand(tile(u.x, u.y)), t0: now + 260 * SPEED });
      break;
    }
    case 'capture':
      invalidateTerrain(); miniDirty = true;
      addRing(d.city.x, d.city.y, tribeColor(d.ti), 1000);
      if (mine(d.ti) || mine(d.prev) || vis(d.city.x, d.city.y)) {
        toast(d.prev < 0 ? `${G.tribes[d.ti].name} founded ${d.city.name}` : `${G.tribes[d.ti].name} captured ${d.city.name}!`, tribeColor(d.ti));
        if (mine(d.ti)) sfx('capture'); else if (mine(d.prev)) sfx('bad');
      }
      break;
    case 'levelup':
      invalidateTerrain();
      if (mine(d.city.owner)) { addRing(d.city.x, d.city.y, '#6fd3ff', 900); addFloat(d.city.x, d.city.y, `Level ${d.city.level}!`, '#6fd3ff', 0, 16); sfx('level'); }
      break;
    case 'build': invalidateTerrain(); miniDirty = true; if (vis(d.x, d.y)) addRing(d.x, d.y, '#ffffff', 500); break;
    case 'heal': if (vis(d.u.x, d.u.y) && d.amount > 0) addFloat(d.u.x, d.u.y, '+' + d.amount + ' HP', '#5fe08e', 0, 15); if (mine(d.u.owner)) sfx('heal'); break;
    case 'rankup': if (vis(d.u.x, d.u.y)) addFloat(d.u.x, d.u.y, '★ Rank ' + d.u.rank, '#ffd54a', 0, 15); if (mine(d.u.owner)) sfx('promote'); break;
    case 'train': if (vis(d.u.x, d.u.y)) addRing(d.u.x, d.u.y, tribeColor(d.u.owner), 600); if (mine(d.u.owner)) sfx('train'); break;
    case 'tech': if (mine(d.ti) && !UIState.ttAnim) { toast('Researched ' + TECHS[d.key].name, '#6fb7ff'); sfx('research'); } if (d.key === 'cartography') invalidateTerrain(); break;
    case 'upgrade': if (mine(d.ti) && !UIState.ttAnim) { toast(UPGRADES[d.key].name + ' level ' + d.lvl, '#ffcf3f'); sfx('forge'); } break;
    case 'bounty': if (vis(d.x, d.y)) addFloat(d.x, d.y, '+' + d.gold + ' gold', '#ffd54a', 350, 15); if (mine(d.ti)) sfx('coin'); break;
    case 'ninelives': if (vis(d.u.x, d.u.y)) addFloat(d.u.x, d.u.y + 0.3, 'Nine Lives!', '#ff8fc8', 420, 14); if (mine(d.u.owner)) sfx('meow'); break;
    case 'ruin': invalidateTerrain(); if (mine(d.ti)) { toast(d.text, '#c38bff'); sfx('reward'); } break;
    case 'eliminated': invalidateTerrain(); toast(`${G.tribes[d.ti].name} has been destroyed!`, tribeColor(d.by)); break;
    case 'gameover': if (!G.allAI) setTimeout(showGameOver, 700); break;
    case 'reward': invalidateTerrain(); break;
    case 'convert': if (vis(d.target.x, d.target.y)) addFloat(d.target.x, d.target.y, 'Converted!', '#c38bff', 0, 15); if (mine(d.prev)) toast('One of your units was converted!', '#c38bff'); if (mine(d.prev) || mine(d.u.owner)) sfx('magic'); break;
  }
}
FX = onFX;

AI_WAIT = async (kind, u) => {
  const gen = GEN;
  const visible = u && G && viewExplored(idx(u.x, u.y));
  if (visible && UIState.settings.speed > 0) {
    if (UIState.settings.follow && !G.allAI && UIState.screen === 'game') centerOn(u.x, u.y, true);
    const base = { move: 210, attack: 400, capture: 440, heal: 160, act: 230 }[kind] || 200;
    await sleep(base * SPEED);
  }
  if (gen !== GEN) throw new Error('ABORT');
};

/* ---------- player actions ---------- */
function afterAction() { refreshSel(); renderTopbar(); if (!G.over) checkRewards(); }
function actMove(u, i) { if (doMove(u, i)) { UIState.armed = null; afterAction(); } }
function actAttack(u, e) {
  const r = doAttack(u, e);
  if (!r) return;
  UIState.armed = null;
  if (r.died) clearSel();
  afterAction();
}
function actConvert(u, e) { if (doConvert(u, e)) { sfx('capture'); afterAction(); } }
function selectNextReady() {
  if (!isHumanTurn()) return;
  const list = unitsOf(G.human).filter(unitReady);
  if (!list.length) { toast('Every unit has acted — end your turn when ready', '#8a93b8'); return; }
  const s = UIState.sel; let k = 0;
  if (s && s.kind === 'unit') { const j = list.findIndex(u => u.id === s.id); k = (j + 1) % list.length; }
  const u = list[k]; selectUnit(u); centerOn(u.x, u.y, true);
}
function handleTap(i, ptype) {
  if (!G || UIState.screen !== 'game' || UIState.modal) return;
  const x = tx(i), y = ty(i), explored = viewExplored(i), s = UIState.sel;
  const target = explored ? unitAt(x, y) : null;
  if (s && s.kind === 'unit' && isHumanTurn()) {
    const u = unitById(s.id);
    if (u && u.owner === G.human) {
      if (target && target.owner !== G.human && HL.attacks.includes(target.id)) {
        if (ptype === 'touch' && UIState.armed !== target.id) { UIState.armed = target.id; renderPanel(); return; }
        return actAttack(u, target);
      }
      if (target && target.owner !== G.human && HL.converts.includes(target.id)) return actConvert(u, target);
      if (HL.moves && HL.moves.has(i)) return actMove(u, i);
    }
  }
  const city = explored ? cityAt(x, y) : null;
  if (target) {
    if (s && s.kind === 'unit' && s.id === target.id) return city ? selectCity(city) : selectTile(i);
    return selectUnit(target);
  }
  if (city) { if (s && s.kind === 'city' && s.id === city.id) return clearSel(); return selectCity(city); }
  if (s && s.kind === 'tile' && s.i === i) return clearSel();
  if (!explored) { if (typeof fogPoof === 'function') fogPoof(i); return clearSel(); }
  selectTile(i);
}
function onHover(i, sx, sy) {
  HL.hover = i; HL.path = null;
  const tip = $('#tip');
  let html = '';
  if (i >= 0 && G && !G.allAI && viewExplored(i) && !UIState.busy && UIState.screen === 'game') {
    const s = UIState.sel, e = unitAt(tx(i), ty(i));
    const u = s && s.kind === 'unit' ? unitById(s.id) : null;
    if (u && e && HL.attacks.includes(e.id)) html = `<h4>Attack forecast</h4>${combatBlock(u, e)}`;
    else if (u && e && HL.converts.includes(e.id)) html = `<h4>Convert ${UNITS[e.type].name}</h4><div>Click to make this unit join your tribe.</div>`;
    else if (u && HL.moves && HL.moves.has(i) && UIState.reach) HL.path = pathTo(UIState.reach, i);
    else if (e) { const st = unitStats(e); html = `<h4>${UNITS[e.type].name}${st.boat ? ' (boat)' : ''}</h4><div>${esc(G.tribes[e.owner].name)} · HP ${e.hp}/${st.maxHp}<br>Attack ${fmt1(st.atk)} · Defence ${fmt1(st.def)} · Range ${st.rng}</div>`; }
  }
  if (!html) { tip.hidden = true; return; }
  tip.innerHTML = html; tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = sx + 18, y = sy + 18;
  if (x + w > VW - 8) x = sx - w - 18;
  if (y + h > VH - 8) y = sy - h - 18;
  tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
}

/* ---------- turn flow ---------- */
async function endTurn(force) {
  if (!G || !isHumanTurn() || G.over || UIState.modal) return;
  const ready = unitsOf(G.human).filter(unitReady).length;
  if (!force && ready && UIState.settings.warnReady) {
    confirmModal('End your turn?', `${ready} unit${ready > 1 ? 's' : ''} can still act — ready units have a pulsing gold ring.`, 'End turn', () => endTurn(true), 'Keep playing');
    return;
  }
  const gen = GEN;
  sfx('endturn');
  UIState.busy = true; clearSel(); $('#tip').hidden = true; renderTopbar();
  try {
    advanceTribe();
    while (!G.over && G.current !== G.human) {
      const ti = G.current;
      showBanner(ti);
      beginTurn(ti);
      await sleep(60);
      if (gen !== GEN) return;
      await aiTurn(ti);
      if (gen !== GEN) return;
      advanceTribe();
    }
  } catch (e) {
    if (e && e.message === 'ABORT') return;
    console.error(e);
  }
  if (gen !== GEN) return;
  showBanner(-1);
  UIState.busy = false;
  if (G.over) { renderTopbar(); return; }
  beginTurn(G.human);
  saveGame();
  sfx('turn');
  toast(`Turn ${G.turn} — your move`, G.tribes[G.human].color);
  refreshSel(); renderTopbar(); checkRewards();
}
function showGameOver() {
  if (!G || G.allAI) return;
  if (G.challenge && typeof challengeGameOver === 'function') { challengeGameOver(); return; }
  if (!$('#modal').hidden) closeModal();
  $('#overlay').hidden = true; UIState.overlay = null;
  const won = G.winner === G.human, alive = G.tribes[G.human].alive;
  const rows = G.tribes.slice().sort((a, b) => scoreOf(b.i) - scoreOf(a.i)).map(t => `<tr><td><span class="cmp"><i style="background:${t.color}"></i>${esc(t.name)}${t.i === G.human ? ' (you)' : ''}</span></td><td>${t.alive ? 'Standing' : 'Destroyed'}</td><td>${citiesOf(t.i).length}</td><td>${t.kills}</td><td>${scoreOf(t.i).toLocaleString()}</td></tr>`).join('');
  const res = typeof onMatchEnd === 'function' ? onMatchEnd() : null;
  const title = won ? 'Victory!' : alive ? 'The age has ended' : 'Defeat';
  const text = won ? (G.turnLimit ? 'Your tribe earned the most glory in 30 turns.' : 'Every rival tribe has fallen. The world is yours.')
    : alive ? `${esc(G.tribes[G.winner].name)} earned more glory this age.` : 'Your last city has fallen.';
  const winLines = res && res.lines.length ? `<p style="color:var(--gold);font-weight:700">${res.lines.map(esc).join(' · ')}${res.wins ? ` — you now have ${winsLabel(winsBalance())} to spend in the Item shop` : ''}</p>` : '';
  showModal(`<h2>${title}</h2><p>${text} Finished on turn ${G.turn}.</p>${winLines}<div class="scroll-x"><table class="grid"><thead><tr><th>Tribe</th><th>Status</th><th>Cities</th><th>Kills</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="modal-actions"><button class="btn" data-act="closeModal">View the map</button><button class="btn" data-act="toMenu">Main menu</button><button class="btn primary" data-act="newGame">New game</button></div>`);
  clearSave();
  SND.stopMusic(1.2);
  sfx(won ? 'victory' : 'defeat');
}

/* ---------- input ---------- */
function setupInput() {
  const pts = new Map();
  let sx0 = 0, sy0 = 0, cx0 = 0, cy0 = 0, moved = false, pinch = null;
  const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, local(e));
    if (pts.size === 1) { [sx0, sy0] = local(e); cx0 = cam.x; cy0 = cam.y; moved = false; }
    else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z }; moved = true;
    }
  });
  cv.addEventListener('pointermove', (e) => {
    const [sx, sy] = local(e);
    if (pts.has(e.pointerId)) {
      pts.set(e.pointerId, [sx, sy]);
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (pinch.z * d / pinch.d) / cam.z);
      } else if (pts.size === 1) {
        const dx = sx - sx0, dy = sy - sy0;
        if (!moved && Math.hypot(dx, dy) > 7) { moved = true; cv.classList.add('grab'); $('#tip').hidden = true; }
        if (moved) { cam.x = cx0 - dx / cam.z; cam.y = cy0 - dy / cam.z; clampCam(); camGoal = null; miniDirty = true; }
      }
    } else if (e.pointerType === 'mouse' && G) onHover(screenToTile(sx, sy), sx, sy);
  });
  const up = (e) => {
    const had = pts.has(e.pointerId);
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    cv.classList.remove('grab');
    if (had && !moved && pts.size === 0 && G && e.type === 'pointerup') {
      const [sx, sy] = local(e); const i = screenToTile(sx, sy);
      if (i >= 0) handleTap(i, e.pointerType);
    }
    if (pts.size === 0) moved = false;
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { HL.hover = -1; HL.path = null; $('#tip').hidden = true; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const [sx, sy] = local(e); zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015)); miniDirty = true; }, { passive: false });
  $('#minimap').addEventListener('click', (e) => {
    const mm = $('#minimap'), m = mm._map; if (!m) return;
    const r = mm.getBoundingClientRect();
    cam.x = (e.clientX - r.left - m.ox) / m.k; cam.y = (e.clientY - r.top - m.oy) / m.k; clampCam(); miniDirty = true;
  });
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', () => { resizeCanvas(); miniDirty = true; });
}
function onKey(e) {
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (!$('#modal').hidden) { if (k === 'escape' && !G.over && !$('#modalBody').querySelector('[data-act="reward"]')) closeModal(); return; }
  if (!$('#overlay').hidden) {
    if (k === 'escape') closeOverlay();
    else if (UIState.overlay === 'tech') { const st = document.getElementById('ttStage'); if (st && (k === '+' || k === '=' || k === '-' || k === '_')) { e.preventDefault(); ttZoomAt(st.clientWidth / 2, st.clientHeight / 2, (k === '+' || k === '=') ? 1.25 : 0.8); } else if (st && k === '0') ttFit(); }
    return;
  }
  if (UIState.screen !== 'game') return;
  const pan = 70 / cam.z;
  if (k === 'escape') { if (UIState.sel) clearSel(); else openGameMenu(); }
  else if (k === 'enter') { e.preventDefault(); endTurn(); }
  else if (k === 'n' || k === 'tab') { e.preventDefault(); selectNextReady(); }
  else if (k === 'h') { const s = UIState.sel, u = s && s.kind === 'unit' ? unitById(s.id) : null; if (u && u.owner === G.human && isHumanTurn() && doRecover(u)) afterAction(); }
  else if (k === 't') openOverlay('tech');
  else if (k === 'u') openOverlay('upgrades');
  else if (k === 'g') openOverlay('stats');
  else if (k === 'c') openOverlay('codex');
  else if (k === 'v') toggleMapStats();
  else if (k === ' ') { e.preventDefault(); const s = UIState.sel; if (s && s.kind === 'unit') { const u = unitById(s.id); if (u) centerOn(u.x, u.y, true); } else { const c = capitalOf(G.human); if (c) centerOn(c.x, c.y, true); } }
  else if (k === '+' || k === '=') zoomAt(VW / 2, VH / 2, 1.15);
  else if (k === '-' || k === '_') zoomAt(VW / 2, VH / 2, 1 / 1.15);
  else if (k === 'arrowleft' || k === 'a') { cam.x -= pan; clampCam(); miniDirty = true; }
  else if (k === 'arrowright' || k === 'd') { cam.x += pan; clampCam(); miniDirty = true; }
  else if (k === 'arrowup' || k === 'w') { cam.y -= pan; clampCam(); miniDirty = true; }
  else if (k === 'arrowdown' || k === 's') { cam.y += pan; clampCam(); miniDirty = true; }
}
function toggleMapStats() { SHOW_STATS = !SHOW_STATS; const b = $('#bStatsOverlay'); if (b) b.classList.toggle('on', SHOW_STATS); }

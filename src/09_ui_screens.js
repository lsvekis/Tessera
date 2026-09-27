/* =====================================================================
   Part 6c: UI — overlays (tech tree, upgrades, stats, codex, help,
   log), game menu, setup screen, main menu attract mode, save/load, boot
   ===================================================================== */
const SVGI = {
  mountain: '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path d="M1.5 20.5 9 6l4 6.5 3-4.5 6.5 12.5z" fill="#a7b6d8"/><path d="M9 6l2.3 3.8L9 11.5 7.4 9.7z" fill="#fff"/><path d="M9 6l4 6.5L9 20.5z" fill="#7d8db3"/></svg>',
  road: '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path d="M7 22 10.5 2h3L17 22z" fill="#c9a36a"/><path d="M12 4v3M12 10v3M12 16v4" stroke="#fff6dd" stroke-width="1.6"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z" fill="#ffd54a" stroke="#b8860b" stroke-width="1"/></svg>',
  heal: '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#2f9e5a"/><path d="M12 6.5v11M6.5 12h11" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>',
  map: '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path d="M2 5l6-2 8 3 6-2v15l-6 2-8-3-6 2z" fill="#e8d7ae"/><path d="M8 3v15M16 6v15" stroke="#b39463" stroke-width="1.3"/><circle cx="12" cy="11" r="2" fill="#e5484d"/></svg>',
  wall: '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path d="M2 9h3V6h3v3h3V6h2v3h3V6h3v3h3v12H2z" fill="#c9c2b4"/><path d="M2 14h20M8 9v5M16 9v5M5 14v7M12 14v7M19 14v7" stroke="#8d867a" stroke-width="1.2"/></svg>',
  fish: '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path d="M3 12c3-5 10-6 15 0-5 6-12 5-15 0z" fill="#8fd3ff"/><path d="M18 12l4-4v8z" fill="#5cb9e6"/><circle cx="7" cy="11" r="1.2" fill="#123a82"/></svg>'
};
function techIcon(k) {
  const T = TECHS[k];
  if (T.unit) return `<img src="${unitPortrait(T.unit, G.human)}" alt="">`;
  const P = (t, b) => `<img src="${unitPortrait(t, G.human, b)}" alt="">`;
  const big = (s) => s.replace('class="ico"', 'class="ico" style="width:34px;height:34px"');
  const m = { roads: SVGI.road, horsemanship: P('rider'), trade: big(ICON.gold), organization: big(ICON.food), farming: big(ICON.food), construction: SVGI.wall,
    leadership: SVGI.star, climbing: SVGI.mountain, mining: big(ICON.gold), meditation: SVGI.heal, fishing: SVGI.fish, aquaculture: SVGI.fish,
    sailing: P('warrior', true), navigation: P('warrior', true), cartography: SVGI.map, marksmanship: P('archer'), forestry: big(ICON.wood) };
  return m[k] || SVGI.star;
}

/* ---------- overlay shell ---------- */
function openOverlay(kind) {
  if (!G) return;
  if (UIState.screen === 'game' && UIState.modal) return;
  UIState.overlay = kind;
  $('#overlay').hidden = false;
  renderOverlay(kind);
  $('#ovClose').focus();
  $('#tip').hidden = true;
}
function closeOverlay() { $('#overlay').hidden = true; UIState.overlay = null; if (UIState.screen === 'game') refreshSel(); }
function renderOverlay(kind) {
  const f = { tech: techHTML, upgrades: upgradesHTML, stats: statsHTML, codex: codexHTML, help: helpHTML, log: logHTML }[kind];
  if (!f) return;
  const body = $('#ovBody'), st = body.parentElement.scrollTop;
  body.innerHTML = f();
  body.parentElement.scrollTop = st;
  if (kind === 'tech') techMount();
}
function inGame() { return UIState.screen === 'game' && G && !G.allAI; }

/* ---------- upgrades: three simple army-wide boosts ---------- */
const UPGRADE_ICONS = {
  attack: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 39 31 17M28 9h11v11M13 29l6 6M8 34l6 6" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 17 39 9" stroke="#ffe3e3" stroke-width="4.5" stroke-linecap="round"/></svg>',
  defence: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5 40 11v12c0 10-7 17-16 20C15 40 8 33 8 23V11z" fill="#fff" opacity=".95"/><path d="M24 11 34 15v8c0 7-4.5 11.5-10 13.5z" fill="#cfe6ff"/></svg>',
  health: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 41S7 31 7 18.5A9.5 9.5 0 0 1 24 13a9.5 9.5 0 0 1 17 5.5C41 31 24 41 24 41z" fill="#fff"/><path d="M24 18v14M17 25h14" stroke="#2f9e5a" stroke-width="4.5" stroke-linecap="round"/></svg>'
};
function upgradesHTML() {
  const ti = G.human;
  let cards = '';
  for (const k in UPGRADES) {
    const U = UPGRADES[k], lvl = upgradeLvl(ti, k), nx = upgradeNext(ti, k);
    const pips = Array.from({ length: UPGRADE_MAX }, (_, j) => `<i class="${j < lvl ? 'on' : ''}"></i>`).join('');
    cards += `<div class="card upg" data-card="${k}" style="--uc:${U.color}"><div class="upg-top"><span class="upg-ico">${UPGRADE_ICONS[k]}</span><div><h3>${U.name}</h3><span class="tag">${U.short} per level</span></div></div>
      <div class="lvls" aria-label="Level ${lvl} of ${UPGRADE_MAX}">${pips}</div><p>${U.desc}</p>
      ${nx ? `<button class="btn ${nx.ok ? 'primary' : ''} wide" data-act="upgrade" data-key="${k}" ${nx.ok && isHumanTurn() ? '' : 'disabled'}>Buy level ${nx.lvl} · ${ICON.gold} ${nx.cost.gold}</button>${nx.reason ? `<p class="note warn">${nx.reason}</p>` : ''}`
        : '<p class="note" style="color:var(--good)">Maxed out ✓</p>'}</div>`;
  }
  return `<h2>Upgrades</h2><p class="lead">Spend gold to make <b>every unit you own</b> stronger — now and for the rest of the game.${tribeKey(ti) === 'ironvale' ? ' Forgemasters: 25% cheaper.' : ''}</p>
    <div class="cards">${cards}</div>
    <div class="help"><h3>Upgrading one unit</h3><p>Select a unit and press <b>Rank up</b> (★ up to ★★★) for +0.5 attack, +0.5 defence and +2 HP. It costs gold inside your borders — or it's <b>free after 3 kills</b>.</p>
    <h3>Healing</h3><p><b>Rest</b> heals a unit that hasn't moved (+4 HP in your borders, +2 outside). <b>Heal to full</b> costs a little gold inside your borders. <b>Monks</b> heal every ally next to them.</p></div>`;
}

/* ---------- stats / economy ---------- */
function statsHTML() {
  const ti = G.human;
  const tribes = G.tribes.slice().sort((a, b) => scoreOf(b.i) - scoreOf(a.i));
  const max = Math.max(1, ...tribes.map(t => scoreOf(t.i)));
  const bars = tribes.map(t => `<div class="brow"><span class="cmp"><i style="background:${t.color}"></i>${esc(t.name)}</span><span class="b"><i style="width:${scoreOf(t.i) / max * 100}%;background:${t.color}"></i></span><b style="text-align:right">${scoreOf(t.i).toLocaleString()}</b></div>`).join('');
  const rows = tribes.map(t => {
    const terr = G.tiles.filter(q => q.owner === t.i).length;
    return `<tr><td><span class="cmp"><i style="background:${t.color}"></i>${esc(t.name)}${t.i === ti ? ' (you)' : ''}</span></td><td>${t.alive ? 'Standing' : 'Destroyed'}</td><td>${citiesOf(t.i).length}</td><td>${unitsOf(t.i).length}</td><td>${terr}</td><td>${Object.keys(t.techs).length}</td><td>${t.kills}</td><td>${TRIBES[t.key].ability}</td></tr>`;
  }).join('');
  const inc = computeIncome(ti);
  const crow = citiesOf(ti).map(c => { const p = inc.per.get(c.id); return `<tr><td>${esc(c.name)}${c.capital ? ' ★' : ''}</td><td>${c.level}</td><td>${p.base}</td><td>${p.sites}</td><td><b>${p.base + p.sites}</b></td><td>${cityUnitCount(c)} / ${cityCapacity(c)}</td></tr>`; }).join('');
  const cnt = {}; G.tiles.forEach(t => { if (t.owner === ti && t.site && SITES[t.site.type]) cnt[t.site.type] = (cnt[t.site.type] || 0) + 1; });
  const sites = Object.keys(cnt).map(k => `<span class="tag">${SITES[k].name} × ${cnt[k]}</span>`).join(' ') || '<span class="note">No buildings yet — click a tile inside your borders to build one.</span>';
  return `<h2>Game stats</h2><p class="lead">Turn ${G.turn}${G.turnLimit ? ' of ' + G.turnLimit : ''} · ${G.mode === 'glory' ? 'Glory: highest score after 30 turns wins' : 'Conquest: capture every enemy city'} · ${DIFFICULTY[G.difficulty].name}</p>
    <div class="two"><div><div class="sec">Score</div><div class="bars" style="margin-top:8px">${bars}</div></div>
    <div><div class="sec">Your gold per turn</div><div class="cost" style="font-size:22px;margin:8px 0"><span>${ICON.gold} +${inc.gold}</span></div>
    <p class="note">Cities make ${inc.cities} · Buildings make ${inc.sites}</p><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${sites}</div></div></div>
    <div class="sec" style="margin-top:18px">Your cities</div><div class="scroll-x"><table class="grid"><thead><tr><th>City</th><th>Level</th><th>City gold</th><th>Buildings</th><th>Total</th><th>Units</th></tr></thead><tbody>${crow || '<tr><td colspan="6">No cities</td></tr>'}</tbody></table></div>
    <div class="sec" style="margin-top:18px">Tribes</div><div class="scroll-x"><table class="grid"><thead><tr><th>Tribe</th><th>Status</th><th>Cities</th><th>Units</th><th>Territory</th><th>Techs</th><th>Kills</th><th>Ability</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ---------- codex: units & counters ---------- */
function codexHTML() { return `<h2>Units &amp; counters</h2>` + codexBody(); }
function codexBody() {
  const who = inGame() ? G.human : UIState.opts.tribe;
  const types = TRAINABLE.concat(['champion']);
  const rows = types.map(k => {
    const T = UNITS[k];
    return `<tr><td><span class="cmp" style="gap:8px"><img src="${unitPortrait(k, who)}" alt="" style="width:40px;height:40px;margin:-8px 0"><b>${T.name}</b></span></td><td>${CLASS_NAME[T.cls]}</td><td>${T.hp}</td><td>${fmt1(T.atk)}</td><td>${T.def}</td><td>${T.mov}</td><td>${T.rng}</td>
      <td>${T.cost ? costHTML(T.cost, -1) : 'City reward'}</td><td>${T.tech ? TECHS[T.tech].name : '—'}</td>
      <td style="white-space:normal;min-width:180px">${strongList(k).map(q => UNITS[q].name).join(', ') || '—'}</td><td style="white-space:normal;min-width:150px">${weakList(k).map(q => UNITS[q].name).join(', ') || '—'}</td></tr>`;
  }).join('');
  const head = types.map(k => `<th title="${UNITS[k].name}"><img src="${glyphIcon(k, '#2b3a6c', '#fff')}" alt="${UNITS[k].name}"><small>${UNITS[k].name.slice(0, 5)}</small></th>`).join('');
  const mx = types.map(a => `<tr><th style="text-align:left!important"><span class="cmp" style="gap:6px"><img src="${glyphIcon(a, '#2b3a6c', '#fff')}" alt="" style="width:22px;height:22px;display:inline">${UNITS[a].name}</span></th>${types.map(d => {
    const m = counterMult(a, d, false);
    return m > 1 ? `<td class="s">×${m}</td>` : m < 1 ? `<td class="w">×${m}</td>` : '<td class="n">·</td>';
  }).join('')}</tr>`).join('');
  return `<p class="lead">Every unit is strong against something and weak against something else. A strong matchup multiplies that unit's attack <i>and</i> defence by ×1.5; the Swordsman is really weak against cavalry (×0.5).</p>
    <div class="scroll-x"><table class="grid"><thead><tr><th>Unit</th><th>Class</th><th>HP</th><th>ATK</th><th>DEF</th><th>Move</th><th>Range</th><th>Cost</th><th>Tech</th><th>Strong vs</th><th>Weak vs</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="sec" style="margin-top:20px">Counter matrix — row unit fighting column unit</div>
    <div class="scroll-x"><table class="grid mx"><thead><tr><th></th>${head}</tr></thead><tbody>${mx}</tbody></table></div>
    <div class="help"><h3>The rock-paper-scissors loop</h3><p><b>Spearmen</b> stop <b>cavalry</b> → <b>cavalry</b> runs down <b>Archers, Swordsmen and Catapults</b> → <b>Swordsmen</b> beat every <b>foot unit</b> → <b>Archers</b> shred <b>Spearmen and Warriors</b> from 3 tiles away → <b>Shieldbearers</b> block arrows → <b>Catapults</b> smash Shieldbearers and cities.</p>
    <h3>How damage works</h3><p>Attack force = ATK × counter bonus × (HP ÷ max HP). Defence force = DEF × counter bonus × (HP ÷ max HP) × terrain bonus. Damage dealt = attack share × ATK × 4.5. If the defender survives and you're inside its range, it strikes back with its defence share. Wounded units hit softer — heal them!</p>
    <h3>Defence bonuses</h3><ul><li>In your own city ×1.5 · with City Walls ×2.5</li><li>Forest ×1.25 (×1.5 after Archery) · Mountain ×1.5</li><li>Units in boats fight with fixed boat stats and no counter bonuses.</li></ul>
    <p>Hover (or tap) an enemy while your unit is selected to see the exact forecast before you attack.</p></div>`;
}

/* ---------- how to play ---------- */
function helpHTML() {
  return `<h2>How to play</h2><p class="lead">Lead your tribe from a single capital to ruling the whole world. The last tribe standing wins (or the highest score after 30 turns in Glory mode).</p>
  <div class="help two"><div>
  <h3>Your turn</h3><ul><li>Units with a <b>pulsing gold ring</b> haven't acted yet. A dashed ring means they can still attack. Grey units are done.</li>
  <li>Click a unit, then click a highlighted tile to move, or a <b style="color:#ff8f8f">red</b> tile to attack. Most units can move and then attack.</li>
  <li>Each unit's badge shows its <b>type icon</b>, its <b>HP</b> and its rank stars. Press <span class="kbd">V</span> to show attack/defence on the map.</li>
  <li><span class="kbd">N</span> selects the next ready unit, <span class="kbd">Enter</span> ends the turn, <span class="kbd">Esc</span> clears the selection. Drag to pan, scroll or pinch to zoom.</li></ul>
  <h3>Cities &amp; territory</h3><ul><li>Coloured borders and banners show who owns each city and tile. Your capital has a crown.</li>
  <li>To capture a village or enemy city, move a unit onto it, survive until your next turn, then press <b>Capture</b>.</li>
  <li>Cities grow from population. Every level adds gold income, one more unit slot and a reward choice (Workshop, Walls, Border Growth, Champion…).</li></ul>
  <h3>Winning battles</h3><ul><li>Use counters (see Units &amp; counters). Fight from forests, mountains and cities for bonus defence.</li>
  <li>Heal wounded units with Recover, Heal to full or a Monk, and upgrade their rank.</li></ul></div><div>
  <h3>Gold</h3><ul><li><b>Gold</b> is the only resource. It trains units, researches technology and buys upgrades.</li>
  <li>Cities make gold every turn — bigger cities make more. Click a tile inside your borders to build a <b>Farm</b>, <b>Lumber Camp</b>, <b>Gold Mine</b> or <b>Fishery</b>: each one makes gold every turn and grows the city.</li>
  <li>The top bar shows your gold and how much you get next turn.</li>
  <li><b>Upgrades</b> make your whole army stronger for the rest of the game.</li></ul>
  <h3>Tribes</h3><ul>${TRIBE_ORDER.map(k => `<li><b style="color:${TRIBES[k].color === '#eef3f8' ? '#dfe8f0' : TRIBES[k].color}">${TRIBES[k].name}</b> — ${TRIBES[k].ability}: ${TRIBES[k].abilityText}</li>`).join('')}</ul>
  <h3>Explore</h3><ul><li>Clouds hide unexplored land. Ancient ruins hold treasure, technology or recruits.</li><li>With Sailing, units can board boats on shallow water to reach islands.</li></ul></div></div>`
  + `<h2 style="margin-top:26px">Units &amp; counters</h2>` + codexBody();
}
function logHTML() {
  const items = G.log.slice().reverse().map(l => `<div style="--lc:${l.ti >= 0 ? G.tribes[l.ti].color : '#445'}"><small>Turn ${l.t}</small>${esc(l.text)}</div>`).join('');
  return `<h2>Chronicle</h2><p class="lead">Everything that happened in the world, newest first.</p><div class="log-list">${items || '<p class="note">Nothing yet.</p>'}</div>`;
}

/* ---------- overlay & modal clicks ---------- */
function setupDelegates() {
  $('#ovClose').addEventListener('click', closeOverlay);
  $('#overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') closeOverlay(); });
  $('#ovBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const a = b.dataset.act;
    if (a === 'techSel') ttSelect(b.dataset.key);
    else if (a === 'research') ttResearch(b.dataset.key);
    else if (a === 'upgrade') upgradeBuy(b.dataset.key);
  });
  $('#panel').addEventListener('click', onPanelClick);
  $('#modalBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const a = b.dataset.act;
    if (a === 'reward') { const c = G.cities[+b.dataset.city]; closeModal(); chooseReward(c, b.dataset.id); sfx('reward'); afterAction(); }
    else if (a === 'confirmYes') { const cb = modalCb; closeModal(); if (cb) cb(); }
    else if (a === 'confirmNo' || a === 'closeModal' || a === 'resume') closeModal();
    else if (a === 'toMenu') { closeModal(); toMenu(); }
    else if (a === 'newGame') { closeModal(); toMenu(); showSetup(); }
    else if (a === 'howto') { closeModal(); openOverlay('help'); }
    else if (a === 'shopPlay') { closeModal(); closeShop(); showSetup(); }
    else if (a === 'toChallenge') { closeModal(); toMenu(); openChallenge(); }
    else if (a === 'set') {
      const k = b.dataset.k, v = b.dataset.v, S = UIState.settings;
      if (k === 'speed') { S.speed = +v; SPEED = S.speed === 2 ? 0.45 : S.speed === 0 ? 0.05 : 1; }
      else S[k] = v === '1';
      saveSettings(); syncMusic(); openGameMenu();
    }
  });
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !$('#modalBody').querySelector('[data-act="reward"]') && !(G && G.over)) closeModal(); });
}
function onPanelClick(e) {
  const b = e.target.closest('[data-act]'); if (!b || !G) return;
  if (b.disabled || b.getAttribute('aria-disabled') === 'true') { sfx('bad'); return; }
  const a = b.dataset.act, s = UIState.sel;
  const u = s && s.kind === 'unit' ? unitById(s.id) : null;
  const c = s && s.kind === 'city' ? G.cities[s.id] : null;
  if (a === 'close') return clearSel();
  if (!isHumanTurn()) return;
  if (a === 'capture' && u) { if (doCapture(u)) afterAction(); }
  else if (a === 'recover' && u) { if (doRecover(u)) afterAction(); }
  else if (a === 'paidHeal' && u) { if (doPaidHeal(u)) afterAction(); }
  else if (a === 'rankUp' && u) { if (doRankUp(u)) afterAction(); }
  else if (a === 'skip' && u) { doSkip(u); afterAction(); selectNextReady(); }
  else if (a === 'monkHeal' && u) { if (doMonkHeal(u)) afterAction(); }
  else if (a === 'disband' && u) confirmModal('Disband this unit?', `The ${UNITS[u.type].name} will be removed for good, freeing a unit slot in its home city.`, 'Disband', () => { doDisband(u); clearSel(); renderTopbar(); });
  else if (a === 'confirmAttack' && u) { const e2 = unitById(UIState.armed); UIState.armed = null; if (e2) actAttack(u, e2); }
  else if (a === 'train' && c) { if (doTrain(c, b.dataset.type)) afterAction(); }
  else if (a === 'walls' && c) { if (doBuyWalls(c)) { sfx('build'); afterAction(); } }
  else if (a === 'openReward') checkRewards();
  else if (a === 'tile') { const i = +b.dataset.i; if (doTileAction(G.human, tx(i), ty(i), b.dataset.id)) { sfx('build'); afterAction(); } }
}
function openGameMenu() {
  const S = UIState.settings;
  const seg = (k, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="set" data-k="${k}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  showModal(`<h2>Menu</h2><div class="opt"><label>Animation speed</label>${seg('speed', [[1, 'Normal'], [2, 'Fast'], [0, 'Instant']], S.speed)}</div>
    <div class="opt"><label>Warn when units can still act</label>${seg('warnReady', [[1, 'On'], [0, 'Off']], S.warnReady ? 1 : 0)}</div>
    <div class="opt"><label>Camera follows enemy moves</label>${seg('follow', [[1, 'On'], [0, 'Off']], S.follow ? 1 : 0)}</div>
    <div class="opt"><label>Music</label>${seg('music', [[1, 'On'], [0, 'Off']], S.music ? 1 : 0)}</div>
    <div class="opt"><label>Sound effects</label>${seg('sound', [[1, 'On'], [0, 'Off']], S.sound ? 1 : 0)}</div>
    <div class="modal-actions"><button class="btn" data-act="howto">How to play</button><button class="btn" data-act="toMenu">Save &amp; main menu</button><button class="btn primary" data-act="resume">Resume</button></div>`);
}
function saveSettings() { try { localStorage.setItem('tessera-settings', JSON.stringify(UIState.settings)); } catch (e) { /* storage unavailable */ } }
function loadSettings() {
  try { const s = JSON.parse(localStorage.getItem('tessera-settings') || 'null'); if (s) Object.assign(UIState.settings, s); } catch (e) { /* ignore */ }
  const sp = UIState.settings.speed; SPEED = sp === 2 ? 0.45 : sp === 0 ? 0.05 : 1;
}

/* ---------- dock ---------- */
function setupDock() {
  const items = [['bMenu', 'menu', 'Menu', () => openGameMenu()], ['bTech', 'tech', 'Tech', () => openOverlay('tech')], ['bUpgrades', 'armory', 'Upgrades', () => openOverlay('upgrades')],
    ['bStats', 'stats', 'Stats', () => openOverlay('stats')], ['bCodex', 'codex', 'Units', () => openOverlay('codex')],
    ['bLog', 'log', 'Log', () => openOverlay('log')], ['bStatsOverlay', 'eye', 'A/D', () => toggleMapStats()]];
  const DOCK_COL = { menu: '#5766b8', tech: '#3f9d7a', armory: '#c1683a', stats: '#8a5ec4', codex: '#3a7fc1', log: '#5a6480', eye: '#c19a3a' };
  $('#dockLeft').innerHTML = items.map(([id, ic, label]) => `<button class="dock-btn" id="${id}" title="${label}" style="--bc:${DOCK_COL[ic] || '#3d51a0'}"><i>${DOCK_ICONS[ic]}</i><span>${label}</span></button>`).join('');
  for (const [id, , , fn] of items) document.getElementById(id).addEventListener('click', fn);
  $('#bStatsOverlay').title = 'Show attack/defence on the map (V)';
  $('#bNext').addEventListener('click', selectNextReady);
  $('#bEnd').addEventListener('click', () => endTurn());
  for (const r of RES) document.getElementById('r' + r[0].toUpperCase() + r.slice(1)).addEventListener('click', () => openOverlay('stats'));
}

/* ---------- save / load ---------- */
/* challenge runs are saved under their own key so they never overwrite a normal game */
const CHALLENGE_RUN_KEY = 'tessera-challenge-run';
function saveGame() {
  if (!G || G.allAI || G.over) return;
  try { localStorage.setItem(G.challenge ? CHALLENGE_RUN_KEY : SAVE_KEY, JSON.stringify(G)); } catch (e) { /* storage unavailable */ }
}
function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); if (!s) return null; const g = JSON.parse(s); return g && g.v === 2 && g.tribes && !g.over && !g.challenge ? g : null; }
  catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(G && G.challenge ? CHALLENGE_RUN_KEY : SAVE_KEY); } catch (e) { /* ignore */ } }

/* ---------- screens ---------- */
function resetFX() { ANIM.clear(); LUNGE.clear(); FACE.clear(); FXL.length = 0; GHOSTS.length = 0; HL.hover = -1; }
function enterGame() {
  UIState.screen = 'game'; UIState.busy = false; UIState.sel = null;
  pickStop(); updateSoundBtn();
  $('#menu').hidden = true; $('#setup').hidden = true; $('#hud').hidden = false; $('#overlay').hidden = true;
  rebuildIndex(); invalidateTerrain(); miniDirty = true;
  const cap = capitalOf(G.human) || G.cities.find(c => c.owner === G.human) || G.cities[0];
  cam.z = VW < 700 ? 0.85 : 1.05; centerOn(cap.x, cap.y, false);
  renderCrest(); clearSel(); renderTopbar();
}
function showWelcome() {
  const tr = G.tribes[G.human], cap = capitalOf(G.human), T = TRIBES[tr.key];
  if (!cap || G.over) return;
  showModal(`<h2>The ${esc(tr.name)} rise</h2><p>From the capital of <b>${esc(cap.name)}</b>, lead your tribe against ${G.tribes.length - 1} rivals. ${G.mode === 'glory' ? 'Earn the highest score within 30 turns.' : 'Capture every enemy city to win.'}</p>
    <p><b style="color:var(--gold)">${T.ability}:</b> ${T.abilityText}</p>
    <ul style="margin:0;padding-left:18px;color:#cfd7f5;display:grid;gap:6px">
    <li>Units with a <b>pulsing gold ring</b> can still act. Click one, then a highlighted tile to move or a red tile to attack.</li>
    <li>Hover an enemy to see the exact damage forecast, including counter bonuses.</li>
    <li>Click tiles inside your borders to build Farms, Lumber Camps, Gold Mines and Fisheries — they all make <b>gold</b>.</li>
    <li>Park a unit on a village; next turn press <b>Capture</b> to found a new city.</li>
    <li><span class="kbd">N</span> next unit · <span class="kbd">Enter</span> end turn · Tech and Upgrades are in the bottom bar.</li></ul>
    <div class="modal-actions"><button class="btn primary big" data-act="closeModal">Begin</button></div>`);
}
async function startGame() {
  if (UIState.loading) return;
  GEN++; resetFX();
  const o = UIState.opts;
  newGame({ tribe: o.tribe, opponents: +o.opponents, size: o.size, difficulty: o.difficulty, mode: o.mode, seed: (Date.now() % 2147483000) | 0,
    perks: typeof equippedPerks === 'function' ? equippedPerks() : [], skin: typeof equippedSkin === 'function' ? equippedSkin() : null });
  G.viewAll = false;
  beginTurn(G.human);
  const T = TRIBES[o.tribe];
  await runLoader({ tribe: o.tribe, title: 'The ' + T.name + ' rise', sub: T.motto, onReady: () => enterGame() });
  saveGame();
  syncMusic();
  sfx('turn');
  showWelcome();
}
async function continueGame() {
  if (UIState.loading) return;
  const g = loadSave(); if (!g) return;
  GEN++; resetFX();
  G = g; G.viewAll = false;
  if (G.current !== G.human) G.current = G.human;
  const tr = G.tribes[G.human];
  await runLoader({ tribe: tr.key, title: 'Back to battle', sub: `${tr.name} · Turn ${G.turn}`, quick: true, onReady: () => enterGame() });
  syncMusic();
  checkRewards();
}
function toMenu() {
  if (UIState.screen === 'game' && !UIState.busy) saveGame();
  GEN++; resetFX(); pickStop();
  UIState.screen = 'menu'; UIState.busy = false; UIState.overlay = null;
  $('#hud').hidden = true; $('#overlay').hidden = true; $('#modal').hidden = true; UIState.modal = false; $('#setup').hidden = true; $('#shop').hidden = true; $('#chal').hidden = true; $('#menu').hidden = false;
  $('#mbContinue').hidden = !loadSave();
  updateSoundBtn(); syncMusic();
  runDemo();
}
function showSetup() { openPick(); }
function setupMenus() {
  $('#mNew').addEventListener('click', showSetup);
  $('#mContinue').addEventListener('click', continueGame);
  $('#mHow').addEventListener('click', () => openOverlay('help'));
  $('#mShop').addEventListener('click', () => openShop());
  $('#mChallenge').addEventListener('click', () => openChallenge());
  $('#winsChip').addEventListener('click', () => { if (UIState.screen !== 'game') openShop(); });
  $('#sBack').addEventListener('click', closePick);
  setupPick();
  if (typeof setupShop === 'function') setupShop();
  if (typeof setupChallenge === 'function') setupChallenge();
  $('#sStart').addEventListener('click', startGame);
  document.querySelectorAll('.seg[data-key]').forEach(seg => seg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    UIState.opts[seg.dataset.key] = /^\d+$/.test(b.dataset.v) ? +b.dataset.v : b.dataset.v; renderSetup();
  }));
  $('#menuStrip').innerHTML = TRIBE_ORDER.map((k, n) => `<span style="background:${TRIBES[k].color};--i:${n}" title="${TRIBES[k].name}"></span>`).join('');
}

/* ---------- attract mode: AI tribes battle behind the menu ---------- */
let demoCenter = null;
async function runDemo() {
  const gen = ++GEN;
  resetFX();
  const seed = ((Date.now() / 7) % 2147483000) | 0;
  newGame({ tribe: TRIBE_ORDER[seed % 6], opponents: 3, size: 'small', difficulty: 'normal', mode: 'domination', seed, allAI: true });
  G.viewAll = true;
  invalidateTerrain();
  const c = (G.size - 1) / 2; demoCenter = [isoX(c, c), isoY(c, c)];
  cam.z = Math.min(1, Math.max(0.45, Math.min(VW / (G.size * TW) * 1.25, VH / (G.size * TH) * 1.6)));
  cam.x = demoCenter[0]; cam.y = demoCenter[1];
  beginTurn(0);
  try {
    while (gen === GEN) {
      await aiTurn(G.current);
      if (gen !== GEN) return;
      advanceTribe();
      if (G.over || G.turn > 45) { await sleep(1500); if (gen === GEN) runDemo(); return; }
      beginTurn(G.current);
      await sleep(200);
    }
  } catch (e) { if (!e || e.message !== 'ABORT') console.error(e); }
}
function menuDrift(now) {
  if (UIState.screen === 'game' || !G || !G.allAI || !demoCenter) return;
  const t = now / 16000, R = G.size * 12;
  cam.x = demoCenter[0] + Math.cos(t) * R; cam.y = demoCenter[1] + Math.sin(t) * R * 0.45;
}

/* ---------- boot ---------- */
function boot(data) {
  cv = $('#cv'); ctx = cv.getContext('2d');
  loadSettings();
  resizeCanvas();
  setupInput(); setupDock(); setupMenus(); setupDelegates(); initMenuFX();
  requestAnimationFrame(frame);
  $('#mbContinue').hidden = !loadSave();
  let restored = false;
  if (data && data.save && data.screen === 'game') {
    try { G = JSON.parse(data.save); G.viewAll = false; GEN++; enterGame(); restored = true; } catch (e) { restored = false; }
  }
  if (!restored) runDemo();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (UIState.screen === 'setup') renderSetup(); });
  window.addEventListener('pagehide', () => { if (UIState.screen === 'game' && !UIState.busy) saveGame(); });
}
try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ save: G && !G.allAI && !G.over && UIState.screen === 'game' ? JSON.stringify(G) : null, screen: UIState.screen })); } catch (e) { /* hot reload unavailable */ }
(function start() {
  const go = (d) => boot(d || {});
  try {
    if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(go);
    else go(window.claude && window.claude.hot ? window.claude.hot.data : null);
  } catch (e) { go(null); }
})();

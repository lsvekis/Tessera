/* =====================================================================
   Part 6a: UI — helpers, icons, top bar, selection panels
   ===================================================================== */
const $ = (s) => document.querySelector(s);
const UIState = { sel: null, busy: false, armed: null, screen: 'menu', reach: null, modal: false,
  opts: { tribe: 'verdant', opponents: 3, size: 'medium', difficulty: 'normal', mode: 'domination' },
  settings: { speed: 1, warnReady: true, follow: true, sound: true, music: true }, loading: false };
const ICON = {
  food: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22V9" stroke="#c77a2e" stroke-width="2" fill="none" stroke-linecap="round"/><g fill="#ff9a57"><ellipse cx="8.8" cy="8.5" rx="2.3" ry="3.5" transform="rotate(-28 8.8 8.5)"/><ellipse cx="15.2" cy="8.5" rx="2.3" ry="3.5" transform="rotate(28 15.2 8.5)"/><ellipse cx="8.6" cy="14" rx="2.3" ry="3.5" transform="rotate(-28 8.6 14)"/><ellipse cx="15.4" cy="14" rx="2.3" ry="3.5" transform="rotate(28 15.4 14)"/><ellipse cx="12" cy="4.4" rx="2.1" ry="3.1"/></g></svg>',
  wood: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="7.5" width="17" height="9.5" rx="4.7" fill="#a86e3c"/><rect x="1.5" y="7.5" width="17" height="4" rx="2" fill="#d39a62"/><ellipse cx="18.3" cy="12.2" rx="3.8" ry="4.7" fill="#f2c892" stroke="#7a4d22" stroke-width="1.4"/><ellipse cx="18.3" cy="12.2" rx="1.5" ry="2" fill="none" stroke="#b07a42" stroke-width="1.1"/></svg>',
  gold: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12.6" r="9.4" fill="#d99a12"/><circle cx="12" cy="11.4" r="8.8" fill="#ffd54a"/><circle cx="12" cy="11.4" r="5.6" fill="none" stroke="#e0a91b" stroke-width="1.7"/><path d="M7.6 7.8a5.4 5.4 0 0 1 4.2-2.2" stroke="#fff6c8" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'
};
const DOCK_ICONS = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  stats: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M12 20V4M19 20v-6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  tech: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7.2 15h9.6" stroke="currentColor" stroke-width="2"/></svg>',
  armory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 16 8M14 4h6v6M6.5 14.5l3 3M4 17l3 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  market: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM8 21h8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  codex: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  log: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h11v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2h11v2M7 4a2 2 0 0 0-2 2v10M10 8h5M10 12h5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>'
};
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function costHTML(cost, ti) {
  const r = ti >= 0 ? G.tribes[ti].res : null;
  const parts = RES.filter(k => cost && cost[k]).map(k => `<span class="${r && r[k] < cost[k] ? 'lack' : ''}">${ICON[k]}${cost[k]}</span>`);
  return parts.length ? `<span class="cost">${parts.join('')}</span>` : '<span class="cost">Free</span>';
}
function ownerTag(ti) {
  if (ti < 0) return '<span class="owner"><i style="background:#9b8a70"></i>Neutral</span>';
  const t = G.tribes[ti];
  return `<span class="owner"><i style="background:${t.color}"></i>${esc(t.name)}${ti === G.human && !G.allAI ? ' (you)' : ''}</span>`;
}
function typeChip(type, cls, extra) { return `<span class="chip ${cls || ''}"><img src="${glyphIcon(type, '#2b3a6c', '#fff')}" alt="">${UNITS[type].name}${extra ? ' ' + extra : ''}</span>`; }
function strongList(type) { const C = COUNTERS[type] || {}; return Object.keys(C).filter(k => C[k] > 1 && UNITS[k]); }
function weakList(type) {
  const C = COUNTERS[type] || {}, out = new Set(Object.keys(C).filter(k => C[k] < 1 && UNITS[k]));
  for (const k in COUNTERS) if ((COUNTERS[k] || {})[type] > 1) out.add(k);
  return [...out];
}

/* ---------- top bar ---------- */
function renderTopbar() {
  if (!G || G.allAI) return;
  const tr = G.tribes[G.human], inc = computeIncome(G.human);
  for (const r of RES) {
    const el = document.getElementById('r' + r[0].toUpperCase() + r.slice(1));
    el.innerHTML = `${ICON[r]}<b>${tr.res[r]}</b><em>+${inc[r]}</em>`;
    el.setAttribute('aria-label', `${RES_NAME[r]} ${tr.res[r]}, plus ${inc[r]} per turn`);
  }
  $('#tbTurn').textContent = G.turn + (G.turnLimit ? ' / ' + G.turnLimit : '');
  $('#tbScore').textContent = scoreOf(G.human).toLocaleString();
  const ready = isHumanTurn() ? unitsOf(G.human).filter(unitReady).length : 0;
  const pill = $('#readyN'); pill.textContent = ready; pill.classList.toggle('zero', ready === 0);
  $('#bEnd').classList.toggle('pulse', isHumanTurn() && ready === 0);
  $('#bEnd').disabled = !isHumanTurn();
}
function renderCrest() {
  const tr = G.tribes[G.human], T = TRIBES[tr.key];
  $('#tbCrest').style.borderColor = tr.key === 'frostholm' ? '#dfe8f0' : tr.color;
  $('#tbCrest').innerHTML = `<img src="${tribePortrait(tr.key)}" alt="">`;
  $('#tbName').textContent = tr.name;
  $('#tbAbility').textContent = T.ability + ' — ' + T.abilityText;
}

/* ---------- selection ---------- */
function selectUnit(u) { UIState.sel = { kind: 'unit', id: u.id }; UIState.armed = null; refreshSel(); sfx('select'); }
function selectCity(c) { UIState.sel = { kind: 'city', id: c.id }; UIState.armed = null; refreshSel(); sfx('select'); }
function selectTile(i) { UIState.sel = { kind: 'tile', i }; UIState.armed = null; refreshSel(); }
function clearSel() { UIState.sel = null; UIState.armed = null; refreshSel(); }
function refreshSel() {
  HL.moves = null; HL.attacks = []; HL.converts = []; HL.path = null; HL.cityTerr = -1; HL.sel = -1; UIState.reach = null;
  const s = UIState.sel;
  if (s && G) {
    if (s.kind === 'unit') {
      const u = unitById(s.id);
      if (!u) { UIState.sel = null; return refreshSel(); }
      HL.sel = idx(u.x, u.y);
      if (isHumanTurn() && u.owner === G.human) {
        if (canMoveNow(u)) { HL.moves = moveTargets(u); UIState.reach = reachable(u); }
        if (canAttackNow(u)) HL.attacks = attackTargets(u).map(e => e.id);
        if (UNITS[u.type].converter && !u.done && !u.attacked) HL.converts = monkConvertTargets(u).map(e => e.id);
      }
    } else if (s.kind === 'city') {
      const c = G.cities[s.id]; HL.sel = idx(c.x, c.y); if (c.owner >= 0) HL.cityTerr = c.id;
    } else HL.sel = s.i;
  }
  renderPanel(); renderTopbar();
}

/* ---------- panels ---------- */
function renderPanel() {
  const p = $('#panel'), s = UIState.sel;
  if (!s || !G || G.allAI) { p.hidden = true; return; }
  let html = '';
  if (s.kind === 'unit') { const u = unitById(s.id); if (!u) { p.hidden = true; return; } html = unitPanel(u); }
  else if (s.kind === 'city') html = cityPanel(G.cities[s.id]);
  else html = tilePanel(s.i);
  p.innerHTML = html; p.hidden = false;
}
function unitStatus(u) {
  const T = UNITS[u.type];
  if (!isHumanTurn()) return ['Waiting for your turn', true];
  if (u.done) return ['Done for this turn', true];
  if (u.canEscape) return ['Attacked — can still retreat (Escape)', false];
  if (!u.moved && !u.attacked) return [T.dash ? 'Ready — move, then attack' : 'Ready — fire OR move this turn', false];
  if (canAttackNow(u)) { const n = attackTargets(u).length; return [n ? `Can still attack (${n} target${n > 1 ? 's' : ''} in range)` : 'Moved — no targets in range', !n]; }
  return ['Done for this turn', true];
}
function combatBlock(u, e) {
  const p = combatPreview(u, e), an = UNITS[u.type].name, en = UNITS[e.type].name;
  const tags = [];
  if (p.mA > 1) tags.push(`<div class="tag-strong">${an} is strong vs ${en} (×${p.mA} attack)</div>`);
  if (p.mA < 1) tags.push(`<div class="tag-weak">${an} is weak vs ${en} (×${p.mA} attack)</div>`);
  if (p.mD > 1) tags.push(`<div class="tag-weak">${en} is strong vs ${an} (×${p.mD} defence)</div>`);
  if (p.mD < 1) tags.push(`<div class="tag-strong">${en} is weak vs ${an} (×${p.mD} defence)</div>`);
  if (p.db.m > 1) tags.push(`<div>${en} defence ×${p.db.m} (${p.db.why})</div>`);
  if (!p.kills && p.ret === 0 && p.dist > p.sd.rng) tags.push('<div>No counter-attack: you are out of their range</div>');
  return `<div class="duel"><div class="side"><small>You deal</small><b style="color:#ff8f8f">${p.dmg}</b><small>${en} ${e.hp} → ${Math.max(0, e.hp - p.dmg)}</small></div><div class="vsx">VS</div>
    <div class="side"><small>You take</small><b style="color:${p.ret ? '#ffc94a' : '#8ff0b8'}">${p.ret}</b><small>${an} ${u.hp} → ${Math.max(0, u.hp - p.ret)}</small></div></div>
    ${p.kills ? '<div class="tag-strong">This attack destroys the enemy</div>' : ''}${p.dies ? '<div class="tag-weak">Your unit would die in the counter-attack</div>' : ''}${tags.join('')}`;
}
function unitPanel(u) {
  const T = UNITS[u.type], st = unitStats(u), own = u.owner === G.human, f = u.hp / st.maxHp;
  const db = defenseBonus(u, u.x, u.y);
  const baseA = T.atk, baseD = T.def;
  const aNote = st.boat ? 'boat' : st.atk > baseA ? `+${fmt1(st.atk - baseA)} bonus` : '';
  const dNote = [st.def > baseD && !st.boat ? `+${fmt1(st.def - baseD)}` : '', db.m > 1 ? `×${db.m} ${db.why.toLowerCase()}` : ''].filter(Boolean).join(' ');
  let h = `<div class="p-head"><img src="${unitPortrait(u.type, u.owner, st.boat)}" alt=""><div class="t"><h3>${T.name}${st.boat ? ' <small style="font:14px var(--fb);color:var(--muted)">in a boat</small>' : ''}</h3>
    <div class="sub">${CLASS_NAME[T.cls]} · ${T.role}</div>${ownerTag(u.owner)}</div><button class="p-close" data-act="close" aria-label="Close panel">×</button></div>
    <div class="hp"><div class="lab"><span>Health</span><b>${u.hp} / ${st.maxHp}</b></div><div class="bar"><i style="width:${Math.max(0, f) * 100}%;background:${hpColor(f)}"></i></div></div>
    <div class="statgrid"><div class="stat"><small>Attack</small><b>${fmt1(st.atk)}</b><em>${aNote}</em></div><div class="stat"><small>Defence</small><b>${fmt1(st.def)}</b><em>${dNote}</em></div>
    <div class="stat"><small>Move</small><b>${st.mov}</b><em>${T.escape ? 'escape' : T.persist ? 'persist' : ''}</em></div><div class="stat"><small>Range</small><b>${st.rng}</b><em>${st.rng > 1 ? 'ranged' : 'melee'}</em></div></div>`;
  if (own && !G.allAI && UIState.armed) {
    const e = unitById(UIState.armed);
    if (e) h += `<div class="plate cut" style="padding:10px;background:rgba(255,93,108,.1)"><div class="sec" style="margin-bottom:6px">Attack forecast</div>${combatBlock(u, e)}<div class="acts" style="margin-top:8px"><button class="btn danger wide" data-act="confirmAttack">Attack ${UNITS[e.type].name}</button></div></div>`;
  }
  const stars = '★'.repeat(u.rank) + '☆'.repeat(3 - u.rank);
  h += `<div class="kv"><dt>Rank</dt><dd><span style="color:var(--gold)">${stars}</span> · +${fmt1(u.rank * 0.5)} ATK/DEF, +${u.rank * 2} HP</dd><dt>Experience</dt><dd>${u.xp} / ${XP_TO_PROMOTE} kills to a free promotion · ${u.kills} total kills</dd></div>`;
  const sl = strongList(u.type), wl = weakList(u.type);
  h += `<div class="vs"><div class="row"><span class="k tag-strong">Strong vs</span>${sl.length ? sl.map(k => typeChip(k, 'good', '×' + COUNTERS[u.type][k])).join('') : '<span class="note">No special bonus — an all-rounder</span>'}${u.type === 'catapult' ? '<span class="chip good">Units in cities ×1.5</span>' : ''}</div>
    <div class="row"><span class="k tag-weak">Weak vs</span>${wl.length ? wl.map(k => typeChip(k, 'bad')).join('') : '<span class="note">Nothing in particular</span>'}</div></div>`;
  if (own && !G.allAI) {
    const [stTxt, stDone] = unitStatus(u);
    h += `<div class="status ${stDone ? 'done' : ''}">${stTxt}</div>`;
    if (isHumanTurn()) {
      const acts = [];
      if (canCapture(u)) { const c = cityAt(u.x, u.y); acts.push(`<button class="btn primary wide" data-act="capture">Capture ${c.owner < 0 ? 'village' : esc(c.name)}<small>Uses this unit's turn</small></button>`); }
      else { const c = cityAt(u.x, u.y); if (c && c.owner !== u.owner) h += '<p class="note warn">Stay here — you can capture this city at the start of your next turn if the unit survives.</p>'; }
      if (T.healer) {
        const ht = monkHealTargets(u);
        acts.push(`<button class="btn wide" data-act="monkHeal" ${!u.done && !u.attacked && ht.length ? '' : 'disabled'}>Heal adjacent allies (${ht.length})<small>+${4 + (tribeKey(u.owner) === 'umbral' ? 2 : 0)} HP each</small></button>`);
        if (HL.converts.length) h += '<p class="note">Tap a purple-outlined enemy next to your Monk to convert it.</p>';
      }
      const hAmt = healAmount(u);
      acts.push(`<button class="btn" data-act="recover" ${canRecover(u) ? '' : 'disabled'}>Recover +${hAmt} HP<small>${u.hp >= st.maxHp ? 'Full health' : canRecover(u) ? 'Ends turn' : 'Only before moving'}</small></button>`);
      const phc = paidHealCost(u);
      acts.push(`<button class="btn" data-act="paidHeal" ${canPaidHeal(u) && canAfford(G.human, { gold: phc }) ? '' : 'disabled'}>Heal to full<small>${u.hp >= st.maxHp ? 'Full health' : tile(u.x, u.y).owner !== u.owner ? 'In your territory' : phc + ' gold · keeps turn'}</small></button>`);
      if (u.rank < 3) {
        const rc = rankCost(u), free = u.xp >= XP_TO_PROMOTE;
        const ok = canRankUp(u) && (free || canAfford(G.human, rc));
        acts.push(`<button class="btn ${free ? 'primary' : ''}" data-act="rankUp" ${ok ? '' : 'disabled'}>${free ? 'Promote free' : 'Upgrade rank'} ★${u.rank + 1}<small>${free ? 'Full heal + stats' : !canRankUp(u) ? 'In your territory' : costStr(rc)}</small></button>`);
      } else acts.push('<button class="btn" disabled>Max rank ★★★<small>Fully upgraded</small></button>');
      acts.push(`<button class="btn" data-act="skip" ${u.done ? 'disabled' : ''}>Skip<small>Done for this turn</small></button>`);
      acts.push(`<button class="btn ghost wide" data-act="disband">Disband unit</button>`);
      h += `<div class="acts">${acts.join('')}</div>`;
    }
  } else if (!own) {
    const mine = TRAINABLE.filter(k => (COUNTERS[k] || {})[u.type] > 1);
    h += `<div class="vs"><div class="row"><span class="k">Counter with</span>${mine.map(k => typeChip(k, hasTech(G.human, UNITS[k].tech) || !UNITS[k].tech ? 'good' : '')).join('') || '<span class="note">Raw strength or numbers</span>'}</div></div>`;
  }
  return h;
}
function cityIncomeHTML(c) {
  const inc = computeIncome(c.owner), p = inc.per.get(c.id);
  if (!p) return '';
  return `<div class="kv"><dt>Gold per turn</dt><dd class="cost"><span>${ICON.gold} +${p.base + p.sites}</span></dd><dt>Made up of</dt><dd>City ${p.base} · Buildings ${p.sites || '0 — click a tile in your borders to build'}</dd></div>`;
}
function cityPanel(c) {
  if (c.owner < 0) {
    const u = unitAt(c.x, c.y);
    return `<div class="p-head"><div class="t"><h3>Village</h3><div class="sub">Neutral settlement</div>${ownerTag(-1)}</div><button class="p-close" data-act="close" aria-label="Close panel">×</button></div>
      <p class="note">Move a unit onto the village. At the start of your next turn it can <b>Capture</b> it and the village becomes a new city with its own territory, income and unit slots.</p>
      ${u && u.owner === G.human ? '<p class="note warn">Your unit is here — select it to capture when ready.</p>' : ''}`;
  }
  const own = c.owner === G.human && !G.allAI, tr = G.tribes[c.owner], need = levelNeed(c);
  let h = `<div class="p-head"><span class="crest" style="background:${tr.color};width:40px;height:40px;margin:6px"><b style="transform:rotate(-45deg);font:18px var(--fd);color:${isLightTribe(c.owner) ? '#15203a' : '#fff'}">${c.level}</b></span>
    <div class="t"><h3>${esc(c.name)}</h3><div class="sub">${c.capital ? 'Capital · ' : ''}Level ${c.level} city${c.walls ? ' · Walls' : ''}</div>${ownerTag(c.owner)}</div><button class="p-close" data-act="close" aria-label="Close panel">×</button></div>
    <div class="hp"><div class="lab"><span>Population to level ${c.level + 1}</span><b>${c.pop} / ${need}</b></div><div class="bar"><i style="width:${c.pop / need * 100}%;background:#6fd3ff"></i></div></div>`;
  h += cityIncomeHTML(c);
  if (!own) {
    h += `<p class="note">To capture: defeat the defenders, move a unit onto the city and keep it alive until your next turn, then press Capture.${c.walls ? ' Walls give defenders ×2.5 defence — bring Catapults.' : ''}</p>`;
    return h;
  }
  if (c.rewards.length) h += `<button class="btn primary" data-act="openReward" data-city="${c.id}">Choose level-up reward</button>`;
  const cap = cityCapacity(c), n = cityUnitCount(c);
  h += `<div class="kv"><dt>Unit slots</dt><dd>${n} / ${cap} used${n >= cap ? ' — grow the city for more' : ''}</dd></div>`;
  if (isHumanTurn()) {
    const wc = wallsCheck(c);
    if (!c.walls) h += `<div class="acts"><button class="btn wide" data-act="walls" ${wc.ok ? '' : 'disabled'}>Build city walls (×2.5 defence)<small>${wc.ok ? costStr(ACTIONS_COST.walls) : wc.reason}</small></button></div>`;
    h += '<div class="sec">Train units</div><div class="train">';
    for (const type of TRAINABLE) {
      const T = UNITS[type], chk = trainCheck(c, type);
      const locked = T.tech && !hasTech(G.human, T.tech);
      if (locked && TECHS[T.tech].tier === 3 && !hasTech(G.human, TECHS[T.tech].parent)) continue;
      const sl = strongList(type).map(k => UNITS[k].name).join(', ');
      h += `<button class="tu ${chk.ok ? '' : 'off'}" data-act="train" data-type="${type}" ${chk.ok ? '' : 'aria-disabled="true"'}>
        <img src="${unitPortrait(type, G.human)}" alt=""><span><b>${T.name}</b><small>${sl ? 'Strong vs ' + sl : T.role}</small>${chk.ok ? '' : `<small class="why">${chk.reason}</small>`}</span>
        <span class="st">HP ${T.hp} · A${fmt1(T.atk)} D${T.def}<br>M${T.mov} R${T.rng}<br>${costHTML(unitCost(G.human, type), G.human)}</span></button>`;
    }
    h += '</div>';
  }
  return h;
}
function tilePanel(i) {
  const t = G.tiles[i], x = tx(i), y = ty(i);
  if (!viewExplored(i)) return `<div class="p-head"><div class="t"><h3>Unexplored</h3><div class="sub">Send a unit to reveal this area</div></div><button class="p-close" data-act="close" aria-label="Close panel">×</button></div>`;
  const B = t.biome, city = t.terr >= 0 ? G.cities[t.terr] : null;
  let h = `<div class="p-head"><div class="t"><h3>${TERRAIN[t.t].name}</h3><div class="sub">${t.res ? RESOURCES[t.res].name + ' · ' : ''}${t.ruin ? 'Ancient ruins · ' : ''}${B[0].toUpperCase() + B.slice(1)} land</div>${ownerTag(t.owner)}</div><button class="p-close" data-act="close" aria-label="Close panel">×</button></div>`;
  const facts = [];
  if (city && city.owner >= 0) facts.push(`<dt>Territory of</dt><dd>${esc(city.name)}</dd>`);
  if (t.site && SITES[t.site.type]) {
    const o = siteOutput(t, i), S = SITES[t.site.type];
    facts.push(`<dt>Building</dt><dd>${S.name} · Level ${t.site.lvl} of ${SITE_MAX}</dd>`);
    if (o) facts.push(`<dt>Makes</dt><dd class="cost"><span>${ICON.gold} +${o.v} gold per turn</span></dd>`);
  }
  if (t.res) facts.push(`<dt>Resource</dt><dd>${RESOURCES[t.res].desc}</dd>`);
  if (t.road) facts.push('<dt>Road</dt><dd>Faster movement</dd>');
  if (t.ruin) facts.push('<dt>Ruins</dt><dd>Move a unit here to explore them</dd>');
  if (facts.length) h += `<dl class="kv">${facts.join('')}</dl>`;
  if (!G.allAI && isHumanTurn()) {
    const opts = tileOptions(G.human, x, y);
    if (opts.length) {
      h += '<div class="sec">Build &amp; improve</div><div class="opts">';
      for (const o of opts) h += `<button class="opt-row ${o.ok ? '' : 'off'}" data-act="tile" data-id="${o.id}" data-i="${i}" ${o.ok ? '' : 'aria-disabled="true"'}><span><b>${o.label}</b><small>${o.desc}</small>${o.ok ? '' : `<small class="why">${o.reason}</small>`}</span>${costHTML(o.cost, G.human)}</button>`;
      h += '</div>';
    } else if (t.owner !== G.human) h += '<p class="note">Only tiles inside your borders can be developed. Capture villages and grow cities to expand your territory.</p>';
  }
  return h;
}

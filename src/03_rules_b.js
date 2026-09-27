/* =====================================================================
   Part 3b: actions, economy (gold only), cities, research, upgrades, turns
   ===================================================================== */
function canAfford(ti, c) { const r = G.tribes[ti].res; return RES.every(k => (r[k] || 0) >= (c[k] || 0)); }
function pay(ti, c) { const r = G.tribes[ti].res; for (const k of RES) r[k] -= (c[k] || 0); if (typeof onResources === 'function') onResources(); }
function gain(ti, c) { const r = G.tribes[ti].res; for (const k of RES) r[k] += (c[k] || 0); if (typeof onResources === 'function') onResources(); }
function missingStr(ti, c) {
  const r = G.tribes[ti].res;
  return RES.filter(k => (c[k] || 0) > r[k]).map(k => `${(c[k] - r[k])} more ${k}`).join(', ');
}
function goldCost(n) { return { gold: Math.max(0, Math.round(n)) }; }

/* ---------- units ---------- */
function spawnUnit(type, ti, x, y, home, done) {
  const u = { id: G.nextUnitId++, type, owner: ti, x, y, hp: 1, rank: 0, xp: 0, kills: 0, home,
    moved: !!done, attacked: !!done, done: !!done, canEscape: false, paidHeal: false };
  G.units.push(u); UIDX.set(u.id, u); OCC[idx(x, y)] = u.id;
  u.hp = maxHpOf(u);
  return u;
}
function removeUnit(u) {
  G.units = G.units.filter(o => o !== u);
  UIDX.delete(u.id);
  if (OCC[idx(u.x, u.y)] === u.id) OCC[idx(u.x, u.y)] = 0;
}
function killUnit(v, byTi) {
  G.tribes[v.owner].losses++; removeUnit(v); FX('death', { u: v, by: byTi });
  /* Pumpkin Hollow "Trick or Treat": every defeated enemy drops gold */
  if (byTi >= 0 && byTi !== v.owner && tribeKey(byTi) === 'pumpkin') { gain(byTi, goldCost(3)); FX('bounty', { x: v.x, y: v.y, ti: byTi, gold: 3 }); }
}
function placeUnitAt(u, x, y) { OCC[idx(u.x, u.y)] = 0; u.x = x; u.y = y; OCC[idx(x, y)] = u.id; }
function unitCost(ti, type) {
  let g = (UNITS[type].cost || {}).gold || 0;
  const k = tribeKey(ti);
  return goldCost(Math.max(1, g));
}

function doMove(u, di) {
  if (!canMoveNow(u) || OCC[di]) return null;
  const reach = reachable(u);
  if (!reach.has(di) || di === idx(u.x, u.y)) return null;
  const path = pathTo(reach, di).map(i => [tx(i), ty(i)]);
  placeUnitAt(u, tx(di), ty(di));
  if (u.canEscape) { u.canEscape = false; u.done = true; } else u.moved = true;
  if (!UNITS[u.type].dash) u.done = true;
  reveal(u.owner, u.x, u.y, unitStats(u).vis);
  FX('move', { u, path });
  const t = tile(u.x, u.y);
  if (t.ruin) exploreRuin(u);
  return path;
}

function doAttack(u, d) {
  if (!canAttackNow(u) || !attackTargets(u).includes(d)) return null;
  const p = combatPreview(u, d);
  const res = { a: u, d, dmg: p.dmg, ret: 0, killed: false, died: false, ax: u.x, ay: u.y, dx: d.x, dy: d.y,
    ranged: p.dist > 1, aType: u.type, dType: d.type, aOwner: u.owner, dOwner: d.owner, mA: p.mA };
  u.attacked = true; u.moved = true;
  d.hp -= p.dmg;
  if (d.hp <= 0 && p.saved) { d.hp = 1; G.tribes[d.owner].nineRound = G.turn; res.saved = true; FX('ninelives', { u: d }); }
  else if (d.hp <= 0) {
    res.killed = true;
    killUnit(d, u.owner);
    u.xp++; u.kills++; G.tribes[u.owner].kills++;
    const T = UNITS[u.type];
    if (p.dist === 1 && T.rng === 1 && !p.sa.boat && passable(u.owner, tile(res.dx, res.dy)) && !OCC[idx(res.dx, res.dy)]) {
      placeUnitAt(u, res.dx, res.dy); res.advanced = true;
      reveal(u.owner, u.x, u.y, unitStats(u).vis);
    }
  } else if (p.ret > 0) {
    u.hp -= p.ret; res.ret = p.ret;
    if (u.hp <= 0) { res.died = true; killUnit(u, d.owner); d.xp++; d.kills++; G.tribes[d.owner].kills++; }
  }
  if (!res.died) {
    const T = UNITS[u.type];
    if (T.persist && res.killed) u.attacked = false;
    else if (T.escape && !p.sa.boat) u.canEscape = true;
    else u.done = true;
  }
  FX('attack', res);
  return res;
}

function doCapture(u) {
  if (!canCapture(u)) return false;
  const c = cityAt(u.x, u.y), prev = c.owner, ti = u.owner;
  c.owner = ti;
  if (prev === -1) {
    c.name = newCityName(ti);
    claimTerritory(c, 1);
    logMsg(`${G.tribes[ti].name} founded ${c.name}`, ti, 'capture');
  } else {
    for (const t of G.tiles) if (t.terr === c.id) t.owner = ti;
    for (const o of G.units) if (o.home === c.id) o.home = -1;
    if (c.capital) {
      c.capital = false;
      const rest = citiesOf(prev).sort((a, b) => b.level - a.level);
      if (rest.length) rest[0].capital = true;
    }
    logMsg(`${G.tribes[ti].name} captured ${c.name} from ${G.tribes[prev].name}!`, ti, 'capture');
  }
  u.done = true; u.moved = true; u.attacked = true;
  G.tribes[ti].captures++;
  if (tribeKey(ti) === 'liberty') { gain(ti, goldCost(6)); FX('bounty', { x: c.x, y: c.y, ti, gold: 6 }); }
  reveal(ti, c.x, c.y, c.radius + 1);
  FX('capture', { city: c, prev, ti });
  if (prev >= 0 && citiesOf(prev).length === 0) eliminate(prev, ti);
  checkVictory();
  return true;
}

function eliminate(ti, by) {
  const tr = G.tribes[ti];
  if (!tr.alive) return;
  tr.alive = false;
  for (const u of G.units.filter(o => o.owner === ti)) removeUnit(u);
  logMsg(`${tr.name} has been destroyed by ${G.tribes[by].name}!`, by, 'elim');
  FX('eliminated', { ti, by });
}
function checkVictory() {
  if (G.over) return;
  const alive = G.tribes.filter(t => t.alive);
  if (!G.allAI && !G.tribes[G.human].alive) { G.over = true; G.winner = alive.length ? bestScoreTribe() : -1; FX('gameover', {}); return; }
  if (alive.length === 1) { G.over = true; G.winner = alive[0].i; FX('gameover', {}); }
}
function bestScoreTribe() {
  let best = -1, bs = -1;
  for (const t of G.tribes) if (t.alive) { const s = scoreOf(t.i); if (s > bs) { bs = s; best = t.i; } }
  return best;
}

function doRecover(u) {
  if (!canRecover(u)) return false;
  const before = u.hp;
  u.hp = Math.min(maxHpOf(u), u.hp + healAmount(u));
  u.done = true; u.moved = true; u.attacked = true;
  FX('heal', { u, amount: u.hp - before });
  return true;
}
function doPaidHeal(u) {
  if (!canPaidHeal(u)) return false;
  const c = { gold: paidHealCost(u) };
  if (!canAfford(u.owner, c)) return false;
  pay(u.owner, c);
  const before = u.hp; u.hp = maxHpOf(u); u.paidHeal = true;
  FX('heal', { u, amount: u.hp - before });
  return true;
}
function doRankUp(u) {
  if (!canRankUp(u)) return false;
  const free = u.xp >= XP_TO_PROMOTE;
  if (!free) { const c = rankCost(u); if (!canAfford(u.owner, c)) return false; pay(u.owner, c); }
  u.rank++;
  if (free) { u.xp -= XP_TO_PROMOTE; u.hp = maxHpOf(u); } else u.hp = Math.min(maxHpOf(u), u.hp + RANK_BONUS.hp);
  FX('rankup', { u, free });
  return true;
}
function doMonkHeal(u) {
  const list = monkHealTargets(u);
  if (!UNITS[u.type].healer || u.done || u.attacked || !list.length) return false;
  const amt = 4 + (tribeKey(u.owner) === 'umbral' ? 2 : 0);
  for (const o of list) { const b = o.hp; o.hp = Math.min(maxHpOf(o), o.hp + amt); FX('heal', { u: o, amount: o.hp - b }); }
  u.attacked = true; u.moved = true; u.done = true;
  return true;
}
function doConvert(u, target) {
  if (!UNITS[u.type].converter || u.done || u.attacked || !monkConvertTargets(u).includes(target)) return false;
  const prev = target.owner;
  target.owner = u.owner; target.home = -1; target.moved = target.attacked = target.done = true;
  u.attacked = true; u.moved = true; u.done = true;
  G.tribes[prev].losses++;
  logMsg(`${G.tribes[u.owner].name} converted a ${UNITS[target.type].name} from ${G.tribes[prev].name}`, u.owner, 'convert');
  FX('convert', { u, target, prev });
  return true;
}
function doDisband(u) { removeUnit(u); FX('death', { u, by: -1 }); return true; }
function doSkip(u) { u.done = true; return true; }

/* ---------- ruins ---------- */
function exploreRuin(u) {
  const t = tile(u.x, u.y), ti = u.owner, tr = G.tribes[ti];
  t.ruin = false;
  const roll = rndInt(6);
  let text = '';
  if (roll === 0) { gain(ti, goldCost(10)); text = 'Ancient treasure: +10 gold'; }
  else if (roll === 1) { gain(ti, goldCost(12)); text = 'Forgotten vault: +12 gold'; }
  else if (roll === 2) {
    const avail = Object.keys(TECHS).filter(k => techState(ti, k) === 'available' && TECHS[k].tier <= 2);
    if (avail.length) { const k = pick(avail); tr.techs[k] = true; text = `Ancient scrolls: learned ${TECHS[k].name}`; onTechGained(ti, k); }
    else { gain(ti, goldCost(10)); text = 'Ancient treasure: +10 gold'; }
  } else if (roll === 3 && u.rank < 3) { u.rank++; u.hp = maxHpOf(u); text = `Training grounds: ${UNITS[u.type].name} ranked up`; }
  else if (roll === 4) { reveal(ti, u.x, u.y, 5); text = 'Watchtower: the land around is revealed'; }
  else {
    const spot = neighbors(u.x, u.y).find(([x, y]) => isLand(tile(x, y)) && !OCC[idx(x, y)] && passable(ti, tile(x, y)));
    if (spot) { spawnUnit('warrior', ti, spot[0], spot[1], -1, true); text = 'Lost tribe: a Warrior joins you'; }
    else { gain(ti, goldCost(8)); text = 'Ancient treasure: +8 gold'; }
  }
  logMsg(`${tr.name} explored ruins — ${text}`, ti, 'ruin');
  FX('ruin', { u, text, ti });
}

/* ---------- cities ---------- */
function cityCapacity(c) { return c.level + 1 + (hasTech(c.owner, 'leadership') ? 1 : 0); }
function cityUnitCount(c) { let n = 0; for (const u of G.units) if (u.home === c.id && u.owner === c.owner) n++; return n; }
/* New units appear on the city tile, or on a free tile next to it when a
   friendly unit is standing in the city. One unit per city per turn. */
function trainSpot(c) {
  if (!OCC[idx(c.x, c.y)]) return [c.x, c.y];
  const occ = unitAt(c.x, c.y);
  if (occ && occ.owner !== c.owner) return null;
  const spots = neighbors(c.x, c.y).filter(([x, y]) => { const t = tile(x, y); return isLand(t) && !OCC[idx(x, y)] && passable(c.owner, t); });
  spots.sort((a, b) => (tile(b[0], b[1]).owner === c.owner) - (tile(a[0], a[1]).owner === c.owner));
  return spots[0] || null;
}
function trainCheck(c, type) {
  const ti = c.owner, T = UNITS[type];
  if (T.tech && !hasTech(ti, T.tech)) return { ok: false, reason: `Research ${TECHS[T.tech].name}` };
  if (c.trainedTurn === G.turn) return { ok: false, reason: 'This city already trained a unit this turn' };
  if (cityUnitCount(c) >= cityCapacity(c)) return { ok: false, reason: 'Unit limit reached — grow the city' };
  if (!trainSpot(c)) return { ok: false, reason: 'No free tile in or next to the city' };
  const cost = unitCost(ti, type);
  if (!canAfford(ti, cost)) return { ok: false, reason: 'Need ' + missingStr(ti, cost) };
  return { ok: true };
}
function doTrain(c, type) {
  if (!trainCheck(c, type).ok) return null;
  pay(c.owner, unitCost(c.owner, type));
  const [x, y] = trainSpot(c);
  const u = spawnUnit(type, c.owner, x, y, c.id, true);
  c.trainedTurn = G.turn;
  FX('train', { u, city: c });
  return u;
}
function levelNeed(c) { return c.level + 1; }
function addPop(c, n) {
  if (!c || c.owner < 0) return;
  c.pop += n;
  while (c.pop >= levelNeed(c)) {
    c.pop -= levelNeed(c);
    c.level++;
    FX('levelup', { city: c });
    logMsg(`${c.name} grew to level ${c.level}`, c.owner, 'grow');
    const lv = Math.min(c.level, 5);
    if (G.tribes[c.owner].human) c.rewards.push(lv);
    else applyReward(c, aiPickReward(c, lv));
  }
}
function applyReward(c, id) {
  const ti = c.owner;
  if (id === 'workshop') c.workshop = true;
  else if (id === 'explorer') reveal(ti, c.x, c.y, 5);
  else if (id === 'walls') c.walls = true;
  else if (id === 'cache') gain(ti, goldCost(15));
  else if (id === 'boom') addPop(c, 3);
  else if (id === 'borders') { claimTerritory(c, 2); reveal(ti, c.x, c.y, 3); }
  else if (id === 'park') c.park++;
  else if (id === 'champion') {
    const spots = [[c.x, c.y]].concat(neighbors(c.x, c.y), neighbors(c.x, c.y, 2));
    const s = spots.find(([x, y]) => !OCC[idx(x, y)] && isLand(tile(x, y)) && passable(ti, tile(x, y)));
    if (s) spawnUnit('champion', ti, s[0], s[1], -1, true); else c.park++;
  }
  FX('reward', { city: c, id });
}
function chooseReward(c, id) {
  if (!c.rewards.length) return;
  const lv = c.rewards.shift();
  if (!CITY_REWARDS[lv].some(r => r.id === id)) return;
  applyReward(c, id);
}
function wallsCheck(c) {
  if (c.walls) return { ok: false, reason: 'Already walled' };
  if (!hasTech(c.owner, 'construction')) return { ok: false, reason: 'Research Construction' };
  if (!canAfford(c.owner, ACTIONS_COST.walls)) return { ok: false, reason: 'Need ' + missingStr(c.owner, ACTIONS_COST.walls) };
  return { ok: true };
}
function doBuyWalls(c) { if (!wallsCheck(c).ok) return false; pay(c.owner, ACTIONS_COST.walls); c.walls = true; FX('build', { x: c.x, y: c.y }); return true; }

/* ---------- buildings: every building makes gold and grows its city ---------- */
function siteGold(ti, type, lvl, t) {
  const S = SITES[type], k = tribeKey(ti);
  let v = S.out[lvl - 1];
  if (S.bonusRes && t && t.res === S.bonusRes) v += 1;
  if (type === 'mine' && k === 'ironvale') v += 1;
  if (type === 'lumber' && k === 'verdant') v += 1;
  if (type === 'fishery' && k === 'tidecallers') v += 1;
  return v;
}
function siteOutput(t, i) {
  if (!t.site || t.owner < 0 || !SITES[t.site.type]) return null;
  return { res: 'gold', v: siteGold(t.owner, t.site.type, t.site.lvl, t) };
}
function tileOptions(ti, x, y) {
  const t = tile(x, y), opts = [];
  if (!t || t.city >= 0) return opts;
  const own = t.owner === ti;
  const occ = unitAt(x, y);
  const blocked = occ && occ.owner !== ti;
  const push = (o) => {
    o.ok = true; o.reason = '';
    if (o.tech && !hasTech(ti, o.tech)) { o.ok = false; o.reason = `Research ${TECHS[o.tech].name}`; }
    else if (blocked) { o.ok = false; o.reason = 'Enemy unit on this tile'; }
    else if (!canAfford(ti, o.cost)) { o.ok = false; o.reason = 'Need ' + missingStr(ti, o.cost); }
    opts.push(o);
  };
  if (own) {
    if (!t.site) {
      for (const key in SITES) {
        const S = SITES[key];
        if (!S.on.includes(t.t) || (S.needRes && t.res !== S.needRes)) continue;
        push({ id: 'build:' + key, label: 'Build ' + S.name, cost: S.cost[0], tech: S.tech[0], kind: 'build', site: key,
          desc: `+${siteGold(ti, key, 1, t)} gold every turn · city grows` });
      }
      if (t.res === 'fruit') push({ id: 'forage', label: 'Forage Berries', cost: ACTIONS_COST.forage, tech: 'organization', kind: 'harvest', desc: 'The city grows (+1 population)' });
      if (t.res === 'game') push({ id: 'hunt', label: 'Hunt Game', cost: ACTIONS_COST.hunt, tech: 'hunting', kind: 'harvest', desc: 'The city grows (+1 population)' });
    } else if (SITES[t.site.type] && t.site.lvl < SITE_MAX) {
      const S = SITES[t.site.type], lv = t.site.lvl;
      push({ id: 'upgrade', label: `Upgrade ${S.name}`, cost: S.cost[lv], tech: S.tech[lv], kind: 'upgrade',
        desc: `${siteGold(ti, t.site.type, lv, t)} → ${siteGold(ti, t.site.type, lv + 1, t)} gold every turn · city grows` });
    }
  }
  if ((own || t.owner === -1) && isLand(t) && t.t !== 'mountain' && !t.road)
    push({ id: 'road', label: 'Build Road', cost: ACTIONS_COST.road, tech: 'roads', kind: 'road', desc: 'Faster movement. Roads linking a city to your capital add +1 gold.' });
  return opts;
}
function doTileAction(ti, x, y, id) {
  const o = tileOptions(ti, x, y).find(q => q.id === id);
  if (!o || !o.ok) return false;
  const t = tile(x, y), city = t.terr >= 0 ? G.cities[t.terr] : null;
  pay(ti, o.cost);
  if (o.kind === 'build') { t.site = { type: o.site, lvl: 1 }; addPop(city, 1); }
  else if (o.kind === 'upgrade') { t.site.lvl++; addPop(city, 1); }
  else if (o.kind === 'harvest') { t.res = null; addPop(city, 1); }
  else if (id === 'road') { t.road = true; }
  FX('build', { x, y, id });
  return true;
}

/* ---------- technology ---------- */
function techCost(ti, key) {
  const n = Math.max(1, citiesOf(ti).length);
  let k = 1;
  if (hasTech(ti, 'philosophy')) k *= 0.75;
  if (tribeKey(ti) === 'umbral') k *= 0.67;
  const tier = TECHS[key].tier;
  return goldCost(Math.ceil((5 + tier * (n + 1) * 1.6) * k));
}
function techState(ti, key) {
  if (hasTech(ti, key)) return 'done';
  const p = TECHS[key].parent;
  return !p || hasTech(ti, p) ? 'available' : 'locked';
}
function doResearch(ti, key) {
  if (techState(ti, key) !== 'available') return false;
  const c = techCost(ti, key);
  if (!canAfford(ti, c)) return false;
  pay(ti, c);
  G.tribes[ti].techs[key] = true;
  onTechGained(ti, key);
  FX('tech', { ti, key });
  return true;
}
function onTechGained(ti, key) {
  if (key === 'cartography') revealAll(ti);
}

/* ---------- army upgrades: three simple boosts for every unit you own ---------- */
function upgradeNext(ti, key) {
  const U = UPGRADES[key], lvl = upgradeLvl(ti, key);
  if (lvl >= UPGRADE_MAX) return null;
  const k = tribeKey(ti) === 'ironvale' ? 0.75 : 1;
  const cost = goldCost(Math.ceil(U.cost[lvl] * k));
  const ok = canAfford(ti, cost);
  return { lvl: lvl + 1, cost, ok, reason: ok ? '' : 'Need ' + missingStr(ti, cost) };
}
function doUpgrade(ti, key) {
  const n = upgradeNext(ti, key);
  if (!n || !n.ok) return false;
  pay(ti, n.cost);
  const tr = G.tribes[ti];
  const before = G.units.filter(u => u.owner === ti).map(u => [u, maxHpOf(u)]);
  if (!tr.upgrades) tr.upgrades = {};
  tr.upgrades[key] = n.lvl;
  for (const [u, m] of before) { const m2 = maxHpOf(u); if (m2 > m) u.hp += m2 - m; }
  FX('upgrade', { ti, key, lvl: n.lvl });
  return true;
}

/* ---------- income ---------- */
function roadNetwork(ti) {
  const set = new Set(), cap = capitalOf(ti);
  if (!cap) return set;
  const seen = new Uint8Array(G.size * G.size), q = [idx(cap.x, cap.y)];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), t = G.tiles[i];
    if (t.city >= 0) set.add(t.city);
    for (const [nx, ny] of neighbors(tx(i), ty(i))) {
      const ni = idx(nx, ny), nt = G.tiles[ni];
      if (seen[ni] || !(nt.road || nt.city >= 0) || !(nt.owner === ti || nt.owner === -1)) continue;
      seen[ni] = 1; q.push(ni);
    }
  }
  return set;
}
/* gold a city makes by itself each turn (buildings on its land are added separately) */
function cityBaseIncome(c, net) {
  const tr = G.tribes[c.owner];
  let gold = c.level + (c.capital ? 2 : 0) + (c.workshop ? 2 : 0) + 3 * c.park;
  if (hasTech(c.owner, 'trade')) gold += 1;
  if (!c.capital && net && net.has(c.id)) gold += 1;
  if (tr.key === 'northpole') gold += 1;
  if (c.capital && tr.perks && tr.perks.includes('tax')) gold += 1;
  return gold;
}
function computeIncome(ti) {
  const per = new Map();
  let cities = 0, sites = 0;
  const net = hasTech(ti, 'roads') ? roadNetwork(ti) : null;
  for (const c of G.cities) {
    if (c.owner !== ti) continue;
    const b = cityBaseIncome(c, net);
    per.set(c.id, { base: b, sites: 0 });
    cities += b;
  }
  G.tiles.forEach((t, i) => {
    if (t.owner !== ti || !t.site) return;
    const o = siteOutput(t, i); if (!o) return;
    sites += o.v;
    const p = per.get(t.terr); if (p) p.sites += o.v;
  });
  const mult = G.tribes[ti].human ? 1 : DIFFICULTY[G.difficulty].aiIncome;
  const gold = Math.round((cities + sites) * mult);
  return { gold, per, sites, cities, mult };
}

/* ---------- turn flow ---------- */
function refreshVision(ti) {
  for (const u of G.units) if (u.owner === ti) reveal(ti, u.x, u.y, unitStats(u).vis);
  for (const c of G.cities) if (c.owner === ti) reveal(ti, c.x, c.y, c.radius + 1);
}
function beginTurn(ti) {
  const tr = G.tribes[ti];
  const inc = computeIncome(ti);
  tr.res.gold += inc.gold;
  const repair = tr.key === 'cogworks';
  for (const u of G.units) if (u.owner === ti) {
    u.moved = u.attacked = u.done = u.canEscape = u.paidHeal = false;
    if (repair) u.hp = Math.min(maxHpOf(u), u.hp + 2);
  }
  refreshVision(ti);
  tr.turnsAlive++;
  tr.lastIncome = { gold: inc.gold };
  return inc;
}
function advanceTribe() {
  let i = G.current;
  for (let k = 0; k < G.tribes.length; k++) {
    i = (i + 1) % G.tribes.length;
    if (i === 0) G.turn++;
    if (G.tribes[i].alive) break;
  }
  G.current = i;
  if (G.turnLimit && G.turn > G.turnLimit && !G.over) {
    G.over = true; G.winner = bestScoreTribe(); FX('gameover', { glory: true });
  }
}

/* ---------- score ---------- */
function scoreOf(ti) {
  const tr = G.tribes[ti];
  if (!tr) return 0;
  let s = 0;
  for (const v of tr.explored) s += v;
  s = Math.round(s * 1.5);
  for (const c of G.cities) if (c.owner === ti) s += 100 + c.level * 50 + c.park * 250;
  for (const t of G.tiles) if (t.owner === ti) s += 5;
  for (const k in tr.techs) s += TECHS[k].tier * 40;
  for (const k in (tr.upgrades || {})) s += tr.upgrades[k] * 40;
  for (const u of G.units) if (u.owner === ti) s += u.type === 'champion' ? 60 : 10 + u.rank * 5;
  s += tr.kills * 10;
  return s;
}

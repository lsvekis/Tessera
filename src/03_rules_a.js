/* =====================================================================
   Part 3a: unit stats, movement, combat maths
   ===================================================================== */
let FX = () => {};                 // render hook: FX(type, data)
function logMsg(text, ti = -1, kind = '') {
  G.log.push({ t: G.turn, text, ti, kind });
  if (G.log.length > 80) G.log.shift();
  if (typeof onLog === 'function') onLog();
}

/* ---------- effective stats (army upgrades, ranks, tribe, boats) ---------- */
function upgradeLvl(ti, key) { const up = G.tribes[ti].upgrades; return (up && up[key]) || 0; }
function unitStats(u, atX, atY) {
  const T = UNITS[u.type], ti = u.owner, key = G.tribes[ti].key;
  const x = atX === undefined ? u.x : atX, y = atY === undefined ? u.y : atY;
  const t = tile(x, y), boat = !!t && !isLand(t);
  let atk = T.atk, def = T.def, mov = T.mov, rng = T.rng, maxHp = T.hp, vis = T.vis;
  /* army-wide upgrades bought with gold */
  if (atk > 0) atk += UPGRADES.attack.per * upgradeLvl(ti, 'attack');
  def += UPGRADES.defence.per * upgradeLvl(ti, 'defence');
  maxHp += UPGRADES.health.per * upgradeLvl(ti, 'health');
  if (u.type === 'rider' && hasTech(ti, 'horsemanship')) mov += 1;
  if (u.type === 'archer' && hasTech(ti, 'marksmanship')) rng += 1;
  /* tribe abilities */
  if (key === 'sunspear' && T.cls === 'mounted') atk += 0.5;
  if (key === 'rexlands' && T.cls === 'mounted') { mov += 1; maxHp += 3; }
  if (key === 'frostholm') maxHp += 2;
  if (key === 'liberty') vis += 1;
  if (key === 'maccabees') { if (u.type === 'warrior' || u.type === 'spearman' || u.type === 'swordsman') atk += 0.5; if (t && t.owner === ti) def += 0.5; }
  /* rank stars */
  if (atk > 0) atk += RANK_BONUS.atk * u.rank;
  def += RANK_BONUS.def * u.rank;
  maxHp += RANK_BONUS.hp * u.rank;
  if (boat) {
    const nav = hasTech(ti, 'navigation');
    atk = (nav ? 2 : 1) + 0.5 * u.rank; def = (nav ? 2 : 1) + 0.5 * u.rank; mov = nav ? 3 : 2; rng = 2;
  }
  if (hasTech(ti, 'cartography')) vis += 1;
  if (t && t.t === 'mountain') vis += 1;
  return { atk, def, mov, rng, maxHp, vis, boat };
}
/* Meowtopia "Nine Lives": once per round, the first knockout inside its borders leaves the unit on 1 HP */
function hasNineLives(u) { const tr = G.tribes[u.owner]; return tr.key === 'meowtopia' && tr.nineRound !== G.turn && UNITS[u.type].cls !== 'giant' && tile(u.x, u.y).owner === u.owner; }
function maxHpOf(u) { return unitStats(u).maxHp; }

function defenseBonus(u, x, y) {
  const t = tile(x, y);
  const c = t.city >= 0 ? G.cities[t.city] : null;
  if (c && c.owner === u.owner) return c.walls ? { m: 2.5, why: 'City walls' } : { m: 1.5, why: 'In city' };
  if (!isLand(t)) return { m: 1, why: '' };
  if (t.t === 'mountain') return { m: 1.5, why: 'Mountain' };
  if (t.t === 'forest') return hasTech(u.owner, 'archery') ? { m: 1.5, why: 'Forest' } : { m: 1.25, why: 'Forest' };
  return { m: 1, why: '' };
}
function counterMult(aType, dType, dInCity) {
  const C = COUNTERS[aType] || {};
  let m = C[dType] || 1;
  if (C.city && dInCity) m = Math.max(m, C.city);
  return m;
}

/* ---------- combat forecast (deterministic, shown to the player) ---------- */
function combatPreview(a, d, fromX, fromY) {
  if (fromX === undefined) { fromX = a.x; fromY = a.y; }
  const sa = unitStats(a, fromX, fromY), sd = unitStats(d);
  const dInCity = tile(d.x, d.y).city >= 0;
  const boats = sa.boat || sd.boat;
  const mA = boats ? 1 : counterMult(a.type, d.type, dInCity);
  const mD = boats ? 1 : counterMult(d.type, a.type, false);
  const db = defenseBonus(d, d.x, d.y);
  const atkE = sa.atk * mA, defE = sd.def * mD;
  const aF = atkE * (a.hp / sa.maxHp);
  const dF = defE * (d.hp / sd.maxHp) * db.m;
  const tot = aF + dF;
  let dmg = 0, ret = 0;
  if (atkE > 0 && tot > 0) dmg = Math.max(1, Math.round(aF / tot * atkE * 4.5));
  const dist = cheb(fromX, fromY, d.x, d.y);
  const ko = dmg >= d.hp, saved = ko && hasNineLives(d), kills = ko && !saved;
  if (!ko && tot > 0 && defE > 0 && dist <= sd.rng) ret = Math.round(dF / tot * defE * 4.5);
  const dies = ret >= a.hp;
  return { dmg, ret, kills, saved, dies, mA, mD, db, atkE, defE, sa, sd, dist };
}

/* ---------- movement ---------- */
function passable(ti, t) {
  if (!t) return false;
  if (t.t === 'mountain') return canClimb(ti);
  if (t.t === 'water') return canSail(ti);
  if (t.t === 'ocean') return hasTech(ti, 'navigation');
  return true;
}
function roadTile(ti, t) { return (t.road || t.city >= 0) && (t.owner === -1 || t.owner === ti); }
function adjEnemy(ti, x, y) {
  for (const [nx, ny] of neighbors(x, y)) { const o = unitAt(nx, ny); if (o && o.owner !== ti) return true; }
  return false;
}
/* Dijkstra over movement points. Forest/mountain, embarking and enemy
   zones of control stop movement; roads halve the cost. */
function reachable(u, ignoreZoc) {
  const st = unitStats(u), M = st.mov, ti = u.owner;
  const start = idx(u.x, u.y);
  const best = new Map();
  best.set(start, { c: 0, prev: -1, stop: false });
  const open = [[0, start]];
  const verdant = tribeKey(ti) === 'verdant';
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [c, ci] = open.splice(bi, 1)[0];
    const cur = best.get(ci);
    if (c > cur.c + 1e-9) continue;
    if (cur.stop) continue;
    const x = tx(ci), y = ty(ci), t0 = G.tiles[ci];
    for (const [nx, ny] of neighbors(x, y)) {
      const ni = idx(nx, ny), t = G.tiles[ni];
      if (!passable(ti, t)) continue;
      const o = unitAt(nx, ny);
      if (o && o.owner !== ti) continue;
      const road = roadTile(ti, t0) && roadTile(ti, t) && (t0.road || t.road);
      const step = road ? 0.5 : 1;
      const nc = c + step;
      if (nc > M + 1e-9) continue;
      let stop = false;
      if (isLand(t0) !== isLand(t)) stop = true;
      if (!road && (t.t === 'mountain' || (t.t === 'forest' && !verdant))) stop = true;
      if (!ignoreZoc && adjEnemy(ti, nx, ny)) stop = true;
      const prev = best.get(ni);
      if (!prev || nc < prev.c - 1e-9 || (Math.abs(nc - prev.c) < 1e-9 && prev.stop && !stop)) {
        best.set(ni, { c: nc, prev: ci, stop });
        open.push([nc, ni]);
      }
    }
  }
  return best;
}
function moveTargets(u) {
  if (!canMoveNow(u)) return new Map();
  const r = reachable(u);
  const out = new Map();
  for (const [i, v] of r) { if (i === idx(u.x, u.y)) continue; if (OCC[i]) continue; out.set(i, v); }
  return out;
}
function pathTo(reach, i) {
  const p = []; let cur = i;
  while (cur !== -1 && cur !== undefined) { p.push(cur); const n = reach.get(cur); cur = n ? n.prev : -1; }
  return p.reverse();
}

/* ---------- action availability ---------- */
function canMoveNow(u) { if (u.done) return false; if (u.canEscape) return true; return !u.moved && !u.attacked; }
function canAttackNow(u) {
  if (u.done || u.attacked) return false;
  if (u.moved && !UNITS[u.type].dash) return false;
  return unitStats(u).atk > 0;
}
function visibleTo(ti, x, y) { return !!G.tribes[ti].explored[idx(x, y)]; }
function attackTargets(u, fx, fy) {
  if (fx === undefined) { fx = u.x; fy = u.y; }
  const st = unitStats(u, fx, fy);
  if (st.atk <= 0) return [];
  const out = [];
  for (const e of G.units) {
    if (e.owner === u.owner) continue;
    if (cheb(fx, fy, e.x, e.y) > st.rng) continue;
    if (!visibleTo(u.owner, e.x, e.y)) continue;
    out.push(e);
  }
  return out;
}
function canCapture(u) {
  const c = cityAt(u.x, u.y);
  return !!c && c.owner !== u.owner && !u.moved && !u.attacked && !u.done;
}
function canRecover(u) { return !u.moved && !u.attacked && !u.done && u.hp < maxHpOf(u); }
function healAmount(u) {
  const t = tile(u.x, u.y);
  let h = t.owner === u.owner ? 4 : 2;
  if (hasTech(u.owner, 'meditation')) h += 2;
  if (tribeKey(u.owner) === 'frostholm') h += 2;
  return h;
}
function paidHealCost(u) {
  const miss = maxHpOf(u) - u.hp;
  return Math.max(1, Math.ceil(miss / 2));
}
function canPaidHeal(u) {
  const t = tile(u.x, u.y);
  return t.owner === u.owner && u.hp < maxHpOf(u) && !u.paidHeal;
}
function rankCost(u) {
  if (u.rank >= 3) return null;
  if (u.xp >= XP_TO_PROMOTE) return {};
  const k = hasTech(u.owner, 'leadership') ? 0.5 : 1;
  return { gold: Math.ceil(RANK_COST[u.rank].gold * k) };
}
function canRankUp(u) {
  if (u.rank >= 3 || UNITS[u.type].cls === 'giant' && u.rank >= 3) return false;
  if (u.xp >= XP_TO_PROMOTE) return true;
  return tile(u.x, u.y).owner === u.owner;
}
function monkHealTargets(u) {
  return neighbors(u.x, u.y).map(([x, y]) => unitAt(x, y)).filter(o => o && o.owner === u.owner && o.hp < maxHpOf(o));
}
function monkConvertTargets(u) {
  return neighbors(u.x, u.y).map(([x, y]) => unitAt(x, y)).filter(o => o && o.owner !== u.owner && o.type !== 'champion' && visibleTo(u.owner, o.x, o.y));
}
function unitReady(u) {
  if (u.done) return false;
  if (!u.moved && !u.attacked) return true;
  if (u.canEscape) return true;
  if (canAttackNow(u) && attackTargets(u).length) return true;
  if (UNITS[u.type].healer && !u.attacked && (monkHealTargets(u).length || monkConvertTargets(u).length)) return true;
  return false;
}
function unitFresh(u) { return !u.done && !u.moved && !u.attacked; }

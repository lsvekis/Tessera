/* =====================================================================
   Part 4: AI opponents
   ===================================================================== */
let AI_WAIT = async () => {};            // UI overrides to animate AI moves

function unitValue(u) {
  const c = UNITS[u.type].cost;
  return (c ? c.gold * 1.6 : 30) + u.rank * 3;
}
function aiDanger(ti) {
  const d = new Float32Array(G.size * G.size);
  for (const e of G.units) {
    if (e.owner === ti) continue;
    const st = unitStats(e), R = st.mov + st.rng;
    const p = st.atk * Math.max(0.3, e.hp / st.maxHp);
    if (p <= 0) continue;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = e.x + dx, y = e.y + dy; if (inb(x, y)) d[idx(x, y)] += p;
    }
  }
  return d;
}
/* multi-turn travel cost to a tile (Dial's algorithm, ignores units) */
function aiDistMap(ti, target) {
  const n = G.size * G.size, dist = new Float32Array(n).fill(1e9), buckets = [[target]];
  dist[target] = 0;
  for (let c = 0; c < buckets.length; c++) {
    const b = buckets[c]; if (!b) continue;
    for (const i of b) {
      if (dist[i] !== c) continue;
      const t0 = G.tiles[i];
      for (const [nx, ny] of neighbors(tx(i), ty(i))) {
        const ni = idx(nx, ny), t = G.tiles[ni];
        if (!passable(ti, t)) continue;
        const step = (t.t === 'forest' || t.t === 'mountain' ? 2 : 1) + (isLand(t) !== isLand(t0) ? 1 : 0);
        const nc = c + step;
        if (nc < dist[ni]) { dist[ni] = nc; (buckets[nc] || (buckets[nc] = [])).push(ni); }
      }
    }
  }
  return dist;
}
function distTo(ctx, i) { let m = ctx.dist.get(i); if (!m) { m = aiDistMap(ctx.ti, i); ctx.dist.set(i, m); } return m; }

function aiContext(ti) {
  const tr = G.tribes[ti], diff = DIFFICULTY[G.difficulty];
  const ctx = { ti, danger: aiDanger(ti), dist: new Map(), claims: new Map(), objectives: [], garrisoned: new Set(),
    aggr: Math.min(1.1, tr.ai.aggr * diff.aggression + Math.min(0.3, G.turn * 0.012)), smart: diff.smart };
  const enemies = G.units.filter(e => e.owner !== ti);
  for (const c of G.cities) {
    if (c.owner !== ti) continue;
    let th = 0;
    for (const e of enemies) { const d = cheb(e.x, e.y, c.x, c.y); if (d <= 3) th += unitValue(e) * (4 - d) / 3; }
    c._threat = th;
  }
  for (const c of G.cities) {
    const i = idx(c.x, c.y);
    if (c.owner === ti) { if (c._threat > 0) ctx.objectives.push({ kind: 'defend', i, value: 6 + c._threat * 0.7, city: c }); continue; }
    if (c.owner === -1) ctx.objectives.push({ kind: 'village', i, value: 15, city: c });
    else {
      let v = 9 + c.level * 2 + (c.capital ? 4 : 0);
      if (G.tribes[c.owner].human) { if (G.turn < (diff.grace || 0)) continue; v *= diff.humanFocus; }
      ctx.objectives.push({ kind: 'enemy', i, value: v, city: c });
    }
  }
  G.tiles.forEach((t, i) => { if (t.ruin) ctx.objectives.push({ kind: 'ruin', i, value: 7 }); });
  for (const e of enemies) {
    const t = tile(e.x, e.y);
    if (t.owner === ti) ctx.objectives.push({ kind: 'hunt', i: idx(e.x, e.y), value: 7 * (G.tribes[e.owner].human ? Math.min(1.3, diff.humanFocus) : 1) });
  }
  return ctx;
}

/* ---------- attacks ---------- */
function aiEvalAttack(u, target, px, py, ctx) {
  const p = combatPreview(u, target, px, py);
  if (p.dmg <= 0) return null;
  const tv = unitValue(target), sv = unitValue(u);
  let s = p.kills ? 12 + tv * 1.2 : (p.dmg / target.hp) * tv * 0.9 + p.dmg * 0.4;
  const loss = p.dies ? sv * 1.6 + 6 : (p.ret / u.hp) * sv * 0.9;
  s -= loss * (1.3 - ctx.aggr * 0.6);
  const tc = cityAt(target.x, target.y);
  if (tc && tc.owner === u.owner) s += 10; else if (tc) s += 4;
  const dz = ctx.danger[idx(px, py)];
  if (!(p.kills && UNITS[u.type].escape)) s -= dz * 0.22 * (UNITS[u.type].ranged ? 1.5 : 1) * (1.2 - ctx.aggr * 0.5);
  if (G.tribes[target.owner].human) {
    const diff = DIFFICULTY[G.difficulty];
    s += 2 * (diff.humanFocus - 1) + 0.5;
    /* grace period: early on the AI leaves you alone unless you walk into its land */
    if (G.turn < (diff.grace || 0) && tile(target.x, target.y).owner !== u.owner) s -= 12;
  }
  return { s, p };
}
function aiBestAttack(u, ctx) {
  if (!canAttackNow(u)) return null;
  const opts = [[u.x, u.y, -1]];
  if (canMoveNow(u) && UNITS[u.type].dash && !u.canEscape) for (const [i] of moveTargets(u)) opts.push([tx(i), ty(i), i]);
  const home = cityAt(u.x, u.y);
  let best = null;
  for (const [px, py, mi] of opts) {
    for (const e of attackTargets(u, px, py)) {
      const r = aiEvalAttack(u, e, px, py, ctx);
      if (!r) continue;
      let s = r.s;
      if (mi >= 0) s -= 0.4;
      if (mi >= 0 && home && home.owner === u.owner && home._threat > 0) s -= 6;
      if (mi >= 0 && G.tiles[mi].ruin) s += 3;
      if (rnd() > ctx.smart) s += (rnd() - 0.5) * 6;
      if (!best || s > best.s) best = { s, mi, target: e, p: r.p };
    }
  }
  return best;
}
async function aiRetreat(u, ctx) {
  if (!canMoveNow(u)) return;
  let bi = -1, bv = ctx.danger[idx(u.x, u.y)] - 0.5;
  const cap = capitalOf(u.owner);
  for (const [i] of moveTargets(u)) {
    let v = ctx.danger[i];
    if (cap) v += cheb(tx(i), ty(i), cap.x, cap.y) * 0.05;
    if (v < bv) { bv = v; bi = i; }
  }
  if (bi >= 0) { doMove(u, bi); await AI_WAIT('move', u); }
}

/* ---------- movement toward goals ---------- */
async function aiAdvance(u, ctx) {
  if (!canMoveNow(u)) return false;
  const st = unitStats(u), hpF = u.hp / st.maxHp, ti = u.owner, here = cityAt(u.x, u.y);
  if (here && here.owner === ti && here._threat > 0 && !ctx.garrisoned.has(here.id)) { ctx.garrisoned.add(here.id); return false; }
  let bestO = null, bestS = -1;
  const ui = idx(u.x, u.y);
  for (const o of ctx.objectives) {
    const d = distTo(ctx, o.i)[ui];
    if (d >= 1e8) continue;
    let v = o.value;
    const T = UNITS[u.type];
    if (o.kind === 'village') {
      const cl = ctx.claims.get(o.i);
      if (cl && cl !== u.id) v *= 0.2;
      if (T.cls === 'mounted') v *= 1.3;
      if (u.type === 'catapult' || u.type === 'defender') v *= 0.3;
    } else if (o.kind === 'enemy') {
      v *= ctx.aggr;
      if (u.type === 'catapult' || u.type === 'swordsman' || u.type === 'champion') v *= 1.4;
      if (u.type === 'defender') v *= 0.5;
      if (G.turn < 5) v *= 0.5;
    } else if (o.kind === 'defend') { if (u.type === 'defender' || u.type === 'spearman') v *= 1.5; }
    else if (o.kind === 'ruin') { const cl = ctx.claims.get(o.i); if (cl && cl !== u.id) v *= 0.2; }
    const s = v / (d + 2);
    if (s > bestS) { bestS = s; bestO = o; }
  }
  if (!bestO) return false;
  if (bestO.kind === 'village' || bestO.kind === 'ruin') ctx.claims.set(bestO.i, u.id);
  const dm = distTo(ctx, bestO.i);
  const cautious = (hpF < 0.5 ? 3 : 1.1) * (1.25 - ctx.aggr * 0.6);
  let stayV = dm[ui] * 10 + ctx.danger[ui] * cautious;
  if (here && here.owner === ti && !(here._threat > 0)) stayV += 5;
  let bestI = -1, bestV = stayV;
  for (const [i] of moveTargets(u)) {
    const t = G.tiles[i];
    let v = dm[i] * 10 + ctx.danger[i] * cautious;
    if (t.t === 'forest' || t.t === 'mountain') v -= 1.5;
    if (t.ruin) v -= 8;
    const c = t.city >= 0 ? G.cities[t.city] : null;
    if (c && c.owner !== ti) v -= 8;
    if (UNITS[u.type].ranged && adjEnemy(ti, tx(i), ty(i))) v += 6;
    if (v < bestV) { bestV = v; bestI = i; }
  }
  if (bestI >= 0) { doMove(u, bestI); await AI_WAIT('move', u); return true; }
  return false;
}

async function aiMonk(u, ctx) {
  const tryAct = async () => {
    const conv = monkConvertTargets(u).sort((a, b) => unitValue(b) - unitValue(a));
    if (conv.length && unitValue(conv[0]) >= 5) { doConvert(u, conv[0]); await AI_WAIT('act', u); return true; }
    const heal = monkHealTargets(u);
    const missing = heal.reduce((a, o) => a + maxHpOf(o) - o.hp, 0);
    if (heal.length && missing >= 4) { doMonkHeal(u); await AI_WAIT('act', u); return true; }
    return false;
  };
  if (await tryAct()) return;
  if (canMoveNow(u)) {
    let bi = -1, bv = -1e9;
    const allies = G.units.filter(o => o.owner === u.owner && o !== u);
    for (const [i] of moveTargets(u)) {
      const x = tx(i), y = ty(i);
      let v = -ctx.danger[i] * 0.8;
      for (const o of allies) { const d = cheb(o.x, o.y, x, y); if (d === 1) v += 2 + (maxHpOf(o) - o.hp) * 0.6; else if (d <= 4) v += 0.3; }
      for (const [nx, ny] of neighbors(x, y)) { const e = unitAt(nx, ny); if (e && e.owner !== u.owner && e.type !== 'champion') v += unitValue(e) * 0.4; }
      if (v > bv) { bv = v; bi = i; }
    }
    if (bi >= 0 && bv > 0) { doMove(u, bi); await AI_WAIT('move', u); await tryAct(); return; }
  }
  if (canRecover(u)) doRecover(u);
}

async function aiUnit(u, ctx) {
  if (!G.units.includes(u) || G.over) return;
  if (canCapture(u)) { doCapture(u); await AI_WAIT('capture', u); return; }
  if (UNITS[u.type].healer) return aiMonk(u, ctx);
  const st = unitStats(u), hpF = u.hp / st.maxHp;
  let best = aiBestAttack(u, ctx);
  const threshold = 1.5 - ctx.aggr;
  if (hpF < 0.45 && (!best || best.s < 10)) {
    const t = tile(u.x, u.y);
    if (canRecover(u) && (t.owner === u.owner || ctx.danger[idx(u.x, u.y)] < 2)) {
      if (canPaidHeal(u) && G.tribes[u.owner].res.gold > 25 && unitValue(u) >= 9) doPaidHeal(u);
      else { doRecover(u); await AI_WAIT('heal', u); return; }
    } else if (canMoveNow(u)) {
      let bi = -1, bv = 1e9;
      const home = citiesOf(u.owner).sort((a, b) => cheb(a.x, a.y, u.x, u.y) - cheb(b.x, b.y, u.x, u.y))[0];
      for (const [i] of moveTargets(u)) {
        const v = ctx.danger[i] * 2 + (home ? cheb(tx(i), ty(i), home.x, home.y) : 0);
        if (v < bv) { bv = v; bi = i; }
      }
      if (bi >= 0) { doMove(u, bi); await AI_WAIT('move', u); }
      return;
    }
  }
  let guard = 0;
  while (best && best.s > threshold && guard++ < 4) {
    if (best.mi >= 0) { doMove(u, best.mi); await AI_WAIT('move', u); }
    if (!G.units.includes(best.target) || !canAttackNow(u)) break;
    if (!attackTargets(u).includes(best.target)) break;
    doAttack(u, best.target); await AI_WAIT('attack', u);
    if (G.over) return;
    if (!G.units.includes(u)) return;
    ctx.danger = aiDanger(u.owner);
    if (u.canEscape) { await aiRetreat(u, ctx); return; }
    best = canAttackNow(u) ? aiBestAttack(u, ctx) : null;
  }
  if (!G.units.includes(u)) return;
  const moved = await aiAdvance(u, ctx);
  if (moved && canAttackNow(u)) {
    const b2 = aiBestAttack(u, ctx);
    if (b2 && b2.mi < 0 && b2.s > threshold - 1) { doAttack(u, b2.target); await AI_WAIT('attack', u); if (u.canEscape && G.units.includes(u)) await aiRetreat(u, ctx); }
  }
  if (G.units.includes(u) && !u.moved && !u.attacked && !u.done && u.hp < maxHpOf(u)) doRecover(u);
}

/* ---------- production ---------- */
function aiArmyNeed(ti) {
  const nc = citiesOf(ti).length;
  return Math.round((2 + nc * 1.6 + G.turn / 5) * DIFFICULTY[G.difficulty].army);
}
function aiChooseUnit(ti, ctx, city) {
  const tr = G.tribes[ti];
  const near = G.units.filter(e => e.owner !== ti && cheb(e.x, e.y, city.x, city.y) <= 8);
  const pool = near.length ? near : G.units.filter(e => e.owner !== ti);
  const cnt = {}; for (const e of pool) cnt[e.type] = (cnt[e.type] || 0) + 1;
  const mine = {}; const own = unitsOf(ti); for (const o of own) mine[o.type] = (mine[o.type] || 0) + 1;
  const villagesLeft = G.cities.some(c => c.owner === -1);
  const base = { warrior: 3, spearman: 3.2, archer: 3.8, rider: 4, defender: 3, swordsman: 5.5, catapult: 3.5, knight: 6.5, monk: 1.5 };
  let best = null;
  for (const type of TRAINABLE) {
    if (!trainCheck(city, type).ok) continue;
    let s = base[type];
    if (villagesLeft && G.turn < 12 && (type === 'rider' || type === 'warrior')) s += 2;
    if (city._threat > 0 && (type === 'defender' || type === 'spearman' || type === 'archer')) s += 2.5;
    if (type === 'catapult') { s += G.cities.some(c => c.owner >= 0 && c.owner !== ti && c.walls) ? 2 : 0; s -= (mine.catapult || 0) * 1.5; }
    if (type === 'monk') s += own.length >= 5 && !mine.monk ? 3 : -3;
    for (const et in cnt) {
      const c = cnt[et];
      if ((COUNTERS[type] || {})[et] === STRONG) s += 1.4 * c;
      if ((COUNTERS[type] || {})[et] === WEAK) s -= 2 * c;
      if ((COUNTERS[et] || {})[type] === STRONG) s -= 1.1 * c;
    }
    const share = (mine[type] || 0) / Math.max(1, own.length);
    if (share > 0.45 && own.length > 3) s -= 3;
    if (rnd() > ctx.smart) s += (rnd() - 0.5) * 5;
    if (!best || s > best.s) best = { s, type };
  }
  return best ? best.type : null;
}
function aiTrain(ti, ctx) {
  const cities = citiesOf(ti).sort((a, b) => (b._threat || 0) - (a._threat || 0));
  let army = unitsOf(ti).length;
  const need = aiArmyNeed(ti) + Math.floor(G.tribes[ti].res.gold / 45);
  for (const c of cities) {
    if (army >= need && !(c._threat > 0)) continue;
    const type = aiChooseUnit(ti, ctx, c);
    if (type && doTrain(c, type)) army++;
  }
}

/* ---------- research ---------- */
function aiResearch(ti, ctx) {
  const tr = G.tribes[ti];
  const terr = G.tiles.filter(t => t.owner === ti);
  const has = (f) => terr.some(f);
  const enemyTypes = {}; for (const e of G.units) if (e.owner !== ti) enemyTypes[UNITS[e.type].cls] = (enemyTypes[UNITS[e.type].cls] || 0) + 1;
  const cap = capitalOf(ti);
  let landTargets = true;
  if (cap) {
    const dm = aiDistMap(ti, idx(cap.x, cap.y));
    landTargets = G.cities.some(c => c.owner !== ti && dm[idx(c.x, c.y)] < 1e8);
  }
  const P = {
    hunting: 6 + (enemyTypes.mounted || 0), riding: 6, archery: 7, strategy: 4.5, smithery: 8, mathematics: 5 + citiesOf(ti).length * 0.4,
    chivalry: 7, philosophy: 3.5, farming: 5, forestry: 5, mining: has(t => t.res === 'ore') ? 5.5 : 2, organization: has(t => t.res === 'fruit') ? 4.5 : 2,
    fishing: has(t => t.res === 'fish') ? 4.5 : 1.5, aquaculture: 2.5, roads: 2, trade: citiesOf(ti).length >= 4 ? 5 : 2, construction: 3,
    leadership: 4, horsemanship: 3.5, meditation: 3, climbing: has(t => t.res === 'ore') ? 6 : 3, marksmanship: 3, navigation: 2,
    cartography: 1.5, sailing: landTargets ? 2 : 12
  };
  let tries = 0;
  const maxTries = DIFFICULTY[G.difficulty].research;
  while (tries++ < maxTries) {
    let best = null;
    for (const k in TECHS) {
      if (techState(ti, k) !== 'available') continue;
      let s = (P[k] || 2) - TECHS[k].tier * 0.6 + rnd() * 1.5;
      if (TECHS[k].tier === 3 && !hasTech(ti, TECHS[k].parent)) continue;
      if (!best || s > best.s) best = { s, k };
    }
    if (!best) return;
    const cost = techCost(ti, best.k);
    const reserve = G.turn < 4 ? 1 : 5;
    if (tr.res.gold >= cost.gold + reserve) doResearch(ti, best.k); else return;
  }
}

/* ---------- economy ---------- */
function aiEconomy(ti, ctx, maxActions) {
  const tr = G.tribes[ti];
  const inc = computeIncome(ti);
  const w = 10 / (4 + inc.gold);
  const threatened = citiesOf(ti).some(c => c._threat > 6);
  let done = 0;
  for (let pass = 0; pass < maxActions; pass++) {
    const cands = [];
    G.tiles.forEach((t, i) => {
      if (t.owner !== ti || t.city >= 0) return;
      for (const o of tileOptions(ti, tx(i), ty(i))) {
        if (!o.ok || o.kind === 'road') continue;
        let gainV = 0;
        if (o.kind === 'build') gainV = siteGold(ti, o.site, 1, t) * w * 1.6 + 1.5;
        else if (o.kind === 'upgrade') gainV = (siteGold(ti, t.site.type, t.site.lvl + 1, t) - siteGold(ti, t.site.type, t.site.lvl, t)) * w * 1.6 + 1.5;
        else if (o.kind === 'harvest') gainV = 1.7;
        cands.push({ i, o, v: gainV / Math.max(1, o.cost.gold || 0) });
      }
    });
    if (!cands.length) break;
    cands.sort((a, b) => b.v - a.v);
    let acted = false;
    for (const c of cands.slice(0, 6)) {
      const after = tr.res.gold - (c.o.cost.gold || 0);
      if (after < (threatened ? 8 : G.turn < 4 ? 0 : 2)) continue;
      if (doTileAction(ti, tx(c.i), ty(c.i), c.o.id)) { acted = true; done++; break; }
    }
    if (!acted) break;
  }
  return done;
}
function aiUpgrades(ti) {
  if (!DIFFICULTY[G.difficulty].upgrades) return;
  const tr = G.tribes[ti], own = unitsOf(ti);
  if (own.length < 4 || tr.res.gold < 16) return;
  const order = ['attack', 'health', 'defence'].map(k => [k, upgradeNext(ti, k)]).filter(([, n]) => n && n.ok).sort((a, b) => a[1].cost.gold - b[1].cost.gold);
  for (const [k, n] of order) { if (tr.res.gold - n.cost.gold >= 8) { doUpgrade(ti, k); return; } }
}
function aiPromote(ti) {
  for (const u of unitsOf(ti)) {
    if (u.xp >= XP_TO_PROMOTE && u.rank < 3) doRankUp(u);
    else if (G.tribes[ti].res.gold > 35 && canRankUp(u) && unitValue(u) >= 12 && u.rank < 2) doRankUp(u);
  }
}
function aiPickReward(c, lv) {
  const ti = c.owner;
  if (lv === 2) return 'workshop';
  if (lv === 3) return (c.capital || (c._threat || 0) > 0 || G.cities.some(o => o.owner >= 0 && o.owner !== ti && cheb(o.x, o.y, c.x, c.y) <= 5)) ? 'walls' : 'cache';
  if (lv === 4) {
    let free = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const t = tile(c.x + dx, c.y + dy); if (t && t.terr === -1 && isLand(t)) free++; }
    return free >= 4 ? 'borders' : 'boom';
  }
  const champs = G.units.filter(u => u.owner === ti && u.type === 'champion').length;
  return champs < 2 && rnd() < 0.6 ? 'champion' : 'park';
}

/* ---------- full AI turn ---------- */
async function aiTurn(ti) {
  const ctx = aiContext(ti);
  aiResearch(ti, ctx);
  aiEconomy(ti, ctx, 2);
  const cls = (u) => canCapture(u) ? 0 : UNITS[u.type].ranged ? 1 : UNITS[u.type].healer ? 3 : 2;
  const order = unitsOf(ti).sort((a, b) => cls(a) - cls(b));
  for (const u of order) {
    if (G.over) return;
    await aiUnit(u, ctx);
    ctx.danger = aiDanger(ti);
  }
  if (G.over) return;
  aiPromote(ti);
  aiTrain(ti, ctx);
  aiEconomy(ti, ctx, 3);
  aiResearch(ti, ctx);
  aiUpgrades(ti);
}

/* =====================================================================
   Part 2: core state, RNG, helpers, map generation, new game
   ===================================================================== */
let G = null;                 // the whole game state (JSON-serialisable)
let OCC = null;               // tile -> unit id (derived, rebuilt)
let UIDX = new Map();         // unit id -> unit (derived)

/* ---------- seeded RNG stored in state so saves replay the same ---------- */
function rnd() {
  let a = (G.rs = (G.rs + 0x6D2B79F5) | 0);
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(n) { return Math.floor(rnd() * n); }
function pick(arr) { return arr[rndInt(arr.length)]; }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = rndInt(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

/* ---------- grid helpers ---------- */
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function N_() { return G.size; }
function inb(x, y) { return x >= 0 && y >= 0 && x < G.size && y < G.size; }
function idx(x, y) { return y * G.size + x; }
function tile(x, y) { return inb(x, y) ? G.tiles[idx(x, y)] : null; }
function tx(i) { return i % G.size; }
function ty(i) { return (i / G.size) | 0; }
function cheb(ax, ay, bx, by) { return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); }
function isLand(t) { return t && TERRAIN[t.t].land; }
function neighbors(x, y, r = 1) {
  const out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (inb(nx, ny)) out.push([nx, ny]);
  }
  return out;
}
function costStr(c) { return RES.filter(r => c[r]).map(r => c[r] + ' ' + RES_NAME[r].toLowerCase()).join(', '); }
function fmt1(v) { return (Math.round(v * 10) / 10).toString(); }

/* ---------- derived indexes ---------- */
function rebuildIndex() {
  OCC = new Int32Array(G.size * G.size).fill(0);
  UIDX = new Map();
  for (const u of G.units) { UIDX.set(u.id, u); OCC[idx(u.x, u.y)] = u.id; }
}
function unitAt(x, y) { if (!inb(x, y)) return null; const id = OCC[idx(x, y)]; return id ? UIDX.get(id) || null : null; }
function unitById(id) { return UIDX.get(id) || null; }
function cityAt(x, y) { const t = tile(x, y); return t && t.city >= 0 ? G.cities[t.city] : null; }
function tribeOf(i) { return G.tribes[i]; }
function T_(u) { return UNITS[u.type]; }
function hasTech(ti, key) { return !!(G.tribes[ti] && G.tribes[ti].techs[key]); }
function tribeKey(ti) { return G.tribes[ti].key; }
function canSail(ti) { return hasTech(ti, 'sailing') || tribeKey(ti) === 'tidecallers'; }
function canClimb(ti) { return hasTech(ti, 'climbing'); }
function citiesOf(ti) { return G.cities.filter(c => c.owner === ti); }
function unitsOf(ti) { return G.units.filter(u => u.owner === ti); }
function capitalOf(ti) { return G.cities.find(c => c.owner === ti && c.capital) || null; }

/* ---------- value noise ---------- */
function makeNoise(scale) {
  const gs = Math.ceil(G.size / scale) + 3, g = [];
  for (let i = 0; i < gs * gs; i++) g.push(rnd());
  return (x, y) => {
    const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy);
    const sx = fx - x0, sy = fy - y0, ux = sx * sx * (3 - 2 * sx), uy = sy * sy * (3 - 2 * sy);
    const v = (a, b) => g[(b + 1) * gs + (a + 1)];
    const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * ux;
    const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * ux;
    return a + (b - a) * uy;
  };
}

/* ---------- city names ---------- */
function newCityName(ti) {
  const tr = TRIBES[G.tribes[ti].key];
  for (let k = 0; k < 60; k++) {
    const n = pick(tr.syl1) + pick(tr.syl2);
    const name = n.charAt(0).toUpperCase() + n.slice(1).replace(' ', '');
    if (!G.usedNames.includes(name)) { G.usedNames.push(name); return name; }
  }
  const name = pick(tr.syl1) + ' ' + (G.usedNames.length + 1);
  G.usedNames.push(name); return name;
}

/* ---------- map generation ---------- */
function generateMap(P) {
  const N = G.size, c = (N - 1) / 2;
  const n1 = makeNoise(4.2), n2 = makeNoise(2.1), nF = makeNoise(2.6), nM = makeNoise(2.2), nB = makeNoise(3);
  const tiles = [];
  const val = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - c, y - c) / (N * 0.5);
    val.push(0.62 * n1(x, y) + 0.38 * n2(x, y) - 0.62 * d * d);
    tiles.push({ t: 'ocean', res: null, site: null, road: false, terr: -1, owner: -1, city: -1, ruin: false, biome: 'coast' });
  }
  G.tiles = tiles;
  const sorted = val.slice().sort((a, b) => b - a);
  const cut = sorted[Math.floor(N * N * 0.56)];
  for (let i = 0; i < N * N; i++) if (val[i] > cut) tiles[i].t = 'field';

  // capitals spread on a ring
  const caps = [];
  const base = rnd() * Math.PI * 2;
  for (let i = 0; i < P; i++) {
    const a = base + i * Math.PI * 2 / P + (rnd() - 0.5) * 0.35;
    const r = N * (0.31 + rnd() * 0.04);
    let x = Math.round(c + Math.cos(a) * r), y = Math.round(c + Math.sin(a) * r);
    x = Math.max(2, Math.min(N - 3, x)); y = Math.max(2, Math.min(N - 3, y));
    caps.push([x, y]);
  }
  // land around capitals + land bridge to the centre (guarantees connectivity)
  for (const [x, y] of caps) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const t = tile(x + dx, y + dy); if (!t) continue;
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1 || rnd() < 0.8) t.t = 'field';
    }
    let px = x, py = y;
    const cx = Math.round(c), cy = Math.round(c);
    let guard = 0;
    while ((px !== cx || py !== cy) && guard++ < 200) {
      px += Math.sign(cx - px) * (rnd() < 0.85 ? 1 : 0);
      py += Math.sign(cy - py) * (rnd() < 0.85 ? 1 : 0);
      const t = tile(px, py); if (t && !isLand(t)) t.t = 'field';
    }
  }
  // terrain types on land
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = tile(x, y); if (!isLand(t)) continue;
    const f = nF(x + 40, y + 40), m = nM(x + 90, y + 17);
    if (m > 0.7 && rnd() < 0.85) t.t = 'mountain';
    else if (f > 0.56 || rnd() < 0.08) t.t = 'forest';
    else t.t = 'field';
  }
  // water depth
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = tile(x, y); if (isLand(t)) continue;
    let near = 99;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const o = tile(x + dx, y + dy); if (o && isLand(o)) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy)));
    }
    t.t = near === 1 || (near === 2 && rnd() < 0.45) ? 'water' : 'ocean';
  }
  // biomes: nearest capital (with jitter) owns the look of the land
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let best = 0, bd = 1e9;
    for (let i = 0; i < P; i++) {
      const d = Math.hypot(caps[i][0] - x, caps[i][1] - y) + (nB(x + i * 7, y + i * 13) - 0.5) * 3;
      if (d < bd) { bd = d; best = i; }
    }
    tiles[idx(x, y)].biome = TRIBES[G.tribes[best].key].biome;
  }
  // resources
  for (const t of tiles) {
    const r = rnd();
    if (t.t === 'field') t.res = r < 0.13 ? 'crop' : r < 0.25 ? 'fruit' : null;
    else if (t.t === 'forest') t.res = r < 0.2 ? 'game' : null;
    else if (t.t === 'mountain') t.res = r < 0.45 ? 'ore' : null;
    else if (t.t === 'water') t.res = r < 0.22 ? 'fish' : null;
  }
  // balanced capital surroundings: identical starter kit for every tribe
  for (const [x, y] of caps) {
    const t0 = tile(x, y); t0.t = 'field'; t0.res = null;
    const ring = shuffle(neighbors(x, y, 1));
    const kit = [['mountain', 'ore'], ['forest', 'game'], ['forest', null], ['field', 'crop'], ['field', 'crop'], ['field', 'fruit'], ['field', null], ['forest', null]];
    ring.forEach(([nx, ny], k) => { const t = tile(nx, ny); t.t = kit[k][0]; t.res = kit[k][1]; });
  }
  return caps;
}

function placeVillagesAndRuins(caps) {
  const N = G.size;
  const land = [];
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const t = tile(x, y); if (isLand(t) && t.t !== 'mountain') land.push([x, y]);
  }
  const spots = caps.slice();
  const ok = (x, y, minD) => spots.every(([sx, sy]) => cheb(sx, sy, x, y) >= minD);
  const target = Math.round(land.length / 15);
  const villages = [];
  // at least two villages per capital at a fair distance
  for (const [cx, cy] of caps) {
    const ring = shuffle(land.filter(([x, y]) => { const d = cheb(x, y, cx, cy); return d >= 3 && d <= 5; }));
    let got = 0;
    for (const [x, y] of ring) { if (got >= 2) break; if (ok(x, y, 3)) { spots.push([x, y]); villages.push([x, y]); got++; } }
  }
  for (const [x, y] of shuffle(land.slice())) {
    if (villages.length >= target) break;
    if (ok(x, y, 3)) { spots.push([x, y]); villages.push([x, y]); }
  }
  // small islands get villages too (reachable by Sailing)
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const t = tile(x, y); if (!isLand(t) || t.t === 'mountain') continue;
    if (rnd() < 0.5 && ok(x, y, 3) && villages.length < target + 3) { spots.push([x, y]); villages.push([x, y]); }
  }
  for (const [x, y] of villages) {
    const t = tile(x, y); t.t = 'field'; t.res = null;
    const city = { id: G.cities.length, x, y, name: '', owner: -1, level: 1, pop: 0, capital: false, walls: false, workshop: false, park: 0, radius: 1, rewards: [] };
    G.cities.push(city); t.city = city.id;
  }
  // ancient ruins
  let ruins = 0;
  for (const [x, y] of shuffle(land.slice())) {
    if (ruins >= Math.max(3, Math.round(N / 4))) break;
    const t = tile(x, y); if (t.city >= 0) continue;
    if (spots.every(([sx, sy]) => cheb(sx, sy, x, y) >= 3)) { t.ruin = true; t.res = null; spots.push([x, y]); ruins++; }
  }
}

/* ---------- territory ---------- */
function claimTerritory(city, r) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const t = tile(city.x + dx, city.y + dy); if (!t) continue;
    if (t.city >= 0 && t.city !== city.id) continue;
    if (t.terr === -1 || t.terr === city.id) { t.terr = city.id; t.owner = city.owner; }
  }
  city.radius = Math.max(city.radius || 1, r);
}
function reveal(ti, x, y, r) {
  const ex = G.tribes[ti].explored; let n = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue;
    const i = idx(nx, ny); if (!ex[i]) { ex[i] = 1; n++; }
  }
  if (n && ti === G.human && typeof onRevealed === 'function') onRevealed();
  return n;
}
function revealAll(ti) { const ex = G.tribes[ti].explored; for (let i = 0; i < ex.length; i++) ex[i] = 1; if (ti === G.human && typeof onRevealed === 'function') onRevealed(); }
function isExplored(ti, x, y) { return !!G.tribes[ti].explored[idx(x, y)]; }

/* ---------- new game ---------- */
/* opts: tribe, opponents, size, difficulty, mode, seed, allAI, perks[], skin,
   rivals[] (fixed opponent tribes), turnLimit, challenge {id, day, week} */
function newGame(opts) {
  const size = MAP_SIZES[opts.size] || 18;
  const glory = opts.mode === 'glory';
  G = {
    v: 2, rs: (opts.seed || (Date.now() & 0x7fffffff)) | 0, seed: opts.seed || 0, size, sizeKey: opts.size || 'medium', turn: 1, current: 0, human: 0,
    mode: glory ? 'glory' : 'domination', turnLimit: glory ? (opts.turnLimit || 30) : 0, difficulty: DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal',
    tiles: [], cities: [], units: [], tribes: [], nextUnitId: 1, usedNames: [], winner: -1, over: false, log: [],
    allAI: !!opts.allAI, challenge: opts.challenge || null
  };
  const diff = DIFFICULTY[G.difficulty];
  /* rivals never share a colour family with you or each other, so every
     tribe on the map is easy to tell apart */
  const fam = new Set([TRIBES[opts.tribe].family]);
  let others;
  if (opts.rivals && opts.rivals.length) others = opts.rivals.filter(k => TRIBES[k] && k !== opts.tribe);
  else {
    others = [];
    for (const k of shuffle(AI_POOL.filter(k => k !== opts.tribe))) {
      if (fam.has(TRIBES[k].family)) continue;
      fam.add(TRIBES[k].family); others.push(k);
    }
    if (others.length < opts.opponents) for (const k of shuffle(AI_POOL.filter(k => k !== opts.tribe && !others.includes(k)))) others.push(k);
  }
  const keys = [opts.tribe].concat(others.slice(0, opts.opponents));
  keys.forEach((k, i) => {
    const human = i === 0 && !opts.allAI;
    const st = human ? 0 : diff.aiStart;
    G.tribes.push({
      i, key: k, name: TRIBES[k].name, color: TRIBES[k].color, human, alive: true,
      res: { gold: Math.max(2, 6 + st) }, techs: {}, upgrades: {},
      perks: human ? (opts.perks || []).filter(p => PERKS[p]).slice(0, MAX_PERKS) : [], skin: human && opts.skin && SKINS[opts.skin] ? opts.skin : null,
      explored: new Array(size * size).fill(0), kills: 0, losses: 0, captures: 0, turnsAlive: 0,
      ai: { aggr: 0.6 + rnd() * 0.4, focus: null }
    });
    if (TRIBES[k].startTech) G.tribes[i].techs[TRIBES[k].startTech] = true;
    if (!human && diff.freeTech) {
      const t1 = shuffle(BRANCH_ROOTS.filter(q => !G.tribes[i].techs[q]));
      if (t1.length) G.tribes[i].techs[t1[0]] = true;
    }
  });
  const caps = generateMap(keys.length);
  caps.forEach(([x, y], i) => {
    const t = tile(x, y);
    const city = { id: G.cities.length, x, y, name: newCityName(i), owner: i, level: 1, pop: 0, capital: true, walls: false, workshop: false, park: 0, radius: 1, rewards: [] };
    G.cities.push(city); t.city = city.id;
  });
  placeVillagesAndRuins(caps);
  for (const city of G.cities) if (city.owner >= 0) claimTerritory(city, 1);
  rebuildIndex();
  keys.forEach((k, i) => {
    const cap = capitalOf(i), tr = G.tribes[i];
    const first = spawnUnit(TRIBES[k].startUnit, i, cap.x, cap.y, cap.id, false);
    reveal(i, cap.x, cap.y, 2);
    const extra = [];
    if (!tr.human && diff.extraUnits) for (let n = 0; n < diff.extraUnits; n++) extra.push('warrior');
    const P = tr.perks;
    if (P.includes('headstart')) tr.res.gold += 8;
    if (P.includes('bodyguard')) extra.push('warrior');
    if (P.includes('explorer')) reveal(i, cap.x, cap.y, 4);
    if (P.includes('veteran')) { first.rank = 1; first.hp = maxHpOf(first); }
    if (P.includes('fortress')) cap.walls = true;
    for (const type of extra) {
      const spot = neighbors(cap.x, cap.y).find(([x, y]) => isLand(tile(x, y)) && tile(x, y).t !== 'mountain' && !OCC[idx(x, y)]);
      if (spot) spawnUnit(type, i, spot[0], spot[1], -1, false);
    }
  });
  G.current = 0;
  return G;
}

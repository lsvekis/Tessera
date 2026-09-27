/* =====================================================================
   Part 5b: units, badges, highlights, effects, camera, frame loop
   ===================================================================== */
const BASE_PAL = { skin: '#f2c9a0', metal: '#cfd6de', metalD: '#8f9aa6', wood: '#8a5a2b', body: null, bodyD: null, trim: null, glow: null, alpha: 1, head: null, neon: false };
/* PAL is the palette the figure painters read. A shop skin swaps the
   clothing, metal and head art; the tribe colour always stays on the base
   disc, the badge and the sash so you still know whose unit it is. */
let PAL = BASE_PAL;
const SKIN_PAL = new Map();
function palFor(key) {
  if (!key || !SKINS[key]) return BASE_PAL;
  if (SKIN_PAL.has(key)) return SKIN_PAL.get(key);
  const S = SKINS[key], p = Object.assign({}, BASE_PAL, S.pal || {}, { head: S.head || null, neon: !!S.neon });
  if (S.pal && S.pal.alpha) p.alpha = S.pal.alpha;
  SKIN_PAL.set(key, p); return p;
}
function tribeSkin(ti) { const t = G && G.tribes[ti]; return t && t.skin ? t.skin : null; }
function drawHead(c, x, y, r, col, dark) {
  const h = PAL.head;
  if (h === 'skull') {
    circ(c, x, y - r * 0.15, r * 1.02, '#f3eeda'); poly(c, [[x - r * 0.5, y + r * 0.45], [x + r * 0.5, y + r * 0.45], [x + r * 0.34, y + r * 1.15], [x - r * 0.34, y + r * 1.15]], '#e4ddc4');
    circ(c, x - r * 0.42, y - r * 0.1, r * 0.3, '#1b1a16'); circ(c, x + r * 0.42, y - r * 0.1, r * 0.3, '#1b1a16');
    c.fillStyle = '#1b1a16'; c.fillRect(x - r * 0.12, y + r * 0.28, r * 0.24, r * 0.3);
    return;
  }
  if (h === 'pumpkin') {
    circ(c, x, y, r * 1.14, '#ff8a1f'); circ(c, x - r * 0.5, y, r * 0.72, '#f57c12'); circ(c, x + r * 0.5, y, r * 0.72, '#f57c12');
    c.fillStyle = '#3a6b1e'; c.fillRect(x - r * 0.18, y - r * 1.5, r * 0.36, r * 0.5);
    tri(c, x - r * 0.52, y + r * 0.05, x - r * 0.12, y + r * 0.05, x - r * 0.32, y - r * 0.42, '#2a1405');
    tri(c, x + r * 0.52, y + r * 0.05, x + r * 0.12, y + r * 0.05, x + r * 0.32, y - r * 0.42, '#2a1405');
    poly(c, [[x - r * 0.6, y + r * 0.4], [x + r * 0.6, y + r * 0.4], [x + r * 0.3, y + r * 0.85], [x - r * 0.3, y + r * 0.85]], '#2a1405');
    return;
  }
  if (h === 'ghost') {
    c.globalAlpha = 0.85; circ(c, x, y, r * 1.06, '#f2f6ff');
    circ(c, x - r * 0.38, y - r * 0.05, r * 0.24, '#28406b'); circ(c, x + r * 0.38, y - r * 0.05, r * 0.24, '#28406b');
    c.globalAlpha = 1; return;
  }
  circ(c, x, y, r, PAL.skin);
  circ(c, x + r * 0.45, y + r * 0.1, r * 0.62, sh(PAL.skin, -0.12));
  circ(c, x - r * 0.4, y - r * 0.08, r * 0.2, '#2b1d14'); circ(c, x + r * 0.4, y - r * 0.08, r * 0.2, '#2b1d14');
  c.globalAlpha = 0.5; circ(c, x - r * 0.72, y + r * 0.42, r * 0.26, '#e08a6a'); circ(c, x + r * 0.72, y + r * 0.42, r * 0.26, '#e08a6a'); c.globalAlpha = 1;
  if (col) { /* headband in the tribe colour keeps ownership readable */ poly(c, [[x - r, y - r * 0.35], [x + r, y - r * 0.35], [x + r * 0.92, y - r * 0.72], [x - r * 0.92, y - r * 0.72]], dark || col); }
}
const ANIM = new Map(), LUNGE = new Map(), FACE = new Map();
const HPV = new Map(), HPT = new Map();   /* eased health bar per unit */
const FXL = [], GHOSTS = [];
let SPEED = 1;                      // animation speed multiplier (lower = faster)
let HL = { moves: null, attacks: [], converts: [], heals: [], sel: null, hover: -1, path: null };

/* ---------- glyphs (unit type icons) ---------- */
function drawGlyph(c, type, x, y, r, col) {
  c.save(); c.translate(x, y); c.scale(r / 10, r / 10);
  c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
  const L = (w, pts) => { c.lineWidth = w; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) c.lineTo(pts[k], pts[k + 1]); c.stroke(); };
  const P = (pts) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) c.lineTo(pts[k], pts[k + 1]); c.closePath(); c.fill(); };
  switch (type) {
    case 'warrior': L(2.2, [-5, 6, 4, -4]); P([2, -7, 7, -2, 5, 0, 0, -5]); break;
    case 'spearman': L(1.8, [-6, 7, 5, -5]); P([4, -8, 8, -8, 7, -4]); L(1.6, [-3, 1, 0, 4]); break;
    case 'archer': c.lineWidth = 1.8; c.beginPath(); c.arc(-1, 0, 7, -1.2, 1.2); c.stroke(); L(1, [2.4, -6.5, 2.4, 6.5]); L(1.6, [-6, 0, 7, 0]); P([7, -2.2, 9, 0, 7, 2.2]); break;
    case 'swordsman': L(2.4, [-5, 6, 5, -6]); L(2, [-6, 1, -1, 6]); L(1.8, [-7, 7, -5, 5]); break;
    case 'defender': P([-6, -6, 6, -6, 6, 1, 0, 7, -6, 1]); c.fillStyle = 'rgba(0,0,0,0.35)'; P([0, -6, 6, -6, 6, 1, 0, 7]); break;
    case 'rider': c.lineWidth = 2.6; c.beginPath(); c.arc(0, 1, 5.5, Math.PI * 0.95, Math.PI * 2.05, false); c.stroke(); L(2.6, [-5.5, 1, -5.5, 6]); L(2.6, [5.5, 1, 5.5, 6]); break;
    case 'knight': P([-4, 7, -4, 0, -6, -2, -3, -7, 2, -8, 6, -3, 5, -1, 2, -2, 3, 7]); break;
    case 'catapult': L(1.8, [-7, 6, 7, 6]); L(1.8, [-3, 6, 4, -6]); c.beginPath(); c.arc(5, -6, 2.8, 0, 7); c.fill(); L(1.6, [-5, 6, -1, 1]); break;
    case 'monk': L(1.8, [0, -3, 0, 8]); c.lineWidth = 1.8; c.beginPath(); c.arc(0, -5.5, 3, 0, 7); c.stroke(); L(1.8, [-4, 1, 4, 1]); break;
    case 'champion': P([-7, 5, -7, -4, -3.5, -0.5, 0, -7, 3.5, -0.5, 7, -4, 7, 5]); break;
    case 'boat': P([-7, 2, 7, 2, 4, 6, -4, 6]); P([0, -7, 0, 1, 5, 1]); L(1.3, [0, -7, 0, 2]); break;
  }
  c.restore();
}

/* ---------- unit figures ---------- */
function humanoid(c, x, y, col, dark, opts) {
  const o = opts || {}, bc = o.torso || PAL.body || col, bd = o.torsoD || PAL.bodyD || dark, tr = PAL.trim;
  /* legs and boots */
  c.fillStyle = '#3a3d52'; c.fillRect(x - 4.2, y - 10, 3.3, 8.2); c.fillRect(x + 0.9, y - 10, 3.3, 8.2);
  c.fillStyle = '#23263a'; c.fillRect(x - 4.8, y - 2.4, 4.3, 2.6); c.fillRect(x + 0.6, y - 2.4, 4.3, 2.6);
  /* torso */
  poly(c, [[x - 6.5, y - 22], [x, y - 23], [x, y - 8], [x - 5.5, y - 8]], bc);
  poly(c, [[x, y - 23], [x + 6.5, y - 22], [x + 5.5, y - 8], [x, y - 8]], bd);
  /* arms and hands */
  poly(c, [[x - 8.7, y - 20.6], [x - 6.2, y - 21.4], [x - 5.6, y - 11.4], [x - 8.1, y - 11]], sh(bc, -0.14));
  poly(c, [[x + 6.2, y - 21.4], [x + 8.7, y - 20.6], [x + 8.1, y - 11], [x + 5.6, y - 11.4]], sh(bd, -0.1));
  circ(c, x - 7.2, y - 10.2, 1.75, PAL.skin); circ(c, x + 7.2, y - 10.2, 1.75, PAL.skin);
  /* sash in the tribe colour, belt and collar */
  poly(c, [[x - 6.2, y - 21], [x - 3.6, y - 21.4], [x + 5.4, y - 9.4], [x + 2.6, y - 8.6]], rgba(col, 0.9));
  c.fillStyle = tr || sh(bd, -0.3); c.fillRect(x - 6.1, y - 13.4, 11.8, 2.3);
  c.fillStyle = '#e5c15a'; c.fillRect(x - 1.5, y - 13.6, 3, 2.7);
  poly(c, [[x - 5.8, y - 22.3], [x, y - 23.2], [x + 5.8, y - 22.3], [x + 4.5, y - 20.2], [x, y - 20.9], [x - 4.5, y - 20.2]], tr || sh(bc, 0.28));
  /* shoulders */
  circ(c, x - 6.4, y - 21.2, 2.3, sh(bc, 0.18)); circ(c, x + 6.4, y - 21.2, 2.3, sh(bd, 0.12));
  drawHead(c, x, y - 27.5, 4.8, col, dark);
  if (o.hat) poly(c, o.hat, o.hatCol);
  if (PAL.neon) {
    c.strokeStyle = PAL.glow || '#39f3ff'; c.lineWidth = 0.9; c.globalAlpha = 0.95;
    c.beginPath(); c.moveTo(x - 6.5, y - 22); c.lineTo(x, y - 23); c.lineTo(x + 6.5, y - 22); c.lineTo(x + 5.5, y - 8); c.lineTo(x - 5.5, y - 8); c.closePath(); c.stroke();
    c.globalAlpha = 1;
  }
}
function drawBoat(c, x, y, col, dark) {
  poly(c, [[x - 18, y - 6], [x + 18, y - 6], [x + 12, y + 4], [x - 12, y + 4]], '#8a5a2b');
  poly(c, [[x - 18, y - 6], [x + 18, y - 6], [x + 16, y - 3], [x - 16, y - 3]], '#b07a42');
  c.strokeStyle = '#4a3420'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x, y - 40); c.stroke();
  poly(c, [[x + 1, y - 38], [x + 16, y - 16], [x + 1, y - 12]], col);
  poly(c, [[x - 1, y - 34], [x - 12, y - 14], [x - 1, y - 12]], sh(col, 0.35));
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(x + 1, y - 27, 9, 2.5);
  circ(c, x - 7, y - 10, 3.6, PAL.skin);
}
function drawHorse(c, x, y, body, cap, capD) {
  c.strokeStyle = sh(body, -0.35); c.lineWidth = 2.6;
  for (const lx of [-9, -5, 6, 10]) { c.beginPath(); c.moveTo(x + lx, y - 9); c.lineTo(x + lx + (lx < 0 ? -1 : 1), y); c.stroke(); }
  ell(c, x, y - 13, 13, 6.5, body);
  poly(c, [[x + 8, y - 16], [x + 14, y - 28], [x + 21, y - 25], [x + 19, y - 21], [x + 14, y - 20], [x + 12, y - 12]], body);
  poly(c, [[x + 14, y - 28], [x + 21, y - 25], [x + 19, y - 21]], sh(body, -0.2));
  c.strokeStyle = sh(body, -0.45); c.lineWidth = 2.2; c.beginPath(); c.moveTo(x - 12, y - 15); c.quadraticCurveTo(x - 18, y - 11, x - 16, y - 4); c.stroke();
  if (cap) { poly(c, [[x - 9, y - 19], [x + 8, y - 19], [x + 10, y - 8], [x - 11, y - 8]], cap); poly(c, [[x, y - 19], [x + 8, y - 19], [x + 10, y - 8], [x, y - 8]], capD); }
}
function drawUnitFigure(c, type, x, y, col, dark, boat) {
  if (boat) { drawBoat(c, x, y, col, dark); return; }
  switch (type) {
    case 'warrior':
      humanoid(c, x, y, col, dark, { hat: [[x - 5, y - 29], [x, y - 34], [x + 5, y - 29]], hatCol: '#7a5230' });
      c.strokeStyle = PAL.wood; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 7, y - 12); c.lineTo(x + 11, y - 31); c.stroke();
      poly(c, [[x + 9, y - 33], [x + 16, y - 30], [x + 14, y - 25], [x + 10, y - 27]], PAL.metal);
      circ(c, x - 7, y - 15, 5.2, dark); circ(c, x - 7, y - 15, 3, sh(col, 0.2));
      break;
    case 'spearman':
      humanoid(c, x, y, col, dark, { hat: [[x - 5.5, y - 28], [x, y - 34], [x + 5.5, y - 28]], hatCol: PAL.metalD });
      c.strokeStyle = PAL.wood; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x + 6, y - 2); c.lineTo(x + 10, y - 44); c.stroke();
      tri(c, x + 10.5, y - 50, x + 7.8, y - 42, x + 12.4, y - 42, PAL.metal);
      circ(c, x - 6, y - 15, 6.5, sh(col, 0.15)); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.arc(x - 6, y - 15, 6.5, 0, 7); c.stroke();
      break;
    case 'archer':
      humanoid(c, x, y, col, dark, { hat: [[x - 6, y - 26], [x, y - 36], [x + 6, y - 26]], hatCol: dark });
      c.fillStyle = '#6b4a2b'; c.fillRect(x + 3, y - 26, 4, 12);
      c.strokeStyle = PAL.wood; c.lineWidth = 2.2; c.beginPath(); c.arc(x - 4, y - 18, 12, -2.1, 2.1, true); c.stroke();
      c.strokeStyle = '#eee'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x - 10, y - 28.5); c.lineTo(x - 10, y - 7.5); c.stroke();
      break;
    case 'swordsman':
      humanoid(c, x, y, col, dark, { torso: PAL.metal, torsoD: PAL.metalD, hat: [[x - 5.5, y - 28], [x - 5, y - 33], [x + 5, y - 33], [x + 5.5, y - 28]], hatCol: PAL.metalD });
      poly(c, [[x - 2.5, y - 22], [x + 2.5, y - 22], [x + 2.5, y - 8], [x - 2.5, y - 8]], col);
      poly(c, [[x - 1, y - 33], [x + 5, y - 41], [x + 6, y - 38], [x + 1, y - 32]], col);
      c.strokeStyle = PAL.metal; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 9, y - 17); c.lineTo(x + 17, y - 42); c.stroke();
      c.strokeStyle = '#e0b43a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x + 5, y - 19); c.lineTo(x + 13, y - 16); c.stroke();
      break;
    case 'defender':
      humanoid(c, x, y, col, dark, { hat: [[x - 5.5, y - 28], [x, y - 35], [x + 5.5, y - 28]], hatCol: PAL.metalD });
      poly(c, [[x - 11, y - 27], [x + 4, y - 27], [x + 4, y - 5], [x - 3.5, y - 1], [x - 11, y - 5]], col);
      poly(c, [[x - 3.5, y - 27], [x + 4, y - 27], [x + 4, y - 5], [x - 3.5, y - 1]], dark);
      c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 8, y - 20); c.lineTo(x - 3.5, y - 15); c.lineTo(x + 1, y - 20); c.stroke();
      break;
    case 'rider':
      drawHorse(c, x - 2, y, '#9a6232', col, dark);
      humanoid(c, x - 2, y - 14, col, dark, { hat: [[x - 7, y - 42], [x - 2, y - 47], [x + 3, y - 42]], hatCol: '#7a5230' });
      c.strokeStyle = PAL.wood; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 4, y - 24); c.lineTo(x + 18, y - 40); c.stroke();
      break;
    case 'knight':
      drawHorse(c, x - 2, y, '#dcdcdc', col, dark);
      humanoid(c, x - 2, y - 14, col, dark, { torso: PAL.metal, torsoD: PAL.metalD, hat: [[x - 7.5, y - 41], [x - 7, y - 47], [x + 3, y - 47], [x + 3.5, y - 41]], hatCol: PAL.metalD });
      c.strokeStyle = '#e8e2d0'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x - 6, y - 22); c.lineTo(x + 24, y - 34); c.stroke();
      poly(c, [[x + 16, y - 32], [x + 22, y - 36], [x + 21, y - 30]], col);
      break;
    case 'catapult':
      c.fillStyle = '#35281c'; circ(c, x - 10, y - 3, 4.5, '#35281c'); circ(c, x + 9, y - 1, 4.5, '#35281c');
      poly(c, [[x - 15, y - 9], [x + 14, y - 7], [x + 14, y - 3], [x - 15, y - 5]], '#9a6a38');
      poly(c, [[x - 4, y - 8], [x + 3, y - 8], [x, y - 22]], '#7a5230');
      c.strokeStyle = '#6b4a2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 8, y - 9); c.lineTo(x + 10, y - 31); c.stroke();
      circ(c, x + 11, y - 32, 4.5, '#8d8d8d');
      c.strokeStyle = '#4a3420'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 13, y - 7); c.lineTo(x - 13, y - 26); c.stroke();
      poly(c, [[x - 13, y - 26], [x - 3, y - 23], [x - 13, y - 19]], col);
      break;
    case 'monk':
      poly(c, [[x - 7.5, y], [x, y - 25], [x, y]], col); poly(c, [[x, y - 25], [x + 7.5, y], [x, y]], dark);
      circ(c, x, y - 27, 4.6, PAL.skin); poly(c, [[x - 6, y - 25], [x, y - 35], [x + 6, y - 25], [x + 3.5, y - 27], [x - 3.5, y - 27]], dark);
      c.strokeStyle = PAL.wood; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x + 8, y); c.lineTo(x + 8, y - 36); c.stroke();
      circ(c, x + 8, y - 38, 5.5, 'rgba(255,240,150,0.35)'); circ(c, x + 8, y - 38, 3, '#fff3a0');
      break;
    case 'champion':
      c.save(); c.translate(x, y); c.scale(1.45, 1.45); c.translate(-x, -y);
      poly(c, [[x - 8, y - 23], [x + 8, y - 23], [x + 11, y - 2], [x - 11, y - 2]], dark);
      humanoid(c, x, y, col, dark, { torso: '#d9c28a', torsoD: '#b09a62' });
      poly(c, [[x - 5, y - 31], [x - 5, y - 36], [x - 2.5, y - 33.5], [x, y - 37], [x + 2.5, y - 33.5], [x + 5, y - 36], [x + 5, y - 31]], '#ffd54a');
      c.strokeStyle = PAL.wood; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x + 8, y - 6); c.lineTo(x + 12, y - 36); c.stroke();
      poly(c, [[x + 7, y - 40], [x + 17, y - 37], [x + 16, y - 31], [x + 6, y - 34]], PAL.metal);
      c.restore();
      break;
  }
}
function unitHeight(type, boat) { return boat ? 44 : type === 'champion' ? 62 : (type === 'rider' || type === 'knight') ? 50 : type === 'spearman' ? 50 : 42; }

/* ---------- positions & animation ---------- */
function elevAtF(fx, fy) { const t = tile(Math.round(fx), Math.round(fy)); return t ? ELEV[t.t] : 0; }
function unitPosF(u, now) {
  let fx = u.x, fy = u.y;
  const an = ANIM.get(u.id);
  if (an) {
    const t = (now - an.t0) / an.dur;
    if (t >= 1) ANIM.delete(u.id);
    else if (t > 0) {
      const segs = an.path.length - 1, f = t * segs, k = Math.min(segs - 1, Math.floor(f)), r = f - k;
      const a = an.path[k], b = an.path[k + 1];
      fx = a[0] + (b[0] - a[0]) * r; fy = a[1] + (b[1] - a[1]) * r;
    } else { fx = an.path[0][0]; fy = an.path[0][1]; }
  }
  const lg = LUNGE.get(u.id);
  if (lg) {
    const t = (now - lg.t0) / lg.dur;
    if (t >= 1) LUNGE.delete(u.id);
    else if (t > 0) { const k = Math.sin(t * Math.PI) * 0.38; fx += (lg.tx - u.x) * k; fy += (lg.ty - u.y) * k; }
  }
  return [fx, fy];
}
function badgeScale() { return Math.max(0.8, Math.min(1.7, 1 / cam.z)); }
function isHumanTurn() { return G && !G.allAI && G.current === G.human && !UIState.busy; }

function drawUnits(now) {
  const list = [];
  for (const u of G.units) {
    if (!viewExplored(idx(u.x, u.y))) continue;
    const [fx, fy] = unitPosF(u, now);
    list.push({ u, fx, fy });
  }
  list.sort((a, b) => (a.fx + a.fy) - (b.fx + b.fy));
  const humanTurn = isHumanTurn();
  for (const it of list) {
    const u = it.u, wx = isoX(it.fx, it.fy), wy = isoY(it.fx, it.fy) - elevAtF(it.fx, it.fy) + 4;
    const own = u.owner === G.human && !G.allAI;
    const fresh = own && humanTurn && unitFresh(u);
    const ready = own && humanTurn && unitReady(u);
    const done = own && humanTurn && !ready;
    const boat = !isLand(tile(u.x, u.y));
    const col = tribeColor(u.owner), dark = tribeDark(u.owner);
    it.wx = wx; it.wy = wy; it.boat = boat; it.ready = ready; it.fresh = fresh; it.done = done;
    if (ready) {
      const p = 0.5 + 0.5 * Math.sin(now / 260);
      ell(ctx, wx, wy, 23 + p * 3, 11.5 + p * 1.5, `rgba(255,213,74,${0.18 + p * 0.22})`);
      ctx.strokeStyle = fresh ? '#ffd54a' : '#ffe9a8'; ctx.lineWidth = fresh ? 3 : 2;
      ctx.setLineDash(fresh ? [] : [5, 4]);
      ctx.beginPath(); ctx.ellipse(wx, wy, 20 + p * 2, 10 + p, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ell(ctx, wx, wy + 1.5, 17, 8.5, 'rgba(0,0,0,0.35)');
    ell(ctx, wx, wy, 16, 8, done ? '#5b6072' : col);
    ctx.strokeStyle = done ? '#2c3040' : dark; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(wx, wy, 16, 8, 0, 0, Math.PI * 2); ctx.stroke();
    const face = FACE.get(u.id) || 1;
    ctx.save();
    PAL = palFor(tribeSkin(u.owner));
    if (done) ctx.globalAlpha = 0.55;
    else if (PAL.alpha < 1) ctx.globalAlpha = PAL.alpha;
    ctx.translate(wx, 0); ctx.scale(face, 1); ctx.translate(-wx, 0);
    const bob = ready ? Math.sin(now / 300 + u.id) * 1.2 : 0;
    const fc = done ? '#8a8fa3' : col, fd = done ? '#5b6072' : dark;
    /* glow pass: a soft halo in the tribe (or skin) colour so every figure
       pops off the terrain and you can read ownership at a glance */
    ctx.shadowColor = rgba(done ? '#0b1020' : (PAL.glow || col), done ? 0.8 : 0.95);
    ctx.shadowBlur = done ? 5 : 9;
    drawUnitFigure(ctx, u.type, wx, wy + bob, fc, fd, boat);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    drawUnitFigure(ctx, u.type, wx, wy + bob, fc, fd, boat);
    PAL = BASE_PAL;
    ctx.restore();
  }
  for (const it of list) drawBadge(it, now);
  return list;
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function star(c, x, y, r, fill) {
  c.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = fill; c.fill();
}
function hpColor(f) { return f > 0.6 ? '#5fe08e' : f > 0.3 ? '#ffc94a' : '#ff5d6c'; }
function drawBadge(it, now) {
  const u = it.u, s = badgeScale(), c = ctx;
  const H = unitHeight(u.type, it.boat);
  const bx = it.wx + 4 * s, by = it.wy - H - 6 * s;
  const col = tribeColor(u.owner), st = unitStats(u), f = u.hp / st.maxHp;
  c.save();
  if (it.done) c.globalAlpha = 0.7;
  const cx = bx - 11 * s;
  if (it.ready) { circ(c, cx, by, 13.5 * s, 'rgba(255,213,74,0.95)'); }
  circ(c, cx, by, 11 * s, '#0b1020');
  circ(c, cx, by, 9.2 * s, it.done ? '#6b7086' : col);
  drawGlyph(c, it.boat ? 'boat' : u.type, cx, by, 7.4 * s, isLightTribe(u.owner) && !it.done ? '#1b2440' : '#ffffff');
  roundRect(c, bx - 1 * s, by - 8 * s, 25 * s, 16 * s, 7 * s); c.fillStyle = 'rgba(8,12,26,0.9)'; c.fill();
  c.fillStyle = hpColor(f); c.font = `700 ${11.5 * s}px Rubik, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(String(Math.max(0, Math.ceil(u.hp))), bx + 11.5 * s, by + 0.5 * s);
  /* health bar: chunky, outlined, with a pale ghost that drains down to the
     new value so you can see exactly how much a hit took off */
  const bw = 43 * s, bh = 7 * s, bx0 = cx - 9 * s, by0 = by + 11 * s;
  let g0 = HPV.get(u.id); if (g0 === undefined || g0 < f) g0 = f;
  g0 = Math.max(f, g0 - 0.9 * (now - (HPT.get(u.id) || now)) / 1000);
  HPV.set(u.id, g0); HPT.set(u.id, now);
  roundRect(c, bx0 - 1 * s, by0 - 1 * s, bw + 2 * s, bh + 2 * s, (bh + 2 * s) / 2); c.fillStyle = 'rgba(6,9,20,0.92)'; c.fill();
  roundRect(c, bx0, by0, bw, bh, bh / 2); c.fillStyle = '#2a3048'; c.fill();
  if (g0 > f + 0.005) { roundRect(c, bx0, by0, bw * Math.min(1, g0), bh, bh / 2); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill(); }
  const hc = hpColor(f);
  if (f > 0) {
    roundRect(c, bx0, by0, Math.max(bh, bw * f), bh, bh / 2); c.fillStyle = sh(hc, -0.2); c.fill();
    roundRect(c, bx0 + 0.8 * s, by0 + 0.8 * s, Math.max(bh - 1.6 * s, bw * f - 1.6 * s), bh * 0.42, bh * 0.21); c.fillStyle = sh(hc, 0.3); c.fill();
  }
  c.save(); roundRect(c, bx0, by0, bw, bh, bh / 2); c.clip();
  c.strokeStyle = 'rgba(6,9,20,0.45)'; c.lineWidth = 1 * s;
  for (let seg = 1; seg < 4; seg++) { const sx = bx0 + bw * seg / 4; c.beginPath(); c.moveTo(sx, by0); c.lineTo(sx, by0 + bh); c.stroke(); }
  c.restore();
  for (let k = 0; k < u.rank; k++) star(c, cx - 7 * s + k * 7 * s, by - 15 * s, 3.9 * s, '#ffd54a');
  const own = u.owner === G.human && !G.allAI;
  if (own && u.xp >= XP_TO_PROMOTE && u.rank < 3) { circ(c, bx + 30 * s, by - 2 * s, 6 * s, '#3fcf6a'); c.fillStyle = '#062b12'; c.font = `700 ${9 * s}px Rubik, sans-serif`; c.fillText('▲', bx + 30 * s, by - 1.5 * s); }
  if (own && isHumanTurn() && canCapture(u)) {
    const fx = bx + 30 * s, fy = by + 7 * s, p = 0.5 + 0.5 * Math.sin(now / 200);
    circ(c, fx, fy, (7 + p) * s, '#ffffff'); c.strokeStyle = '#0b1020'; c.lineWidth = 1.3 * s;
    c.beginPath(); c.moveTo(fx - 2.5 * s, fy + 4 * s); c.lineTo(fx - 2.5 * s, fy - 4 * s); c.stroke();
    poly(c, [[fx - 2.5 * s, fy - 4 * s], [fx + 4 * s, fy - 2 * s], [fx - 2.5 * s, fy + 0.5 * s]], col === '#eef3f8' ? '#55708a' : col);
  }
  if (SHOW_STATS) {
    const ty0 = it.wy + 12 * s;
    roundRect(c, it.wx - 23 * s, ty0 - 7 * s, 46 * s, 14 * s, 6 * s); c.fillStyle = 'rgba(8,12,26,0.85)'; c.fill();
    c.font = `700 ${9.5 * s}px Rubik, sans-serif`; c.textAlign = 'center';
    c.fillStyle = '#ff9a8a'; c.fillText('A' + fmt1(st.atk), it.wx - 11 * s, ty0 + 0.5 * s);
    c.fillStyle = '#8fc8ff'; c.fillText('D' + fmt1(st.def), it.wx + 11 * s, ty0 + 0.5 * s);
  }
  c.restore();
}

/* ---------- city labels ---------- */
function drawCityLabels() {
  const s = badgeScale();
  for (const city of G.cities) {
    const i = idx(city.x, city.y);
    if (!viewExplored(i)) continue;
    const t = G.tiles[i], cx = isoX(city.x, city.y), cy = isoY(city.x, city.y) - ELEV[t.t] + 26;
    const c = ctx;
    c.font = `700 ${11 * s}px Rubik, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (city.owner < 0) {
      const w = c.measureText('Village').width + 14 * s;
      roundRect(c, cx - w / 2, cy - 8 * s, w, 16 * s, 8 * s); c.fillStyle = 'rgba(40,36,30,0.82)'; c.fill();
      c.fillStyle = '#e9dcc3'; c.fillText('Village', cx, cy + 0.5 * s);
      continue;
    }
    const col = tribeColor(city.owner), light = isLightTribe(city.owner);
    const name = city.name;
    const tw = c.measureText(name).width;
    const w = tw + (city.capital ? 36 : 24) * s + 12 * s;
    const x0 = cx - w / 2;
    roundRect(c, x0 - 2 * s, cy - 11 * s, w + 4 * s, 22 * s, 11 * s); c.fillStyle = '#0b1020'; c.fill();
    roundRect(c, x0, cy - 9 * s, w, 18 * s, 9 * s); c.fillStyle = col; c.fill();
    let tx0 = x0 + 9 * s;
    if (city.capital) {
      poly(c, [[tx0, cy + 4 * s], [tx0, cy - 3 * s], [tx0 + 3 * s, cy], [tx0 + 5.5 * s, cy - 5 * s], [tx0 + 8 * s, cy], [tx0 + 11 * s, cy - 3 * s], [tx0 + 11 * s, cy + 4 * s]], light ? '#b8860b' : '#ffe27a');
      tx0 += 14 * s;
    }
    c.fillStyle = light ? '#15203a' : '#ffffff'; c.textAlign = 'left';
    c.fillText(name, tx0, cy + 0.5 * s);
    const lx = x0 + w - 9 * s;
    circ(c, lx, cy, 7.5 * s, '#0b1020'); c.fillStyle = '#ffd54a'; c.textAlign = 'center'; c.font = `700 ${9.5 * s}px Rubik, sans-serif`;
    c.fillText(String(city.level), lx, cy + 0.5 * s);
    const need = levelNeed(city), pw = Math.min(64 * s, need * 9 * s), px0 = cx - pw / 2, py = cy + 13 * s;
    roundRect(c, px0 - 2 * s, py - 2 * s, pw + 4 * s, 7 * s, 3 * s); c.fillStyle = 'rgba(8,12,26,0.85)'; c.fill();
    for (let k = 0; k < need; k++) {
      const segW = pw / need;
      roundRect(c, px0 + k * segW + 0.8 * s, py, segW - 1.6 * s, 3 * s, 1.5 * s);
      c.fillStyle = k < city.pop ? '#6fd3ff' : 'rgba(255,255,255,0.16)'; c.fill();
    }
    if (city.walls) { c.fillStyle = '#d7d0c2'; c.font = `700 ${9 * s}px Rubik, sans-serif`; }
  }
}

/* ---------- highlights ---------- */
function tileTop(i) { const x = tx(i), y = ty(i); return [isoX(x, y), isoY(x, y) - ELEV[G.tiles[i].t]]; }
function drawHighlights(now) {
  const c = ctx;
  if (HL.cityTerr >= 0 && HL.cityTerr !== undefined) {
    G.tiles.forEach((t, i) => { if (t.terr === HL.cityTerr) { const [cx, cy] = tileTop(i); diamond(c, cx, cy, 0.98); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fill(); } });
  }
  if (HL.moves) {
    for (const [i] of HL.moves) {
      const [cx, cy] = tileTop(i);
      diamond(c, cx, cy, 0.9); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5; c.stroke();
      circ(c, cx, cy, 4, 'rgba(255,255,255,0.85)');
    }
  }
  if (HL.path && HL.path.length > 1) {
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3; c.setLineDash([6, 6]); c.lineDashOffset = -now / 40;
    c.beginPath(); HL.path.forEach((i, k) => { const [x, y] = tileTop(i); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]);
  }
  const p = 0.5 + 0.5 * Math.sin(now / 180);
  for (const id of HL.attacks) {
    const e = unitById(id); if (!e) continue;
    const [cx, cy] = tileTop(idx(e.x, e.y));
    diamond(c, cx, cy, 0.95); c.fillStyle = `rgba(255,70,90,${0.22 + p * 0.15})`; c.fill();
    c.strokeStyle = '#ff5d6c'; c.lineWidth = 3; c.stroke();
  }
  for (const id of HL.converts) {
    const e = unitById(id); if (!e) continue;
    const [cx, cy] = tileTop(idx(e.x, e.y));
    diamond(c, cx, cy, 0.95); c.strokeStyle = '#c38bff'; c.lineWidth = 3; c.stroke();
  }
  if (HL.sel >= 0 && HL.sel !== null) {
    const [cx, cy] = tileTop(HL.sel);
    diamond(c, cx, cy, 1); c.strokeStyle = '#ffd54a'; c.lineWidth = 3.5; c.stroke();
  }
  if (HL.hover >= 0 && HL.hover !== HL.sel) {
    const [cx, cy] = tileTop(HL.hover);
    diamond(c, cx, cy, 1); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.stroke();
  }
}

/* ---------- effects ---------- */
function addFloat(x, y, text, color, delay, size) { FXL.push({ k: 'float', x, y, text, color, t0: performance.now() + (delay || 0), dur: 1200 * SPEED + 300, size: size || 15 }); }
function addRing(x, y, color, dur) { FXL.push({ k: 'ring', x, y, color, t0: performance.now(), dur: dur || 700 }); }
function addShot(ax, ay, bx, by, kind) { FXL.push({ k: 'shot', ax, ay, bx, by, kind, t0: performance.now(), dur: 320 * SPEED + 80 }); }
function drawEffects(now) {
  const c = ctx, s = badgeScale();
  for (let k = GHOSTS.length - 1; k >= 0; k--) {
    const g = GHOSTS[k], t = (now - g.t0) / 700;
    if (t >= 1) { GHOSTS.splice(k, 1); continue; }
    if (t < 0) continue;
    const wx = isoX(g.x, g.y), wy = isoY(g.x, g.y) - ELEV[tile(g.x, g.y).t] + 4 + t * 10;
    c.save(); c.globalAlpha = 1 - t; drawUnitFigure(c, g.type, wx, wy, tribeColor(g.owner), tribeDark(g.owner), g.boat); c.restore();
  }
  for (let k = FXL.length - 1; k >= 0; k--) {
    const f = FXL[k], t = (now - f.t0) / f.dur;
    if (t >= 1) { FXL.splice(k, 1); continue; }
    if (t < 0) continue;
    if (f.k === 'float') {
      const wx = isoX(f.x, f.y), wy = isoY(f.x, f.y) - 60 - t * 34;
      c.save(); c.globalAlpha = t > 0.75 ? (1 - t) * 4 : 1;
      c.font = `800 ${f.size * s}px Rubik, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4 * s; c.strokeStyle = 'rgba(8,12,26,0.9)'; c.strokeText(f.text, wx, wy);
      c.fillStyle = f.color; c.fillText(f.text, wx, wy); c.restore();
    } else if (f.k === 'ring') {
      const wx = isoX(f.x, f.y), wy = isoY(f.x, f.y) - ELEV[tile(f.x, f.y).t];
      c.save(); c.globalAlpha = 1 - t; c.strokeStyle = f.color; c.lineWidth = 4;
      c.beginPath(); c.ellipse(wx, wy, 20 + t * 40, 10 + t * 20, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    } else if (f.k === 'shot') {
      const ax = isoX(f.ax, f.ay), ay = isoY(f.ax, f.ay) - 30, bx = isoX(f.bx, f.by), by = isoY(f.bx, f.by) - 20;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t - Math.sin(t * Math.PI) * (f.kind === 'boulder' ? 70 : 34);
      if (f.kind === 'boulder') circ(c, x, y, 5, '#7d7d7d');
      else { const ang = Math.atan2((by - ay) - Math.cos(t * Math.PI) * 34 * Math.PI, bx - ax); c.save(); c.translate(x, y); c.rotate(ang); c.strokeStyle = '#f4e3c1'; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, 0); c.lineTo(7, 0); c.stroke(); tri(c, 9, 0, 5, -3, 5, 3, '#dfe6ee'); c.restore(); }
    }
  }
}

/* ---------- camera ---------- */
function clampCam() {
  const b = worldBounds();
  cam.x = Math.max(b.minX + 40, Math.min(b.maxX - 40, cam.x));
  cam.y = Math.max(b.minY + 40, Math.min(b.maxY - 40, cam.y));
}
let camGoal = null;
function centerOn(x, y, smooth) {
  const narrow = VW < 760 && typeof UIState !== 'undefined' && UIState.screen === 'game';
  const wx = isoX(x, y), wy = isoY(x, y) - 10 + (narrow ? VH * 0.2 / cam.z : 0);
  if (smooth) camGoal = { x: wx, y: wy }; else { cam.x = wx; cam.y = wy; camGoal = null; }
}
function zoomAt(sx, sy, f) {
  const nz = Math.max(0.4, Math.min(2.2, cam.z * f));
  const wx = (sx - VW / 2) / cam.z + cam.x, wy = (sy - VH / 2) / cam.z + cam.y;
  cam.z = nz; cam.x = wx - (sx - VW / 2) / nz; cam.y = wy - (sy - VH / 2) / nz;
  clampCam(); lastZoomAt = performance.now();
}
function screenToTile(sx, sy) {
  const wx = (sx - VW / 2) / cam.z + cam.x, wy0 = (sy - VH / 2) / cam.z + cam.y;
  let fallback = -1;
  for (const e of [9, 0, -3]) {
    const wy = wy0 + e;
    const fx = (wx / HW + wy / HH) / 2, fy = (wy / HH - wx / HW) / 2;
    const x = Math.round(fx), y = Math.round(fy);
    if (!inb(x, y)) continue;
    const i = idx(x, y);
    if (fallback < 0) fallback = i;
    if (ELEV[G.tiles[i].t] === e) return i;
  }
  return fallback;
}
function resizeCanvas() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = cv.clientWidth; VH = cv.clientHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  drawStars();
}

/* ---------- starfield background ---------- */
function drawStars() {
  const bg = document.getElementById('bg'); if (!bg) return;
  bg.width = Math.round(bg.clientWidth * DPR); bg.height = Math.round(bg.clientHeight * DPR);
  const c = bg.getContext('2d'), w = bg.width, h = bg.height;
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#050814'); g.addColorStop(1, '#0b1330');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (const [x, y, r, col] of [[0.2, 0.25, 0.45, 'rgba(120,70,200,0.10)'], [0.85, 0.7, 0.5, 'rgba(40,140,200,0.09)'], [0.6, 0.1, 0.3, 'rgba(200,80,140,0.06)']]) {
    const rg = c.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * Math.max(w, h)); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg; c.fillRect(0, 0, w, h);
  }
  let seed = 7;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < (w * h) / 5000; k++) {
    const x = r() * w, y = r() * h, s = r() * 1.3 * DPR + 0.3, a = 0.3 + r() * 0.7;
    c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(x, y, s, s);
  }
}

/* ---------- minimap ---------- */
let miniDirty = true, miniAt = 0;
function drawMinimap(now) {
  const mm = document.getElementById('minimap');
  if (!mm || mm.offsetParent === null) return;
  if (!miniDirty && now - miniAt < 700) return;
  miniDirty = false; miniAt = now;
  const w = mm.clientWidth, h = mm.clientHeight;
  if (mm.width !== w * DPR) { mm.width = w * DPR; mm.height = h * DPR; }
  const c = mm.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, h);
  const N = G.size, s = Math.min((w - 8) / (2 * N), (h - 8) / N);
  const ox = w / 2, oy = (h - N * s) / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = idx(x, y), t = G.tiles[i];
    if (!viewExplored(i)) continue;
    const px = ox + (x - y) * s, py = oy + (x + y) * s / 2;
    let col = t.owner >= 0 ? tribeColor(t.owner) : isLand(t) ? sh(BIOMES[t.biome].field, -0.35) : t.t === 'ocean' ? '#1f5694' : '#2f7fc0';
    c.fillStyle = col; c.beginPath(); c.moveTo(px, py - s / 2); c.lineTo(px + s, py); c.lineTo(px, py + s / 2); c.lineTo(px - s, py); c.closePath(); c.fill();
    if (t.city >= 0) { c.fillStyle = G.cities[t.city].owner >= 0 ? '#fff' : '#caa76a'; c.fillRect(px - 1.5, py - 1.5, 3, 3); }
  }
  const b = worldBounds();
  const vx0 = cam.x - VW / 2 / cam.z, vy0 = cam.y - VH / 2 / cam.z;
  const k = s / HW;
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.2;
  c.strokeRect(ox + vx0 * k, oy + vy0 * k, VW / cam.z * k, VH / cam.z * k);
  mm._map = { ox, oy, k };
}

/* ---------- main frame ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  if (!G || !cv) return;
  if (UIState.screen === 'setup' && !LD.on) return;
  if (camGoal) {
    cam.x += (camGoal.x - cam.x) * 0.16; cam.y += (camGoal.y - cam.y) * 0.16;
    if (Math.abs(camGoal.x - cam.x) + Math.abs(camGoal.y - cam.y) < 1) camGoal = null;
    miniDirty = true;
  }
  if (typeof menuDrift === 'function') menuDrift(now);
  const desired = Math.min(2.4, cam.z * DPR);
  if (cacheDirty || !terrainCache || (Math.abs(desired - cacheScale) / desired > 0.3 && now - lastZoomAt > 200)) { buildCache(); miniDirty = true; }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  const b = cacheB, S = cacheScale, z = cam.z;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.drawImage(terrainCache, (b.minX - cam.x) * z + VW / 2, (b.minY - cam.y) * z + VH / 2, terrainCache.width / S * z, terrainCache.height / S * z);
  ctx.setTransform(DPR * z, 0, 0, DPR * z, DPR * (VW / 2 - cam.x * z), DPR * (VH / 2 - cam.y * z));
  if (typeof drawTerrainAnim === 'function') drawTerrainAnim(ctx, now);   /* animated water, fish, swaying plants, cloud puffs (05) */
  drawHighlights(now);
  drawUnits(now);
  drawCityLabels();
  drawEffects(now);
  drawMinimap(now);
}

/* ---------- portraits for the UI (rendered once, cached) ---------- */
const PORTRAITS = new Map();
function unitPortrait(type, ti, boat, skin) {
  const tk = typeof ti === 'string' ? ti : G.tribes[ti].key;
  if (skin === undefined && G && typeof ti === 'number') skin = tribeSkin(ti);
  const key = type + ':' + tk + ':' + (boat ? 1 : 0) + ':' + (skin || '');
  if (PORTRAITS.has(key)) return PORTRAITS.get(key);
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d'); g.scale(2, 2);
  const col = TRIBES[tk].color, dark = TRIBES[tk].dark;
  PAL = palFor(skin);
  ell(g, 32, 50, 17, 8.5, 'rgba(0,0,0,0.3)'); ell(g, 32, 49, 16, 8, col);
  const s = type === 'champion' ? 0.72 : 1;
  g.save(); g.translate(32, 49); g.scale(s, s); g.translate(-32, -49);
  drawUnitFigure(g, type, 32, 49, col, dark, boat);
  g.restore();
  PAL = BASE_PAL;
  const url = c.toDataURL(); PORTRAITS.set(key, url); return url;
}
function glyphIcon(type, bg, fg) {
  const key = 'g:' + type + bg + fg;
  if (PORTRAITS.has(key)) return PORTRAITS.get(key);
  const c = document.createElement('canvas'); c.width = 48; c.height = 48;
  const g = c.getContext('2d'); g.scale(2, 2);
  circ(g, 12, 12, 11, bg); drawGlyph(g, type, 12, 12, 8, fg);
  const url = c.toDataURL(); PORTRAITS.set(key, url); return url;
}
function tribeColorKey(ti) { return typeof ti === 'string' ? TRIBES[ti].color : tribeColor(ti); }
function tribeDarkKey(ti) { return typeof ti === 'string' ? TRIBES[ti].dark : tribeDark(ti); }

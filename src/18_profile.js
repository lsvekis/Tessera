/* =====================================================================
   Part 13: player profile — the Wins currency, owned shop items and the
   equipped skin and perks. Stored in this browser (localStorage).
   ===================================================================== */
const PROFILE_KEY = 'tessera-profile-v1';
const WIN_ICON = '<svg class="ico win-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v2h3.2a.8.8 0 0 1 .8.9c-.3 3-2 5.2-4.6 5.9A5.2 5.2 0 0 1 13 15v2.2h3.1a1 1 0 0 1 1 1V21H6.9v-2.8a1 1 0 0 1 1-1H11V15a5.2 5.2 0 0 1-3.4-3.2C5 11.1 3.3 8.9 3 5.9a.8.8 0 0 1 .8-.9H7z" fill="#ffc83d"/><path d="M7 5H4.9c.4 2.1 1.4 3.6 2.8 4.2A12 12 0 0 1 7 5zm10 0h2.1c-.4 2.1-1.4 3.6-2.8 4.2.5-1.3.7-2.7.7-4.2z" fill="#e59a12"/><path d="M9.2 5.2h2.2v6.4a3 3 0 0 1-2.2-2.9z" fill="#fff3b8" opacity=".75"/><rect x="6.9" y="19.4" width="10.2" height="1.6" fill="#b86f0a"/></svg>';
let PROFILE = null;
const PROFILE_LISTENERS = [];
function onProfile(fn) { PROFILE_LISTENERS.push(fn); }

function defaultProfile() {
  return { v: 1, wins: 3, earned: 0, games: 0, victories: 0, created: Date.now(),
    owned: { tribe: {}, skin: {}, perk: {}, pack: {} }, equipped: { skin: null, perks: [] },
    challenge: { week: '', days: {} }, nick: '' };
}
function loadProfile() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch (e) { p = null; }
  const d = defaultProfile();
  if (!p || typeof p !== 'object' || p.v !== 1) p = d;
  for (const k in d) if (p[k] === undefined || p[k] === null) p[k] = d[k];
  for (const k in d.owned) if (!p.owned[k] || typeof p.owned[k] !== 'object') p.owned[k] = {};
  if (!p.equipped || typeof p.equipped !== 'object') p.equipped = d.equipped;
  if (!Array.isArray(p.equipped.perks)) p.equipped.perks = [];
  if (!p.challenge || typeof p.challenge !== 'object') p.challenge = d.challenge;
  if (!p.challenge.days || typeof p.challenge.days !== 'object') p.challenge.days = {};
  p.wins = Math.max(0, Math.floor(+p.wins || 0));
  PROFILE = p;
  return p;
}
function saveProfile() {
  if (!PROFILE) return;
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(PROFILE)); } catch (e) { /* storage unavailable: keeps working for this visit */ }
  for (const fn of PROFILE_LISTENERS) { try { fn(PROFILE); } catch (e) { console.error(e); } }
  renderWinsChips();
}

/* ---------- ownership ---------- */
function owns(kind, key) {
  if (kind === 'tribe' && FREE_TRIBES.includes(key)) return true;
  return !!(PROFILE && PROFILE.owned[kind] && PROFILE.owned[kind][key]);
}
function ownsTribe(k) { return owns('tribe', k); }
function ownedTribes() { return TRIBE_ORDER.filter(ownsTribe); }
function grant(kind, key) {
  if (!PROFILE) loadProfile();
  if (!PROFILE.owned[kind]) PROFILE.owned[kind] = {};
  PROFILE.owned[kind][key] = Date.now();
  saveProfile();
}

/* ---------- Wins currency ---------- */
function winsBalance() { return PROFILE ? PROFILE.wins : 0; }
function addWins(n) { if (!PROFILE) loadProfile(); PROFILE.wins += n; if (n > 0) PROFILE.earned += n; saveProfile(); }
function spendWins(n) { if (!PROFILE || PROFILE.wins < n) return false; PROFILE.wins -= n; saveProfile(); return true; }
function winsLabel(n) { return n === 1 ? '1 Win' : n + ' Wins'; }
function renderWinsChips() {
  document.querySelectorAll('[data-wins]').forEach(el => { el.innerHTML = `${WIN_ICON}<b>${winsBalance().toLocaleString()}</b>`; el.setAttribute('aria-label', winsLabel(winsBalance()) + ' to spend'); });
}

/* ---------- equipment ---------- */
function equippedSkin() { const s = PROFILE && PROFILE.equipped.skin; return s && SKINS[s] && owns('skin', s) ? s : null; }
function equipSkin(key) { if (key && !owns('skin', key)) return false; PROFILE.equipped.skin = key || null; saveProfile(); return true; }
function equippedPerks() { return (PROFILE ? PROFILE.equipped.perks : []).filter(k => PERKS[k] && owns('perk', k)).slice(0, MAX_PERKS); }
function togglePerk(key) {
  if (!owns('perk', key)) return false;
  const list = equippedPerks();
  const i = list.indexOf(key);
  if (i >= 0) list.splice(i, 1);
  else { if (list.length >= MAX_PERKS) list.shift(); list.push(key); }
  PROFILE.equipped.perks = list; saveProfile(); return true;
}

/* ---------- end-of-match rewards ----------
   Called once when a match ends. Returns { wins, lines } for the game-over
   screen. Victories pay by difficulty; a daily challenge always pays 1. */
function onMatchEnd() {
  if (!G || G.allAI || G.rewarded) return null;
  if (!PROFILE) loadProfile();
  G.rewarded = true;
  const won = G.winner === G.human;
  PROFILE.games++;
  if (won) PROFILE.victories++;
  let wins = 0; const lines = [];
  if (G.challenge) {
    const score = scoreOf(G.human);
    let rec = null;
    if (typeof recordChallengeScore === 'function') { try { rec = recordChallengeScore(G.challenge, score, true); } catch (e) { console.error(e); } }
    wins += 1; lines.push('Daily challenge played: +1 Win');
    if (rec && rec.text) lines.push(rec.text);
    if (rec && rec.bonus) { wins += rec.bonus; }
  } else if (won) {
    const w = DIFFICULTY[G.difficulty].wins;
    wins += w; lines.push(`Victory on ${DIFFICULTY[G.difficulty].name}: +${winsLabel(w)}`);
  }
  if (wins) addWins(wins); else saveProfile();
  return { wins, lines };
}

/* =====================================================================
   Part 15: weekly challenge — one seeded run a day, scored for points,
   with a weekly leaderboard and a free look at the limited-time tribe.
   ===================================================================== */
const CHAL_TURNS = 25;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CHAL_SIZES = ['small', 'medium', 'medium', 'large'];
const CHAL_DIFF = ['normal', 'normal', 'hard', 'hard', 'crazy'];

/* ---------- dates ---------- */
function dayId(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function mondayOf(d) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
function weekId(d) { return 'week-' + dayId(mondayOf(d || new Date())); }
function weekDays(d) {
  const m = mondayOf(d || new Date()), out = [];
  for (let k = 0; k < 7; k++) { const q = new Date(m.getFullYear(), m.getMonth(), m.getDate() + k); out.push(dayId(q)); }
  return out;
}
function strSeed(s) { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return (h >>> 0) % 2147483000; }
function chalRng(seed) { let a = seed % 2147483647 || 1; return () => { a = (a * 48271) % 2147483647; return (a - 1) / 2147483646; }; }

/* ---------- the run of the day ----------
   Everything about a day's run comes from its date, so every player gets
   the same map, the same rivals and the same tribe. */
function challengeOf(day) {
  const seed = strSeed('tessera:' + day), r = chalRng(seed);
  const pool = TRIBE_ORDER.slice();
  const tribe = pool[Math.floor(r() * pool.length)];
  const size = CHAL_SIZES[Math.floor(r() * CHAL_SIZES.length)];
  const difficulty = CHAL_DIFF[Math.floor(r() * CHAL_DIFF.length)];
  const opponents = 2 + Math.floor(r() * 4);
  const rivals = [];
  const fam = new Set([TRIBES[tribe].family]);
  const rest = AI_POOL.filter(k => k !== tribe);
  while (rivals.length < opponents && rest.length) {
    const k = rest.splice(Math.floor(r() * rest.length), 1)[0];
    if (fam.has(TRIBES[k].family)) continue;
    fam.add(TRIBES[k].family); rivals.push(k);
  }
  const par = 1600 + Math.round(r() * 500) + opponents * 120 + (difficulty === 'crazy' ? 500 : difficulty === 'hard' ? 250 : 0);
  return { id: day, day, week: weekId(new Date(day + 'T12:00:00')), seed, tribe, size, difficulty, opponents: rivals.length, rivals, par };
}
function chalState() {
  if (!PROFILE) loadProfile();
  const w = weekId();
  if (PROFILE.challenge.week !== w) { PROFILE.challenge = { week: w, days: {} }; saveProfile(); }
  return PROFILE.challenge;
}
function chalScore(day) { const d = chalState().days[day]; return d ? d.score : 0; }
function chalTotal() { const st = chalState(); return Object.keys(st.days).reduce((a, k) => a + (st.days[k].score || 0), 0); }

/* ---------- scoring ---------- */
function recordChallengeScore(ch, score, done) {
  if (!ch || !done) return null;
  const st = chalState();
  if (ch.week !== st.week) return { text: 'That run belonged to an earlier week.', bonus: 0 };
  const prev = st.days[ch.day];
  const first = !prev;
  const best = Math.max(score, prev ? prev.score : 0);
  st.days[ch.day] = { score: best, tribe: ch.tribe, at: Date.now(), runs: (prev ? prev.runs : 0) + 1 };
  saveProfile();
  let bonus = 0; const lines = [];
  if (first) {
    if (score >= ch.par * 1.4) { bonus = 2; lines.push(`Smashed the par score (${ch.par.toLocaleString()}): +2 Wins`); }
    else if (score >= ch.par) { bonus = 1; lines.push(`Beat the par score (${ch.par.toLocaleString()}): +1 Win`); }
    else lines.push(`Par for today was ${ch.par.toLocaleString()} — beat it tomorrow for bonus Wins.`);
  } else if (score > (prev ? prev.score : 0)) lines.push('New personal best for today — no extra Wins for repeat runs.');
  else lines.push('Practice run — your best score for today still stands.');
  return { text: lines.join(' '), bonus, best, first };
}

/* ---------- a believable weekly board, generated from the week seed ---------- */
function rivalBoard() {
  const w = weekId(), r = chalRng(strSeed('board:' + w)), rows = [];
  const days = weekDays().filter(d => d <= dayId()).length;
  const names = ['Kesh', 'Ravi', 'Tuuli', 'Marek', 'Noa', 'Ivo', 'Sable', 'Juno', 'Priya', 'Bex', 'Otto', 'Wren', 'Casi', 'Dax'];
  const used = new Set();
  for (let k = 0; k < 9; k++) {
    let n = names[Math.floor(r() * names.length)];
    while (used.has(n)) n = names[Math.floor(r() * names.length)] + Math.floor(r() * 90 + 10);
    used.add(n);
    const tribe = k === 0 ? LIMITED.tribe : TRIBE_ORDER[Math.floor(r() * TRIBE_ORDER.length)];
    const per = 900 + r() * 2600;
    let score = Math.round(per * Math.max(1, days) * (0.75 + r() * 0.5));
    if (k === 0) score = Math.round(score * 1.6 + 2200 * Math.max(1, days));   /* the limited tribe tops the board */
    rows.push({ name: n, tribe, score });
  }
  return rows;
}

/* ---------- screen ---------- */
function openChallenge() {
  if (!PROFILE) loadProfile();
  UIState.screen = 'chal';
  $('#menu').hidden = true; $('#setup').hidden = true; $('#shop').hidden = true; $('#chal').hidden = false;
  $('#chal').scrollTop = 0;
  pickStop();
  renderChallenge();
  renderWinsChips();
  updateSoundBtn();
  sfx('whoosh');
}
function closeChallenge() {
  UIState.screen = 'menu';
  $('#chal').hidden = true; $('#menu').hidden = false;
  updateSoundBtn(); syncMusic(true); sfx('back');
}
function renderChallenge() {
  const today = dayId(), ch = challengeOf(today), st = chalState(), T = TRIBES[ch.tribe];
  const played = !!st.days[today];
  const days = weekDays().map((d, k) => {
    const rec = st.days[d], cls = d === today ? 'today' : rec ? 'done' : d > today ? 'future' : '';
    return `<div class="day ${cls}"><b>${DAY_NAMES[k]}</b>${rec ? `<i>${rec.score.toLocaleString()}</i>` : d === today ? '<i>today</i>' : '<span>—</span>'}</div>`;
  }).join('');
  const mine = { name: PROFILE.nick || 'You', tribe: ch.tribe, score: chalTotal(), me: true };
  const board = rivalBoard().concat([mine]).sort((a, b) => b.score - a.score);
  const rows = board.map((r, k) => `<div class="lb-row ${r.me ? 'me' : ''}"><span class="rk">${k + 1}</span>
    <span class="who"><img src="${tribePortrait(r.tribe)}" alt=""><span><b>${esc(r.name)}</b><small>${TRIBES[r.tribe].name}${r.tribe === LIMITED.tribe ? ' · limited tribe' : ''}</small></span></span>
    <span class="pts">${r.score.toLocaleString()}</span></div>`).join('');
  const lim = TRIBES[LIMITED.tribe];
  $('#chalBody').innerHTML = `
    <div class="chal-hero" style="--tc:${T.color}">
      <img src="${tribePortrait(ch.tribe)}" alt="">
      <div><h3>Today's run — ${T.name}</h3>
        <p>Everyone plays the same seeded map today. Score as many points as you can before turn ${CHAL_TURNS}; cities, units, technology and kills all count.</p>
        <div class="chal-facts"><span>${ch.size} map</span><span>${ch.opponents} rival tribes</span><span>${DIFFICULTY[ch.difficulty].name}</span><span>${CHAL_TURNS} turns</span><span>Par ${ch.par.toLocaleString()} pts</span></div>
      </div>
    </div>
    <p class="sheet-note">${ownsTribe(ch.tribe) ? '' : `<b>${T.name}</b> is locked in the shop, but the challenge lends it to you for free today. `}Every run pays <b>+1 Win</b>, and beating par pays up to 2 more.</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn big primary" id="chalPlay">${played ? 'Play again (unscored)' : 'Play today’s run'}</button>
      ${played ? `<span class="sheet-bal" style="background:rgba(79,220,138,.18);box-shadow:inset 0 0 0 2px var(--good)">✓ Today: ${st.days[today].score.toLocaleString()} pts</span>` : ''}
    </div>
    <h3 class="sec-h">This week</h3>
    <div class="days">${days}</div>
    <h3 class="sec-h">Weekly leaderboard</h3>
    <p class="sheet-note" style="text-align:left">Your total is the sum of your best score each day. Leading the board this week: <b>${lim.name}</b>, the limited-time tribe — in the shop until ${LIMITED.pack.ends}. Scores are kept on this device.</p>
    <div class="lb">${rows}</div>`;
  const btn = $('#chalPlay');
  if (btn) btn.addEventListener('click', () => startChallenge(ch, played));
}

/* ---------- playing ---------- */
async function startChallenge(ch, practice) {
  if (UIState.loading) return;
  GEN++; resetFX();
  $('#chal').hidden = true;
  newGame({ tribe: ch.tribe, opponents: ch.opponents, rivals: ch.rivals, size: ch.size, difficulty: ch.difficulty,
    mode: 'glory', turnLimit: CHAL_TURNS, seed: ch.seed,
    challenge: { id: ch.id, day: ch.day, week: ch.week, par: ch.par, practice: !!practice, tribe: ch.tribe },
    perks: equippedPerks(), skin: equippedSkin() });
  G.viewAll = false;
  beginTurn(G.human);
  await runLoader({ tribe: ch.tribe, title: 'Daily challenge', sub: TRIBES[ch.tribe].name + ' · ' + CHAL_TURNS + ' turns for points', onReady: () => enterGame() });
  saveGame(); syncMusic(); sfx('turn');
  showModal(`<h2>Challenge run — ${esc(TRIBES[ch.tribe].name)}</h2>
    <p>You have <b>${CHAL_TURNS} turns</b> to score as many points as you can. Grow cities, research technology, build up your army and take rival cities — all of it adds points.</p>
    <p class="note">Par for today is <b>${ch.par.toLocaleString()}</b> points.${practice ? ' This is a practice run, so it will not change your best score.' : ''}</p>
    <div class="modal-actions"><button class="btn primary big" data-act="closeModal">Begin</button></div>`);
}
function challengeGameOver() {
  if (!$('#modal').hidden) closeModal();
  $('#overlay').hidden = true; UIState.overlay = null;
  const ch = G.challenge, score = scoreOf(G.human);
  const res = typeof onMatchEnd === 'function' ? onMatchEnd() : null;
  const best = chalScore(ch.day);
  const board = rivalBoard().concat([{ name: PROFILE.nick || 'You', tribe: ch.tribe, score: chalTotal(), me: true }]).sort((a, b) => b.score - a.score);
  const rank = board.findIndex(r => r.me) + 1;
  const lines = (res && res.lines || []).map(l => `<li>${esc(l)}</li>`).join('');
  showModal(`<h2>${score >= ch.par ? 'Par beaten!' : 'Run complete'}</h2>
    <p>You scored <b>${score.toLocaleString()}</b> points in ${CHAL_TURNS} turns as the ${esc(TRIBES[ch.tribe].name)}. Par was ${ch.par.toLocaleString()}.</p>
    <p>Best today: <b>${best.toLocaleString()}</b> · Week total: <b>${chalTotal().toLocaleString()}</b> · Board place: <b>#${rank}</b></p>
    ${res && res.wins ? `<p style="color:var(--gold);font-weight:700">+${winsLabel(res.wins)} earned</p>` : ''}
    ${lines ? `<ul style="margin:0;padding-left:18px;color:#cfd7f5;display:grid;gap:4px">${lines}</ul>` : ''}
    <div class="modal-actions"><button class="btn" data-act="closeModal">View the map</button><button class="btn primary" data-act="toChallenge">Back to the challenge</button></div>`);
  clearSave();
  SND.stopMusic(1.2);
  sfx(score >= ch.par ? 'victory' : 'defeat');
}
function setupChallenge() {
  $('#chalBack').addEventListener('click', closeChallenge);
}

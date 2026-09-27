/* ---- headless simulation harness ---- */
async function runSim(seed, opp, size, maxTurn, verbose) {
  newGame({ tribe: TRIBE_ORDER[seed % 6], opponents: opp, size, difficulty: 'normal', mode: 'domination', seed, allAI: true });
  beginTurn(0);
  const t0 = Date.now();
  let maxAiMs = 0;
  const snaps = [];
  while (!G.over && G.turn <= maxTurn) {
    const a = Date.now();
    await aiTurn(G.current);
    maxAiMs = Math.max(maxAiMs, Date.now() - a);
    if (G.over) break;
    const prevTurn = G.turn;
    advanceTribe();
    if (G.over) break;
    beginTurn(G.current);
    if (G.turn !== prevTurn && (G.turn % 5 === 0) && verbose) {
      snaps.push('T' + G.turn + ' ' + G.tribes.map(t => { if (!t.alive) return t.key.slice(0,4)+':X'; const inc = computeIncome(t.i); const sites = G.tiles.filter(q=>q.owner===t.i&&q.site).length; return `${t.key.slice(0,4)}:c${citiesOf(t.i).length}/u${unitsOf(t.i).length}/lv${citiesOf(t.i).reduce((a,c)=>a+c.level,0)}/T${Object.keys(t.techs).length}/s${sites} bank ${t.res.food}|${t.res.wood}|${t.res.gold} inc ${inc.food}|${inc.wood}|${inc.gold}`; }).join('  '));
    }
  }
  const out = {
    seed, size, opp, turn: G.turn, over: G.over, winner: G.winner >= 0 ? G.tribes[G.winner].key : '-',
    ms: Date.now() - t0, maxAiMs,
    alive: G.tribes.filter(t => t.alive).map(t => t.key + '(' + citiesOf(t.i).length + 'c,' + unitsOf(t.i).length + 'u)').join(' '),
    units: G.units.length, villagesLeft: G.cities.filter(c => c.owner === -1).length,
    types: Object.entries(G.units.reduce((m, u) => (m[u.type] = (m[u.type] || 0) + 1, m), {})).map(e => e.join(':')).join(' ')
  };
  if (verbose) { console.log(snaps.join('\n')); }
  return out;
}
(async () => {
  const args = process.argv.slice(2);
  const n = +args[0] || 4, maxTurn = +args[1] || 80, verbose = args[2] === 'v';
  const sizes = ['small', 'medium', 'large'];
  for (let s = 1; s <= n; s++) {
    try {
      const r = await runSim(s * 7919, 3 + (s % 3), sizes[s % 3], maxTurn, verbose);
      console.log(JSON.stringify(r));
    } catch (e) { console.log('SEED', s, 'ERROR', e.stack); }
  }
})();

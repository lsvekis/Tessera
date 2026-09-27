/* ---- difficulty harness: a "human" played by a normal-strength AI vs the chosen difficulty ---- */
async function playOne(seed, diff, tribe, opp, size, maxTurn) {
  newGame({ tribe, opponents: opp, size, difficulty: diff, mode: 'domination', seed });
  beginTurn(0);
  let guard = 0;
  while (!G.over && G.turn <= maxTurn && guard++ < 5000) {
    const ti = G.current;
    if (ti === G.human) {
      for (const c of citiesOf(ti)) while (c.rewards.length) chooseReward(c, aiPickReward(c, c.rewards[0]));
      const d = G.difficulty; G.difficulty = 'normal';
      try { await aiTurn(ti); } finally { G.difficulty = d; }
    } else await aiTurn(ti);
    if (G.over) break;
    advanceTribe(); if (G.over) break;
    beginTurn(G.current);
  }
  const me = G.tribes[0];
  return { won: G.over && G.winner === 0, alive: me.alive, turn: G.turn, cities: citiesOf(0).length, score: scoreOf(0),
    best: Math.max(...G.tribes.slice(1).map(t => scoreOf(t.i))) };
}
(async () => {
  const args = process.argv.slice(2);
  const diffs = (args[0] || 'easy,normal,hard,crazy').split(','), N = +args[1] || 12, maxTurn = +args[2] || 100, size = args[3] || 'small';
  for (const d of diffs) {
    let won = 0, alive = 0, lost = 0, tsum = 0, lead = 0, lsum = 0; const t0 = Date.now();
    for (let s = 1; s <= N; s++) {
      const tribe = FREE_TRIBES[s % FREE_TRIBES.length];
      const r = await playOne(s * 7919 + d.length * 131, d, tribe, 3, size, maxTurn);
      if (r.won) { won++; tsum += r.turn; } else if (r.alive) { alive++; if (r.score > r.best) lead++; } else { lost++; lsum += r.turn; }
    }
    console.log(`${d.padEnd(7)} won ${won}/${N}  undecided ${alive} (leading ${lead})  lost ${lost}  avg win turn ${won ? (tsum / won).toFixed(0) : '-'}  avg loss turn ${lost ? (lsum / lost).toFixed(0) : '-'}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
})();

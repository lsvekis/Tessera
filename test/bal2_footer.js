/* ---- tribe balance: AI vs AI, every tribe equally often ---- */
(async () => {
  const wins = {}, present = {};
  const N = +process.argv[2] || 30, maxTurn = +process.argv[3] || 110;
  const pool = TRIBE_ORDER.slice();
  for (let s = 1; s <= N; s++) {
    newGame({ tribe: pool[s % pool.length], opponents: 3, size: s % 3 === 0 ? 'medium' : 'small', difficulty: 'normal', mode: 'domination', seed: s * 104729, allAI: true });
    for (const t of G.tribes) present[t.key] = (present[t.key] || 0) + 1;
    beginTurn(0);
    while (!G.over && G.turn <= maxTurn) { await aiTurn(G.current); if (G.over) break; advanceTribe(); if (G.over) break; beginTurn(G.current); }
    const w = G.over && G.winner >= 0 ? G.tribes[G.winner].key : (() => { let b = -1, bs = -1; for (const t of G.tribes) if (t.alive && scoreOf(t.i) > bs) { bs = scoreOf(t.i); b = t.i; } return 'lead:' + G.tribes[b].key; })();
    wins[w] = (wins[w] || 0) + 1;
  }
  for (const k of TRIBE_ORDER) console.log(k.padEnd(12), 'wins', String(wins[k] || 0).padStart(3), '/ played', String(present[k] || 0).padStart(3), ' rate', ((wins[k] || 0) / (present[k] || 1) * 100).toFixed(0).padStart(3) + '%', '  leads', wins['lead:' + k] || 0);
})();

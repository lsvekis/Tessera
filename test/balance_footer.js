(async () => {
  const wins = {}, present = {};
  const N = +process.argv[2] || 30;
  for (let s = 1; s <= N; s++) {
    newGame({ tribe: TRIBE_ORDER[s % 6], opponents: 3 + (s % 2), size: s % 3 === 0 ? 'medium' : 'small', difficulty: 'normal', mode: 'domination', seed: s * 104729, allAI: true });
    for (const t of G.tribes) present[t.key] = (present[t.key] || 0) + 1;
    beginTurn(0);
    while (!G.over && G.turn <= 120) { await aiTurn(G.current); if (G.over) break; advanceTribe(); if (G.over) break; beginTurn(G.current); }
    const w = G.over && G.winner >= 0 ? G.tribes[G.winner].key : 'none';
    wins[w] = (wins[w] || 0) + 1;
  }
  for (const k of TRIBE_ORDER) console.log(k.padEnd(12), 'wins', (wins[k] || 0), '/ played', present[k] || 0, ' rate', ((wins[k] || 0) / (present[k] || 1) * 100).toFixed(0) + '%');
  console.log('none', wins.none || 0);
})();

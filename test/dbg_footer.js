(async () => {
  const d = process.argv[2] || 'easy', N = +process.argv[3] || 30;
  for (let s = 1; s <= N; s++) {
    const tribe = FREE_TRIBES[s % FREE_TRIBES.length];
    newGame({ tribe, opponents: 3, size: 'small', difficulty: d, mode: 'domination', seed: s * 7919 + d.length * 131 });
    beginTurn(0);
    let lines = [];
    while (!G.over && G.turn <= 100) {
      const ti = G.current;
      if (ti === G.human) { for (const c of citiesOf(ti)) while (c.rewards.length) chooseReward(c, aiPickReward(c, c.rewards[0])); const dd = G.difficulty; G.difficulty = 'normal'; try { await aiTurn(ti); } finally { G.difficulty = dd; } }
      else await aiTurn(ti);
      if (G.turn % 5 === 0 && ti === 0) lines.push('T' + G.turn + ' ' + G.tribes.map(t => `${t.key.slice(0,5)}:${t.alive ? citiesOf(t.i).length + 'c' + unitsOf(t.i).length + 'u g' + t.res.gold + ' +' + computeIncome(t.i).gold : 'X'}`).join(' '));
      if (G.over) break; advanceTribe(); if (G.over) break; beginTurn(G.current);
    }
    if (G.winner !== 0) { console.log('seed', s, tribe, 'LOST turn', G.turn, 'winner', G.winner >= 0 ? G.tribes[G.winner].key : '-'); console.log(lines.join('\n')); console.log(G.log.filter(l => l.kind === 'capture' && /from/.test(l.text)).map(l => 'T' + l.t + ' ' + l.text).join('\n')); }
  }
})();

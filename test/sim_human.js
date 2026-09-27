(async () => {
  newGame({ tribe: 'sunspear', opponents: 3, size: 'small', difficulty: 'normal', mode: 'domination', seed: 12345 });
  beginTurn(0);
  for (let step = 0; step < 60 && !G.over; step++) {
    if (G.current === 0) {
      for (const c of G.cities) while (c.owner === 0 && c.rewards.length) chooseReward(c, CITY_REWARDS[c.rewards[0]][0].id);
    }
    const ti = G.current;
    const before = JSON.stringify(G.tribes[ti].res);
    await aiTurn(ti);
    if (ti === 0) {
      const caps = citiesOf(0).map(c => `${c.name}:lv${c.level} occ=${OCC[idx(c.x,c.y)]?unitAt(c.x,c.y).type:'-'} ${cityUnitCount(c)}/${cityCapacity(c)}`).join(' ');
      console.log(`T${G.turn} human before ${before} after ${JSON.stringify(G.tribes[0].res)} units=${unitsOf(0).length} ${caps}`);
    }
    advanceTribe(); if (G.over) break; beginTurn(G.current);
  }
})();

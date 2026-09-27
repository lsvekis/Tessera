const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('ERR_TUNNEL')) errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await page.goto('file://' + path.resolve('dist/test.html'));
  await page.waitForTimeout(800);
  const size = process.argv[2] || 'small', opp = +(process.argv[3] || 3), turns = +(process.argv[4] || 60);
  await page.evaluate(([size, opp]) => { UIState.settings.speed = 0; SPEED = 0.05; UIState.settings.warnReady = false; UIState.opts = { tribe: 'sunspear', opponents: opp, size, difficulty: 'normal', mode: 'domination' }; startGame(); closeModal(); }, [size, opp]);
  let t0 = Date.now();
  for (let k = 0; k < turns; k++) {
    const st = await page.evaluate(async () => {
      // resolve modals
      for (let g = 0; g < 10; g++) {
        const r = document.querySelector('#modalBody [data-act="reward"]');
        if (r && !document.querySelector('#modal').hidden) { r.click(); continue; }
        break;
      }
      if (G.over) return { over: true, turn: G.turn, winner: G.winner };
      await aiTurn(G.human);
      for (let g = 0; g < 10; g++) {
        const r = document.querySelector('#modalBody [data-act="reward"]');
        if (r && !document.querySelector('#modal').hidden) { r.click(); continue; }
        break;
      }
      if (!document.querySelector('#modal').hidden && !G.over) closeModal();
      if (G.over) return { over: true, turn: G.turn, winner: G.winner };
      const p = endTurn(true);
      await p;
      return { over: G.over, turn: G.turn, human: G.tribes[G.human].alive, cities: citiesOf(G.human).length, units: unitsOf(G.human).length, res: G.tribes[G.human].res, alive: G.tribes.filter(t => t.alive).length };
    });
    if (k % 5 === 0 || st.over) console.log(JSON.stringify(st));
    if (st.over) break;
  }
  console.log('elapsed', Date.now() - t0, 'ms');
  await page.evaluate(() => { UIState.settings.speed = 1; SPEED = 1; closeModal(); const c = capitalOf(G.human) || G.cities.find(c => c.owner >= 0); if (c) centerOn(c.x, c.y, false); cam.z = 0.8; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/20_midgame.png' });
  await page.evaluate(() => toggleMapStats());
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/21_midgame_stats.png' });
  await page.evaluate(() => { toggleMapStats(); openOverlay('stats'); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/22_stats.png' });
  console.log('ERRORS:', errors.length ? errors.slice(0, 10).join('\n') : 'none');
  await browser.close();
})();

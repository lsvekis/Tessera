const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push(m.text()); });
  await page.goto('file://' + path.resolve('dist/test.html'));
  await page.waitForTimeout(600);
  await page.click('#mNew'); await page.click('.tcard[data-tribe="tidecallers"]'); await page.click('#sStart');
  await page.waitForTimeout(500);
  await page.click('#modalBody [data-act="closeModal"]');
  // train a unit + build a site + research, then end turn via UI button
  const r1 = await page.evaluate(async () => {
    UIState.settings.speed = 0; SPEED = 0.05;
    const c = capitalOf(G.human); selectCity(c);
    const u = unitsOf(G.human)[0]; const tgt = [...moveTargets(u).keys()][0]; doMove(u, tgt);
    const trained = !!doTrain(c, 'warrior');
    const ti = G.tiles.findIndex(t => t.owner === G.human && t.t === 'forest' && !t.site);
    const built = ti >= 0 ? doTileAction(G.human, tx(ti), ty(ti), 'build:lumber') : 'no forest';
    const researched = doResearch(G.human, 'riding');
    return { trained, built, researched, res: G.tribes[G.human].res };
  });
  console.log('actions', JSON.stringify(r1));
  await page.click('#bEnd');
  await page.waitForTimeout(400);
  if (await page.$('#modalBody [data-act="confirmYes"]')) await page.click('#modalBody [data-act="confirmYes"]');
  await page.waitForFunction(() => isHumanTurn() && G.turn === 2, null, { timeout: 60000 });
  console.log('turn 2 reached', await page.evaluate(() => JSON.stringify(G.tribes[G.human].res)));
  await page.evaluate(() => openGameMenu());
  await page.click('#modalBody [data-act="toMenu"]');
  await page.waitForTimeout(800);
  const contVisible = await page.evaluate(() => !document.querySelector('#mContinue').hidden);
  console.log('continue visible', contVisible);
  await page.click('#mContinue');
  await page.waitForTimeout(600);
  console.log('restored', await page.evaluate(() => JSON.stringify({ screen: UIState.screen, turn: G.turn, tribe: G.tribes[G.human].key, units: unitsOf(G.human).length, hud: !document.querySelector('#hud').hidden })));
  // reload page -> continue from localStorage
  await page.reload(); await page.waitForTimeout(800);
  console.log('after reload continue visible', await page.evaluate(() => !document.querySelector('#mContinue').hidden));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();

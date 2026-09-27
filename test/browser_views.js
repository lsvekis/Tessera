const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const mk = async (vp) => { const p = await browser.newPage({ viewport: vp, deviceScaleFactor: vp.width < 500 ? 2 : 1, hasTouch: vp.width < 500 }); p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push(m.text()); }); await p.goto('file://' + path.resolve('dist/test.html')); await p.waitForTimeout(700); return p; };
  const page = await mk({ width: 1440, height: 900 });
  await page.evaluate(() => { UIState.settings.speed = 0; SPEED = 0.05; UIState.settings.warnReady = false; UIState.opts = { tribe: 'verdant', opponents: 3, size: 'small', difficulty: 'easy', mode: 'domination' }; startGame(); closeModal(); });
  for (let k = 0; k < 11; k++) {
    await page.evaluate(async () => {
      for (let g = 0; g < 10; g++) { const r = document.querySelector('#modalBody [data-act="reward"]'); if (r && !document.querySelector('#modal').hidden) r.click(); else break; }
      if (G.over) return;
      if (G.turn < 11) await aiTurn(G.human);
      for (let g = 0; g < 10; g++) { const r = document.querySelector('#modalBody [data-act="reward"]'); if (r && !document.querySelector('#modal').hidden) r.click(); else break; }
      if (!document.querySelector('#modal').hidden) closeModal();
      if (G.turn < 11) await endTurn(true);
    });
  }
  const info = await page.evaluate(() => {
    UIState.settings.speed = 1; SPEED = 1; closeModal();
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const us = unitsOf(G.human);
    const tgt = us[0] || capitalOf(G.human);
    centerOn(tgt.x, tgt.y, false); cam.z = 1.25;
    if (us[0]) selectUnit(us[0]);
    return { turn: G.turn, units: us.length, cities: citiesOf(G.human).length, over: G.over };
  });
  console.log(JSON.stringify(info));
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'shots/30_game_units.png' });
  // hover an enemy with a selected unit if any attack target exists
  const hov = await page.evaluate(() => {
    for (const u of unitsOf(G.human)) { const ts = attackTargets(u); if (ts.length && canAttackNow(u)) { selectUnit(u); centerOn(u.x, u.y, false); const e = ts[0]; const t = tile(e.x, e.y); return { sx: (isoX(e.x, e.y) - cam.x) * cam.z + VW / 2, sy: (isoY(e.x, e.y) - ELEV[t.t] - 10 - cam.y) * cam.z + VH / 2 }; } }
    return null;
  });
  if (hov) { await page.mouse.move(hov.sx, hov.sy); await page.waitForTimeout(500); await page.screenshot({ path: 'shots/31_forecast.png' }); console.log('forecast shot'); }
  else console.log('no attack target available');
  // mobile
  const m = await mk({ width: 390, height: 844 });
  await m.waitForTimeout(1500);
  await m.screenshot({ path: 'shots/40_m_menu.png' });
  await m.click('#mNew'); await m.waitForTimeout(400);
  await m.screenshot({ path: 'shots/41_m_setup.png' });
  await m.click('#sStart'); await m.waitForTimeout(800);
  await m.screenshot({ path: 'shots/42_m_welcome.png' });
  await m.evaluate(() => closeModal());
  await m.evaluate(() => { const u = unitsOf(G.human)[0]; selectUnit(u); });
  await m.waitForTimeout(500);
  await m.screenshot({ path: 'shots/43_m_game.png' });
  await m.evaluate(() => openOverlay('tech')); await m.waitForTimeout(400);
  await m.screenshot({ path: 'shots/44_m_tech.png' });
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();

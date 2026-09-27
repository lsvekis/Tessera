/* screenshots of the main screens: node test/browser_shots.js <outdir> [w] [h] */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const out = process.argv[2] || '/tmp', W = +process.argv[3] || 1366, H = +process.argv[4] || 820;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, isMobile: W < 600, hasTouch: W < 600 });
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1])); page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve('dist/test.html')); await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/s_menu.png` });
  await page.evaluate(() => document.querySelector('#mNew').click()); await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/s_pick.png` });
  await page.evaluate(() => { SPEED = 0.05; document.querySelector('#sStart').click(); }); await page.waitForTimeout(7000);
  await page.evaluate(() => { if (UIState.modal) closeModal(); G.tribes[G.human].res.gold = 60; renderTopbar(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/s_game.png` });
  await page.evaluate(() => { const c = capitalOf(G.human); selectCity(c); }); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/s_city.png` });
  await page.evaluate(() => { const c = capitalOf(G.human); const n = neighbors(c.x, c.y).find(([x, y]) => tileOptions(G.human, x, y).length); if (n) selectTile(idx(n[0], n[1])); }); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/s_tile.png` });
  await page.evaluate(() => { const u = unitsOf(G.human)[0]; selectUnit(u); }); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/s_unit.png` });
  await page.evaluate(() => openOverlay('upgrades')); await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/s_upgrades.png` });
  await page.evaluate(() => closeOverlay());
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();

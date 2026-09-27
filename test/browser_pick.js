const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  const hook = (p) => { p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + e.stack)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push(m.text()); }); };
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); hook(page);
  await page.goto('file://' + path.resolve('dist/test.html'));
  await page.waitForTimeout(2500);
  await page.mouse.click(30, 450);
  await page.waitForTimeout(300);
  await page.click('#mNew');
  await page.waitForTimeout(1300);
  console.log('song on open', await page.evaluate(() => SND.current()));
  await page.screenshot({ path: 'shots/70_pick_verdant.png' });
  const songs = [];
  for (const k of ['sunspear', 'frostholm', 'tidecallers', 'umbral', 'ironvale']) {
    await page.click(`.tpick[data-tribe="${k}"]`);
    await page.waitForTimeout(k === 'sunspear' || k === 'umbral' ? 1400 : 700);
    songs.push(await page.evaluate(() => SND.current()));
    if (k === 'sunspear' || k === 'umbral') await page.screenshot({ path: `shots/71_pick_${k}.png` });
  }
  console.log('songs', songs.join(', '));
  await page.click('#sRandom');
  await page.waitForTimeout(2600);
  console.log('after random', await page.evaluate(() => UIState.opts.tribe + ' ' + SND.current()));
  await page.screenshot({ path: 'shots/72_pick_random.png' });
  await page.click('#sBack'); await page.waitForTimeout(900);
  console.log('back to menu song', await page.evaluate(() => SND.current()));
  await page.click('#mNew'); await page.waitForTimeout(600);
  await page.click('.tpick[data-tribe="sunspear"]'); await page.waitForTimeout(300);
  await page.click('#sStart'); await page.waitForTimeout(4600);
  console.log('in game', await page.evaluate(() => JSON.stringify({ screen: UIState.screen, song: SND.current() })));
  await page.evaluate(() => closeModal()); await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/73_game_topbar.png', clip: { x: 0, y: 0, width: 720, height: 80 } });
  // phone
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); hook(m);
  await m.goto('file://' + path.resolve('dist/test.html'));
  await m.waitForTimeout(2200);
  await m.tap('#mNew'); await m.waitForTimeout(1300);
  await m.screenshot({ path: 'shots/74_m_pick.png' });
  await m.tap('.tpick[data-tribe="frostholm"]'); await m.waitForTimeout(900);
  await m.evaluate(() => document.querySelector('#setup').scrollTo(0, 400)); await m.waitForTimeout(300);
  await m.screenshot({ path: 'shots/75_m_pick_scrolled.png' });
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();

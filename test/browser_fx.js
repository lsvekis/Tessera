const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('ERR_TUNNEL')) errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await page.goto('file://' + path.resolve('dist/test.html'));
  await page.waitForTimeout(650);
  await page.screenshot({ path: 'shots/50_menu_anim.png' });
  await page.waitForTimeout(2600);
  await page.mouse.click(40, 450);   // user gesture unlocks audio
  await page.waitForTimeout(500);
  console.log('audio', JSON.stringify(await page.evaluate(() => ({ ready: SND.ready(), song: SND.current(), btn: document.querySelector('#sndBtn').textContent }))));
  await page.hover('#mNew');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/51_menu_hover.png' });
  await page.click('#mNew');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'shots/52_setup_anim.png' });
  await page.waitForTimeout(700);
  await page.click('.tcard[data-tribe="umbral"]');
  await page.waitForTimeout(300);
  await page.click('#sStart');
  for (const [ms, f] of [[350, '53_loader_a'], [900, '54_loader_b'], [1300, '55_loader_c'], [1150, '56_loader_d']]) { await page.waitForTimeout(ms); await page.screenshot({ path: `shots/${f}.png` }); }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/57_after_loader.png' });
  console.log('after', JSON.stringify(await page.evaluate(() => ({ screen: UIState.screen, loading: UIState.loading, song: SND.current(), modal: !document.querySelector('#modal').hidden, loaderHidden: document.querySelector('#loader').hidden }))));
  // exercise every sound effect once
  const sounds = await page.evaluate(async () => {
    const list = ['hover','click','back','toggle','select','move','hit','shoot','boulder','kill','capture','level','build','buy','train','research','forge','heal','promote','reward','magic','feast','bad','turn','endturn','whoosh','tick','riser','boom','victory','defeat'];
    for (const k of list) { SND.play(k); await new Promise(r => setTimeout(r, 30)); }
    for (const k of TRIBE_ORDER) SND.tribe(k);
    return list.length;
  });
  console.log('played sounds', sounds);
  // continue flow through quick loader
  await page.evaluate(() => { closeModal(); openGameMenu(); });
  await page.click('#modalBody [data-act="toMenu"]');
  await page.waitForTimeout(1500);
  console.log('menu song', await page.evaluate(() => SND.current()));
  await page.click('#mContinue');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'shots/58_continue_loader.png' });
  await page.waitForTimeout(2200);
  console.log('continued', JSON.stringify(await page.evaluate(() => ({ screen: UIState.screen, song: SND.current(), loaderHidden: document.querySelector('#loader').hidden }))));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();

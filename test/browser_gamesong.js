const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve('dist/test.html'));
  await page.waitForTimeout(1500); await page.mouse.click(30, 400); await page.waitForTimeout(200);
  await page.click('#mNew'); await page.waitForTimeout(500);
  await page.click('.tpick[data-tribe="tidecallers"]'); await page.waitForTimeout(300);
  await page.click('#sStart'); await page.waitForTimeout(6500);
  console.log('in game', await page.evaluate(() => JSON.stringify({ screen: UIState.screen, loading: UIState.loading, song: SND.current() })));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();

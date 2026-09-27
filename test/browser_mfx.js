const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('file://' + path.resolve('dist/test.html'));
  await page.waitForTimeout(3200);
  await page.screenshot({ path: 'shots/60_m_menu.png' });
  await page.tap('#mNew'); await page.waitForTimeout(900);
  await page.tap('#sStart'); await page.waitForTimeout(1700);
  await page.screenshot({ path: 'shots/61_m_loader.png' });
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();

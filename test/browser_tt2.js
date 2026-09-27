const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const out = process.argv[2] || '/tmp';
  for (const vp of [{ width: 1366, height: 820, name: 'desk' }, { width: 390, height: 800, name: 'phone', mobile: true }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto('file://' + path.resolve('dist/test.html'));
    await page.waitForTimeout(1200); await page.mouse.click(5, 5);
    await page.evaluate(() => { document.querySelector('#mNew').click(); });
    await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('#sStart').click());
    await page.waitForTimeout(6800);
    // give resources so research is possible
    await page.evaluate(() => { if (UIState.modal) closeModal(); const t = G.tribes[G.human]; t.res.gold = 400; t.res.food = 400; t.res.wood = 400; renderTopbar(); openOverlay('tech'); });
    await page.waitForTimeout(500);
    const s0 = await page.evaluate(() => ({ z: TT.z, x: TT.x, y: TT.y, tiles: document.querySelectorAll('#ttWorld .tile').length, sel: UIState.techSel, stage: document.getElementById('ttStage').getBoundingClientRect().toJSON() }));
    console.log(vp.name, 'initial', JSON.stringify(s0));
    await page.screenshot({ path: `${out}/tt_${vp.name}_fit.png` });
    // zoom in button
    await page.click('.tt2-tools [data-zoom="in"]'); await page.click('.tt2-tools [data-zoom="in"]');
    await page.waitForTimeout(100);
    const z1 = await page.evaluate(() => TT.z);
    // wheel zoom
    const st = s0.stage;
    if (!vp.mobile) { await page.mouse.move(st.x + st.width / 2, st.y + st.height / 2); await page.mouse.wheel(0, -400); await page.waitForTimeout(100); }
    const z2 = await page.evaluate(() => TT.z);
    console.log(vp.name, 'zoom btn', z1.toFixed(3), 'after wheel', z2.toFixed(3), 'label', await page.textContent('.tt2-tools .zl'));
    // center on the selected tile and drag it
    const key = s0.sel;
    await page.evaluate((k) => ttCenterOn(k), key);
    await page.waitForTimeout(50);
    const tb = await page.evaluate((k) => document.querySelector(`#ttWorld [data-tile="${k}"]`).getBoundingClientRect().toJSON(), key);
    const cx = tb.x + tb.width / 2, cy = tb.y + tb.height / 2;
    if (!vp.mobile) {
      await page.mouse.move(cx, cy); await page.mouse.down();
      for (let k = 1; k <= 10; k++) { await page.mouse.move(cx + k * 30, cy + k * 12); await page.waitForTimeout(16); }
      const held = await page.evaluate((k) => ({ off: TT.off[k], held: document.querySelector(`#ttWorld [data-tile="${k}"]`).classList.contains('held'), tr: document.querySelector(`#ttWorld [data-tile="${k}"] .tile-body`).style.transform }), key);
      console.log(vp.name, 'while held', JSON.stringify(held));
      await page.screenshot({ path: `${out}/tt_${vp.name}_drag.png` });
      await page.mouse.up();
      await page.waitForTimeout(90);
      const mid = await page.evaluate((k) => TT.off[k], key);
      await page.waitForTimeout(900);
      const after = await page.evaluate((k) => ({ off: TT.off[k] || null, raf: TT.raf, sel: UIState.techSel }), key);
      console.log(vp.name, 'spring mid', JSON.stringify(mid), 'settled', JSON.stringify(after));
    }
    // click a different tile to select (no drag)
    const other = await page.evaluate(() => Object.keys(TECHS).find(k => techState(G.human, k) === 'available' && k !== UIState.techSel));
    await page.evaluate((k) => ttCenterOn(k), other);
    const ob = await page.evaluate((k) => document.querySelector(`#ttWorld [data-tile="${k}"]`).getBoundingClientRect().toJSON(), other);
    if (vp.mobile) await page.tap(`#ttWorld [data-tile="${other}"]`, { position: { x: ob.width / 2, y: ob.height / 2 } }).catch(e => console.log('tap err', e.message));
    else await page.mouse.click(ob.x + ob.width / 2, ob.y + ob.height / 2);
    await page.waitForTimeout(100);
    console.log(vp.name, 'select click ->', await page.evaluate(() => UIState.techSel), 'expected', other);
    // research it via side button
    const before = await page.evaluate(() => ({ gold: G.tribes[G.human].res.gold, n: Object.keys(G.tribes[G.human].techs).length }));
    await page.evaluate(() => document.querySelector('#ttSide [data-act="research"]').scrollIntoView());
    await page.click('#ttSide [data-act="research"]');
    await page.waitForTimeout(330);
    const anim = await page.evaluate((k) => ({ unlocking: document.querySelector(`#ttWorld [data-tile="${k}"]`).classList.contains('unlocking'), banner: document.getElementById('ttBanner').className, charge: document.querySelector(`[data-ln="${k}"] .ln-charge`).getAttribute('class'), fx: FXP.list.length }), other);
    await page.screenshot({ path: `${out}/tt_${vp.name}_unlock.png` });
    await page.waitForTimeout(1200);
    const after = await page.evaluate((k) => ({ gold: G.tribes[G.human].res.gold, n: Object.keys(G.tribes[G.human].techs).length, cls: document.querySelector(`#ttWorld [data-tile="${k}"]`).className, toasts: document.querySelectorAll('.toast').length }), other);
    console.log(vp.name, 'research', JSON.stringify(before), JSON.stringify(anim), JSON.stringify(after));
    await page.screenshot({ path: `${out}/tt_${vp.name}_after.png` });
    // keyboard zoom
    const zk0 = await page.evaluate(() => TT.z); await page.keyboard.press('Minus'); const zk1 = await page.evaluate(() => TT.z); await page.keyboard.press('0'); const zk2 = await page.evaluate(() => TT.z);
    console.log(vp.name, 'keys', zk0.toFixed(3), zk1.toFixed(3), zk2.toFixed(3));
    // armory
    await page.evaluate(() => openOverlay('armory'));
    await page.waitForTimeout(200);
    const ak = await page.evaluate(() => { const b = document.querySelector('[data-act="armory"]:not([disabled])'); return b && b.dataset.key; });
    if (ak) {
      await page.click(`[data-act="armory"][data-key="${ak}"]`);
      await page.waitForTimeout(160);
      const a = await page.evaluate((k) => ({ bought: document.querySelector(`[data-card="${k}"]`).classList.contains('bought'), pip: !!document.querySelector(`[data-card="${k}"] .lvls i.new`), fx: FXP.list.length, lvl: G.tribes[G.human].armory[k] }), ak);
      console.log(vp.name, 'armory', ak, JSON.stringify(a));
      await page.screenshot({ path: `${out}/tt_${vp.name}_armory.png` });
    } else console.log(vp.name, 'no armory upgrade available');
    console.log(vp.name, 'ERRORS:', errors.length ? errors.join('\n') : 'none');
    await page.close();
  }
  await browser.close();
})();

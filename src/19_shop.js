/* =====================================================================
   Part 14: item shop — tribes, unit skins and match perks, bought with
   Wins (earned by winning matches) or real money.
   ===================================================================== */
const SHOP = { tab: 'tribes', from: 'menu' };
/* [wins, usd] */
const PRICES = {
  tribe: { ironvale: [8, '1.99'], verdant: [8, '1.99'], tidecallers: [8, '1.99'], maccabees: [10, '1.99'], northpole: [12, '2.49'],
    liberty: [10, '1.99'], meowtopia: [12, '2.49'], rexlands: [14, '2.99'], cogworks: [14, '2.99'], pumpkin: [16, '2.99'] },
  skin: { golden: [14, '2.99'], shadow: [10, '1.99'], neon: [12, '2.49'], skeleton: [8, '1.99'], pumpkinhead: [8, '1.99'], ghost: [10, '2.49'] },
  perk: { headstart: [4, '0.99'], bodyguard: [5, '0.99'], explorer: [4, '0.99'], tax: [6, '1.49'], veteran: [6, '1.49'], fortress: [8, '1.99'] }
};
const PACK_PRICE = [20, LIMITED.pack.usd];
const PERK_ICON = {
  coin: '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><circle cx="12" cy="13" r="9" fill="#d99a12"/><circle cx="12" cy="11.6" r="8.4" fill="#ffd54a"/><circle cx="12" cy="11.6" r="5.2" fill="none" stroke="#e0a91b" stroke-width="1.8"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M12 2.5 20 5v7c0 5-3.4 8.2-8 9.5C7.4 20.2 4 17 4 12V5z" fill="#5aa9ff"/><path d="M12 2.5 20 5v7c0 5-3.4 8.2-8 9.5z" fill="#3b83d8"/><path d="m8.5 12 2.6 2.6L16 9.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>',
  map: '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M2 5.5 8.5 3 15.5 6 22 3.5v15L15.5 21 8.5 18 2 20.5z" fill="#e8d7ae"/><path d="M8.5 3v15M15.5 6v15" stroke="#b39463" stroke-width="1.4"/><circle cx="12" cy="11" r="2.2" fill="#e5484d"/></svg>',
  crown: '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M3 18 4.5 7l4.6 4L12 4.5 14.9 11l4.6-4L21 18z" fill="#ffd54a"/><path d="M12 4.5 14.9 11l4.6-4L21 18h-9z" fill="#e0a91b"/><rect x="3" y="18" width="18" height="3" rx="1.2" fill="#b8860b"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z" fill="#ffd54a" stroke="#b8860b" stroke-width="1"/></svg>',
  wall: '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M2 9h3V6h3v3h3V6h2v3h3V6h3v3h3v12H2z" fill="#c9c2b4"/><path d="M2 14h20M8 9v5M16 9v5M5 14v7M12 14v7M19 14v7" stroke="#8d867a" stroke-width="1.2"/></svg>'
};
const GOLD_TAG = { legendary: 'Legendary', epic: 'Epic', rare: 'Rare' };

/* ---------- helpers ---------- */
function priceOf(kind, key) { return (PRICES[kind] && PRICES[kind][key]) || [10, '1.99']; }
function daysLeft(ends) {
  const end = new Date(ends + 'T23:59:59'), now = new Date();
  return Math.ceil((end - now) / 86400000);
}
function packLive() { return daysLeft(LIMITED.pack.ends) > 0; }
function packOwned() { return LIMITED.pack.skins.every(k => owns('skin', k)); }
function winBtn(kind, key, wins, dis) {
  const can = winsBalance() >= wins;
  return `<button class="btn ${can ? 'primary' : ''}" data-buy="${kind}" data-key="${key}" ${dis ? 'disabled' : ''}>${WIN_ICON}${wins}</button>`;
}
function usdBtn(kind, key, usd) { return `<button class="btn" data-usd="${kind}" data-key="${key}">$${usd}</button>`; }

/* ---------- screen ---------- */
function openShop(tab) {
  if (!PROFILE) loadProfile();
  SHOP.from = UIState.screen === 'setup' ? 'setup' : 'menu';
  SHOP.tab = tab || SHOP.tab;
  UIState.screen = 'shop';
  $('#menu').hidden = true; $('#setup').hidden = true; $('#shop').hidden = false; $('#chal').hidden = true;
  $('#shop').scrollTop = 0;
  pickStop();
  renderShop();
  renderWinsChips();
  updateSoundBtn();
  sfx('whoosh');
}
function closeShop() {
  UIState.screen = SHOP.from === 'setup' ? 'setup' : 'menu';
  $('#shop').hidden = true;
  if (SHOP.from === 'setup') { $('#setup').hidden = false; pickStart(); renderSetup(true); }
  else { $('#menu').hidden = false; }
  updateSoundBtn(); syncMusic(true); sfx('back');
}
function renderShop() {
  const tabs = [['tribes', 'Tribes'], ['skins', 'Unit skins'], ['perks', 'Perks']];
  $('#shopTabs').innerHTML = tabs.map(([k, n]) => `<button type="button" role="tab" class="${SHOP.tab === k ? 'on' : ''}" data-tab="${k}" aria-selected="${SHOP.tab === k}">${n}</button>`).join('');
  const body = $('#shopBody');
  body.innerHTML = (SHOP.tab === 'tribes' ? packHTML() : '') +
    (SHOP.tab === 'tribes' ? tribesHTML() : SHOP.tab === 'skins' ? skinsHTML() : perksHTML());
  renderWinsChips();
}
function packHTML() {
  if (!packLive() || packOwned()) return '';
  const left = daysLeft(LIMITED.pack.ends), P = LIMITED.pack;
  const arts = P.skins.map(k => `<img src="${skinPreview(k)}" alt="${SKINS[k].name}">`).join('');
  const names = P.skins.map(k => SKINS[k].name).join(' · ');
  return `<div class="pack"><div class="arts">${arts}</div>
    <div><h3>${P.name}</h3><p>All three spooky skins in one bundle: ${names}. Buy the pack and save ${P.skins.reduce((a, k) => a + priceOf('skin', k)[0], 0) - PACK_PRICE[0]} Wins.</p>
      <span class="ends">Limited time — ${left} day${left === 1 ? '' : 's'} left</span></div>
    <div class="buys">${winBtn('pack', P.id, PACK_PRICE[0])}${usdBtn('pack', P.id, PACK_PRICE[1])}</div></div>`;
}
function tribesHTML() {
  const cards = TRIBE_ORDER.map(k => {
    const T = TRIBES[k], own = ownsTribe(k), free = FREE_TRIBES.includes(k), [w, usd] = priceOf('tribe', k);
    const foot = own
      ? `<div class="own-row">✓ ${free ? 'Free tribe' : 'Owned'}</div><button class="btn" data-play="${k}">Play as them</button>`
      : `<div class="buys">${winBtn('tribe', k, w)}${usdBtn('tribe', k, usd)}</div>`;
    return `<div class="sc ${own ? 'owned' : ''} ${T.limited ? 'limited' : ''}" style="--tc:${T.color}">
      ${T.limited ? '<span class="flag">Limited</span>' : ''}
      <span class="art"><img src="${tribePortrait(k)}" alt=""></span>
      <h3>${T.name}</h3><p class="sub">${T.motto}</p>
      <p class="desc"><b style="color:var(--gold)">${T.ability}</b> — ${T.abilityText}</p>
      <p class="sub">Theme: “${TRIBE_THEMES[k] || 'Tribal march'}”</p>${foot}</div>`;
  }).join('');
  return `<h3 class="sec-h">Tribes</h3><p class="sheet-note" style="text-align:left">Every tribe has its own ability, homeland and theme music. Owned tribes show up on the “Choose your tribe” screen.</p><div class="shop-grid">${cards}</div>`;
}
function skinPreview(key) {
  /* a warrior wearing the skin, so you can see what you are buying */
  return unitPortrait('warrior', UIState.opts && UIState.opts.tribe ? UIState.opts.tribe : 'sunspear', false, key);
}
function skinsHTML() {
  const eq = equippedSkin();
  const cards = Object.keys(SKINS).map(k => {
    const S = SKINS[k], own = owns('skin', k), [w, usd] = priceOf('skin', k);
    const foot = own
      ? `<button class="btn ${eq === k ? '' : 'primary'}" data-skin="${k}">${eq === k ? 'Unequip' : 'Equip'}</button>`
      : `<div class="buys">${winBtn('skin', k, w)}${usdBtn('skin', k, usd)}</div>`;
    return `<div class="sc ${own ? 'owned' : ''} ${S.limited ? 'limited' : ''}" style="--tc:${(S.pal && S.pal.glow) || '#ffd54a'}">
      <span class="rar ${S.rarity}">${GOLD_TAG[S.rarity] || S.rarity}</span>${S.limited ? '<span class="flag">Limited</span>' : ''}
      <span class="art"><img src="${skinPreview(k)}" alt=""></span>
      <h3>${S.name}</h3><p class="desc">${S.desc}</p>
      ${eq === k ? '<div class="own-row">✓ Equipped</div>' : ''}${foot}</div>`;
  }).join('');
  return `<h3 class="sec-h">Unit skins</h3><p class="sheet-note" style="text-align:left">A skin re-dresses every unit in your army. Your tribe colour stays on the base, badge and sash, so nobody gets confused about who is who. One skin at a time.</p><div class="shop-grid">${cards}</div>`;
}
function perksHTML() {
  const on = equippedPerks();
  const cards = Object.keys(PERKS).map(k => {
    const P = PERKS[k], own = owns('perk', k), [w, usd] = priceOf('perk', k), eq = on.includes(k);
    const foot = own
      ? `<button class="btn ${eq ? '' : 'primary'}" data-perk="${k}">${eq ? 'Unequip' : 'Equip'}</button>`
      : `<div class="buys">${winBtn('perk', k, w)}${usdBtn('perk', k, usd)}</div>`;
    return `<div class="sc ${own ? 'owned' : ''}" style="--tc:#3c56a8">
      <span class="art sq">${PERK_ICON[P.icon] || PERK_ICON.star}</span>
      <h3>${P.name}</h3><p class="desc">${P.desc}</p>
      ${eq ? '<div class="own-row">✓ Equipped</div>' : ''}${foot}</div>`;
  }).join('');
  return `<h3 class="sec-h">Perks</h3><p class="sheet-note" style="text-align:left">Perks are small head starts you carry into every match. You can equip up to ${MAX_PERKS} at once — equipping a third swaps out the oldest.</p><div class="shop-grid">${cards}</div>`;
}

/* ---------- buying ---------- */
function shopCelebrate(el, name) {
  if (el && typeof fxBurst === 'function') {
    const r = el.getBoundingClientRect();
    fxBurst(r.left + r.width / 2, r.top + r.height * 0.4, { colors: ['#ffd54a', '#ffae00', '#ffffff', '#6ff09a'], count: 48, rings: 2, ringColor: '#ffd54a', ringSize: Math.min(r.width, r.height) * 0.8 });
  }
  sfx('unlock');
  toast(name + ' unlocked!', '#ffcf3f');
}
function shopBuy(kind, key, el) {
  const isPack = kind === 'pack';
  const [wins] = isPack ? PACK_PRICE : priceOf(kind, key);
  const name = isPack ? LIMITED.pack.name : kind === 'tribe' ? TRIBES[key].name : kind === 'skin' ? SKINS[key].name : PERKS[key].name;
  if (winsBalance() < wins) {
    const short = wins - winsBalance();
    showModal(`<h2>Not enough Wins</h2><p><b>${esc(name)}</b> costs ${winsLabel(wins)} and you have ${winsLabel(winsBalance())}. Win ${short} more match${short === 1 ? '' : 'es'} — or play a harder difficulty, where a victory pays up to 5 Wins.</p>
      <div class="modal-actions"><button class="btn" data-act="closeModal">Close</button><button class="btn primary" data-act="shopPlay">Play a match</button></div>`);
    sfx('bad');
    return;
  }
  showModal(`<h2>Buy ${esc(name)}?</h2><p>This costs <b>${winsLabel(wins)}</b>. You have ${winsLabel(winsBalance())}.</p>
    <div class="modal-actions"><button class="btn" data-act="confirmNo">Not now</button><button class="btn primary" data-act="confirmYes">Buy it</button></div>`);
  modalCb = () => {
    if (!spendWins(wins)) return;
    if (isPack) for (const k of LIMITED.pack.skins) grant('skin', k);
    else grant(kind, key);
    renderShop();
    shopCelebrate(el, name);
  };
}
function shopUsd(kind, key) {
  const isPack = kind === 'pack';
  const [wins, usd] = isPack ? PACK_PRICE : priceOf(kind, key);
  const name = isPack ? LIMITED.pack.name : kind === 'tribe' ? TRIBES[key].name : kind === 'skin' ? SKINS[key].name : PERKS[key].name;
  showModal(`<h2>$${usd} — card payments are off</h2><p>This build of Tessera Tribes has no payment processing hooked up, so nothing here can be bought with real money yet. <b>${esc(name)}</b> is ${winsLabel(wins)} instead, and Wins come from playing.</p>
    <div class="modal-actions"><button class="btn" data-act="confirmNo">Close</button><button class="btn primary" data-act="confirmYes">Use ${winsLabel(wins)}</button></div>`);
  modalCb = () => shopBuy(kind, key, document.querySelector(`[data-buy="${kind}"][data-key="${key}"]`));
}
function shopPlayAs(k) {
  if (!ownsTribe(k)) return;
  UIState.opts.tribe = k;
  closeShop();
  if (UIState.screen !== 'setup') openPick(); else renderSetup(true);
}
function setupShop() {
  $('#shopBack').addEventListener('click', closeShop);
  $('#shopTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    SHOP.tab = b.dataset.tab; renderShop(); sfx('click');
  });
  $('#shopBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-buy],[data-usd],[data-skin],[data-perk],[data-play]'); if (!b || b.disabled) return;
    const card = b.closest('.sc') || b.closest('.pack');
    if (b.dataset.buy) return shopBuy(b.dataset.buy, b.dataset.key, card);
    if (b.dataset.usd) return shopUsd(b.dataset.usd, b.dataset.key);
    if (b.dataset.skin) { equipSkin(equippedSkin() === b.dataset.skin ? null : b.dataset.skin); renderShop(); sfx('toggle'); return; }
    if (b.dataset.perk) { togglePerk(b.dataset.perk); renderShop(); sfx('toggle'); return; }
    if (b.dataset.play) return shopPlayAs(b.dataset.play);
  });
}

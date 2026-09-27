/* =====================================================================
   Part 11: tribe picker screen (portrait grid, homeland scene, tribe
   themes, random roulette)
   ===================================================================== */
const BIOME_NAME = { highlands: 'Highland', desert: 'Desert', jungle: 'Jungle', coast: 'Coastal', twilight: 'Twilight', snow: 'Frozen', olive: 'Olive-hill', winter: 'Winter wonderland', prairie: 'Prairie', candy: 'Candy', volcano: 'Volcanic', metal: 'Metal', autumn: 'Autumn' };
function renderPickGrid(first) {
  const o = UIState.opts, grid = $('#tribeGrid');
  if (first || !grid.children.length) {
    grid.classList.toggle('enter', !!first);
    const order = TRIBE_ORDER.filter(ownsTribe).concat(TRIBE_ORDER.filter(k => !ownsTribe(k)));
    grid.innerHTML = order.map((k, n) => {
      const own = ownsTribe(k);
      return `<button class="tpick ${own ? '' : 'locked'}" type="button" role="radio" data-tribe="${k}" style="--tc:${TRIBES[k].color};--k:${n}" ${own ? '' : `title="${TRIBES[k].name} — unlock it in the Item shop"`}>
        <span class="ring"><img src="${tribePortrait(k)}" alt="">${own ? '' : '<i class="lock" aria-hidden="true"></i>'}</span><b>${TRIBES[k].name}</b></button>`;
    }).join('');
  }
  grid.querySelectorAll('.tpick').forEach(b => {
    const on = b.dataset.tribe === o.tribe;
    b.classList.toggle('sel', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
  });
}
function renderPickDetail() {
  const k = UIState.opts.tribe, T = TRIBES[k], box = $('#tribeDetail');
  if (!box) return;
  const playing = SND.ready() && UIState.settings.music;
  box.style.setProperty('--tc2', k === 'frostholm' ? '#e6eef6' : T.color);
  box.innerHTML = `<img class="big" src="${tribePortrait(k)}" alt="${T.name} chieftain">
    <div class="info"><h3>${T.name}</h3><p class="motto">${T.motto}</p>
      <p><b class="ab">${T.ability}</b> — ${T.abilityText}</p>
      <div class="meta"><span class="tag">Starts with ${T.startTech ? TECHS[T.startTech].name : 'no tech · cheaper research'}</span>
        <span class="tag"><img src="${unitPortrait(T.startUnit, k)}" alt="">${UNITS[T.startUnit].name}</span><span class="tag">${BIOME_NAME[T.biome]} homeland</span></div>
      <p class="np"><span class="eq ${playing ? '' : 'off'}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${playing ? 'Now playing' : 'Tribe theme'}: <b>“${TRIBE_THEMES[k]}”</b>${playing ? '' : ' — turn sound on to listen'}</p>
    </div>`;
}
function renderSetup(first) {
  const o = UIState.opts;
  renderPickGrid(first);
  renderPickDetail();
  document.querySelectorAll('.seg[data-key]').forEach(seg => {
    const key = seg.dataset.key;
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(o[key]) === b.dataset.v));
  });
  $('#setupSummary').textContent = `${TRIBES[o.tribe].name} vs ${o.opponents} rival tribes · ${o.size} map · ${DIFFICULTY[o.difficulty].name} · ${o.mode === 'glory' ? 'Glory (30 turns)' : 'Conquest'}`;
}
function selectTribe(k) {
  if (!ownsTribe(k)) { sfx('bad'); openShop('tribes'); return; }
  const changed = UIState.opts.tribe !== k;
  UIState.opts.tribe = k;
  renderSetup(false);
  pickScene(k);
  if (changed) syncMusic(true);
  if (changed && !SND.ready()) tribeSound(k);
}
async function randomTribe() {
  if (UIState.rolling) return;
  UIState.rolling = true;
  const keys = ownedTribes(), grid = $('#tribeGrid');
  let i = keys.indexOf(UIState.opts.tribe);
  const target = Math.floor(Math.random() * keys.length);
  const steps = 12 + ((target - i + keys.length) % keys.length);
  let delay = 45;
  for (let k = 0; k < steps; k++) {
    i = (i + 1) % keys.length;
    grid.querySelectorAll('.tpick').forEach(b => b.classList.toggle('roll', b.dataset.tribe === keys[i]));
    sfx('tick');
    await sleep(delay);
    delay *= 1.14;
  }
  grid.querySelectorAll('.tpick').forEach(b => b.classList.remove('roll'));
  UIState.rolling = false;
  selectTribe(keys[i]);
  sfx('boom');
}
function openPick() {
  UIState.screen = 'setup';
  $('#menu').hidden = true; $('#setup').hidden = false;
  $('#setup').scrollTop = 0;
  pickScene(UIState.opts.tribe); pickStart();
  renderSetup(true);
  updateSoundBtn();
  syncMusic(true);
  sfx('whoosh');
}
function closePick() {
  UIState.screen = 'menu';
  pickStop();
  $('#setup').hidden = true; $('#menu').hidden = false;
  updateSoundBtn();
  syncMusic(true);
}
function setupPick() {
  $('#tribeGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-tribe]'); if (b && !UIState.rolling) selectTribe(b.dataset.tribe); });
  $('#tribeGrid').addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir || UIState.rolling) return;
    e.preventDefault();
    const keys = ownedTribes(), i = (keys.indexOf(UIState.opts.tribe) + dir + keys.length) % keys.length;
    selectTribe(keys[i]);
    const b = $(`#tribeGrid [data-tribe="${keys[i]}"]`); if (b) b.focus();
  });
  $('#sRandom').addEventListener('click', randomTribe);
}

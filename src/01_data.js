'use strict';
/* =====================================================================
   TESSERA — Age of Tribes
   Part 1: game data (tribes, terrain, units, counters, techs, upgrades,
   skins, perks, difficulty)
   ===================================================================== */
const SAVE_KEY = 'tessera-save-v2';
const RES = ['gold'];
const RES_NAME = { gold: 'Gold' };
const STRONG = 1.5, WEAK = 0.5;

/* ---------- Tribes ----------
   family: tribes of the same colour family never meet in one match, so
   every tribe on the map stays easy to tell apart. */
const TRIBES = {
  sunspear: {
    name: 'Sunspear', color: '#f5c02e', dark: '#7a5a05', light: '#ffe89a', biome: 'desert', family: 'yellow',
    startTech: 'riding', startUnit: 'rider', motto: 'Riders of the golden dunes',
    ability: 'Horse Lords', abilityText: 'Riders and Knights get +0.5 attack.',
    syl1: ['Sa', 'Qa', 'Zar', 'Ma', 'Ras', 'Al', 'Ka', 'Tem', 'Ish', 'Nu'],
    syl2: ['hara', 'zir', 'dun', 'kesh', 'mira', 'bad', 'ssa', 'rim', 'tal']
  },
  umbral: {
    name: 'Umbral Order', color: '#a35ee8', dark: '#4a1f78', light: '#dcc0ff', biome: 'twilight', family: 'purple',
    startTech: null, startUnit: 'warrior', motto: 'Scholars of the long night',
    ability: 'Scholars', abilityText: 'Technology costs 33% less. Monks heal +2 more.',
    syl1: ['Vex', 'Nyx', 'Mor', 'Xa', 'Ze', 'Umb', 'Ish', 'Qel', 'Sol', 'Aza'],
    syl2: ['thar', 'ion', 'ossa', 'ryn', 'ath', 'ul', 'ix', 'mora', 'eth']
  },
  frostholm: {
    name: 'Frostholm', color: '#eef3f8', dark: '#55708a', light: '#ffffff', biome: 'snow', family: 'white',
    startTech: 'organization', startUnit: 'warrior', motto: 'Hardy folk of the ice',
    ability: 'Hardy', abilityText: 'All units get +2 max HP and heal +2 more.',
    syl1: ['Is', 'Frey', 'Skal', 'Hvit', 'Nor', 'Kal', 'Sval', 'Yr', 'Bjor', 'Eld'],
    syl2: ['vik', 'bard', 'fjord', 'dal', 'heim', 'by', 'stad', 'vall', 'mark']
  },
  ironvale: {
    name: 'Ironvale', color: '#e5484d', dark: '#7e1d22', light: '#ffb0b2', biome: 'highlands', family: 'red',
    startTech: 'climbing', startUnit: 'warrior', motto: 'Masters of mountain and forge',
    ability: 'Forgemasters', abilityText: 'Upgrades cost 25% less. Gold Mines make +1 gold.',
    syl1: ['Kar', 'Dun', 'Hald', 'Brak', 'Thor', 'Grim', 'Vald', 'Orm', 'Ask', 'Bor'],
    syl2: ['heim', 'hold', 'forge', 'gard', 'mar', 'stone', 'fell', 'rock', 'dal']
  },
  verdant: {
    name: 'Verdant', color: '#3dbb5a', dark: '#15592a', light: '#a8f0b9', biome: 'jungle', family: 'green',
    startTech: 'hunting', startUnit: 'warrior', motto: 'Keepers of the deep forest',
    ability: 'Forest Walkers', abilityText: 'Forests never slow your units. Lumber Camps make +1 gold.',
    syl1: ['Ula', 'Mo', 'Tika', 'Zu', 'Kea', 'Oro', 'Ya', 'Lua', 'Ama', 'Ro'],
    syl2: ['ni', 'wa', 'tupa', 'koa', 'mba', 'lei', 'ra', 'nga', 'hua']
  },
  tidecallers: {
    name: 'Tidecallers', color: '#2f7cf6', dark: '#123a82', light: '#a9c8ff', biome: 'coast', family: 'blue',
    startTech: 'fishing', startUnit: 'warrior', motto: 'Children of the tide',
    ability: 'Seafarers', abilityText: 'Sail shallow water from turn 1. Fisheries make +1 gold.',
    syl1: ['Mar', 'Cor', 'Nau', 'Pel', 'Sel', 'Aqu', 'Bry', 'Lor', 'Ves', 'Ond'],
    syl2: ['ina', 'port', 'haven', 'sea', 'mouth', 'bay', 'ella', 'cove', 'reef']
  },
  maccabees: {
    name: 'Maccabees', color: '#3b5bdb', dark: '#17287a', light: '#c4d0ff', biome: 'olive', family: 'blue',
    startTech: 'organization', startUnit: 'warrior', motto: 'The light that never goes out',
    ability: 'The Hammer', abilityText: 'Warriors, Spearmen and Swordsmen get +0.5 attack. Units inside your borders get +0.5 defence.',
    syl1: ['Beit', 'Ein', 'Tel', 'Ramat', 'Kfar', 'Giv', 'Har', 'Neve', 'Migdal', 'Rosh'],
    syl2: ['el', 'ron', 'dor', 'lev', 'gan', 'or', 'shan', 'tov', 'hod']
  },
  northpole: {
    name: 'North Pole', color: '#169c4c', dark: '#0a5328', light: '#a6efc2', biome: 'winter', family: 'green',
    startTech: 'riding', startUnit: 'rider', motto: 'Ho ho ho — to war we go!',
    ability: 'Gift Workshop', abilityText: 'Every city you own makes +1 gold each turn.',
    syl1: ['Jingle', 'Snow', 'Tinsel', 'Holly', 'Frost', 'Candy', 'Pine', 'Merry', 'Cocoa', 'Twinkle'],
    syl2: ['burg', 'ville', 'town', 'dale', 'peak', 'haven', 'wood', 'nook', 'glen']
  },
  liberty: {
    name: 'Liberty', color: '#c8233b', dark: '#6b0d1c', light: '#ffb6c1', biome: 'prairie', family: 'red',
    startTech: 'riding', startUnit: 'rider', motto: 'Land of the free, home of the brave',
    ability: 'Frontier Spirit', abilityText: 'Units see 1 tile further. Capturing any village or city gives +6 gold.',
    syl1: ['Spring', 'Fair', 'Green', 'River', 'Lake', 'Oak', 'Cedar', 'Maple', 'Eagle', 'Liberty'],
    syl2: ['field', 'ton', 'ville', 'port', 'wood', 'burg', 'dale', 'view', 'ford']
  },
  meowtopia: {
    name: 'Meowtopia', color: '#ff6fb1', dark: '#8a1f55', light: '#ffc6e0', biome: 'candy', family: 'pink',
    startTech: 'hunting', startUnit: 'warrior', motto: 'If it fits, we sits (and conquers)',
    ability: 'Nine Lives', abilityText: 'Once every round, the first of your units knocked out inside your borders survives with 1 HP.',
    syl1: ['Purr', 'Mew', 'Whisk', 'Paw', 'Kit', 'Fluff', 'Mitt', 'Tabby', 'Claw', 'Nap'],
    syl2: ['ville', 'ton', 'land', 'burg', 'shire', 'bury', 'haven', 'dale', 'nest']
  },
  rexlands: {
    name: 'Rexlands', color: '#8bd346', dark: '#3c6612', light: '#d8f7b3', biome: 'volcano', family: 'green',
    startTech: 'riding', startUnit: 'rider', motto: 'RAWR means conquer',
    ability: 'Stampede', abilityText: 'Riders and Knights (raptors!) move 1 extra tile and have +3 HP.',
    syl1: ['Rex', 'Raptor', 'Stego', 'Tri', 'Ptero', 'Bronto', 'Ankylo', 'Dino', 'Spino', 'Veloci'],
    syl2: ['don', 'ville', 'rock', 'peak', 'crag', 'hollow', 'falls', 'pit', 'spire']
  },
  cogworks: {
    name: 'Cogworks', color: '#2ad4e6', dark: '#0b5f6b', light: '#b9f7ff', biome: 'metal', family: 'blue',
    startTech: 'hunting', startUnit: 'warrior', motto: 'BEEP BOOP. RESISTANCE IS FUTILE.',
    ability: 'Self-Repair', abilityText: 'Every unit repairs 2 HP at the start of each turn.',
    syl1: ['Cog', 'Volt', 'Gear', 'Byte', 'Bolt', 'Chip', 'Servo', 'Pixel', 'Nano', 'Robo'],
    syl2: ['tron', 'polis', 'hub', 'core', 'grid', 'works', 'bay', 'plex', 'net']
  },
  pumpkin: {
    name: 'Pumpkin Hollow', color: '#ff7a1a', dark: '#7a3000', light: '#ffc99f', biome: 'autumn', family: 'orange', limited: true,
    startTech: 'hunting', startUnit: 'warrior', motto: 'Trick or treat… or be defeated',
    ability: 'Trick or Treat', abilityText: 'Every enemy unit you defeat drops +3 gold.',
    syl1: ['Grim', 'Hollow', 'Spook', 'Creep', 'Gourd', 'Fang', 'Mist', 'Raven', 'Bone', 'Moon'],
    syl2: ['hollow', 'moor', 'vale', 'crypt', 'marsh', 'wick', 'fen', 'haunt', 'gate']
  }
};
const TRIBE_ORDER = ['sunspear', 'umbral', 'frostholm', 'ironvale', 'verdant', 'tidecallers', 'maccabees', 'northpole', 'liberty', 'meowtopia', 'rexlands', 'cogworks', 'pumpkin'];
const FREE_TRIBES = ['sunspear', 'umbral', 'frostholm'];
const LIMITED_TRIBE = 'pumpkin';
const AI_POOL = TRIBE_ORDER.filter(k => !TRIBES[k].limited);

/* ---------- Biomes (terrain palettes, one per tribe homeland) ----------
   style picks the tree/plant art: pine, snowpine, palm, round, crystal,
   xmas (decorated pine), lollipop (candy), antenna (robot masts) */
const BIOMES = {
  highlands: { field: '#aebd62', side: '#6c7536', tree: ['#62843a', '#4a6a2b'], trunk: '#6b4a2b', style: 'pine', mount: ['#a99585', '#86735f', '#655547'], cap: '#f4f4f4', water: '#4fb1e6' },
  desert: { field: '#ebcb7c', side: '#ad8a45', tree: ['#79bf4f', '#56983a'], trunk: '#8a6236', style: 'palm', mount: ['#d9a66c', '#bb884e', '#976a3c'], cap: '#fff3d6', water: '#53bde6' },
  jungle: { field: '#73c65a', side: '#3d8633', tree: ['#2f9e48', '#237b37'], trunk: '#6b4a2b', style: 'round', mount: ['#93a08d', '#737f6e', '#5a635a'], cap: '#eef5ee', water: '#4bb4e3' },
  coast: { field: '#9ad983', side: '#5a9a4b', tree: ['#3ba866', '#2b8551'], trunk: '#6b4a2b', style: 'round', mount: ['#a9b0b9', '#868d98', '#676e79'], cap: '#ffffff', water: '#47b7ea' },
  twilight: { field: '#96a071', side: '#5c6446', tree: ['#7a5bb3', '#5b418f'], trunk: '#4a3a5a', style: 'crystal', mount: ['#857da0', '#665f82', '#4d4764'], cap: '#ece6ff', water: '#4aa9e0' },
  snow: { field: '#eaf2f7', side: '#9fb9ca', tree: ['#5e9582', '#467766'], trunk: '#5a4a3a', style: 'snowpine', mount: ['#cfe1ec', '#a7c2d4', '#809fb6'], cap: '#ffffff', water: '#5cb9e6' },
  olive: { field: '#cdc47e', side: '#8b8046', tree: ['#93a56c', '#6f8350'], trunk: '#6b5238', style: 'round', mount: ['#dcc7a0', '#bca47c', '#957f5d'], cap: '#fff6e2', water: '#4fb8e8' },
  winter: { field: '#f2f7fb', side: '#a8c1d4', tree: ['#2f8a5a', '#236f48'], trunk: '#5a4030', style: 'xmas', mount: ['#d8e8f2', '#b0c9da', '#88a6bd'], cap: '#ffffff', water: '#5cb9e6' },
  prairie: { field: '#d6c56b', side: '#978840', tree: ['#62a041', '#4b8132'], trunk: '#6b4a2b', style: 'round', mount: ['#cf9870', '#b07a52', '#8a5b3a'], cap: '#fff0dd', water: '#4fb1e6' },
  candy: { field: '#f8c8dc', side: '#c47d9c', tree: ['#ff8fc4', '#e2609f'], trunk: '#fbf3ea', style: 'lollipop', mount: ['#e6bdf2', '#c89bd8', '#a57bb8'], cap: '#ffffff', water: '#62c8f2' },
  volcano: { field: '#93b04c', side: '#5c3f2b', tree: ['#3f8f3b', '#2f6d2c'], trunk: '#5a3a22', style: 'palm', mount: ['#6f5f59', '#54473f', '#3d3330'], cap: '#ff6a2a', water: '#4aa8dc' },
  metal: { field: '#b1bac6', side: '#6d7888', tree: ['#86e8f2', '#52c3d4'], trunk: '#5a6472', style: 'antenna', mount: ['#9ea9b7', '#7d8898', '#5f6977'], cap: '#e4f8ff', water: '#4aa9e0' },
  autumn: { field: '#bda85e', side: '#7a673b', tree: ['#f38b2a', '#d6641b'], trunk: '#5a3a22', style: 'round', mount: ['#a3917c', '#857462', '#66584b'], cap: '#f6f0e8', water: '#4a9fd6' }
};

/* ---------- Terrain & resources ---------- */
const TERRAIN = {
  field: { name: 'Field', land: true },
  forest: { name: 'Forest', land: true },
  mountain: { name: 'Mountain', land: true },
  water: { name: 'Shallow Water', land: false },
  ocean: { name: 'Deep Ocean', land: false }
};
const RESOURCES = {
  crop: { name: 'Wild Crops', desc: 'A Farm here makes +1 extra gold.' },
  fruit: { name: 'Berries', desc: 'Forage them to grow the city (needs Organization).' },
  game: { name: 'Wild Game', desc: 'Hunt it to grow the city (needs Hunting).' },
  ore: { name: 'Gold Ore', desc: 'Build a Gold Mine here.' },
  fish: { name: 'Fish', desc: 'Build a Fishery here (needs Fishing).' }
};

/* ---------- Units (everything is paid for in gold) ---------- */
const CLASS_NAME = { foot: 'Infantry', mounted: 'Cavalry', siege: 'Siege', giant: 'Legend' };
const UNITS = {
  warrior: {
    name: 'Warrior', cls: 'foot', hp: 10, atk: 2, def: 2, mov: 1, rng: 1, vis: 1, cost: { gold: 4 }, tech: null, dash: true,
    role: 'Cheap all-rounder', desc: 'Cheap and reliable. Great for exploring and capturing villages early.'
  },
  spearman: {
    name: 'Spearman', cls: 'foot', hp: 10, atk: 2, def: 2, mov: 1, rng: 1, vis: 1, cost: { gold: 5 }, tech: 'hunting', dash: true,
    role: 'Anti-cavalry', desc: 'A wall of spears. Crushes Riders and Knights, weak against arrows and swords.'
  },
  archer: {
    name: 'Archer', cls: 'foot', ranged: true, hp: 10, atk: 2, def: 1, mov: 1, rng: 3, vis: 2, cost: { gold: 6 }, tech: 'archery', dash: true,
    role: 'Long-range (3 tiles)', desc: 'Shoots 3 tiles away. Shreds Spearmen and Warriors, but cavalry runs them down.'
  },
  rider: {
    name: 'Rider', cls: 'mounted', hp: 10, atk: 2, def: 1, mov: 2, rng: 1, vis: 1, cost: { gold: 6 }, tech: 'riding', dash: true, escape: true,
    role: 'Fast raider', desc: 'Moves 2 and can move again after attacking. Hunts Archers, Swordsmen and Catapults.'
  },
  defender: {
    name: 'Shieldbearer', cls: 'foot', hp: 15, atk: 1, def: 3, mov: 1, rng: 1, vis: 1, cost: { gold: 7 }, tech: 'strategy', dash: true,
    role: 'City guard', desc: 'Huge shield blocks arrows. The best unit for holding a city.'
  },
  swordsman: {
    name: 'Swordsman', cls: 'foot', hp: 15, atk: 3, def: 2, mov: 1, rng: 1, vis: 1, cost: { gold: 9 }, tech: 'smithery', dash: true,
    role: 'Infantry killer', desc: 'Beats every foot unit, but is really weak against cavalry.'
  },
  catapult: {
    name: 'Catapult', cls: 'siege', ranged: true, hp: 10, atk: 4, def: 0, mov: 1, rng: 3, vis: 1, cost: { gold: 10 }, tech: 'mathematics', dash: false,
    role: 'Siege engine', desc: 'Huge damage at range 3, bonus vs Shieldbearers and units in cities. Cannot fire after moving and has no defence.'
  },
  knight: {
    name: 'Knight', cls: 'mounted', hp: 15, atk: 3.5, def: 1, mov: 3, rng: 1, vis: 1, cost: { gold: 11 }, tech: 'chivalry', dash: true, persist: true,
    role: 'Heavy cavalry', desc: 'Moves 3. After a kill it may attack again. Keep it away from Spearmen.'
  },
  monk: {
    name: 'Monk', cls: 'foot', hp: 10, atk: 0, def: 1, mov: 1, rng: 1, vis: 1, cost: { gold: 8 }, tech: 'philosophy', dash: true, healer: true, converter: true,
    role: 'Healer & converter', desc: 'Heals every adjacent ally, or converts an adjacent enemy unit to your side.'
  },
  champion: {
    name: 'Champion', cls: 'giant', hp: 40, atk: 5, def: 4, mov: 1, rng: 1, vis: 1, cost: null, tech: null, dash: true,
    role: 'Legendary hero', desc: 'A hero granted by a level 5 city. 40 HP and massive strength.'
  }
};
const TRAINABLE = ['warrior', 'spearman', 'archer', 'rider', 'defender', 'swordsman', 'catapult', 'knight', 'monk'];

/* Rock-paper-scissors: COUNTERS[a][b] multiplies a's power when a fights b
   (attacking OR defending). 1.5 = strong, 0.5 = really weak. */
const COUNTERS = {
  warrior: { catapult: STRONG, monk: STRONG },
  spearman: { rider: STRONG, knight: STRONG },
  archer: { spearman: STRONG, warrior: STRONG },
  rider: { archer: STRONG, swordsman: STRONG, catapult: STRONG },
  knight: { archer: STRONG, swordsman: STRONG, catapult: STRONG, warrior: STRONG },
  defender: { archer: STRONG },
  swordsman: { warrior: STRONG, spearman: STRONG, archer: STRONG, defender: STRONG, monk: STRONG, rider: WEAK, knight: WEAK },
  catapult: { defender: STRONG, city: STRONG },
  monk: {},
  champion: {}
};

/* ---------- Buildings: every building makes gold and grows its city ----------
   Two levels each; level 2 needs a technology. */
const SITES = {
  farm: { name: 'Farm', on: ['field'], bonusRes: 'crop', out: [1, 2], cost: [{ gold: 4 }, { gold: 7 }], tech: [null, 'farming'] },
  lumber: { name: 'Lumber Camp', on: ['forest'], out: [1, 2], cost: [{ gold: 4 }, { gold: 7 }], tech: [null, 'forestry'] },
  mine: { name: 'Gold Mine', on: ['mountain'], needRes: 'ore', out: [2, 3], cost: [{ gold: 5 }, { gold: 8 }], tech: [null, 'mining'] },
  fishery: { name: 'Fishery', on: ['water'], needRes: 'fish', out: [2, 3], cost: [{ gold: 5 }, { gold: 8 }], tech: ['fishing', 'aquaculture'] }
};
const SITE_MAX = 2;
const ACTIONS_COST = {
  road: { gold: 2 },
  forage: { gold: 2 },
  hunt: { gold: 2 },
  walls: { gold: 10 }
};

/* ---------- City level rewards (pick one) ---------- */
const CITY_REWARDS = {
  2: [
    { id: 'workshop', name: 'Workshop', desc: '+2 gold every turn.' },
    { id: 'explorer', name: 'Explorer', desc: 'Scouts reveal a wide area around the city.' }
  ],
  3: [
    { id: 'walls', name: 'City Walls', desc: 'Units defending this city get ×2.5 defence.' },
    { id: 'cache', name: 'Treasure', desc: 'Instantly gain 15 gold.' }
  ],
  4: [
    { id: 'boom', name: 'Population Boom', desc: '+3 population right away.' },
    { id: 'borders', name: 'Border Growth', desc: 'Territory expands to 5×5 tiles.' }
  ],
  5: [
    { id: 'park', name: 'Grand Park', desc: '+3 gold every turn and +250 score.' },
    { id: 'champion', name: 'Champion', desc: 'A legendary 40 HP hero joins your army.' }
  ]
};

/* ---------- Technology tree (5 branches × 5) ---------- */
const TECHS = {
  riding: { name: 'Riding', tier: 1, parent: null, branch: 0, unit: 'rider', text: 'Train Riders.' },
  roads: { name: 'Roads', tier: 2, parent: 'riding', branch: 0, text: 'Build roads: faster moves. Cities joined to your capital by road make +1 gold.' },
  trade: { name: 'Trade', tier: 3, parent: 'roads', branch: 0, text: 'Every city makes +1 gold each turn.' },
  horsemanship: { name: 'Horsemanship', tier: 2, parent: 'riding', branch: 0, text: 'Riders move 1 extra tile.' },
  chivalry: { name: 'Chivalry', tier: 3, parent: 'horsemanship', branch: 0, unit: 'knight', text: 'Train Knights.' },

  organization: { name: 'Organization', tier: 1, parent: null, branch: 1, text: 'Forage berries to grow your cities.' },
  farming: { name: 'Farming', tier: 2, parent: 'organization', branch: 1, text: 'Upgrade Farms to level 2.' },
  construction: { name: 'Construction', tier: 3, parent: 'farming', branch: 1, text: 'Build City Walls in any city.' },
  strategy: { name: 'Strategy', tier: 2, parent: 'organization', branch: 1, unit: 'defender', text: 'Train Shieldbearers.' },
  leadership: { name: 'Leadership', tier: 3, parent: 'strategy', branch: 1, text: '+1 unit slot in every city. Promotions cost half.' },

  climbing: { name: 'Climbing', tier: 1, parent: null, branch: 2, text: 'Units can climb mountains (×1.5 defence there).' },
  mining: { name: 'Mining', tier: 2, parent: 'climbing', branch: 2, text: 'Upgrade Gold Mines to level 2.' },
  smithery: { name: 'Smithery', tier: 3, parent: 'mining', branch: 2, unit: 'swordsman', text: 'Train Swordsmen.' },
  meditation: { name: 'Meditation', tier: 2, parent: 'climbing', branch: 2, text: 'Resting units heal 2 more HP.' },
  philosophy: { name: 'Philosophy', tier: 3, parent: 'meditation', branch: 2, unit: 'monk', text: 'Train Monks. All technology costs 25% less.' },

  fishing: { name: 'Fishing', tier: 1, parent: null, branch: 3, text: 'Build Fisheries on fish.' },
  sailing: { name: 'Sailing', tier: 2, parent: 'fishing', branch: 3, text: 'Units can move onto shallow water as boats.' },
  navigation: { name: 'Navigation', tier: 3, parent: 'sailing', branch: 3, text: 'Boats cross deep ocean and become warships.' },
  aquaculture: { name: 'Aquaculture', tier: 2, parent: 'fishing', branch: 3, text: 'Upgrade Fisheries to level 2.' },
  cartography: { name: 'Cartography', tier: 3, parent: 'aquaculture', branch: 3, text: 'Reveals the whole map. All units see 1 tile further.' },

  hunting: { name: 'Hunting', tier: 1, parent: null, branch: 4, unit: 'spearman', text: 'Train Spearmen. Hunt wild game to grow your cities.' },
  archery: { name: 'Archery', tier: 2, parent: 'hunting', branch: 4, unit: 'archer', text: 'Train Archers. Forests give ×1.5 defence.' },
  marksmanship: { name: 'Marksmanship', tier: 3, parent: 'archery', branch: 4, text: 'Archers shoot 1 tile further.' },
  forestry: { name: 'Forestry', tier: 2, parent: 'hunting', branch: 4, text: 'Upgrade Lumber Camps to level 2.' },
  mathematics: { name: 'Mathematics', tier: 3, parent: 'forestry', branch: 4, unit: 'catapult', text: 'Train Catapults.' }
};
const BRANCH_ROOTS = ['riding', 'organization', 'climbing', 'fishing', 'hunting'];

/* ---------- Upgrades: three simple army-wide boosts ---------- */
const UPGRADES = {
  attack: { name: 'Sharper Weapons', short: '+0.5 ATK', color: '#ff6b6b', desc: 'Every unit you own hits harder: +0.5 attack per level.', cost: [10, 18, 28], per: 0.5 },
  defence: { name: 'Stronger Armour', short: '+0.5 DEF', color: '#5aa9ff', desc: 'Every unit you own blocks more: +0.5 defence per level.', cost: [10, 18, 28], per: 0.5 },
  health: { name: 'Tougher Troops', short: '+3 HP', color: '#4fdc8a', desc: 'Every unit you own gets +3 max health per level.', cost: [8, 15, 24], per: 3 }
};
const UPGRADE_MAX = 3;

/* Unit rank upgrades (per unit) */
const RANK_COST = [{ gold: 4 }, { gold: 7 }, { gold: 10 }];
const RANK_BONUS = { atk: 0.5, def: 0.5, hp: 2 };
const XP_TO_PROMOTE = 3;

/* ---------- Difficulty ----------
   aiIncome: gold multiplier · aiStart: extra starting gold · aggression:
   how eagerly the AI attacks · smart: decision quality (0-1) · army:
   army-size multiplier · humanFocus: how much the AI targets you ·
   research: techs per turn · upgrades: buys army upgrades · extraUnits:
   bonus starting units · freeTech: starts with a second tech · grace: turns
   before the AI starts attacking your cities · wins: Wins earned for a victory */
const DIFFICULTY = {
  easy: { name: 'Easy', grace: 16, aiIncome: 0.45, aiStart: -3, aggression: 0.25, smart: 0.2, army: 0.45, humanFocus: 0.4, research: 1, upgrades: false, extraUnits: 0, wins: 1 },
  normal: { name: 'Normal', grace: 5, aiIncome: 0.9, aiStart: 0, aggression: 0.7, smart: 0.75, army: 0.85, humanFocus: 1.0, research: 2, upgrades: true, extraUnits: 0, wins: 2 },
  hard: { name: 'Hard', aiIncome: 1.1, aiStart: 3, aggression: 0.9, smart: 0.95, army: 1.0, humanFocus: 1.15, research: 2, upgrades: true, extraUnits: 0, wins: 3 },
  crazy: { name: 'Crazy', grace: 6, aiIncome: 1.4, aiStart: 6, aggression: 1.0, smart: 1, army: 1.3, humanFocus: 1.25, research: 3, upgrades: true, extraUnits: 1, freeTech: true, wins: 5 }
};
const MAP_SIZES = { small: 12, medium: 18, large: 26 };

/* ---------- Cosmetic unit skins (item shop) ----------
   pal keys (all optional): body/bodyD = clothing, metal/metalD = armour and
   blades, skin = face/hands, trim = accent details, glow = outline glow.
   head: 'skull' | 'pumpkin' | 'ghost' replaces the head. neon: glowing
   edge lines. alpha: see-through body. Tribe colours always stay on the
   base disc, badge and a sash so you can still tell whose unit it is. */
const SKINS = {
  golden: { name: 'Golden Legion', rarity: 'legendary', desc: 'Gleaming gold armour for your whole army.', pal: { metal: '#ffd54a', metalD: '#c98f1c', trim: '#fff1a8', glow: '#ffd54a' } },
  shadow: { name: 'Shadow Ops', rarity: 'epic', desc: 'Stealthy black gear with violet trim.', pal: { body: '#2b2f3f', bodyD: '#1a1d29', metal: '#4b5064', metalD: '#2e3242', trim: '#b388ff', glow: '#b388ff' } },
  neon: { name: 'Neon Rush', rarity: 'epic', desc: 'Glowing neon outlines that light up the battlefield.', neon: true, pal: { body: '#171a2a', bodyD: '#0c0e18', metal: '#2a2f45', metalD: '#1a1e2e', trim: '#39f3ff', glow: '#ff3fd2' } },
  skeleton: { name: 'Bone Brigade', rarity: 'rare', limited: true, desc: 'Rattling skeleton warriors.', head: 'skull', pal: { skin: '#f1ecd8', body: '#e9e4d0', bodyD: '#bdb6a0', trim: '#7dff8a', glow: '#7dff8a' } },
  pumpkinhead: { name: 'Pumpkin Patrol', rarity: 'rare', limited: true, desc: 'Grinning jack-o-lantern heads.', head: 'pumpkin', pal: { trim: '#ff8a1f', glow: '#ff8a1f' } },
  ghost: { name: 'Ghost Guard', rarity: 'epic', limited: true, desc: 'Spooky see-through spirits.', head: 'ghost', pal: { body: '#eef3ff', bodyD: '#c7d0e8', skin: '#f4f7ff', alpha: 0.82, glow: '#b8e1ff' } }
};

/* ---------- Perks (item shop, equip up to MAX_PERKS per match) ---------- */
const PERKS = {
  headstart: { name: 'Head Start', icon: 'coin', desc: 'Start every match with +8 gold.' },
  bodyguard: { name: 'Bodyguard', icon: 'shield', desc: 'Start with an extra Warrior next to your capital.' },
  explorer: { name: 'Explorer', icon: 'map', desc: 'See a much bigger area around your capital at the start.' },
  tax: { name: 'Tax Collector', icon: 'crown', desc: 'Your capital makes +1 gold every turn.' },
  veteran: { name: 'Veterans', icon: 'star', desc: 'Your starting unit begins with a ★ rank.' },
  fortress: { name: 'Fortress', icon: 'wall', desc: 'Your capital starts with City Walls.' }
};
const MAX_PERKS = 2;

/* ---------- limited-time content (item shop + weekly challenge) ----------
   ends: local date (YYYY-MM-DD) when the offer disappears */
const LIMITED = {
  tribe: 'pumpkin',
  pack: { id: 'harvest', name: 'Harvest Moon Pack', skins: ['pumpkinhead', 'skeleton', 'ghost'], usd: '4.99', ends: '2026-11-01' }
};

#!/bin/bash
# Assembles the game from src/ into two files:
#   index.html        a standalone page — this is what GitHub Pages serves
#                     and what you open locally
#   dist/tessera.html the same game without the page skeleton, for hosts
#                     that supply their own (and dist/test.html for tests)
set -e
cd "$(dirname "$0")"
mkdir -p dist

PARTS="src/01_data.js src/02_core.js src/03_rules_a.js src/03_rules_b.js src/04_ai.js src/05_render_terrain.js src/06_render_units.js src/07_ui_panels.js src/08_ui_flow.js src/10_audio.js src/11_menu_fx.js src/12_tribe_music.js src/13_tribe_art.js src/14_pick.js src/15_techtree.js src/16_tribe_music2.js src/17_tribe_art2.js src/18_profile.js src/19_shop.js src/20_challenge.js src/09_ui_screens.js"

{
  cat src/00_head.html
  echo '<script>'
  cat $PARTS
  echo '</script>'
} > dist/tessera.html

# split the head file: everything up to </style> is <head>, the rest is markup
HEAD_END=$(grep -n '^</style>' src/00_head.html | head -1 | cut -d: -f1)
{
  echo '<!doctype html>'
  echo '<html lang="en">'
  echo '<head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  echo '<meta name="theme-color" content="#070b17">'
  echo '<meta property="og:title" content="Tessera Tribes">'
  echo '<meta property="og:description" content="A turn-based 4X strategy game in one HTML file: explore a tiled world, grow cities, research technology and conquer every rival tribe.">'
  echo '<meta property="og:image" content="docs/screenshots/game.png">'
  echo '<meta name="twitter:card" content="summary_large_image">'
  head -n "$HEAD_END" src/00_head.html
  echo '</head>'
  echo '<body>'
  tail -n +$((HEAD_END + 1)) src/00_head.html
  echo '<script>'
  cat $PARTS
  echo '</script>'
  echo '</body>'
  echo '</html>'
} > index.html

cp index.html dist/test.html
wc -c index.html dist/tessera.html

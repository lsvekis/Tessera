#!/bin/bash
set -e
cd "$(dirname "$0")"
mkdir -p dist
{
  cat src/00_head.html
  echo '<script>'
  cat src/01_data.js src/02_core.js src/03_rules_a.js src/03_rules_b.js src/04_ai.js src/05_render_terrain.js src/06_render_units.js src/07_ui_panels.js src/08_ui_flow.js src/10_audio.js src/11_menu_fx.js src/12_tribe_music.js src/13_tribe_art.js src/14_pick.js src/15_techtree.js src/16_tribe_music2.js src/17_tribe_art2.js src/18_profile.js src/19_shop.js src/20_challenge.js src/09_ui_screens.js
  echo '</script>'
} > dist/tessera.html
# page wrapper for local testing (the artifact host adds this skeleton itself)
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
  cat dist/tessera.html
  echo '</body></html>'
} > dist/test.html
wc -c dist/tessera.html

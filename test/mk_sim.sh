#!/bin/bash
# builds headless node harnesses from the engine sources (no DOM)
cd "$(dirname "$0")/.."
for f in sim diff bal2; do
  foot=test/${f}_footer.js; [ -f "$foot" ] || continue
  cat src/01_data.js src/02_core.js src/03_rules_a.js src/03_rules_b.js src/04_ai.js "$foot" > test/run_$f.js
done

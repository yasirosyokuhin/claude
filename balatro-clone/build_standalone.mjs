// Bundles the ES-module sources into a single self-contained HTML file
// (balatro-standalone.html) that runs from file:// or any static host.
// Usage: node build_standalone.mjs

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));

// Dependency order matters: later files use symbols from earlier ones.
const MODULE_ORDER = [
  'js/cards.js',
  'js/hands.js',
  'js/scoring.js',
  'js/jokers.js',
  'js/consumables.js',
  'js/blinds.js',
  'js/game.js',
  'js/ui.js',
  'js/main.js',
];

// game.js is consumed by main.js as a namespace import (`import * as Game`),
// so recreate that namespace object before main.js runs.
const GAME_NAMESPACE = `
const Game = { createNewGame, currentBlindKind, goToBlindScreen, startRound,
  toggleCardSelection, playHand, discardHand, sortHand, generateShop,
  rerollShop, buyItem, sellJoker, useConsumable, proceedFromShop };
`;

function stripModuleSyntax(source) {
  return source
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, '')
    .replace(/^export\s+(?=(const|let|var|function|class)\b)/gm, '');
}

let bundle = '';
for (const rel of MODULE_ORDER) {
  const src = readFileSync(join(root, rel), 'utf8');
  if (rel === 'js/main.js') bundle += GAME_NAMESPACE;
  bundle += `\n// ==== ${rel} ====\n` + stripModuleSyntax(src);
}

const css = readFileSync(join(root, 'css/style.css'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Balatro風クローン</title>
<link rel="icon" href="data:," />
<style>
${css}
</style>
</head>
<body>
  <div id="app"></div>
  <script>
"use strict";
${bundle}
  </script>
</body>
</html>
`;

writeFileSync(join(root, 'balatro-standalone.html'), html);
console.log('Wrote balatro-standalone.html (' + html.length + ' bytes)');

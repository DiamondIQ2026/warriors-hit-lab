'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'experimental', 'visual-prototype.html'), 'utf8');

test('reduced motion preference disables visual ball-flight animation', () => {
  const media = html.match(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(media, 'reduced-motion media query must exist');
  assert.match(media[1], /\.ball\s*\{\s*animation:\s*none\s*!important/);
});

test('swing completion timer remains independent of CSS animation', () => {
  assert.match(html, /setTimeout\(\(\)=>\{state\.animating=false/);
  assert.match(html, /const ball=document\.createElement\('span'\)/);
});

test('V7 preview save namespace is preserved', () => {
  assert.ok(html.includes("const storeKey='hitlab-v7-visual-prototype-only'"));
});

#!/usr/bin/env node
'use strict';

const { readdirSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['bin', 'lib', 'test'];
let failed = 0;

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      try {
        execFileSync('node', ['--check', full], { stdio: 'inherit' });
      } catch (e) {
        failed += 1;
      }
    }
  }
}

for (const d of DIRS) {
  walk(path.join(ROOT, d));
}

if (failed > 0) {
  console.error(`syntaxcheck: ${failed} file(s) failed`);
  process.exit(1);
}
console.log('syntaxcheck: all bin/, lib/, test/ files OK');

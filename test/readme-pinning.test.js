'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => /^#{1,6}\s/.test(l))
    .map((l) => l.trim());
}

test('readme-pinning: README.md documents every CLI command and key token', () => {
  const en = read('README.md');
  for (const token of ['xsk', 'install', 'uninstall', 'status', 'doctor', 'version', 'help', '--platform', '--json']) {
    assert.ok(en.includes(token), `README.md mentions "${token}"`);
  }
  for (const platform of ['Claude', 'Codex', 'opencode', 'Gemini']) {
    assert.ok(en.includes(platform), `README.md mentions platform "${platform}"`);
  }
});

test('readme-pinning: EN and CN READMEs share identical headings', () => {
  const en = headings(read('README.md'));
  const cn = headings(read('README.zh-CN.md'));
  assert.deepStrictEqual(en, cn, 'heading parity between README.md and README.zh-CN.md');
});

test('readme-pinning: CN README preserves English literals (commands, paths, tokens)', () => {
  const cn = read('README.zh-CN.md');
  for (const literal of ['xsk install', 'xsk status', 'xsk uninstall', '@xenonbyte/xsk', 'SKILL.md', '--platform', 'npm test']) {
    assert.ok(cn.includes(literal), `README.zh-CN.md preserves literal "${literal}"`);
  }
});

test('readme-pinning: both READMEs are non-trivial (multiple sections)', () => {
  assert.ok(headings(read('README.md')).length >= 5, 'README.md has enough sections');
  assert.ok(headings(read('README.zh-CN.md')).length >= 5, 'README.zh-CN.md has enough sections');
});

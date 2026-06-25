'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(readText(rel));
}

function headingLines(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => line.trim());
}

test('baseline: package.json carries required metadata', () => {
  const pkg = readJson('package.json');
  assert.strictEqual(pkg.name, '@xenonbyte/xsk', 'package name');
  assert.ok(pkg.version && typeof pkg.version === 'string', 'version present');
  assert.ok(pkg.description && typeof pkg.description === 'string', 'description present');
  assert.ok(pkg.license, 'license field present');
  assert.ok(pkg.bin && pkg.bin.xsk, 'bin.xsk present');
  assert.strictEqual(pkg.type, undefined, 'no ESM type field (CommonJS)');
  assert.deepStrictEqual(pkg.engines && pkg.engines.node ? { node: pkg.engines.node } : {}, {
    node: '>=20',
  });
  assert.ok(pkg.scripts && typeof pkg.scripts.test === 'string', 'scripts.test present');
  assert.ok(pkg.scripts && typeof pkg.scripts.syntaxcheck === 'string', 'scripts.syntaxcheck present');
  assert.deepStrictEqual(pkg.dependencies || {}, {}, 'zero runtime dependencies');
});

test('baseline: README files exist and headings match (EN/CN parity)', () => {
  const en = readText('README.md');
  const cn = readText('README.zh-CN.md');
  const enHeadings = headingLines(en);
  const cnHeadings = headingLines(cn);
  assert.ok(enHeadings.length >= 4, 'README has a reasonable number of headings');
  assert.deepStrictEqual(
    enHeadings,
    cnHeadings,
    'English and Chinese READMEs share identical headings',
  );
});

test('baseline: README documents the CLI command surface', () => {
  const en = readText('README.md');
  for (const token of ['xsk', 'install', 'uninstall', 'status', 'doctor', 'version', 'help']) {
    assert.ok(en.includes(token), `README mentions "${token}"`);
  }
});

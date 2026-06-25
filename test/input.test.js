'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../lib/input');

const ALL = ['claude', 'codex', 'opencode', 'gemini'];

test('input: no args resolves to help', () => {
  assert.deepStrictEqual(parse([]), { command: 'help', platforms: ALL, json: false });
});

test('input: help variants', () => {
  for (const argv of [['help'], ['-h'], ['--help']]) {
    assert.deepStrictEqual(parse(argv), { command: 'help', platforms: ALL, json: false });
  }
});

test('input: version variants', () => {
  for (const argv of [['version'], ['-v'], ['--version']]) {
    assert.deepStrictEqual(parse(argv), { command: 'version', platforms: ALL, json: false });
  }
});

test('input: help/version flag shortcuts reject extra arguments', () => {
  assert.throws(() => parse(['-v', 'extra']), /version/);
  assert.throws(() => parse(['--help', 'extra']), /help/);
});

test('input: install/uninstall/status/doctor recognized with default platforms', () => {
  for (const cmd of ['install', 'uninstall', 'status', 'doctor']) {
    assert.deepStrictEqual(parse([cmd]), { command: cmd, platforms: ALL, json: false });
  }
});

test('input: --platform space-separated single value', () => {
  assert.deepStrictEqual(parse(['install', '--platform', 'claude']).platforms, ['claude']);
});

test('input: --platform comma list', () => {
  assert.deepStrictEqual(parse(['install', '--platform', 'claude,codex']).platforms, [
    'claude',
    'codex',
  ]);
});

test('input: --platform=equals form', () => {
  assert.deepStrictEqual(parse(['install', '--platform=claude,codex']).platforms, [
    'claude',
    'codex',
  ]);
});

test('input: --platform preserves given order', () => {
  assert.deepStrictEqual(parse(['install', '--platform', 'gemini,claude']).platforms, [
    'gemini',
    'claude',
  ]);
});

test('input: --platform trims whitespace around values', () => {
  assert.deepStrictEqual(parse(['install', '--platform', ' claude , codex ']).platforms, [
    'claude',
    'codex',
  ]);
});

test('input: --platform rejects unknown platform', () => {
  assert.throws(() => parse(['install', '--platform', 'foo']), /unknown platform/);
});

test('input: --platform rejects duplicate platform', () => {
  assert.throws(() => parse(['install', '--platform', 'claude,claude']), /duplicate platform/);
});

test('input: --platform without a value throws', () => {
  assert.throws(() => parse(['install', '--platform']), /--platform/);
});

test('input: --platform with empty list throws', () => {
  assert.throws(() => parse(['install', '--platform', '   ']), /--platform/);
});

test('input: --json flag parsed', () => {
  assert.deepStrictEqual(parse(['status', '--json']), {
    command: 'status',
    platforms: ALL,
    json: true,
  });
  assert.deepStrictEqual(parse(['doctor', '--json']), {
    command: 'doctor',
    platforms: ALL,
    json: true,
  });
});

test('input: --json rejects commands that do not emit JSON', () => {
  for (const cmd of ['install', 'uninstall', 'version', 'help']) {
    assert.throws(() => parse([cmd, '--json']), /--json.*status.*doctor/);
  }
});

test('input: unknown option fails loud', () => {
  assert.throws(() => parse(['install', '--bad']), /unknown option/);
});

test('input: unknown command fails loud', () => {
  assert.throws(() => parse(['frobnicate']), /unknown command or option/);
});

test('input: stray positional after command fails loud', () => {
  assert.throws(() => parse(['install', 'extra']), /unknown option/);
});

test('input: flag before command with no command fails loud', () => {
  assert.throws(() => parse(['--json']), /unknown command or option/);
});

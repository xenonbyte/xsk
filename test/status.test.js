'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { statusOf, computeStatus, render } = require('../lib/status');
const { doctor, nodeMajor, isWritableDir, REQUIRED_NODE_MAJOR } = require('../lib/capability');
const { install } = require('../lib/install');
const { write, create, validate } = require('../lib/manifest');
const { get } = require('../lib/skills');

function validManifestObj(overrides) {
  return Object.assign(
    create('claude', '0.1.0', {
      installed_paths: ['/tmp/a/SKILL.md', '/tmp/a/.xsk-owned'],
    }),
    overrides,
  );
}

test('status: statusOf ok when shape valid and all paths exist', () => {
  const m = validManifestObj();
  assert.strictEqual(
    statusOf(m, { expectedPlatform: 'claude', exists: () => true }),
    'ok',
  );
});

test('status: statusOf drift when a recorded path is missing on disk', () => {
  const m = validManifestObj();
  assert.strictEqual(
    statusOf(m, { expectedPlatform: 'claude', exists: (p) => p !== '/tmp/a/.xsk-owned' }),
    'drift',
  );
});

test('status: statusOf invalid for shape-broken manifest (invalid wins over drift)', () => {
  const broken = validManifestObj();
  delete broken.installed_at;
  assert.strictEqual(
    statusOf(broken, { expectedPlatform: 'claude', exists: () => false }),
    'invalid',
  );
});

test('status: statusOf invalid for wrong platform', () => {
  const m = validManifestObj();
  assert.strictEqual(statusOf(m, { expectedPlatform: 'codex' }), 'invalid');
});

test('status: statusOf not-installed when no manifest', () => {
  assert.strictEqual(statusOf(null), 'not-installed');
});

test('status: computeStatus reports ok after a real install (injected roots)', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const claudeRoot = path.join(home, 'claude-skills');
  const xskRoot = path.join(home, '.xsk');
  install({
    platforms: ['claude'],
    platformRoots: { claude: claudeRoot },
    xskRoot,
    skills: [get('xsk-think')],
  });
  const result = computeStatus({ platforms: ['claude'], xskRoot });
  assert.strictEqual(result.platforms.claude.state, 'ok');
});

test('status: computeStatus reports drift when a recorded path is deleted', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const claudeRoot = path.join(home, 'claude-skills');
  const xskRoot = path.join(home, '.xsk');
  install({
    platforms: ['claude'],
    platformRoots: { claude: claudeRoot },
    xskRoot,
    skills: [get('xsk-think')],
  });
  fs.rmSync(path.join(claudeRoot, 'xsk-think', 'SKILL.md'), { force: true });
  const result = computeStatus({ platforms: ['claude'], xskRoot });
  assert.strictEqual(result.platforms.claude.state, 'drift');
  assert.ok(result.platforms.claude.missing.length > 0);
});

test('status: computeStatus reports invalid for truncated manifest JSON', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const xskRoot = path.join(home, '.xsk');
  const dir = path.join(xskRoot, 'manifests');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'claude.manifest'), '{ "schema_version": 1, ');
  const result = computeStatus({ platforms: ['claude'], xskRoot });
  assert.strictEqual(result.platforms.claude.state, 'invalid');
});

test('status: computeStatus reports not-installed when no manifest', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const result = computeStatus({ platforms: ['claude'], xskRoot: path.join(home, '.xsk') });
  assert.strictEqual(result.platforms.claude.state, 'not-installed');
});

test('status: render text and json both produce output containing the state', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const claudeRoot = path.join(home, 'claude-skills');
  const xskRoot = path.join(home, '.xsk');
  install({
    platforms: ['claude'],
    platformRoots: { claude: claudeRoot },
    xskRoot,
    skills: [get('xsk-think')],
  });
  const result = computeStatus({ platforms: ['claude'], xskRoot });
  const text = render(result, { platforms: ['claude'] });
  assert.ok(/claude: ok/.test(text), 'text contains state');
  const json = render(result, { json: true });
  const parsed = JSON.parse(json);
  assert.strictEqual(parsed.platforms.claude.state, 'ok');
});

test('doctor: reports Node version check pass on this host', () => {
  const result = doctor({ platforms: [], xskRoot: path.join(os.tmpdir(), 'none') });
  const nodeCheck = result.checks.find((c) => c.name === 'node-version');
  assert.ok(nodeMajor() >= REQUIRED_NODE_MAJOR, 'test host meets Node >= 20');
  assert.strictEqual(nodeCheck.pass, true);
});

test('doctor: writable check passes for a creatable temp root', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-'));
  const result = doctor({
    platforms: ['claude'],
    platformRoots: { claude: path.join(home, 'claude-skills') },
    xskRoot: path.join(home, '.xsk'),
  });
  const w = result.checks.find((c) => c.name === 'writable-claude');
  assert.strictEqual(w.pass, true);
});

test('doctor: writable check fails when an ancestor is a regular file', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-'));
  const blocker = path.join(home, 'not-a-dir');
  fs.writeFileSync(blocker, 'blocking file');
  const result = doctor({
    platforms: ['claude'],
    platformRoots: { claude: path.join(blocker, 'skills') },
    xskRoot: path.join(home, '.xsk'),
  });
  const w = result.checks.find((c) => c.name === 'writable-claude');
  assert.strictEqual(w.pass, false);
  assert.strictEqual(result.allPass, false);
});

test('doctor: manifest-valid check reflects a valid manifest', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-'));
  const xskRoot = path.join(home, '.xsk');
  write('claude', create('claude', '0.1.0', { installed_paths: [] }), { xskRoot });
  const result = doctor({ platforms: ['claude'], platformRoots: { claude: path.join(home, 'c') }, xskRoot });
  const m = result.checks.find((c) => c.name === 'manifest-valid');
  assert.strictEqual(m.pass, true);
});

test('doctor: manifest-valid check fails when a manifest is shape-invalid', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-'));
  const xskRoot = path.join(home, '.xsk');
  const dir = path.join(xskRoot, 'manifests');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'claude.manifest'), JSON.stringify({ schema_version: 1 }));
  const result = doctor({ platforms: ['claude'], platformRoots: { claude: path.join(home, 'c') }, xskRoot });
  const m = result.checks.find((c) => c.name === 'manifest-valid');
  assert.strictEqual(m.pass, false);
  assert.strictEqual(result.allPass, false);
});

test('doctor: manifest-valid checks the default manifest root when xskRoot is omitted', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-default-'));
  const mock = test.mock.method(os, 'homedir', () => home);
  try {
    const dir = path.join(home, '.xsk', 'manifests');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'claude.manifest'), JSON.stringify({ schema_version: 1 }));

    const result = doctor({ platforms: ['claude'], platformRoots: { claude: path.join(home, 'c') } });
    const m = result.checks.find((c) => c.name === 'manifest-valid');
    assert.strictEqual(m.pass, false);
    assert.strictEqual(result.allPass, false);
  } finally {
    mock.mock.restore();
  }
});

test('doctor: render json parses and includes checks', () => {
  const result = doctor({ platforms: ['claude'], platformRoots: { claude: path.join(os.tmpdir(), 'x') }, xskRoot: path.join(os.tmpdir(), 'none') });
  const { render } = require('../lib/capability');
  const parsed = JSON.parse(render(result, { json: true }));
  assert.ok(Array.isArray(parsed.checks) && parsed.checks.length > 0);
});

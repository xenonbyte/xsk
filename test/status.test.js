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

test('status: statusOf drift when a recorded backup is missing on disk', () => {
  const m = validManifestObj({
    backups: [{ target: '/tmp/a/SKILL.md', backup: '/tmp/xsk-backup.bak' }],
  });
  assert.strictEqual(
    statusOf(m, { expectedPlatform: 'claude', exists: (p) => p !== '/tmp/xsk-backup.bak' }),
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
  const result = computeStatus({ platforms: ['claude'], platformRoots: { claude: claudeRoot }, xskRoot });
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
  const result = computeStatus({ platforms: ['claude'], platformRoots: { claude: claudeRoot }, xskRoot });
  assert.strictEqual(result.platforms.claude.state, 'drift');
  assert.ok(result.platforms.claude.missing.length > 0);
});

test('status: computeStatus reports invalid when a recorded installed path escapes the injected platform root', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const claudeRoot = path.join(home, 'claude-skills');
  const xskRoot = path.join(home, '.xsk');
  const escapedPath = path.join(home, 'outside', 'xsk-think', 'SKILL.md');
  fs.mkdirSync(path.dirname(escapedPath), { recursive: true });
  fs.writeFileSync(escapedPath, 'escaped skill');
  write('claude', create('claude', '0.1.0', { installed_paths: [escapedPath] }), { xskRoot });

  const result = computeStatus({ platforms: ['claude'], platformRoots: { claude: claudeRoot }, xskRoot });

  assert.strictEqual(result.platforms.claude.state, 'invalid');
  assert.match(result.platforms.claude.reason, /installed path escapes platform root/);
});

test('status: computeStatus reports drift when a recorded skill file becomes a directory', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const claudeRoot = path.join(home, 'claude-skills');
  const xskRoot = path.join(home, '.xsk');
  const skillFile = path.join(claudeRoot, 'xsk-think', 'SKILL.md');
  install({
    platforms: ['claude'],
    platformRoots: { claude: claudeRoot },
    xskRoot,
    skills: [get('xsk-think')],
  });
  fs.rmSync(skillFile, { force: true });
  fs.mkdirSync(skillFile);

  const result = computeStatus({ platforms: ['claude'], platformRoots: { claude: claudeRoot }, xskRoot });
  assert.strictEqual(result.platforms.claude.state, 'drift');
  assert.ok(result.platforms.claude.missing.includes(skillFile));
});

test('status: computeStatus reports drift when a recorded marker becomes a directory', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const claudeRoot = path.join(home, 'claude-skills');
  const xskRoot = path.join(home, '.xsk');
  const markerFile = path.join(claudeRoot, 'xsk-think', '.xsk-owned');
  install({
    platforms: ['claude'],
    platformRoots: { claude: claudeRoot },
    xskRoot,
    skills: [get('xsk-think')],
  });
  fs.rmSync(markerFile, { force: true });
  fs.mkdirSync(markerFile);

  const result = computeStatus({ platforms: ['claude'], platformRoots: { claude: claudeRoot }, xskRoot });
  assert.strictEqual(result.platforms.claude.state, 'drift');
  assert.ok(result.platforms.claude.missing.includes(markerFile));
});

test('status: computeStatus reports drift when a recorded owned dir becomes a file', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const xskRoot = path.join(home, '.xsk');
  const claudeRoot = path.join(home, 'claude-skills');
  const skillDir = path.join(home, 'claude-skills', 'xsk-think');
  fs.mkdirSync(path.dirname(skillDir), { recursive: true });
  fs.writeFileSync(skillDir, 'not a directory');
  write('claude', create('claude', '0.1.0', { installed_paths: [skillDir] }), { xskRoot });

  const result = computeStatus({ platforms: ['claude'], platformRoots: { claude: claudeRoot }, xskRoot });
  assert.strictEqual(result.platforms.claude.state, 'drift');
  assert.ok(result.platforms.claude.missing.includes(skillDir));
});

test('status: computeStatus reports drift when a recorded backup is deleted', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const claudeRoot = path.join(home, 'claude-skills');
  const xskRoot = path.join(home, '.xsk');
  const skillFile = path.join(claudeRoot, 'xsk-think', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'user skill');
  install({
    platforms: ['claude'],
    platformRoots: { claude: claudeRoot },
    xskRoot,
    skills: [get('xsk-think')],
  });
  const manifest = require('../lib/manifest').read('claude', { xskRoot });
  assert.strictEqual(manifest.backups.length, 1, 'install recorded a displaced user backup');
  fs.rmSync(manifest.backups[0].backup, { force: true });

  const result = computeStatus({ platforms: ['claude'], platformRoots: { claude: claudeRoot }, xskRoot });
  assert.strictEqual(result.platforms.claude.state, 'drift');
  assert.ok(result.platforms.claude.missing.includes(manifest.backups[0].backup));
});

test('status: computeStatus reports drift when a recorded backup becomes a directory', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const claudeRoot = path.join(home, 'claude-skills');
  const xskRoot = path.join(home, '.xsk');
  const skillFile = path.join(claudeRoot, 'xsk-think', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'user skill');
  install({
    platforms: ['claude'],
    platformRoots: { claude: claudeRoot },
    xskRoot,
    skills: [get('xsk-think')],
  });
  const manifest = require('../lib/manifest').read('claude', { xskRoot });
  const backup = manifest.backups[0].backup;
  fs.rmSync(backup, { force: true });
  fs.mkdirSync(backup);

  const result = computeStatus({ platforms: ['claude'], platformRoots: { claude: claudeRoot }, xskRoot });
  assert.strictEqual(result.platforms.claude.state, 'drift');
  assert.ok(result.platforms.claude.missing.includes(backup));
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

test('status: computeStatus reports invalid for shape-invalid installed_paths without counting paths', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-status-'));
  const xskRoot = path.join(home, '.xsk');
  const dir = path.join(xskRoot, 'manifests');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'claude.manifest'),
    JSON.stringify({
      schema_version: 1,
      platform: 'claude',
      version: '0.1.0',
      installed_at: new Date().toISOString(),
      installed_paths: 'not-an-array',
      backups: [],
    }),
  );

  const result = computeStatus({ platforms: ['claude'], xskRoot });
  assert.strictEqual(result.platforms.claude.state, 'invalid');
  assert.strictEqual(result.platforms.claude.installedCount, undefined);
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
  const result = computeStatus({ platforms: ['claude'], platformRoots: { claude: claudeRoot }, xskRoot });
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

test('doctor: writable-xsk-root check fails when xskRoot is not writable', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-'));
  const xskRoot = path.join(home, '.xsk');
  fs.mkdirSync(xskRoot, { recursive: true });
  fs.chmodSync(xskRoot, 0o555);
  try {
    const result = doctor({
      platforms: ['claude'],
      platformRoots: { claude: path.join(home, 'claude-skills') },
      xskRoot,
    });
    const w = result.checks.find((c) => c.name === 'writable-xsk-root');
    assert.ok(w);
    assert.strictEqual(w.pass, false);
    assert.strictEqual(result.allPass, false);
  } finally {
    fs.chmodSync(xskRoot, 0o755);
  }
});

test('doctor: writable-xsk-root check fails when xskRoot is a symlink', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-'));
  const outside = path.join(home, 'outside-xsk');
  const xskRoot = path.join(home, '.xsk');
  fs.mkdirSync(outside, { recursive: true });
  fs.symlinkSync(outside, xskRoot);

  const result = doctor({
    platforms: ['claude'],
    platformRoots: { claude: path.join(home, 'claude-skills') },
    xskRoot,
  });
  const w = result.checks.find((c) => c.name === 'writable-xsk-root');
  assert.ok(w);
  assert.strictEqual(w.pass, false);
  assert.strictEqual(result.allPass, false);
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

test('doctor: writable check fails when the skill dir has a symlink ancestor', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-'));
  const outside = path.join(home, 'outside-claude');
  const link = path.join(home, '.claude');
  fs.mkdirSync(path.join(outside, 'skills'), { recursive: true });
  fs.symlinkSync(outside, link);

  const result = doctor({
    platforms: ['claude'],
    platformRoots: { claude: path.join(link, 'skills') },
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

test('doctor: manifest-valid check fails when a recorded install path drifts', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-'));
  const xskRoot = path.join(home, '.xsk');
  const skillFile = path.join(home, 'claude-skills', 'xsk-think', 'SKILL.md');
  write('claude', create('claude', '0.1.0', { installed_paths: [skillFile] }), { xskRoot });

  const result = doctor({ platforms: ['claude'], platformRoots: { claude: path.join(home, 'c') }, xskRoot });
  const m = result.checks.find((c) => c.name === 'manifest-valid');
  assert.strictEqual(m.pass, false);
  assert.match(m.detail, /drift/i);
  assert.strictEqual(result.allPass, false);
});

test('doctor: manifest-valid check fails when a recorded backup drifts', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-'));
  const xskRoot = path.join(home, '.xsk');
  const skillFile = path.join(home, 'claude-skills', 'xsk-think', 'SKILL.md');
  const backup = path.join(home, '.xsk', 'install', 'backups', 'claude', 'xsk-think.SKILL.md.bak');
  write('claude', create('claude', '0.1.0', {
    installed_paths: [],
    backups: [{ target: skillFile, backup }],
  }), { xskRoot });

  const result = doctor({ platforms: ['claude'], platformRoots: { claude: path.join(home, 'c') }, xskRoot });
  const m = result.checks.find((c) => c.name === 'manifest-valid');
  assert.strictEqual(m.pass, false);
  assert.match(m.detail, /drift/i);
  assert.strictEqual(result.allPass, false);
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

test('doctor: manifest-valid check fails when a recorded install path escapes the injected platform root', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-doc-'));
  const xskRoot = path.join(home, '.xsk');
  const claudeRoot = path.join(home, 'claude-skills');
  const escapedPath = path.join(home, 'outside', 'xsk-think', 'SKILL.md');
  fs.mkdirSync(path.dirname(escapedPath), { recursive: true });
  fs.writeFileSync(escapedPath, 'escaped skill');
  write('claude', create('claude', '0.1.0', { installed_paths: [escapedPath] }), { xskRoot });

  const result = doctor({ platforms: ['claude'], platformRoots: { claude: claudeRoot }, xskRoot });
  const m = result.checks.find((c) => c.name === 'manifest-valid');
  assert.strictEqual(m.pass, false);
  assert.match(m.detail, /invalid/i);
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
  assert.ok(parsed.checks.some((c) => c.name === 'writable-xsk-root'));
});

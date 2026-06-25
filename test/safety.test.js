'use strict';

// Safety invariants for the manifest-backed install model (RISK-SEC-001/002/003).
// These run entirely against per-test temp directories; they never touch real
// ~/.claude, ~/.agents, ~/.config/opencode, ~/.gemini, or ~/.xsk.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { install } = require('../lib/install');
const { uninstall } = require('../lib/uninstall');
const { read, write, create } = require('../lib/manifest');
const { get, skills: allSkills } = require('../lib/skills');
const { MARKER } = require('../lib/install');

function sandbox() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-safety-'));
  return {
    home,
    claudeRoot: path.join(home, 'claude-skills'),
    xskRoot: path.join(home, '.xsk'),
  };
}

function installClaude(sb, skillList) {
  return install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: skillList || allSkills,
  });
}

function uninstallClaude(sb, claudeRoot) {
  return uninstall({
    platforms: ['claude'],
    platformRoots: { claude: claudeRoot || sb.claudeRoot },
    xskRoot: sb.xskRoot,
  });
}

test('safety: uninstall removes only manifest-owned paths; a third-party file survives', () => {
  const sb = sandbox();
  installClaude(sb, [get('xsk-think')]);
  const foreign = path.join(sb.claudeRoot, 'someone-else', 'SKILL.md');
  fs.mkdirSync(path.dirname(foreign), { recursive: true });
  fs.writeFileSync(foreign, 'not ours');
  uninstallClaude(sb);
  assert.ok(fs.existsSync(foreign), 'third-party file untouched');
});

test('safety: ownership-marker gating — missing marker skips directory removal', () => {
  const sb = sandbox();
  installClaude(sb, [get('xsk-think')]);
  fs.rmSync(path.join(sb.claudeRoot, 'xsk-think', MARKER), { force: true });
  uninstallClaude(sb);
  assert.ok(fs.existsSync(path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md')),
    'generated file left when ownership marker absent');
});

test('safety: partial uninstall keeps ownership marker so owned dir removal can be retried', () => {
  const sb = sandbox();
  installClaude(sb, [get('xsk-think')]);
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const markerFile = path.join(skillDir, MARKER);
  const extraFile = path.join(skillDir, 'user-note.txt');
  fs.writeFileSync(extraFile, 'not owned by xsk');

  const first = uninstallClaude(sb);
  assert.strictEqual(first.exitCode, 2, 'first uninstall is partial because the dir is not empty');
  assert.ok(fs.existsSync(markerFile), 'marker kept so a later uninstall can retry the owned dir');
  const partial = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(partial.installed_paths.includes(skillDir), 'narrowed manifest keeps the owned dir');
  assert.ok(partial.installed_paths.includes(markerFile), 'narrowed manifest keeps the marker');

  fs.rmSync(extraFile, { force: true });
  const second = uninstallClaude(sb);
  assert.strictEqual(second.exitCode, 0, 'retry completes after the extra file is removed');
  assert.ok(!fs.existsSync(skillDir), 'owned dir removed on retry');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest removed after retry completes');
});

test('safety: symlink refusal — a symlink skill dir is never removed or traversed', () => {
  const sb = sandbox();
  installClaude(sb, [get('xsk-think')]);
  const real = path.join(sb.claudeRoot, 'xsk-think');
  const elsewhere = path.join(sb.home, 'elsewhere');
  fs.mkdirSync(elsewhere, { recursive: true });
  fs.rmSync(path.join(real, MARKER), { force: true });
  fs.rmSync(path.join(real, 'SKILL.md'), { force: true });
  fs.rmdirSync(real);
  fs.symlinkSync(elsewhere, real);
  const summary = uninstallClaude(sb);
  assert.ok(summary.platforms.claude.refused.includes(real), 'symlink reported as refused');
  assert.ok(fs.lstatSync(real).isSymbolicLink(), 'symlink left intact');
  assert.ok(fs.existsSync(elsewhere), 'link target untouched');
});

test('safety: uninstall refuses a symlink ancestor before reading the marker', () => {
  const sb = sandbox();
  const outside = path.join(sb.home, 'outside-claude');
  const link = path.join(sb.home, '.claude');
  const skillDir = path.join(link, 'skills', 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  fs.mkdirSync(path.join(outside, 'skills', 'xsk-think'), { recursive: true });
  fs.writeFileSync(path.join(outside, 'skills', 'xsk-think', 'SKILL.md'), 'external skill');
  fs.writeFileSync(path.join(outside, 'skills', 'xsk-think', MARKER), '@xenonbyte/xsk\n');
  fs.symlinkSync(outside, link);
  write(
    'claude',
    create('claude', '0.1.0', {
      installed_paths: [skillDir, skillFile, markerFile],
    }),
    { xskRoot: sb.xskRoot },
  );

  const originalReadFileSync = fs.readFileSync;
  let readMarker = false;
  fs.readFileSync = function readFileSyncSpy(target, ...args) {
    if (path.resolve(String(target)) === path.resolve(markerFile)) {
      readMarker = true;
      throw new Error('marker read before safety check');
    }
    return originalReadFileSync.call(fs, target, ...args);
  };

  let summary;
  try {
    summary = uninstallClaude(sb, path.join(link, 'skills'));
  } finally {
    fs.readFileSync = originalReadFileSync;
  }

  assert.strictEqual(readMarker, false, 'marker was not read through the symlink ancestor');
  assert.ok(summary.platforms.claude.refused.includes(skillDir), 'unsafe skill dir reported as refused');
  assert.ok(fs.lstatSync(link).isSymbolicLink(), 'symlink left intact');
});

test('safety: atomic-write rollback — a mid-run failure removes files already written this run', () => {
  const sb = sandbox();
  // Block the second skill's directory by placing a regular file where the dir must be.
  const blockPath = path.join(sb.claudeRoot, 'xsk-write-req');
  fs.mkdirSync(sb.claudeRoot, { recursive: true });
  fs.writeFileSync(blockPath, 'blocking file');
  assert.throws(
    () => installClaude(sb, [get('xsk-think'), get('xsk-write-req')]),
    /EEXIST|ENOTDIR|EISDIR|file|non-directory/,
    'install throws when a target dir cannot be created',
  );
  // xsk-think was written before the failure; rollback must remove it.
  assert.ok(
    !fs.existsSync(path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md')),
    'first skill rolled back after mid-run failure',
  );
  assert.ok(
    !fs.existsSync(path.join(sb.claudeRoot, 'xsk-think', MARKER)),
    'first skill marker rolled back',
  );
});

test('safety: backup restoration — a displaced original is restored on uninstall', () => {
  const sb = sandbox();
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  const userOriginal = '---\nname: xsk-think\ndescription: mine\n---\nMINE\n';
  fs.writeFileSync(skillFile, userOriginal);
  installClaude(sb, [get('xsk-think')]);
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.strictEqual(manifest.backups.length, 1);
  uninstallClaude(sb);
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userOriginal,
    'user original restored byte-for-byte');
});

test('safety: user-edit preservation — an edited generated file is retained with partial exit', () => {
  const sb = sandbox();
  installClaude(sb, [get('xsk-think')]);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  fs.writeFileSync(skillFile, fs.readFileSync(skillFile, 'utf8') + '\n# user note\n');
  const summary = uninstallClaude(sb);
  assert.strictEqual(summary.exitCode, 2, 'partial exit code');
  assert.ok(fs.existsSync(skillFile), 'edited file retained');
  const retained = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(retained.installed_paths.includes(skillFile), 'narrowed manifest keeps the retained file');
});

test('safety: full install -> status valid -> uninstall -> clean (zero stale fixtures)', () => {
  const sb = sandbox();
  const { computeStatus } = require('../lib/status');
  installClaude(sb, allSkills);
  const status = computeStatus({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
  });
  assert.strictEqual(status.platforms.claude.state, 'ok');
  uninstallClaude(sb);
  const after = computeStatus({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
  });
  assert.strictEqual(after.platforms.claude.state, 'not-installed');
  // no stale generated files remain under the claude root
  const remaining = fs.existsSync(sb.claudeRoot) ? fs.readdirSync(sb.claudeRoot) : [];
  assert.deepStrictEqual(remaining, [], 'claude skill root left empty after uninstall');
});

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
const { read } = require('../lib/manifest');
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

test('safety: uninstall removes only manifest-owned paths; a third-party file survives', () => {
  const sb = sandbox();
  installClaude(sb, [get('xsk-think')]);
  const foreign = path.join(sb.claudeRoot, 'someone-else', 'SKILL.md');
  fs.mkdirSync(path.dirname(foreign), { recursive: true });
  fs.writeFileSync(foreign, 'not ours');
  uninstall({ platforms: ['claude'], xskRoot: sb.xskRoot });
  assert.ok(fs.existsSync(foreign), 'third-party file untouched');
});

test('safety: ownership-marker gating — missing marker skips directory removal', () => {
  const sb = sandbox();
  installClaude(sb, [get('xsk-think')]);
  fs.rmSync(path.join(sb.claudeRoot, 'xsk-think', MARKER), { force: true });
  uninstall({ platforms: ['claude'], xskRoot: sb.xskRoot });
  assert.ok(fs.existsSync(path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md')),
    'generated file left when ownership marker absent');
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
  const summary = uninstall({ platforms: ['claude'], xskRoot: sb.xskRoot });
  assert.ok(summary.platforms.claude.refused.includes(real), 'symlink reported as refused');
  assert.ok(fs.lstatSync(real).isSymbolicLink(), 'symlink left intact');
  assert.ok(fs.existsSync(elsewhere), 'link target untouched');
});

test('safety: atomic-write rollback — a mid-run failure removes files already written this run', () => {
  const sb = sandbox();
  // Block the second skill's directory by placing a regular file where the dir must be.
  const blockPath = path.join(sb.claudeRoot, 'xsk-write-req');
  fs.mkdirSync(sb.claudeRoot, { recursive: true });
  fs.writeFileSync(blockPath, 'blocking file');
  assert.throws(
    () => installClaude(sb, [get('xsk-think'), get('xsk-write-req')]),
    /EEXIST|ENOTDIR|EISDIR|file/,
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
  uninstall({ platforms: ['claude'], xskRoot: sb.xskRoot });
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userOriginal,
    'user original restored byte-for-byte');
});

test('safety: user-edit preservation — an edited generated file is retained with partial exit', () => {
  const sb = sandbox();
  installClaude(sb, [get('xsk-think')]);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  fs.writeFileSync(skillFile, fs.readFileSync(skillFile, 'utf8') + '\n# user note\n');
  const summary = uninstall({ platforms: ['claude'], xskRoot: sb.xskRoot });
  assert.strictEqual(summary.exitCode, 2, 'partial exit code');
  assert.ok(fs.existsSync(skillFile), 'edited file retained');
  const retained = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(retained.installed_paths.includes(skillFile), 'narrowed manifest keeps the retained file');
});

test('safety: full install -> status valid -> uninstall -> clean (zero stale fixtures)', () => {
  const sb = sandbox();
  const { computeStatus } = require('../lib/status');
  installClaude(sb, allSkills);
  const status = computeStatus({ platforms: ['claude'], xskRoot: sb.xskRoot });
  assert.strictEqual(status.platforms.claude.state, 'ok');
  uninstall({ platforms: ['claude'], xskRoot: sb.xskRoot });
  const after = computeStatus({ platforms: ['claude'], xskRoot: sb.xskRoot });
  assert.strictEqual(after.platforms.claude.state, 'not-installed');
  // no stale generated files remain under the claude root
  const remaining = fs.existsSync(sb.claudeRoot) ? fs.readdirSync(sb.claudeRoot) : [];
  assert.deepStrictEqual(remaining, [], 'claude skill root left empty after uninstall');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { install } = require('../lib/install');
const { uninstall, uninstallPlatform, PARTIAL_EXIT } = require('../lib/uninstall');
const { read } = require('../lib/manifest');
const { get } = require('../lib/skills');
const { MARKER } = require('../lib/install');

function freshSandbox() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-uninstall-'));
  return {
    home,
    claudeRoot: path.join(home, 'claude-skills'),
    xskRoot: path.join(home, '.xsk'),
  };
}

function installOne(sb) {
  return install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
}

test('uninstall: removes only manifest-owned generated paths (full round-trip)', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  assert.ok(fs.existsSync(skillFile), 'installed');

  const summary = uninstall({ platforms: ['claude'], xskRoot: sb.xskRoot });
  const res = summary.platforms.claude;
  assert.strictEqual(res.exitCode, 0, 'full uninstall exit 0');
  assert.ok(!fs.existsSync(skillFile), 'generated SKILL.md removed');
  assert.ok(
    !fs.existsSync(path.join(sb.claudeRoot, 'xsk-think', MARKER)),
    'marker removed',
  );
  assert.ok(!fs.existsSync(path.join(sb.claudeRoot, 'xsk-think')), 'skill dir removed');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest deleted');
});

test('uninstall: owned-only removal leaves a third-party file at an unrecorded path untouched', () => {
  const sb = freshSandbox();
  installOne(sb);
  const thirdParty = path.join(sb.claudeRoot, 'someone-else', 'SKILL.md');
  fs.mkdirSync(path.dirname(thirdParty), { recursive: true });
  fs.writeFileSync(thirdParty, 'not ours');

  uninstall({ platforms: ['claude'], xskRoot: sb.xskRoot });

  assert.ok(fs.existsSync(thirdParty), 'third-party file untouched');
});

test('uninstall: missing marker skips the dir (ownership gate)', () => {
  const sb = freshSandbox();
  installOne(sb);
  const markerFile = path.join(sb.claudeRoot, 'xsk-think', MARKER);
  fs.rmSync(markerFile, { force: true }); // strip ownership

  const res = uninstallPlatform({ platform: 'claude', xskRoot: sb.xskRoot });
  assert.ok(res.skipped.includes(path.join(sb.claudeRoot, 'xsk-think')), 'dir skipped');
  assert.ok(
    fs.existsSync(path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md')),
    'generated file left in place (not owned dir)',
  );
});

test('uninstall: restores a displaced user file from backup when the generated file is unmodified', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user\n---\nUSER ORIGINAL\n';
  fs.writeFileSync(skillFile, userContent);

  installOne(sb); // displaces user file to backup
  // generated content now on disk
  assert.notStrictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'generated overwrote user file');

  const res = uninstallPlatform({ platform: 'claude', xskRoot: sb.xskRoot });
  assert.ok(res.restored.includes(skillFile), 'user original restored');
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'disk matches user original again');
});

test('uninstall: user-edited generated file is retained with partial report and narrowed manifest', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  fs.writeFileSync(skillFile, fs.readFileSync(skillFile, 'utf8') + '\n# USER EDIT\n');

  const res = uninstallPlatform({ platform: 'claude', xskRoot: sb.xskRoot });
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'partial exit code');
  assert.strictEqual(res.partial, true);
  assert.ok(fs.existsSync(skillFile), 'edited generated file retained');
  assert.ok(res.retained.includes(skillFile), 'reported as retained');

  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(narrowed, 'narrowed manifest persisted');
  assert.ok(narrowed.installed_paths.includes(skillFile), 'narrowed manifest lists retained file');
});

test('uninstall: a later run can finish after a partial (user reverts edit)', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');

  fs.writeFileSync(skillFile, fs.readFileSync(skillFile, 'utf8') + '\n# USER EDIT\n');
  let res = uninstallPlatform({ platform: 'claude', xskRoot: sb.xskRoot });
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'first run partial');

  // simulate user removing their edit -> regenerate-equivalent content back
  const { buildSkill } = require('../lib/generator');
  fs.writeFileSync(skillFile, buildSkill(get('xsk-think')).content);

  res = uninstallPlatform({ platform: 'claude', xskRoot: sb.xskRoot });
  assert.strictEqual(res.exitCode, 0, 'second run finishes');
  assert.ok(!fs.existsSync(skillFile), 'file removed on second run');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest cleared');
});

test('uninstall: refuses to remove a symlink skill dir', () => {
  const sb = freshSandbox();
  installOne(sb);
  // replace the installed skill dir with a symlink (simulating a hostile/aliased path)
  const real = path.join(sb.claudeRoot, 'xsk-think');
  const linkTarget = path.join(sb.home, 'elsewhere');
  fs.mkdirSync(linkTarget, { recursive: true });
  fs.rmSync(path.join(real, MARKER), { force: true });
  fs.rmSync(path.join(real, 'SKILL.md'), { force: true });
  fs.rmdirSync(real);
  fs.symlinkSync(linkTarget, real);

  const res = uninstallPlatform({ platform: 'claude', xskRoot: sb.xskRoot });
  assert.ok(res.refused.includes(real), 'symlink dir refused');
  assert.ok(fs.lstatSync(real).isSymbolicLink(), 'symlink left intact');
});

test('uninstall: no manifest -> nothing to uninstall, exit 0', () => {
  const sb = freshSandbox();
  const res = uninstallPlatform({ platform: 'claude', xskRoot: sb.xskRoot });
  assert.strictEqual(res.exitCode, 0);
  assert.strictEqual(res.nothingInstalled, true);
});

test('uninstall: invalid manifest shape -> refuse, exit non-zero', () => {
  const sb = freshSandbox();
  const dir = path.join(sb.xskRoot, 'manifests');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'claude.manifest'), JSON.stringify({ schema_version: 1 }));
  const res = uninstallPlatform({ platform: 'claude', xskRoot: sb.xskRoot });
  assert.strictEqual(res.invalid, true);
  assert.ok(res.exitCode !== 0, 'non-zero on invalid manifest');
});

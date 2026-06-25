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
const { safeBackupForSkill } = require('../lib/ownership');

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

function uninstallOnePlatform(sb) {
  return uninstallPlatform({ platform: 'claude', xskRoot: sb.xskRoot, skillsRoot: sb.claudeRoot });
}

test('uninstall: removes only manifest-owned generated paths (full round-trip)', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  assert.ok(fs.existsSync(skillFile), 'installed');

  const summary = uninstall({ platforms: ['claude'], platformRoots: { claude: sb.claudeRoot }, xskRoot: sb.xskRoot });
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

  uninstall({ platforms: ['claude'], platformRoots: { claude: sb.claudeRoot }, xskRoot: sb.xskRoot });

  assert.ok(fs.existsSync(thirdParty), 'third-party file untouched');
});

test('uninstall: missing marker skips the dir (ownership gate)', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(sb.claudeRoot, 'xsk-think', MARKER);
  fs.rmSync(markerFile, { force: true }); // strip ownership

  const res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'missing marker is a partial uninstall');
  assert.strictEqual(res.partial, true);
  assert.ok(res.skipped.includes(skillDir), 'dir skipped');
  assert.ok(fs.existsSync(skillFile), 'generated file left in place (not owned dir)');

  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(narrowed, 'manifest kept for later status/uninstall');
  assert.ok(narrowed.installed_paths.includes(skillFile), 'narrowed manifest tracks retained file');
});

test('uninstall: does not remove a pre-existing empty skill directory that is not manifest-owned', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  fs.mkdirSync(skillDir, { recursive: true });
  installOne(sb);

  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(!manifest.installed_paths.includes(skillDir), 'pre-existing dir is not manifest-owned');

  const res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, 0);
  assert.ok(fs.existsSync(skillDir), 'pre-existing empty dir preserved');
  assert.deepStrictEqual(fs.readdirSync(skillDir), [], 'generated files removed from preserved dir');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest removed after generated files are gone');
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

  const res = uninstallOnePlatform(sb);
  assert.ok(res.restored.includes(skillFile), 'user original restored');
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'disk matches user original again');
});

test('uninstall: missing recorded backup is partial and retains generated files', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user\n---\nUSER ORIGINAL\n';
  fs.writeFileSync(skillFile, userContent);
  installOne(sb);
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  const backup = manifest.backups[0];
  fs.rmSync(backup.backup, { force: true });

  const res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'missing backup forces partial');
  assert.ok(res.refused.includes(skillDir), 'skill dir reported as refused');
  assert.ok(fs.existsSync(skillFile), 'generated file retained until backup is available');
  assert.ok(fs.existsSync(markerFile), 'marker retained until backup is available');

  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(narrowed, 'manifest kept for later retry');
  assert.ok(narrowed.installed_paths.includes(skillFile), 'retained file stays in manifest');
  assert.deepStrictEqual(narrowed.backups, [backup], 'missing backup record is retained');
});

test('uninstall: refuses unsafe backup paths from a corrupted manifest', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillFile, '---\nname: xsk-think\ndescription: user\n---\nUSER ORIGINAL\n');
  installOne(sb);

  const victim = path.join(sb.home, 'not-xsk-owned-backup.md');
  fs.writeFileSync(victim, 'do not delete');
  const { write } = require('../lib/manifest');
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  manifest.backups[0].backup = victim;
  write('claude', manifest, { xskRoot: sb.xskRoot });

  const res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'unsafe backup path forces partial');
  assert.ok(res.refused.includes(skillDir), 'skill dir reported as refused');
  assert.strictEqual(fs.readFileSync(victim, 'utf8'), 'do not delete', 'unsafe backup path not deleted');
  assert.ok(fs.existsSync(skillFile), 'generated skill file retained');

  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(narrowed.installed_paths.includes(skillFile), 'retained file stays in manifest');
  assert.ok(narrowed.installed_paths.includes(path.join(skillDir, MARKER)), 'retained marker stays in manifest');
  assert.deepStrictEqual(narrowed.backups, [{ target: skillFile, backup: victim }], 'unsafe backup record retained');

  const retry = uninstallOnePlatform(sb);
  assert.strictEqual(retry.exitCode, PARTIAL_EXIT, 'second run remains partial while backup path is unsafe');
  assert.ok(retry.refused.includes(skillDir), 'second run still refuses skill dir');
  assert.ok(fs.existsSync(skillFile), 'second run still retains generated skill file');
});

test('uninstall: refuses backup targets outside skillsRoot', () => {
  const sb = freshSandbox();
  const skillFile = path.join(sb.home, 'outside-skill-target.md');
  const backupDir = path.join(sb.xskRoot, 'install', 'backups', 'claude');
  const backupFile = path.join(backupDir, 'outside-skill-target.md');
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(backupFile, 'backup content');
  fs.writeFileSync(skillFile, 'do not overwrite');

  const result = safeBackupForSkill(
    [{ target: skillFile, backup: backupFile }],
    skillFile,
    sb.xskRoot,
    'claude',
    sb.claudeRoot,
  );

  assert.strictEqual(result.unsafe, true, 'outside target is unsafe');
  assert.deepStrictEqual(result.backup, { target: skillFile, backup: backupFile }, 'matched backup returned');
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), 'do not overwrite', 'outside target not overwritten');
});

test('uninstall: refuses a non-regular marker before mutating generated files', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  fs.rmSync(markerFile, { force: true });
  fs.mkdirSync(markerFile);

  const res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'non-regular marker is partial');
  assert.ok(res.refused.includes(skillDir), 'skill dir reported as refused');
  assert.ok(fs.existsSync(skillFile), 'generated file retained');
  assert.ok(fs.statSync(markerFile).isDirectory(), 'directory marker retained');
  assert.ok(read('claude', { xskRoot: sb.xskRoot }), 'manifest retained for retry');
});

test('uninstall: refuses a marker with unexpected content before mutating generated files', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  fs.writeFileSync(markerFile, 'not-xsk\n');

  const res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'unexpected marker content is partial');
  assert.ok(res.refused.includes(skillDir), 'skill dir reported as refused');
  assert.ok(fs.existsSync(skillFile), 'generated file retained');
  assert.strictEqual(fs.readFileSync(markerFile, 'utf8'), 'not-xsk\n', 'unexpected marker retained');
  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(narrowed.installed_paths.includes(skillFile), 'retained file stays in manifest');
  assert.ok(narrowed.installed_paths.includes(markerFile), 'retained marker stays in manifest');
});

test('uninstall: user-edited generated file is retained with partial report and narrowed manifest', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  fs.writeFileSync(skillFile, fs.readFileSync(skillFile, 'utf8') + '\n# USER EDIT\n');

  const res = uninstallOnePlatform(sb);
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
  let res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'first run partial');

  // simulate user removing their edit -> regenerate-equivalent content back
  const { buildSkill } = require('../lib/generator');
  fs.writeFileSync(skillFile, buildSkill(get('xsk-think')).content);

  res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, 0, 'second run finishes');
  assert.ok(!fs.existsSync(skillFile), 'file removed on second run');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest cleared');
});

test('uninstall: partial retry preserves a pre-existing unowned skill directory', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  installOne(sb);

  const installedManifest = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(!installedManifest.installed_paths.includes(skillDir), 'pre-existing dir is not owned');
  fs.writeFileSync(skillFile, fs.readFileSync(skillFile, 'utf8') + '\n# USER EDIT\n');

  let res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'first run partial');
  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(!narrowed.installed_paths.includes(skillDir), 'partial manifest does not claim the user-owned dir');

  const { buildSkill } = require('../lib/generator');
  fs.writeFileSync(skillFile, buildSkill(get('xsk-think')).content);

  res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, 0, 'second run finishes');
  assert.ok(fs.existsSync(skillDir), 'pre-existing dir survives retry');
  assert.deepStrictEqual(fs.readdirSync(skillDir), [], 'generated files removed from preserved dir');
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

  const res = uninstallOnePlatform(sb);
  assert.ok(res.refused.includes(real), 'symlink dir refused');
  assert.ok(fs.lstatSync(real).isSymbolicLink(), 'symlink left intact');
});

test('uninstall: refuses paths with a symlink ancestor', () => {
  const sb = freshSandbox();
  const outside = path.join(sb.home, 'outside-ancestor-target');
  const link = path.join(sb.home, '.claude');
  const skillDir = path.join(link, 'skills', 'xsk-think');
  const realSkillDir = path.join(outside, 'skills', 'xsk-think');
  fs.mkdirSync(realSkillDir, { recursive: true });
  fs.symlinkSync(outside, link);
  fs.writeFileSync(path.join(realSkillDir, 'SKILL.md'), 'generated');
  fs.writeFileSync(path.join(realSkillDir, MARKER), '@xenonbyte/xsk\n');

  const { write, create } = require('../lib/manifest');
  write('claude', create('claude', '0.1.0', {
    installed_paths: [
      skillDir,
      path.join(skillDir, 'SKILL.md'),
      path.join(skillDir, MARKER),
    ],
  }), { xskRoot: sb.xskRoot });

  const res = uninstallPlatform({ platform: 'claude', xskRoot: sb.xskRoot, skillsRoot: path.join(link, 'skills') });
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'symlink ancestor is partial');
  assert.ok(res.refused.includes(skillDir), 'symlink ancestor path refused');
  assert.ok(fs.existsSync(path.join(realSkillDir, 'SKILL.md')), 'outside target not removed');
});

test('uninstall: no manifest -> nothing to uninstall, exit 0', () => {
  const sb = freshSandbox();
  const res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, 0);
  assert.strictEqual(res.nothingInstalled, true);
});

test('uninstall: invalid manifest shape -> refuse, exit non-zero', () => {
  const sb = freshSandbox();
  const dir = path.join(sb.xskRoot, 'manifests');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'claude.manifest'), JSON.stringify({ schema_version: 1 }));
  const res = uninstallOnePlatform(sb);
  assert.strictEqual(res.invalid, true);
  assert.ok(res.exitCode !== 0, 'non-zero on invalid manifest');
});

test('uninstall: shape-valid manifest with an out-of-root installed path refuses and leaves manifest untouched', () => {
  const sb = freshSandbox();
  const outsideDir = path.join(sb.home, 'outside-skill');
  const outsideFile = path.join(outsideDir, 'SKILL.md');
  fs.mkdirSync(outsideDir, { recursive: true });
  fs.writeFileSync(outsideFile, 'outside content');

  const { create, write } = require('../lib/manifest');
  const manifest = create('claude', '0.1.0', {
    installed_paths: [outsideFile],
  });
  write('claude', manifest, { xskRoot: sb.xskRoot });
  const manifestFile = path.join(sb.xskRoot, 'manifests', 'claude.manifest');
  const before = fs.readFileSync(manifestFile, 'utf8');

  const res = uninstall({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
  }).platforms.claude;

  assert.strictEqual(res.invalid, true);
  assert.strictEqual(res.exitCode, 1);
  assert.match(res.error, /installed path escapes platform root/);
  assert.strictEqual(fs.readFileSync(outsideFile, 'utf8'), 'outside content', 'out-of-root file untouched');
  assert.strictEqual(fs.readFileSync(manifestFile, 'utf8'), before, 'manifest retained unchanged');
});

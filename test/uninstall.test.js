'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { install } = require('../lib/install');
const { uninstall, uninstallPlatform, PARTIAL_EXIT } = require('../lib/uninstall');
const { create, manifestPath, read, write } = require('../lib/manifest');
const { get } = require('../lib/skills');
const { MARKER, PACKAGE_NAME } = require('../lib/install');
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

function installedHashRecord(target, content) {
  return {
    target,
    sha256: crypto.createHash('sha256').update(content, 'utf8').digest('hex'),
  };
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

test('uninstall: recorded installed hash allows clean removal after generated content changes', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const oldGeneratedContent = fs.readFileSync(skillFile, 'utf8') + '\n# old generated release\n';
  fs.writeFileSync(skillFile, oldGeneratedContent);

  const manifest = read('claude', { xskRoot: sb.xskRoot });
  manifest.installed_hashes = [installedHashRecord(skillFile, oldGeneratedContent)];
  write('claude', manifest, { xskRoot: sb.xskRoot });

  const res = uninstallOnePlatform(sb);

  assert.strictEqual(res.exitCode, 0, 'recorded hash treats the old generated file as clean');
  assert.ok(!fs.existsSync(skillDir), 'old generated skill removed');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest deleted');
});

test('uninstall: recorded installed hash allows pruning a skill no longer in the catalog', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-dropped');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  const oldGeneratedContent = '---\nname: xsk-dropped\ndescription: old\n---\nOLD GENERATED\n';
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillFile, oldGeneratedContent);
  fs.writeFileSync(markerFile, `${PACKAGE_NAME}\n`);

  const manifest = create('claude', '0.1.0', {
    installed_paths: [skillDir, skillFile, markerFile],
    installed_hashes: [installedHashRecord(skillFile, oldGeneratedContent)],
  });
  write('claude', manifest, { xskRoot: sb.xskRoot });

  const res = uninstallOnePlatform(sb);

  assert.strictEqual(res.exitCode, 0, 'dropped clean skill is still uninstallable');
  assert.ok(!fs.existsSync(skillDir), 'dropped skill pruned');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest deleted');
});

test('uninstall: manifest removal failure is reported as partial', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  const mf = manifestPath('claude', { xskRoot: sb.xskRoot });
  const originalRmSync = fs.rmSync;

  fs.rmSync = function failManifestRemoval(target, options) {
    if (path.resolve(String(target)) === path.resolve(mf)) {
      throw new Error('simulated manifest removal failure');
    }
    return originalRmSync.call(fs, target, options);
  };

  let res;
  try {
    res = uninstallOnePlatform(sb);
  } finally {
    fs.rmSync = originalRmSync;
  }

  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'manifest removal failure is not success');
  assert.strictEqual(res.partial, true);
  assert.match(res.error, /manifest removal failed|simulated manifest removal failure/i);
  assert.ok(!fs.existsSync(skillFile), 'generated file was already removed');
  assert.ok(fs.existsSync(mf), 'stale manifest remains visible for retry/status');
});

test('uninstall: narrowed manifest write failure is partial and rolls back prior removals', () => {
  const sb = freshSandbox();
  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think'), get('xsk-write-req')],
  });
  const cleanSkillDir = path.join(sb.claudeRoot, 'xsk-think');
  const cleanSkillFile = path.join(cleanSkillDir, 'SKILL.md');
  const cleanMarkerFile = path.join(cleanSkillDir, MARKER);
  const editedSkillFile = path.join(sb.claudeRoot, 'xsk-write-req', 'SKILL.md');
  fs.writeFileSync(editedSkillFile, fs.readFileSync(editedSkillFile, 'utf8') + '\n# USER EDIT\n');
  const mf = manifestPath('claude', { xskRoot: sb.xskRoot });
  const before = fs.readFileSync(mf, 'utf8');
  const originalRenameSync = fs.renameSync;

  fs.renameSync = function failNarrowedManifestWrite(from, to) {
    if (path.resolve(String(to)) === path.resolve(mf)) {
      throw new Error('simulated narrowed manifest write failure');
    }
    return originalRenameSync.call(fs, from, to);
  };

  let res;
  try {
    res = uninstallOnePlatform(sb);
  } finally {
    fs.renameSync = originalRenameSync;
  }

  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'manifest write failure is not success');
  assert.strictEqual(res.partial, true);
  assert.match(res.error, /manifest write failed|simulated narrowed manifest write failure/i);
  assert.ok(fs.existsSync(cleanSkillDir), 'clean skill dir restored so old manifest is truthful');
  assert.ok(fs.existsSync(cleanSkillFile), 'clean generated file restored');
  assert.strictEqual(fs.readFileSync(cleanMarkerFile, 'utf8'), `${PACKAGE_NAME}\n`, 'marker restored');
  assert.ok(fs.existsSync(editedSkillFile), 'edited retained skill remains in place');
  assert.strictEqual(fs.readFileSync(mf, 'utf8'), before, 'old manifest remains unchanged after rollback');
  assert.deepStrictEqual(res.removed, [], 'rollback clears removed tally so it does not over-report');
  assert.deepStrictEqual(res.restored, [], 'rollback clears restored tally so it does not over-report');
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

test('uninstall: backup cleanup failure is partial and keeps manifest retryable', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user\n---\nUSER ORIGINAL\n';
  fs.writeFileSync(skillFile, userContent);

  installOne(sb);
  const generatedContent = fs.readFileSync(skillFile, 'utf8');
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  const backup = manifest.backups[0];
  assert.ok(backup, 'install recorded displaced user file backup');
  const originalRmSync = fs.rmSync;

  fs.rmSync = function failBackupCleanup(target, options) {
    if (path.resolve(String(target)) === path.resolve(backup.backup)) {
      throw new Error('simulated backup cleanup failure');
    }
    return originalRmSync.call(fs, target, options);
  };

  let res;
  try {
    res = uninstallOnePlatform(sb);
  } finally {
    fs.rmSync = originalRmSync;
  }

  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'backup cleanup failure is not success');
  assert.strictEqual(res.partial, true);
  assert.match(res.error, /backup cleanup failed|simulated backup cleanup failure/i);
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), generatedContent, 'generated file rolled back for retry');
  assert.strictEqual(fs.readFileSync(markerFile, 'utf8'), `${PACKAGE_NAME}\n`, 'marker remains for retry');
  assert.ok(fs.existsSync(backup.backup), 'backup remains tracked for retry');
  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(narrowed.installed_paths.includes(skillFile), 'retained file stays in manifest');
  assert.ok(narrowed.installed_paths.includes(markerFile), 'retained marker stays in manifest');
  assert.deepStrictEqual(narrowed.backups, [backup], 'backup record is retained');

  const retry = uninstallOnePlatform(sb);
  assert.strictEqual(retry.exitCode, 0, 'retry finishes after backup cleanup succeeds');
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'user original restored on retry');
  assert.ok(!fs.existsSync(markerFile), 'ownership marker removed');
  assert.ok(!fs.existsSync(backup.backup), 'backup removed on retry');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest cleared after retry');
});

test('uninstall: backup restore copy failure is partial and keeps manifest retryable', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user\n---\nUSER ORIGINAL\n';
  fs.writeFileSync(skillFile, userContent);

  installOne(sb);
  const generatedContent = fs.readFileSync(skillFile, 'utf8');
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  const backup = manifest.backups[0];
  assert.ok(backup, 'install recorded displaced user file backup');
  const originalCopyFileSync = fs.copyFileSync;

  fs.copyFileSync = function failBackupRestore(from, to, mode) {
    if (
      path.resolve(String(from)) === path.resolve(backup.backup) &&
      path.resolve(String(to)) === path.resolve(backup.target)
    ) {
      throw new Error('simulated backup restore failure');
    }
    return originalCopyFileSync.call(fs, from, to, mode);
  };

  let res;
  try {
    res = uninstallOnePlatform(sb);
  } finally {
    fs.copyFileSync = originalCopyFileSync;
  }

  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'backup restore failure is not success');
  assert.strictEqual(res.partial, true);
  assert.match(res.error, /backup restore failed|simulated backup restore failure/i);
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), generatedContent, 'generated file rolled back for retry');
  assert.strictEqual(fs.readFileSync(markerFile, 'utf8'), `${PACKAGE_NAME}\n`, 'marker remains for retry');
  assert.ok(fs.existsSync(backup.backup), 'backup remains tracked for retry');
  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(narrowed.installed_paths.includes(skillFile), 'retained file stays in manifest');
  assert.ok(narrowed.installed_paths.includes(markerFile), 'retained marker stays in manifest');
  assert.deepStrictEqual(narrowed.backups, [backup], 'backup record is retained');

  const retry = uninstallOnePlatform(sb);
  assert.strictEqual(retry.exitCode, 0, 'retry finishes after backup restore succeeds');
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'user original restored on retry');
  assert.ok(!fs.existsSync(markerFile), 'ownership marker removed');
  assert.ok(!fs.existsSync(backup.backup), 'backup removed on retry');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest cleared after retry');
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
  assert.ok(!narrowed.installed_paths.includes(skillDir), 'pre-existing dir is not re-owned during partial');
  assert.deepStrictEqual(narrowed.backups, [backup], 'missing backup record is retained');

  fs.writeFileSync(backup.backup, userContent);
  const retry = uninstallOnePlatform(sb);
  assert.strictEqual(retry.exitCode, 0, 'retry finishes after backup is restored');
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'user original restored on retry');
  assert.ok(!fs.existsSync(markerFile), 'ownership marker removed');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest cleared after retry');
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

test('uninstall: refuses corrupted backup records that do not match an installed skill target', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const backupDir = path.join(sb.xskRoot, 'install', 'backups', 'claude');
  const backupFile = path.join(backupDir, 'orphan.bak');
  const outsideTarget = path.join(sb.home, 'outside-skill-target.md');
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(backupFile, 'orphaned backup content');

  const manifest = read('claude', { xskRoot: sb.xskRoot });
  manifest.backups = [{ target: outsideTarget, backup: backupFile }];
  write('claude', manifest, { xskRoot: sb.xskRoot });
  const mf = manifestPath('claude', { xskRoot: sb.xskRoot });
  const before = fs.readFileSync(mf, 'utf8');

  const res = uninstallOnePlatform(sb);

  assert.strictEqual(res.invalid, true);
  assert.strictEqual(res.exitCode, 1);
  assert.match(res.error, /backup target escapes platform root/);
  assert.ok(fs.existsSync(skillDir), 'installed skill dir retained');
  assert.ok(fs.existsSync(skillFile), 'generated skill file retained');
  assert.ok(fs.existsSync(backupFile), 'unmatched backup file retained');
  assert.strictEqual(fs.readFileSync(mf, 'utf8'), before, 'manifest retained unchanged');
});

test('uninstall: refuses duplicate backup targets before dropping manifest tracking', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillFile, '---\nname: xsk-think\ndescription: user\n---\nUSER ORIGINAL\n');
  installOne(sb);

  const outsideBackup = path.join(sb.home, 'outside-backup.bak');
  fs.writeFileSync(outsideBackup, 'do not discard');
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  const originalBackup = manifest.backups[0];
  manifest.backups = [
    originalBackup,
    { target: originalBackup.target, backup: outsideBackup },
  ];
  write('claude', manifest, { xskRoot: sb.xskRoot });
  const mf = manifestPath('claude', { xskRoot: sb.xskRoot });
  const before = fs.readFileSync(mf, 'utf8');

  const res = uninstallOnePlatform(sb);

  assert.strictEqual(res.invalid, true);
  assert.strictEqual(res.exitCode, 1);
  assert.match(res.error, /duplicate backup target/);
  assert.ok(fs.existsSync(skillFile), 'generated skill file retained');
  assert.strictEqual(fs.readFileSync(outsideBackup, 'utf8'), 'do not discard', 'duplicate backup not touched');
  assert.strictEqual(fs.readFileSync(mf, 'utf8'), before, 'manifest retained unchanged');
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

test('uninstall: non-regular marker partial preserves displaced backup and original dir ownership for retry', () => {
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
  assert.ok(backup, 'install recorded displaced user file backup');
  assert.ok(!manifest.installed_paths.includes(skillDir), 'pre-existing skill dir is not owned');

  fs.rmSync(markerFile, { force: true });
  fs.mkdirSync(markerFile);
  const res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'non-regular marker is partial');

  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(narrowed.installed_paths.includes(skillFile), 'retained file stays in manifest');
  assert.ok(narrowed.installed_paths.includes(markerFile), 'retained marker stays in manifest');
  assert.deepStrictEqual(narrowed.backups, [backup], 'backup record is retained for retry');
  assert.ok(!narrowed.installed_paths.includes(skillDir), 'pre-existing dir is not re-owned during partial');

  fs.rmSync(markerFile, { recursive: true, force: true });
  fs.writeFileSync(markerFile, `${PACKAGE_NAME}\n`);
  const retry = uninstallOnePlatform(sb);
  assert.strictEqual(retry.exitCode, 0, 'retry finishes after marker is repaired');
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'user original restored on retry');
  assert.ok(!fs.existsSync(markerFile), 'ownership marker removed');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest cleared after retry');
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

test('uninstall: invalid marker partial preserves displaced backup and original dir ownership for retry', () => {
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
  assert.ok(backup, 'install recorded displaced user file backup');
  assert.ok(!manifest.installed_paths.includes(skillDir), 'pre-existing skill dir is not owned');
  assert.notStrictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'generated file installed');

  fs.writeFileSync(markerFile, 'not-xsk\n');
  const res = uninstallOnePlatform(sb);
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'unexpected marker content is partial');

  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.deepStrictEqual(narrowed.backups, [backup], 'backup record is retained for retry');
  assert.ok(!narrowed.installed_paths.includes(skillDir), 'pre-existing dir is not re-owned during partial');

  fs.writeFileSync(markerFile, `${PACKAGE_NAME}\n`);
  const retry = uninstallOnePlatform(sb);
  assert.strictEqual(retry.exitCode, 0, 'retry finishes after marker is repaired');
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'user original restored on retry');
  assert.ok(!fs.existsSync(markerFile), 'ownership marker removed');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest cleared after retry');
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

test('uninstall: refused dangling symlink skill dir remains manifest-tracked for retry', () => {
  const sb = freshSandbox();
  installOne(sb);
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const linkTarget = path.join(sb.home, 'missing-target');
  fs.rmSync(path.join(skillDir, MARKER), { force: true });
  fs.rmSync(path.join(skillDir, 'SKILL.md'), { force: true });
  fs.rmdirSync(skillDir);
  fs.symlinkSync(linkTarget, skillDir);

  const res = uninstallOnePlatform(sb);

  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'dangling symlink refusal is partial');
  assert.ok(res.refused.includes(skillDir), 'dangling symlink dir refused');
  assert.ok(fs.lstatSync(skillDir).isSymbolicLink(), 'dangling symlink left intact');
  const narrowed = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(narrowed.installed_paths.includes(skillDir), 'refused symlink stays manifest-tracked');
  assert.ok(narrowed.installed_paths.includes(path.join(skillDir, 'SKILL.md')), 'refused skill file path stays manifest-tracked');
  assert.ok(narrowed.installed_paths.includes(path.join(skillDir, MARKER)), 'refused marker path stays manifest-tracked');

  fs.unlinkSync(skillDir);
  const retry = uninstallOnePlatform(sb);
  assert.strictEqual(retry.exitCode, 0, 'retry finishes after dangling symlink is removed');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest cleared after retry');
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

function opencodeSandbox() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-uninstall-oc-'));
  return {
    home,
    skillsRoot: path.join(home, 'opencode-skills'),
    commandsRoot: path.join(home, 'opencode-commands'),
    xskRoot: path.join(home, '.xsk'),
  };
}

test('uninstall: opencode removes the owned command file and clears the manifest', () => {
  const sb = opencodeSandbox();
  install({
    platforms: ['opencode'],
    platformRoots: { opencode: sb.skillsRoot },
    platformCommandsRoots: { opencode: sb.commandsRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
  const commandFile = path.join(sb.commandsRoot, 'xsk-think.md');
  const skillFile = path.join(sb.skillsRoot, 'xsk-think', 'SKILL.md');
  assert.ok(fs.existsSync(commandFile), 'command file installed');

  const summary = uninstall({
    platforms: ['opencode'],
    platformRoots: { opencode: sb.skillsRoot },
    platformCommandsRoots: { opencode: sb.commandsRoot },
    xskRoot: sb.xskRoot,
  });
  assert.strictEqual(summary.exitCode, 0, 'clean uninstall exit 0');
  assert.ok(summary.platforms.opencode.removed.includes(commandFile), 'command file reported removed');
  assert.ok(!fs.existsSync(commandFile), 'command file removed from disk');
  assert.ok(!fs.existsSync(skillFile), 'skill file removed from disk');
  assert.ok(fs.existsSync(sb.commandsRoot), 'shared commands dir not removed');
  assert.strictEqual(read('opencode', { xskRoot: sb.xskRoot }), null, 'manifest deleted');
});

test('uninstall: opencode retains a user-edited command file and keeps it manifest-tracked', () => {
  const sb = opencodeSandbox();
  install({
    platforms: ['opencode'],
    platformRoots: { opencode: sb.skillsRoot },
    platformCommandsRoots: { opencode: sb.commandsRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
  const commandFile = path.join(sb.commandsRoot, 'xsk-think.md');
  const edited = fs.readFileSync(commandFile, 'utf8') + '\n# USER EDIT\n';
  fs.writeFileSync(commandFile, edited);

  const res = uninstallPlatform({
    platform: 'opencode',
    xskRoot: sb.xskRoot,
    skillsRoot: sb.skillsRoot,
    commandsRoot: sb.commandsRoot,
  });
  assert.strictEqual(res.exitCode, PARTIAL_EXIT, 'edited command file forces partial');
  assert.ok(res.retained.includes(commandFile), 'edited command file reported retained');
  assert.strictEqual(fs.readFileSync(commandFile, 'utf8'), edited, 'edited command file preserved');

  const narrowed = read('opencode', { xskRoot: sb.xskRoot });
  assert.ok(narrowed, 'narrowed manifest persisted');
  assert.ok(narrowed.installed_paths.includes(commandFile), 'narrowed manifest still tracks the command file');
  assert.ok(
    narrowed.installed_hashes.some((h) => h.target === commandFile),
    'narrowed manifest keeps the command file hash',
  );
});

test('uninstall: opencode prunes a command file whose skill is no longer installed', () => {
  const sb = opencodeSandbox();
  const base = {
    platforms: ['opencode'],
    platformRoots: { opencode: sb.skillsRoot },
    platformCommandsRoots: { opencode: sb.commandsRoot },
    xskRoot: sb.xskRoot,
  };
  install(Object.assign({ skills: [get('xsk-think'), get('xsk-write-req')] }, base));
  const droppedCommand = path.join(sb.commandsRoot, 'xsk-write-req.md');
  assert.ok(fs.existsSync(droppedCommand), 'both command files installed');

  const summary = uninstall(base);
  assert.strictEqual(summary.exitCode, 0, 'clean uninstall removes every owned command file');
  assert.ok(!fs.existsSync(droppedCommand), 'dropped skill command file removed');
  assert.ok(!fs.existsSync(path.join(sb.commandsRoot, 'xsk-think.md')), 'retained skill command file removed too');
  assert.strictEqual(read('opencode', { xskRoot: sb.xskRoot }), null, 'manifest cleared');
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

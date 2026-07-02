'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { install, PACKAGE_NAME, MARKER } = require('../lib/install');
const { buildSkill } = require('../lib/generator');
const { create, read, validate, write } = require('../lib/manifest');
const { get } = require('../lib/skills');

function freshSandbox() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-install-'));
  return {
    home,
    claudeRoot: path.join(home, 'claude-skills'),
    xskRoot: path.join(home, '.xsk'),
  };
}

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

test('install: writes xsk-think SKILL.md + .xsk-owned marker under the injected claude root', () => {
  const sb = freshSandbox();
  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  const markerFile = path.join(sb.claudeRoot, 'xsk-think', MARKER);
  assert.ok(fs.existsSync(skillFile), 'SKILL.md created');
  assert.ok(fs.existsSync(markerFile), '.xsk-owned marker created');
  assert.strictEqual(fs.readFileSync(markerFile, 'utf8'), `${PACKAGE_NAME}\n`);
});

test('install: written SKILL.md content is complete (atomic, no leftover temp files)', () => {
  const sb = freshSandbox();
  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
  const dir = path.join(sb.claudeRoot, 'xsk-think');
  const entries = fs.readdirSync(dir);
  const tmpLeftovers = entries.filter((e) => e.includes('.tmp-'));
  assert.deepStrictEqual(tmpLeftovers, [], 'no temp siblings remain after atomic rename');
  const content = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  assert.ok(content.startsWith('---\nname: xsk-think\n'), 'content begins with frontmatter');
  assert.ok(content.trim().endsWith('approached, not what the agent is technically capable of.'));
});

test('install: atomic writes do not use a predictable temp path that can be symlinked', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  fs.mkdirSync(skillDir, { recursive: true });
  const victim = path.join(sb.home, 'outside-temp-target.md');
  fs.writeFileSync(victim, 'do not overwrite');
  fs.symlinkSync(victim, path.join(skillDir, `.SKILL.md.tmp-${process.pid}`));

  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });

  const skillFile = path.join(skillDir, 'SKILL.md');
  assert.strictEqual(fs.readFileSync(victim, 'utf8'), 'do not overwrite', 'symlink target not overwritten');
  assert.ok(fs.existsSync(skillFile), 'SKILL.md created');
  assert.strictEqual(fs.lstatSync(skillFile).isSymbolicLink(), false, 'SKILL.md is a real file');
});

test('install: records every created path in the platform manifest', () => {
  const sb = freshSandbox();
  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.strictEqual(validate(manifest, { expectedPlatform: 'claude' }), true);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  const markerFile = path.join(sb.claudeRoot, 'xsk-think', MARKER);
  assert.ok(manifest.installed_paths.includes(skillFile), 'manifest lists SKILL.md');
  assert.ok(manifest.installed_paths.includes(markerFile), 'manifest lists marker');
  assert.strictEqual(manifest.platform, 'claude');
});

test('install: records the installed generated content hash in the platform manifest', () => {
  const sb = freshSandbox();
  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });

  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  const content = fs.readFileSync(skillFile, 'utf8');
  const manifest = read('claude', { xskRoot: sb.xskRoot });

  assert.deepStrictEqual(manifest.installed_hashes, [{ target: skillFile, sha256: sha256(content) }]);
  assert.strictEqual(validate(manifest, { expectedPlatform: 'claude' }), true);
});

test('install: backs up a pre-existing user file and records it in backups[]', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user-owned custom\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);

  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });

  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.strictEqual(manifest.backups.length, 1, 'one backup recorded');
  const backup = manifest.backups[0];
  assert.strictEqual(backup.target, skillFile);
  assert.ok(fs.existsSync(backup.backup), 'backup file exists on disk');
  assert.strictEqual(fs.readFileSync(backup.backup, 'utf8'), userContent, 'backup preserves user content');
});

test('install: refuses a symlinked backup file before copying user content', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user-owned custom\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);

  const backupDir = path.join(sb.xskRoot, 'install', 'backups', 'claude');
  fs.mkdirSync(backupDir, { recursive: true });
  const victim = path.join(sb.home, 'outside-backup-target.md');
  fs.writeFileSync(victim, 'do not overwrite');
  fs.symlinkSync(victim, path.join(backupDir, 'xsk-think.SKILL.md.bak'));

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: sb.claudeRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think')],
      }),
    /symlink/i,
  );

  assert.strictEqual(fs.readFileSync(victim, 'utf8'), 'do not overwrite', 'symlink target not overwritten');
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'user skill file preserved');
});

test('install: failed marker write does not leave stale generated files', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  const originalRenameSync = fs.renameSync;
  let injected = false;
  let installError = null;

  // The marker is written through atomicWriteFile, whose final atomic step is
  // fs.renameSync(tmp, markerFile). Failing that rename (after the skill file
  // was already renamed into place) genuinely exercises the per-run rollback.
  fs.renameSync = function failMarkerAtomicRename(src, dest) {
    if (!injected && dest === markerFile) {
      injected = true;
      throw new Error('simulated marker failure');
    }
    return originalRenameSync.call(fs, src, dest);
  };

  try {
    install({
      platforms: ['claude'],
      platformRoots: { claude: sb.claudeRoot },
      xskRoot: sb.xskRoot,
      skills: [get('xsk-think')],
    });
  } catch (e) {
    installError = e;
  } finally {
    fs.renameSync = originalRenameSync;
  }

  if (installError) {
    assert.match(installError.message, /simulated marker failure/);
    assert.ok(!fs.existsSync(skillFile), 'generated skill file rolled back');
    assert.ok(!fs.existsSync(markerFile), 'partial marker rolled back');
  } else {
    assert.strictEqual(fs.readFileSync(markerFile, 'utf8'), `${PACKAGE_NAME}\n`);
    assert.ok(fs.existsSync(skillFile), 'generated skill file installed');
  }
});

test('install: refuses a pre-existing symlink skill directory before writing through it', () => {
  const sb = freshSandbox();
  const outside = path.join(sb.home, 'outside-target');
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(sb.claudeRoot, { recursive: true });
  fs.symlinkSync(outside, path.join(sb.claudeRoot, 'xsk-think'));

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: sb.claudeRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think')],
      }),
    /symlink/i,
  );
  assert.ok(!fs.existsSync(path.join(outside, 'SKILL.md')), 'outside target not written');
  assert.ok(!fs.existsSync(path.join(outside, MARKER)), 'outside target marker not written');
});

test('install: refuses a symlinked platform root before writing through it', () => {
  const sb = freshSandbox();
  const outside = path.join(sb.home, 'outside-root-target');
  fs.mkdirSync(outside, { recursive: true });
  fs.symlinkSync(outside, sb.claudeRoot);

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: sb.claudeRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think')],
      }),
    /symlink/i,
  );
  assert.ok(!fs.existsSync(path.join(outside, 'xsk-think', 'SKILL.md')), 'outside target not written');
  assert.ok(!fs.existsSync(path.join(outside, 'xsk-think', MARKER)), 'outside target marker not written');
});

test('install: refuses a symlink ancestor before creating a platform root', () => {
  const sb = freshSandbox();
  const outside = path.join(sb.home, 'outside-ancestor-target');
  const link = path.join(sb.home, '.claude');
  fs.mkdirSync(outside, { recursive: true });
  fs.symlinkSync(outside, link);
  const skillsRoot = path.join(link, 'skills');

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: skillsRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think')],
      }),
    /symlink/i,
  );
  assert.ok(!fs.existsSync(path.join(outside, 'skills', 'xsk-think', 'SKILL.md')), 'outside ancestor not written');
});

test('install: refuses a symlink ancestor before snapshot reads target files', () => {
  const sb = freshSandbox();
  const outside = path.join(sb.home, 'outside-ancestor-target');
  const link = path.join(sb.home, '.claude');
  const skillsRoot = path.join(link, 'skills');
  const externalSkillFile = path.join(skillsRoot, 'xsk-think', 'SKILL.md');
  fs.mkdirSync(path.dirname(path.join(outside, 'skills', 'xsk-think', 'SKILL.md')), { recursive: true });
  fs.writeFileSync(path.join(outside, 'skills', 'xsk-think', 'SKILL.md'), 'external skill');
  fs.symlinkSync(outside, link);

  const originalReadFileSync = fs.readFileSync;
  let readExternalSkill = false;
  fs.readFileSync = function readFileSyncSpy(target, ...args) {
    if (path.resolve(String(target)) === path.resolve(externalSkillFile)) {
      readExternalSkill = true;
      throw new Error('snapshot read before safety check');
    }
    return originalReadFileSync.call(fs, target, ...args);
  };

  try {
    assert.throws(
      () =>
        install({
          platforms: ['claude'],
          platformRoots: { claude: skillsRoot },
          xskRoot: sb.xskRoot,
          skills: [get('xsk-think')],
        }),
      /symlink/i,
    );
  } finally {
    fs.readFileSync = originalReadFileSync;
  }

  assert.strictEqual(readExternalSkill, false, 'snapshot did not read through the symlink ancestor');
});

test('install: re-install over an owned file does not create a new backup', () => {
  const sb = freshSandbox();
  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  install(opts);
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.deepStrictEqual(manifest.backups, [], 'second install creates no backup (file is owned)');
});

test('install: re-install refuses to overwrite a user-edited owned skill file', () => {
  const sb = freshSandbox();
  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  const edited = buildSkill(get('xsk-think')).content + '\n# USER EDIT\n';
  fs.writeFileSync(skillFile, edited);

  assert.throws(() => install(opts), /user-edited|drift/i);
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), edited, 'edited file preserved');
  assert.deepStrictEqual(read('claude', { xskRoot: sb.xskRoot }).backups, [], 'no backup record added');
});

test('install: re-install upgrades a clean owned file that matches its recorded installed hash', () => {
  const sb = freshSandbox();
  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  const currentGenerated = buildSkill(get('xsk-think')).content;
  const oldGenerated = `${currentGenerated}\n# old generated release\n`;
  fs.writeFileSync(skillFile, oldGenerated);
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  manifest.installed_hashes = [{ target: skillFile, sha256: sha256(oldGenerated) }];
  write('claude', manifest, { xskRoot: sb.xskRoot });

  install(opts);

  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), currentGenerated, 'clean old generated body upgraded');
});

test('install: refuses an invalid ownership marker before adopting matching skill content', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  const generatedContent = buildSkill(get('xsk-think')).content;
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillFile, generatedContent);
  fs.writeFileSync(markerFile, 'not-xsk\n');

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: sb.claudeRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think')],
      }),
    /marker/i,
  );

  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), generatedContent, 'skill file left untouched');
  assert.strictEqual(fs.readFileSync(markerFile, 'utf8'), 'not-xsk\n', 'invalid marker left untouched');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'no manifest written');
});

test('install: failed re-install rollback preserves a pre-existing owned install', () => {
  const sb = freshSandbox();
  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  const markerFile = path.join(sb.claudeRoot, 'xsk-think', MARKER);
  const originalSkill = fs.readFileSync(skillFile, 'utf8');
  const originalMarker = fs.readFileSync(markerFile, 'utf8');
  const blockingPath = path.join(sb.claudeRoot, 'xsk-write-req');
  fs.writeFileSync(blockingPath, 'blocking file');

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: sb.claudeRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think'), get('xsk-write-req')],
      }),
    /EEXIST|ENOTDIR|EISDIR|file|non-directory/,
  );

  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), originalSkill, 'pre-existing SKILL.md preserved');
  assert.strictEqual(fs.readFileSync(markerFile, 'utf8'), originalMarker, 'pre-existing marker preserved');
});

test('install: failed install rollback removes directories created in the failed run', () => {
  const sb = freshSandbox();
  const blockingPath = path.join(sb.claudeRoot, 'xsk-write-req');
  fs.mkdirSync(sb.claudeRoot, { recursive: true });
  fs.writeFileSync(blockingPath, 'blocking file');

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: sb.claudeRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think'), get('xsk-write-req')],
      }),
    /EEXIST|ENOTDIR|EISDIR|file|non-directory/,
  );

  assert.ok(!fs.existsSync(path.join(sb.claudeRoot, 'xsk-think')), 'new skill directory rolled back');
  assert.strictEqual(fs.readFileSync(blockingPath, 'utf8'), 'blocking file', 'pre-existing blocker preserved');
});

test('install: later platform failure rolls back earlier platform writes', () => {
  const sb = freshSandbox();
  const codexRoot = path.join(sb.home, 'codex-skills');
  const codexBlocker = path.join(codexRoot, 'xsk-think');
  fs.mkdirSync(codexRoot, { recursive: true });
  fs.writeFileSync(codexBlocker, 'blocking file');

  assert.throws(
    () =>
      install({
        platforms: ['claude', 'codex'],
        platformRoots: { claude: sb.claudeRoot, codex: codexRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think')],
      }),
    /EEXIST|ENOTDIR|EISDIR|file|non-directory/,
  );

  assert.ok(!fs.existsSync(path.join(sb.claudeRoot, 'xsk-think')), 'earlier platform skill dir rolled back');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'earlier platform manifest removed');
  assert.strictEqual(fs.readFileSync(codexBlocker, 'utf8'), 'blocking file', 'later platform blocker preserved');
});

test('install: rollback restore refuses a swapped symlink target', () => {
  const sb = freshSandbox();
  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  const victim = path.join(sb.home, 'outside-rollback-target.md');
  fs.writeFileSync(victim, 'do not overwrite');
  const failingDir = path.join(sb.claudeRoot, 'xsk-write-req');
  const originalMkdirSync = fs.mkdirSync;
  let swapped = false;
  let failedSecondSkill = false;

  // Under uninstall-first the transactional rollback runs through
  // restorePlatformSnapshot/restorePathState, so key the injection on the
  // "restore" frame rather than installPlatform's internal "rollback".
  fs.mkdirSync = function swapDuringRestore(target, options) {
    if (!failedSecondSkill && target === failingDir && !new Error().stack.includes('restore')) {
      failedSecondSkill = true;
      throw new Error('simulated second skill failure');
    }
    const result = originalMkdirSync.call(fs, target, options);
    if (!swapped && target === skillDir && new Error().stack.includes('restore')) {
      swapped = true;
      fs.rmSync(skillFile, { force: true });
      fs.symlinkSync(victim, skillFile);
    }
    return result;
  };

  try {
    assert.throws(
      () =>
        install({
          platforms: ['claude'],
          platformRoots: { claude: sb.claudeRoot },
          xskRoot: sb.xskRoot,
          skills: [get('xsk-think'), get('xsk-write-req')],
        }),
      /simulated second skill failure/,
    );
  } finally {
    fs.mkdirSync = originalMkdirSync;
  }

  assert.strictEqual(fs.readFileSync(victim, 'utf8'), 'do not overwrite', 'rollback did not follow symlink');
  assert.ok(fs.lstatSync(skillFile).isSymbolicLink(), 'swapped symlink left for manual recovery');
  assert.strictEqual(fs.readFileSync(markerFile, 'utf8'), `${PACKAGE_NAME}\n`, 'marker restored');
});

test('install: rollback cleanup refuses a swapped symlink ancestor for created paths', () => {
  const sb = freshSandbox();
  const realRootAfterSwap = path.join(sb.home, 'claude-skills-real');
  const outsideRoot = path.join(sb.home, 'outside-rollback-root');
  const outsideSkillDir = path.join(outsideRoot, 'xsk-think');
  const outsideSkillFile = path.join(outsideSkillDir, 'SKILL.md');
  const markerFile = path.join(sb.claudeRoot, 'xsk-think', MARKER);
  fs.mkdirSync(outsideSkillDir, { recursive: true });
  fs.writeFileSync(outsideSkillFile, 'do not remove');

  const originalRenameSync = fs.renameSync;
  let swapped = false;
  fs.renameSync = function swapRootThenFail(from, to) {
    if (!swapped && to === markerFile) {
      swapped = true;
      originalRenameSync.call(fs, sb.claudeRoot, realRootAfterSwap);
      fs.symlinkSync(outsideRoot, sb.claudeRoot);
      throw new Error('simulated marker write failure after root swap');
    }
    return originalRenameSync.call(fs, from, to);
  };

  try {
    assert.throws(
      () =>
        install({
          platforms: ['claude'],
          platformRoots: { claude: sb.claudeRoot },
          xskRoot: sb.xskRoot,
          skills: [get('xsk-think')],
        }),
      /simulated marker write failure after root swap/,
    );
  } finally {
    fs.renameSync = originalRenameSync;
  }

  assert.strictEqual(swapped, true, 'test swapped the platform root before rollback cleanup');
  assert.strictEqual(fs.readFileSync(outsideSkillFile, 'utf8'), 'do not remove', 'external skill file untouched');
  assert.ok(fs.lstatSync(sb.claudeRoot).isSymbolicLink(), 'unsafe swapped root left for manual recovery');
});

test('install: rollback cleanup refuses a swapped symlink ancestor for new backups', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const backupDir = path.join(sb.xskRoot, 'install', 'backups', 'claude');
  const realBackupDirAfterSwap = path.join(sb.home, 'real-backups-after-swap');
  const outsideBackupDir = path.join(sb.home, 'outside-backups');
  const outsideBackup = path.join(outsideBackupDir, 'xsk-think.SKILL.md.bak');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillFile, 'user skill content');
  fs.mkdirSync(outsideBackupDir, { recursive: true });
  fs.writeFileSync(outsideBackup, 'do not remove');

  const originalRenameSync = fs.renameSync;
  let swapped = false;
  fs.renameSync = function swapBackupThenFail(from, to) {
    if (!swapped && to === skillFile) {
      swapped = true;
      originalRenameSync.call(fs, backupDir, realBackupDirAfterSwap);
      fs.symlinkSync(outsideBackupDir, backupDir);
      throw new Error('simulated skill write failure after backup swap');
    }
    return originalRenameSync.call(fs, from, to);
  };

  try {
    assert.throws(
      () =>
        install({
          platforms: ['claude'],
          platformRoots: { claude: sb.claudeRoot },
          xskRoot: sb.xskRoot,
          skills: [get('xsk-think')],
        }),
      /simulated skill write failure after backup swap/,
    );
  } finally {
    fs.renameSync = originalRenameSync;
  }

  assert.strictEqual(swapped, true, 'test swapped the backup root before rollback cleanup');
  assert.strictEqual(fs.readFileSync(outsideBackup, 'utf8'), 'do not remove', 'external backup file untouched');
  assert.ok(fs.lstatSync(backupDir).isSymbolicLink(), 'unsafe swapped backup root left for manual recovery');
});

test('install: re-install preserves the manifest record for an original displaced backup', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user-owned custom\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);

  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const firstManifest = read('claude', { xskRoot: sb.xskRoot });
  install(opts);

  const secondManifest = read('claude', { xskRoot: sb.xskRoot });
  assert.deepStrictEqual(secondManifest.backups, firstManifest.backups);
  assert.strictEqual(fs.readFileSync(secondManifest.backups[0].backup, 'utf8'), userContent);
});

test('install: re-install fails instead of carrying forward a missing displaced backup', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user-owned custom\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);

  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const firstManifest = read('claude', { xskRoot: sb.xskRoot });
  const backup = firstManifest.backups[0].backup;
  fs.rmSync(backup, { force: true });

  assert.throws(() => install(opts), /missing backup|reuse backup/i);
  assert.strictEqual(fs.existsSync(backup), false, 'missing backup is not silently recreated');
  assert.deepStrictEqual(read('claude', { xskRoot: sb.xskRoot }), firstManifest);
});

test('install: re-install with a missing marker preserves the original displaced backup', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user-owned custom\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);

  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const firstManifest = read('claude', { xskRoot: sb.xskRoot });
  const backup = firstManifest.backups[0].backup;

  fs.rmSync(markerFile);
  install(opts);

  const secondManifest = read('claude', { xskRoot: sb.xskRoot });
  assert.deepStrictEqual(secondManifest.backups, firstManifest.backups);
  assert.strictEqual(fs.readFileSync(backup, 'utf8'), userContent);
});

test('install: re-install with a missing marker refuses to discard edited skill content', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user-owned custom\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);

  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const firstManifest = read('claude', { xskRoot: sb.xskRoot });
  const backup = firstManifest.backups[0].backup;
  const edited = buildSkill(get('xsk-think')).content + '\n# USER EDIT\n';

  fs.rmSync(markerFile);
  fs.writeFileSync(skillFile, edited);

  assert.throws(() => install(opts), /user-edited|drift/i);
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), edited);
  assert.strictEqual(fs.readFileSync(backup, 'utf8'), userContent);
  assert.deepStrictEqual(read('claude', { xskRoot: sb.xskRoot }), firstManifest);
});

test('install: re-install does not re-own a markerless retained skill directory', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };

  install(opts);
  fs.rmSync(markerFile);
  const userContent = '---\nname: xsk-think\ndescription: user-owned after marker loss\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);

  install(opts);

  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(!manifest.installed_paths.includes(skillDir), 'markerless retained dir is not re-owned');
  assert.strictEqual(manifest.backups.length, 1, 'markerless user content is backed up');

  const { uninstall } = require('../lib/uninstall');
  const summary = uninstall({ platforms: ['claude'], platformRoots: { claude: sb.claudeRoot }, xskRoot: sb.xskRoot });
  assert.strictEqual(summary.exitCode, 0);
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'markerless user content restored');
  assert.ok(!fs.existsSync(markerFile), 'ownership marker removed');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest removed after clean uninstall');
});

test('install: re-install does not back up a markerless generated skill file', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markerFile = path.join(skillDir, MARKER);
  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };

  install(opts);
  fs.rmSync(markerFile);
  assert.strictEqual(
    fs.readFileSync(skillFile, 'utf8'),
    buildSkill(get('xsk-think')).content,
    'test setup leaves the generated skill file unchanged',
  );

  install(opts);

  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.deepStrictEqual(manifest.backups, [], 'generated content is not recorded as a user backup');

  const { uninstall } = require('../lib/uninstall');
  const summary = uninstall({ platforms: ['claude'], platformRoots: { claude: sb.claudeRoot }, xskRoot: sb.xskRoot });
  assert.strictEqual(summary.exitCode, 0);
  assert.ok(!fs.existsSync(skillFile), 'generated skill file removed instead of restored from backup');
  assert.ok(!fs.existsSync(markerFile), 'ownership marker removed');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest removed after clean uninstall');
});

test('install: uninstall-first prunes a previously-owned skill no longer in the install set', () => {
  const sb = freshSandbox();
  const base = { platforms: ['claude'], platformRoots: { claude: sb.claudeRoot }, xskRoot: sb.xskRoot };
  install(Object.assign({ skills: [get('xsk-think'), get('xsk-write-req')] }, base));
  const wrDir = path.join(sb.claudeRoot, 'xsk-write-req');
  assert.ok(fs.existsSync(path.join(wrDir, 'SKILL.md')), 'both skills installed initially');

  // Reinstall with only one skill (as if xsk-write-req left the catalog). The
  // dropped skill must be pruned by uninstall-first, not left orphaned.
  install(Object.assign({ skills: [get('xsk-think')] }, base));

  assert.ok(fs.existsSync(path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md')), 'retained skill still installed');
  assert.ok(!fs.existsSync(wrDir), 'dropped skill pruned (no orphan left on disk)');
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(
    !manifest.installed_paths.some((p) => p.includes('xsk-write-req')),
    'manifest no longer references the pruned skill',
  );
});

test('install: uninstall-first prunes a clean previously-owned skill no longer in the catalog', () => {
  const sb = freshSandbox();
  const base = { platforms: ['claude'], platformRoots: { claude: sb.claudeRoot }, xskRoot: sb.xskRoot };
  const droppedDir = path.join(sb.claudeRoot, 'xsk-dropped');
  const droppedFile = path.join(droppedDir, 'SKILL.md');
  const droppedMarker = path.join(droppedDir, MARKER);
  const oldGenerated = '---\nname: xsk-dropped\ndescription: old\n---\nOLD GENERATED\n';
  fs.mkdirSync(droppedDir, { recursive: true });
  fs.writeFileSync(droppedFile, oldGenerated);
  fs.writeFileSync(droppedMarker, `${PACKAGE_NAME}\n`);
  write('claude', create('claude', '0.1.0', {
    installed_paths: [droppedDir, droppedFile, droppedMarker],
    installed_hashes: [{ target: droppedFile, sha256: sha256(oldGenerated) }],
  }), { xskRoot: sb.xskRoot });

  install(Object.assign({ skills: [get('xsk-think')] }, base));

  assert.ok(!fs.existsSync(droppedDir), 'dropped catalog skill pruned instead of orphaned');
  assert.ok(fs.existsSync(path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md')), 'requested skill installed');
});

test('install: uninstall-first restores a displaced user backup when pruning a dropped skill', () => {
  const sb = freshSandbox();
  const wrDir = path.join(sb.claudeRoot, 'xsk-write-req');
  const wrFile = path.join(wrDir, 'SKILL.md');
  fs.mkdirSync(wrDir, { recursive: true });
  const userContent = '---\nname: xsk-write-req\ndescription: user\n---\nUSER ORIGINAL\n';
  fs.writeFileSync(wrFile, userContent);
  const base = { platforms: ['claude'], platformRoots: { claude: sb.claudeRoot }, xskRoot: sb.xskRoot };

  install(Object.assign({ skills: [get('xsk-think'), get('xsk-write-req')] }, base));
  assert.notStrictEqual(fs.readFileSync(wrFile, 'utf8'), userContent, 'user file displaced by generated content');

  // Dropping xsk-write-req must prune it AND restore the user's original file.
  install(Object.assign({ skills: [get('xsk-think')] }, base));
  assert.strictEqual(fs.readFileSync(wrFile, 'utf8'), userContent, 'user file restored when the dropped skill is pruned');
});

test('install: a plain reinstall is idempotent and keeps the manifest correct', () => {
  const sb = freshSandbox();
  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const first = read('claude', { xskRoot: sb.xskRoot });
  install(opts);
  const second = read('claude', { xskRoot: sb.xskRoot });

  assert.deepStrictEqual(second.installed_paths.slice().sort(), first.installed_paths.slice().sort(), 'reinstall keeps the same owned paths');
  assert.strictEqual(
    fs.readFileSync(path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md'), 'utf8'),
    buildSkill(get('xsk-think')).content,
    'reinstall regenerates canonical content',
  );
});

test('install: refuses to overwrite an invalid previous manifest', () => {
  const sb = freshSandbox();
  const manifestDir = path.join(sb.xskRoot, 'manifests');
  const manifestFile = path.join(manifestDir, 'claude.manifest');
  fs.mkdirSync(manifestDir, { recursive: true });
  const invalidManifest = JSON.stringify({ schema_version: 1 });
  fs.writeFileSync(manifestFile, invalidManifest);

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: sb.claudeRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think')],
      }),
    /manifest.*shape validation|invalid/i,
  );

  assert.strictEqual(fs.readFileSync(manifestFile, 'utf8'), invalidManifest, 'invalid manifest left untouched');
  assert.ok(!fs.existsSync(path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md')), 'skill file not written');
});

test('install: refuses a previous manifest with an out-of-root installed path and leaves state untouched', () => {
  const sb = freshSandbox();
  const outsideDir = path.join(sb.home, 'outside-skill');
  const outsideFile = path.join(outsideDir, 'SKILL.md');
  fs.mkdirSync(outsideDir, { recursive: true });
  fs.writeFileSync(outsideFile, 'outside content');
  const outsideBefore = fs.statSync(outsideFile);

  const { create, write } = require('../lib/manifest');
  const manifest = create('claude', '0.1.0', {
    installed_paths: [outsideFile],
  });
  write('claude', manifest, { xskRoot: sb.xskRoot });
  const manifestFile = path.join(sb.xskRoot, 'manifests', 'claude.manifest');
  const before = fs.readFileSync(manifestFile, 'utf8');

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: sb.claudeRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think')],
      }),
    /installed path escapes platform root|existing manifest is invalid/i,
  );

  assert.strictEqual(fs.readFileSync(outsideFile, 'utf8'), 'outside content', 'outside file untouched');
  const outsideAfter = fs.statSync(outsideFile);
  assert.deepStrictEqual(
    {
      ino: outsideAfter.ino,
      size: outsideAfter.size,
      mtimeMs: outsideAfter.mtimeMs,
      ctimeMs: outsideAfter.ctimeMs,
      birthtimeMs: outsideAfter.birthtimeMs,
    },
    {
      ino: outsideBefore.ino,
      size: outsideBefore.size,
      mtimeMs: outsideBefore.mtimeMs,
      ctimeMs: outsideBefore.ctimeMs,
      birthtimeMs: outsideBefore.birthtimeMs,
    },
    'outside file stat fingerprint unchanged',
  );
  assert.strictEqual(fs.readFileSync(manifestFile, 'utf8'), before, 'manifest retained unchanged');
  assert.ok(!fs.existsSync(path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md')), 'skill file not written');
});

test('install: user-owned skill directories are not recorded or retained after uninstall restore', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user-owned custom\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);

  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });

  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(!manifest.installed_paths.includes(skillDir), 'pre-existing user directory is not owned');

  const { uninstall } = require('../lib/uninstall');
  const summary = uninstall({ platforms: ['claude'], platformRoots: { claude: sb.claudeRoot }, xskRoot: sb.xskRoot });
  assert.strictEqual(summary.exitCode, 0);
  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'user original restored');
  assert.ok(!fs.existsSync(path.join(skillDir, MARKER)), 'ownership marker removed');
  assert.strictEqual(read('claude', { xskRoot: sb.xskRoot }), null, 'manifest removed after generated files are gone');
});

test('install: re-install does not convert a pre-existing user directory into owned state', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  fs.mkdirSync(skillDir, { recursive: true });

  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  install(opts);

  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.ok(!manifest.installed_paths.includes(skillDir), 'pre-existing dir remains unowned after reinstall');

  const { uninstall } = require('../lib/uninstall');
  const summary = uninstall({ platforms: ['claude'], platformRoots: { claude: sb.claudeRoot }, xskRoot: sb.xskRoot });
  assert.strictEqual(summary.exitCode, 0);
  assert.ok(fs.existsSync(skillDir), 'user-owned directory survives uninstall after reinstall');
  assert.deepStrictEqual(fs.readdirSync(skillDir), [], 'generated files removed from preserved user dir');
});

test('install: rollback removes unrecorded backups created before a later failure', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user-owned custom\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);
  const blockingPath = path.join(sb.claudeRoot, 'xsk-write-req');
  fs.writeFileSync(blockingPath, 'blocking file');

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: sb.claudeRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think'), get('xsk-write-req')],
      }),
    /EEXIST|ENOTDIR|EISDIR|file|non-directory/,
  );

  assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), userContent, 'user file restored');
  const backupDir = path.join(sb.xskRoot, 'install', 'backups', 'claude');
  const remainingBackups = fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];
  assert.deepStrictEqual(remainingBackups, [], 'failed install leaves no unrecorded backup file');
});

test('install: applies per-skill platform targeting (xsk-think installs to claude)', () => {
  const sb = freshSandbox();
  const summary = install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
  assert.ok(summary.platforms.claude.installed.length > 0, 'xsk-think installed to claude');
});

test('install: summary marks a platform skipped when no skill targets it', () => {
  const sb = freshSandbox();
  const summary = install({
    platforms: ['codex'],
    platformRoots: { codex: path.join(sb.home, 'codex-skills') },
    xskRoot: sb.xskRoot,
    skills: [],
  });
  assert.strictEqual(summary.platforms.codex.skipped, true);
});

test('install: all four adapters resolve the correct platform skill roots', () => {
  const claude = require('../lib/adapters/claude.js');
  const codex = require('../lib/adapters/codex.js');
  const opencode = require('../lib/adapters/opencode.js');
  const gemini = require('../lib/adapters/gemini.js');
  const home = '/tmp/fake-home';
  assert.strictEqual(claude.skillsRoot({ home }), path.join(home, '.claude', 'skills'));
  assert.strictEqual(codex.skillsRoot({ home }), path.join(home, '.agents', 'skills'));
  assert.strictEqual(opencode.skillsRoot({ home }), path.join(home, '.config', 'opencode', 'skills'));
  assert.strictEqual(gemini.skillsRoot({ home }), path.join(home, '.gemini', 'skills'));
});

test('install: only the opencode adapter resolves a commands root (honoring the home override)', () => {
  const claude = require('../lib/adapters/claude.js');
  const codex = require('../lib/adapters/codex.js');
  const opencode = require('../lib/adapters/opencode.js');
  const gemini = require('../lib/adapters/gemini.js');
  const home = '/tmp/fake-home';
  assert.strictEqual(opencode.commandsRoot({ home }), path.join(home, '.config', 'opencode', 'commands'));
  assert.strictEqual(typeof claude.commandsRoot, 'undefined', 'claude has no commands root');
  assert.strictEqual(typeof codex.commandsRoot, 'undefined', 'codex has no commands root');
  assert.strictEqual(typeof gemini.commandsRoot, 'undefined', 'gemini has no commands root');
});

test('install: opencode writes a commands/<name>.md command file recorded + hashed, additive to the skills dir', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-opencode-'));
  const skillsRoot = path.join(home, 'opencode-skills');
  const commandsRoot = path.join(home, 'opencode-commands');
  const xskRoot = path.join(home, '.xsk');
  install({
    platforms: ['opencode'],
    platformRoots: { opencode: skillsRoot },
    platformCommandsRoots: { opencode: commandsRoot },
    xskRoot,
    skills: [get('xsk-think')],
  });

  // Additive: the skills-directory install is unchanged.
  const skillFile = path.join(skillsRoot, 'xsk-think', 'SKILL.md');
  const markerFile = path.join(skillsRoot, 'xsk-think', MARKER);
  assert.ok(fs.existsSync(skillFile), 'skill SKILL.md still installed');
  assert.ok(fs.existsSync(markerFile), 'skill ownership marker still installed');

  // New: a flat command file under the commands root.
  const commandFile = path.join(commandsRoot, 'xsk-think.md');
  assert.ok(fs.existsSync(commandFile), 'command file written under commands root');
  assert.ok(!fs.existsSync(path.join(commandsRoot, 'xsk-think', MARKER)), 'command file carries no ownership marker');

  const commandContent = fs.readFileSync(commandFile, 'utf8');
  const skillContent = buildSkill(get('xsk-think')).content;
  assert.ok(commandContent.startsWith(skillContent), 'command body begins with the generated skill content');
  assert.ok(/^description: /m.test(commandContent), 'command frontmatter carries description');
  assert.ok(commandContent.includes('## opencode invocation arguments'), 'command appends the invocation section');
  assert.ok(commandContent.includes('Use these arguments when running the skill above:'), 'command references the skill above');
  assert.ok(/```text\n\$ARGUMENTS\n```/.test(commandContent), 'command appends a fenced $ARGUMENTS block');
  assert.ok(commandContent.includes('If no arguments were supplied, follow the default usage.'), 'command notes the no-args default');

  const manifest = read('opencode', { xskRoot });
  assert.strictEqual(validate(manifest, { expectedPlatform: 'opencode' }), true);
  assert.ok(manifest.installed_paths.includes(commandFile), 'manifest records the command path');
  assert.ok(
    manifest.installed_hashes.some((h) => h.target === commandFile && h.sha256 === sha256(commandContent)),
    'manifest records the command content hash',
  );
  assert.ok(
    !manifest.backups.some((b) => b.target === commandFile || b.backup === commandFile),
    'command file has no backup record',
  );
});

test('install: opencode refuses to clobber a user-edited command file and rolls back', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-opencode-'));
  const skillsRoot = path.join(home, 'opencode-skills');
  const commandsRoot = path.join(home, 'opencode-commands');
  const xskRoot = path.join(home, '.xsk');
  const opts = {
    platforms: ['opencode'],
    platformRoots: { opencode: skillsRoot },
    platformCommandsRoots: { opencode: commandsRoot },
    xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const commandFile = path.join(commandsRoot, 'xsk-think.md');
  const edited = fs.readFileSync(commandFile, 'utf8') + '\n# USER EDIT\n';
  fs.writeFileSync(commandFile, edited);

  assert.throws(() => install(opts), /command|user-edited|drift/i);
  assert.strictEqual(fs.readFileSync(commandFile, 'utf8'), edited, 'user-edited command file preserved');
});

test('install: opencode does not clobber a pre-existing user command file absent from any manifest', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-opencode-'));
  const skillsRoot = path.join(home, 'opencode-skills');
  const commandsRoot = path.join(home, 'opencode-commands');
  const xskRoot = path.join(home, '.xsk');
  fs.mkdirSync(commandsRoot, { recursive: true });
  const commandFile = path.join(commandsRoot, 'xsk-think.md');
  fs.writeFileSync(commandFile, 'user-authored command\n');

  assert.throws(
    () =>
      install({
        platforms: ['opencode'],
        platformRoots: { opencode: skillsRoot },
        platformCommandsRoots: { opencode: commandsRoot },
        xskRoot,
        skills: [get('xsk-think')],
      }),
    /command|user|overwrite/i,
  );
  assert.strictEqual(fs.readFileSync(commandFile, 'utf8'), 'user-authored command\n', 'user command file preserved');
  assert.ok(!fs.existsSync(path.join(skillsRoot, 'xsk-think', 'SKILL.md')), 'skill write rolled back on command refusal');
  assert.strictEqual(read('opencode', { xskRoot }), null, 'no manifest written');
});

test('install: opencode uninstall-first prunes the command file of a dropped skill', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-opencode-'));
  const skillsRoot = path.join(home, 'opencode-skills');
  const commandsRoot = path.join(home, 'opencode-commands');
  const xskRoot = path.join(home, '.xsk');
  const base = {
    platforms: ['opencode'],
    platformRoots: { opencode: skillsRoot },
    platformCommandsRoots: { opencode: commandsRoot },
    xskRoot,
  };
  install(Object.assign({ skills: [get('xsk-think'), get('xsk-write-req')] }, base));
  const wrCommand = path.join(commandsRoot, 'xsk-write-req.md');
  assert.ok(fs.existsSync(wrCommand), 'both command files written initially');

  install(Object.assign({ skills: [get('xsk-think')] }, base));

  assert.ok(fs.existsSync(path.join(commandsRoot, 'xsk-think.md')), 'retained command file kept');
  assert.ok(!fs.existsSync(wrCommand), 'dropped skill command file pruned (no orphan)');
  const manifest = read('opencode', { xskRoot });
  assert.ok(
    !manifest.installed_paths.some((p) => p.includes('xsk-write-req')),
    'manifest no longer references the pruned skill command',
  );
});

test('install: default install resolves each platform root via its adapter', () => {
  // default (no injected root) uses adapter.skillsRoot() which reads os.homedir();
  // verify the adapter path structure without touching the real home dir.
  const codex = require('../lib/adapters/codex.js');
  assert.ok(codex.skillsRoot().includes('agents'));
});

test('install: bypass-claude installs only under the Claude root, skipped on other platforms', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-targeting-'));
  const roots = {
    claude: path.join(home, 'claude-skills'),
    codex: path.join(home, 'agents-skills'),
    opencode: path.join(home, 'opencode-skills'),
    gemini: path.join(home, 'gemini-skills'),
  };
  const xskRoot = path.join(home, '.xsk');
  const commandsRoots = { opencode: path.join(home, 'opencode-commands') };
  const { skills: allSkills } = require('../lib/skills');

  install({ platforms: ['claude', 'codex', 'opencode', 'gemini'], platformRoots: roots, platformCommandsRoots: commandsRoots, xskRoot, skills: allSkills });

  assert.ok(
    fs.existsSync(path.join(roots.claude, 'xsk-bypass-claude', 'SKILL.md')),
    'bypass-claude installed under claude root',
  );
  for (const p of ['codex', 'opencode', 'gemini']) {
    assert.ok(
      !fs.existsSync(path.join(roots[p], 'xsk-bypass-claude')),
      `bypass-claude NOT installed under ${p} root`,
    );
  }
});

test('install: claude gets all 8 skills; codex/opencode/gemini get 7 (no bypass-claude)', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-count-'));
  const roots = {
    claude: path.join(home, 'claude-skills'),
    codex: path.join(home, 'agents-skills'),
    opencode: path.join(home, 'opencode-skills'),
    gemini: path.join(home, 'gemini-skills'),
  };
  const xskRoot = path.join(home, '.xsk');
  const commandsRoots = { opencode: path.join(home, 'opencode-commands') };
  const { skills: allSkills } = require('../lib/skills');

  install({ platforms: ['claude', 'codex', 'opencode', 'gemini'], platformRoots: roots, platformCommandsRoots: commandsRoots, xskRoot, skills: allSkills });

  const countSkillMd = (root) => {
    let n = 0;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name === 'SKILL.md') n += 1;
      }
    };
    if (fs.existsSync(root)) walk(root);
    return n;
  };

  assert.strictEqual(countSkillMd(roots.claude), 8, 'claude has 8 skills');
  assert.strictEqual(countSkillMd(roots.codex), 7, 'codex has 7 skills');
  assert.strictEqual(countSkillMd(roots.opencode), 7, 'opencode has 7 skills');
  assert.strictEqual(countSkillMd(roots.gemini), 7, 'gemini has 7 skills');
});

test('install: full install + status + uninstall round-trip across all four platforms', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-full-'));
  const roots = {
    claude: path.join(home, 'claude-skills'),
    codex: path.join(home, 'agents-skills'),
    opencode: path.join(home, 'opencode-skills'),
    gemini: path.join(home, 'gemini-skills'),
  };
  const xskRoot = path.join(home, '.xsk');
  const commandsRoots = { opencode: path.join(home, 'opencode-commands') };
  const opencodeCommand = path.join(commandsRoots.opencode, 'xsk-think.md');
  const { skills: allSkills } = require('../lib/skills');
  const { computeStatus } = require('../lib/status');
  const { uninstall } = require('../lib/uninstall');

  install({ platforms: ['claude', 'codex', 'opencode', 'gemini'], platformRoots: roots, platformCommandsRoots: commandsRoots, xskRoot, skills: allSkills });
  assert.ok(fs.existsSync(opencodeCommand), 'opencode command file written during round-trip');
  let status = computeStatus({
    platforms: ['claude', 'codex', 'opencode', 'gemini'],
    platformRoots: roots,
    platformCommandsRoots: commandsRoots,
    xskRoot,
  });
  assert.strictEqual(status.platforms.claude.state, 'ok');
  assert.strictEqual(status.platforms.codex.state, 'ok');
  assert.strictEqual(status.platforms.opencode.state, 'ok');
  assert.strictEqual(status.platforms.gemini.state, 'ok');

  const summary = uninstall({
    platforms: ['claude', 'codex', 'opencode', 'gemini'],
    platformRoots: roots,
    platformCommandsRoots: commandsRoots,
    xskRoot,
  });
  assert.strictEqual(summary.exitCode, 0);
  for (const p of ['claude', 'codex', 'opencode', 'gemini']) {
    assert.ok(!fs.existsSync(path.join(roots[p], 'xsk-think')), `${p} skill dir removed`);
  }
  assert.ok(!fs.existsSync(opencodeCommand), 'opencode command file removed on uninstall');
  status = computeStatus({
    platforms: ['claude', 'codex', 'opencode', 'gemini'],
    platformRoots: roots,
    platformCommandsRoots: commandsRoots,
    xskRoot,
  });
  for (const p of ['claude', 'codex', 'opencode', 'gemini']) {
    assert.strictEqual(status.platforms[p].state, 'not-installed');
  }
});

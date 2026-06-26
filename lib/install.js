'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { buildSkill } = require('./generator');
const { skills: ALL_SKILLS } = require('./skills');
const { create, read, write, validate, manifestPath, assertSafePath, atomicWriteFile, isInsideDir } = require('./manifest');
const { MARKER, PACKAGE_NAME } = require('./ownership');
const { uninstallPlatform } = require('./uninstall');
const { contentSha256 } = require('./content-hash');

const ALL_PLATFORMS = ['claude', 'codex', 'opencode', 'gemini'];

function packageVersion() {
  try {
    return require('../package.json').version;
  } catch (e) {
    return '0.0.0';
  }
}

function rootFor(platform, platformRoots) {
  if (platformRoots && platformRoots[platform]) {
    return platformRoots[platform];
  }
  const adapter = require(`./adapters/${platform}.js`);
  return adapter.skillsRoot();
}

function writeGeneratedFile(targetPath, content, label) {
  atomicWriteFile(targetPath, content, {
    dirLabel: `${label} dir`,
    tempLabel: `${label} temp file`,
    targetLabel: label,
  });
}

function assertNotSymlink(targetPath, label) {
  assertSafePath(targetPath, label, { allowNonDirectoryTarget: true });
}

function assertReusableBackupRecord(backupRecord, backupDir) {
  const backupPath = path.resolve(backupRecord.backup);
  if (!isInsideDir(backupPath, backupDir)) {
    throw new Error(`refusing to reuse backup outside backup dir: ${backupRecord.backup}`);
  }
  assertSafePath(backupDir, 'backup dir');
  assertSafePath(backupPath, 'backup file', { allowNonDirectoryTarget: true });
  let stat;
  try {
    stat = fs.lstatSync(backupPath);
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      throw new Error(`refusing to repair install with missing backup: ${backupRecord.backup}`);
    }
    throw e;
  }
  if (!stat.isFile()) {
    throw new Error(`refusing to reuse non-file backup: ${backupRecord.backup}`);
  }
}

function ensurePlatformRoot(skillsRoot) {
  assertSafePath(skillsRoot, 'platform root');
  fs.mkdirSync(skillsRoot, { recursive: true });
  assertSafePath(skillsRoot, 'platform root');
}

function ensureSkillDir(skillDir) {
  assertSafePath(skillDir, 'skill dir');
  fs.mkdirSync(skillDir, { recursive: true });
  assertSafePath(skillDir, 'skill dir');
}

function previousInstallState(platform, xskRoot) {
  const empty = { backupsByTarget: new Map(), installedDirs: new Set() };
  let previous;
  try {
    previous = read(platform, { xskRoot });
  } catch (e) {
    if (!(e instanceof SyntaxError)) {
      throw e;
    }
    throw new Error(`manifest for ${platform} is not valid JSON: ${e.message}`);
  }
  if (previous === null) {
    return empty;
  }
  if (!validate(previous, { expectedPlatform: platform })) {
    throw new Error(`manifest for ${platform} failed shape validation; refusing to install`);
  }
  const installedDirs = new Set(
    previous.installed_paths.filter((p) => {
      const base = path.basename(p);
      return base !== 'SKILL.md' && base !== MARKER;
    }),
  );
  return {
    backupsByTarget: new Map(previous.backups.map((b) => [b.target, { target: b.target, backup: b.backup }])),
    installedDirs,
  };
}

function rollback(createdPaths, backups, overwrittenPaths) {
  for (const p of createdPaths.slice().reverse()) {
    try {
      const stat = fs.lstatSync(p);
      if (stat.isDirectory()) {
        fs.rmdirSync(p);
      } else {
        fs.rmSync(p, { force: true });
      }
    } catch (e) {
      /* best effort */
    }
  }
  for (const entry of overwrittenPaths.slice().reverse()) {
    try {
      atomicWriteFile(entry.target, entry.content, {
        dirLabel: 'rollback target dir',
        tempLabel: 'rollback temp file',
        targetLabel: 'rollback target file',
      });
      if (typeof entry.mode === 'number') {
        fs.chmodSync(entry.target, entry.mode);
      }
    } catch (e) {
      /* best effort */
    }
  }
  for (const b of backups) {
    try {
      if (b.backupExisted) {
        assertSafePath(path.dirname(b.backup), 'backup dir');
        fs.mkdirSync(path.dirname(b.backup), { recursive: true });
        assertSafePath(b.backup, 'backup file', { allowNonDirectoryTarget: true });
        fs.writeFileSync(b.backup, b.backupContent, { mode: b.backupMode });
        if (typeof b.backupMode === 'number') {
          fs.chmodSync(b.backup, b.backupMode);
        }
      } else {
        fs.rmSync(b.backup, { force: true });
      }
    } catch (e) {
      /* best effort */
    }
  }
}

function capturePathState(targetPath) {
  try {
    assertSafePath(targetPath, 'transaction snapshot path', { allowNonDirectoryTarget: true });
    const stat = fs.lstatSync(targetPath);
    if (stat.isDirectory()) {
      return { path: targetPath, exists: true, type: 'dir', mode: stat.mode };
    }
    if (stat.isFile()) {
      return { path: targetPath, exists: true, type: 'file', content: fs.readFileSync(targetPath), mode: stat.mode };
    }
    return { path: targetPath, exists: true, type: 'other' };
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
      return { path: targetPath, exists: false };
    }
    throw e;
  }
}

function restoreAbsentPath(targetPath) {
  try {
    assertSafePath(targetPath, 'transaction rollback path', { allowNonDirectoryTarget: true });
    const stat = fs.lstatSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmdirSync(targetPath);
    } else {
      fs.rmSync(targetPath, { force: true });
    }
  } catch (e) {
    /* best effort */
  }
}

function restorePathState(snapshot) {
  try {
    if (!snapshot.exists) {
      restoreAbsentPath(snapshot.path);
      return;
    }
    if (snapshot.type === 'dir') {
      assertSafePath(snapshot.path, 'transaction rollback dir');
      fs.mkdirSync(snapshot.path, { recursive: true });
      if (typeof snapshot.mode === 'number') {
        fs.chmodSync(snapshot.path, snapshot.mode);
      }
      return;
    }
    if (snapshot.type === 'file') {
      atomicWriteFile(snapshot.path, snapshot.content, {
        dirLabel: 'transaction rollback file dir',
        tempLabel: 'transaction rollback temp file',
        targetLabel: 'transaction rollback file',
      });
      if (typeof snapshot.mode === 'number') {
        fs.chmodSync(snapshot.path, snapshot.mode);
      }
    }
  } catch (e) {
    /* best effort */
  }
}

function capturePlatformSnapshot({ platform, skillsRoot, xskRoot, skills }) {
  const seen = new Set();
  const paths = [];
  const platformBackupDir = path.join(xskRoot, 'install', 'backups', platform);
  const add = (targetPath) => {
    if (!seen.has(targetPath)) {
      seen.add(targetPath);
      paths.push(targetPath);
    }
  };
  add(xskRoot);
  add(path.join(xskRoot, 'manifests'));
  add(manifestPath(platform, { xskRoot }));
  add(path.join(xskRoot, 'install'));
  add(path.join(xskRoot, 'install', 'backups'));
  add(path.join(xskRoot, 'install', 'backups', platform));
  add(skillsRoot);
  for (const skill of skills) {
    const skillDir = path.join(skillsRoot, skill.name);
    add(skillDir);
    add(path.join(skillDir, 'SKILL.md'));
    add(path.join(skillDir, MARKER));
    add(path.join(xskRoot, 'install', 'backups', platform, `${skill.name}.SKILL.md.bak`));
  }
  // Cover the prior manifest's owned paths too, so an uninstall-first reset of
  // skills no longer in the install set can still be rolled back on failure.
  let prior = null;
  try {
    prior = read(platform, { xskRoot });
  } catch (e) {
    prior = null;
  }
  if (prior && typeof prior === 'object') {
    const priorPaths = Array.isArray(prior.installed_paths) ? prior.installed_paths : [];
    for (const p of priorPaths) {
      if (!isInsideDir(p, skillsRoot)) {
        continue;
      }
      add(p);
      const base = path.basename(p);
      if (base === 'SKILL.md' || base === MARKER) {
        add(path.dirname(p));
      }
    }
    const priorBackups = Array.isArray(prior.backups) ? prior.backups : [];
    for (const b of priorBackups) {
      if (b && typeof b.backup === 'string' && isInsideDir(b.backup, platformBackupDir)) {
        add(b.backup);
      }
      if (b && typeof b.target === 'string') {
        if (!isInsideDir(b.target, skillsRoot)) {
          continue;
        }
        add(b.target);
        add(path.dirname(b.target));
      }
    }
  }
  return paths.map((p) => capturePathState(p));
}

function restorePlatformSnapshot(snapshot) {
  for (const entry of snapshot.slice().reverse()) {
    restorePathState(entry);
  }
}

function installPlatform({ platform, skillsRoot, xskRoot, version, skills }) {
  const manifest = create(platform, version);
  const installed = [];
  const backups = [];
  const installedHashes = [];
  const rollbackBackups = [];
  const previousState = previousInstallState(platform, xskRoot);
  const backupsByTarget = previousState.backupsByTarget;
  const backupDir = path.join(xskRoot, 'install', 'backups', platform);
  const createdThisRun = [];
  const overwrittenThisRun = [];

  try {
    ensurePlatformRoot(skillsRoot);
    for (const skill of skills) {
      const built = buildSkill(skill);
      const skillDir = path.join(skillsRoot, skill.name);
      const skillFile = path.join(skillDir, 'SKILL.md');
      const markerFile = path.join(skillDir, MARKER);
      const skillDirExisted = fs.existsSync(skillDir);

      ensureSkillDir(skillDir);
      if (!skillDirExisted) {
        createdThisRun.push(skillDir);
      }
      assertNotSymlink(skillFile, 'skill file');
      assertNotSymlink(markerFile, 'marker file');
      const skillFileExisted = fs.existsSync(skillFile);
      const markerFileExisted = fs.existsSync(markerFile);
      let existingSkillContent = null;
      let existingMarkerContent = null;

      if (skillFileExisted) {
        const stat = fs.statSync(skillFile);
        existingSkillContent = fs.readFileSync(skillFile);
        overwrittenThisRun.push({ target: skillFile, content: existingSkillContent, mode: stat.mode });
      }
      if (markerFileExisted) {
        const stat = fs.statSync(markerFile);
        existingMarkerContent = fs.readFileSync(markerFile);
        overwrittenThisRun.push({ target: markerFile, content: existingMarkerContent, mode: stat.mode });
      }
      if (
        markerFileExisted &&
        Buffer.compare(existingMarkerContent, Buffer.from(`${PACKAGE_NAME}\n`, 'utf8')) !== 0
      ) {
        throw new Error(`refusing to overwrite invalid ownership marker: ${markerFile}`);
      }

      if (
        skillFileExisted &&
        markerFileExisted &&
        Buffer.compare(existingSkillContent, Buffer.from(built.content, 'utf8')) !== 0
      ) {
        throw new Error(`refusing to overwrite user-edited owned skill: ${skillFile}`);
      }

      if (fs.existsSync(skillFile) && !fs.existsSync(markerFile)) {
        const previousBackup = backupsByTarget.get(skillFile);
        if (previousBackup) {
          if (Buffer.compare(existingSkillContent, Buffer.from(built.content, 'utf8')) !== 0) {
            throw new Error(`refusing to overwrite drifted user-edited skill: ${skillFile}`);
          }
          assertReusableBackupRecord(previousBackup, backupDir);
        } else {
          assertSafePath(backupDir, 'backup dir');
          fs.mkdirSync(backupDir, { recursive: true });
          const backup = path.join(backupDir, `${skill.name}.SKILL.md.bak`);
          let backupExisted = false;
          let backupContent = null;
          let backupMode = null;
          assertSafePath(backup, 'backup file', { allowNonDirectoryTarget: true });
          if (fs.existsSync(backup)) {
            const stat = fs.lstatSync(backup);
            if (!stat.isFile()) {
              throw new Error(`refusing to overwrite non-file backup: ${backup}`);
            }
            backupExisted = true;
            backupContent = fs.readFileSync(backup);
            backupMode = stat.mode;
          }
          fs.copyFileSync(skillFile, backup);
          const backupRecord = { target: skillFile, backup };
          backupsByTarget.set(skillFile, backupRecord);
          rollbackBackups.push({
            target: skillFile,
            backup,
            backupExisted,
            backupContent,
            backupMode,
          });
        }
      }

      writeGeneratedFile(skillFile, built.content, 'skill file');
      if (!skillFileExisted) {
        createdThisRun.push(skillFile);
      }
      installedHashes.push({ target: skillFile, sha256: contentSha256(built.content) });
      writeGeneratedFile(markerFile, `${PACKAGE_NAME}\n`, 'marker file');
      if (!markerFileExisted) {
        createdThisRun.push(markerFile);
      }

      if (!skillDirExisted || (previousState.installedDirs.has(skillDir) && markerFileExisted)) {
        installed.push(skillDir);
      }
      installed.push(skillFile, markerFile);
      const backup = backupsByTarget.get(skillFile);
      if (backup) {
        assertReusableBackupRecord(backup, backupDir);
        backups.push({ target: backup.target, backup: backup.backup });
      }
    }

    manifest.installed_paths = installed;
    manifest.backups = backups;
    manifest.installed_hashes = installedHashes;
    write(platform, manifest, { xskRoot });
    return { platform, installed, backups, manifest };
  } catch (err) {
    rollback(createdThisRun, rollbackBackups, overwrittenThisRun);
    throw err;
  }
}

function install(options) {
  const opts = options || {};
  const selectedPlatforms = opts.platforms || ALL_PLATFORMS;
  const xskRoot = opts.xskRoot || path.join(os.homedir(), '.xsk');
  const version = opts.version || packageVersion();
  const skillsToInstall = opts.skills || ALL_SKILLS;

  const summary = { platforms: {} };
  const snapshots = [];
  try {
    for (const platform of selectedPlatforms) {
      const skillsRoot = rootFor(platform, opts.platformRoots);
      const applicable = skillsToInstall.filter((s) => s.platforms.includes(platform));
      if (applicable.length === 0) {
        summary.platforms[platform] = { platform, installed: [], backups: [], manifest: null, skipped: true };
        continue;
      }
      // Snapshot the full platform state (including the prior manifest's owned
      // paths) before any mutation, so the uninstall-first reset and the
      // install roll back together on any failure.
      const snapshot = capturePlatformSnapshot({ platform, skillsRoot, xskRoot, skills: applicable });
      snapshots.push(snapshot);

      // Uninstall-first: remove the prior owned state before regenerating, so a
      // plain `xsk install` is a full reinstall with no manual uninstall and no
      // orphaned files (skills no longer installed are pruned here). uninstall
      // removes every cleanly-owned file and restores displaced user backups; a
      // partial reset is tolerated, because installPlatform then handles any
      // retained skill in place -- re-adopting a marker-less generated file, or
      // refusing to overwrite a user-edited owned skill (which rolls back). An
      // invalid prior manifest is the one case we refuse outright.
      const reset = uninstallPlatform({ platform, xskRoot, skillsRoot });
      if (reset.invalid) {
        throw new Error(`refusing to reinstall ${platform}: existing manifest is invalid; uninstall or fix it first`);
      }

      summary.platforms[platform] = installPlatform({
        platform,
        skillsRoot,
        xskRoot,
        version,
        skills: applicable,
      });
    }
  } catch (err) {
    for (const snapshot of snapshots.slice().reverse()) {
      restorePlatformSnapshot(snapshot);
    }
    throw err;
  }
  return summary;
}

module.exports = {
  install,
  installPlatform,
  atomicWriteFile,
  rootFor,
  PACKAGE_NAME,
  MARKER,
  ALL_PLATFORMS,
};

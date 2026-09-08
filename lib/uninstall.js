'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  read,
  write,
  validate,
  validateOperationalSemantics,
  create,
  defaultXskRoot,
  removeManifest,
  manifestPath,
  atomicWriteFile,
  assertSafePath,
  isInsideDir,
  isSafePath,
} = require('./manifest');
const { get } = require('./skills');
const { buildSkill } = require('./generator');
const {
  MARKER,
  PACKAGE_NAME,
  isSymlink,
  hasUnsafeSkillPath,
  hasValidMarker,
  hasFileContent,
  safeBackupForSkill,
} = require('./ownership');
const { contentSha256 } = require('./content-hash');

const PARTIAL_EXIT = 2;
const FAILURE_EXIT = 1;

function generatedContentFor(skillName) {
  const skill = get(skillName);
  if (!skill) return null;
  try {
    return buildSkill(skill).content;
  } catch (e) {
    return null;
  }
}

function classifyPaths(installedPaths) {
  const skillDirs = new Set();
  for (const p of installedPaths) {
    const base = path.basename(p);
    if (base === 'SKILL.md' || base === MARKER) {
      skillDirs.add(path.dirname(p));
    } else {
      skillDirs.add(p);
    }
  }
  return [...skillDirs];
}

function restoreOwnershipMarker(markerFile) {
  atomicWriteFile(markerFile, `${PACKAGE_NAME}\n`, {
    dirLabel: 'marker dir',
    tempLabel: 'marker temp file',
    targetLabel: 'marker file',
  });
}

function installedHashByTarget(manifest) {
  const records = Array.isArray(manifest.installed_hashes) ? manifest.installed_hashes : [];
  return new Map(records.map((r) => [r.target, r.sha256]));
}

function retainedInstalledHashes(manifest, retainedPaths) {
  const retained = new Set(retainedPaths);
  return (Array.isArray(manifest.installed_hashes) ? manifest.installed_hashes : [])
    .filter((r) => retained.has(r.target))
    .map((r) => ({ target: r.target, sha256: r.sha256 }));
}

function appendError(current, message) {
  return current ? `${current}; ${message}` : message;
}

function validateBackupTargets(backups, skillDirs, skillsRoot) {
  const skillFiles = new Set(skillDirs.map((skillDir) => path.join(skillDir, 'SKILL.md')));
  const seenTargets = new Set();
  for (const backup of backups) {
    if (seenTargets.has(backup.target)) {
      return { valid: false, reason: `duplicate backup target: ${backup.target}` };
    }
    seenTargets.add(backup.target);
    if (!isInsideDir(backup.target, skillsRoot)) {
      return { valid: false, reason: `backup target escapes platform root: ${backup.target}` };
    }
    if (path.basename(backup.target) !== 'SKILL.md') {
      return { valid: false, reason: `backup target is not a skill file: ${backup.target}` };
    }
    if (!skillFiles.has(backup.target)) {
      return { valid: false, reason: `backup target is not installed: ${backup.target}` };
    }
  }
  return { valid: true };
}

function capturePathState(targetPath) {
  try {
    const stat = fs.lstatSync(targetPath);
    if (stat.isDirectory()) {
      return { exists: true, type: 'directory', mode: stat.mode };
    }
    if (stat.isSymbolicLink()) {
      return { exists: true, type: 'symlink', link: fs.readlinkSync(targetPath) };
    }
    if (stat.isFile()) {
      return { exists: true, type: 'file', content: fs.readFileSync(targetPath), mode: stat.mode };
    }
    return { exists: true, type: 'other' };
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
      return { exists: false };
    }
    throw e;
  }
}

// Rollback restore re-runs the same path-safety walk install/uninstall use
// everywhere else. The capture-to-restore window is fully synchronous, but a
// guarded delete/create here keeps the documented "no symlink traversal or
// removal" invariant true even if an ancestor were swapped under us: it fails
// closed (rollback reports an error) rather than following a symlink out of the
// owned roots. allowNonDirectoryTarget lets the target itself be a regular file
// (the common case); a symlinked target or any symlinked ancestor still throws.
function removePathForRestore(targetPath) {
  assertSafePath(targetPath, 'rollback restore target', { allowNonDirectoryTarget: true });
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function ensureRestoreParent(targetPath) {
  const dir = path.dirname(targetPath);
  assertSafePath(dir, 'rollback restore dir');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  assertSafePath(dir, 'rollback restore dir');
}

function restorePathState(targetPath, state) {
  if (!state.exists) {
    removePathForRestore(targetPath);
    return;
  }
  if (state.type === 'directory') {
    if (fs.existsSync(targetPath) && !fs.lstatSync(targetPath).isDirectory()) {
      removePathForRestore(targetPath);
    }
    assertSafePath(targetPath, 'rollback restore dir');
    fs.mkdirSync(targetPath, { recursive: true, mode: state.mode });
    fs.chmodSync(targetPath, state.mode);
    return;
  }
  if (state.type === 'file') {
    // A captured backup may still be the only complete copy after copy failure.
    // Leave matching content in place and stage any required replacement.
    if (!hasFileContent(targetPath, state.content)) {
      atomicWriteFile(targetPath, state.content, {
        dirLabel: 'rollback restore dir',
        tempLabel: 'rollback restore temp file',
        targetLabel: 'rollback restore file',
      });
    }
    fs.chmodSync(targetPath, state.mode);
    return;
  }
  removePathForRestore(targetPath);
  ensureRestoreParent(targetPath);
  if (state.type === 'symlink') {
    assertSafePath(targetPath, 'rollback restore symlink', { allowNonDirectoryTarget: true });
    fs.symlinkSync(state.link, targetPath);
    return;
  }
}

function createRollbackJournal() {
  const states = new Map();
  const backupTargets = new Map();
  return {
    capture(targetPath, options) {
      const opts = options || {};
      if (opts.backupTarget) backupTargets.set(targetPath, opts.backupTarget);
      if (!states.has(targetPath)) {
        states.set(targetPath, capturePathState(targetPath));
      }
    },
    restore() {
      const entries = [...states.entries()].reverse();
      const errors = [];
      const preserve = new Set();
      for (const [targetPath, state] of entries) {
        if (preserve.has(targetPath)) {
          errors.push(new Error(`preserved ${targetPath}: its backup could not be recovered`));
          continue;
        }
        try {
          restorePathState(targetPath, state);
        } catch (e) {
          errors.push(new Error(`${targetPath}: ${e.message}`, { cause: e }));
          const backupTarget = backupTargets.get(targetPath);
          if (backupTarget && !hasFileContent(targetPath, state.content)) preserve.add(backupTarget);
        }
      }
      if (errors.length > 0) throw new AggregateError(errors, errors.map((e) => e.message).join('; '));
    },
  };
}

function uninstallPlatform({ platform, xskRoot, skillsRoot, commandsRoot }) {
  // Lazy require avoids a load-time cycle (install.js requires uninstall.js).
  const { isCommandFilePath } = require('./install');
  let manifest;
  try {
    manifest = read(platform, { xskRoot });
  } catch (e) {
    return {
      platform,
      invalid: true,
      removed: [],
      restored: [],
      retained: [],
      skipped: [],
      refused: [],
      partial: false,
      error: `manifest for ${platform} is not valid JSON: ${e.message}`,
      exitCode: FAILURE_EXIT,
    };
  }

  if (!manifest) {
    return {
      platform,
      nothingInstalled: true,
      removed: [],
      restored: [],
      retained: [],
      skipped: [],
      refused: [],
      partial: false,
      exitCode: 0,
    };
  }

  if (!validate(manifest, { expectedPlatform: platform })) {
    return {
      platform,
      invalid: true,
      removed: [],
      restored: [],
      retained: [],
      skipped: [],
      refused: [],
      partial: false,
      error: `manifest for ${platform} failed shape validation; refusing to uninstall`,
      exitCode: FAILURE_EXIT,
    };
  }

  const sem = validateOperationalSemantics({ platform, skillsRoot, commandsRoot, manifest });
  if (!sem.valid) {
    return {
      platform,
      invalid: true,
      removed: [],
      restored: [],
      retained: [],
      skipped: [],
      refused: [],
      partial: false,
      error: sem.reason,
      exitCode: FAILURE_EXIT,
    };
  }

  const backups = manifest.backups || [];
  // Command files are flat, markerless `.md` files outside skillsRoot. Filter
  // them out before classifyPaths / ownedDirs / validateBackupTargets so a flat
  // command path is never synthesized into a <cmd>.md/SKILL.md skill triple.
  const commandPaths = manifest.installed_paths.filter((p) => isCommandFilePath(p));
  const skillInstalledPaths = manifest.installed_paths.filter((p) => !isCommandFilePath(p));
  const skillDirs = classifyPaths(skillInstalledPaths);
  const backupTargets = validateBackupTargets(backups, skillDirs, skillsRoot);
  if (!backupTargets.valid) {
    return {
      platform,
      invalid: true,
      removed: [],
      restored: [],
      retained: [],
      skipped: [],
      refused: [],
      partial: false,
      error: backupTargets.reason,
      exitCode: FAILURE_EXIT,
    };
  }

  const removed = [];
  const restored = [];
  const retainedFiles = [];
  const retainedMarkers = [];
  const retainedDirs = [];
  const retainedBackups = [];
  const skipped = [];
  const refused = [];
  const installedHashes = installedHashByTarget(manifest);
  const rollbackJournal = createRollbackJournal();
  let partial = false;
  let error = null;
  const manifestPaths = new Set(manifest.installed_paths);

  const retainedCommands = [];
  const ownedDirs = new Set(
    skillInstalledPaths.filter((p) => {
      const base = path.basename(p);
      return base !== 'SKILL.md' && base !== MARKER;
    }),
  );
  for (const skillDir of skillDirs) {
    const skillName = path.basename(skillDir);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const markerFile = path.join(skillDir, MARKER);
    const skillRollbackJournal = createRollbackJournal();
    const captureSkillMutation = (targetPath, options) => {
      rollbackJournal.capture(targetPath, options);
      skillRollbackJournal.capture(targetPath, options);
    };
    const removedBefore = removed.length;
    const restoredBefore = restored.length;
    let operation = 'skill inspection';
    try {
      const backupState = safeBackupForSkill(backups, skillFile, xskRoot, platform, skillsRoot);
      const pathUnsafe = hasUnsafeSkillPath(skillDir, skillFile, markerFile);
      const markerInvalid = !pathUnsafe && fs.existsSync(markerFile) && !hasValidMarker(markerFile);

      if (
        pathUnsafe ||
        markerInvalid ||
        backupState.unsafe
      ) {
        refused.push(skillDir);
        if (pathUnsafe) {
          if (ownedDirs.has(skillDir)) {
            retainedDirs.push(skillDir);
          }
          if (manifestPaths.has(skillFile)) {
            retainedFiles.push(skillFile);
          }
          if (manifestPaths.has(markerFile)) {
            retainedMarkers.push(markerFile);
          }
          if (backupState.backup) {
            retainedBackups.push(backupState.backup);
          }
        } else {
          if (ownedDirs.has(skillDir) && fs.existsSync(skillDir)) {
            retainedDirs.push(skillDir);
          }
          if ((backupState.unsafe || markerInvalid) && fs.existsSync(skillFile)) {
            retainedFiles.push(skillFile);
          }
          if ((backupState.unsafe || markerInvalid) && fs.existsSync(markerFile)) {
            retainedMarkers.push(markerFile);
          }
          if (backupState.backup) {
            retainedBackups.push(backupState.backup);
          }
        }
        partial = true;
        continue;
      }

      if (backupState.missing) {
        refused.push(skillDir);
        if (ownedDirs.has(skillDir) && fs.existsSync(skillDir)) {
          retainedDirs.push(skillDir);
        }
        if (fs.existsSync(skillFile)) {
          retainedFiles.push(skillFile);
        }
        if (fs.existsSync(markerFile)) {
          retainedMarkers.push(markerFile);
        }
        retainedBackups.push(backupState.backup);
        partial = true;
        continue;
      }

      if (!fs.existsSync(markerFile)) {
        const retainedDir = ownedDirs.has(skillDir) && fs.existsSync(skillDir);
        const retainedFile = fs.existsSync(skillFile);
        const bk = backupState.backup;
        skipped.push(skillDir);
        if (retainedDir) {
          retainedDirs.push(skillDir);
        }
        if (retainedFile) {
          retainedFiles.push(skillFile);
        }
        if (retainedDir || retainedFile || bk) {
          retainedMarkers.push(markerFile);
          if (bk) {
            retainedBackups.push(bk);
          }
          partial = true;
        }
        continue;
      }

      const fileExists = fs.existsSync(skillFile);
      let fileModified = false;
      if (fileExists) {
        const onDisk = fs.readFileSync(skillFile);
        const installedHash = installedHashes.get(skillFile);
        if (installedHash) {
          fileModified = contentSha256(onDisk) !== installedHash;
        } else {
          const gen = generatedContentFor(skillName);
          fileModified = gen === null ? true : onDisk.toString('utf8') !== gen;
        }
      }

      if (!fileExists || !fileModified) {
        let removedSkillFile = false;
        if (fileExists) {
          captureSkillMutation(skillFile);
          operation = 'skill removal';
          fs.rmSync(skillFile, { force: true });
          removedSkillFile = true;
        }
        const bk = backupState.backup;
        let restoredBackup = false;
        if (bk && fs.existsSync(bk.backup)) {
          captureSkillMutation(bk.target);
          captureSkillMutation(bk.backup, { backupTarget: bk.target });
          operation = 'backup restore';
          fs.mkdirSync(path.dirname(bk.target), { recursive: true });
          fs.copyFileSync(bk.backup, bk.target);
          operation = 'backup cleanup';
          fs.rmSync(bk.backup, { force: true });
          restoredBackup = true;
          restored.push(bk.target);
        }
        if (removedSkillFile) removed.push(skillFile);

        // Restoring a displaced file returns its directory to the user, even if
        // reinstall recreated and recorded that directory in the meantime.
        let markerRemoved = false;
        if (fs.existsSync(markerFile)) {
          captureSkillMutation(markerFile);
          operation = 'marker removal';
          fs.rmSync(markerFile, { force: true });
          markerRemoved = true;
        }
        if (ownedDirs.has(skillDir) && !restoredBackup) {
          operation = 'directory removal';
          try {
            captureSkillMutation(skillDir);
            fs.rmdirSync(skillDir);
            if (markerRemoved) removed.push(markerFile);
            removed.push(skillDir);
          } catch (e) {
            if (e.code !== 'ENOTEMPTY' && e.code !== 'EEXIST') throw e;
            // Unrecorded user files still prevent removal of an owned directory.
            if (markerRemoved) {
              restoreOwnershipMarker(markerFile);
              retainedMarkers.push(markerFile);
            }
            retainedDirs.push(skillDir);
            partial = true;
          }
        } else if (markerRemoved) {
          removed.push(markerFile);
        }
      } else {
        if (ownedDirs.has(skillDir)) {
          retainedDirs.push(skillDir);
        }
        retainedFiles.push(skillFile);
        retainedMarkers.push(markerFile);
        const bk = backupState.backup;
        if (bk) {
          retainedBackups.push(bk);
        }
        partial = true;
      }
    } catch (e) {
      partial = true;
      error = appendError(error, `${operation} failed for ${skillDir}: ${e.message}`);
      try {
        skillRollbackJournal.restore();
      } catch (rollbackErr) {
        error = appendError(error, `rollback failed: ${rollbackErr.message}`);
      }
      removed.length = removedBefore;
      restored.length = restoredBefore;
      // Keep the original records, even if rollback could not recreate a path.
      // Its absence must stay visible and retryable, not lose its provenance.
      if (ownedDirs.has(skillDir)) retainedDirs.push(skillDir);
      if (manifestPaths.has(skillFile)) retainedFiles.push(skillFile);
      if (manifestPaths.has(markerFile)) retainedMarkers.push(markerFile);
      retainedBackups.push(...backups.filter((b) => b.target === skillFile));
    }
  }

  // Dedicated command-file pass: remove a hash-matched (owned) command file,
  // retain a hash-mismatched (user-edited) one, and prune command files for
  // skills no longer installed. Command files carry no marker and no backup, so
  // ownership rests solely on the recorded installed_hashes content match.
  for (const commandPath of commandPaths) {
    const commandRollbackJournal = createRollbackJournal();
    try {
      if (!isSafePath(commandPath, 'command file', { allowNonDirectoryTarget: true })) {
        refused.push(commandPath);
        retainedCommands.push(commandPath);
        partial = true;
        continue;
      }
      let stat = null;
      try {
        stat = fs.lstatSync(commandPath);
      } catch (e) {
        if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
          stat = null;
        } else {
          throw e;
        }
      }
      if (stat === null) {
        // Already gone: drop it from the manifest (nothing to remove or retain).
        continue;
      }
      if (!stat.isFile()) {
        refused.push(commandPath);
        retainedCommands.push(commandPath);
        partial = true;
        continue;
      }
      const recordedHash = installedHashes.get(commandPath);
      const onDisk = fs.readFileSync(commandPath);
      const owned = Boolean(recordedHash) && contentSha256(onDisk) === recordedHash;
      if (!owned) {
        retainedCommands.push(commandPath);
        partial = true;
        continue;
      }
      rollbackJournal.capture(commandPath);
      commandRollbackJournal.capture(commandPath);
      fs.rmSync(commandPath, { force: true });
      removed.push(commandPath);
    } catch (e) {
      partial = true;
      retainedCommands.push(commandPath);
      error = appendError(error, `command removal failed for ${commandPath}: ${e.message}`);
      try {
        commandRollbackJournal.restore();
      } catch (rollbackErr) {
        error = appendError(error, `rollback failed: ${rollbackErr.message}`);
      }
    }
  }

  const retainedPaths = [...retainedDirs, ...retainedFiles, ...retainedMarkers, ...retainedCommands];
  let narrowed = null;
  if (retainedPaths.length > 0 || retainedBackups.length > 0) {
    narrowed = create(platform, manifest.version);
    narrowed.installed_paths = retainedPaths;
    narrowed.backups = retainedBackups;
    narrowed.installed_hashes = retainedInstalledHashes(manifest, [...retainedFiles, ...retainedCommands]);
  }
  try {
    rollbackJournal.capture(manifestPath(platform, { xskRoot }));
    if (narrowed) {
      write(platform, narrowed, { xskRoot });
    } else {
      removeManifest(platform, { xskRoot });
    }
  } catch (e) {
    partial = true;
    error = appendError(error, `manifest ${narrowed ? 'write' : 'removal'} failed: ${e.message}`);
    narrowed = manifest;
    try {
      rollbackJournal.restore();
    } catch (rollbackErr) {
      error = appendError(error, `rollback failed: ${rollbackErr.message}`);
    }
    // A rollback may have undone these operations; do not claim them as done.
    removed.length = 0;
    restored.length = 0;
  }

  const result = {
    platform,
    removed,
    restored,
    retained: [...retainedFiles, ...retainedCommands],
    skipped,
    refused,
    partial,
    manifest: narrowed,
    exitCode: partial ? PARTIAL_EXIT : 0,
  };
  if (error) {
    result.error = error;
  }
  return result;
}

function uninstall(options) {
  const opts = options || {};
  const platforms = opts.platforms || ['claude', 'codex', 'opencode', 'gemini'];
  const xskRoot = opts.xskRoot || defaultXskRoot();
  const { rootFor, commandsRootFor } = require('./install');

  const summary = { platforms: {} };
  let exitCode = 0;
  for (const platform of platforms) {
    const skillsRoot = rootFor(platform, opts.platformRoots);
    const commandsRoot = commandsRootFor(platform, opts.platformCommandsRoots);
    const res = uninstallPlatform({ platform, xskRoot, skillsRoot, commandsRoot });
    summary.platforms[platform] = res;
    if (res.exitCode > exitCode) {
      exitCode = res.exitCode;
    }
  }
  summary.exitCode = exitCode;
  return summary;
}

module.exports = {
  uninstall,
  uninstallPlatform,
  classifyPaths,
  generatedContentFor,
  removePathForRestore,
  restorePathState,
  isSymlink,
  safeBackupForSkill,
  PARTIAL_EXIT,
  FAILURE_EXIT,
};

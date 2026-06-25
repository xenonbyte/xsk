'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  read,
  write,
  validate,
  create,
  defaultXskRoot,
  isSafePath,
  isInsideDir,
  removeManifest,
  atomicWriteFile,
} = require('./manifest');
const { get } = require('./skills');
const { buildSkill } = require('./generator');
const { MARKER, PACKAGE_NAME } = require('./install');

const PARTIAL_EXIT = 2;
const FAILURE_EXIT = 1;

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch (e) {
    return false;
  }
}

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

function isExistingNonRegularFile(p) {
  try {
    return !fs.lstatSync(p).isFile();
  } catch (e) {
    if (e && e.code === 'ENOENT') return false;
    throw e;
  }
}

function hasUnsafeSkillPath(skillDir, skillFile, markerFile) {
  return (
    !isSafePath(skillDir, 'skill dir') ||
    !isSafePath(skillFile, 'skill file', { allowNonDirectoryTarget: true }) ||
    !isSafePath(markerFile, 'marker file', { allowNonDirectoryTarget: true }) ||
    isExistingNonRegularFile(skillFile) ||
    isExistingNonRegularFile(markerFile)
  );
}

function hasValidMarker(markerFile) {
  try {
    return fs.readFileSync(markerFile, 'utf8') === `${PACKAGE_NAME}\n`;
  } catch (e) {
    return false;
  }
}

function restoreOwnershipMarker(markerFile) {
  try {
    atomicWriteFile(markerFile, `${PACKAGE_NAME}\n`, {
      dirLabel: 'marker dir',
      tempLabel: 'marker temp file',
      targetLabel: 'marker file',
    });
    return true;
  } catch (e) {
    return false;
  }
}

function safeBackupForSkill(backups, skillFile, xskRoot, platform) {
  const backup = backups.find((b) => b.target === skillFile);
  if (!backup) return { backup: null, unsafe: false, missing: false };

  const expectedDir = path.join(xskRoot, 'install', 'backups', platform);
  const backupPath = path.resolve(backup.backup);
  if (!isInsideDir(backupPath, expectedDir)) {
    return { backup, unsafe: true, missing: false };
  }
  if (!isSafePath(expectedDir, 'backup dir') || !isSafePath(backupPath, 'backup file', { allowNonDirectoryTarget: true })) {
    return { backup, unsafe: true, missing: false };
  }
  if (!fs.existsSync(backupPath)) {
    return { backup, unsafe: false, missing: true };
  }
  const stat = fs.lstatSync(backupPath);
  if (!stat.isFile()) {
    return { backup, unsafe: true, missing: false };
  }
  return { backup, unsafe: false, missing: false };
}

function uninstallPlatform({ platform, xskRoot }) {
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

  const backups = manifest.backups || [];
  const removed = [];
  const restored = [];
  const retainedFiles = [];
  const retainedMarkers = [];
  const retainedDirs = [];
  const retainedBackups = [];
  const skipped = [];
  const refused = [];
  let partial = false;

  const ownedDirs = new Set(
    manifest.installed_paths.filter((p) => {
      const base = path.basename(p);
      return base !== 'SKILL.md' && base !== MARKER;
    }),
  );
  const skillDirs = classifyPaths(manifest.installed_paths);

  for (const skillDir of skillDirs) {
    const skillName = path.basename(skillDir);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const markerFile = path.join(skillDir, MARKER);
    const backupState = safeBackupForSkill(backups, skillFile, xskRoot, platform);
    const pathUnsafe = hasUnsafeSkillPath(skillDir, skillFile, markerFile);
    const markerInvalid = !pathUnsafe && fs.existsSync(markerFile) && !hasValidMarker(markerFile);

    if (
      pathUnsafe ||
      markerInvalid ||
      backupState.unsafe
    ) {
      refused.push(skillDir);
      if (pathUnsafe) {
        retainedDirs.push(skillDir);
        if (backupState.backup) {
          retainedBackups.push(backupState.backup);
        }
      } else {
        if (fs.existsSync(skillDir)) {
          retainedDirs.push(skillDir);
        }
        if ((backupState.unsafe || markerInvalid) && fs.existsSync(skillFile)) {
          retainedFiles.push(skillFile);
        }
        if ((backupState.unsafe || markerInvalid) && fs.existsSync(markerFile)) {
          retainedMarkers.push(markerFile);
        }
        if (backupState.unsafe && backupState.backup) {
          retainedBackups.push(backupState.backup);
        }
      }
      partial = true;
      continue;
    }

    if (backupState.missing) {
      refused.push(skillDir);
      if (fs.existsSync(skillDir)) {
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
      const gen = generatedContentFor(skillName);
      const onDisk = fs.readFileSync(skillFile, 'utf8');
      fileModified = gen === null ? true : onDisk !== gen;
    }

    if (!fileExists || !fileModified) {
      if (fileExists) {
        fs.rmSync(skillFile, { force: true });
        removed.push(skillFile);
      }
      const bk = backupState.backup;
      if (bk && fs.existsSync(bk.backup)) {
        fs.mkdirSync(path.dirname(bk.target), { recursive: true });
        fs.copyFileSync(bk.backup, bk.target);
        restored.push(bk.target);
        try {
          fs.rmSync(bk.backup, { force: true });
        } catch (e) {
          /* best effort */
        }
      }
      if (ownedDirs.has(skillDir)) {
        let markerRemoved = false;
        if (fs.existsSync(markerFile)) {
          fs.rmSync(markerFile, { force: true });
          markerRemoved = true;
        }
        try {
          fs.rmdirSync(skillDir);
          if (markerRemoved) {
            removed.push(markerFile);
          }
          removed.push(skillDir);
        } catch (e) {
          if (fs.existsSync(skillDir)) {
            if (markerRemoved && restoreOwnershipMarker(markerFile)) {
              retainedMarkers.push(markerFile);
            }
            retainedDirs.push(skillDir);
            partial = true;
          } else if (markerRemoved) {
            removed.push(markerFile);
          }
        }
      } else if (fs.existsSync(markerFile)) {
        fs.rmSync(markerFile, { force: true });
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
  }

  const retainedPaths = [...retainedDirs, ...retainedFiles, ...retainedMarkers];
  let narrowed = null;
  if (retainedPaths.length > 0 || retainedBackups.length > 0) {
    narrowed = create(platform, manifest.version);
    narrowed.installed_paths = retainedPaths;
    narrowed.backups = retainedBackups;
    write(platform, narrowed, { xskRoot });
  } else {
    try {
      removeManifest(platform, { xskRoot });
    } catch (e) {
      /* best effort */
    }
  }

  return {
    platform,
    removed,
    restored,
    retained: retainedFiles,
    skipped,
    refused,
    partial,
    manifest: narrowed,
    exitCode: partial ? PARTIAL_EXIT : 0,
  };
}

function uninstall(options) {
  const opts = options || {};
  const platforms = opts.platforms || ['claude', 'codex', 'opencode', 'gemini'];
  const xskRoot = opts.xskRoot || defaultXskRoot();

  const summary = { platforms: {} };
  let exitCode = 0;
  for (const platform of platforms) {
    const res = uninstallPlatform({ platform, xskRoot });
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
  isSymlink,
  safeBackupForSkill,
  PARTIAL_EXIT,
  FAILURE_EXIT,
};

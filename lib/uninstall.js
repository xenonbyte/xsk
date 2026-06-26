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
  atomicWriteFile,
} = require('./manifest');
const { get } = require('./skills');
const { buildSkill } = require('./generator');
const {
  MARKER,
  PACKAGE_NAME,
  isSymlink,
  hasUnsafeSkillPath,
  hasValidMarker,
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

function uninstallPlatform({ platform, xskRoot, skillsRoot }) {
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

  const sem = validateOperationalSemantics({ platform, skillsRoot, manifest });
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
  const removed = [];
  const restored = [];
  const retainedFiles = [];
  const retainedMarkers = [];
  const retainedDirs = [];
  const retainedBackups = [];
  const skipped = [];
  const refused = [];
  const installedHashes = installedHashByTarget(manifest);
  let partial = false;
  let error = null;

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
        if (ownedDirs.has(skillDir) && fs.existsSync(skillDir)) {
          retainedDirs.push(skillDir);
        }
        if (fs.existsSync(skillFile)) {
          retainedFiles.push(skillFile);
        }
        if (fs.existsSync(markerFile)) {
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
    narrowed.installed_hashes = retainedInstalledHashes(manifest, retainedFiles);
    write(platform, narrowed, { xskRoot });
  } else {
    try {
      removeManifest(platform, { xskRoot });
    } catch (e) {
      partial = true;
      narrowed = manifest;
      error = `manifest removal failed: ${e.message}`;
    }
  }

  const result = {
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
  if (error) {
    result.error = error;
  }
  return result;
}

function uninstall(options) {
  const opts = options || {};
  const platforms = opts.platforms || ['claude', 'codex', 'opencode', 'gemini'];
  const xskRoot = opts.xskRoot || defaultXskRoot();
  const { rootFor } = require('./install');

  const summary = { platforms: {} };
  let exitCode = 0;
  for (const platform of platforms) {
    const skillsRoot = rootFor(platform, opts.platformRoots);
    const res = uninstallPlatform({ platform, xskRoot, skillsRoot });
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

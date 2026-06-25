'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { read, write, validate, create, manifestPath, defaultXskRoot } = require('./manifest');
const { get } = require('./skills');
const { buildSkill } = require('./generator');
const { MARKER } = require('./install');

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

    if (isSymlink(skillDir) || isSymlink(skillFile) || isSymlink(markerFile)) {
      refused.push(skillDir);
      retainedDirs.push(skillDir);
      partial = true;
      continue;
    }

    if (!fs.existsSync(markerFile)) {
      skipped.push(skillDir);
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
      const bk = backups.find((b) => b.target === skillFile);
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
      if (fs.existsSync(markerFile)) {
        fs.rmSync(markerFile, { force: true });
        removed.push(markerFile);
      }
      try {
        fs.rmdirSync(skillDir);
        removed.push(skillDir);
      } catch (e) {
        if (fs.existsSync(skillDir) && ownedDirs.has(skillDir)) {
          retainedDirs.push(skillDir);
          partial = true;
        }
      }
    } else {
      retainedDirs.push(skillDir);
      retainedFiles.push(skillFile);
      retainedMarkers.push(markerFile);
      const bk = backups.find((b) => b.target === skillFile);
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
      fs.rmSync(manifestPath(platform, { xskRoot }), { force: true });
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
  PARTIAL_EXIT,
  FAILURE_EXIT,
};

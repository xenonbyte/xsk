'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { read, validate, defaultXskRoot, isSafePath, isInsideDir, validateOperationalSemantics } = require('./manifest');
const { ALL_PLATFORMS, MARKER, rootFor, commandsRootFor } = require('./install');

const STATES = ['not-installed', 'ok', 'drift', 'invalid'];

function expectedInstalledPathType(p) {
  const base = path.basename(p);
  if (base === 'SKILL.md' || base === MARKER) {
    return 'file';
  }
  // A flat command file (commandsRoot/<name>.md) is an expected regular file, so
  // a missing or no-longer-a-file command path reports drift.
  if (base.endsWith('.md')) {
    return 'file';
  }
  return 'directory';
}

function recordedPathEntries(manifest) {
  const installed = Array.isArray(manifest.installed_paths)
    ? manifest.installed_paths.map((p) => ({ path: p, expectedType: expectedInstalledPathType(p) }))
    : [];
  const backups = Array.isArray(manifest.backups)
    ? manifest.backups.map((b) => ({ path: b.backup, target: b.target, expectedType: 'file', kind: 'backup' }))
    : [];
  return installed.concat(backups);
}

function recordedPaths(manifest) {
  return recordedPathEntries(manifest).map((entry) => entry.path);
}

function pathType(p) {
  try {
    const stat = fs.lstatSync(p);
    if (stat.isFile()) return 'file';
    if (stat.isDirectory()) return 'directory';
    return 'other';
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return 'missing';
    throw e;
  }
}

function recordedPathHasDrift(entry, options) {
  const opts = options || {};
  const exists = opts.exists || ((p) => fs.existsSync(p));
  const safe = opts.safe || (() => true);
  const typeOf = opts.typeOf || null;
  if (!safe(entry.path, entry)) return true;
  if (!exists(entry.path, entry)) return true;
  if (typeOf && typeOf(entry.path, entry) !== entry.expectedType) return true;
  return false;
}

function missingRecordedPaths(manifest, options) {
  const opts = options || {};
  return recordedPathEntries(manifest)
    .filter((entry) => recordedPathHasDrift(entry, opts))
    .map((entry) => entry.path);
}

function statusOf(manifest, options) {
  const opts = options || {};
  if (!manifest) return 'not-installed';
  if (!validate(manifest, { expectedPlatform: opts.expectedPlatform })) return 'invalid';
  const exists = opts.exists || ((p) => fs.existsSync(p));
  const safe = opts.safe || (() => true);
  const typeOf = opts.typeOf || null;
  const paths = recordedPaths(manifest);
  if (paths.length === 0) return 'ok';
  return missingRecordedPaths(manifest, { exists, safe, typeOf }).length === 0 ? 'ok' : 'drift';
}

function computeStatus(options) {
  const opts = options || {};
  const platforms = opts.platforms || ALL_PLATFORMS;
  const xskRoot = opts.xskRoot || defaultXskRoot();

  const result = { platforms: {} };
  for (const platform of platforms) {
    let manifest = null;
    let readError = null;
    try {
      manifest = read(platform, { xskRoot });
    } catch (e) {
      readError = e;
    }

    if (readError) {
      result.platforms[platform] = {
        state: 'invalid',
        reason: `manifest is not valid JSON: ${readError.message}`,
      };
      continue;
    }

    if (!manifest) {
      result.platforms[platform] = { state: 'not-installed' };
      continue;
    }

    let skillsRoot = null;
    if (validate(manifest, { expectedPlatform: platform })) {
      skillsRoot = rootFor(platform, opts.platformRoots);
      const commandsRoot = commandsRootFor(platform, opts.platformCommandsRoots);
      const semantics = validateOperationalSemantics({ platform, skillsRoot, commandsRoot, manifest });
      if (!semantics.valid) {
        result.platforms[platform] = { state: 'invalid', reason: semantics.reason };
        continue;
      }
    }

    const exists = (p) => fs.existsSync(p);
    const backupRoot = path.join(xskRoot, 'install', 'backups', platform);
    const safe = (p, entry) => isSafePath(p, 'status recorded path', {
      allowNonDirectoryTarget: entry.expectedType !== 'directory',
    }) && (
      entry.kind !== 'backup' ||
      (
        isInsideDir(entry.target, skillsRoot) &&
        isInsideDir(p, backupRoot) &&
        isSafePath(backupRoot, 'status backup dir') &&
        isSafePath(p, 'status backup file', { allowNonDirectoryTarget: true })
      )
    );
    const state = statusOf(manifest, { expectedPlatform: platform, exists, safe, typeOf: pathType });
    const entry = { state };
    if (state === 'drift') {
      entry.missing = missingRecordedPaths(manifest, { exists, safe, typeOf: pathType });
    }
    if (state === 'ok' || state === 'drift') {
      entry.installedCount = (manifest.installed_paths || []).filter(
        (p) => p.endsWith('SKILL.md'),
      ).length;
      entry.version = manifest.version;
    }
    result.platforms[platform] = entry;
  }
  return result;
}

function render(result, options) {
  const opts = options || {};
  if (opts.json) {
    return JSON.stringify(result, null, 2);
  }
  const lines = [];
  const order = opts.platforms || Object.keys(result.platforms);
  for (const platform of order) {
    const entry = result.platforms[platform];
    if (!entry) continue;
    let line = `${platform}: ${entry.state}`;
    if (entry.installedCount !== undefined) {
      line += ` (${entry.installedCount} skill${entry.installedCount === 1 ? '' : 's'})`;
    }
    if (entry.version) {
      line += ` v${entry.version}`;
    }
    if (entry.missing && entry.missing.length) {
      line += `; ${entry.missing.length} recorded path(s) missing`;
    }
    if (entry.reason) {
      line += ` - ${entry.reason}`;
    }
    lines.push(line);
  }
  return lines.join('\n');
}

module.exports = { statusOf, computeStatus, render, STATES };

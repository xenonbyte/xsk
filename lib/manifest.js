'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const SCHEMA_VERSION = 1;
const REQUIRED_FIELDS = [
  'schema_version',
  'platform',
  'version',
  'installed_at',
  'installed_paths',
  'backups',
];
const ATOMIC_WRITE_ATTEMPTS = 10;

function defaultXskRoot() {
  return path.join(os.homedir(), '.xsk');
}

function manifestPath(platform, options) {
  const opts = options || {};
  const root = opts.xskRoot || defaultXskRoot();
  return path.join(root, 'manifests', `${platform}.manifest`);
}

function pathSegments(targetPath) {
  const segments = [];
  let current = path.resolve(targetPath);
  while (true) {
    segments.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return segments.reverse();
}

function assertSafePath(targetPath, label, options) {
  const opts = options || {};
  const target = path.resolve(targetPath);
  for (const segment of pathSegments(target)) {
    let stat;
    try {
      stat = fs.lstatSync(segment);
    } catch (e) {
      if (e && e.code === 'ENOENT') continue;
      throw e;
    }
    const parent = path.dirname(segment);
    const isTopLevel = parent === path.dirname(parent);
    if (stat.isSymbolicLink() && isTopLevel) {
      continue;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`refusing to operate through symlinked ${label}: ${segment}`);
    }
    const isTarget = segment === target;
    if (!stat.isDirectory() && !(isTarget && opts.allowNonDirectoryTarget)) {
      throw new Error(`refusing to operate through non-directory ${label} ancestor: ${segment}`);
    }
  }
}

function isSafePath(targetPath, label, options) {
  try {
    assertSafePath(targetPath, label, options);
    return true;
  } catch (e) {
    return false;
  }
}

function isInsideDir(child, parent) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function atomicWriteFile(targetPath, content, options) {
  const opts = options || {};
  const basename = path.basename(targetPath);
  const dir = path.dirname(targetPath);
  const dirLabel = opts.dirLabel || 'atomic write dir';
  const tempLabel = opts.tempLabel || 'atomic temp file';
  const targetLabel = opts.targetLabel || 'atomic target file';
  const flags =
    fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    (fs.constants.O_NOFOLLOW || 0);
  let tmp = null;
  let fd = null;

  assertSafePath(dir, dirLabel);
  fs.mkdirSync(dir, { recursive: true });
  assertSafePath(dir, dirLabel);

  try {
    for (let attempt = 0; attempt < ATOMIC_WRITE_ATTEMPTS; attempt += 1) {
      const suffix = crypto.randomBytes(8).toString('hex');
      const candidate = path.join(dir, `.${basename}.tmp-${process.pid}-${suffix}`);
      try {
        assertSafePath(candidate, tempLabel, { allowNonDirectoryTarget: true });
        fd = fs.openSync(candidate, flags, 0o666);
        tmp = candidate;
        break;
      } catch (e) {
        if (e && e.code === 'EEXIST') {
          continue;
        }
        throw e;
      }
    }
    if (fd === null || tmp === null) {
      throw new Error(`unable to create exclusive temp file for ${targetPath}`);
    }

    fs.writeFileSync(fd, content);
    fs.closeSync(fd);
    fd = null;
    assertSafePath(targetPath, targetLabel, { allowNonDirectoryTarget: true });
    fs.renameSync(tmp, targetPath);
    tmp = null;
  } catch (e) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (closeErr) {
        /* best effort */
      }
    }
    if (tmp !== null) {
      try {
        fs.rmSync(tmp, { force: true });
      } catch (cleanupErr) {
        /* best effort */
      }
    }
    throw e;
  }
}

function validate(manifest, options) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return false;
  }
  for (const f of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(manifest, f)) {
      return false;
    }
  }
  if (manifest.schema_version !== SCHEMA_VERSION) {
    return false;
  }
  if (typeof manifest.platform !== 'string' || manifest.platform.length === 0) {
    return false;
  }
  const opts = options || {};
  if (opts.expectedPlatform && manifest.platform !== opts.expectedPlatform) {
    return false;
  }
  if (typeof manifest.version !== 'string') {
    return false;
  }
  if (typeof manifest.installed_at !== 'string' || manifest.installed_at.length === 0) {
    return false;
  }
  if (!Array.isArray(manifest.installed_paths)) {
    return false;
  }
  for (const p of manifest.installed_paths) {
    if (typeof p !== 'string' || p.length === 0) {
      return false;
    }
  }
  if (!Array.isArray(manifest.backups)) {
    return false;
  }
  for (const b of manifest.backups) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) {
      return false;
    }
    if (typeof b.target !== 'string' || typeof b.backup !== 'string') {
      return false;
    }
  }
  return true;
}

function create(platform, version, partial) {
  const p = partial || {};
  return {
    schema_version: SCHEMA_VERSION,
    platform,
    version,
    installed_at: p.installed_at || new Date().toISOString(),
    installed_paths: Array.isArray(p.installed_paths) ? p.installed_paths.slice() : [],
    backups: Array.isArray(p.backups) ? p.backups.map((b) => ({ target: b.target, backup: b.backup })) : [],
  };
}

function read(platform, options) {
  const p = manifestPath(platform, options);
  assertSafePath(path.dirname(p), 'manifest dir');
  if (!fs.existsSync(p)) {
    return null;
  }
  assertSafePath(p, 'manifest file', { allowNonDirectoryTarget: true });
  const data = fs.readFileSync(p, 'utf8');
  return JSON.parse(data);
}

function write(platform, manifest, options) {
  const p = manifestPath(platform, options);
  const dir = path.dirname(p);
  assertSafePath(dir, 'manifest dir');
  fs.mkdirSync(dir, { recursive: true });
  assertSafePath(dir, 'manifest dir');
  const payload = JSON.stringify(manifest, null, 2) + '\n';
  atomicWriteFile(p, payload, {
    dirLabel: 'manifest dir',
    tempLabel: 'manifest temp file',
    targetLabel: 'manifest file',
  });
  assertSafePath(p, 'manifest file', { allowNonDirectoryTarget: true });
  return p;
}

function removeManifest(platform, options) {
  const p = manifestPath(platform, options);
  assertSafePath(p, 'manifest file', { allowNonDirectoryTarget: true });
  fs.rmSync(p, { force: true });
  return p;
}

module.exports = {
  SCHEMA_VERSION,
  REQUIRED_FIELDS,
  validate,
  create,
  read,
  write,
  manifestPath,
  defaultXskRoot,
  assertSafePath,
  isSafePath,
  isInsideDir,
  atomicWriteFile,
  removeManifest,
};

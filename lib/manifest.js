'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const REQUIRED_FIELDS = [
  'schema_version',
  'platform',
  'version',
  'installed_at',
  'installed_paths',
  'backups',
];

function defaultXskRoot() {
  return path.join(os.homedir(), '.xsk');
}

function manifestPath(platform, options) {
  const opts = options || {};
  const root = opts.xskRoot || defaultXskRoot();
  return path.join(root, 'manifests', `${platform}.manifest`);
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
  if (!fs.existsSync(p)) {
    return null;
  }
  const data = fs.readFileSync(p, 'utf8');
  return JSON.parse(data);
}

function write(platform, manifest, options) {
  const p = manifestPath(platform, options);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const payload = JSON.stringify(manifest, null, 2) + '\n';
  fs.writeFileSync(p, payload);
  return p;
}

module.exports = { SCHEMA_VERSION, REQUIRED_FIELDS, validate, create, read, write, manifestPath, defaultXskRoot };

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { read, validate, defaultXskRoot, isSafePath } = require('./manifest');
const { rootFor, ALL_PLATFORMS } = require('./install');

const REQUIRED_NODE_MAJOR = 20;

function nodeMajor() {
  return Number.parseInt(String(process.versions.node).split('.')[0], 10) || 0;
}

function isWritableDir(dir) {
  try {
    if (!isSafePath(dir, 'skill dir')) return false;
    if (fs.existsSync(dir)) {
      const stat = fs.lstatSync(dir);
      if (stat.isSymbolicLink() || !stat.isDirectory()) return false;
      fs.accessSync(dir, fs.constants.W_OK);
      return true;
    }
    let p = dir;
    while (p && p !== path.dirname(p) && !fs.existsSync(p)) {
      p = path.dirname(p);
    }
    if (!p) return false;
    const stat = fs.lstatSync(p);
    if (stat.isSymbolicLink() || !stat.isDirectory()) return false;
    fs.accessSync(p, fs.constants.W_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function doctor(options) {
  const opts = options || {};
  const platforms = opts.platforms || ALL_PLATFORMS;
  const xskRoot = opts.xskRoot || defaultXskRoot();

  const checks = [];

  checks.push({
    name: 'node-version',
    label: `Node >= ${REQUIRED_NODE_MAJOR}`,
    pass: nodeMajor() >= REQUIRED_NODE_MAJOR,
    detail: `running Node ${process.versions.node}`,
  });

  for (const platform of platforms) {
    let root;
    try {
      root = rootFor(platform, opts.platformRoots);
    } catch (e) {
      checks.push({
        name: `writable-${platform}`,
        label: `${platform} skill dir writable`,
        pass: false,
        detail: `could not resolve skill dir: ${e.message}`,
      });
      continue;
    }
    checks.push({
      name: `writable-${platform}`,
      label: `${platform} skill dir writable (${root})`,
      pass: isWritableDir(root),
      detail: isWritableDir(root) ? 'writable or creatable' : 'not writable',
    });
  }

  let invalidManifests = 0;
  let checkedManifests = 0;
  for (const platform of platforms) {
    let manifest = null;
    try {
      manifest = read(platform, { xskRoot });
    } catch (e) {
      invalidManifests += 1;
      checkedManifests += 1;
      continue;
    }
    if (manifest) {
      checkedManifests += 1;
      if (!validate(manifest, { expectedPlatform: platform })) {
        invalidManifests += 1;
      }
    }
  }
  const manifestPass = invalidManifests === 0;
  checks.push({
    name: 'manifest-valid',
    label: 'manifests valid',
    pass: manifestPass,
    detail:
      checkedManifests === 0
        ? 'no manifests present'
        : invalidManifests === 0
          ? `${checkedManifests} manifest(s) valid`
          : `${invalidManifests} of ${checkedManifests} manifest(s) invalid`,
  });

  const allPass = checks.every((c) => c.pass);
  return { checks, allPass };
}

function render(result, options) {
  const opts = options || {};
  if (opts.json) {
    return JSON.stringify(result, null, 2);
  }
  const lines = [];
  for (const c of result.checks) {
    lines.push(`[${c.pass ? 'PASS' : 'FAIL'}] ${c.label} - ${c.detail}`);
  }
  lines.push(result.allPass ? 'doctor: all checks passed' : 'doctor: one or more checks failed');
  return lines.join('\n');
}

module.exports = { doctor, render, nodeMajor, isWritableDir, REQUIRED_NODE_MAJOR };

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { defaultXskRoot, isSafePath } = require('./manifest');
const { rootFor, commandsRootFor, ALL_PLATFORMS } = require('./install');
const { computeStatus } = require('./status');

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

  const writableXskRoot = isWritableDir(xskRoot);
  checks.push({
    name: 'writable-xsk-root',
    label: `~/.xsk writable (${xskRoot})`,
    pass: writableXskRoot,
    detail: writableXskRoot ? 'writable or creatable' : 'not writable',
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

    let commandsRoot;
    try {
      commandsRoot = commandsRootFor(platform, opts.platformCommandsRoots);
    } catch (e) {
      checks.push({
        name: `writable-${platform}-commands`,
        label: `${platform} commands dir writable`,
        pass: false,
        detail: `could not resolve commands dir: ${e.message}`,
      });
      continue;
    }
    if (commandsRoot) {
      const writableCommandsRoot = isWritableDir(commandsRoot);
      checks.push({
        name: `writable-${platform}-commands`,
        label: `${platform} commands dir writable (${commandsRoot})`,
        pass: writableCommandsRoot,
        detail: writableCommandsRoot ? 'writable or creatable' : 'not writable',
      });
    }
  }

  const status = computeStatus({
    platforms,
    xskRoot,
    platformRoots: opts.platformRoots,
    platformCommandsRoots: opts.platformCommandsRoots,
  });
  let checkedManifests = 0;
  let invalidManifests = 0;
  let driftedManifests = 0;
  for (const platform of platforms) {
    const entry = status.platforms[platform];
    if (!entry || entry.state === 'not-installed') continue;
    checkedManifests += 1;
    if (entry.state === 'invalid') {
      invalidManifests += 1;
    } else if (entry.state === 'drift') {
      driftedManifests += 1;
    }
  }
  const manifestPass = invalidManifests === 0 && driftedManifests === 0;
  checks.push({
    name: 'manifest-valid',
    label: 'manifests valid',
    pass: manifestPass,
    detail:
      checkedManifests === 0
        ? 'no manifests present'
        : manifestPass
          ? `${checkedManifests} manifest(s) valid`
          : `${invalidManifests} invalid, ${driftedManifests} drifted of ${checkedManifests} manifest(s)`,
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

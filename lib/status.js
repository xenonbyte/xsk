'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { read, validate, defaultXskRoot } = require('./manifest');
const { rootFor, ALL_PLATFORMS } = require('./install');

const STATES = ['not-installed', 'ok', 'drift', 'invalid'];

function statusOf(manifest, options) {
  const opts = options || {};
  if (!manifest) return 'not-installed';
  if (!validate(manifest, { expectedPlatform: opts.expectedPlatform })) return 'invalid';
  const exists = opts.exists || ((p) => fs.existsSync(p));
  const paths = Array.isArray(manifest.installed_paths) ? manifest.installed_paths : [];
  if (paths.length === 0) return 'ok';
  return paths.every((p) => exists(p)) ? 'ok' : 'drift';
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

    const state = statusOf(manifest, { expectedPlatform: platform });
    const entry = { state };
    if (state === 'drift') {
      const exists = (p) => fs.existsSync(p);
      entry.missing = (manifest.installed_paths || []).filter((p) => !exists(p));
    }
    if (state !== 'not-installed') {
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
      line += ` — ${entry.reason}`;
    }
    lines.push(line);
  }
  return lines.join('\n');
}

module.exports = { statusOf, computeStatus, render, STATES };

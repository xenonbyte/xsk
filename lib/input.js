'use strict';

const ALL_PLATFORMS = ['claude', 'codex', 'opencode', 'gemini'];
const VALID_PLATFORMS = new Set(ALL_PLATFORMS);
const COMMANDS = new Set(['install', 'uninstall', 'status', 'doctor', 'version', 'help']);
const ALLOWED_OPTIONS = {
  version: new Set(),
  help: new Set(),
  install: new Set(['--platform']),
  uninstall: new Set(['--platform']),
  status: new Set(['--platform', '--json']),
  doctor: new Set(['--platform', '--json']),
};

function parsePlatforms(rawValue) {
  const parts = String(rawValue)
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) {
    throw new Error('--platform requires at least one platform');
  }
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    if (!VALID_PLATFORMS.has(p)) {
      throw new Error(`unknown platform: ${p}`);
    }
    if (seen.has(p)) {
      throw new Error(`duplicate platform: ${p}`);
    }
    seen.add(p);
    out.push(p);
  }
  return out;
}

function parse(argv) {
  const args = Array.isArray(argv) ? argv.slice() : [];
  const result = { command: null, platforms: ALL_PLATFORMS.slice(), json: false };

  if (args.length === 0) {
    result.command = 'help';
    return result;
  }

  const first = args[0];

  if (first === '-v' || first === '--version') {
    result.command = 'version';
  } else if (first === '-h' || first === '--help') {
    result.command = 'help';
  } else if (!COMMANDS.has(first)) {
    throw new Error(`unknown command or option: ${first}`);
  } else {
    result.command = first;
  }

  const allowed = ALLOWED_OPTIONS[result.command];
  const rest = args.slice(1);
  let i = 0;
  while (i < rest.length) {
    const tok = rest[i];
    if (tok === '--json') {
      if (!allowed.has('--json')) {
        throw new Error(`unknown or not-allowed option for ${result.command}: ${tok}`);
      }
      result.json = true;
      i += 1;
    } else if (tok === '--platform') {
      if (!allowed.has('--platform')) {
        throw new Error(`unknown or not-allowed option for ${result.command}: ${tok}`);
      }
      if (i + 1 >= rest.length) {
        throw new Error('--platform requires a value');
      }
      result.platforms = parsePlatforms(rest[i + 1]);
      i += 2;
    } else if (tok.startsWith('--platform=')) {
      if (!allowed.has('--platform')) {
        throw new Error(`unknown or not-allowed option for ${result.command}: --platform`);
      }
      result.platforms = parsePlatforms(tok.slice('--platform='.length));
      i += 1;
    } else {
      throw new Error(`unknown option: ${tok}`);
    }
  }

  return result;
}

module.exports = { parse, ALL_PLATFORMS };

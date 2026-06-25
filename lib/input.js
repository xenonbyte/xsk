'use strict';

const ALL_PLATFORMS = ['claude', 'codex', 'opencode', 'gemini'];
const VALID_PLATFORMS = new Set(ALL_PLATFORMS);
const COMMANDS = new Set(['install', 'uninstall', 'status', 'doctor', 'version', 'help']);

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
    if (args.length > 1) {
      throw new Error('unexpected arguments after version');
    }
    result.command = 'version';
    return result;
  }

  if (first === '-h' || first === '--help') {
    if (args.length > 1) {
      throw new Error('unexpected arguments after help');
    }
    result.command = 'help';
    return result;
  }

  if (!COMMANDS.has(first)) {
    throw new Error(`unknown command or option: ${first}`);
  }
  result.command = first;

  const rest = args.slice(1);
  let i = 0;
  while (i < rest.length) {
    const tok = rest[i];
    if (tok === '--json') {
      result.json = true;
      i += 1;
    } else if (tok === '--platform') {
      if (i + 1 >= rest.length) {
        throw new Error('--platform requires a value');
      }
      result.platforms = parsePlatforms(rest[i + 1]);
      i += 2;
    } else if (tok.startsWith('--platform=')) {
      result.platforms = parsePlatforms(tok.slice('--platform='.length));
      i += 1;
    } else {
      throw new Error(`unknown option: ${tok}`);
    }
  }

  return result;
}

module.exports = { parse, ALL_PLATFORMS };

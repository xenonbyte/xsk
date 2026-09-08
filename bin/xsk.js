#!/usr/bin/env node
'use strict';

const { parse } = require('../lib/input');
const { install, isCommandFilePath } = require('../lib/install');
const { uninstall } = require('../lib/uninstall');
const { computeStatus, render: renderStatus } = require('../lib/status');
const { doctor, render: renderDoctor } = require('../lib/capability');

const VERSION = require('../package.json').version;

const HELP = `xsk ${VERSION} - agent skill aggregator

Usage:
  xsk <command> [options]

Commands:
  install [--platform <list>]   Generate and install skills (uninstall-first: a
                               reinstall resets prior owned files, no manual
                               uninstall needed). --platform is comma-separated,
                               defaults to all four platforms.
  uninstall [--platform <list>] Remove only the manifest-recorded generated files.
  status [--platform <list>] [--json]
                               Read-only per-platform report: ok, drift, invalid,
                               or not-installed.
  doctor [--platform <list>] [--json]
                               Probe Node version, target-dir writability, and
                               manifest validity. Pass/fail per check.
  version                       Print the xsk version (also --version / -v).
  help                          Print this help (also --help / -h, and on no args).

Platforms: claude, codex, opencode, gemini.

Unknown options fail loud with a non-zero exit.
`;

function formatInstall(summary) {
  const lines = [];
  for (const platform of Object.keys(summary.platforms)) {
    const r = summary.platforms[platform];
    if (r.skipped) {
      lines.push(`${platform}: no applicable skills (skipped)`);
      continue;
    }
    const skillCount = (r.installed || []).filter((p) => p.endsWith('SKILL.md')).length;
    const commandCount = (r.installed || []).filter((p) => isCommandFilePath(p)).length;
    const backCount = (r.backups || []).length;
    let line = `${platform}: installed ${skillCount} skill${skillCount === 1 ? '' : 's'}`;
    if (commandCount > 0) {
      line += `; installed ${commandCount} command${commandCount === 1 ? '' : 's'}`;
    }
    if (backCount > 0) {
      line += `; backed up ${backCount} displaced file${backCount === 1 ? '' : 's'}`;
    }
    lines.push(line);
  }
  return lines.join('\n') + '\n';
}

function formatUninstall(summary) {
  const lines = [];
  for (const platform of Object.keys(summary.platforms)) {
    const r = summary.platforms[platform];
    if (r.nothingInstalled) {
      lines.push(`${platform}: nothing installed`);
      continue;
    }
    if (r.invalid) {
      lines.push(`${platform}: manifest invalid - ${r.error}`);
      continue;
    }
    const removedCount = (r.removed || []).filter((p) => p.endsWith('SKILL.md')).length;
    const removedCommandCount = (r.removed || []).filter((p) => isCommandFilePath(p)).length;
    const restoredCount = (r.restored || []).length;
    const retainedCount = (r.retained || []).length;
    let line = `${platform}: removed ${removedCount} skill${removedCount === 1 ? '' : 's'}`;
    if (removedCommandCount > 0) {
      line += `; removed ${removedCommandCount} command${removedCommandCount === 1 ? '' : 's'}`;
    }
    if (restoredCount > 0) {
      line += `, restored ${restoredCount} displaced file${restoredCount === 1 ? '' : 's'}`;
    }
    if (r.partial) {
      line += `; retained ${retainedCount} file${retainedCount === 1 ? '' : 's'} (partial)`;
    }
    if ((r.skipped || []).length) {
      line += `; skipped ${(r.skipped || []).length} unowned dir(s)`;
    }
    if ((r.refused || []).length) {
      line += `; refused ${(r.refused || []).length} path(s)`;
    }
    if (r.partial && r.error) {
      line += ` - ${r.error}`;
    }
    lines.push(line);
  }
  return lines.join('\n') + '\n';
}

function main(argv, options) {
  const opts = options || {};
  const out = opts.stdout || process.stdout;
  const err = opts.stderr || process.stderr;

  let parsed;
  try {
    parsed = parse(argv);
  } catch (e) {
    err.write(`xsk: ${e.message}\n`);
    return 1;
  }

  const dispatchOptions = {
    platformRoots: opts.platformRoots,
    platformCommandsRoots: opts.platformCommandsRoots,
    xskRoot: opts.xskRoot,
  };

  switch (parsed.command) {
    case 'version':
      out.write(`${VERSION}\n`);
      return 0;
    case 'help':
      out.write(HELP);
      return 0;
    case 'install': {
      try {
        const summary = install(
          Object.assign({ platforms: parsed.platforms }, dispatchOptions),
        );
        out.write(formatInstall(summary));
        return 0;
      } catch (e) {
        err.write(`xsk install failed: ${e.message}\n`);
        return 1;
      }
    }
    case 'uninstall': {
      let summary;
      try {
        summary = uninstall(
          Object.assign({ platforms: parsed.platforms }, dispatchOptions),
        );
      } catch (e) {
        err.write(`xsk uninstall failed: ${e.message}\n`);
        return 1;
      }
      out.write(formatUninstall(summary));
      return summary.exitCode;
    }
    case 'status': {
      const result = computeStatus(
        Object.assign({ platforms: parsed.platforms }, dispatchOptions),
      );
      out.write(renderStatus(result, { json: parsed.json, platforms: parsed.platforms }) + '\n');
      return 0;
    }
    case 'doctor': {
      const result = doctor(
        Object.assign({ platforms: parsed.platforms }, dispatchOptions),
      );
      out.write(renderDoctor(result, { json: parsed.json }) + '\n');
      return result.allPass ? 0 : 1;
    }
    default:
      err.write(`xsk: unknown command\n`);
      return 1;
  }
}

module.exports = { main, HELP, VERSION, formatInstall, formatUninstall };

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

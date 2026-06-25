'use strict';

// The machine-checkable self-conformance floor (REQUIREMENTS.md section 4.3 / 12).
// xsk is itself an agent-skill project and must conform to its own scaffold standard.
// This test enforces the executable parts; the full audit remains the scaffold
// skill's judgment.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const { main } = require('../bin/xsk');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => /^#{1,6}\s/.test(l))
    .map((l) => l.trim());
}

function capture() {
  let out = '';
  let err = '';
  return {
    stdout: { write: (s) => { out += s; return true; } },
    stderr: { write: (s) => { err += s; return true; } },
    out: () => out,
    err: () => err,
  };
}

function cliFixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-self-conf-'));
  return {
    home,
    xskRoot: path.join(home, '.xsk'),
    platformRoots: {
      claude: path.join(home, 'claude-skills'),
      codex: path.join(home, 'codex-skills'),
      opencode: path.join(home, 'opencode-skills'),
      gemini: path.join(home, 'gemini-skills'),
    },
  };
}

test('self-conformance: the five core CLI commands resolve without crashing', () => {
  const fixture = cliFixture();
  const commands = ['version', 'help', 'status', 'doctor', 'uninstall'];
  try {
    for (const cmd of commands) {
      const s = capture();
      const code = main([cmd], {
        stdout: s.stdout,
        stderr: s.stderr,
        xskRoot: fixture.xskRoot,
        platformRoots: fixture.platformRoots,
      });
      assert.ok([0, 1, 2].includes(code), `${cmd} resolved (exit ${code})`);
    }
    // install resolves end-to-end against fixture roots
    const s = capture();
    const code = main(['install', '--platform', 'claude'], {
      stdout: s.stdout,
      stderr: s.stderr,
      xskRoot: fixture.xskRoot,
      platformRoots: fixture.platformRoots,
    });
    assert.strictEqual(code, 0, 'install resolved');
    // clean up the fixture install through the public command first
    main(['uninstall', '--platform', 'claude'], {
      stdout: s.stdout,
      stderr: s.stderr,
      xskRoot: fixture.xskRoot,
      platformRoots: fixture.platformRoots,
    });
  } finally {
    fs.rmSync(fixture.home, { recursive: true, force: true });
  }
});

test('self-conformance: CLI fixture roots are never under the repository root', () => {
  const source = fs.readFileSync(__filename, 'utf8');
  const forbidden = 'path.join(ROOT, ' + "'." + 'self-conf-tmp';
  assert.ok(!source.includes(forbidden), 'CLI fixture roots must use fs.mkdtempSync under os.tmpdir()');
  assert.ok(source.includes('fs.mkdtempSync(path.join(os.tmpdir()'), 'CLI fixture roots come from os.tmpdir()');
});

test('self-conformance: install/uninstall/status/doctor are the documented command surface', () => {
  const help = read('README.md');
  for (const cmd of ['install', 'uninstall', 'status', 'doctor', 'version', 'help']) {
    assert.ok(help.includes(cmd), `README documents ${cmd}`);
  }
});

test('self-conformance: EN and CN README headings match', () => {
  assert.deepStrictEqual(headings(read('README.md')), headings(read('README.zh-CN.md')));
});

test('self-conformance: lib/manifest.js and LICENSE exist', () => {
  assert.ok(exists('lib/manifest.js'), 'lib/manifest.js exists');
  assert.ok(exists('LICENSE'), 'LICENSE exists');
});

test('self-conformance: package.json carries the required fields', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.strictEqual(pkg.name, '@xenonbyte/xsk');
  assert.ok(pkg.version, 'version present');
  assert.ok(pkg.license, 'license present');
  assert.ok(pkg.bin && pkg.bin.xsk, 'bin.xsk present');
  assert.strictEqual(pkg.engines.node, '>=20', 'engines.node >=20');
  assert.ok(pkg.scripts && pkg.scripts.test, 'scripts.test present');
  assert.ok(pkg.scripts && pkg.scripts.syntaxcheck, 'scripts.syntaxcheck present');
  assert.deepStrictEqual(pkg.dependencies || {}, {}, 'zero runtime dependencies');
});

test('self-conformance: npm pack --dry-run includes sources and excludes dev/test paths', () => {
  const raw = execSync('npm pack --dry-run --json', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  const files = JSON.parse(raw)[0].files.map((f) => f.path);

  const required = [
    'package.json', 'LICENSE', 'README.md', 'README.zh-CN.md',
    'bin/xsk.js',
    'lib/input.js', 'lib/skills.js', 'lib/generator.js', 'lib/install.js',
    'lib/uninstall.js', 'lib/manifest.js', 'lib/status.js', 'lib/capability.js',
    'lib/adapters/claude.js', 'lib/adapters/codex.js', 'lib/adapters/opencode.js',
    'lib/adapters/gemini.js',
    'shared/skill-common.md', 'templates/skill.md.tmpl',
    'skills/think/SKILL.md', 'skills/bypass-claude/SKILL.md',
    'skills/skill-scaffold/SKILL.md', 'skills/write-req/SKILL.md', 'skills/archive-req/SKILL.md',
  ];
  for (const r of required) {
    assert.ok(files.includes(r), `package includes ${r}`);
  }

  const excluded = files.filter((f) =>
    f.startsWith('test/') ||
    f.startsWith('.req-to-plan') ||
    f.startsWith('.drfx') ||
    f.startsWith('.claude/') ||
    f.startsWith('.codegraph') ||
    f === 'docs/REQUIREMENTS.md' ||
    f.includes('fixtures/golden'),
  );
  assert.deepStrictEqual(excluded, [], 'no dev/test/tooling paths are packed');
});

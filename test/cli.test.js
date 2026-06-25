'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { main, VERSION } = require('../bin/xsk');

function streams() {
  let out = '';
  let err = '';
  return {
    stdout: { write: (s) => { out += s; return true; } },
    stderr: { write: (s) => { err += s; return true; } },
    getOut: () => out,
    getErr: () => err,
  };
}

function fixtureOpts() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-cli-'));
  return {
    home,
    platformRoots: {
      claude: path.join(home, 'claude-skills'),
      codex: path.join(home, 'agents-skills'),
      opencode: path.join(home, 'opencode-skills'),
      gemini: path.join(home, 'gemini-skills'),
    },
    xskRoot: path.join(home, '.xsk'),
  };
}

test('cli: version command prints package version', () => {
  const s = streams();
  const code = main(['version'], { stdout: s.stdout, stderr: s.stderr });
  assert.strictEqual(code, 0);
  assert.strictEqual(s.getOut().trim(), VERSION);
});

test('cli: -v and --version shortcuts print package version', () => {
  for (const argv of [['-v'], ['--version']]) {
    const s = streams();
    assert.strictEqual(main(argv, { stdout: s.stdout, stderr: s.stderr }), 0);
    assert.strictEqual(s.getOut().trim(), VERSION);
  }
});

test('cli: help / -h / --help / no-args print the command list', () => {
  for (const argv of [[], ['help'], ['-h'], ['--help']]) {
    const s = streams();
    assert.strictEqual(main(argv, { stdout: s.stdout, stderr: s.stderr }), 0);
    const out = s.getOut();
    assert.ok(/install/.test(out), 'help mentions install');
    assert.ok(/uninstall/.test(out), 'help mentions uninstall');
    assert.ok(/status/.test(out), 'help mentions status');
    assert.ok(/doctor/.test(out), 'help mentions doctor');
    assert.ok(/version/.test(out), 'help mentions version');
  }
});

test('cli: unknown option fails loud with non-zero exit', () => {
  const s = streams();
  const code = main(['--bad'], { stdout: s.stdout, stderr: s.stderr });
  assert.notStrictEqual(code, 0);
  assert.ok(/unknown/i.test(s.getErr()), 'error message on stderr');
});

test('cli: install -> status -> uninstall round-trip via injected roots', () => {
  const opts = fixtureOpts();

  const sInstall = streams();
  assert.strictEqual(
    main(['install', '--platform', 'claude'], Object.assign({ stdout: sInstall.stdout, stderr: sInstall.stderr }, opts)),
    0,
    'install exits 0',
  );
  assert.ok(fs.existsSync(path.join(opts.platformRoots.claude, 'xsk-think', 'SKILL.md')), 'skill installed');

  const sStatus = streams();
  assert.strictEqual(
    main(['status', '--platform', 'claude'], Object.assign({ stdout: sStatus.stdout, stderr: sStatus.stderr }, opts)),
    0,
  );
  assert.ok(/claude: ok/.test(sStatus.getOut()), 'status reports ok');

  const sStatusJson = streams();
  main(['status', '--platform', 'claude', '--json'], Object.assign({ stdout: sStatusJson.stdout, stderr: sStatusJson.stderr }, opts));
  const parsed = JSON.parse(sStatusJson.getOut());
  assert.strictEqual(parsed.platforms.claude.state, 'ok');

  const sUninstall = streams();
  const code = main(['uninstall', '--platform', 'claude'], Object.assign({ stdout: sUninstall.stdout, stderr: sUninstall.stderr }, opts));
  assert.strictEqual(code, 0, 'uninstall exits 0');
  assert.ok(!fs.existsSync(path.join(opts.platformRoots.claude, 'xsk-think', 'SKILL.md')), 'skill removed');

  const sStatusAfter = streams();
  main(['status', '--platform', 'claude'], Object.assign({ stdout: sStatusAfter.stdout, stderr: sStatusAfter.stderr }, opts));
  assert.ok(/not-installed/.test(sStatusAfter.getOut()), 'status reports not-installed after uninstall');
});

test('cli: doctor runs and exits 0 on a healthy fixture', () => {
  const opts = fixtureOpts();
  const s = streams();
  const code = main(['doctor', '--platform', 'claude'], Object.assign({ stdout: s.stdout, stderr: s.stderr }, opts));
  assert.strictEqual(code, 0, 'doctor exits 0 when all checks pass');
  assert.ok(/PASS/.test(s.getOut()), 'doctor prints PASS lines');
});

test('cli: status with --platform claude only reports claude', () => {
  const opts = fixtureOpts();
  const s = streams();
  main(['status', '--platform', 'claude'], Object.assign({ stdout: s.stdout, stderr: s.stderr }, opts));
  const out = s.getOut();
  assert.ok(out.includes('claude:'), 'reports claude');
  assert.ok(!out.includes('codex:'), 'does not report codex');
});

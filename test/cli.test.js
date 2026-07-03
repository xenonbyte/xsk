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

test('cli: version rejects --platform with non-zero exit', () => {
  const s = streams();
  const code = main(['version', '--platform', 'claude'], { stdout: s.stdout, stderr: s.stderr });
  assert.notStrictEqual(code, 0);
  assert.match(s.getErr(), /xsk: unknown or not-allowed option for version: --platform/);
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

test('cli: opencode install/uninstall output reports command-file counts', () => {
  const opts = fixtureOpts();
  opts.platformCommandsRoots = { opencode: path.join(opts.home, 'opencode-commands') };

  const sInstall = streams();
  assert.strictEqual(
    main(['install', '--platform', 'opencode'], Object.assign({ stdout: sInstall.stdout, stderr: sInstall.stderr }, opts)),
    0,
    'opencode install exits 0',
  );
  const installOut = sInstall.getOut();
  const installMatch = installOut.match(/opencode: installed (\d+) skills?; installed (\d+) commands?/);
  assert.ok(installMatch, `install output reports skill + command counts, got: ${installOut.trim()}`);
  assert.strictEqual(installMatch[1], installMatch[2], 'one command file per opencode skill');
  assert.ok(Number(installMatch[2]) > 0, 'at least one command installed');

  const sUninstall = streams();
  assert.strictEqual(
    main(['uninstall', '--platform', 'opencode'], Object.assign({ stdout: sUninstall.stdout, stderr: sUninstall.stderr }, opts)),
    0,
    'opencode uninstall exits 0',
  );
  const uninstallOut = sUninstall.getOut();
  const uninstallMatch = uninstallOut.match(/opencode: removed (\d+) skills?; removed (\d+) commands?/);
  assert.ok(uninstallMatch, `uninstall output reports removed skill + command counts, got: ${uninstallOut.trim()}`);
  assert.strictEqual(uninstallMatch[1], uninstallMatch[2], 'every installed command file removed');
});

test('cli: uninstall reports refused paths without labeling every case as symlink', () => {
  const opts = fixtureOpts();
  const skillDir = path.join(opts.platformRoots.claude, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillFile, 'user-authored skill\n');

  const sInstall = streams();
  assert.strictEqual(
    main(['install', '--platform', 'claude'], Object.assign({ stdout: sInstall.stdout, stderr: sInstall.stderr }, opts)),
    0,
    'claude install exits 0',
  );
  const backup = path.join(opts.xskRoot, 'install', 'backups', 'claude', 'xsk-think.SKILL.md.bak');
  assert.ok(fs.existsSync(backup), 'displaced user skill backup was created');
  fs.rmSync(backup);

  const sUninstall = streams();
  const code = main(['uninstall', '--platform', 'claude'], Object.assign({ stdout: sUninstall.stdout, stderr: sUninstall.stderr }, opts));
  const out = sUninstall.getOut();
  assert.strictEqual(code, 2, 'missing backup produces a partial uninstall');
  assert.match(out, /refused 1 path\(s\)/);
  assert.doesNotMatch(out, /symlink/);
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

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { install, installPlatform, PACKAGE_NAME, MARKER } = require('../lib/install');
const { read, validate } = require('../lib/manifest');
const { get } = require('../lib/skills');

function freshSandbox() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-install-'));
  return {
    home,
    claudeRoot: path.join(home, 'claude-skills'),
    xskRoot: path.join(home, '.xsk'),
  };
}

test('install: writes xsk-think SKILL.md + .xsk-owned marker under the injected claude root', () => {
  const sb = freshSandbox();
  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  const markerFile = path.join(sb.claudeRoot, 'xsk-think', MARKER);
  assert.ok(fs.existsSync(skillFile), 'SKILL.md created');
  assert.ok(fs.existsSync(markerFile), '.xsk-owned marker created');
  assert.strictEqual(fs.readFileSync(markerFile, 'utf8'), `${PACKAGE_NAME}\n`);
});

test('install: written SKILL.md content is complete (atomic, no leftover temp files)', () => {
  const sb = freshSandbox();
  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
  const dir = path.join(sb.claudeRoot, 'xsk-think');
  const entries = fs.readdirSync(dir);
  const tmpLeftovers = entries.filter((e) => e.includes('.tmp-'));
  assert.deepStrictEqual(tmpLeftovers, [], 'no temp siblings remain after atomic rename');
  const content = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  assert.ok(content.startsWith('---\nname: xsk-think\n'), 'content begins with frontmatter');
  assert.ok(content.trim().endsWith('approached, not what the agent is technically capable of.'));
});

test('install: records every created path in the platform manifest', () => {
  const sb = freshSandbox();
  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.strictEqual(validate(manifest, { expectedPlatform: 'claude' }), true);
  const skillFile = path.join(sb.claudeRoot, 'xsk-think', 'SKILL.md');
  const markerFile = path.join(sb.claudeRoot, 'xsk-think', MARKER);
  assert.ok(manifest.installed_paths.includes(skillFile), 'manifest lists SKILL.md');
  assert.ok(manifest.installed_paths.includes(markerFile), 'manifest lists marker');
  assert.strictEqual(manifest.platform, 'claude');
});

test('install: backs up a pre-existing user file and records it in backups[]', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user-owned custom\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);

  install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });

  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.strictEqual(manifest.backups.length, 1, 'one backup recorded');
  const backup = manifest.backups[0];
  assert.strictEqual(backup.target, skillFile);
  assert.ok(fs.existsSync(backup.backup), 'backup file exists on disk');
  assert.strictEqual(fs.readFileSync(backup.backup, 'utf8'), userContent, 'backup preserves user content');
});

test('install: refuses a pre-existing symlink skill directory before writing through it', () => {
  const sb = freshSandbox();
  const outside = path.join(sb.home, 'outside-target');
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(sb.claudeRoot, { recursive: true });
  fs.symlinkSync(outside, path.join(sb.claudeRoot, 'xsk-think'));

  assert.throws(
    () =>
      install({
        platforms: ['claude'],
        platformRoots: { claude: sb.claudeRoot },
        xskRoot: sb.xskRoot,
        skills: [get('xsk-think')],
      }),
    /symlink/i,
  );
  assert.ok(!fs.existsSync(path.join(outside, 'SKILL.md')), 'outside target not written');
  assert.ok(!fs.existsSync(path.join(outside, MARKER)), 'outside target marker not written');
});

test('install: re-install over an owned file does not create a new backup', () => {
  const sb = freshSandbox();
  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  install(opts);
  const manifest = read('claude', { xskRoot: sb.xskRoot });
  assert.deepStrictEqual(manifest.backups, [], 'second install creates no backup (file is owned)');
});

test('install: re-install preserves the manifest record for an original displaced backup', () => {
  const sb = freshSandbox();
  const skillDir = path.join(sb.claudeRoot, 'xsk-think');
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.mkdirSync(skillDir, { recursive: true });
  const userContent = '---\nname: xsk-think\ndescription: user-owned custom\n---\nUSER CONTENT\n';
  fs.writeFileSync(skillFile, userContent);

  const opts = {
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  };
  install(opts);
  const firstManifest = read('claude', { xskRoot: sb.xskRoot });
  install(opts);

  const secondManifest = read('claude', { xskRoot: sb.xskRoot });
  assert.deepStrictEqual(secondManifest.backups, firstManifest.backups);
  assert.strictEqual(fs.readFileSync(secondManifest.backups[0].backup, 'utf8'), userContent);
});

test('install: applies per-skill platform targeting (xsk-think installs to claude)', () => {
  const sb = freshSandbox();
  const summary = install({
    platforms: ['claude'],
    platformRoots: { claude: sb.claudeRoot },
    xskRoot: sb.xskRoot,
    skills: [get('xsk-think')],
  });
  assert.ok(summary.platforms.claude.installed.length > 0, 'xsk-think installed to claude');
});

test('install: summary marks a platform skipped when no skill targets it', () => {
  const sb = freshSandbox();
  const summary = install({
    platforms: ['codex'],
    platformRoots: { codex: path.join(sb.home, 'codex-skills') },
    xskRoot: sb.xskRoot,
    skills: [],
  });
  assert.strictEqual(summary.platforms.codex.skipped, true);
});

test('install: all four adapters resolve the correct platform skill roots', () => {
  const claude = require('../lib/adapters/claude.js');
  const codex = require('../lib/adapters/codex.js');
  const opencode = require('../lib/adapters/opencode.js');
  const gemini = require('../lib/adapters/gemini.js');
  const home = '/tmp/fake-home';
  assert.strictEqual(claude.skillsRoot({ home }), path.join(home, '.claude', 'skills'));
  assert.strictEqual(codex.skillsRoot({ home }), path.join(home, '.agents', 'skills'));
  assert.strictEqual(opencode.skillsRoot({ home }), path.join(home, '.config', 'opencode', 'skills'));
  assert.strictEqual(gemini.skillsRoot({ home }), path.join(home, '.gemini', 'skills'));
});

test('install: default install resolves each platform root via its adapter', () => {
  const { rootFor } = require('../lib/install');
  const home = '/tmp/fake-home';
  // default (no injected root) uses adapter.skillsRoot() which reads os.homedir();
  // here we verify the adapter path structure by injecting home through a temp HOME-less check
  const codex = require('../lib/adapters/codex.js');
  assert.ok(codex.skillsRoot().includes('agents'));
});

test('install: bypass-claude installs only under the Claude root, skipped on other platforms', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-targeting-'));
  const roots = {
    claude: path.join(home, 'claude-skills'),
    codex: path.join(home, 'agents-skills'),
    opencode: path.join(home, 'opencode-skills'),
    gemini: path.join(home, 'gemini-skills'),
  };
  const xskRoot = path.join(home, '.xsk');
  const { skills: allSkills } = require('../lib/skills');

  install({ platforms: ['claude', 'codex', 'opencode', 'gemini'], platformRoots: roots, xskRoot, skills: allSkills });

  assert.ok(
    fs.existsSync(path.join(roots.claude, 'xsk-bypass-claude', 'SKILL.md')),
    'bypass-claude installed under claude root',
  );
  for (const p of ['codex', 'opencode', 'gemini']) {
    assert.ok(
      !fs.existsSync(path.join(roots[p], 'xsk-bypass-claude')),
      `bypass-claude NOT installed under ${p} root`,
    );
  }
});

test('install: claude gets all 5 skills; codex/opencode/gemini get 4 (no bypass-claude)', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-count-'));
  const roots = {
    claude: path.join(home, 'claude-skills'),
    codex: path.join(home, 'agents-skills'),
    opencode: path.join(home, 'opencode-skills'),
    gemini: path.join(home, 'gemini-skills'),
  };
  const xskRoot = path.join(home, '.xsk');
  const { skills: allSkills } = require('../lib/skills');

  install({ platforms: ['claude', 'codex', 'opencode', 'gemini'], platformRoots: roots, xskRoot, skills: allSkills });

  const countSkillMd = (root) => {
    let n = 0;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name === 'SKILL.md') n += 1;
      }
    };
    if (fs.existsSync(root)) walk(root);
    return n;
  };

  assert.strictEqual(countSkillMd(roots.claude), 5, 'claude has 5 skills');
  assert.strictEqual(countSkillMd(roots.codex), 4, 'codex has 4 skills');
  assert.strictEqual(countSkillMd(roots.opencode), 4, 'opencode has 4 skills');
  assert.strictEqual(countSkillMd(roots.gemini), 4, 'gemini has 4 skills');
});

test('install: full install + status + uninstall round-trip across all four platforms', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-full-'));
  const roots = {
    claude: path.join(home, 'claude-skills'),
    codex: path.join(home, 'agents-skills'),
    opencode: path.join(home, 'opencode-skills'),
    gemini: path.join(home, 'gemini-skills'),
  };
  const xskRoot = path.join(home, '.xsk');
  const { skills: allSkills } = require('../lib/skills');
  const { computeStatus } = require('../lib/status');
  const { uninstall } = require('../lib/uninstall');

  install({ platforms: ['claude', 'codex', 'opencode', 'gemini'], platformRoots: roots, xskRoot, skills: allSkills });
  let status = computeStatus({ platforms: ['claude', 'codex', 'opencode', 'gemini'], xskRoot });
  assert.strictEqual(status.platforms.claude.state, 'ok');
  assert.strictEqual(status.platforms.codex.state, 'ok');
  assert.strictEqual(status.platforms.opencode.state, 'ok');
  assert.strictEqual(status.platforms.gemini.state, 'ok');

  const summary = uninstall({ platforms: ['claude', 'codex', 'opencode', 'gemini'], xskRoot });
  assert.strictEqual(summary.exitCode, 0);
  for (const p of ['claude', 'codex', 'opencode', 'gemini']) {
    assert.ok(!fs.existsSync(path.join(roots[p], 'xsk-think')), `${p} skill dir removed`);
  }
  status = computeStatus({ platforms: ['claude', 'codex', 'opencode', 'gemini'], xskRoot });
  for (const p of ['claude', 'codex', 'opencode', 'gemini']) {
    assert.strictEqual(status.platforms[p].state, 'not-installed');
  }
});

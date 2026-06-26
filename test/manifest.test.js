'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  SCHEMA_VERSION,
  validate,
  validateOperationalSemantics,
  read,
  write,
  create,
  manifestPath,
  removeManifest,
} = require('../lib/manifest');

function validManifest(overrides) {
  return Object.assign(
    {
      schema_version: SCHEMA_VERSION,
      platform: 'claude',
      version: '0.1.0',
      installed_at: '2026-06-25T00:00:00.000Z',
      installed_paths: ['/tmp/x/.claude/skills/xsk-think/SKILL.md'],
      backups: [{ target: '/tmp/x/.claude/skills/xsk-think/SKILL.md', backup: '/tmp/x/.xsk/b/1' }],
    },
    overrides,
  );
}

test('manifest: valid manifest passes shape validation', () => {
  assert.strictEqual(validate(validManifest()), true);
});

test('manifest: valid manifest passes with expected platform match', () => {
  assert.strictEqual(validate(validManifest(), { expectedPlatform: 'claude' }), true);
});

test('manifest: wrong platform (expectedPlatform mismatch) is invalid', () => {
  assert.strictEqual(validate(validManifest(), { expectedPlatform: 'codex' }), false);
});

test('manifest: missing required field -> invalid (truncated-but-parseable)', () => {
  for (const field of ['schema_version', 'platform', 'version', 'installed_at', 'installed_paths', 'backups']) {
    const m = validManifest();
    delete m[field];
    assert.strictEqual(validate(m), false, `missing ${field} should be invalid`);
  }
});

test('manifest: wrong schema_version is invalid', () => {
  assert.strictEqual(validate(validManifest({ schema_version: 2 })), false);
  assert.strictEqual(validate(validManifest({ schema_version: '1' })), false);
});

test('manifest: installed_paths must be an array of strings', () => {
  assert.strictEqual(validate(validManifest({ installed_paths: 'x' })), false);
  assert.strictEqual(validate(validManifest({ installed_paths: [1, 2] })), false);
});

test('manifest: backups entries must have target and backup strings', () => {
  assert.strictEqual(validate(validManifest({ backups: [{ target: 'a' }] })), false);
  assert.strictEqual(validate(validManifest({ backups: [{ target: 1, backup: 2 }] })), false);
  assert.strictEqual(validate(validManifest({ backups: [{ target: 'a', backup: 'b' }] })), true);
});

test('manifest: installed_hashes is optional but must contain target and sha256 strings when present', () => {
  const hash = 'a'.repeat(64);
  assert.strictEqual(validate(validManifest()), true);
  assert.strictEqual(validate(validManifest({ installed_hashes: [{ target: '/tmp/a/SKILL.md', sha256: hash }] })), true);
  assert.strictEqual(validate(validManifest({ installed_hashes: 'x' })), false);
  assert.strictEqual(validate(validManifest({ installed_hashes: [{ target: '/tmp/a/SKILL.md', sha256: 'nope' }] })), false);
  assert.strictEqual(validate(validManifest({ installed_hashes: [{ target: 1, sha256: hash }] })), false);
});

test('manifest: operational semantics accept in-root installed paths', () => {
  const skillsRoot = path.join('/tmp', 'x', '.claude', 'skills');
  const manifest = validManifest({
    installed_paths: [path.join(skillsRoot, 'xsk-think', 'SKILL.md')],
  });

  assert.deepStrictEqual(
    validateOperationalSemantics({ platform: 'claude', skillsRoot, manifest }),
    { valid: true },
  );
});

test('manifest: operational semantics reject out-of-root installed paths', () => {
  const skillsRoot = path.join('/tmp', 'x', '.claude', 'skills');
  const manifest = validManifest({
    installed_paths: [path.join('/tmp', 'x', '.claude', 'outside', 'SKILL.md')],
  });

  assert.deepStrictEqual(
    validateOperationalSemantics({ platform: 'claude', skillsRoot, manifest }),
    {
      valid: false,
      reason: `installed path escapes platform root: ${path.join('/tmp', 'x', '.claude', 'outside', 'SKILL.md')}`,
    },
  );
});

test('manifest: operational semantics accept empty installed paths', () => {
  const skillsRoot = path.join('/tmp', 'x', '.claude', 'skills');

  assert.deepStrictEqual(
    validateOperationalSemantics({ platform: 'claude', skillsRoot, manifest: validManifest({ installed_paths: [] }) }),
    { valid: true },
  );
});

test('manifest: non-object / null is invalid', () => {
  assert.strictEqual(validate(null), false);
  assert.strictEqual(validate('nope'), false);
  assert.strictEqual(validate(undefined), false);
});

test('manifest: read returns null when no manifest exists', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-m-'));
  assert.strictEqual(read('claude', { xskRoot: tmp }), null);
});

test('manifest: write creates the manifests dir and round-trips through read', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-m-'));
  const m = validManifest();
  const written = write('claude', m, { xskRoot: tmp });
  assert.ok(fs.existsSync(written), 'manifest file written');
  assert.strictEqual(path.dirname(written), path.join(tmp, 'manifests'));
  const back = read('claude', { xskRoot: tmp });
  assert.deepStrictEqual(back, m);
});

test('manifest: write does not follow a swapped temp-file symlink', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-m-'));
  const dir = path.join(tmp, 'manifests');
  fs.mkdirSync(dir, { recursive: true });
  const victim = path.join(tmp, 'outside-manifest-target');
  fs.writeFileSync(victim, 'do not overwrite');
  const originalWriteFileSync = fs.writeFileSync;
  let injected = false;

  fs.writeFileSync = function symlinkThenWrite(target, data, options) {
    if (!injected && typeof target === 'string' && path.basename(target).includes('claude.manifest.tmp-')) {
      injected = true;
      fs.symlinkSync(victim, target);
    }
    return originalWriteFileSync.call(fs, target, data, options);
  };

  try {
    write('claude', validManifest(), { xskRoot: tmp });
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }

  assert.strictEqual(fs.readFileSync(victim, 'utf8'), 'do not overwrite', 'symlink target not overwritten');
  assert.strictEqual(fs.lstatSync(manifestPath('claude', { xskRoot: tmp })).isSymbolicLink(), false);
});

test('manifest: read, write, and remove refuse a symlinked xskRoot', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-m-'));
  const outside = path.join(home, 'outside-xsk');
  const xskRoot = path.join(home, '.xsk');
  fs.mkdirSync(outside, { recursive: true });
  fs.symlinkSync(outside, xskRoot);
  const m = validManifest();

  assert.throws(() => read('claude', { xskRoot }), /symlink/i);
  assert.throws(() => write('claude', m, { xskRoot }), /symlink/i);
  assert.throws(() => removeManifest('claude', { xskRoot }), /symlink/i);
  assert.ok(!fs.existsSync(path.join(outside, 'manifests', 'claude.manifest')), 'outside manifest not written');
});

test('manifest: failed write leaves the previous manifest intact', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-m-'));
  const oldManifest = validManifest({ version: '0.1.0' });
  const newManifest = validManifest({ version: '0.2.0' });
  const written = write('claude', oldManifest, { xskRoot: tmp });
  const originalRenameSync = fs.renameSync;
  let injected = false;

  fs.renameSync = function throwOnManifestRename(from, to) {
    if (!injected && to === written) {
      injected = true;
      throw new Error('simulated write failure');
    }
    return originalRenameSync.call(fs, from, to);
  };

  try {
    assert.throws(() => write('claude', newManifest, { xskRoot: tmp }), /simulated write failure/);
  } finally {
    fs.renameSync = originalRenameSync;
  }

  assert.deepStrictEqual(read('claude', { xskRoot: tmp }), oldManifest);
  assert.strictEqual(path.dirname(written), path.join(tmp, 'manifests'));
});

test('manifest: manifestPath respects injected xskRoot', () => {
  assert.strictEqual(
    manifestPath('claude', { xskRoot: '/tmp/xskroot' }),
    path.join('/tmp/xskroot', 'manifests', 'claude.manifest'),
  );
});

test('manifest: read throws on truncated-but-parseable JSON, surfacing invalidity', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-m-'));
  const dir = path.join(tmp, 'manifests');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'claude.manifest'), '{ "schema_version": 1, '); // truncated
  assert.throws(() => read('claude', { xskRoot: tmp }), SyntaxError);
});

test('manifest: create builds a valid fresh manifest', () => {
  const m = create('claude', '0.1.0');
  assert.strictEqual(validate(m), true);
  assert.deepStrictEqual(m.installed_paths, []);
  assert.deepStrictEqual(m.backups, []);
  assert.deepStrictEqual(m.installed_hashes, []);
});

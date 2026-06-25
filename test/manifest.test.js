'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { SCHEMA_VERSION, validate, read, write, create, manifestPath } = require('../lib/manifest');

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
});

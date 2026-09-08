'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { main } = require('../bin/xsk');
const { install, installPlatform, MARKER } = require('../lib/install');
const { uninstall, restorePathState } = require('../lib/uninstall');
const { read, manifestPath } = require('../lib/manifest');
const { get } = require('../lib/skills');

function fixture(t, platform = 'claude') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xsk-recovery-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const platformRoots = Object.fromEntries(
    ['claude', 'codex', 'opencode', 'gemini'].map((p) => [p, path.join(root, p, 'skills')]),
  );
  const options = {
    platforms: [platform],
    platformRoots,
    platformCommandsRoots: { opencode: path.join(root, 'opencode', 'commands') },
    xskRoot: path.join(root, '.xsk'),
    skills: [get('xsk-think'), get('xsk-check')],
  };
  return {
    root, platform, options,
    skillsRoot: platformRoots[platform],
    dir: (name) => path.join(platformRoots[platform], name),
    file: (name) => path.join(platformRoots[platform], name, 'SKILL.md'),
    marker: (name) => path.join(platformRoots[platform], name, MARKER),
    manifest: () => read(platform, options),
  };
}

function displaceUserFile(fx, name) {
  fs.mkdirSync(fx.dir(name), { recursive: true });
  const content = `User's original ${name}\n`;
  fs.writeFileSync(fx.file(name), content);
  return content;
}

function failFs(method, target, run) {
  const original = fs[method];
  let hits = 0;
  fs[method] = function failTarget(actual, ...args) {
    if (path.resolve(String(actual)) === target) {
      hits++;
      const error = new Error(`injected ${method} failure at ${target}`);
      error.code = 'EPERM';
      throw error;
    }
    return original.call(fs, actual, ...args);
  };
  try {
    return run();
  } finally {
    fs[method] = original;
    assert.ok(hits > 0, 'the requested failure was exercised');
  }
}

test('uninstall: restored backup relinquishes a recreated owned directory', (t) => {
  const fx = fixture(t);
  const original = displaceUserFile(fx, 'xsk-think');
  install(fx.options);
  fs.rmSync(fx.dir('xsk-think'), { recursive: true });
  install(fx.options);
  assert.ok(fx.manifest().installed_paths.includes(fx.dir('xsk-think')));
  assert.equal(fx.manifest().backups.length, 1);

  const result = uninstall(fx.options);
  assert.equal(result.exitCode, 0);
  assert.equal(fs.readFileSync(fx.file('xsk-think'), 'utf8'), original);
  assert.equal(fs.existsSync(fx.marker('xsk-think')), false);
  assert.equal(fx.manifest(), null);
  assert.equal(uninstall(fx.options).exitCode, 0);
});

test('install: recreated directory with a displaced backup can be reinstalled repeatedly', (t) => {
  const fx = fixture(t);
  const original = displaceUserFile(fx, 'xsk-think');
  install(fx.options);
  fs.rmSync(fx.dir('xsk-think'), { recursive: true });
  install(fx.options);
  install(fx.options);
  install(fx.options);
  assert.equal(fx.manifest().installed_paths.includes(fx.dir('xsk-think')), false);
  assert.equal(fs.readFileSync(fx.manifest().backups[0].backup, 'utf8'), original);
  assert.equal(uninstall(fx.options).exitCode, 0);
  assert.equal(fs.readFileSync(fx.file('xsk-think'), 'utf8'), original);
});

for (const spec of [
  { name: 'skill removal', method: 'rmSync', leaf: 'SKILL.md' },
  { name: 'restore parent creation', method: 'mkdirSync', leaf: '', backup: true },
  { name: 'owned marker removal', method: 'rmSync', leaf: MARKER },
  { name: 'marker removal after backup restoration', method: 'rmSync', leaf: MARKER, backup: true },
  { name: 'skill inspection', method: 'readFileSync', leaf: 'SKILL.md' },
]) {
  test(`uninstall: ${spec.name} failure preserves a retryable narrowed manifest`, (t) => {
    const fx = fixture(t);
    const original = spec.backup ? displaceUserFile(fx, 'xsk-check') : null;
    install(fx.options);
    const generated = fs.readFileSync(fx.file('xsk-check'), 'utf8');
    const prior = fx.manifest();
    const target = path.join(fx.dir('xsk-check'), spec.leaf);
    const result = failFs(spec.method, target, () => uninstall(fx.options));
    assert.equal(result.exitCode, 2);
    assert.match(result.platforms.claude.error, /injected/);
    assert.equal(fs.existsSync(fx.dir('xsk-think')), false, 'completed other skill stays removed');
    const narrowed = fx.manifest();
    assert.ok(!narrowed.installed_paths.some((p) => p.startsWith(fx.dir('xsk-think'))));
    assert.ok(narrowed.installed_paths.includes(fx.file('xsk-check')));
    assert.ok(narrowed.installed_paths.includes(fx.marker('xsk-check')));
    assert.deepEqual(narrowed.installed_hashes, prior.installed_hashes.filter((h) => h.target === fx.file('xsk-check')));
    assert.equal(fs.readFileSync(fx.file('xsk-check'), 'utf8'), generated);
    if (original) {
      assert.deepEqual(narrowed.backups, prior.backups);
      assert.equal(fs.readFileSync(narrowed.backups[0].backup, 'utf8'), original);
    }
    assert.equal(uninstall(fx.options).exitCode, 0);
    assert.equal(fx.manifest(), null);
    if (original) assert.equal(fs.readFileSync(fx.file('xsk-check'), 'utf8'), original);
  });
}

test('uninstall: command deletion failure is partial and continues independent commands', (t) => {
  const fx = fixture(t, 'opencode');
  install(fx.options);
  const command = path.join(fx.options.platformCommandsRoots.opencode, 'xsk-think.md');
  const otherCommand = path.join(fx.options.platformCommandsRoots.opencode, 'xsk-check.md');
  const content = fs.readFileSync(command, 'utf8');
  let output = '';
  let errors = '';
  const exit = failFs('rmSync', command, () => main(['uninstall', '--platform', 'opencode'], {
    ...fx.options,
    stdout: { write(s) { output += s; } },
    stderr: { write(s) { errors += s; } },
  }));
  assert.equal(exit, 2);
  assert.match(output, /retained 1 file.*command removal failed/);
  assert.doesNotMatch(output, /user-edited/, 'an I/O failure is not a user edit');
  assert.equal(errors, '');
  assert.deepEqual(fx.manifest().installed_paths, [command]);
  assert.equal(fs.readFileSync(command, 'utf8'), content);
  assert.equal(fs.existsSync(otherCommand), false);
  assert.equal(fs.existsSync(fx.dir('xsk-think')), false);
  assert.equal(uninstall(fx.options).exitCode, 0);
  assert.equal(fx.manifest(), null);
});

test('uninstall: manifest removal failure restores deleted backups and ownership for retry', (t) => {
  const fx = fixture(t);
  const original = displaceUserFile(fx, 'xsk-think');
  install(fx.options);
  const prior = fx.manifest();
  const generated = fs.readFileSync(fx.file('xsk-think'), 'utf8');
  const result = failFs('rmSync', manifestPath(fx.platform, fx.options), () => uninstall(fx.options));
  assert.equal(result.exitCode, 2);
  assert.deepEqual(result.platforms.claude.removed, []);
  assert.deepEqual(result.platforms.claude.restored, []);
  assert.deepEqual(fx.manifest(), prior);
  assert.equal(fs.readFileSync(fx.file('xsk-think'), 'utf8'), generated);
  assert.equal(fs.readFileSync(prior.backups[0].backup, 'utf8'), original);
  assert.equal(fs.existsSync(fx.marker('xsk-think')), true);
  assert.equal(fs.existsSync(fx.file('xsk-check')), true);
  assert.equal(uninstall(fx.options).exitCode, 0);
  assert.equal(fs.readFileSync(fx.file('xsk-think'), 'utf8'), original);
  assert.equal(fx.manifest(), null);
});

test('install: rollback failure is reported through the CLI and other cleanup continues', (t) => {
  const fx = fixture(t);
  const target = fx.file('xsk-think');
  const marker = fx.marker('xsk-think');
  const originalRename = fs.renameSync;
  let writeFailures = 0;
  fs.renameSync = function failMarker(from, to) {
    if (to === marker) {
      writeFailures++;
      throw new Error('injected marker write failure');
    }
    return originalRename.call(fs, from, to);
  };
  let stderr = '';
  try {
    const exit = failFs('rmSync', target, () => main(['install', '--platform', 'claude'], {
      ...fx.options, stdout: { write() {} }, stderr: { write(s) { stderr += s; } },
    }));
    assert.equal(exit, 1);
  } finally {
    fs.renameSync = originalRename;
  }
  assert.equal(writeFailures, 1);
  assert.match(stderr, /injected marker write failure/);
  assert.match(stderr, /rollback failed/);
  assert.ok(stderr.includes(target));
  assert.equal(fs.existsSync(target), true);
  assert.equal(fs.existsSync(marker), false);
  assert.equal(fs.existsSync(fx.options.xskRoot), false, 'independent root cleanup still ran');
});

test('install: installPlatform cleans its newly created skills root on failure', (t) => {
  const fx = fixture(t);
  const originalRename = fs.renameSync;
  fs.renameSync = function failMarker(from, to) {
    if (to === fx.marker('xsk-think')) throw new Error('injected marker write failure');
    return originalRename.call(fs, from, to);
  };
  try {
    assert.throws(() => installPlatform({
      platform: fx.platform, skillsRoot: fx.skillsRoot, xskRoot: fx.options.xskRoot,
      version: require('../package.json').version, skills: fx.options.skills,
    }), /injected marker write failure/);
  } finally {
    fs.renameSync = originalRename;
  }
  assert.equal(fs.existsSync(fx.skillsRoot), false);
});

test('install: markerless generated directory remains unowned after round-trip', (t) => {
  const fx = fixture(t);
  install(fx.options);
  fs.rmSync(fx.marker('xsk-think'));
  install(fx.options);
  assert.equal(fx.manifest().installed_paths.includes(fx.dir('xsk-think')), false);
  assert.equal(uninstall(fx.options).exitCode, 0);
  assert.deepEqual(fs.readdirSync(fx.dir('xsk-think')), []);
  assert.equal(fx.manifest(), null);
});

test('install: uninstall-first I/O failure cannot discard a dropped skill record', (t) => {
  const fx = fixture(t);
  install(fx.options);
  const prior = fx.manifest();
  const generated = fs.readFileSync(fx.file('xsk-check'), 'utf8');
  const reduced = { ...fx.options, skills: [get('xsk-think')] };
  failFs('rmSync', fx.file('xsk-check'), () => {
    assert.throws(() => install(reduced), /uninstall-first failed.*injected/);
  });
  assert.deepEqual(fx.manifest(), prior);
  assert.equal(fs.readFileSync(fx.file('xsk-check'), 'utf8'), generated);
  assert.ok(fs.existsSync(fx.marker('xsk-think')));
  install(reduced);
  assert.equal(fs.existsSync(fx.dir('xsk-check')), false);
  assert.equal(uninstall(fx.options).exitCode, 0);
});

test('install: unrelated files in an owned directory do not block reinstall', (t) => {
  const fx = fixture(t);
  install(fx.options);
  const note = path.join(fx.dir('xsk-think'), 'user-note.md');
  fs.writeFileSync(note, 'keep this note\n');
  install(fx.options);
  assert.equal(fs.readFileSync(note, 'utf8'), 'keep this note\n');
  assert.ok(fs.existsSync(fx.file('xsk-think')));
  assert.ok(fx.manifest().installed_paths.includes(fx.dir('xsk-think')));
  assert.equal(uninstall(fx.options).exitCode, 2);
  assert.equal(fs.readFileSync(note, 'utf8'), 'keep this note\n');
});

for (const command of ['uninstall', 'install']) {
  test(`${command}: failed backup rollback preserves the remaining user copy`, (t) => {
    const fx = fixture(t);
    const userContent = displaceUserFile(fx, 'xsk-think');
    install(fx.options);
    const backup = fx.manifest().backups[0].backup;
    const mf = manifestPath(fx.platform, fx.options);
    const originalRm = fs.rmSync;
    const originalWrite = fs.writeFileSync;
    const originalRename = fs.renameSync;
    let backupRemoved = false;
    let rollbackFailures = 0;
    fs.rmSync = function failManifest(p, ...args) {
      if (String(p) === mf) throw new Error('injected manifest removal failure');
      const result = originalRm.call(fs, p, ...args);
      if (String(p) === backup) backupRemoved = true;
      return result;
    };
    fs.writeFileSync = function failBackupWrite(p, ...args) {
      if (backupRemoved && String(p) === backup) {
        rollbackFailures++;
        throw new Error('injected backup recovery failure');
      }
      return originalWrite.call(fs, p, ...args);
    };
    fs.renameSync = function failBackupPublication(from, to) {
      if (backupRemoved && String(to) === backup) {
        rollbackFailures++;
        throw new Error('injected backup recovery failure');
      }
      return originalRename.call(fs, from, to);
    };
    let error;
    try {
      if (command === 'uninstall') error = uninstall(fx.options).platforms.claude.error;
      else assert.throws(() => install(fx.options), (e) => { error = e.message; return true; });
    } finally {
      fs.rmSync = originalRm;
      fs.writeFileSync = originalWrite;
      fs.renameSync = originalRename;
    }
    assert.ok(backupRemoved && rollbackFailures > 0);
    assert.match(error, /rollback failed/);
    assert.equal(fs.readFileSync(fx.file('xsk-think'), 'utf8'), userContent);
    assert.ok(fs.existsSync(fx.file('xsk-check')), 'independent recovery continues');
  });
}

for (const recovery of ['skill', 'platform', 'install']) {
  for (const partialCopy of [false, true]) {
    test(`recovery: ${recovery} copy failure leaves the intact backup untouched (${partialCopy ? 'partial target' : 'no target'})`, (t) => {
      const fx = fixture(t);
      const userContent = displaceUserFile(fx, 'xsk-think');
      install(fx.options);
      const prior = fx.manifest();
      const backup = prior.backups[0].backup;
      const backupStat = fs.statSync(backup);
      const target = fx.file('xsk-think');
      const generated = fs.readFileSync(target, 'utf8');
      const mf = manifestPath(fx.platform, fx.options);
      const tempPrefix = path.join(path.dirname(backup), `.${path.basename(backup)}.tmp-`);
      const originalFs = {
        copyFileSync: fs.copyFileSync, writeFileSync: fs.writeFileSync,
        openSync: fs.openSync, renameSync: fs.renameSync,
      };
      let copyFailures = 0;
      let manifestFailures = 0;
      let backupWrites = 0;
      fs.copyFileSync = function failCopy(from, to, ...args) {
        if (from === backup && to === target) {
          copyFailures++;
          if (partialCopy) originalFs.writeFileSync(target, 'incomplete copy');
          throw new Error('injected backup copy failure');
        }
        return originalFs.copyFileSync(from, to, ...args);
      };
      fs.writeFileSync = function failDirectBackupWrite(p, ...args) {
        if (p === backup) {
          backupWrites++;
          throw new Error('injected backup write failure');
        }
        return originalFs.writeFileSync(p, ...args);
      };
      fs.openSync = function failBackupTemp(p, ...args) {
        if (String(p).startsWith(tempPrefix)) {
          backupWrites++;
          throw new Error('injected backup temp failure');
        }
        return originalFs.openSync(p, ...args);
      };
      fs.renameSync = function failManifestWrite(from, to) {
        if (recovery === 'platform' && to === mf) {
          manifestFailures++;
          throw new Error('injected manifest publication failure');
        }
        return originalFs.renameSync(from, to);
      };
      let error;
      try {
        if (recovery === 'install') {
          assert.throws(() => install(fx.options), (e) => { error = e.message; return true; });
        } else {
          const result = uninstall(fx.options);
          assert.equal(result.exitCode, 2);
          error = result.platforms.claude.error;
        }
      } finally {
        for (const [method, original] of Object.entries(originalFs)) fs[method] = original;
      }
      assert.equal(copyFailures, 1);
      assert.equal(manifestFailures, recovery === 'platform' ? 1 : 0);
      assert.equal(fs.readFileSync(backup, 'utf8'), userContent);
      assert.equal(backupWrites, 0, 'an intact backup needs no recovery write');
      assert.equal(fs.statSync(backup).ino, backupStat.ino, 'the original backup file survives');
      assert.equal(fs.statSync(backup).mode, backupStat.mode);
      assert.equal(fs.readFileSync(target, 'utf8'), generated);
      assert.match(error, /backup restore failed.*injected backup copy failure/);
      assert.doesNotMatch(error, /rollback failed/);
      assert.deepEqual(fx.manifest().backups, prior.backups);
      if (recovery === 'skill') {
        assert.equal(fs.existsSync(fx.dir('xsk-check')), false, 'independent removal remains complete');
      } else {
        assert.deepEqual(fx.manifest(), prior);
        assert.ok(fs.existsSync(fx.file('xsk-check')), 'platform rollback restores other skills');
      }
      if (recovery === 'install') install(fx.options);
      assert.equal(uninstall(fx.options).exitCode, 0);
      assert.equal(fs.readFileSync(target, 'utf8'), userContent);
      assert.equal(fx.manifest(), null);
    });
  }
}

for (const failure of ['write', 'rename']) {
  test(`uninstall: failed rollback publication preserves the existing file (${failure})`, (t) => {
    const fx = fixture(t);
    const userContent = displaceUserFile(fx, 'xsk-think');
    const target = fx.file('xsk-think');
    fs.chmodSync(target, 0o600);
    const originalWrite = fs.writeFileSync;
    const originalRename = fs.renameSync;
    fs.writeFileSync = function failAfterPartialWrite(p, content, ...args) {
      if (failure === 'write') {
        originalWrite(p, content.subarray(0, 3), ...args);
        throw new Error('injected partial recovery write failure');
      }
      return originalWrite(p, content, ...args);
    };
    fs.renameSync = function failPublication(from, to) {
      if (to === target) throw new Error('injected recovery rename failure');
      return originalRename(from, to);
    };
    try {
      assert.throws(() => restorePathState(target, {
        exists: true, type: 'file', content: Buffer.from('captured content\n'), mode: 0o640,
      }), /injected.*failure/);
    } finally {
      fs.writeFileSync = originalWrite;
      fs.renameSync = originalRename;
    }
    assert.equal(fs.readFileSync(target, 'utf8'), userContent);
    assert.equal(fs.statSync(target).mode & 0o777, 0o600);
    assert.deepEqual(fs.readdirSync(fx.dir('xsk-think')), ['SKILL.md'], 'failed staging leaves no temporary file');
    restorePathState(target, {
      exists: true, type: 'file', content: Buffer.from('captured content\n'), mode: 0o640,
    });
    assert.equal(fs.readFileSync(target, 'utf8'), 'captured content\n');
    assert.equal(fs.statSync(target).mode & 0o777, 0o640);
  });
}

test('install: unchanged backup survives failed skill recovery in installPlatform', (t) => {
  const fx = fixture(t);
  const userContent = displaceUserFile(fx, 'xsk-think');
  const backup = path.join(fx.options.xskRoot, 'install', 'backups', fx.platform, 'xsk-think.SKILL.md.bak');
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, userContent);
  const originalWrite = fs.writeFileSync;
  const originalRename = fs.renameSync;
  let markerFailed = false;
  let targetFailures = 0;
  let backupWrites = 0;
  fs.renameSync = function failMarkerAndRecovery(from, to) {
    if (to === fx.marker('xsk-think')) {
      markerFailed = true;
      throw new Error('injected marker publication failure');
    }
    if (markerFailed && to === fx.file('xsk-think')) {
      targetFailures++;
      throw new Error('injected skill recovery failure');
    }
    return originalRename(from, to);
  };
  fs.writeFileSync = function failBackupRewrite(p, ...args) {
    if (p === backup) {
      backupWrites++;
      originalWrite(p, 'incomplete backup');
      throw new Error('injected backup rewrite failure');
    }
    return originalWrite(p, ...args);
  };
  try {
    assert.throws(() => installPlatform({
      platform: fx.platform, skillsRoot: fx.skillsRoot, xskRoot: fx.options.xskRoot,
      version: require('../package.json').version, skills: fx.options.skills,
    }), /marker publication failure; rollback failed:.*skill recovery failure/);
  } finally {
    fs.writeFileSync = originalWrite;
    fs.renameSync = originalRename;
  }
  assert.equal(targetFailures, 1);
  assert.equal(fs.readFileSync(backup, 'utf8'), userContent);
  assert.equal(backupWrites, 0);
});

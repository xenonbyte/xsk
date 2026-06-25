'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

test('syntaxcheck: passes shell-sensitive filenames as argv without expansion', () => {
  const markerName = `xsk-syntaxcheck-marker-${process.pid}-${Date.now()}`;
  const markerPath = path.join(ROOT, markerName);
  const dangerousFile = path.join(__dirname, `syntaxcheck-$(touch ${markerName}).js`);
  fs.writeFileSync(dangerousFile, "'use strict';\n");

  try {
    assert.doesNotThrow(() => {
      execFileSync(process.execPath, ['scripts/syntaxcheck.js'], {
        cwd: ROOT,
        stdio: 'pipe',
      });
    });
    assert.ok(!fs.existsSync(markerPath), 'filename was not evaluated by a shell');
  } finally {
    fs.rmSync(dangerousFile, { force: true });
    fs.rmSync(markerPath, { force: true });
  }
});

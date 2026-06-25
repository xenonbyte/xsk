'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { buildSkill } = require('../lib/generator');
const { skills, ALL_PLATFORMS } = require('../lib/skills');

const ROOT = path.join(__dirname, '..');
const GOLDEN_DIR = path.join(ROOT, 'test/fixtures/golden');
const SENTINEL = '<SHARED_MASKED>';

function maskedShell(skill) {
  const sharedTrim = fs.readFileSync(path.join(ROOT, 'shared/skill-common.md'), 'utf8').trim();
  return buildSkill(skill).content.replace(sharedTrim, SENTINEL);
}

test('golden: generated shell is deterministic across builds', () => {
  for (const skill of skills) {
    const a = maskedShell(skill);
    const b = maskedShell(skill);
    assert.strictEqual(a, b, `${skill.name} shell is deterministic`);
  }
});

test('golden: generated shell is platform-neutral (identical for every platform)', () => {
  for (const skill of skills) {
    const shell = maskedShell(skill);
    assert.ok(!/~\/\.(claude|agents|config\/opencode|gemini)/.test(shell),
      `${skill.name} shell has no platform-specific path`);
    // the shell does not vary by platform; every platform gets the same body
    for (const platform of ALL_PLATFORMS) {
      assert.strictEqual(maskedShell(skill), shell, `${skill.name} shell same for ${platform}`);
    }
  }
});

test('golden: masked shell matches the committed golden fixture per skill', () => {
  for (const skill of skills) {
    const fixturePath = path.join(GOLDEN_DIR, `${skill.name}.md`);
    assert.ok(fs.existsSync(fixturePath), `golden fixture committed for ${skill.name}`);
    const expected = fs.readFileSync(fixturePath, 'utf8');
    assert.strictEqual(maskedShell(skill), expected, `${skill.name} shell matches golden`);
  }
});

test('golden: the shared body is fully masked exactly once per skill', () => {
  const sharedFirstLine = '## Conventions shared across xsk skills';
  for (const skill of skills) {
    const unmasked = buildSkill(skill).content;
    assert.ok(unmasked.includes(sharedFirstLine), `${skill.name} embeds shared body before masking`);
    const shell = unmasked.replace(
      fs.readFileSync(path.join(ROOT, 'shared/skill-common.md'), 'utf8').trim(),
      SENTINEL,
    );
    const occurrences = (shell.match(new RegExp(SENTINEL, 'g')) || []).length;
    assert.strictEqual(occurrences, 1, `${skill.name} masks shared exactly once`);
    assert.ok(!shell.includes(sharedFirstLine), `${skill.name} shared heading fully masked away`);
  }
});

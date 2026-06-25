'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { render, buildSkill, buildAll, PKG_ROOT } = require('../lib/generator');
const { get, skills } = require('../lib/skills');

test('generator: render substitutes known placeholders and leaves unknown untouched', () => {
  const out = render('a={{A}} b={{B}} c={{C}}', { A: '1', B: '2' });
  assert.strictEqual(out, 'a=1 b=2 c={{C}}');
});

test('generator: xsk-think is registered', () => {
  assert.ok(get('xsk-think'), 'xsk-think in registry');
});

test('generator: buildSkill produces name + description frontmatter for xsk-think', () => {
  const built = buildSkill(get('xsk-think'));
  assert.strictEqual(built.name, 'xsk-think');
  assert.ok(built.description && built.description.length > 0, 'description present');
  assert.ok(/^---\nname: xsk-think\ndescription: /.test(built.content), 'frontmatter block present');
  assert.ok(built.content.includes(`name: xsk-think`), 'name field');
});

test('generator: fragments are inlined into the generated body', () => {
  const built = buildSkill(get('xsk-think'));
  const purpose = fs.readFileSync(
    path.join(PKG_ROOT, 'templates/fragments/think.purpose.md'),
    'utf8',
  ).trim();
  assert.ok(built.content.includes(purpose), 'purpose fragment inlined');
  assert.ok(built.content.includes('## When to use'), 'triggers section heading present');
  assert.ok(built.content.includes('## How it works'), 'behavior section heading present');
  assert.ok(built.content.includes('## Output'), 'output section heading present');
});

test('generator: shared conventions are inlined', () => {
  const built = buildSkill(get('xsk-think'));
  const shared = fs.readFileSync(path.join(PKG_ROOT, 'shared/skill-common.md'), 'utf8').trim();
  assert.ok(built.content.includes(shared), 'shared/skill-common.md inlined');
});

test('generator: no unreplaced placeholders in generated output', () => {
  for (const skill of skills) {
    const built = buildSkill(skill);
    assert.ok(
      !/\{\{(\w+)\}\}/.test(built.content),
      `${skill.name} has no unreplaced placeholders`,
    );
  }
});

test('generator: generated content is platform-neutral (identical regardless of where it lands)', () => {
  const built = buildSkill(get('xsk-think'));
  assert.ok(!/~\/\.(claude|agents|config\/opencode|gemini)/.test(built.content),
    'body carries no platform-specific home path');
});

test('generator: buildAll builds every registered skill', () => {
  const all = buildAll();
  assert.strictEqual(all.length, skills.length);
  for (const entry of all) {
    assert.ok(entry.content.length > 0, `${entry.name} built non-empty`);
  }
});

test('generator: all six skills are registered with name + description frontmatter', () => {
  const names = skills.map((s) => s.name).sort();
  assert.deepStrictEqual(
    names,
    ['xsk-archive-req', 'xsk-bypass-claude', 'xsk-check', 'xsk-skill-scaffold', 'xsk-think', 'xsk-write-req'],
  );
  for (const skill of skills) {
    const built = buildSkill(skill);
    assert.ok(/^---\nname: /.test(built.content), `${skill.name} has frontmatter`);
    assert.ok(built.content.includes(`description:`), `${skill.name} has description`);
    assert.ok(!/\{\{(\w+)\}\}/.test(built.content), `${skill.name} has no unreplaced placeholders`);
  }
});

test('generator: xsk-bypass-claude targets .claude/settings.json and bypassPermissions', () => {
  const c = buildSkill(get('xsk-bypass-claude')).content;
  assert.ok(/\.claude\/settings\.json/.test(c), 'targets .claude/settings.json');
  assert.ok(/bypassPermissions/.test(c), 'uses bypassPermissions');
  assert.ok(/never touch[^\n]*settings\.local\.json/i.test(c), 'explicitly excludes settings.local.json');
});

test('generator: xsk-skill-scaffold exposes gate/audit/propose/apply steps', () => {
  const c = buildSkill(get('xsk-skill-scaffold')).content;
  assert.ok(/Gate first/.test(c), 'gate step');
  assert.ok(/Audit/.test(c), 'audit step');
  assert.ok(/Propose/.test(c), 'propose step');
  assert.ok(/Apply on approval/.test(c), 'apply step');
  assert.ok(/error out/.test(c), 'refuses non-agent-skill projects');
});

test('generator: xsk-write-req carries self-audit checkpoint and bans em/en dash', () => {
  const c = buildSkill(get('xsk-write-req')).content;
  assert.ok(/Self-audit checkpoint/.test(c), 'self-audit checkpoint present');
  assert.ok(/Conflict check/.test(c) && /Ambiguity check/.test(c), 'conflict + ambiguity checks');
  assert.ok(!/\u2014/.test(c), 'no em-dash (U+2014)');
  assert.ok(!/\u2013/.test(c), 'no en-dash (U+2013)');
});

test('generator: xsk-archive-req leaves zero active docs', () => {
  const c = buildSkill(get('xsk-archive-req')).content;
  assert.ok(/requirements\/archive\//.test(c), 'archives into requirements/archive/');
  assert.ok(/status: archived/.test(c), 'sets status: archived');
});

test('generator: generated output never references Waza-internal update scripts or relative paths', () => {
  for (const skill of skills) {
    const c = buildSkill(skill).content;
    assert.ok(!/check-update\.sh/.test(c), `${skill.name} has no Waza check-update.sh`);
    assert.ok(!/\.\.\/\.\.\//.test(c), `${skill.name} has no ../../ relative reference paths`);
  }
});

test('generator: xsk-think preserves required behavior cues (purpose, stop-before-code, approval gate)', () => {
  const built = buildSkill(get('xsk-think'));
  const c = built.content;
  assert.ok(/decision-complete plan/.test(c), 'purpose cue');
  assert.ok(/planning-only/.test(c), 'planning-only constraint');
  assert.ok(/explicit approval/.test(c), 'approval gate');
  assert.ok(/Open Questions/.test(c), 'output mentions Open Questions');
});

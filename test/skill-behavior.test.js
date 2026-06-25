'use strict';

// Pins the machine-checkable behavior contracts for every generated skill
// (SPEC-BEHAVIOR-008), plus a documented manual prose-review checklist.
//
// MANUAL PROSE-REVIEW CHECKLIST (not fully machine-checkable; review each
// generated skills/<name>/SKILL.md before release):
//   1. Reads naturally, in the author's voice — no AI-formulaic phrasing.
//   2. No em-dash (U+2014) or en-dash (U+2013) in the write-req body (project rule).
//   3. Triggers are cues, not a required incantation (stated explicitly).
//   4. Stop behavior is unambiguous: the skill halts at a named point.
//   5. No internal/Waza reference paths, no ../../, no update scripts.
//   6. Decisions that change implementation surface a question to the user.

const test = require('node:test');
const assert = require('node:assert');
const { buildSkill } = require('../lib/generator');
const { skills } = require('../lib/skills');

const FILLER_PHRASES = [
  'in today',
  "it's important to note",
  'it is important to note',
  "let's dive",
  'in conclusion',
  'leveraging',
  'robust and scalable',
  'delve into',
  'tapestry',
  'navigate the',
  'realm of',
  'in the world of',
  'game-changer',
];

function body(skill) {
  return buildSkill(skill).content;
}

test('skill-behavior: every generated skill is free of unreplaced placeholders', () => {
  for (const s of skills) {
    assert.ok(!/\{\{(\w+)\}\}/.test(body(s)), `${s.name} has no unreplaced placeholders`);
  }
});

test('skill-behavior: no AI-formulaic filler phrases across all skills', () => {
  for (const s of skills) {
    const c = body(s).toLowerCase();
    for (const phrase of FILLER_PHRASES) {
      assert.ok(!c.includes(phrase), `${s.name} avoids filler phrase "${phrase}"`);
    }
  }
});

test('skill-behavior: xsk-think — purpose, triggers, stop-before-approval, output', () => {
  const c = body(skills.find((s) => s.name === 'xsk-think'));
  assert.ok(/decision-complete plan/.test(c), 'purpose stated');
  assert.ok(/出方案/.test(c) && /plan this/.test(c), 'multilingual triggers present');
  assert.ok(/explicit approval/.test(c), 'approval gate');
  assert.ok(/Proposed Design Summary/.test(c), 'output is a Proposed Design Summary');
  assert.ok(!/Approved Design Summary/.test(c), 'output does not use Approved Design Summary');
  assert.ok(/stop/i.test(c) && /wait for approval/.test(c), 'stops and waits');
});

test('skill-behavior: xsk-bypass-claude — settings.local.json only, Claude-only refusal, malformed-file refusal', () => {
  const c = body(skills.find((s) => s.name === 'xsk-bypass-claude'));
  assert.ok(/bypassPermissions/.test(c), 'sets bypassPermissions');
  assert.ok(/\.claude\/settings\.local\.json/.test(c), 'targets .claude/settings.local.json');
  assert.ok(/preserve every other field/i.test(c), 'preserves other fields');
  assert.ok(/Claude Code-only/i.test(c), 'states Claude-only scope');
  assert.ok(/not Claude Code/i.test(c) && /write nothing/i.test(c), 'refuses outside Claude Code');
  assert.ok(/invalid JSON/i.test(c) && /not a JSON object/i.test(c), 'refuses malformed or non-object JSON');
  assert.ok(/跳过权限/.test(c) && /bypass permissions/i.test(c), 'multilingual triggers');
  assert.ok(/idempotent/i.test(c), 'idempotent no-op stated');
  assert.ok(/Report only the path written/i.test(c), 'limits report to the written path');
  assert.ok(!/resulting JSON|full JSON/i.test(c), 'does not ask agents to print full settings JSON');
  assert.ok(!/writing `?\.claude\/settings\.json`?/i.test(c), 'does not instruct writing .claude/settings.json');
});

test('skill-behavior: xsk-skill-scaffold — gate, audit, propose, apply; refuses non-agent projects', () => {
  const c = body(skills.find((s) => s.name === 'xsk-skill-scaffold'));
  assert.ok(/Gate first/.test(c), 'gate step');
  assert.ok(/error out/.test(c), 'refuses non-agent-skill projects');
  assert.ok(/Audit/.test(c), 'audit step');
  assert.ok(/Propose/.test(c), 'propose step');
  assert.ok(/Apply on approval/.test(c), 'apply on approval');
  assert.ok(/Manifest-backed/.test(c), 'standard includes manifest safety');
  assert.ok(/uninstall-first/i.test(c), 'standard includes uninstall-first install');
  assert.ok(/项目规范化/.test(c), 'multilingual triggers');
});

test('skill-behavior: xsk-write-req — grounded, asks on decisions, self-audit, no em/en dash', () => {
  const c = body(skills.find((s) => s.name === 'xsk-write-req'));
  assert.ok(/Read the project first/.test(c), 'grounds in the project');
  assert.ok(/There is \*\*at most one\*\* active doc at a time/.test(c), 'retains the single-active invariant');
  assert.ok(/If more than one exists, stop/.test(c), 'stops when more than one active doc exists');
  assert.ok(/list the offending paths/i.test(c), 'lists offending active-doc paths');
  assert.ok(/broken invariant/i.test(c), 'reports the broken invariant');
  assert.ok(/user to resolve/i.test(c), 'leaves resolution to the user');
  assert.ok(!/multi-active workflow/i.test(c), 'does not introduce a multi-active workflow');
  assert.ok(!/auto-resolution/i.test(c), 'does not introduce auto-resolution');
  assert.ok(/decision points go to the user/i.test(c), 'asks user on decisions');
  assert.ok(/Self-audit checkpoint/.test(c), 'self-audit checkpoint');
  assert.ok(/Conflict check/.test(c) && /Ambiguity check/.test(c), 'conflict + ambiguity checks');
  assert.ok(/写需求/.test(c) && /write a requirement/i.test(c), 'multilingual triggers');
  assert.ok(!/\u2014/.test(c), 'no em-dash');
  assert.ok(!/\u2013/.test(c), 'no en-dash');
});

test('skill-behavior: xsk-archive-req — validates slug, stops on collision, writes before remove', () => {
  const c = body(skills.find((s) => s.name === 'xsk-archive-req'));
  assert.ok(/status: active/.test(c), 'scans for status: active');
  assert.ok(/single document whose frontmatter has `status: active`/.test(c), 'retains the single-active language');
  assert.ok(/If more than one exists, stop/.test(c), 'stops when more than one active doc exists');
  assert.ok(/list the offending paths/i.test(c), 'lists offending active-doc paths');
  assert.ok(/broken invariant/i.test(c), 'reports the broken invariant');
  assert.ok(/user to resolve/i.test(c), 'leaves resolution to the user');
  assert.ok(!/multi-active workflow/i.test(c), 'does not introduce a multi-active workflow');
  assert.ok(!/auto-resolution/i.test(c), 'does not introduce auto-resolution');
  assert.ok(/\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$/.test(c), 'pins the slug validation regex');
  assert.ok(/missing\/invalid slug/i.test(c), 'refuses a missing or invalid slug');
  assert.ok(/before any write/i.test(c), 'invalid slug stops before any write');
  assert.ok(/requirements\/archive\/<slug>\.md/.test(c), 'uses the archive target path');
  assert.ok(/already exists/i.test(c), 'detects archive collisions');
  assert.ok(/ask the user/i.test(c), 'collision path asks the user');
  assert.ok(/writing nothing/i.test(c), 'collision path does not write');
  assert.ok(/status: archived/.test(c), 'sets status: archived');
  assert.ok(/archived_at/.test(c), 'adds archived_at');
  assert.ok(/requirements\/archive\//.test(c), 'moves to requirements/archive/');
  assert.ok(/归档需求/.test(c) && /archive requirement/i.test(c), 'multilingual triggers');
  assert.ok(/refuse/i.test(c), 'refuses when there is nothing to archive');
  assert.ok(/confirm it landed/i.test(c), 'confirms the archive write landed');
  assert.ok(/remove the source active doc/i.test(c), 'removes the source only after the archive write');

  const collisionIndex = c.search(/already exists/i);
  const writeIndex = c.search(/write the fully-updated archived content/i);
  const removeIndex = c.search(/remove the source active doc/i);
  assert.ok(collisionIndex >= 0 && writeIndex >= 0 && collisionIndex < writeIndex,
    'checks collision before writing the archive');
  assert.ok(writeIndex >= 0 && removeIndex >= 0 && writeIndex < removeIndex,
    'writes and confirms the archive before removing the source');
});

test('skill-behavior: xsk-check — diff review, hard stops, evidence gate, verify, stop', () => {
  const c = body(skills.find((s) => s.name === 'xsk-check'));
  assert.ok(/scope drift/i.test(c), 'checks scope drift');
  assert.ok(/hard stops/i.test(c), 'applies hard stops');
  assert.ok(/HIGH or CRITICAL/.test(c) && /exact file and line/.test(c), 'evidence-gated findings');
  assert.ok(/inherited stdio/.test(c), 'carries the captured-output hard stop (A+ distillation)');
  assert.ok(/regression test/.test(c), 'requires a regression test for bug fixes');
  assert.ok(/看看代码/.test(c) && /code review/i.test(c), 'multilingual triggers');
  assert.ok(/Do not merge, push/.test(c), 'stops without merging or pushing');
  assert.ok(!/persona-catalog|check-update|🥷|\.\.\//.test(c), 'no Waza-internal references');
});

test('skill-behavior: every skill carries name + description frontmatter and a stop point', () => {
  for (const s of skills) {
    const c = body(s);
    assert.ok(new RegExp(`^---\\nname: ${s.name}\\n`).test(c), `${s.name} name frontmatter`);
    assert.ok(/^description: .+/m.test(c), `${s.name} description frontmatter`);
    assert.ok(/stop|no further action|wait for approval|refuse/i.test(c),
      `${s.name} states a stop point`);
  }
});

test('skill-behavior: manual prose-review checklist is recorded (see file header)', () => {
  // This test exists to make the manual prose-review checklist visible in the
  // test report. It always passes; the review itself is human work documented
  // in the file header comment above.
  const checklist = [
    'reads naturally in the author voice',
    'no em-dash or en-dash where banned',
    'triggers stated as cues not incantations',
    'stop point is unambiguous',
    'no internal or Waza reference paths',
    'decisions that change implementation surface a question to the user',
  ];
  assert.ok(Array.isArray(checklist) && checklist.length >= 5, 'checklist recorded');
});

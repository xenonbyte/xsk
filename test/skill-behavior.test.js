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
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
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
  assert.ok(/xsk-execute-plan/.test(c), 'offers execute-plan handoff');
  assert.ok(/never an automatic invocation/.test(c), 'offer never auto-runs');
});

test('skill-behavior: xsk-think: routes only decision-complete work by execution shape', () => {
  const c = body(skills.find((s) => s.name === 'xsk-think'));
  assert.ok(
    /If any Open Questions remain,[\s\S]*?Do not show execution choices yet/.test(c),
    'unresolved questions remain in design without execution choices',
  );
  assert.ok(
    /pure judgment[\s\S]*?Do not show execution choices/.test(c),
    'pure judgments stop without execution choices',
  );
  assert.ok(
    /decision-complete executable plan with no Open Questions[\s\S]*?classify its execution shape/.test(c),
    'only ready executable plans reach execution-shape routing',
  );
  assert.ok(
    /one-file change, a single command, or other low-context work/.test(c),
    'one-file and single-command work recommends direct execution',
  );
  assert.ok(
    /only for decision-light work whose execution is context-heavy enough/.test(c),
    'context-heavy execution is the necessary condition for recommending execute-plan',
  );
  assert.ok(
    /Being multi-file or multi-step is a signal of that, never a substitute for it: two one-line edits in two files stay direct execution/.test(c),
    'file or step count alone does not route work to the executor',
  );
  assert.ok(
    /large, high-risk, cross-session work[\s\S]*?xsk-write-req[\s\S]*?Do not recommend the lightweight executor/.test(c),
    'large or high-risk work routes to a fuller workflow',
  );
  assert.ok(
    /present all three user choices: direct execution, `xsk-execute-plan`, or revise the design/.test(c),
    'ready lightweight work presents all three next actions',
  );
  assert.ok(/Label one choice as recommended/.test(c), 'routing labels a shape-based recommendation');
  assert.ok(/\*\*Next Action\*\*/.test(c), 'output names the next-action section');
  assert.ok(
    /Choosing `xsk-execute-plan` counts as an explicit invocation[\s\S]*?does not skip that skill's task-breakdown and acceptance confirmation gate/.test(c),
    'executor selection is explicit but retains its own confirmation gate',
  );
  assert.ok(/never an automatic invocation/.test(c), 'routing never auto-invokes an executor');
  assert.ok(
    /planning-only[\s\S]*?When the user picks direct execution, implementation continues outside this skill through the normal conversation/.test(c),
    'planning-only holds: direct execution runs outside this skill',
  );
  assert.ok(
    /What you are waiting for follows the routing below: answers to Open Questions, nothing at all after a pure judgment, or a next-action selection/.test(c),
    'the stop condition matches the routed outcome instead of always awaiting approval',
  );
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
  assert.ok(/Four platforms covered/.test(c), 'standard uses coverage-only platform wording');
  assert.ok(/User-invocable on every platform/.test(c), 'standard requires per-platform invocability');
  assert.ok(/currently implements that artifact for opencode/.test(c), 'standard limits current command artifact claim to opencode');
  assert.ok(!/Gemini through/.test(c), 'standard does not claim unimplemented Gemini command support');
  assert.ok(/Manifest-backed/.test(c), 'standard includes manifest safety');
  assert.ok(/content-hash modification detection/.test(c), 'standard includes content-hash detection');
  assert.ok(/markerless detection/.test(c), 'standard includes markerless detection');
  assert.ok(/Built from source/.test(c), 'standard requires built-from-source');
  assert.ok(/Test coverage spans the install surface/.test(c), 'standard requires install-surface test coverage');
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
  // No-dropped-content rule: deferred requirement content has no home (no backlog, single active
  // doc), so the doc must capture the full need rather than parking content as later/phase 2.
  assert.ok(/Completeness check/.test(c), 'self-audit includes a completeness check');
  assert.ok(/has no backlog/.test(c) && /lost when the doc is archived/.test(c),
    'states deferred content has no home and is lost on archive');
  assert.ok(/Do not split the need into now-versus-later/.test(c),
    'forbids splitting the need into now-versus-later');
  assert.ok(/no deferred requirement content/.test(c),
    'audit loop gates on zero deferred requirement content');
  // The completeness check flags a Scope-out entry only when it carries wanted work, so a genuine
  // non-goal boundary (allowed by step 4) is not flagged as dropped content.
  assert.ok(/a Scope-out entry that is really wanted work rather than a genuine non-goal/.test(c),
    'completeness check flags Scope-out only when it carries wanted work, not genuine non-goals');
  assert.ok(/写需求/.test(c) && /write a requirement/i.test(c), 'multilingual triggers');
  assert.ok(/git rev-parse --is-inside-work-tree/.test(c), 'gates the commit offer on a git repo');
  assert.ok(/ask the user once whether to commit/i.test(c), 'asks once before committing');
  assert.ok(/Track `\.xsk\/\.gitignore` as a path this run wrote when this step created it or appended the missing line/.test(c),
    'tracks .xsk/.gitignore when the archive rule is appended');
  assert.ok(/Build the commit path set from every path this run wrote: the requirement doc, plus `\.xsk\/\.gitignore` if step 3 created it or appended the missing line/.test(c),
    'write-req skip condition uses the full commit path set');
  // Pins the exact safe command: `git add` first (a bare `git commit -- <path>` rejects an
  // untracked new doc), then a path-limited commit so unrelated changes are never swept in.
  assert.ok(
    /git add -- <those paths> && git commit -m "docs\(xsk\): write requirement <slug>" -- <those paths>/.test(c),
    'stages explicit paths then path-limits the commit (works on a new untracked doc)',
  );
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
  assert.ok(/\.xsk\/requirements\/archive\/<slug>\.md/.test(c), 'uses the archive target path');
  assert.ok(/already exists/i.test(c), 'detects archive collisions');
  assert.ok(/ask the user/i.test(c), 'collision path asks the user');
  assert.ok(/writing nothing/i.test(c), 'collision path does not write');
  assert.ok(/status: archived/.test(c), 'sets status: archived');
  assert.ok(/archived_at/.test(c), 'adds archived_at');
  assert.ok(/\.xsk\/requirements\/archive\//.test(c), 'moves to .xsk/requirements/archive/');
  assert.ok(/归档需求/.test(c) && /archive requirement/i.test(c), 'multilingual triggers');
  assert.ok(/refuse/i.test(c), 'refuses when there is nothing to archive');
  assert.ok(/confirm it landed/i.test(c), 'confirms the archive write landed');
  assert.ok(/remove the source active doc/i.test(c), 'removes the source only after the archive write');
  assert.ok(/git ls-files --error-unmatch/.test(c), 'checks whether the active doc was git-tracked');
  assert.ok(/ask the user once whether to commit/i.test(c), 'asks once before committing the archival');
  assert.ok(
    /git add -- <the removed active doc path> && git commit -m "docs\(xsk\): archive requirement <slug>" -- <the removed active doc path>/.test(c),
    'stages the deletion then path-limits the commit',
  );

  const collisionIndex = c.search(/already exists/i);
  const writeIndex = c.search(/write the fully-updated archived content/i);
  const removeIndex = c.search(/remove the source active doc/i);
  assert.ok(collisionIndex >= 0 && writeIndex >= 0 && collisionIndex < writeIndex,
    'checks collision before writing the archive');
  assert.ok(writeIndex >= 0 && removeIndex >= 0 && writeIndex < removeIndex,
    'writes and confirms the archive before removing the source');
});

test('skill-behavior: xsk-check — review-only diff scope, hard stops, evidence gate, verify, stop', () => {
  const c = body(skills.find((s) => s.name === 'xsk-check'));
  assert.ok(
    /identify and report what is safe to fix/.test(c),
    'purpose identifies fixes without claiming to apply them',
  );
  assert.ok(!/fix what is safe to fix/.test(c), 'purpose does not contradict review-only behavior');
  assert.ok(/scope drift/i.test(c), 'checks scope drift');
  assert.ok(/hard stops/i.test(c), 'applies hard stops');
  assert.ok(/HIGH or CRITICAL/.test(c) && /exact file and line/.test(c), 'evidence-gated findings');
  assert.ok(/inherited stdio/.test(c), 'carries the captured-output hard stop (A+ distillation)');
  assert.ok(/regression test/.test(c), 'requires a regression test for bug fixes');
  assert.ok(
    /审查这次改动/.test(c) && /看一下这个 diff/.test(c) && /评审这个 PR/.test(c) && /合并前检查/.test(c),
    'Chinese triggers are scoped to an existing change',
  );
  assert.ok(
    /review these changes/.test(c) && /check this diff/.test(c) && /review this PR/.test(c) && /before merge/.test(c),
    'English triggers are scoped to an existing change',
  );
  assert.ok(!/是否需要优化/.test(c), 'does not claim generic optimization advisory intent');
  assert.ok(!/Fix or flag/.test(c), 'hard stops are flagged, not silently fixed during a review');
  assert.ok(
    /hard stops: how many found, and how many are still open/.test(c),
    'sign-off counts open hard stops rather than claiming fixes',
  );
  assert.ok(/Do not merge, push/.test(c), 'stops without merging or pushing');
  assert.ok(/Review-only by default/.test(c), 'defaults to review-only');
  assert.ok(/Do not modify files during a review/.test(c), 'does not edit files during a review');
  assert.ok(/apply them only when the user explicitly asks/i.test(c), 'applies mechanical fixes only on explicit request');
  assert.ok(!/persona-catalog|check-update|🥷|\.\.\//.test(c), 'no Waza-internal references');
});

test('skill-behavior: xsk-point: grounds first, decision-complete plan, persists to .xsk/points/', () => {
  const c = body(skills.find((s) => s.name === 'xsk-point'));
  assert.ok(/Research one aspect/.test(c), 'purpose stated');
  assert.ok(/decision-complete/.test(c), 'decision-complete requirement');
  assert.ok(/\.xsk\/points\//.test(c), 'persists to .xsk/points/');
  assert.ok(/status: researching/.test(c), 'uses status: researching');
  assert.ok(/status: ready/.test(c), 'promotes to status: ready');
  assert.ok(/status: dropped/.test(c), 'uses status: dropped on drop');
  assert.ok(/write-before-remove/.test(c), 'write-before-remove on drop');
  assert.ok(/研究一下/.test(c) && /spike this/.test(c), 'multilingual triggers');
  assert.ok(/\.xsk\/points\/archive\//.test(c), 'archives dropped points');
  assert.ok(/already exists/i.test(c), 'detects an archive collision on drop');
  assert.ok(/writing nothing/i.test(c), 'collision path writes nothing');
  // Persist-path commit offer mirrors xsk-write-req: git-gated, asks once, then a
  // staged path-limited commit so a new untracked doc commits and nothing else is swept in.
  assert.ok(/git rev-parse --is-inside-work-tree/.test(c), 'gates the commit offer on a git repo');
  assert.ok(/ask the user once whether to commit/i.test(c), 'asks once before committing');
  assert.ok(/Build the commit path set from every path this run wrote: the point document, plus `\.xsk\/\.gitignore` if step 5 created it or appended the missing line/.test(c),
    'point skip condition uses the full commit path set');
  assert.ok(
    /git add -- <those paths> && git commit -m "docs\(xsk\): research point <slug>" -- <those paths>/.test(c),
    'stages explicit paths then path-limits the commit (works on a new untracked doc)');
  // Drop-path commit offer uses the same path-set discipline: tracked source deletion plus
  // any .xsk/.gitignore change needed to keep archive copies ignored.
  assert.ok(/Build the drop commit path set from the recordable paths this run touched: the removed point source if git was tracking it, plus `\.xsk\/\.gitignore` if step 5 created it or appended the missing `points\/archive\/` line/.test(c),
    'drop commit includes .xsk/.gitignore when the archive ignore rule was created or appended');
  assert.ok(/intentionally not part of the drop commit path set/.test(c),
    'drop commit does not include ignored archive copies');
  assert.ok(/git ls-files --error-unmatch/.test(c), 'checks the dropped point was tracked');
  assert.ok(
    /git add -- <those paths> && git commit -m "docs\(xsk\): drop point <slug>" -- <those paths>/.test(c),
    'stages the deletion then path-limits the drop commit');
  // Stop at the document: research-and-persist only, never proposes or begins code.
  assert.ok(/only deliverable/i.test(c), 'point doc is the only deliverable');
  assert.ok(/begin any code change/i.test(c), 'does not begin code changes');
});

test('skill-behavior: xsk-consume-point: scans ready points, guards single-active req, hands off to xsk-write-req, archives consumed', () => {
  const c = body(skills.find((s) => s.name === 'xsk-consume-point'));
  assert.ok(/\.xsk\/points\//.test(c), 'reads from .xsk/points/');
  assert.ok(/no unarchived point has `status: ready`/.test(c), 'stops when no ready point exists');
  assert.ok(/Only points with `status: ready` may be selected/.test(c), 'limits selection to ready points');
  assert.ok(/researching` or otherwise non-ready point, stop without writing or archiving/.test(c),
    'blocks selecting researching points');
  assert.ok(!/status: researching` may be selected/.test(c), 'does not allow researching points to be selected');
  assert.ok(/re-read each selected point and confirm `status: ready`/.test(c), 'rechecks readiness before handoff');
  assert.ok(/xsk-write-req/.test(c), 'hands off to xsk-write-req');
  assert.ok(/single-active requirement/.test(c), 'guards the single-active requirement');
  assert.ok(/list the offending paths/i.test(c), 'lists offending paths');
  assert.ok(/broken invariant/i.test(c), 'reports the broken invariant');
  assert.ok(/status: consumed/.test(c), 'archives folded points as consumed');
  assert.ok(/write-before-remove/.test(c), 'write-before-remove when archiving');
  assert.ok(/consumed_at/.test(c), 'adds consumed_at to frontmatter');
  assert.ok(/already exists/i.test(c), 'detects an archive collision before overwriting');
  assert.ok(/rather than overwriting/i.test(c), 'does not overwrite an existing consumed archive');
  assert.ok(/ensure `\.xsk\/\.gitignore` contains the line `points\/archive\/`/.test(c),
    'ensures consumed archive copies are ignored before writing them');
  assert.ok(/把这些 point 变成需求/.test(c) && /consume points/.test(c), 'multilingual triggers');
  // One combined commit owns the whole fold: write-req's inline offer is suppressed during
  // the handoff, and consume-point commits the requirement doc plus the consumed-point removals.
  assert.ok(/suppress its commit offer/.test(c), 'suppresses xsk-write-req inline commit offer');
  assert.ok(/git rev-parse --is-inside-work-tree/.test(c), 'gates the consume commit on a git repo');
  assert.ok(/plus `\.xsk\/\.gitignore` if the suppressed `xsk-write-req` handoff created it or appended `requirements\/archive\/`/.test(c),
    'consume commit includes .xsk/.gitignore when the handoff creates or appends it');
  assert.ok(/or step 5 created it or appended `points\/archive\/`/.test(c),
    'consume commit includes .xsk/.gitignore when consumed archive ignore is created or appended');
  assert.ok(/Build the commit path set from the recordable paths this run touched/.test(c),
    'consume skip condition uses the full commit path set');
  assert.ok(/Do not include `\.xsk\/points\/archive\/<slug>\.md` archive copies in the commit path set/.test(c),
    'consume commit leaves ignored archive copies out of the path set');
  assert.ok(
    /git add -- <those paths> && git commit -m "docs\(xsk\): consume points into requirement <slug>" -- <those paths>/.test(c),
    'one combined commit stages explicit paths then path-limits the commit');
  // Guards the pathspec trap: a consumed point git never tracked is now deleted, so listing it
  // in `git add` would fail on an unmatched pathspec and abort the whole commit. Filter to tracked.
  assert.ok(/each removed `\.xsk\/points\/<slug>\.md` that git was tracking/.test(c),
    'combined consume commit includes only the removed points git was tracking');
  // Drop-rejected path mirrors xsk-point's drop commit offer.
  assert.ok(/build the drop commit path set from the removed source point if git was tracking it, plus `\.xsk\/\.gitignore` if this run created it or appended the missing `points\/archive\/` line/.test(c),
    'consume-rejected drop includes .xsk/.gitignore when the archive ignore rule was created or appended');
  assert.ok(/git ls-files --error-unmatch/.test(c), 'checks a dropped point was tracked');
  assert.ok(
    /git add -- <those paths> && git commit -m "docs\(xsk\): drop point <slug>" -- <those paths>/.test(c),
    'stages the deletion then path-limits the drop commit');
});

// xsk-execute-plan content contract.
//
// These assertions check what the generated document says, which is all a pure
// instruction skill can be tested for. They do not and cannot prove that an
// agent reading it behaves this way at runtime.
//
// One assertion per property, one pattern per assertion. Chaining patterns with
// && shrinks the assertion count without shrinking the contract, and hides
// which clause broke; splitting a property across several patterns pins prose
// rather than behavior. Both were tried here and both were wrong.
//
// The byte budgets are a product decision: this skill once reached 50757 bytes
// of forensic protocol, which is worse than useless in a skill whose job is to
// be cheap to load. Raising one is the same kind of decision, not a convenience
// value, and it belongs with a delivery note saying what the bytes bought or
// gave up.
//
// These caps deliberately rose from 13200/10200. The added bytes buy five
// safety guarantees: recovery refreshes repository rules; the runs ignore
// lands before the ledger; acceptance can persist interruptions; every
// verification command and post-fix rerun gets an immediate invariant check;
// and worktree exclusivity stays explicitly unverified. Each cap rounds the
// measured size up to the next hundred, leaving room for a typo fix and not a
// new mechanism.
const EXECUTE_PLAN_PACKED_MAX = 14100;
const EXECUTE_PLAN_BEHAVIOR_MAX = 11000;

test('skill-behavior: xsk-execute-plan: invocation and admission', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(/explicitly invoked only/.test(c), 'explicit invocation only');
  assert.ok(
    /Selection from `xsk-think` is an explicit invocation[\s\S]*?never bypasses this skill's task-breakdown and acceptance confirmation gate/.test(c),
    'the think handoff starts intake without skipping this skill gate',
  );
  assert.ok(
    /orchestrator, not an audit system[\s\S]*?requires a workspace where that proof is unnecessary/.test(c),
    'purpose claims orchestration, not forensic proof',
  );
  assert.ok(
    /`git rev-parse --is-inside-work-tree` and `git rev-parse --verify HEAD` both succeed/.test(c),
    'a committed Git baseline is required',
  );
  assert.ok(
    /With no content baseline this skill could never show that a pending edit survived, so a task could overwrite one and still pass every check/.test(c),
    'a fresh run needs a clean tree, and the text says which overwrite that prevents',
  );
  assert.ok(
    /If `\.xsk\/runs\/<slug>\.md` already exists, go straight to step 6/.test(c),
    'an existing ledger routes to recovery before admission can refuse it',
  );
  assert.ok(
    /Only whole-worktree cleanliness is admission-only/.test(c),
    'cleanliness is admission-only, so a run does not abort on its own writes',
  );
  assert.ok(
    /The rest are run-wide invariants: `HEAD` equal to `base`, an empty index, changes confined to the allowed and orchestration-owned paths, no forbidden action, no ignored-path deliverable\. Any of them breaking at any point sets `status: interrupted` and stops the run/.test(c),
    'the run-wide invariants are named once, and breaking one interrupts the run',
  );
  assert.ok(
    /Refuse with the remedy, not a bare stop/.test(c),
    'refusal names the way forward instead of only stopping',
  );
  assert.ok(/Never silently degrade into inline execution/.test(c), 'no silent fallback to inline execution');
});

test('skill-behavior: xsk-execute-plan: gate, ledger, and dispatch', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(
    /no parallel writers, no `commit`, `branch`, `stash`, `reset`, `merge`, or `rebase`, no remote or external mutation, no destructive or irreversible action, no platform permission prompt, and no new product decision/.test(c),
    'the out-of-scope actions are enumerated',
  );
  assert.ok(
    /Record it as a declaration and never report it as verified/.test(c),
    'exclusive use of the worktree is declared by the user, never reported as verified',
  );
  assert.ok(
    /Invariant checks catch only observable out-of-envelope changes; they cannot detect another writer editing a path already inside the allowed set, so exclusive worktree use remains an unverified premise throughout/.test(c),
    'scope checks do not turn the exclusivity premise into a verified claim',
  );
  assert.ok(
    /The ledger is a recovery log, not tamper-evident evidence and not a deliverable/.test(c),
    'the ledger claims recovery value only',
  );
  assert.ok(
    /declare it as an orchestration-owned path, since a path this skill writes without confirming would later read as scope drift against itself/.test(c),
    'the skill declares its own gitignore write instead of tripping on it',
  );
  assert.ok(
    /first write the `\.xsk\/\.gitignore` change[\s\S]*?If this write fails, stop before creating the ledger\. Then write `\.xsk\/runs\/<slug>\.md`/.test(c),
    'the runs ignore is installed before the ledger can become Git-visible',
  );
  assert.ok(
    /At every invariant check in steps 4-6, a broken invariant always permits an immediate ledger write of `status: interrupted`, including during acceptance; write it before stopping/.test(c),
    'every invariant check can persist an interruption before stopping',
  );
  assert.ok(
    /Per task, check the run-wide invariants twice: before writing `in-flight`, and again when the subagent returns/.test(c),
    'each task is bracketed by the invariant check on both sides',
  );
  assert.ok(
    /record two separately sourced facts, never merged into one claim: the paths the subagent reported, and the Git-visible changes now observable/.test(c),
    'reported paths and observed changes stay separate facts',
  );
  assert.ok(
    /A task that ends `failed` sets `status: failed` and blocks its dependents/.test(c),
    'a failed task ends the run and blocks its dependents',
  );
  assert.ok(/Between tasks there is no code review and no acceptance run/.test(c), 'no per-task review');
  assert.ok(
    /Require nothing else back: no diff, no file contents, no task restatement/.test(c),
    'the implementer return is bounded below file contents',
  );
  assert.ok(
    /For each task-acceptance check, report its final run after the task's last write and exit result/.test(c),
    'only the final run of each acceptance check, taken after the last write, counts',
  );
  assert.ok(
    /or `not run` and why/.test(c),
    'a check that was not run is reported as such, with a reason',
  );
  assert.ok(
    /an omitted check becomes `not run: not reported`/.test(c),
    'an unreported check is marked rather than silently dropped',
  );
  assert.ok(
    /any failed final check[\s\S]*?makes the task `failed`/.test(c),
    'a failing final check fails the task',
  );
  assert.ok(
    /missing or malformed task result makes the task `failed`/.test(c),
    'an unusable task result fails the task instead of passing as done',
  );
  assert.ok(
    /Otherwise write `done` and keep the check evidence for step 7/.test(c),
    'the remaining returns write `done` and carry their check evidence to the report',
  );
  assert.ok(
    /for step 5's bounded fix/.test(c),
    'the ledger write boundary admits the one bounded fix',
  );
});

test('skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(
    /fresh reviewer that implemented no task and modifies no files/.test(c),
    'acceptance uses an independent, non-writing reviewer',
  );
  assert.ok(
    /read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review/.test(c),
    'review material covers the paths a plain diff hides',
  );
  assert.ok(
    /Allow at most one bounded fix[\s\S]*?Only a `done` fix reruns all commands and the reviewer once; never loop/.test(c),
    'fixes are bounded and fully revalidated',
  );
  assert.ok(
    /functional acceptance not run[\s\S]*?zero gates must never look verified/.test(c),
    'a run with no gates never looks verified',
  );
  assert.ok(
    /Immediately after each command, before running the next, re-check the invariants[\s\S]*?Apply the same per-command check to every post-fix rerun/.test(c),
    'every verification command and post-fix rerun is followed immediately by an invariant check',
  );
  assert.ok(
    /Route on status first\. A `done`, `failed`, or `interrupted` ledger is history[\s\S]*?Only a `running` ledger, left by a session that ended mid-run, is resumable/.test(c),
    'every ledger state has exactly one recovery route',
  );
  assert.ok(
    /Starting over means retiring the ledger and re-entering step 1 for full admission and a fresh gate, never a shortcut from here/.test(c),
    'a rerun re-enters admission instead of overwriting the ledger in place',
  );
  assert.ok(
    /Before any redispatch, repeat step 1's brief scan of `CLAUDE\.md`, `AGENTS\.md`, and repo rules\. The ledger does not preserve these constraints, so refresh the applicable hard rules in each pending-task prompt/.test(c),
    'recovery refreshes repository hard rules before pending tasks are redispatched',
  );
  assert.ok(
    /Never re-dispatch it and never infer what it did: set the run to `interrupted` and stop/.test(c),
    'an in-flight task is never re-dispatched or attributed',
  );
  assert.ok(
    /a matching slug is not proof of a matching request/.test(c),
    'resume confirms the work itself, not just the slug',
  );
  assert.ok(
    /First write the acceptance results and the final `status` into the ledger[\s\S]*?never report a terminal outcome before that write lands/.test(c),
    'the terminal status reaches disk before it is reported',
  );
  assert.ok(
    c.includes('"Ignored paths were not scanned: side effects there are outside this report."'),
    'the report carries a fixed line naming what was not checked',
  );
  assert.ok(/Do not commit, push, or publish unless the user asks/.test(c), 'stops without committing');
  assert.ok(
    /diff against `base` itself/.test(c),
    'the reviewer takes the tracked diff itself instead of being handed one',
  );
  assert.ok(
    !/the diff against `base`/.test(c),
    'no diff body is relayed through this conversation',
  );
  assert.ok(
    /Require exactly `no concerns` when clean/.test(c),
    'a clean review has one exact wording',
  );
  assert.ok(
    /each naming what is wrong and identifying one or more affected paths or an acceptance criterion, without quoting file contents/.test(c),
    'a concern names the fault and where it lands without quoting file contents',
  );
  assert.ok(
    /Empty or malformed review makes acceptance `failed`; dispatch no fix/.test(c),
    'an unusable review fails acceptance and dispatches no fix',
  );
  assert.ok(
    /A valid concern or command failure is a functional failure/.test(c),
    'only a valid concern or a failing command counts as a functional failure',
  );
  assert.ok(
    /only inside the confirmed envelope; otherwise set the run to `failed` without dispatch/.test(c),
    'a fix never widens the confirmed envelope',
  );
  assert.ok(
    /Append it to the ledger as the run's one fix/.test(c),
    'the one-fix allowance is recorded on the ledger, so recovery can read it',
  );
  assert.ok(
    /an ordinary serial task under every step 4 rule/.test(c),
    'the fix inherits every step 4 task rule',
  );
  assert.ok(
    /each failing command with its exit result, but no command output; it re-reads code and reruns them for diagnostics/.test(c),
    'the fixer gets commands and exit results, then reruns them for its own diagnostics',
  );
  assert.ok(
    /A failed fix goes to step 7/.test(c),
    'a failed fix ends the run instead of buying another pass',
  );
});

test('skill-behavior: xsk-execute-plan: stays inside its byte budget', () => {
  // Measured in UTF-8 bytes, matching the units the budget is written in.
  // String.length would count UTF-16 code units instead.
  const packed = Buffer.byteLength(
    buildSkill(skills.find((s) => s.name === 'xsk-execute-plan')).content,
    'utf8',
  );
  const behavior = readFileSync(
    join(__dirname, '..', 'templates', 'fragments', 'execute-plan.behavior.md'),
  ).length;
  assert.ok(
    packed <= EXECUTE_PLAN_PACKED_MAX,
    `packed skill is ${packed} bytes, over the ${EXECUTE_PLAN_PACKED_MAX} budget: drop a guarantee or raise the cap deliberately`,
  );
  assert.ok(
    behavior <= EXECUTE_PLAN_BEHAVIOR_MAX,
    `behavior fragment is ${behavior} bytes, over the ${EXECUTE_PLAN_BEHAVIOR_MAX} budget: drop a guarantee or raise the cap deliberately`,
  );
});

test('skill-behavior: xsk-execute-plan: retired forensic mechanisms do not return', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  // Only unambiguous mechanism names are banned. Ordinary phrases such as
  // "repository-wide" stay legal, because the document may need to say what it
  // does not do.
  for (const mechanism of [
    'anchor-v1',
    'JCS',
    'path-state-v1',
    'directory-manifest-v1',
    'xsk-execute-plan-input-v1',
    'acceptance fingerprint',
    'prior-run carryover',
    'reconciled HEAD',
  ]) {
    assert.ok(!c.includes(mechanism), `retired mechanism "${mechanism}" is absent`);
  }
  assert.ok(!/actual touched paths/.test(c), 'no attribution language returns');
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

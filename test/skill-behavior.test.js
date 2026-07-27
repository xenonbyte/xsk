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
// The byte budgets below are a product decision: this skill once reached 50757
// bytes of forensic protocol, which is worse than useless in a skill whose job
// is to be cheap to load. Raising a cap is the same kind of decision, not a
// convenience, and belongs in a commit that says which guarantee it buys.
//
// Raised twice, both times to buy fixes for defects a review found in an earlier
// orchestrator draft, never for comfort.
//
// 12000/8500 to 12500/9500: a clean-worktree requirement replacing the
// non-overlap rule that let a task silently overwrite a pending user edit, a
// pre-dispatch check closing the gate-to-first-task window, closed transitions
// for task failure and mid-run hard stops, and review material that includes
// untracked paths a plain diff omits.
//
// 12500/9500 to 13500/10500: the clean-worktree rule above had made recovery
// unreachable and aborted every run after its first task, since a running task
// necessarily dirties the worktree. Admission now runs only for a fresh run, an
// existing ledger routes straight to recovery, the mid-run rule covers only the
// forbidden actions, a failed task ends the run, and every ledger state has one
// recovery route.
const EXECUTE_PLAN_PACKED_MAX = 13500;
const EXECUTE_PLAN_BEHAVIOR_MAX = 10500;

test('skill-behavior: xsk-execute-plan: invocation and eligibility', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(/explicitly invoked only/.test(c) && /never self-triggers/.test(c), 'explicit invocation only');
  assert.ok(
    /Selection from `xsk-think` is an explicit invocation[\s\S]*?never bypasses this skill's task-breakdown and acceptance confirmation gate/.test(c),
    'the think handoff starts intake without skipping this skill gate',
  );
  assert.ok(
    /orchestrator, not an audit system[\s\S]*?requires a workspace where that proof is unnecessary/.test(c),
    'purpose claims orchestration, not forensic proof',
  );
  assert.ok(
    /`git rev-parse --is-inside-work-tree` and `git rev-parse --verify HEAD` both succeed[\s\S]*?never invent a base commit/.test(c),
    'a committed Git baseline is required and never invented',
  );
  assert.ok(
    /`git diff --cached --quiet` succeeds, so nothing is staged/.test(c) &&
      /`git status --porcelain=v1 --untracked-files=all` is empty\./.test(c) &&
      /With no content baseline this skill could never show that a pending edit survived, so a task could overwrite one and still pass every check/.test(c),
    'a fresh run needs a clean tree and unstaged index, and says which overwrite that prevents',
  );
  assert.ok(
    /If `\.xsk\/runs\/<slug>\.md` already exists, go straight to step 6: recovery has its own entry conditions/.test(c),
    'an existing ledger routes to recovery before the clean-tree admission can refuse it',
  );
  assert.ok(
    /The clean-worktree and unstaged-index conditions are admission only[\s\S]*?treating that as a broken precondition would abort every run after its first task/.test(c),
    'admission conditions are not re-applied mid-run against the run own writes',
  );
  assert.ok(
    /Refuse with the remedy, not a bare stop: commit or stash the pending changes, run it directly, or move to a fuller workflow/.test(c) &&
      /Never silently degrade into inline execution/.test(c),
    'refusal names the way forward and never degrades to inline execution',
  );
});

test('skill-behavior: xsk-execute-plan: safety boundary, gate, and ledger', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(
    /no parallel writers, no `commit`, `branch`, `stash`, `reset`, `merge`, or `rebase`, no remote or external mutation, no destructive or irreversible action, no platform permission prompt, and no new product decision/.test(c),
    'the out-of-scope actions are enumerated as hard stops',
  );
  assert.ok(
    /No deliverable and no user data needing protection lives on a Git-ignored path/.test(c),
    'ignored paths cannot hold deliverables or protected data',
  );
  assert.ok(
    /The last two conditions hold all run: if a forbidden action or an ignored-path deliverable turns up once tasks are under way, set the run to `interrupted` and hand back, since this run never authorizes them/.test(c),
    'a forbidden action found mid-run ends the run instead of being authorized',
  );
  assert.ok(
    /Ask at the same time for the one condition no command can check: that nobody, the user included, writes to this worktree while the run proceeds\. Record it as a declaration and never report it as verified/.test(c),
    'exclusivity is a user declaration, never reported as verified',
  );
  assert.ok(
    /Exclusive worktree: declared by user, not verified/.test(c) &&
      /status: running \| done \| failed \| interrupted/.test(c) &&
      /\[pending\|in-flight\|done\|failed\]/.test(c),
    'the ledger fixes both state sets and records exclusivity as declared',
  );
  assert.ok(
    /The ledger is a recovery log, not tamper-evident evidence and not a deliverable: never offer to commit it/.test(c),
    'the ledger claims recovery value only',
  );
  assert.ok(
    /never overwrite an existing one/.test(c) && /`runs\/`/.test(c),
    'gitignore handling stays append-only',
  );
});

test('skill-behavior: xsk-execute-plan: orchestration, acceptance, recovery, and reporting', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(
    /isolated from the main conversation's context, not from one another's filesystem, so run one task at a time in dependency order/.test(c) &&
      /Per task, check twice: before writing `in-flight`, and again when the subagent returns\. Both times confirm that `HEAD` still equals `base`, that nothing is staged, and that the changed paths stay inside the allowed and orchestration-owned sets/.test(c) &&
      /The pre-dispatch check matters most before the first task, since the gate may have been confirmed long before it/.test(c),
    'tasks run serially, bracketed by the same three checks, with the gate-to-first-dispatch window named',
  );
  assert.ok(
    /A task that ends `failed` sets `status: failed` and blocks its dependents: leave those `pending`, go to step 7, and report which were blocked\. That ledger is then history, so redoing the work means a fresh run/.test(c),
    'a failed task ends the run and blocks its dependents',
  );
  assert.ok(
    /declare it as an orchestration-owned path, since a path this skill writes without confirming would later read as scope drift against itself/.test(c) &&
      /wrote nothing outside the allowed and orchestration-owned paths/.test(c),
    'the skill declares its own gitignore write and honors it through acceptance',
  );
  assert.ok(
    /record two separately sourced facts, never merged into one claim: the paths the subagent reported, and the Git-visible changes now observable/.test(c),
    'reported paths and observed changes stay separate facts',
  );
  assert.ok(
    /report what was observed, keep the worktree as it is, never revert or restore anything, and ask how to proceed/.test(c),
    'a broken precondition stops the run without touching the worktree',
  );
  assert.ok(/Between tasks there is no code review and no acceptance run/.test(c), 'no per-task review');
  assert.ok(
    /fresh reviewer that implemented no task and modifies no files/.test(c) &&
      /tell it to read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; deletions and type changes are already in that diff/.test(c),
    'an independent non-writing reviewer sees the paths a plain diff hides',
  );
  assert.ok(
    /Allow at most one bounded fix as an ordinary serial task, then rerun the commands and the reviewer once; never loop/.test(c) &&
      /functional acceptance not run[\s\S]*?must never look like `pass`[\s\S]*?zero gates must never look verified/.test(c),
    'fixes are bounded and revalidated, and a run with no gates never looks verified',
  );
  assert.ok(
    /warning-level, never a gate/.test(c) && /at most 2 rounds by default/.test(c),
    'UI fidelity stays advisory and bounded',
  );
  assert.ok(
    /Route on status first\. A `done` or `failed` ledger is history[\s\S]*?Only a `running` ledger, left by a session that ended mid-run, is resumable/.test(c),
    'every ledger state has exactly one recovery route',
  );
  assert.ok(
    /Never re-dispatch it and never infer what it did: set the run to `interrupted` and stop/.test(c) &&
      /From `interrupted` the only routes are[\s\S]*?starting a fresh run that overwrites the ledger after confirmation, or retiring the ledger outright/.test(c),
    'an in-flight task is never re-dispatched, and interrupted has defined exits',
  );
  assert.ok(
    /a matching slug is not proof of a matching request/.test(c) &&
      /always re-run full acceptance/.test(c) &&
      /never skip execution or acceptance on its word/.test(c),
    'resume confirms the work itself and never inherits an earlier verdict',
  );
  assert.ok(
    /dispatch only the pending tasks whose dependencies are all `done`, leaving anything downstream of a `failed` task blocked/.test(c),
    'recovery does not run work that depends on a failed task',
  );
  assert.ok(
    c.includes('"Ignored paths were not scanned: side effects there are outside this report."') &&
      /Do not commit, push, or publish unless the user asks/.test(c),
    'the report names what was not checked, and the run stops without committing',
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

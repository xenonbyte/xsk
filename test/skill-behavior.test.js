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

test('skill-behavior: xsk-execute-plan — explicit-only, ledger, isolated dispatch, unified two-tier acceptance', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(/explicitly invoked only/.test(c), 'explicit invocation only');
  assert.ok(/never self-triggers/.test(c), 'no self-trigger on execution intent');
  assert.ok(
    /user's selection of the `xsk-execute-plan` next action offered by `xsk-think`/.test(c),
    'think handoff counts as a direct explicit request',
  );
  assert.ok(
    /Selection from `xsk-think` is an explicit invocation[\s\S]*?never means immediate task dispatch[\s\S]*?never bypasses this skill's task-breakdown and acceptance confirmation gate/.test(c),
    'think handoff starts intake without bypassing the execution envelope gate',
  );
  assert.ok(/simple to decide but heavy to execute/.test(c), 'fit criterion');
  assert.ok(/cheaper done inline/.test(c), 'inline counter-example');
  assert.ok(/ordered task list/.test(c) && /acceptance criteria before anything executes/.test(c), 'decompose then acceptance first');
  assert.ok(/\.xsk\/runs\//.test(c), 'ledger path');
  assert.ok(/never overwrite an existing `\.xsk\/\.gitignore`/.test(c), 'gitignore append-only discipline');
  assert.ok(/self-contained prompt/.test(c), 'self-contained subagent dispatch');
  assert.ok(/self-contained enough to re-dispatch/.test(c), 'ledger tasks re-dispatchable');
  assert.ok(/footprints do not overlap/.test(c), 'parallel only when write footprints disjoint');
  assert.ok(/no code review and no acceptance run/.test(c), 'no per-task code review');
  assert.ok(/only unfinished tasks/.test(c) && /pending or failed/.test(c), 'resume semantics');
  assert.ok(/functional acceptance not run/.test(c), 'zero-gate run labeled prominently');
  assert.ok(/warning-level, never a gate/.test(c), 'UI acceptance warning-level');
  assert.ok(/UI acceptance skipped/.test(c), 'unrenderable UI skips without failing');
  assert.ok(/at most 2 rounds/.test(c), 'bounded UI fix rounds');
  assert.ok(/never fails the run/.test(c), 'UI residual never fails the run');
  assert.ok(/After the last UI fix round that changed files, rerun/.test(c), 'UI fixes trigger final functional revalidation');
  assert.ok(/discard any earlier functional result/.test(c), 'stale functional result cannot determine final status');
  assert.ok(/The final `done` or `failed` comes from the latest functional acceptance/.test(c), 'latest functional result determines final status');
  assert.ok(
    /Fill `## Result`:[\s\S]*?each acceptance criterion's `pass`, `fail`, or `skipped` status \(with the reason when skipped\)/.test(c),
    'behavior result represents skipped checks with reasons',
  );
  assert.ok(
    /acceptance report with each criterion's `pass`, `fail`, or `skipped` status \(including a reason for `skipped`\)/.test(c),
    'output result represents skipped checks with reasons',
  );
  assert.ok(/`skipped` is non-failing but must never look like `pass`/.test(c), 'skipped remains honest and non-failing');
  assert.ok(/Do not commit, push/.test(c), 'stops without committing');
});

test('skill-behavior: xsk-execute-plan: capability gate and recovery preserve worktree state', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  const capabilityIndex = c.indexOf('verify that the current harness can dispatch at least one subagent');
  const gitWorktreeIndex = c.indexOf('git rev-parse --is-inside-work-tree');
  const gitHeadIndex = c.indexOf('git rev-parse --verify HEAD');
  const recoveryIndex = c.indexOf('First resolve the candidate input identity');
  const ledgerIndex = c.indexOf('Only after the normal gate passes, write the run ledger');
  assert.ok(
    capabilityIndex >= 0 && ledgerIndex >= 0 && capabilityIndex < ledgerIndex,
    'checks writable-workspace subagent capability before writing the ledger',
  );
  assert.ok(
    recoveryIndex >= 0 && capabilityIndex < recoveryIndex,
    'checks capability before spending a recovery question the run cannot act on',
  );
  assert.ok(
    gitWorktreeIndex >= 0
      && gitHeadIndex >= 0
      && gitWorktreeIndex < recoveryIndex
      && gitHeadIndex < recoveryIndex
      && gitHeadIndex < ledgerIndex,
    'requires a Git worktree with a valid HEAD before recovery or ledger creation',
  );
  assert.ok(
    /If the workspace is not a Git worktree or has no valid `HEAD` commit,[\s\S]*?stop without writing anything/.test(c),
    'non-Git and unborn repositories fail explicitly before writes',
  );
  assert.ok(
    /record the full current `HEAD` object ID as both the immutable original base commit and the initial last reconciled `HEAD`/.test(c),
    'records an immutable acceptance base and a separate movement cursor',
  );
  assert.ok(
    /Re-run `git rev-parse --verify HEAD` immediately before every task dispatch, after every subagent returns before attributing its writes, before unified acceptance, and immediately before writing the final fingerprint/.test(c),
    'the committed baseline is rechecked across the full execution timeline',
  );
  const intervalIndex = c.indexOf(
    'Before accepting the movement or updating the last reconciled `HEAD`, enumerate and record',
  );
  const advanceIndex = c.indexOf('Only after the complete interval is reconciled');
  assert.ok(
    intervalIndex >= 0 && advanceIndex > intervalIndex,
    'reconciles the complete commit interval before advancing the HEAD cursor',
  );
  assert.ok(
    /each commit's complete parent-relative changed-path record,[\s\S]*?paths changed and later reverted inside the interval/.test(c),
    'commit-range evidence cannot hide transient committed paths',
  );
  assert.ok(
    /Reconcile every committed path through the same allowed-path, scope-drift, dirty-overlap preservation, and user-ownership rules as task output[\s\S]*?A clean worktree after a commit is not evidence that the interval was in scope/.test(c),
    'committed paths receive full attribution and scope checks',
  );
  assert.ok(
    /Advancing the movement cursor never advances the acceptance baseline:[\s\S]*?remain anchored to the immutable original base[\s\S]*?bind the final reconciled `HEAD`/.test(c),
    'acceptance remains anchored to the run-start commit',
  );
  assert.ok(
    /When the last reconciled `HEAD` is no longer an ancestor,[\s\S]*?keep any returned task nonterminal with repository-movement ambiguity/.test(c),
    'rewritten history blocks attribution without fabricating a terminal task state',
  );
  assert.ok(
    /If writable-workspace subagent dispatch or that store is unavailable, stop before offering a recovery choice or writing a ledger/.test(c),
    'missing execution or anchor capability stops before recovery and ledger creation',
  );
  assert.ok(
    /Do not require or claim that it is write-protected from subagents or project commands[\s\S]*?they run as the same user with the same filesystem access, so no such boundary exists to ask for/.test(c),
    'the anchor store does not assert a write boundary the runtime cannot provide',
  );
  assert.ok(
    /the hash chain below detects accidental divergence, interrupted writes, and inconsistent state[\s\S]*?Neither detects deliberate tampering by anything that has write access, and neither may be reported as if it did/.test(c),
    'the anchor states what it actually proves and what it does not',
  );
  assert.ok(
    /durable evidence-anchor store for the main workflow, kept outside the Git worktree, addressable by repository identity and run slug without trusting the workspace ledger, and able to survive context compaction and session recovery/.test(c),
    'recovery evidence has durable storage addressable without the workspace ledger',
  );
  assert.ok(
    /These are one-time capability checks, not preconditions re-tested before each ledger line/.test(c),
    'capabilities are checked once, not before every ledger update',
  );
  assert.ok(
    /Never silently degrade `xsk-execute-plan` into inline execution/.test(c),
    'missing capability never falls back to silent inline execution',
  );
  assert.ok(
    /If any replacement `source`, goal, or complete plan or request text is supplied,[\s\S]*?never substitute the persisted preimage/.test(c),
    'replacement input is always recomputed rather than filled from old evidence',
  );
  assert.ok(
    /explicitly selects this existing run and asks only to resume or reuse it without supplying replacement input,[\s\S]*?verify the persisted input preimage[\s\S]*?use those exact saved bytes as the candidate/.test(c),
    'compacted sessions can resume from the anchored confirmed input',
  );
  assert.ok(
    /missing, unreadable, length-mismatched, digest-mismatched, or unanchored input preimage makes resume and reuse unavailable/.test(c),
    'invalid persisted input evidence fails closed',
  );
  assert.ok(
    /With `status: running` or `status: failed`, compare the resolved candidate input identity with the recorded one before offering resume/.test(c),
    'running and failed runs compare a reproducible candidate identity before resume',
  );
  assert.ok(
    /Only an exact match may offer the user resume or restart/.test(c),
    'only matching input identity reaches the resume choice',
  );
  assert.ok(
    /If it differs or uses an unrecognized scheme, resume is unavailable:[\s\S]*?offer only restart[\s\S]*?explicitly confirmed through steps 3 and 4 before any old task can be dispatched/.test(c),
    'changed or unverifiable input requires restart and reconfirmation',
  );
  assert.ok(
    /On a matching resume, continue from the current worktree[\s\S]*?keep `done` tasks[\s\S]*?only unfinished tasks whose state is pending or failed/.test(c),
    'resume keeps done work and dispatches unfinished tasks only',
  );
  assert.ok(
    /If all tasks are terminal, resume at unified acceptance and reporting/.test(c),
    'all-terminal running runs resume at acceptance and reporting',
  );
  assert.ok(
    /Restart uses the current worktree without reset or rollback/.test(c),
    'restart preserves the current workspace',
  );
  assert.ok(
    /compare every old actual-touched path's current state with its most recent anchored terminal `done` or `failed` fingerprint/.test(c),
    'restart checks old terminal ownership evidence',
  );
  assert.ok(
    /An exact match retains prior-run-output attribution[\s\S]*?select exactly which matching prior-run output paths the restarted run may supersede/.test(c),
    'restart carries only explicitly selected old outputs',
  );
  assert.ok(
    /never transfers ownership of pre-run dirty or ignored content[\s\S]*?carried dirty-overlap preservation reference/.test(c),
    'restart selection preserves original user ownership',
  );
  assert.ok(
    /A missing or mismatching terminal fingerprint makes the checkpoint-to-restart difference user state or ambiguity[\s\S]*?never include it in the supersede selection/.test(c),
    'restart protects post-checkpoint user changes',
  );
  assert.ok(
    /Persist the carryover record[\s\S]*?under a new anchored run generation before replacing the old workspace artifacts/.test(c),
    'restart persists provenance before replacing old evidence',
  );
  assert.ok(
    /With `status: done`, compare exactly two identities, both recomputed from anchored material that still exists/.test(c),
    'reusing a done ledger starts by identifying the current input and workspace',
  );
  assert.ok(
    /a freshly computed workspace fingerprint against the one recorded in `## Result`, matching the exact path set as well as every path-state fingerprint/.test(c),
    'reuse revalidates the workspace against the recorded fingerprint',
  );
  assert.ok(
    /Only when both identities and the protected evidence anchor match may reuse without dispatch be offered alongside a new run/.test(c),
    'reuse requires the input identity, workspace fingerprint, and evidence anchor to match',
  );
  assert.ok(
    /A run with incomplete ignored-path coverage has no acceptance fingerprint and is never eligible for reuse[\s\S]*?cannot reconstruct the missing pre-run ignored state, produce a verified fingerprint, or promote that run to verified/.test(c),
    'fresh checks cannot upgrade a run whose hidden ignored baseline never existed',
  );
  assert.ok(
    /When the input identity differs, is missing, or cannot be reproduced through the supplied replacement input or verified persisted preimage,[\s\S]*?offer only a new run with a newly confirmed envelope/.test(c),
    'changed execution input cannot reuse old acceptance against an unchanged worktree',
  );
  assert.ok(
    /the old task outputs do not prove that a revised plan was implemented/.test(c),
    'revised input cannot take an acceptance-only shortcut',
  );
  assert.ok(
    /When the input identity matches but the workspace fingerprint differs or is missing,[\s\S]*?fresh unified acceptance against the current state may be offered/.test(c),
    'acceptance-only revalidation is limited to an unchanged plan on a moved workspace',
  );
  assert.ok(
    /present the old result as history only[\s\S]*?must never be reported as verified/.test(c),
    'a stale or incomplete done result is history, not a verified conclusion',
  );
  assert.ok(
    /A `done` run whose result was already reported and consumed may instead be retired by deleting its workspace artifacts and protected anchor in one explicit retirement operation/.test(c),
    'a reported done run has a sanctioned retirement path',
  );
  assert.ok(/A prior `failed` run is never overwritten silently/.test(c), 'failed ledgers are not silently replaced');
  assert.ok(
    /A resume reuses the execution envelope recorded in the ledger, including its pre-existing dirty-path baseline/.test(c),
    'resume reuses the recorded envelope instead of recapturing a polluted baseline',
  );
  assert.ok(
    /recapturing that baseline would misread them as the user's work/.test(c),
    'explains why a resumed run must not recapture dirty paths',
  );
  assert.ok(
    /A missing or invalid original base, reconciled-HEAD receipt, dirty-overlap baseline, companion artifact, input identity or preimage, evidence anchor, or required terminal output checkpoint cannot be reconstructed from the current worktree during resume/.test(c),
    'resume never recreates historical provenance from a worktree containing run output',
  );
  assert.ok(
    /missing ignored-state baseline, coverage record, or acceptance-command checkpoint needed to attribute post-command writes/.test(c),
    'resume also requires ignored-state and command-write provenance',
  );
  assert.ok(
    /Report the affected paths as ambiguous and require explicit resolution or restart; never recapture current state and call it the original baseline/.test(c),
    'missing recovery evidence fails closed instead of being recaptured',
  );
  assert.ok(
    /A restart follows the carryover procedure above and rebuilds and re-confirms the envelope/.test(c),
    'restart re-confirms a fresh envelope without discarding proven carryover',
  );
});

test('skill-behavior: xsk-execute-plan: write-ahead ledger and fingerprints survive an interruption', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(
    /\[pending\|in-flight\|reconciling\|done\|failed\] \(attempt <n>\)/.test(c),
    'the ledger tracks dispatch, reconciliation, terminal states, and an attempt number',
  );
  assert.ok(
    /The ledger is write-ahead:[\s\S]*?same anchored write that sets a task's line to `in-flight` with its attempt number,[\s\S]*?record path-state fingerprints for its complete footprint, the current Git changed-path inventory, and the current ignored-state checkpoint, then dispatch it/.test(c),
    'task state and attempt-start evidence are persisted before dispatch',
  );
  assert.ok(
    /Recording only a terminal state after a task finishes would let an interruption between return and reconciliation leave unresolved work looking complete/.test(c),
    'the write-ahead rule names the premature-completion hazard it closes',
  );
  assert.ok(
    /A task left at `in-flight` was dispatched and never reported back[\s\S]*?never re-dispatch it blind/.test(c),
    'an in-flight task is never blindly re-dispatched on resume',
  );
  assert.ok(
    /ask the user whether to re-dispatch it as the next attempt, move the existing state to `reconciling`, or fail it after reconciliation/.test(c),
    'in-flight recovery never promotes existing state directly to done',
  );
  assert.ok(
    /A task left at `reconciling` has returned and must not be re-dispatched:[\s\S]*?continue its incomplete touched-path, preservation, and scope decisions[\s\S]*?never enter unified acceptance while any task remains `reconciling`/.test(c),
    'resume completes returned-task reconciliation before dispatch or acceptance',
  );
  assert.ok(
    /first post-return checkpoint changes only `in-flight` to `reconciling`[\s\S]*?reported outcome and compact result, current Git changed-path inventory, current covered ignored scan, and observable fingerprints/.test(c),
    'the first returned-task checkpoint is durable but nonterminal',
  );
  assert.ok(
    /`reconciling` is nonterminal and blocks dependent dispatch and unified acceptance/.test(c),
    'reconciliation blocks dependents and acceptance',
  );
  assert.ok(
    /`xsk-execute-plan-path-state-v1:sha256:<64 lowercase hexadecimal characters>`/.test(c),
    'path-state fingerprints have a versioned identity',
  );
  assert.ok(
    /RFC 8785 JSON Canonicalization Scheme \(JCS\), encoded as UTF-8 without a BOM,[\s\S]*?hashed by an executed SHA-256 implementation/.test(c),
    'path-state serialization and hashing are canonical',
  );
  assert.ok(
    c.includes(
      '{"git_object_format":"sha1","index":[],"path":"relative/path","schema":"xsk-execute-plan-path-state-v1","worktree":{"kind":"absent"}}',
    ),
    'path state has one literal top-level schema and absent tombstone',
  );
  assert.ok(
    c.includes('{"mode":"100644","oid":"<lowercase hexadecimal object ID>","stage":0}'),
    'index entries have fixed literal keys and scalar encodings',
  );
  assert.ok(
    /Every displayed key is mandatory, including the empty index tombstone, and no undisplayed key is allowed/.test(c),
    'path-state records cannot add, omit, or rename keys',
  );
  assert.ok(
    /Git status, rename, and copy records may discover candidate paths only:[\s\S]*?no derived status field enters this preimage[\s\S]*?fingerprint both sides of a discovered rename or copy as separate paths/.test(c),
    'path-state digests do not depend on local Git status configuration',
  );
  assert.deepEqual(
    [
      '{"kind":"absent"}',
      '{"byte_length":0,"kind":"regular","mode":"100644","sha256":"<64 lowercase hexadecimal characters>"}',
      '{"kind":"symlink","mode":"120777","target_base64":"<RFC 4648 base64 with padding>"}',
      '{"kind":"directory","manifest":"xsk-execute-plan-directory-manifest-v1:sha256:<64 lowercase hexadecimal characters>","mode":"040755"}',
    ].map((shape) => c.includes(shape)),
    [true, true, true, true],
    'every worktree variant has a fixed tag and literal key set',
  );
  assert.ok(
    /An index mode is Git's exact six-character ASCII octal mode[\s\S]*?A filesystem mode is the six-character, zero-padded ASCII octal encoding of `lstat\(2\)\.st_mode & 0177777`[\s\S]*?no umask, executable-bit, or file-type normalization/.test(c),
    'mode sources and normalization are fixed',
  );
  assert.ok(
    /Hash regular worktree files from their raw bytes[\s\S]*?A Git blob object ID is index evidence and is never a substitute/.test(c),
    'worktree content uses SHA-256 independently from Git object IDs',
  );
  assert.ok(
    c.includes('{"entries":[],"schema":"xsk-execute-plan-directory-manifest-v1"}'),
    'directory manifests have one literal top-level schema',
  );
  assert.deepEqual(
    [
      '{"kind":"directory","mode":"040755","path":"empty-directory"}',
      '{"byte_length":0,"kind":"regular","mode":"100644","path":"file","sha256":"<64 lowercase hexadecimal characters>"}',
      '{"kind":"symlink","mode":"120777","path":"link","target_base64":"<RFC 4648 base64 with padding>"}',
    ].map((shape) => c.includes(shape)),
    [true, true, true],
    'every directory entry variant has a fixed tag and literal key set',
  );
  assert.ok(
    /Every displayed entry key is mandatory for that variant, and no additional key is allowed[\s\S]*?including empty directories but excluding the manifest root itself[\s\S]*?Do not follow symlinks[\s\S]*?Sort entries by the UTF-8 byte order/.test(c),
    'directory manifests are complete, closed, non-following, and deterministically sorted',
  );
  assert.ok(
    /xsk-execute-plan-directory-manifest-v1:sha256:<64 lowercase hexadecimal characters>/.test(c),
    'directory manifests have an explicit comparable identity format',
  );
  assert.ok(
    /If a required path is unreadable,[\s\S]*?or cannot be represented exactly by this format,[\s\S]*?do not resume, reuse, or mint a verified acceptance fingerprint/.test(c),
    'unrepresentable path state fails closed',
  );
  assert.ok(
    /A status label such as `MM` is never a substitute for the exact index entries, because index content can change while that label and the worktree bytes stay the same/.test(c),
    'path fingerprints detect index-only changes hidden behind the same Git status',
  );
  assert.ok(
    /A bare path list cannot show later whether those changes survived/.test(c),
    'explains why a path list alone cannot prove user work was preserved',
  );
  assert.ok(
    /If an expected or tolerated write path overlaps dirty or pre-existing ignored user state,[\s\S]*?a whole-file hash alone is not sufficient/.test(c),
    'overlapping user state cannot use a lone whole-file hash as preservation evidence',
  );
  assert.ok(
    /Preserve the index and worktree layers separately with binary-capable base-to-index and index-to-worktree patches, or with the full staged blobs, exact index entries, and full worktree content and path state/.test(c),
    'dirty overlaps retain separate comparable index and worktree evidence',
  );
  assert.ok(
    /Do not write either run artifact before the normal gate; immediately after approval, persist and hash-check all baseline evidence before any task becomes `in-flight`/.test(c),
    'durable overlap evidence lands after confirmation but before dispatch',
  );
  assert.ok(
    /For every touched dirty-overlap path,[\s\S]*?compare the immutable-original-base state, saved pre-run index and worktree patches or full snapshots, and post-task index and worktree states after the task returns/.test(c),
    'dirty-overlap staged and unstaged preservation is checked after task execution',
  );
  assert.ok(
    /If the comparison shows loss, or cannot prove preservation,[\s\S]*?keep the task `reconciling`, set its provisional outcome to `failed` for preservation ambiguity[\s\S]*?pause before dispatching dependents/.test(c),
    'inconclusive overlap preservation fails closed without overwriting the worktree',
  );
  assert.ok(
    /Only after the actual touched-path set and terminal output fingerprints are complete,[\s\S]*?every dirty-overlap preservation result[\s\S]*?every committed-path attribution[\s\S]*?every scope item and user decision is resolved[\s\S]*?atomically change `reconciling` to `done` or `failed`/.test(c),
    'terminal task state is written only after all attribution and decisions',
  );
  assert.ok(
    /A failed task can leave partial output, so a failed outcome requires the same evidence as a successful one/.test(c),
    'failed tasks retain fingerprints for partial output',
  );
  assert.ok(
    /Matching the most recent terminal `done` or `failed` fingerprint proves only that the task-end state is unchanged[\s\S]*?never transfers ownership of pre-run dirty content/.test(c),
    'a matching terminal checkpoint proves unchanged output without erasing user ownership',
  );
  assert.ok(
    /whose latest task-output fingerprint no longer matches,[\s\S]*?is a user change or ambiguity[\s\S]*?never as this run's to overwrite/.test(c),
    'post-completion edits are protected as user changes or ambiguities',
  );
  assert.ok(
    /Acceptance fingerprint: <immutable original base commit; final reconciled HEAD; ignored-path coverage state; exact UTF-8-byte-sorted path set[\s\S]*?xsk-execute-plan-path-state-v1 fingerprint/.test(c),
    'acceptance binds the immutable base, final HEAD, coverage, and canonical path state',
  );
  assert.ok(
    /persist an anchored acceptance-command checkpoint[\s\S]*?In the same next anchored ledger write, record the command's exit result and compact output evidence, actual touched paths, terminal fingerprints, and overlap result/.test(c),
    'project commands also use durable before-and-after checkpoints',
  );
  assert.ok(
    /schema `xsk-execute-plan-anchor-v1`[\s\S]*?canonical repository identity, slug, run generation, monotonic sequence, immutable original base, last reconciled `HEAD`, input identity, SHA-256 of the ledger's exact bytes,[\s\S]*?exact sorted artifact manifest/.test(c),
    'the protected anchor binds run identity and every evidence artifact',
  );
  assert.ok(
    /Find this record in the anchor store by repository identity, slug, and generation; a handle copied from the workspace ledger is never the authority, because the ledger is one of the artifacts under inspection/.test(c),
    'anchor lookup does not trust a possibly modified ledger',
  );
  assert.ok(
    /A mismatch means the artifacts and the anchor have diverged, from an interrupted write, an outside edit, or a bug[\s\S]*?the cause is not something the chain can tell you/.test(c),
    'an anchor mismatch is reported as divergence of unknown cause, not as proven tampering',
  );
  assert.ok(
    /recoverable two-phase anchored checkpoint[\s\S]*?append a protected pending anchor revision[\s\S]*?atomically replace the workspace artifacts[\s\S]*?promote the pending revision to committed/.test(c),
    'run-artifact updates use recoverable two-phase anchoring',
  );
  assert.ok(
    /On recovery, a pending revision may be finalized only when the workspace artifacts match its intended hashes,[\s\S]*?any other state is an evidence-integrity failure/.test(c),
    'interrupted anchor transactions recover deterministically or fail closed',
  );
  assert.ok(
    /Verify the committed anchor against every run artifact before and after every subagent dispatch, project command, and fresh verifier; before consuming baseline evidence; and before resume, reuse, unified acceptance, or final fingerprinting/.test(c),
    'anchor integrity is checked around every untrusted writer and recovery decision',
  );
  assert.ok(
    /It is an evidence-integrity failure whatever the cause[\s\S]*?do not dispatch, attribute output, accept, reuse, or produce an acceptance fingerprint/.test(c),
    'diverged evidence cannot drive execution or reusable proof',
  );
  assert.ok(
    /Ledger and companion paths may be excluded from the implementation diff only after this independent anchor check passes/.test(c),
    'run artifacts are excluded only when independently protected',
  );
});

test('skill-behavior: xsk-execute-plan: result reuse is bound to reproducible identities', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(
    /Record the input identity as `xsk-execute-plan-input-v1:sha256:<64 lowercase hexadecimal characters>`/.test(c),
    'the input identity has one versioned, explicit format',
  );
  assert.ok(
    /Hash the exact bytes with an executed SHA-256 implementation \(`shasum -a 256`, `sha256sum`, or Node's built-in `crypto`\)/.test(c),
    'the identity names executed implementations rather than assuming a hash',
  );
  assert.ok(
    /never write a digest from inspection/.test(c),
    'input identities cannot be fabricated from inspection',
  );
  assert.ok(
    /Always persist the exact preimage bytes used for the identity, including the `sha256` form, at `\.xsk\/runs\/<slug>\.baseline\/input-v1`/.test(c),
    'hashed identities retain their complete recovery preimage',
  );
  assert.ok(
    /Record its relative path, decimal byte length, and matching SHA-256 identity in the ledger,[\s\S]*?bind the file into the protected artifact anchor/.test(c),
    'the preimage is length-checked and independently anchored',
  );
  assert.ok(
    /Input preimage: <\.xsk\/runs\/<slug>\.baseline\/input-v1; decimal byte length; matching SHA-256 identity>/.test(c),
    'the ledger references the exact persisted input preimage',
  );
  assert.ok(
    /If SHA-256 cannot actually be computed, stop before the normal gate/.test(c),
    'missing identity tooling fails before execution',
  );
  assert.ok(/A missing or unrecognized scheme is an identity failure/.test(c), 'unsupported identity formats fail closed');
  assert.ok(
    /compare exactly two identities, both recomputed from anchored material that still exists/.test(c),
    'reuse compares only identities that can actually be reproduced',
  );
  assert.ok(
    /Do not ask the run to re-derive the old execution envelope and match it: a fresh decomposition of the same plan will not reproduce the recorded task definitions verbatim/.test(c),
    'reuse does not depend on reproducing a past decomposition verbatim',
  );
  assert.ok(
    /would only dress a blanket refusal as a check/.test(c),
    'an unsatisfiable comparison is rejected as fake rigor rather than kept',
  );
  assert.ok(
    /Only when both identities and the protected evidence anchor match may reuse without dispatch be offered alongside a new run/.test(c),
    'reuse needs the input, workspace, and evidence anchor to match',
  );
  assert.ok(
    /Any functional or UI fix attempt adds a full task definition and dependency to the final ordered task list/.test(c),
    'fix tasks join the effective task list',
  );
  assert.ok(
    /so `## Result` describes the effective tasks, acceptance criteria, and envelope that actually produced the result rather than the ones first confirmed/.test(c),
    'the accepted result describes the effective specification',
  );
  assert.ok(
    /A later comparison must match the anchor, original base, final reconciled `HEAD`, exact path set, and every entry; an added or missing path is a mismatch/.test(c),
    'workspace revalidation compares both path membership and path state',
  );
  assert.ok(
    /Exclude Git metadata and run artifacts only after the protected anchor matches, but include `\.xsk\/\.gitignore` when changed/.test(c),
    'the acceptance fingerprint excludes independently anchored artifacts without hiding the gitignore change',
  );
});

test('skill-behavior: xsk-execute-plan: shared-workspace envelope detects scope drift', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(
    /isolated from the main conversation's context, not from one another's filesystem/.test(c),
    'subagent isolation is contextual rather than filesystem isolation',
  );
  assert.ok(/They share the same writable workspace/.test(c), 'subagents share one writable workspace');
  assert.ok(/Capture the pre-existing dirty paths before dispatch/.test(c), 'captures the dirty-path baseline');
  assert.ok(/For every task, name its expected write paths/.test(c), 'records expected write paths per task');
  assert.ok(
    /the tolerated side-effect paths that correct work legitimately touches \(regenerated output, lockfiles, formatter fallout\)/.test(c),
    'the envelope declares tolerated side-effect paths up front',
  );
  assert.ok(
    /actual touched paths/.test(c) && /confirmed allowed paths/.test(c),
    'records actual paths and compares them with confirmed allowed paths',
  );
  assert.ok(
    /independently derive every detectable actual touched path from the immutable original base, reconciled commit-range receipts, attempt-start records, current Git state, ignored-state comparison, and the subagent report,[\s\S]*?reconcile these sources rather than trusting the report alone/.test(c),
    'the main workflow independently checks the subagent touched-path report',
  );
  assert.ok(
    /Before every dispatch, compare the complete footprint with its latest trusted pre-run baseline or terminal task checkpoint[\s\S]*?Any mismatch since that checkpoint is new user work or ambiguity/.test(c),
    'new user edits between tasks are protected before the next dispatch',
  );
  assert.ok(
    /A task's write footprint is its expected write paths together with its tolerated side-effect paths/.test(c),
    'the parallel-safety footprint unions expected and tolerated paths',
  );
  assert.ok(
    /a shared lockfile or regenerated index counts even when the two tasks own different source files/.test(c),
    'shared side-effect targets block parallel dispatch',
  );
  assert.ok(/Never revert an unexpected path automatically/.test(c), 'unexpected paths are never auto-reverted');
  assert.ok(
    /A path the confirmed envelope already lists as a tolerated side effect is recorded in the ledger and the run carries on/.test(c),
    'a pre-declared side-effect path does not trip the drift check',
  );
  assert.ok(
    /Any other unexpected path is scope drift:[\s\S]*?keep the task `reconciling`, persist the unresolved paths and pending decision in an anchored checkpoint,[\s\S]*?ask the user once whether to accept it into scope or fail the task/.test(c),
    'undeclared drift pauses dependents and asks the user instead of failing silently',
  );
  assert.ok(
    /Accepting records the path in the envelope and resolves that item; failing sets the provisional task outcome to failed and stops its dependents/.test(c),
    'both drift outcomes are defined',
  );
  assert.ok(
    /That question is an exception check against the confirmed envelope, not the per-task code review this skill omits/.test(c),
    'the drift question does not reintroduce per-task code review',
  );
  assert.ok(
    /`Ignored-path coverage: footprint` is the default\. It covers every ignored path inside a declared task or verification-command footprint, plus any additional ignored root the user names at the gate/.test(c),
    'footprint coverage is the default scope, not a degraded one',
  );
  assert.ok(
    /Offer repository-wide when the user wants assurance beyond the declared footprints, and say what it costs/.test(c),
    'repository-wide coverage is an opt-in with its cost disclosed',
  );
  assert.ok(
    /Footprint coverage supports a verified acceptance, but its scope claim is bounded and must be reported that way[\s\S]*?never that nothing was written elsewhere in the ignored namespace/.test(c),
    'footprint coverage can verify, with its claim explicitly bounded',
  );
  assert.ok(
    /Only repository-wide coverage carries the unbounded claim, and neither may be described as the other/.test(c),
    'the two verifiable scopes cannot be reported interchangeably',
  );
  assert.ok(
    /one dependency or build directory routinely holds far more files than the entire run touches, and the walk repeats after every writer/.test(c),
    'the cost of repository-wide coverage is stated rather than assumed away',
  );
  assert.ok(
    /`Ignored-path coverage: repository-wide` additionally enumerates and fingerprints the whole worktree's ignored namespace,[\s\S]*?repeats that enumeration in every post-writer scan/.test(c),
    'repository-wide coverage means a whole-workspace baseline and rescan',
  );
  assert.ok(
    /Record `Ignored-path coverage: incomplete` with the covered roots, the uncovered remainder, and the reason whenever a selected root cannot be enumerated or fingerprinted[\s\S]*?Never treat unobserved ignored state as unchanged/.test(c),
    'a root that cannot be read is explicit incomplete evidence',
  );
  assert.ok(
    /rescan every covered ignored root[\s\S]*?repository-wide coverage also repeats the whole-namespace enumeration[\s\S]*?changed existing ignored descendant or a newly created ignored path under those roots[\s\S]*?even when the subagent omitted it/.test(c),
    'ignored writes omitted from a task report are independently detected within scope',
  );
  assert.ok(
    /If a covered root becomes unreadable, downgrade the scope to incomplete, record the uncovered namespace and resulting ambiguity, mark every acceptance criterion that depended on it `skipped` with that reason, and report it prominently/.test(c),
    'a root lost mid-run downgrades the scope and skips the criteria that relied on it',
  );
  assert.ok(
    /Incomplete coverage never passes as verified and requires `Acceptance fingerprint: not produced`, so the run cannot be reused/.test(c),
    'incomplete coverage cannot mint verified or reusable proof',
  );
  assert.ok(
    /self-contained prompt containing the applicable hard rules[\s\S]*?allowed and expected write paths[\s\S]*?default prohibition on dependency introduction, remote or external actions, destructive or irreversible actions, and platform permission prompts/.test(c),
    'subagent prompts carry hard rules, path boundaries, and default action prohibitions',
  );
  assert.ok(
    /When a task has a granted exception recorded in the envelope, copy its exact action, target, scope, limits, and permitted attempts into that task's prompt as the sole exception[\s\S]*?Keep the prohibition for everything else/.test(c),
    'subagent prompts carry only the exact focused authorization exception',
  );
});

test('skill-behavior: xsk-execute-plan: one normal gate preserves exceptional authority boundaries', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(/One normal confirmation gate/.test(c), 'keeps one normal workflow gate');
  assert.ok(
    /never authorizes a new product decision, scope expansion, dependency introduction, external or remote mutation, destructive or irreversible action, or a platform permission prompt/.test(c),
    'normal gate does not broaden decision, scope, dependency, external, destructive, or permission authority',
  );
  assert.ok(
    /stop before it and obtain focused user authorization/.test(c),
    'exceptional actions require focused authorization',
  );
  assert.ok(
    /record each granted exception in the execution envelope with its exact action, target, assigned task, scope, limits, and permitted attempts/.test(c),
    'focused authorization is recorded as exact task-scoped terms',
  );
  assert.ok(
    /does not carry to another task, retry, verifier, or fix task unless the recorded terms explicitly include it/.test(c),
    'authorization does not silently transfer to retries or fix tasks',
  );
  assert.ok(
    /Exceptional actions and authorizations: <action, target, assigned task, scope, limits, permitted attempts, and pending or granted status, or none>/.test(c),
    'the ledger durably records exceptional authorization status and terms',
  );
  assert.ok(
    /If the exact exception cannot be passed to the assigned task, do not dispatch it/.test(c),
    'an authorized action without a faithful delegated prompt has no fallback path',
  );
  assert.ok(
    /A newly discovered decision that changes implementation also returns to the user/.test(c),
    'new implementation decisions return to the user',
  );
});

test('skill-behavior: xsk-execute-plan: fresh verifier owns unified functional acceptance', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  const commandIndex = c.indexOf("First run the project's own verification commands");
  const verifierIndex = c.indexOf('Only after the project commands and all of their writes have been reconciled, dispatch a fresh verifier');
  assert.ok(
    commandIndex >= 0 && verifierIndex >= 0 && commandIndex < verifierIndex,
    'project commands and their writes are reconciled before the fresh verifier',
  );
  assert.ok(
    /For every verification command, also name its own expected and tolerated write footprint, including snapshots, generated files, and formatter output/.test(c),
    'verification-command writes are declared in the confirmed envelope',
  );
  assert.ok(
    /Immediately before each command, persist an anchored acceptance-command checkpoint[\s\S]*?After each command returns and the protected artifact anchor still matches, derive and fingerprint every detectable write[\s\S]*?Reconcile those writes through the same allowed-path, scope-drift, dirty-overlap preservation, and ignored-coverage rules as a task/.test(c),
    'command-induced writes receive durable checkpoints and full scope checks',
  );
  assert.ok(
    /confirmed goal, acceptance criteria, execution envelope, immutable original base commit, final reconciled `HEAD`, complete reconciled commit-range receipts,[\s\S]*?terminal task-output and acceptance-command fingerprints, actual touched paths, command output evidence, and the post-command actual diff derived against the immutable original base commit/.test(c),
    'verifier receives the immutable base, reconciled history, checkpoints, and post-command diff',
  );
  assert.ok(
    /independently proves that every dirty-overlap staged and unstaged user change survived, verifies committed-path attribution, scope, and leftovers, and returns evidence without modifying files/.test(c),
    'verifier checks user-change preservation, committed attribution, and scope without editing',
  );
  assert.ok(
    /Missing or inconclusive overlap evidence is a functional failure, not a pass inferred from hashes or status labels/.test(c),
    'fresh verification cannot infer overlap preservation',
  );
  assert.ok(
    /Footprint coverage verifies scope within its covered roots and must be reported with that bound stated; only repository-wide coverage supports an unbounded ignored-scope claim/.test(c),
    'acceptance states the bound of the coverage scope it actually had',
  );
  assert.ok(
    /Incomplete coverage is not a failure by itself: it marks every criterion that depended on the lost roots `skipped`, forces `Acceptance fingerprint: not produced`, disables reuse, and can never be reported as verified/.test(c),
    'only genuinely lost coverage degrades to skipped and blocks reusable proof',
  );
  assert.ok(
    /A verifier mismatch or command failure is also reported as a functional failure/.test(c),
    'verifier and command failures both affect functional acceptance',
  );
  assert.ok(
    /at most one bounded fix attempt for unified functional acceptance[\s\S]*?rerun the project commands, reconcile their writes, and repeat the fresh-verifier check once in that order/.test(c),
    'functional fixes are bounded and fully reverified',
  );
  assert.ok(
    /Dispatch that fix as its own write-ahead ledger task under the full step 5 contract: allowed paths, the drift comparison, overlap preservation, terminal output fingerprints, and the same scoped-authority contract, copying only an exact granted exception assigned to that fix task and prohibiting everything else/.test(c),
    'the functional fix attempt inherits the full task contract and is tracked in the ledger',
  );
  assert.ok(
    /Between tasks there is no code review and no acceptance run[\s\S]*?produced by tools rather than by reading file contents, and it judges nothing about the implementation until unified acceptance/.test(c),
    'per-task bookkeeping is tool-produced evidence, not a review',
  );
  assert.ok(/warning-level, never a gate/.test(c), 'UI fidelity remains advisory');
  assert.ok(/at most 2 rounds by default/.test(c), 'UI fixes remain bounded');
  assert.ok(
    /Every UI fix round is dispatched as its own write-ahead ledger task under the full step 5 contract too: allowed paths, the drift comparison, and the same scoped-authority contract, copying only an exact granted exception assigned to that UI fix task and prohibiting everything else/.test(c),
    'UI fix rounds inherit the same contract instead of only the file-set rule',
  );
  assert.ok(
    /After any UI fix that changed files, the functional revalidation follows the same project-commands, write-reconciliation, then fresh-verifier order/.test(c),
    'post-UI revalidation verifies the resulting post-command workspace',
  );
  assert.ok(
    /Produce an acceptance fingerprint only when ignored-path coverage is footprint or repository-wide, the latest functional acceptance passed, all other scope-verification evidence is conclusive, every task is terminal, the evidence anchor matches, and the final status is `done`[\s\S]*?Incomplete ignored-path coverage always writes `Acceptance fingerprint: not produced`/.test(c),
    'reusable proof is produced only for a fully verified done workspace',
  );
  assert.ok(
    /Incomplete coverage alone may leave otherwise successful tasks and observable checks at `status: done`, but the report must label the result unverified and non-reusable/.test(c),
    'scoped ignored coverage downgrades proof without falsifying observable results',
  );
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

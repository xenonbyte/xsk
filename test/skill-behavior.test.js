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
  assert.ok(/no review and no acceptance run/.test(c), 'no per-task review');
  assert.ok(/only the unfinished tasks/.test(c) && /pending or failed/.test(c), 'resume semantics');
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
  const recoveryIndex = c.indexOf('With `status: running` or `status: failed`, ask the user once');
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
    /If writable-workspace subagent dispatch is unavailable, stop before offering a recovery choice or writing a ledger/.test(c),
    'missing subagent capability stops before recovery and ledger creation',
  );
  assert.ok(
    /This is a one-time capability check, not a precondition re-tested before each ledger line/.test(c),
    'capability is checked once, not before every ledger update',
  );
  assert.ok(
    /Never silently degrade `xsk-execute-plan` into inline execution/.test(c),
    'missing capability never falls back to silent inline execution',
  );
  assert.ok(
    /With `status: running` or `status: failed`, ask the user once whether to resume or restart/.test(c),
    'running and failed runs both enter explicit recovery',
  );
  assert.ok(
    /Resume from the current worktree[\s\S]*?keep done tasks[\s\S]*?only the unfinished tasks whose state is pending or failed/.test(c),
    'resume keeps done work and dispatches unfinished tasks only',
  );
  assert.ok(
    /If all tasks are already done, resume at unified acceptance and reporting/.test(c),
    'all-done running runs resume at acceptance and reporting',
  );
  assert.ok(
    /Restart also uses the current worktree as its baseline[\s\S]*?never resets, reverts, or otherwise rolls back existing source changes/.test(c),
    'restart replaces the ledger without pretending to roll back source',
  );
  assert.ok(
    /With `status: done`, recompute the acceptance fingerprint recorded in `## Result` first/.test(c),
    'reusing a done ledger starts by revalidating its fingerprint',
  );
  assert.ok(
    /While it still matches the worktree, offer either to reuse the recorded result without dispatch or to start a new run that overwrites the ledger after confirmation/.test(c),
    'a matching fingerprint keeps the explicit reuse-or-replace choice',
  );
  assert.ok(
    /When it does not match, or the ledger carries no fingerprint[\s\S]*?present the recorded result as history only[\s\S]*?must never be reported as verified/.test(c),
    'a stale or unfingerprinted done result is history, not a verified conclusion',
  );
  assert.ok(
    /A `done` run whose result was already reported and consumed may instead be retired by deleting its ledger/.test(c),
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
    /When the ledger carries no `## Execution Envelope` section[\s\S]*?rebuild and re-confirm the envelope through steps 3 and 4 before dispatching anything/.test(c),
    'a ledger without a recorded envelope is rebuilt and re-confirmed before dispatch',
  );
  assert.ok(/A restart always rebuilds and re-confirms it/.test(c), 'restart re-confirms a fresh envelope');
});

test('skill-behavior: xsk-execute-plan: write-ahead ledger and fingerprints survive an interruption', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(
    /\[pending\|in-flight\|done\|failed\] \(attempt <n>\)/.test(c),
    'the ledger tracks an in-flight state and an attempt number',
  );
  assert.ok(
    /The ledger is write-ahead: set a task's line to `in-flight` with its attempt number and write the ledger out before dispatching it/.test(c),
    'task state is persisted before dispatch, not after completion',
  );
  assert.ok(
    /Recording state only after a task finishes would let an interruption between dispatch and result leave finished work looking like work that never started/.test(c),
    'the write-ahead rule names the duplicate-execution hazard it closes',
  );
  assert.ok(
    /A task left at `in-flight` was dispatched and never reported back[\s\S]*?never re-dispatch it blind/.test(c),
    'an in-flight task is never blindly re-dispatched on resume',
  );
  assert.ok(
    /ask the user whether to re-dispatch it as the next attempt, accept the existing state and mark it done, or fail it/.test(c),
    'in-flight recovery offers the three honest outcomes',
  );
  assert.ok(
    /each with a content fingerprint \(a hash of its current content, or an equivalent saved patch\)/.test(c),
    'the dirty-path baseline stores content fingerprints, not just paths',
  );
  assert.ok(
    /A bare path list cannot show later whether those changes survived/.test(c),
    'explains why a path list alone cannot prove user work was preserved',
  );
  assert.ok(
    /sort the current changes into three groups against the recorded fingerprints[\s\S]*?anything else appeared during the interruption/.test(c),
    'resume separates user work, this run\'s writes, and edits made during the interruption',
  );
  assert.ok(
    /Report that third group and treat it as the user's, never as this run's to overwrite/.test(c),
    'edits made during an interruption belong to the user',
  );
  assert.ok(
    /Record the acceptance fingerprint: the base commit plus every changed path and its content hash/.test(c),
    'acceptance records a fingerprint a later session can revalidate',
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
    /Any other unexpected path is scope drift: pause before dispatching that task's dependents[\s\S]*?keep the worktree intact[\s\S]*?ask the user once whether to accept it into scope or fail the task/.test(c),
    'undeclared drift pauses dependents and asks the user instead of failing silently',
  );
  assert.ok(
    /Accepting records the path in the envelope and continues; failing marks the task failed and stops its dependents/.test(c),
    'both drift outcomes are defined',
  );
  assert.ok(
    /That question is an exception check against the confirmed envelope, not the per-task review this skill omits/.test(c),
    'the drift question does not reintroduce per-task review',
  );
  assert.ok(
    /self-contained prompt containing the applicable hard rules[\s\S]*?allowed and expected write paths[\s\S]*?explicit prohibition on remote, external, destructive, or irreversible actions/.test(c),
    'subagent prompts carry hard rules, path boundaries, and action prohibitions',
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
    /A newly discovered decision that changes implementation also returns to the user/.test(c),
    'new implementation decisions return to the user',
  );
});

test('skill-behavior: xsk-execute-plan: fresh verifier owns unified functional acceptance', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(
    /First dispatch a fresh verifier that did not implement any task/.test(c),
    'unified acceptance uses a fresh non-implementing verifier',
  );
  assert.ok(
    /confirmed goal, acceptance criteria, execution envelope, pre-existing dirty-path baseline, actual touched paths, and actual diff/.test(c),
    'verifier receives the goal, criteria, scope baseline, paths, and diff',
  );
  assert.ok(
    /checks the implementation against the goal and criteria, verifies scope and leftovers, and returns evidence without modifying files/.test(c),
    'verifier checks intent and scope without editing',
  );
  assert.ok(
    /Then run the project's own verification commands \(tests, lint, build\)/.test(c),
    'fresh verification is followed by project-native checks',
  );
  assert.ok(
    /A verifier mismatch or command failure is reported as a functional failure/.test(c),
    'verifier and command failures both affect functional acceptance',
  );
  assert.ok(
    /at most one bounded fix attempt for unified functional acceptance[\s\S]*?repeat the fresh-verifier check and project commands once/.test(c),
    'functional fixes are bounded and fully reverified',
  );
  assert.ok(
    /Dispatch that fix as its own write-ahead ledger task under the full step 5 contract: allowed paths, the drift comparison, and the same prohibition on external, destructive, and irreversible actions/.test(c),
    'the functional fix attempt inherits the full task contract and is tracked in the ledger',
  );
  assert.ok(/Between tasks there is no review and no acceptance run/.test(c), 'still has no per-task review');
  assert.ok(/warning-level, never a gate/.test(c), 'UI fidelity remains advisory');
  assert.ok(/at most 2 rounds by default/.test(c), 'UI fixes remain bounded');
  assert.ok(
    /Every UI fix round is dispatched as its own write-ahead ledger task under the full step 5 contract too: allowed paths, the drift comparison, and the same authority prohibitions/.test(c),
    'UI fix rounds inherit the same contract instead of only the file-set rule',
  );
  assert.ok(
    /After any UI fix that changed files, the functional revalidation includes a fresh verifier/.test(c),
    'post-UI revalidation repeats the fresh verifier',
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

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
//   6. Ask about consequential unresolved choices; reuse existing authorization
//      and resolve routine local choices from project evidence.

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

test('skill-behavior: xsk-think: purpose, triggers, stop-before-approval, output', () => {
  const c = body(skills.find((s) => s.name === 'xsk-think'));
  assert.ok(/decision-complete plan/.test(c), 'purpose stated');
  assert.ok(/出方案/.test(c) && /plan this/.test(c), 'multilingual triggers present');
  assert.ok(/explicit approval/.test(c), 'approval gate');
  assert.ok(/Proposed Design Summary/.test(c), 'output is a Proposed Design Summary');
  assert.ok(!/Approved Design Summary/.test(c), 'output does not use Approved Design Summary');
  assert.ok(/stop/i.test(c) && /wait for approval/.test(c), 'stops and waits');
  assert.ok(/direct execution, or revise the design/.test(c), 'offers the two-choice next action');
  assert.ok(
    /Neither choice is an automatic invocation of another skill/.test(c),
    'offer never auto-runs',
  );
});

test('skill-behavior: xsk-think: routes only decision-complete work by execution shape', () => {
  const c = body(skills.find((s) => s.name === 'xsk-think'));
  assert.ok(
    /With unresolved \*\*Open Questions\*\*[\s\S]*?Do not show execution choices/.test(c),
    'unresolved questions remain in design without execution choices',
  );
  assert.ok(
    /pure judgment[\s\S]*?Do not show execution choices/.test(c),
    'pure judgments stop without execution choices',
  );
  assert.ok(
    /Classify ready work by execution shape[\s\S]*?decision-complete executable plan with no Open Questions/.test(c),
    'only ready executable plans reach execution-shape routing',
  );
  assert.ok(
    /a one-file change, a single command, or a set of small interdependent edits/.test(c),
    'one-file and single-command work recommends direct execution',
  );
  assert.ok(
    /Being multi-file or multi-step does not by itself take work out of this shape: two one-line edits in two files stay direct execution/.test(c),
    'file or step count alone does not push work out of direct execution',
  );
  assert.ok(
    /Requirement execution[\s\S]*?xsk-execute-req[\s\S]*?Documentation only[\s\S]*?xsk-write-req/.test(c),
    'complete complex work uses executor while documentation-only intent uses writer',
  );
  assert.ok(
    /exactly two numbered choices[\s\S]*?direct execution, or revise the design/.test(c),
    'ready work presents both next actions',
  );
  assert.ok(/mark one choice as recommended/.test(c), 'routing labels a shape-based recommendation');
  assert.ok(/\*\*Next Action\*\*/.test(c), 'output names the next-action section');
  assert.ok(
    /Never invoke another skill automatically, and never begin implementing on the strength of a recommendation the user has not picked/.test(c),
    'a recommendation is never self-approval to start implementing',
  );
  assert.ok(
    /planning-only[\s\S]*?When the user picks direct execution, implementation continues outside this skill through the normal conversation/.test(c),
    'planning-only holds: direct execution runs outside this skill',
  );
  assert.ok(
    /A pure judgment needs no approval; Open Questions wait for answers instead of an execution selection/.test(c),
    'the stop condition matches the routed outcome instead of always awaiting approval',
  );
  assert.ok(/actual changes and verification/.test(c), 'execution choice carries a concrete scope');
  assert.ok(/option number or an unambiguous natural-language selection/.test(c), 'supports short selections');
  assert.ok(/without another approval round for the same scope/.test(c), 'selection authorizes the stated work');
  assert.ok(/not additional public or external actions/.test(c), 'execution selection does not expand permission');
});

test('skill-behavior: xsk-think: proportional plans include acceptance without speculative complexity', () => {
  const c = body(skills.find((s) => s.name === 'xsk-think'));
  assert.ok(/lightweight plan uses the single paragraph/.test(c), 'lightweight output stays short');
  assert.ok(/omit empty or generic risk sections/.test(c), 'does not force filler risk tables');
  assert.ok(/scope boundaries/.test(c) && /observable acceptance checks/.test(c), 'handoff includes scope and acceptance');
  assert.ok(/routine naming and local implementation details[\s\S]*?do not require separate user decisions/.test(c),
    'routine implementation choices do not block handoff');
  assert.ok(/specific failure mode/.test(c) && /no demonstrated benefit, shrink the plan/.test(c),
    'extra complexity needs a concrete benefit');
  assert.ok(/Skip this comparison when the recommendation already uses the minimal approach/.test(c),
    'minimal plans do not acquire extra comparison gates');
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
  assert.ok(/permissions.*exists but is null, an array, or any other non-object/.test(c), 'malformed permissions are not silently replaced');
  assert.ok(/missing.*permissions.*field may be created as an object/.test(c), 'absent permissions are supported');
  assert.ok(/preserves existing indentation, newline style, key order, and unrelated formatting/.test(c), 'existing file formatting is preserved');
  assert.ok(/2-space default applies only to a new file/.test(c), 'new-file formatting does not reformat existing settings');
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

test('skill-behavior: xsk-write-req: identity, full scope, acceptance, and nested return', () => {
  const c = body(skills.find((s) => s.name === 'xsk-write-req'));
  assert.ok(/Read the project first/.test(c), 'grounds the requirement');
  assert.ok(/at most one/.test(c) && /list the offending paths/.test(c), 'keeps one active requirement');
  assert.ok(/goal and scope match/.test(c) && /Never silently merge unrelated work/.test(c), 'does not absorb a different need');
  assert.ok(/active and archive paths/.test(c) && /reuse a historical slug/.test(c), 'preserves unique document identity');
  assert.ok(/Every shape has Goal, Scope, and Acceptance/.test(c), 'all requirement shapes are executable');
  assert.ok(/Dependency ordering and implementation batches are allowed/.test(c), 'ordered work is not rejected');
  assert.ok(/all wanted work still in scope/.test(c), 'batches cannot silently drop scope');
  assert.ok(/Self-audit checkpoint/.test(c) && /Conflict check/.test(c) && /Ambiguity check/.test(c), 'keeps meaningful audit');
  assert.ok(/autonomous tests or self-audits/.test(c), 'checkpoints do not imply user gates');
  assert.ok(/mark affected execution results for revalidation/.test(c), 'changed requirements invalidate completion');
  assert.ok(/suppress commit offers and next-action menus/.test(c) && /do not invoke execution recursively/.test(c), 'nested writer returns without a loop');
  assert.ok(/xsk-execute-req/.test(c) && /already authorized writing and execution together/.test(c), 'standalone handoff reuses authorization');
});

test('skill-behavior: document skills: commit authority and same-file edits are preserved', () => {
  for (const name of ['xsk-write-req', 'xsk-point', 'xsk-consume-point', 'xsk-archive-req']) {
    const c = body(skills.find((s) => s.name === name));
    assert.ok(/explicitly requested|explicit request/.test(c), name + ' commits require authorization');
    assert.ok(/pre-existing|same-file/.test(c), name + ' protects existing edits within selected paths');
    assert.ok(/git add -A/.test(c) && /git add \./.test(c), name + ' explicitly rejects broad staging');
    assert.ok(/already tracked|already be tracked|actual Git tracking/.test(c), name + ' does not confuse ignored and untracked');
  }
});

test('skill-behavior: xsk-archive-req: exact target and recoverable write-before-remove', () => {
  const c = body(skills.find((s) => s.name === 'xsk-archive-req'));
  assert.ok(/status: active/.test(c) && /list the offending paths/.test(c), 'single active invariant');
  assert.ok(/Honor an explicit slug\/path/.test(c) && /never substitute a different active doc/.test(c), 'binds exact target');
  assert.ok(/\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$/.test(c), 'slug syntax is fixed');
  assert.ok(/entire body and other frontmatter match/.test(c), 'retry requires equivalent content');
  assert.ok(/Reuse the existing archived_at/.test(c), 'retry preserves archive timestamp');
  assert.ok(/New or unimplemented content must not be archived/.test(c), 'does not archive new scope');
  assert.ok(/archived.*not proof of implementation completion/.test(c), 'manual archive is not completion proof');
  const write = c.indexOf('Write the fully-updated archived content');
  const verify = c.indexOf('Confirm it landed as written');
  const remove = c.indexOf('then remove the source active doc');
  assert.ok(write >= 0 && verify > write && remove > verify, 'verified copy precedes removal');
  assert.ok(/re-read the source and confirm it has not changed/.test(c), 'changed source is retained');
  assert.ok(/re-read the archive to confirm it still matches/.test(c), 'archive drift before source removal is detected');
  assert.ok(/suppress commit offers and next-action menus/.test(c), 'returns to executor without another gate');
  assert.ok(/local records.*fresh clone/.test(c), 'does not overclaim archive persistence');
});

test('skill-behavior: shared questions respect settled authorization and routine choices', () => {
  for (const s of skills) {
    const c = body(s);
    assert.ok(/Ask only about unresolved choices affecting goals, behavior, interfaces, scope, or material cost/.test(c), s.name + ' bounds user decisions');
    assert.ok(/Routine local implementation choices follow project evidence/.test(c), s.name + ' permits routine choices');
    assert.ok(/do not ask again for work already authorized/.test(c), s.name + ' reuses authorization');
    assert.ok(!/When a decision would change the implementation, surface it as a short question/.test(c), s.name + ' has no blanket question rule');
  }
});

test('skill-behavior: archive and point drop preserve racing targets and matching retries', () => {
  for (const name of ['xsk-archive-req', 'xsk-point']) {
    const c = body(skills.find((s) => s.name === name));
    assert.ok(/Revalidate source and archive target immediately before publication/.test(c), name + ' refreshes both paths');
    assert.ok(/create-only publication with no-clobber semantics/.test(c), name + ' refuses racing replacement');
    assert.ok(/overwriting write or rename is insufficient/.test(c), name + ' does not confuse atomic replacement with create-only');
    assert.ok(/without rewriting/.test(c), name + ' reuses matching archives');
    assert.ok(/winning target/.test(c) && /either file changed/.test(c), name + ' preserves drifted files');
  }
});

test('skill-behavior: executor handles new requirement decisions without replanning authorized work', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-req'));
  assert.ok(/At any execution stage/.test(c), 'scope changes are checked during execution too');
  assert.ok(/pause the affected work.*before changing the requirement or implementing it/.test(c), 'unsettled material changes wait for a decision');
  assert.ok(/Continue independent authorized work/.test(c), 'unaffected work continues');
  assert.ok(/Apply already authorized changes without another approval/.test(c), 'existing authorization remains usable');
  assert.ok(/routine implementation choices do not trigger replanning/.test(c), 'routine choices stay lightweight');
});

test('skill-behavior: xsk-check: review-only diff scope, hard stops, evidence gate, verify, stop', () => {
  const c = body(skills.find((s) => s.name === 'xsk-check'));
  assert.ok(
    /identify and report what is safe to fix/.test(c),
    'purpose identifies fixes without claiming to apply them',
  );
  assert.ok(!/fix what is safe to fix/.test(c), 'purpose does not contradict review-only behavior');
  assert.ok(/scope drift/i.test(c), 'checks scope drift');
  assert.ok(/hard stops/i.test(c), 'applies hard stops');
  assert.ok(/Every formal finding needs the exact file and line/.test(c), 'evidence applies to all formal findings');
  assert.ok(/inherited stdio/.test(c), 'carries the captured-output hard stop (A+ distillation)');
  assert.ok(/regression check/.test(c), 'requires meaningful regression evidence for bug fixes');
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
  assert.ok(/Do not modify files for a review-only request/.test(c), 'does not edit files during a review');
  assert.ok(/already authorized repairs[\s\S]*?all confirmed fixes within that scope/.test(c),
    'repairs require authorization and cover the confirmed scope');
  assert.ok(/without asking again for each fix/.test(c), 'authorized repairs do not require repeated confirmation');
  assert.ok(/Ask only about scope expansion or unresolved decisions with material consequences/.test(c),
    'new scope and consequential decisions remain with the user');
  assert.ok(!/persona-catalog|check-update|🥷|\.\.\//.test(c), 'no Waza-internal references');
});

test('skill-behavior: xsk-check: prevents unsupported identifier and migration conclusions', () => {
  const c = body(skills.find((s) => s.name === 'xsk-check'));
  assert.ok(/Distinguish new definitions from references/.test(c), 'new definitions are not missing dependencies');
  assert.ok(/imports, exports, dependency APIs/.test(c) && /dynamic lookups/.test(c), 'traces symbol resolution');
  assert.ok(!/No match outside the diff means it does not exist/.test(c), 'does not reject valid diff-local definitions');
  assert.ok(/relevant release history, supported upgrade origins, and the persistent-data contract/.test(c),
    'migration decisions consider supported historical data');
  assert.ok(/Absence from the last release tag does not prove it never shipped/.test(c),
    'latest-tag absence is not proof of no migration need');
  assert.ok(!/if it is absent there, no migration is needed/.test(c), 'does not infer never-shipped from one tag');
});

test('skill-behavior: xsk-check: bounds findings and verification to the reviewed state', () => {
  const c = body(skills.find((s) => s.name === 'xsk-check'));
  assert.ok(/skill instructions that affect behavior/.test(c), 'behavioral instruction changes are reviewable');
  assert.ok(/baseline or commit range/.test(c) && /staged, unstaged, and untracked/.test(c), 'reports review coverage');
  assert.ok(/Set severity from impact, not confidence/.test(c), 'uncertainty does not set severity');
  assert.ok(/unconfirmed concerns separate/.test(c) && /do not turn them into facts by lowering their severity/.test(c),
    'uncertain concerns remain separate from confirmed findings');
  assert.ok(/findings share a root cause/.test(c) && /Honor a settled direction unless new evidence contradicts it/.test(c),
    'approach review is conditional and respects settled decisions');
  assert.ok(/invalidate earlier evidence[\s\S]*?rerun the relevant checks/.test(c), 'refreshes invalidated evidence');
  assert.ok(/skipped checks and reasons, and layers still untested/.test(c), 'sign-off exposes verification gaps');
  assert.ok(/In a non-Git project/.test(c) && /do not invent a baseline/.test(c), 'supports scoped non-Git review');
  assert.ok(/Reuse valid verification/.test(c) && /return findings, repairs, and verification evidence to the executor/.test(c), 'nested review shares evidence and returns');
});

test('skill-behavior: xsk-point: useful research, confirmation, identity, and next action', () => {
  const c = body(skills.find((s) => s.name === 'xsk-point'));
  assert.ok(/Research one aspect/.test(c) && /xsk-think/.test(c), 'research purpose and discipline');
  assert.ok(/different aspect needs a distinct unused slug/.test(c), 'does not overwrite collisions');
  assert.ok(/status: researching/.test(c) && /need not prevent saving useful research/.test(c), 'can persist unresolved research');
  assert.ok(/status: ready/.test(c) && /user confirms that conclusion/.test(c), 'ready requires a confirmed conclusion');
  assert.ok(/approval to commit is not approval of a conclusion/.test(c), 'commit and conclusion authority differ');
  assert.ok(/no change, keep the current behavior/.test(c), 'no-change conclusions are valid');
  assert.ok(/not age or HEAD changes alone/.test(c), 'freshness checks are relevant');
  assert.ok(/status: dropped/.test(c) && /write-before-remove/.test(c), 'drop remains recoverable');
  assert.ok(/xsk-consume-point/.test(c) && /retain the point/.test(c), 'ready points offer useful routing');
  assert.ok(/Never invoke think's executor route from inside point/.test(c), 'research does not dispatch code');
});

test('skill-behavior: xsk-consume-point: batch preflight, adoption, and stable provenance', () => {
  const c = body(skills.find((s) => s.name === 'xsk-consume-point'));
  assert.ok(/Respect explicitly selected slugs/.test(c), 'does not ask twice for named inputs');
  assert.ok(/Only points with `status: ready` may be selected/.test(c), 'requires ready sources');
  assert.ok(/single-active requirement/.test(c) && /before any write/.test(c), 'guards target before mutation');
  const preflight = c.indexOf('Preflight the whole batch');
  const writer = c.indexOf('Hand off once to xsk-write-req');
  assert.ok(preflight >= 0 && writer > preflight, 'preflights every source/target before writer');
  assert.ok(/contradictory conclusions/.test(c) && /do not add unselected dependencies silently/.test(c), 'resolves conflicting and missing inputs');
  assert.ok(/Partial adoption leaves the source active/.test(c), 'partial use cannot consume the entire point');
  assert.ok(/consumed_by: <requirement-slug>/.test(c) && /older consumed_by path values/.test(c), 'references survive requirement archival');
  assert.ok(/write-before-remove/.test(c) && /re-read both source and archive before removal/.test(c), 'verifies both files before removal');
  assert.ok(/instead of appending it twice/.test(c), 'retry reconciles content');
  assert.ok(/do not require those archived sources to be ready again/.test(c), 'completed retry sources do not fail the readiness gate');
  assert.ok(/suppress its commit offer and next-action menu/i.test(c), 'writer yields control');
  assert.ok(/Complete every selected fold and its applicable archival before offering or entering execution/.test(c), 'execution waits for full consumption');
});

test('skill-behavior: xsk-consume-point: refreshes source and target after nested writer', () => {
  const c = body(skills.find((s) => s.name === 'xsk-consume-point'));
  assert.match(c, /source snapshot.*archive target's observed state/, 'retains the inputs used by writer');
  assert.match(c, /Before each partial source edit, drop, or archive write, re-read both the source and archive target/,
    'every mutation branch refreshes both paths after the handoff');
  assert.match(c, /If either differs.*stop.*reconciliation/, 'drift prevents writes from stale input');
  assert.match(c, /create-only.*no-clobber/, 'new archives cannot replace a concurrently created target');
  assert.match(c, /reuse it without rewriting/, 'matching retry archives are not rewritten');
  assert.match(c, /re-read both source and archive before removal/, 'deletion still requires a valid archive');
});

test('skill-behavior: xsk-execute-req: discovery and intake preserve inline think execution', () => {
  const skill = skills.find((s) => s.name === 'xsk-execute-req');
  const c = body(skill);
  assert.match(skill.description, /think plan explicitly routed to xsk-execute-req/, 'discovery requires the requirement route');
  assert.match(c, /explicitly selected requirement-execution route/, 'triggers bind the selected route');
  assert.doesNotMatch(c, /selecting the execution option of a complete think plan|"execute the approved plan"/,
    'generic think execution is not an executor cue');
  assert.match(c, /inline\/direct execution.*normal conversation/, 'inline selection returns to normal execution');
  const route = c.indexOf('Honor the selected think route');
  const lookup = c.indexOf('Accept an explicit requirement');
  assert.ok(route >= 0 && lookup > route, 'route check precedes even active-requirement lookup');
  assert.match(c, /explicit invocation of `xsk-execute-req` selects the requirement workflow/,
    'intentional executor invocation remains supported');
});

test('skill-behavior: xsk-execute-req: two inputs with one requirement and scoped authority', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-req'));
  assert.ok(/explicit requirement slug\/path/.test(c) && /think summary selected for execution/.test(c), 'accepts both approved inputs');
  assert.ok(/save it before implementation/.test(c), 'summary is persisted without a separate planning step');
  assert.ok(/goal and scope match the selected work/.test(c), 'does not execute additional old scope');
  assert.ok(/matching filename and frontmatter inside the requirement store/.test(c), 'validates existing target identity before implementation');
  assert.ok(/same doc/.test(c) && /in_progress.*blocked.*completed/.test(c), 'compact execution state belongs to the requirement');
  assert.ok(/separate PLAN only when/.test(c), 'PLAN is optional');
  assert.ok(/dirty worktree, a non-Git project, or unavailable subagents is not an admission failure/.test(c), 'avoids unnecessary entry gates');
  assert.ok(/suppress commit offers and next-action menus/.test(c), 'internal writer returns');
  assert.ok(/xsk-check/.test(c) && /xsk-archive-req/.test(c), 'required handoff names resolve');
});

test('skill-behavior: xsk-execute-req: evidence reuse, incomplete work, and archival recovery', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-req'));
  assert.ok(/Do not rerun unchanged checks/.test(c), 'skill changes do not duplicate verification');
  assert.ok(/compare current Goal, Scope, Acceptance/.test(c), 'resume is tied to current requirements');
  assert.ok(/historical evidence/.test(c), 'historical checks are not represented as fresh');
  assert.ok(/Required `fail` or `not_run` evidence leaves it active and incomplete/.test(c), 'required gaps prevent false completion');
  const complete = c.indexOf('Save `State: completed`');
  const archive = c.indexOf('then invoke `xsk-archive-req`');
  assert.ok(complete >= 0 && archive > complete, 'records completion before archival');
  assert.ok(/automatic archival without another approval/.test(c), 'successful execution includes archival');
  assert.ok(/Retry only persistence\/archival/.test(c), 'archive retry does not repeat implementation');
  assert.ok(/already archived, return its saved result/.test(c), 'completed reentry does not create a duplicate');
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

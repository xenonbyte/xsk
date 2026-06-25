# Plan Subagent Review (v2)

## Verdict
APPROVE-WITH-NITS - every PLAN-TASK-001..013 is concretely executable, all 12 SPEC-BEHAVIOR contracts and all 10 ACs are consumed with objective verification, and all four committed SPEC-nit follow-throughs are present and correct. Three low-severity coordination/verification notes; none blocks execution.

## Executability

Strong. Verified every file target exists on disk and is correctly typed:

- All code/skill/doc/test files named across PLAN-TASK-001..012 are present (lib/manifest.js, lib/uninstall.js, lib/install.js, lib/ownership.js, lib/status.js, lib/capability.js, lib/input.js, lib/skills.js; the bypass/archive/write-req/think fragments; the four skills/<base>/SKILL.md; the four golden fixtures; manifest/uninstall/install/status/input/cli/skill-behavior/golden/readme-pinning/self-conformance tests; docs/REQUIREMENTS.md; both READMEs). Every task is Change Type `modify` against an existing target, so there is no missing-modify-target and no create-over-existing trap. PLAN-TASK-013 is correctly `non_code` (Files: N/A).
- Skeletons are accurate against the real code:
  - PLAN-TASK-001 (07-plan.md:24-33): `validateOperationalSemantics({platform,skillsRoot,manifest})` using `isInsideDir(p, skillsRoot)` matches lib/manifest.js:76 and the SPEC API contract; `{valid,reason}` shape consistent.
  - PLAN-TASK-002 (07-plan.md:51-69): lazy `require('./install').rootFor` inside `uninstall()`, invalid return shape with all six fields (removed/restored/retained/skipped/refused/partial) matches the existing invalid early-return (lib/uninstall.js:98-111); the reset call site is correctly placed at lib/install.js:424 with `skillsRoot` resolved at lib/install.js:404 in the same `install()` loop (verified in prior stages).
  - PLAN-TASK-004 (07-plan.md:116) correctly notes status.js already requires `./install`, so importing `rootFor` is cycle-safe.
  - PLAN-TASK-005 (07-plan.md:143) fixes the exact line: `computeStatus({platforms,xskRoot,platformRoots:opts.platformRoots})` against the current `computeStatus({platforms,xskRoot})` at lib/capability.js:74.
  - PLAN-TASK-012 (07-plan.md:316): confirmed current think.output.md line 1 is `An **Approved Design Summary** with these parts:`; the fix to `A **Proposed Design Summary**` (article corrected) is accurate.
- Steps are ordered and complete; each task ends with a runnable Verification and an expected result (`node --test <files>` for code/skill tasks, `npm test`/`npm run syntaxcheck`/`npm pack --dry-run` for the sweep, plus targeted `grep` checks for the C2 stale-reference gate in PLAN-TASK-008/009).

## SPEC + AC coverage

Complete. No gaps.

- Every SPEC-BEHAVIOR-001..012 is consumed by a task (Spec Closure 07-plan.md:340-351): 004 is split across PLAN-TASK-004 (status) and PLAN-TASK-005 (doctor); 008 across PLAN-TASK-008 (skill surface) and PLAN-TASK-009 (docs/README/D10). All others 1:1.
- Every AC-001..010 is reachable through a task's Verification:
  - AC-001: PLAN-TASK-002 (uninstall refusal), PLAN-TASK-004 (status invalid), PLAN-TASK-005 (doctor invalid) - all three branches runnable.
  - AC-002: PLAN-TASK-003 backup-target unit test. AC-003: PLAN-TASK-005 (unwritable, symlink, --json entry). AC-004: PLAN-TASK-006 (input + cli). AC-005: PLAN-TASK-008 + PLAN-TASK-009 grep. AC-006: PLAN-TASK-007. AC-007: PLAN-TASK-010. AC-008: PLAN-TASK-011 (readme-pinning). AC-009: PLAN-TASK-012. AC-010: PLAN-TASK-013 (npm test/syntaxcheck/pack).

## SPEC-nit follow-through

All four committed nits are folded in and correct:

1. **Collision-before-write (SPEC nit N-2): PRESENT.** PLAN-TASK-007 step 1 (07-plan.md:200) reorders to (1) slug validate, (2) "check the archive target and, if requirements/archive/<slug>.md already exists, stop and ask the user, writing nothing (collision check BEFORE the write)", (3) write-then-remove. The Verification (07-plan.md:204) re-asserts "collision-before-write, write-then-remove, and invalid-slug stop." This deliberately corrects the SPEC's literal step numbering (which presented write before collision) to honor R-E1 no-overwrite; it is an intentional, correct improvement, not a drift.
2. **safeBackupForSkill skillsRoot threading (SPEC nit N-1): PRESENT.** PLAN-TASK-003 step 2 (07-plan.md:101): "Thread skillsRoot at the uninstall.js:136 call site so it is never passed as undefined." Confirmed lib/uninstall.js:136 is the single call site, so this is the only thread needed.
3. **Doctor tests pinned to test/status.test.js (SPEC nit N-4): PRESENT.** PLAN-TASK-005 Files lists test/status.test.js only (07-plan.md:139) and step 3 (07-plan.md:150) places the doctor tests there; no capability.test.js is introduced. PLAN-TASK-003 likewise pins the backup-target unit test to test/uninstall.test.js (07-plan.md:86), resolving the SPEC's other "X or Y" location. (Note: the read-only Upstream Summary copy of the SPEC test matrix still shows the "or new test/capability.test.js" wording at 07-plan.md:527,529; the PLAN's own tasks override it with pinned files - correct.)
4. **Article fix (SPEC nit, think wording): PRESENT.** PLAN-TASK-012 step 1 (07-plan.md:316) edits to "A **Proposed Design Summary**" and explicitly notes "fixing the article from 'An'", matching the verified current line.

## Correctness traps

No blocking traps. Manageable shared-file overlaps, all phase-ordered with distinct sections:

- **archive-req fragment + golden touched by PLAN-TASK-007 (Phase 1) and PLAN-TASK-010 (Phase 3).** Both edit templates/fragments/archive-req.behavior.md, skills/archive-req/SKILL.md, and test/fixtures/golden/xsk-archive-req.md. Because phases run in order and each task regenerates SKILL.md+golden from the current fragment, PLAN-TASK-010 is purely additive (the fragment already carries PLAN-TASK-007's collision/slug logic). Safe as long as ordering holds; the PLAN does not explicitly remind the implementer that 010 must preserve 007's content. Low coordination note.
- **docs/REQUIREMENTS.md edited by PLAN-TASK-007 (§4.5), 009 (§4.2 + §13 D10), 010 (§10), 011 (§7/§14); READMEs by 009 (bypass description) and 011 (discovery-alias section); test/skill-behavior.test.js by 007/008/010/012.** Each touch hits a distinct section/test block, phase-ordered, so conflict risk is low. readme-pinning (heading parity) guards the README edits; PLAN-TASK-009 changes a description (not a heading) and PLAN-TASK-011 adds identical EN/CN headings. No untouched-test break: the one test whose assertions change under a code edit (input.test.js:97-101 message) is explicitly updated by PLAN-TASK-006 step 3 (07-plan.md:174); golden/skill-behavior are regenerated/updated by every skill-touching task.
- No modify target is missing; no create target exists (there are no create tasks).

## Unresolved ambiguity

None of substance. No task hedges a behavioral decision; DECISION-001 (stop-and-ask) is baked into PLAN-TASK-007. The R-H1 verification gate in PLAN-TASK-011 step 1 is a defined precondition with a named owner and a recorded outcome, not an open question. PLAN-TASK-006's skeleton is illustrative (it sketches the allow-list gate but omits the existing `--platform` value-consumption / `--platform=` / `--json` handling); the Steps (07-plan.md:172-173) explicitly require preserving that parsing, so the task is unambiguous in prose even though the skeleton alone is not drop-in.

## Recommended changes (nits only; none blocking)

1. **N-1 (low) - run self-conformance/syntaxcheck per skill-fragment task.** PLAN-TASK-007/008/010/012 verify with `node --test test/skill-behavior.test.js test/golden.test.js`, which would not catch a dash/AI-filler regression in the archive/bypass/think fragments (skill-behavior only em-dash-checks the write-req body; golden matches because the stray char lands in both SKILL.md and the regenerated golden). That regression surfaces only at PLAN-TASK-013. Add `test/self-conformance.test.js` (and/or `npm run syntaxcheck`) to those tasks' Verification to catch it earlier (cheap; enforces RISK-PROC-002).
2. **N-2 (low) - note the additive overlap for shared files.** State in PLAN-TASK-010 (and the bypass docs/README split) that it must preserve PLAN-TASK-007's archive content when regenerating, and that the docs/README/skill-behavior multi-touches are section-disjoint and phase-ordered, so later tasks append rather than revert.
3. **N-3 (very low) - flesh out the PLAN-TASK-006 skeleton** to show `--platform <value>` / `--platform=` value consumption alongside the allow-list gate, so the skeleton matches the (correct) Steps and the existing parser shape.

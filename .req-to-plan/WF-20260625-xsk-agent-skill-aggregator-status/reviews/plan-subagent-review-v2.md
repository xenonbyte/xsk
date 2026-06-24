stage: plan
version: 2
reviewer: subagent (read-only)
audited_at: 2026-06-24T20:19:51Z

## Audit Scope

Read-only audit of `07-plan.md` (PLAN-TASK-001..010) against `docs/REQUIREMENTS.md` (§1, §5, §11, §12), the approved `06-spec.md` (SPEC-BEHAVIOR-001..007, API/Config Contracts, Test Matrix), and `05-design.md`, on four axes: coverage, task quality, unresolved ambiguity, and hedging-without-decision.

## Findings

### a. Coverage

All 7 Behavior Contracts are consumed by some task's Spec References: SPEC-BEHAVIOR-001 → PLAN-TASK-005/009/010; 002 → 006/010; 003 → 004/007/010; 004 → 007; 005 → 001/002/008; 006 → 003/009; 007 → 009. No behavior is orphaned.

- [Info] PLAN-TASK-001's "Scope Coverage: SCOPE-IN-001..007" line is read as the r2p gate-required trace-closure declaration (per review brief), not scope creep. All seven in-scope items are realized: SCOPE-IN-001 by 003+009, 002 by 002+008, 003 by 005+009, 004 by 004+005+006, 005 by 003, 006 by skill authoring in 009, 007 by 001's self-conformance floor. Clean.
- [Important] **Trace-table AC closure is incomplete.** Every AC's *implementation work* is covered by task Steps, but the Trace table (07-plan.md:262-272) omits three ACs from task upstreams: **AC-003** (golden snapshots) is implemented in PLAN-TASK-010 Steps but 010's trace cites only AC-006; **AC-004** (non-agent-skill project + scaffold errors out; manual acceptance per Test Matrix 06-spec.md:57) is realized via PLAN-TASK-009 skill authoring but is cited in no task trace; **AC-007** (read-only `status` report) is implemented in PLAN-TASK-007 but 007's trace cites only `D8`. AC-001/002/005/006 are cited correctly. An R3 closure check keyed on the Trace table would flag AC-003/004/007 as unclosed. Recommend adding the three missing AC citations to tasks 010, 009, 007 respectively.
- [Info] SCOPE-IN-006 (the `requirements/` convention, §10) has no dedicated `lib/` task — it is carried only as skill-source authoring in PLAN-TASK-009. This is correct per spec (write-req/archive-req are pure-instruction skills, not CLI code) and is pre-flagged as the one implicitly-carried in-scope item in the spec-subagent-review; the PLAN-TASK-001 Scope Coverage line closes it for trace purposes.

### b. Task quality

Decomposition is sound and respects the REQUIREMENTS.md §11 phase order. Dependency direction is sane: generator (003) and manifest (004) precede install (005); install precedes uninstall (006); input (002) precedes bin (008); adapters (005, 009) precede the cross-platform suite (010). All 10 tasks are `create` (greenfield), all `TDD Applicable: yes`, and the Files lists are consistent.

- [Info] Two bundles cross phase boundaries harmlessly: PLAN-TASK-007 merges `status` (Phase 1) with `doctor` (Phase 2); PLAN-TASK-009 merges the three Phase-2 adapters with the four Phase-3 skill sources. Both are cohesive read-only / authoring groupings and do not violate the "usable after each phase" invariant (Phase 1 deliverable — a working Claude install of `xsk-think` — is fully covered by 001-005+008+010's subset).
- [Info] Skeletons are real and minimal. `render()` in PLAN-TASK-003 is a genuinely working `{{PLACEHOLDER}}` substitution; `main()` in PLAN-TASK-008 is real dispatch wiring. The stub returns in 002/004/005/006/007 are acceptable TDD red-starting points, with the Steps supplying the real contract.
- [Minor] PLAN-TASK-004's skeleton `validate()` checks only `platform` + `installed_paths` (07-plan.md:103-105), thinner than its own Steps which require `schema_version`/`version`/`installed_at`/`backups[]` as well. A coder working only from the skeleton would under-validate. Steps are authoritative so risk is low, but aligning the skeleton field set to the Step list would remove the trap.
- [Minor] PLAN-TASK-009's codex adapter skeleton exports `{ skillsRoot: '.agents/skills' }` (07-plan.md:227) — a relative segment with no home prefix or trailing slash — while its Steps specify the absolute root `~/.agents/skills/`. A fresh implementer must infer the home-join; making the skeleton value `path.join(os.homedir(), '.agents', 'skills')` (or documenting the join) removes the ambiguity.
- [Info] All 10 Verifications are concrete command + expected result (e.g. 005: "`node --test test/install.test.js` passes; install creates `~/.claude/skills/xsk-think/SKILL.md` plus `.xsk-owned`"; 008: "`node bin/xsk.js version` prints the version; `node bin/xsk.js --bad` exits non-zero"). None is a placeholder.

### c. Unresolved ambiguity

- [Important] **PLAN-TASK-009 underspecifies the `xsk-skill-scaffold` skill.** Its single Step ("Author skills/skill-scaffold, write-req, archive-req SKILL.md sources", 07-plan.md:232) covers three substantial skills in one line. §4.3 defines detailed scaffold behavior — gate-first (refuse non-agent-skill projects), audit against the standard, propose a patch plan, apply on approval — and AC-004 requires "non-agent-skill project + `xsk-skill-scaffold` errors out" (manual acceptance). The plan neither decomposes the gate/audit/propose/apply flow into distinct steps nor names the scaffold's test/acceptance surface, so an implementer must infer how much prose to author and how an instruction-skill expresses the "errors out" gate. Fully implementable by reading §4.3, but the step granularity is thin relative to its acceptance criterion; recommend splitting the scaffold authoring into explicit gate/audit/propose/apply sub-steps.
- [Minor] **Partial-uninstall exit code is still not pinned.** PLAN-TASK-006's Verification says "the exit code signals partial" without naming the integer (07-plan.md:159), and PLAN-TASK-008 (which wires exit codes) does not pin it either. This carries forward the spec-subagent-review [Minor] (06-spec review, finding c) unresolved; pinning a value (e.g. `2`) closes it.
- [Minor] PLAN-TASK-009's Files list omits test files, yet its Steps say "Tests: per-platform roots correct; bypass-claude skipped on non-Claude platforms". It is inferable (and the Verification confirms) that these cases extend PLAN-TASK-005's `test/install.test.js`, but the reuse is implicit rather than stated.
- [Info] PLAN-TASK-006's DECISION presupposes deterministic regeneration for the byte-compare; this holds given SPEC-BEHAVIOR-006's `{{PLACEHOLDER}}`-only model, so the mechanism is sound.

### d. Hedging without decision

No uncommitted "may/could/or" that defeats the decision-complete baseline.

- [Info] **PLAN-TASK-006's DECISION on user-edit detection is concrete and committed** (07-plan.md:157): "regenerate the file from current sources and byte-compare to disk; if they differ, treat as user-edited, retain it, report partial, narrow the retained manifest." This **resolves** the spec-subagent-review's lone [Important] (unspecified detection mechanism, 06-spec review finding b) without extending the manifest schema. Verified stated concretely, not a hedge.
- [Info] **PLAN-TASK-007 resolves the spec-review [Info] on `status` precedence** by stating "invalid wins when shape is bad" (07-plan.md:181), closing the drift-vs-invalid ambiguity the spec left open.
- [Info] Remaining "optional" qualifiers ("optional frontmatter rendering", "optional source metadata") are bounded platform flexibility inherited verbatim from the spec and already cleared in the spec-subagent-review (finding d); they carry a hard constraint ("never a required field a platform ignores") and are decision-complete.

## Verdict

Verdict: pass — no Critical findings; every SPEC-BEHAVIOR is consumed and every AC's implementation work is covered by ordered, TDD-structured tasks with concrete verifications, the upstream [Important] on user-edit detection is concretely decided in 006, and the remaining [Important] items (incomplete AC-003/004/007 trace citations; thin scaffold-skill step) are improvable in-place without re-planning and do not block a faithful implementation.

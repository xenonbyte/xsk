---
r2p_stage: design
r2p_version: 5
r2p_status: approved
r2p_created_at: 2026-06-25T17:23:19.742942+00:00
r2p_updated_at: 2026-06-25T17:47:22.908208+00:00
---

# Design

## Design Summary
Three independently-mergeable phases. Phase 1 hardens lib/CLI safety and
correctness: a shared path-containment layer that makes a shape-valid-but-corrupt
manifest refuse out-of-root operations (uninstall/status/doctor), a new
`doctor` xskRoot-writability check, per-command option allow-lists in the parser,
and an atomic `xsk-archive-req` body. Phase 2 recasts `xsk-bypass-claude` onto the
personal gitignored `.claude/settings.local.json` with environment and
malformed-file guards, propagated across body, registry, docs, READMEs, golden,
and tests. Phase 3 adds the single-active guard to two skills, the README
discovery-alias disclosure (behind a verification gate), and the `xsk-think`
heading wording fix. Every skill-body change flows fragments -> `buildSkill` ->
canonical `skills/<base>/SKILL.md` -> masked golden fixture. No new dependencies;
no change to `schema_version` or the shape `validate()` contract.

## Current Code Evidence
- `validate()` (lib/manifest.js:145) is shape-only; `isInsideDir(child, parent)`
  (lib/manifest.js:76) already exists for containment tests.
- `uninstall(options)` (lib/uninstall.js:299) calls
  `uninstallPlatform({ platform, xskRoot })` (lib/uninstall.js:65) and never
  resolves or passes a `skillsRoot`; `installPlatform`'s uninstall-first reset
  also calls `uninstallPlatform({ platform, xskRoot })` (lib/install.js:424) with
  `skillsRoot` already in scope (resolved at lib/install.js:404 via `rootFor`).
- `safeBackupForSkill(backups, skillFile, xskRoot, platform)` (lib/ownership.js:50)
  validates the backup file is inside `~/.xsk/install/backups/<platform>/` but
  never validates the restore `target`.
- `doctor()` (lib/capability.js:39) has `node-version`, per-platform `writable-*`,
  and `manifest-valid` checks; `isWritableDir(dir)` (lib/capability.js:16) already
  refuses symlinks/non-directory ancestors and accepts creatable-if-absent. The
  `manifest-valid` check flips to FAIL whenever `computeStatus` reports `invalid`
  (lib/capability.js:82), so an out-of-root reclassification in status covers
  `doctor` for free.
- `computeStatus(options)` (lib/status.js:76) resolves only `xskRoot`; `statusOf`
  (lib/status.js:64) returns `invalid` solely on shape-`validate` failure. Today
  the `safe` predicate is `isSafePath` (symlink/non-directory only, not
  containment), so an out-of-root recorded path that exists on disk currently
  reports `ok`, and a missing/unsafe one reports `drift`; neither is `invalid`.
  status.js already imports from `./install` (lib/status.js:8), so importing
  `rootFor` there adds no new require cycle.
- Require-cycle asymmetry: `install.js` requires `./uninstall` (lib/install.js:11)
  but `uninstall.js` does NOT require `./install`. Having `uninstall()` use
  `rootFor` therefore needs a cycle-safe access (lazy require or relocation), not
  a top-level destructure (which would capture `undefined`, the way capability.js:7
  works only because capability.js is not in the cycle).
- `doctor()` calls `computeStatus({ platforms, xskRoot })` (lib/capability.js:74)
  and currently drops `opts.platformRoots`; once `computeStatus` resolves
  `skillsRoot` from `platformRoots`, `doctor` must forward `platformRoots` or it
  resolves against the real home dir, breaking test isolation.
- `parse(argv)` (lib/input.js:31): word-form `version`/`help` fall into the
  generic option loop; `--platform` is accepted for every command and only
  `--json` is per-command gated (lib/input.js:84), so `version --platform claude`
  is silently accepted while `version --json` is rejected.
- The bin layer already threads `platformRoots` + `xskRoot` into
  `uninstall`/`computeStatus`/`doctor` via `dispatchOptions` (bin/xsk.js:100,
  127, 138, 145), so no new CLI plumbing is needed.
- bypass registry description still says `.claude/settings.json` (lib/skills.js:16);
  fragments `bypass-claude.{purpose,behavior,output}.md` target `settings.json`
  and explicitly say "Never touch `.claude/settings.local.json`".
- `archive-req.behavior.md` is move-then-edit (step 3 move, step 4 edit) with no
  collision or slug guard; `write-req.behavior.md` step 2 states the single-active
  invariant but does not guard a broken one.
- `think.output.md:1` says "**Approved Design Summary**"; `skill-behavior.test.js:60`
  asserts that exact phrase and lines 64-73 assert `settings.json` targeting, so
  both test assertions change under R-I1 and R-D.
- Pipeline: `buildSkill` (lib/generator.js:19) renders fragments + shared into
  the canonical `skills/<base>/SKILL.md`; `golden.test.js` pins the masked shell
  (test/fixtures/golden/<name>.md) and byte-matches `skills/<base>/SKILL.md` to
  `buildSkill` output (test/golden.test.js:64). No npm "regenerate" script exists;
  regeneration is a `buildSkill`-driven write of both files.

## Requirements Coverage
| Requirement | Design element |
|---|---|
| SCOPE-IN-001 / R-A1..R-A4 | DES-ARCH-001, DES-A-002, DES-A-004 |
| AC-002 / R-A2 | DES-A-003 |
| SCOPE-IN-002 / R-B1 | DES-B-005 |
| SCOPE-IN-003 / R-C1 | DES-C-006 |
| SCOPE-IN-005 / R-E1..R-E3 | DES-E-007 (+ DECISION-001) |
| SCOPE-IN-004 / R-D1..R-D4 | DES-D-008 |
| SCOPE-IN-006 / R-F1 | DES-F-009 |
| SCOPE-IN-007 / R-H1 | DES-H-010 |
| SCOPE-IN-008 / R-I1 | DES-I-011 |
| Cross-cutting generation/test discipline | DES-PROC-012 |

## Options Considered
- Containment placement (R-A): (A) a separate `validateOperationalSemantics`
  layer in manifest.js next to `validate`/`isInsideDir`, consumed by all three
  surfaces; (B) inline `isInsideDir` checks duplicated in uninstall/status/doctor.
  Chosen A: one helper, one definition of "out of root", no drift between
  surfaces (mitigates RISK-SEC-002). Keeps shape `validate()` untouched
  (SOR-001).
- status invalid mechanism (R-A3): (A) have `statusOf`/`computeStatus` consult
  the containment layer and return `invalid` before drift evaluation; (B) add a
  fourth state. Chosen A: reuses the existing `invalid` state and the existing
  `doctor` manifest-valid coupling, so `doctor` needs no separate containment
  code.
- Parser shape (R-C): (A) per-command allowed-option allow-lists driving the
  loop; (B) a general option-spec framework. Chosen A: minimal, matches the
  existing hand-rolled parser, preserves all current accepted forms (SOR-002).
- Archive collision (R-E1): stop-and-ask vs timestamped name. Raised as
  DECISION-001; recommendation stop-and-ask for consistency with the skill
  family's loud-stop behavior (R-E3 invalid-slug stop, R-F multi-active stop).

## Chosen Design
### DES-ARCH-001 Shared path-containment layer
Add `validateOperationalSemantics({ platform, skillsRoot, manifest })` to
lib/manifest.js (beside `validate` and `isInsideDir`). It returns a result that
is `invalid` when any `installed_paths[]` entry does not satisfy
`isInsideDir(entry, skillsRoot)`. (No `xskRoot` parameter: backup-dir and
backup-file containment stay in `safeBackupForSkill`, so this helper is scoped to
`installed_paths` against `skillsRoot` only.) It does not mutate the manifest and
does not replace shape `validate()`; callers run shape `validate()` first, then
this layer. This is the single definition of "outside the resolved platform
skills root" shared by uninstall, status, and doctor (via status).

### DES-A-002 uninstall threads skillsRoot and refuses out-of-root manifests
`uninstall(options)` resolves `skillsRoot` per platform and passes it into
`uninstallPlatform({ platform, xskRoot, skillsRoot })`. To resolve `skillsRoot`
without creating an install/uninstall require cycle (install.js requires
uninstall.js, not vice-versa), `uninstall()` reaches `rootFor` via a
function-scope lazy require (`require('./install').rootFor`) rather than a
top-level destructure; this mirrors the ownership.js split rationale recorded in
docs D9. (Alternative considered: relocate `rootFor`/`ALL_PLATFORMS` to a neutral
module both sides require; rejected as a larger change for no extra benefit.)
`uninstallPlatform` runs shape `validate()` then `validateOperationalSemantics`
before the per-skill loop; on out-of-root it returns the existing `invalid`
shape (removes nothing, restores nothing, retains the manifest, `exitCode`
FAILURE). The uninstall-first reset call site in `installPlatform`
(lib/install.js:424) is updated to pass the already-resolved `skillsRoot` (in
scope at lib/install.js:404), so no lazy require is needed there; a corrupt
out-of-root prior manifest therefore makes the reset refuse, and install rolls
back via its existing snapshot path rather than acting on an out-of-root path. No
`os.homedir()` fallback is introduced; tests inject `platformRoots`.

### DES-A-003 Backup restore target containment
Extend the backup-safety check so the restore `target` must satisfy
`isInsideDir(target, skillsRoot)` in addition to the existing backup-file-inside-
backup-dir check. Implemented by passing `skillsRoot` to `safeBackupForSkill` and
returning `unsafe: true` when the target escapes `skillsRoot`; the existing
unsafe path already retains the skill dir/file and marks the platform partial,
which is the `partial/retained` outcome R-A2/AC-002 require. The backup-file and
backup-dir semantics are unchanged (RISK-SEC-003).

Reachability note: in full uninstall integration this is defense-in-depth.
`safeBackupForSkill` matches a backup only when `b.target === skillFile`, and
`skillFile` is derived from an `installed_paths` entry under `skillsRoot`; an
out-of-root `installed_paths` entry is already rejected wholesale by DES-A-002
before the per-skill loop runs. So the target-containment branch is exercised and
asserted at the `safeBackupForSkill` unit boundary (a backup whose `target`
escapes `skillsRoot` returns `unsafe: true` and writes nothing), satisfying
AC-002's "refused and does not write outside the root"; the SPEC pins this as a
unit test, not an integration scenario.

### DES-A-004 status and doctor report invalid (not drift) on out-of-root paths
`computeStatus` resolves `skillsRoot = rootFor(platform, opts.platformRoots)` per
platform (rootFor imported normally in status.js, which already requires
`./install`) and consults `validateOperationalSemantics`; an out-of-root recorded
path yields `state: 'invalid'` with a reason, evaluated before the drift check so
genuine in-root drift still reports `drift` (RISK-COR-002). `doctor` inherits
this through its existing `manifest-valid` coupling to `computeStatus`; no
separate containment code in capability.js. Required call-site fix: `doctor()`
must forward `opts.platformRoots` into its `computeStatus(...)` call
(lib/capability.js:74 currently passes only `{ platforms, xskRoot }`), or doctor
would resolve `skillsRoot` against the real home dir and break the injected-root
test isolation and AC-001's doctor case.

### DES-B-005 doctor writable-xsk-root check
`doctor` adds a `writable-xsk-root` check (name `writable-xsk-root`, label naming
the resolved `xskRoot`) computed by `isWritableDir(xskRoot)`. A symlinked or
unwritable `xskRoot` yields `pass: false`; `allPass` already ANDs every check, so
`doctor` exits non-zero. The check entry is part of the `checks[]` array, so JSON
output includes it.

### DES-C-006 Per-command option allow-lists in parse()
Define per-command allowed options: `version`/`help` -> none;
`install`/`uninstall` -> `--platform`; `status`/`doctor` -> `--platform`,
`--json`. The word-form `version`/`help` no longer fall into a permissive loop;
any option for them errors non-zero with a clear message. `--json` outside
status/doctor and `--platform` outside install/uninstall/status/doctor both
error. All currently-accepted forms (`xsk -v`, `xsk help`, `xsk status --json`,
`xsk install --platform claude,codex`) are preserved; `xsk version --json` stays
rejected (RISK-COR-001). Existing-test impact: `input.test.js:97-101` currently
asserts `version`/`help` + `--json` throws the `/--json.*status.*doctor/` message;
under per-command allow-lists the rejection message changes, so that existing
assertion is updated (not merely augmented) alongside the new negative cases.

### DES-E-007 xsk-archive-req atomicity, collision, invalid-slug
Rewrite `archive-req.behavior.md` to: (1) resolve and validate the slug against
`^[a-z0-9]+(-[a-z0-9]+)*$`, stopping and reporting on a missing/invalid slug
(R-E3) before any write; (2) write the fully-updated archived content
(`status: archived` + `archived_at`, body unchanged) to
`requirements/archive/<slug>.md`, confirm it landed, then remove the source
active doc (write-then-remove, R-E2); (3) on an existing archive target, stop and
ask the user to decide and write nothing (DECISION-001 resolved to stop-and-ask;
no silent overwrite, R-E1). Update `archive-req.output.md` and docs section 4.5
to match.

### DES-D-008 xsk-bypass-claude recast to settings.local.json with guards
Rewrite `bypass-claude.{purpose,behavior,output}.md` to target
`.claude/settings.local.json` only and never write `.claude/settings.json`
(R-D1: create-from-scratch payload, merge-only `permissions.defaultMode` with
2-space indent + trailing newline, idempotent no-op). Add a Claude-Code-only
guard: off Claude Code, state it is Claude-Code-only, write nothing, stop (R-D2).
Add a malformed-file guard: if `settings.local.json` exists but is not valid JSON
or not a JSON object, stop and report, never overwrite/truncate (R-D3). Report
only the path and that `defaultMode` is `bypassPermissions` (R-D4). Update
`lib/skills.js:16` registry description, docs section 4.2 (steps 2-4, the
"reads only settings.json" note, and the step-5 "resulting JSON" wording),
add a D-row to section 13 (D7 unchanged), and update both READMEs.

### DES-F-009 Single-active guard in write-req and archive-req
Add to both `write-req.behavior.md` and `archive-req.behavior.md`: when scanning
`requirements/*.md` (excluding `archive/`), if more than one doc has
`status: active`, stop, list the offending paths, and report the broken
invariant for the user to resolve. No multi-active workflow, no auto-resolution;
retain the existing single-active language (SOR-004). Confirm docs section 10
wording.

### DES-H-010 README discovery-alias disclosure (gated)
At Phase 3 start, re-verify the discovery-alias facts (opencode reads
`~/.claude/skills` and `~/.agents/skills`; Gemini reads `~/.agents/skills`)
against current official opencode/Gemini docs; if changed, update copy and docs
section 7/14. Then add a short "Discovery aliases and duplicate skills" section
to `README.md` and `README.zh-CN.md` with identical headings and English
literals preserved, stating the alias reads, the cross-platform visibility
consequence, that xsk still installs each platform's own owned, independently
uninstallable copy, and that `xsk-bypass-claude` is inert off Claude Code.

### DES-I-011 xsk-think output heading
Change `think.output.md:1` from "Approved Design Summary" to "Proposed Design
Summary". Update `skill-behavior.test.js:60` to assert "Proposed Design Summary"
(and that "Approved Design Summary" is absent). Regenerate canonical SKILL.md and
golden.

### DES-PROC-012 Generation and test-update discipline (cross-cutting)
For every touched skill, edit fragments only, regenerate `skills/<base>/SKILL.md`
via `buildSkill`, and regenerate the masked golden fixture; never hand-edit a
generated SKILL.md (RISK-PROC-001). ASCII hyphens only, no filler
(RISK-PROC-002). README EN/CN heading parity preserved (RISK-PROC-003). Update
the affected `skill-behavior.test.js` assertions (bypass-claude target inversion,
think wording, archive/write-req guards) and add the new lib/CLI tests with
injected `platformRoots`/`xskRoot`.

## Decision Requests

### DECISION-001 xsk-archive-req behavior on an existing archive target
Question: When `requirements/archive/<slug>.md` already exists, should
`xsk-archive-req` stop and ask the user, or write a timestamped
`requirements/archive/<slug>-YYYYMMDD-HHMMSS.md` instead?
Options: A) Stop and ask the user to decide (no write until the user chooses).
B) Auto-write a timestamped archive name and report it.
Recommended: A
Selected: A (stop and ask). Selected by the user on 2026-06-26.
Rationale: R-E1 permits either and leaves it to the implementer; stop-and-ask is
consistent with this skill family's loud-stop behavior (R-E3 invalid-slug stop,
R-F multi-active stop) and avoids silently accumulating archive copies. A
re-archive collision is unusual (it implies the slug was re-activated), so
surfacing it is safer than proceeding automatically. The chosen option is written
verbatim into the skill body and asserted in `skill-behavior.test.js`.
Status: selected

## Rollback
- All changes are local edits under version control; revert is `git restore` /
  branch discard per phase. Each phase is independently mergeable and revertible.
- No data migration, no manifest schema change, no persisted external state, so
  no runtime rollback procedure is required.
- The containment layer is additive (a second validation pass); disabling it is a
  one-call removal at the three consume sites, leaving shape `validate()` and all
  prior behavior intact.
- Regeneration is reproducible: `buildSkill` deterministically rebuilds every
  `skills/<base>/SKILL.md` and masked golden from the fragments, so a fragment
  revert plus regenerate restores the exact prior skill surface.

## Observability
- `doctor` surfaces the new `writable-xsk-root` check (PASS/FAIL + detail) in
  human and `--json` output; failure flips `allPass` and the process exit code.
- `status`/`doctor` report `invalid` (with a reason string) for an out-of-root
  manifest, distinguishing it from `drift` in both human and JSON output.
- `uninstall` refusal returns the existing `invalid` result shape with an
  `error` message and FAILURE exit code; the manifest is retained for inspection.
- The parser emits a clear `xsk: <message>` on a rejected option and exits
  non-zero.
- Skills report their action explicitly: `xsk-bypass-claude` reports the path and
  `defaultMode`; refusals (non-Claude, malformed file) state the reason and write
  nothing. `xsk-archive-req` reports the archived path or the stop reason.
- Test suite is the regression surface: new lib/CLI tests, updated
  skill-behavior and input.test.js assertions, golden, self-conformance,
  readme-pinning, plus `npm run syntaxcheck` and `npm pack --dry-run` (AC-010).

## SPEC Handoff
- Phase boundaries: Phase 1 = DES-ARCH-001, DES-A-002, DES-A-003, DES-A-004,
  DES-B-005, DES-C-006, DES-E-007 (+ DECISION-001); Phase 2 = DES-D-008; Phase 3
  = DES-F-009, DES-H-010, DES-I-011. DES-PROC-012 applies to every skill-touching
  phase.
- SPEC must enumerate, per design element, the concrete behavioral assertions
  and the exact new/changed tests, including: the three R-A tests (out-of-root
  uninstall refusal, backup-target escape refusal, status/doctor invalid), the
  two R-B tests (unwritable and symlinked xskRoot), the R-C negative/positive
  parser cases, and the bypass/archive/write-req/think skill-behavior assertions.
- Test-isolation contract: every new install/uninstall/status/doctor test injects
  per-test temp `platformRoots` + `xskRoot`; no `os.homedir()` fallback.
- Call-site contract: (a) `uninstallPlatform` gains a required `skillsRoot`; both
  callers (lib/uninstall.js, lib/install.js:424) must pass it. (b) `uninstall()`
  reaches `rootFor` via a lazy require to avoid the install/uninstall cycle.
  (c) `doctor()` must forward `opts.platformRoots` into its `computeStatus(...)`
  call (lib/capability.js:74). (d) `computeStatus` resolves `skillsRoot` per
  platform from `platformRoots`.
- Existing-test updates required (not just additions): `input.test.js` `--json`
  rejection-message assertion (lines ~97-101); `skill-behavior.test.js` bypass
  target assertions (lines ~64-73) and the `Approved Design Summary` assertion
  (line ~60).
- Verification gate: DES-H-010 README copy is blocked until the discovery-alias
  facts are re-verified (owner: Phase 3 implementer); record the outcome.
- DECISION-001 is resolved (stop-and-ask); the SPEC pins that as the
  archive-collision assertion.

## Risk Closure
Closure status for every risk carried from the risk_discovery stage:

- RISK-SEC-001 [ADDRESSED] by DES-A-002 (containment rejects only out-of-root paths; full suite stays green).
- RISK-SEC-002 [ADDRESSED] by DES-ARCH-001 (single shared containment layer and one skillsRoot resolution).
- RISK-SEC-003 [ADDRESSED] by DES-A-003 (restore-target containment added without altering backup-file/backup-dir checks).
- RISK-SEC-004 [ADDRESSED] by DES-D-008 (body, registry, docs, READMEs, golden all retargeted; C2 gate asserts zero stale settings.json references).
- RISK-SEC-005 [ADDRESSED] by DES-E-007 (write-then-confirm-then-remove ordering pinned in the body and tests).
- RISK-COR-001 [ADDRESSED] by DES-C-006 (per-command allow-lists; existing accepted forms preserved, version --json still rejected).
- RISK-COR-002 [ADDRESSED] by DES-A-004 (out-of-root reclassified to invalid before drift; in-root drift unchanged).
- RISK-PROC-001 [ADDRESSED] by DES-PROC-012 (fragments -> buildSkill -> canonical SKILL.md -> masked golden; golden + self-conformance run).
- RISK-PROC-002 [ADDRESSED] by DES-PROC-012 (ASCII hyphens only, no filler; syntaxcheck + self-conformance).
- RISK-PROC-003 [ADDRESSED] by DES-PROC-012 (EN/CN heading parity preserved; readme-pinning test).
- RISK-PROC-004 [DEFERRED] to the Phase 3 verification gate in DES-H-010 (owner: Phase 3 implementer re-verifies opencode/Gemini docs before README copy).

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| DES-ARCH-001 | SCOPE-IN-001, R-A4, RISK-SEC-002 | designed |
| DES-A-002 | SCOPE-IN-001, R-A1, AC-001, RISK-SEC-001 | designed |
| DES-A-003 | AC-002, R-A2, RISK-SEC-003 | designed |
| DES-A-004 | SCOPE-IN-001, R-A3, AC-001, RISK-COR-002 | designed |
| DES-B-005 | SCOPE-IN-002, R-B1, AC-003 | designed |
| DES-C-006 | SCOPE-IN-003, R-C1, AC-004, RISK-COR-001 | designed |
| DES-E-007 | SCOPE-IN-005, R-E1..R-E3, AC-006, RISK-SEC-005 | designed |
| DES-D-008 | SCOPE-IN-004, R-D1..R-D4, AC-005, RISK-SEC-004 | designed |
| DES-F-009 | SCOPE-IN-006, R-F1, AC-007 | designed |
| DES-H-010 | SCOPE-IN-007, R-H1, AC-008, RISK-PROC-004 | designed |
| DES-I-011 | SCOPE-IN-008, R-I1, AC-009 | designed |
| DES-PROC-012 | AC-010, RISK-PROC-001..003 | designed |
| DECISION-001 | SCOPE-IN-005, R-E1 | resolved (stop-and-ask) |

## Upstream Summary (read-only)
# Risk Discovery

## Risks

### RISK-SEC-001 Containment false-positives break legitimate operations
A too-broad containment check could newly classify valid manifests as `invalid`,
causing uninstall to refuse real installs and status/doctor to report failures
for healthy installs. Code grounding: `validate()` (lib/manifest.js:145) is
shape-only today; the new layer must only reject paths that resolve outside the
resolved `skillsRoot`, leaving every currently-passing case untouched.
Status: mitigation planned (MIT-001); gated by AC-001 plus all existing
install/uninstall/status/doctor tests staying green.

### RISK-SEC-002 Inconsistent skillsRoot resolution across the three surfaces
`uninstall()` (lib/uninstall.js:299) passes only `{platform, xskRoot}` and never
threads `platformRoots`; `computeStatus` (lib/status.js:76) likewise has only
`xskRoot`; `doctor` already resolves per-platform roots via `rootFor`. If the
three surfaces resolve `skillsRoot` differently, the same corrupt manifest could
be judged `invalid` by one and `drift`/removable by another, defeating the
owned-only contract. Status: mitigation planned (MIT-002); single shared
resolution + shared containment helper.

### RISK-SEC-003 Backup target vs backup-file containment confusion (R-A2)
`safeBackupForSkill` (lib/ownership.js:50) validates the backup file is inside
`~/.xsk/install/backups/<platform>/` but never validates the restore `target`.
Adding a `target`-inside-`skillsRoot` check must not weaken the existing
backup-file check, the `install.js` `assertReusableBackupRecord` path, or the
backup-dir semantics. Status: mitigation planned (MIT-003); covered by AC-002.

### RISK-SEC-004 Stale `settings.json` references survive the bypass recast
The leak (auto-approve default committed to a shared file) persists if any
surface still references `.claude/settings.json`: skill body, registry
description (lib/skills.js:16 still says `settings.json`), READMEs, docs section
4.2, or the golden fixture. Status: mitigation planned (MIT-004); C2 requires
zero stale `settings.json` references across the skill surface.

### RISK-SEC-005 Archive mis-ordering deletes the active doc before a valid copy exists
The current archive is move-then-edit; a failure between steps loses the active
doc. If write-then-remove is implemented but the body or tests permit the old
ordering, the data-loss window remains. Status: mitigation planned (MIT-005);
AC-006 asserts write-then-confirm-then-remove ordering in the skill body.

### RISK-COR-001 Parser refactor regresses existing accepted forms
Reworking `parse()` (lib/input.js:31) into per-command allow-lists risks
breaking `xsk -v`, `xsk help`, `xsk status --json`, and
`xsk install --platform claude,codex`, or accidentally accepting
`xsk version --json` (which must stay rejected). Status: mitigation planned
(MIT-006); AC-004 pins both the preserved and newly-rejected forms.

### RISK-COR-002 status invalid-vs-drift reclassification masks real in-root drift
R-A3 reclassifies out-of-root recorded paths from `drift` to `invalid`. If the
reclassification is applied too early it could shadow genuine in-root drift
(missing/typed-wrong paths) that should still report `drift`. Status: mitigation
planned (MIT-007); containment reclassifies only out-of-root paths.

### RISK-PROC-001 Hand-edited generated SKILL.md causes golden / self-conformance drift
Editing `skills/<base>/SKILL.md` directly instead of the fragments breaks the
generation pipeline and fails `golden.test.js` and `self-conformance.test.js`.
Status: mitigation planned (MIT-008); all skill changes flow fragments ->
buildSkill -> canonical SKILL.md -> masked golden.

### RISK-PROC-002 Dash characters or AI-filler enter regenerated skill content
Em-dash (U+2014) / en-dash (U+2013) or formulaic filler in regenerated fragments
violates the content rules and self-conformance. Status: mitigation planned
(MIT-009); ASCII hyphens only, verified by syntaxcheck/self-conformance.

### RISK-PROC-003 README EN/CN heading parity break
The new discovery-alias section must use identical headings in
`README.md` and `README.zh-CN.md` with English literals preserved, or
`readme-pinning.test.js` fails. Status: mitigation planned (MIT-010); AC-008.

### RISK-PROC-004 R-H1 external facts (opencode/Gemini discovery dirs) drift
The disclosure asserts external behavior last verified 2026-06-25; if those docs
changed, the README copy could state stale facts. Status: open until the Phase 3
verification gate re-checks the official docs (owner: Phase 3 implementer); then
mitigated (MIT-011).

## Boundaries
- Only the eight in-scope items (SCOPE-IN-001..008) are delivered; the deferred
  and rejected items (SCOPE-OUT-001..006) stay out, including any change to the
  install-all default and any multi-active requirement-doc workflow.
- No new runtime dependencies; no change to `schema_version` or the shape
  `validate()` contract beyond adding a separate containment layer.
- Generated skill frontmatter stays `name` + `description` only; no
  `when_to_use` / `dispatch_intent` fields.
- Test isolation boundary: every new install/uninstall/status/doctor test
  injects per-test temp `platformRoots` + `xskRoot`; no fallback to
  `os.homedir()`.
- Skill-body edits only via the generation pipeline; never hand-edit a generated
  `SKILL.md`.
- No install-safety invariant listed in `AGENTS.md` may weaken.

## Scope Overflow Risks
- SOR-001 R-A containment may tempt a broader manifest-schema/versioning
  overhaul. Bound: add a containment layer only; do not touch `schema_version`
  or shape-`validate` semantics.
- SOR-002 R-C may tempt a full option-spec/argument framework. Bound: minimal
  per-command allow-lists in `parse()`.
- SOR-003 R-D may tempt a general settings-merge feature (arbitrary keys). Bound:
  set only `permissions.defaultMode`; preserve every other field verbatim.
- SOR-004 R-E/R-F may tempt a real multi-active workflow or an archive-history
  feature. Bound: stop-and-report guard plus single-archive collision handling
  only; no auto-resolution.
- SOR-005 R-H may tempt a README/docs restructure. Bound: one short section with
  EN/CN heading parity.

## Mitigations
- MIT-001 Containment is a second validation layer over shape `validate()`,
  rejecting only paths outside the resolved `skillsRoot`; full existing suite
  must stay green. (RISK-SEC-001)
- MIT-002 Single shared `skillsRoot` resolution (`rootFor(platform,
  platformRoots)`) and one shared containment helper consumed by uninstall,
  status, and doctor. (RISK-SEC-002)
- MIT-003 Extend backup containment to check the restore `target` is inside
  `skillsRoot` without altering the backup-file/backup-dir checks; dedicated
  test. (RISK-SEC-003)
- MIT-004 Update body, registry description, both READMEs, docs section 4.2,
  golden fixture; C2 gate asserts zero stale `settings.json` references.
  (RISK-SEC-004)
- MIT-005 Skill body specifies write-then-confirm-then-remove and no-overwrite on
  collision; skill-behavior test asserts the ordering. (RISK-SEC-005)
- MIT-006 Per-command allow-lists; `input.test.js` keeps all preserved forms and
  adds the new negative cases (`version --platform`, `help --json`,
  `help --platform x`, `version --json`). (RISK-COR-001)
- MIT-007 Containment reclassifies only out-of-root paths to `invalid`; in-root
  drift detection unchanged. (RISK-COR-002)
- MIT-008 fragments -> buildSkill -> canonical SKILL.md -> masked golden for every
  touched skill; run golden + self-conformance. (RISK-PROC-001)
- MIT-009 ASCII hyphens only, no filler; run `npm run syntaxcheck` and
  self-conformance. (RISK-PROC-002)
- MIT-010 Identical EN/CN headings, English literals preserved; run
  `readme-pinning.test.js`. (RISK-PROC-003)
- MIT-011 Phase 3 verification gate re-checks official opencode/Gemini docs
  before writing README copy; update copy and docs section 7/14 if facts moved.
  (RISK-PROC-004)

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| RISK-SEC-001 | SCOPE-IN-001, AC-001 | mitigated-by MIT-001 |
| RISK-SEC-002 | SCOPE-IN-001 | mitigated-by MIT-002 |
| RISK-SEC-003 | SCOPE-IN-001, AC-002 | mitigated-by MIT-003 |
| RISK-SEC-004 | SCOPE-IN-004, AC-005 | mitigated-by MIT-004 |
| RISK-SEC-005 | SCOPE-IN-005, AC-006 | mitigated-by MIT-005 |
| RISK-COR-001 | SCOPE-IN-003, AC-004 | mitigated-by MIT-006 |
| RISK-COR-002 | SCOPE-IN-001, AC-001 | mitigated-by MIT-007 |
| RISK-PROC-001 | SCOPE-IN-004, SCOPE-IN-005, SCOPE-IN-008 | mitigated-by MIT-008 |
| RISK-PROC-002 | SCOPE-IN-004, SCOPE-IN-005 | mitigated-by MIT-009 |
| RISK-PROC-003 | SCOPE-IN-007, AC-008 | mitigated-by MIT-010 |
| RISK-PROC-004 | SCOPE-IN-007 | open until Phase 3 gate (MIT-011) |
| SOR-001 | SCOPE-IN-001 | bounded |
| SOR-002 | SCOPE-IN-003 | bounded |
| SOR-003 | SCOPE-IN-004 | bounded |
| SOR-004 | SCOPE-IN-005, SCOPE-IN-006 | bounded |
| SOR-005 | SCOPE-IN-007 | bounded |
<!-- /r2p-read-only -->

## Project Context (read-only)
# Project Context Pack

- repo_root: `/Users/xubo/x-studio/skills-group`
- languages: {'JavaScript': 4125}
- package_managers: npm
- test_commands: ['npm test']
- entrypoints: none
- config_files: none
- dependencies (0): none
- source_dirs: ['bin', 'docs', 'lib', 'requirements', 'scripts', 'shared', 'skills', 'templates', 'test']
<!-- /r2p-read-only -->

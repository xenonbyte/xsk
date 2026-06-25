---
r2p_stage: risk_discovery
r2p_version: 1
r2p_status: approved
r2p_created_at: 2026-06-25T17:13:26.813970+00:00
r2p_updated_at: 2026-06-25T17:14:49.149170+00:00
---

# Risk Discovery

## Risks

### RISK-SEC-001 Containment false-positives break legitimate operations
A too-broad containment check could newly classify valid manifests as `invalid`,
causing uninstall to refuse real installs and status/doctor to report failures
for healthy installs. Code grounding: `validate()` (lib/manifest.js:145) is
shape-only today; the new layer must only reject paths that resolve outside the
resolved `skillsRoot`, leaving every currently-passing case untouched.
Status: mitigated
Closure: MIT-001; gated by AC-001 plus all existing install/uninstall/status/doctor tests staying green.

### RISK-SEC-002 Inconsistent skillsRoot resolution across the three surfaces
`uninstall()` (lib/uninstall.js:299) passes only `{platform, xskRoot}` and never
threads `platformRoots`; `computeStatus` (lib/status.js:76) likewise has only
`xskRoot`; `doctor` already resolves per-platform roots via `rootFor`. If the
three surfaces resolve `skillsRoot` differently, the same corrupt manifest could
be judged `invalid` by one and `drift`/removable by another, defeating the
owned-only contract.
Status: mitigated
Closure: MIT-002; single shared resolution + shared containment helper.

### RISK-SEC-003 Backup target vs backup-file containment confusion (R-A2)
`safeBackupForSkill` (lib/ownership.js:50) validates the backup file is inside
`~/.xsk/install/backups/<platform>/` but never validates the restore `target`.
Adding a `target`-inside-`skillsRoot` check must not weaken the existing
backup-file check, the `install.js` `assertReusableBackupRecord` path, or the
backup-dir semantics.
Status: mitigated
Closure: MIT-003; covered by AC-002.

### RISK-SEC-004 Stale `settings.json` references survive the bypass recast
The leak (auto-approve default committed to a shared file) persists if any
surface still references `.claude/settings.json`: skill body, registry
description (lib/skills.js:16 still says `settings.json`), READMEs, docs section
4.2, or the golden fixture.
Status: mitigated
Closure: MIT-004; C2 requires zero stale `settings.json` references across the skill surface.

### RISK-SEC-005 Archive mis-ordering deletes the active doc before a valid copy exists
The current archive is move-then-edit; a failure between steps loses the active
doc. If write-then-remove is implemented but the body or tests permit the old
ordering, the data-loss window remains.
Status: mitigated
Closure: MIT-005; AC-006 asserts write-then-confirm-then-remove ordering in the skill body.

### RISK-COR-001 Parser refactor regresses existing accepted forms
Reworking `parse()` (lib/input.js:31) into per-command allow-lists risks
breaking `xsk -v`, `xsk help`, `xsk status --json`, and
`xsk install --platform claude,codex`, or accidentally accepting
`xsk version --json` (which must stay rejected).
Status: mitigated
Closure: MIT-006; AC-004 pins both the preserved and newly-rejected forms.

### RISK-COR-002 status invalid-vs-drift reclassification masks real in-root drift
R-A3 reclassifies out-of-root recorded paths from `drift` to `invalid`. If the
reclassification is applied too early it could shadow genuine in-root drift
(missing/typed-wrong paths) that should still report `drift`.
Status: mitigated
Closure: MIT-007; containment reclassifies only out-of-root paths.

### RISK-PROC-001 Hand-edited generated SKILL.md causes golden / self-conformance drift
Editing `skills/<base>/SKILL.md` directly instead of the fragments breaks the
generation pipeline and fails `golden.test.js` and `self-conformance.test.js`.
Status: mitigated
Closure: MIT-008; all skill changes flow fragments -> buildSkill -> canonical SKILL.md -> masked golden.

### RISK-PROC-002 Dash characters or AI-filler enter regenerated skill content
Em-dash (U+2014) / en-dash (U+2013) or formulaic filler in regenerated fragments
violates the content rules and self-conformance.
Status: mitigated
Closure: MIT-009; ASCII hyphens only, verified by syntaxcheck/self-conformance.

### RISK-PROC-003 README EN/CN heading parity break
The new discovery-alias section must use identical headings in
`README.md` and `README.zh-CN.md` with English literals preserved, or
`readme-pinning.test.js` fails.
Status: mitigated
Closure: MIT-010; AC-008.

### RISK-PROC-004 R-H1 external facts (opencode/Gemini discovery dirs) drift
The disclosure asserts external behavior last verified 2026-06-25; if those docs
changed, the README copy could state stale facts.
Status: deferred
Closure: open until the Phase 3 verification gate re-checks the official docs (owner: Phase 3 implementer); then mitigated (MIT-011).

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

## Upstream Summary (read-only)
# Requirement Brief

## Goal
Bring the xsk implementation back in line with the safety contract it already
advertises (writes only to platform skill dirs and `~/.xsk/`, owned-only
removal), close five verified correctness gaps, and tighten three skill
semantics, without weakening any existing install/uninstall invariant. The work
ships as three independently mergeable phases; after each phase the system is
usable.

## In-Scope
- SCOPE-IN-001 Manifest path containment so a shape-valid-but-corrupted manifest
  cannot make uninstall, status, or doctor act on a path outside the resolved
  platform skills root (owned-only, platform-dirs-only).
- SCOPE-IN-002 `doctor` adds a `writable-xsk-root` check over the resolved
  `xskRoot`, failing on unwritable or symlinked roots.
- SCOPE-IN-003 Command-specific option validation: `version`/`help` reject every
  option; `install`/`uninstall` accept `--platform`; `status`/`doctor` accept
  `--platform` and `--json`.
- SCOPE-IN-004 `xsk-bypass-claude` retargets `.claude/settings.local.json` and
  adds safety guards (non-Claude refusal, malformed-JSON refusal), with docs,
  registry, README, golden, and test updates.
- SCOPE-IN-005 `xsk-archive-req` becomes atomic (write-then-remove), refuses to
  overwrite an existing archive target, and refuses an invalid slug.
- SCOPE-IN-006 Single-active invariant guard in `xsk-write-req` and
  `xsk-archive-req`: stop-and-report when more than one active doc exists.
- SCOPE-IN-007 README discovery-alias disclosure with EN/CN heading parity,
  after re-verifying the external opencode/Gemini facts.
- SCOPE-IN-008 `xsk-think` output heading reads "Proposed Design Summary".

## Out-of-Scope
- SCOPE-OUT-001 `status` content-drift detection (R-G) deferred.
- SCOPE-OUT-002 `status --json` `discoveryWarnings` field (R-H2) deferred.
- SCOPE-OUT-003 `xsk-check` default-read-only behavior change (R-I2) deferred.
- SCOPE-OUT-004 Trigger-enriched skill descriptions (R-I3) deferred.
- SCOPE-OUT-005 Any change to the install-all default (rejected; conflicts with
  locked decision D4 and the write-every-target success criterion).
- SCOPE-OUT-006 Any multi-active requirement-doc workflow (not a supported
  scenario; the invariant stays at most one active doc).

## Non-Goals
- Not restating or replacing the master spec `docs/REQUIREMENTS.md`; this round
  only tightens existing invariants or fixes verified gaps.
- Not adding `when_to_use` / `dispatch_intent` frontmatter fields; generated
  frontmatter stays `name` + `description` only (alias-collision rule).
- Not introducing new runtime dependencies.
- Not hand-editing any generated `SKILL.md`; all skill-body changes flow through
  the generation pipeline.

## Assumptions
- The requirement's validation evidence is accurate against commit `addb4ed`.
- The generation pipeline (`templates/fragments/*` -> `buildSkill` ->
  `skills/<base>/SKILL.md` -> masked golden fixtures) is the only sanctioned path
  for skill-body edits.
- Every new install/uninstall/status/doctor test injects per-test temp
  `platformRoots` + `xskRoot`; no test falls back to `os.homedir()`.
- Discovery-alias facts (opencode reads `~/.claude/skills` and `~/.agents/skills`;
  Gemini reads `~/.agents/skills`) hold as last verified 2026-06-25 and are
  re-checked at the R-H1 verification gate before README copy is written.
- `.claude/settings.local.json` is the personal, gitignored settings file, so no
  team-impact confirmation is required for R-D.

## Acceptance Criteria
- AC-001 An out-of-root recorded path in an otherwise shape-valid manifest makes
  uninstall refuse (removes nothing, changes nothing, retains the manifest) and
  makes `status` and `doctor` report `invalid` (not `drift`).
- AC-002 A backup restore whose `target` escapes `skillsRoot` is refused and
  writes nothing outside the root; the skill dir goes partial/retained.
- AC-003 `doctor` reports `writable-xsk-root` FAIL (allPass false, non-zero exit)
  for an unwritable or symlinked `xskRoot`; JSON output includes the new check.
- AC-004 `version`/`help` reject any option non-zero; `install`/`uninstall`
  accept `--platform`; `status`/`doctor` accept `--platform` and `--json`;
  previously accepted forms are unchanged; `version --json` is still rejected.
- AC-005 `xsk-bypass-claude` writes only `.claude/settings.local.json` (never
  `settings.json`), refuses off Claude Code, refuses a malformed or non-object
  JSON file, and reports only the path and `defaultMode`; docs section 4.2,
  registry, both READMEs, golden, and tests are updated; a D-row records the
  scope change.
- AC-006 `xsk-archive-req` does write-then-remove, refuses to overwrite an
  existing archive target (timestamped or stop, stated in the body), and refuses
  an invalid slug; docs section 4.5, golden, and skill-behavior tests updated.
- AC-007 `xsk-write-req` and `xsk-archive-req` stop-and-report on more than one
  active doc; single-active language is retained; docs section 10 confirms the
  guard without introducing a multi-active flow.
- AC-008 Both READMEs contain the discovery-alias section with identical
  headings; English literals preserved in the zh-CN copy; `readme-pinning` test
  passes.
- AC-009 The generated `xsk-think` body says "Proposed Design Summary" with zero
  "Approved Design Summary" occurrences.
- AC-010 Full verification is green: `npm test`, `npm run syntaxcheck`,
  `npm pack --dry-run` (no unexpected content change), golden tests, the
  self-conformance test, and the README pinning test.

## Open Questions
- None blocking. R-E1 leaves the implementer a documented choice (timestamped
  archive name vs stop-and-ask) to settle at design time. R-H1's external facts
  are gated behind a named verification owner (Phase 3 implementer), not left as
  an unresolved unknown.

## Sources
- `requirements/post-review-hardening.md` (this requirement; validated at commit
  `addb4ed`).
- `docs/REQUIREMENTS.md` (master spec; sections 4.2, 4.5, 7, 10, 13, 14).
- `AGENTS.md` (install-safety invariants that must not weaken).
- Code under review: `lib/manifest.js`, `lib/uninstall.js`, `lib/ownership.js`,
  `lib/capability.js`, `lib/input.js`, `lib/skills.js`.
- Skill surface: `skills/bypass-claude/SKILL.md`, `skills/archive-req/SKILL.md`,
  `templates/fragments/*`, `test/skill-behavior.test.js`,
  `test/readme-pinning.test.js`, `test/self-conformance.test.js`.

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| SCOPE-IN-001 | R-A1..R-A4 | covered |
| SCOPE-IN-002 | R-B1 | covered |
| SCOPE-IN-003 | R-C1 | covered |
| SCOPE-IN-004 | R-D1..R-D4 | covered |
| SCOPE-IN-005 | R-E1..R-E3 | covered |
| SCOPE-IN-006 | R-F1 | covered |
| SCOPE-IN-007 | R-H1 | covered |
| SCOPE-IN-008 | R-I1 | covered |
| SCOPE-OUT-001 | R-G | excluded |
| SCOPE-OUT-002 | R-H2 | excluded |
| SCOPE-OUT-003 | R-I2 | excluded |
| SCOPE-OUT-004 | R-I3 | excluded |
| AC-001 | R-A1, R-A3 | covered |
| AC-002 | R-A2 | covered |
| AC-003 | R-B1 | covered |
| AC-004 | R-C1 | covered |
| AC-005 | R-D1..R-D4 | covered |
| AC-006 | R-E1..R-E3 | covered |
| AC-007 | R-F1 | covered |
| AC-008 | R-H1 | covered |
| AC-009 | R-I1 | covered |
| AC-010 | Requirement section 7 | covered |
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

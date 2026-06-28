---
r2p_stage: plan
r2p_version: 3
r2p_status: approved
r2p_created_at: 2026-06-28T21:09:04.028504+00:00
r2p_updated_at: 2026-06-28T23:55:37.527675+00:00
---

# Plan

Tasks are ordered to honor the SCOPE-IN-007 implementation sequence: REQ-002 (T1-T3), then REQ-001
(T4), then REQ-003 (T5-T8), then REQ-004 (T9-T10), then the combined REQ-005 + REQ-006 skill-scaffold
pass (T11), with an opencode invocability acceptance (T12) and a whole-batch verification gate (T13).

## Tasks

### PLAN-TASK-001 REQ-002 repoint store paths in fragments and lib/skills.js descriptions
Spec References: SPEC-STORES-001
Change Type: modify
TDD Applicable: no
Files: templates/fragments/write-req.behavior.md
- templates/fragments/write-req.purpose.md
- templates/fragments/archive-req.behavior.md
- templates/fragments/archive-req.purpose.md
- templates/fragments/archive-req.output.md
- lib/skills.js
Skeleton:
```text
write-req.behavior.md step 2: scan `.xsk/requirements/*.md` (exclude `.xsk/requirements/archive/`);
  create `.xsk/requirements/<slug>.md`.
write-req.behavior.md step 3: ensure `.xsk/.gitignore` contains line `requirements/archive/`;
  create `.xsk/` and `.xsk/.gitignore` if absent; append only if missing; never overwrite.
write-req.purpose.md / archive-req.{behavior,purpose,output}.md: `requirements/` -> `.xsk/requirements/`,
  `requirements/archive/` -> `.xsk/requirements/archive/`.
lib/skills.js: the write-req and archive-req description strings name `.xsk/requirements/` and
  `.xsk/requirements/archive/`.
```
Steps:
- [ ] Repoint the two write-req fragments and the three archive-req fragments to `.xsk/requirements/`,
  preserving archive-req single-active, slug-validation, and write-before-remove wording.
- [ ] Update the write-req gitignore step to target `.xsk/.gitignore` with the line `requirements/archive/`.
- [ ] Update the two `lib/skills.js` descriptions; this closes SCOPE-IN-002 at the source level.
Verification: `grep -nE "requirements/" templates/fragments/write-req.* templates/fragments/archive-req.* lib/skills.js` shows only `.xsk/requirements/...` paths (no bare `requirements/`).

### PLAN-TASK-002 REQ-002 regenerate write-req and archive-req packed skills and goldens
Spec References: SPEC-STORES-001
Change Type: modify
TDD Applicable: no
Files: skills/write-req/SKILL.md
- skills/archive-req/SKILL.md
- test/fixtures/golden/xsk-write-req.md
- test/fixtures/golden/xsk-archive-req.md
Skeleton:
```js
const { buildSkill } = require('./lib/generator');
const { get } = require('./lib/skills');
const fs = require('fs');
for (const name of ['xsk-write-req', 'xsk-archive-req']) {
  const s = get(name);
  fs.writeFileSync(`skills/${s.fragmentBase}/SKILL.md`, buildSkill(s).content);
  // golden = buildSkill content with shared/skill-common.md (trimmed) replaced by <SHARED_MASKED>
}
```
Steps:
- [ ] Run the generator to rewrite `skills/write-req/SKILL.md` and `skills/archive-req/SKILL.md`.
- [ ] Rewrite the two masked goldens (shared body replaced by the `<SHARED_MASKED>` sentinel).
- [ ] Confirm no U+2014 or U+2013 entered the generated content.
Verification: `node --test test/golden.test.js` passes (committed packed skill byte-matches buildSkill, masked golden matches).

### PLAN-TASK-003 REQ-002 repoint README rows and pinned test assertions
Spec References: SPEC-STORES-001
Change Type: modify
TDD Applicable: no
Files: README.md
- README.zh-CN.md
- test/generator.test.js
- test/skill-behavior.test.js
Skeleton:
```text
README.md:56-57 and README.zh-CN.md:56-57: name `.xsk/requirements/` and `.xsk/requirements/archive/`,
  EN and CN aligned.
test/generator.test.js:111 and test/skill-behavior.test.js:123,129: assert `.xsk/requirements/archive/`.
```
Steps:
- [ ] Repoint the two README rows in each file to the `.xsk/...` paths, keeping EN and CN aligned.
- [ ] Repoint the pinned `requirements/archive/` assertions; this finishes closing SCOPE-IN-002.
Verification: `grep -rnP "(?<!\\.xsk/)requirements/" README.md README.zh-CN.md test lib templates/fragments` returns nothing (every `requirements/` occurrence is preceded by `.xsk/`), and `node --test` passes.

### PLAN-TASK-004 REQ-001 write-req sequential decisions and self-audit loop, then regenerate
Spec References: SPEC-WRITEREQ-001
Change Type: modify
TDD Applicable: no
Files: templates/fragments/write-req.behavior.md
- skills/write-req/SKILL.md
- test/fixtures/golden/xsk-write-req.md
Skeleton:
```text
Step 5 -> verbatim R-1.1 paragraph (opens "5. Decision points go to the user, resolved one at a time.").
Step 8 closing bullet -> verbatim R-1.2 paragraph (opens "The audit is a loop, not a single pass.").
Then regenerate skills/write-req/SKILL.md and the masked golden from the fragment.
```
Steps:
- [ ] Apply the two verbatim swaps to `write-req.behavior.md`; change nothing else (step 4 preserved).
- [ ] Regenerate the write-req packed skill and golden (runs after REQ-002 per SCOPE-IN-007, so this
  regeneration reflects both the path repoint and the decision/loop rewrite); this closes SCOPE-IN-001.
Verification: `node --test` passes; `grep -c "resolved one at a time" skills/write-req/SKILL.md` is 1 and the headings `Self-audit checkpoint`, `Conflict check`, `Ambiguity check` remain.

### PLAN-TASK-005 REQ-003 create xsk-point and xsk-consume-point fragments
Spec References: SPEC-POINTS-001
Change Type: create
TDD Applicable: no
Files: templates/fragments/point.purpose.md
- templates/fragments/point.triggers.md
- templates/fragments/point.behavior.md
- templates/fragments/point.output.md
- templates/fragments/consume-point.purpose.md
- templates/fragments/consume-point.triggers.md
- templates/fragments/consume-point.behavior.md
- templates/fragments/consume-point.output.md
Skeleton:
```text
point.behavior.md: ground in project, research one aspect with xsk-think's discipline (compose by
  reference), persist `.xsk/points/<slug>.md` per schema, ensure `.xsk/.gitignore` line `points/archive/`,
  re-invoke-by-slug refines, drop only on user confirmation. point.output.md: point path + status.
consume-point.behavior.md: scan `.xsk/points/`, user selects, append-or-abort guard on active
  `.xsk/requirements/`, hand Aspect+Landed plan to xsk-write-req, archive folded points consumed
  write-before-remove, leave excluded/deferred active, drop rejected on confirmation, archive nothing
  if write-req stops. triggers: distinct intents, no neighbor trigger phrases. No em/en dash.
```
Steps:
- [ ] Write the four `point.*` fragments and the four `consume-point.*` fragments per the schema and
  the SPEC-POINTS-001 behavior contracts; this advances SCOPE-IN-003.
- [ ] Keep all generated text free of U+2014 / U+2013 and of `xsk-think` / `xsk-write-req` fragment edits.
Verification: `ls templates/fragments/point.*.md templates/fragments/consume-point.*.md` lists eight files; `grep -lP "\x{2014}|\x{2013}" templates/fragments/point.* templates/fragments/consume-point.*` returns nothing.

### PLAN-TASK-006 REQ-003 register xsk-point and xsk-consume-point in lib/skills.js
Spec References: SPEC-POINTS-001
Change Type: modify
TDD Applicable: no
Files: lib/skills.js
Skeleton:
```js
{ name: 'xsk-point', description: '... research one aspect into .xsk/points/ ...',
  platforms: ALL_PLATFORMS.slice(), fragmentBase: 'point' },
{ name: 'xsk-consume-point', description: '... fold selected .xsk/points into one .xsk/requirements doc ...',
  platforms: ALL_PLATFORMS.slice(), fragmentBase: 'consume-point' },
```
Steps:
- [ ] Add the two registry entries with descriptions naming `.xsk/points/` and the consume-into-requirement behavior.
Verification: `node -e "const {get}=require('./lib/skills'); if(!get('xsk-point')||!get('xsk-consume-point'))process.exit(1)"` exits 0.

### PLAN-TASK-007 REQ-003 regenerate point and consume-point skills and goldens
Spec References: SPEC-POINTS-001
Change Type: create
TDD Applicable: no
Files: skills/point/SKILL.md
- skills/consume-point/SKILL.md
- test/fixtures/golden/xsk-point.md
- test/fixtures/golden/xsk-consume-point.md
Skeleton:
```js
for (const name of ['xsk-point', 'xsk-consume-point']) {
  const s = get(name);
  fs.writeFileSync(`skills/${s.fragmentBase}/SKILL.md`, buildSkill(s).content);
  // and write the masked golden test/fixtures/golden/${name}.md
}
```
Steps:
- [ ] Generate the two packed skills and their masked goldens from the fragments and registry.
Verification: `node --test test/golden.test.js` passes for the two new skills (packed byte-matches buildSkill, golden matches).

### PLAN-TASK-008 REQ-003 update test enumerations and README rows for the two new skills
Spec References: SPEC-POINTS-001
Change Type: modify
TDD Applicable: no
Files: test/generator.test.js
- test/self-conformance.test.js
- test/skill-behavior.test.js
- README.md
- README.zh-CN.md
Skeleton:
```text
generator.test.js:69-73: name list to eight, re-sorted; update the "all six skills" title.
self-conformance.test.js:132-144: add skills/point/SKILL.md and skills/consume-point/SKILL.md.
skill-behavior.test.js: add a per-skill assertion block for xsk-point and xsk-consume-point.
README.md / README.zh-CN.md: add an EN and CN row for each new skill.
```
Steps:
- [ ] Extend the four hardcoded test enumerations and add the README rows; this closes SCOPE-IN-003.
Verification: `node --test` passes across generator, self-conformance, skill-behavior, golden, and readme-pinning.

### PLAN-TASK-009 REQ-004 opencode command-file install end-to-end (lib + hermetic override + round-trip tests)
Spec References: SPEC-OPENCODE-001
Change Type: modify
TDD Applicable: yes
Files: lib/adapters/opencode.js
- lib/install.js
- lib/manifest.js
- lib/uninstall.js
- lib/status.js
- test/install.test.js
- test/uninstall.test.js
- test/status.test.js
Skeleton:
```js
// All REQ-004 lib changes land in ONE task so the suite is green after it (the existing opencode
// round-trip test breaks if installed_paths records command paths while validate/uninstall/status
// are still skillsRoot-only).
// opencode.js: add commandsRoot(options) = (opts.home||os.homedir())/.config/opencode/commands.
// install.js: add commandsRootFor(platform, platformCommandsRoots) mirroring rootFor; thread a new
//   options.platformCommandsRoots through install(). A command-path helper recognizes a flat
//   <commandsRoot>/xsk-*.md (basename not SKILL.md/MARKER). For opencode, write the command file =
//   built.content + appended $ARGUMENTS section when absent; record installed_paths + installed_hashes;
//   previousInstallState classifies prior command paths (third class) -> wasInstalled/prior-hash;
//   capturePlatformSnapshot captures current command paths and generalizes its prior-manifest loop
//   beyond isInsideDir(p, skillsRoot) to include prior commandsRoot paths.
// manifest.js: validateOperationalSemantics(opts) accepts opts.commandsRoot; valid when
//   isInsideDir(p, skillsRoot) || (commandsRoot && isInsideDir(p, commandsRoot)).
// uninstall.js: uninstallPlatform/uninstall() gain commandsRoot; a command-file pass (filtered out
//   before classifyPaths/ownedDirs/validateBackupTargets) removes hash-matched, retains
//   hash-mismatched, prunes command files for absent skills; narrowed-manifest keeps the retained
//   command path + hash (generalize retainedInstalledHashes + reconstruction).
// status.js: computeStatus resolves+passes commandsRoot; a commandsRoot/.md entry classifies file.
// tests: extend platformRoots usage with a parallel platformCommandsRoots = {opencode: <tmp>/cmds}
//   so NOTHING writes to the real ~/.config/opencode/commands/. Update the existing opencode
//   round-trip in install.test.js/uninstall.test.js/status.test.js to thread it and stay green, and
//   add the command-file assertions (written+hashed; removed+pruned; drift on edit/missing).
```
Steps:
- [ ] Land all five lib changes plus the `platformCommandsRoots` override together so a single
  `xsk install`/`status`/`uninstall` round-trip stays green; this advances SCOPE-IN-004 and honors the
  SCOPE-IN-007 order (REQ-004 before the skill-scaffold pass).
- [ ] Update the existing opencode round-trip assertions to route through `platformCommandsRoots`, and
  add the install/uninstall/status command-file assertions, all into temp roots.
Verification: `node --test test/install.test.js test/uninstall.test.js test/status.test.js test/manifest.test.js` passes (existing round-trip green AND new command-file assertions green); no test writes to the real `~/.config/opencode/commands/`.

### PLAN-TASK-010 REQ-004 safety and self-conformance command-file tests, README parity
Spec References: SPEC-OPENCODE-001
Change Type: modify
TDD Applicable: yes
Files: test/safety.test.js
- test/self-conformance.test.js
- README.md
- README.zh-CN.md
Skeleton:
```js
// safety.test.js: a user-edited (hash-mismatched) command file is refused/retained; a failed install
//   or failed uninstall-first prune rolls back via the snapshot (no partial/stranded command file).
//   Route through platformCommandsRoots so it stays hermetic.
// self-conformance.test.js: assert the opencode command files land and are tracked. Call install()
//   directly with platformRoots + platformCommandsRoots (NOT through bin/xsk.js main(), which does
//   not forward platformCommandsRoots) so the assertion stays hermetic.
// README.md / README.zh-CN.md: state opencode installs BOTH a skill and commands/xsk-<name>.md, EN/CN aligned.
```
Steps:
- [ ] Add the safety refusal + rollback command-file assertions and the self-conformance command-file
  assertion, both hermetic; this closes SCOPE-IN-004 on the test side.
- [ ] Add the README EN/CN parity sentences for the opencode command install.
Verification: `node --test` passes across safety, self-conformance, and readme-pinning, including the user-edited-command-file refusal and the rollback-on-failed-install cases.

### PLAN-TASK-011 REQ-005 and REQ-006 skill-scaffold standard co-edit, regenerate once, update assertions
Spec References: SPEC-STANDARD-001
Change Type: modify
TDD Applicable: no
Files: templates/fragments/skill-scaffold.behavior.md
- skills/skill-scaffold/SKILL.md
- test/fixtures/golden/xsk-skill-scaffold.md
- test/skill-behavior.test.js
Skeleton:
```text
REQ-005: replace the four-platforms line with the coverage-only line (R-5.1); add the per-platform
  user-invocability item (R-5.2 verbatim). [closes SCOPE-IN-005]
REQ-006: add the built-from-source item (R-6.1); replace the install-safety line with the content-hash
  + markerless wording (R-6.2); add the install-surface test-coverage item (R-6.3 verbatim). [closes SCOPE-IN-006]
Regenerate skills/skill-scaffold/SKILL.md and its golden ONCE; keep headings Gate/Audit/Propose/
  Apply on approval/error out; no U+2014 or U+2013. Lands after REQ-004 per SCOPE-IN-007.
```
Steps:
- [ ] Make all REQ-005 (closes SCOPE-IN-005) and REQ-006 (closes SCOPE-IN-006) edits to the fragment
  in one pass and regenerate skill-scaffold once, landing after REQ-004 per SCOPE-IN-007.
- [ ] Update any pinned skill-behavior assertion for the new and changed checklist wording.
Verification: `node --test` passes (golden, skill-behavior, self-conformance); `grep -c "User-invocable on every platform" skills/skill-scaffold/SKILL.md` is 1 and `grep -c "Built from source" skills/skill-scaffold/SKILL.md` is 1.

### PLAN-TASK-012 REQ-004 opencode invocability acceptance (Checkpoint C-1)
Spec References: SPEC-OPENCODE-001
Change Type: non_code
TDD Applicable: no
Files: n/a
Skeleton:
```text
Automated tests prove command-file shape and placement hermetically (temp roots), not opencode's
runtime slash-command loading. This task is REQ-004 Checkpoint C-1: a pre-publish verification, kept
distinct from the deferred publish (SCOPE-OUT-005, owned by the user).
```
Steps:
- [ ] Hermetic check: install with a temp commands root (platformCommandsRoots) and confirm
  `xsk-think.md` is created carrying `description:` frontmatter and `$ARGUMENTS`, writing nothing to the
  real config.
- [ ] User pre-publish step (owned by the user, not the batch): run the real
  `xsk install --platform opencode` and confirm `/xsk-think` resolves in opencode. This is a
  verification install (Checkpoint C-1), not the deferred publish.
Verification: the hermetic install creates `<tempCommandsRoot>/xsk-think.md` with `description:` and `$ARGUMENTS`; the live opencode `/xsk-think` invocation is the user's manual pre-publish confirmation.

### PLAN-TASK-013 Whole-batch verification gate
Spec References: SPEC-WRITEREQ-001, SPEC-STORES-001, SPEC-POINTS-001, SPEC-OPENCODE-001, SPEC-STANDARD-001
Change Type: non_code
TDD Applicable: no
Files: n/a
Skeleton:
```text
Final gate: full suite green, no dash, no stale path, ordering honored (SCOPE-IN-007).
```
Steps:
- [ ] Run the full suite and the house-rule scans as the batch acceptance before the user publishes.
Verification: `node --test` passes across every suite; `grep -rlP "\x{2014}|\x{2013}" skills` returns nothing; `grep -rnP "(?<!\\.xsk/)requirements/" templates/fragments lib README.md README.zh-CN.md test` returns nothing.

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| PLAN-TASK-001 | SPEC-STORES-001, SCOPE-IN-002 | planned |
| PLAN-TASK-002 | SPEC-STORES-001 | planned |
| PLAN-TASK-003 | SPEC-STORES-001, SCOPE-IN-002 | planned |
| PLAN-TASK-004 | SPEC-WRITEREQ-001, SCOPE-IN-001, SCOPE-IN-007 | planned |
| PLAN-TASK-005 | SPEC-POINTS-001, SCOPE-IN-003 | planned |
| PLAN-TASK-006 | SPEC-POINTS-001 | planned |
| PLAN-TASK-007 | SPEC-POINTS-001 | planned |
| PLAN-TASK-008 | SPEC-POINTS-001, SCOPE-IN-003 | planned |
| PLAN-TASK-009 | SPEC-OPENCODE-001, SCOPE-IN-004, SCOPE-IN-007 | planned |
| PLAN-TASK-010 | SPEC-OPENCODE-001, SCOPE-IN-004 | planned |
| PLAN-TASK-011 | SPEC-STANDARD-001, SCOPE-IN-005, SCOPE-IN-006, SCOPE-IN-007 | planned |
| PLAN-TASK-012 | SPEC-OPENCODE-001 | planned |
| PLAN-TASK-013 | SPEC-WRITEREQ-001, SPEC-STORES-001, SPEC-POINTS-001, SPEC-OPENCODE-001, SPEC-STANDARD-001 | planned |

## Upstream Summary (read-only)
# Spec

## Behavior Contracts

### SPEC-WRITEREQ-001 write-req sequential decisions and self-audit loop (REQ-001)
Replace exactly two passages of `templates/fragments/write-req.behavior.md`, with the verbatim text
from REQ-001 R-1.1 and R-1.2, and change nothing else in the fragment:
- Step 5 (`:13`) becomes the dependency-ordered, one-at-a-time resolution paragraph (R-1.1, opening
  `5. Decision points go to the user, resolved one at a time.`).
- The closing bullet of step 8 (`:25`) becomes the re-audit fixpoint loop paragraph (R-1.2, opening
  `The audit is a loop, not a single pass.`).
Contract: after regeneration, `skills/write-req/SKILL.md` byte-matches `buildSkill(get('xsk-write-req'))`
and `test/fixtures/golden/xsk-write-req.md` matches the masked shell; the headings
`Self-audit checkpoint`, `Conflict check`, `Ambiguity check` remain; the generated body contains no
U+2014 or U+2013. The Open-questions discipline in step 4 (`:11`) is preserved unchanged.

### SPEC-STORES-001 consolidate runtime stores under .xsk/ (REQ-002)
Repoint every content reference (no `lib/` runtime code reads the store path):
- Fragments: `write-req.behavior.md:3,5`, `write-req.purpose.md:1`, `archive-req.behavior.md:1,4,5`,
  `archive-req.purpose.md:1`, `archive-req.output.md:1` — `requirements/` -> `.xsk/requirements/`,
  `requirements/archive/` -> `.xsk/requirements/archive/`.
- `lib/skills.js:30,37` descriptions name `.xsk/requirements/` and `.xsk/requirements/archive/`.
- README.md:56-57 and README.zh-CN.md:56-57 rows name the `.xsk/...` paths, EN and CN aligned.
- Pinned test assertions `test/generator.test.js:111`, `test/skill-behavior.test.js:123` and `:129`
  repointed; a repo-wide grep finds no surviving bare `requirements/` reference in fragments, lib,
  README, or tests (REQ-002 AC-1/AC-4).
Gitignore contract (shared, reused by SPEC-POINTS-001): write-req step 3 ensures `.xsk/.gitignore`
contains the line `requirements/archive/` (relative to `.xsk/`); create `.xsk/` and `.xsk/.gitignore`
if absent, append the line only if missing, never overwrite an existing `.xsk/.gitignore`. archive-req
preserves its single-active, slug-validation, and write-before-remove steps unchanged except for the
path. The pre-existing top-level `requirements/` directory is not migrated. Regenerate write-req and
archive-req skills and goldens.

### SPEC-POINTS-001 xsk-point and xsk-consume-point research funnel (REQ-003)
Add two `lib/skills.js` entries (`fragmentBase` `point`, `consume-point`; `platforms`
`ALL_PLATFORMS.slice()`) and two fragment sets (`purpose`, `triggers`, `behavior`, `output`) under
`templates/fragments/`. Point document schema is `.xsk/points/<slug>.md` with frontmatter
`status: researching | ready`, `slug`, `created_at`, then `# <title>`, `## Aspect`, `## Research`,
`## Landed plan`; archived terminal states `consumed` / `dropped` live in `.xsk/points/archive/`.
- `xsk-point` contract: ground in the current project, research one aspect with `xsk-think`'s
  discipline (composed by reference, not duplicated) to a decision-complete landed plan, persist per
  schema, ensure `.xsk/.gitignore` carries `points/archive/` (create-if-absent, append-if-missing,
  never overwrite), re-invoke-by-slug refines, and drop only on user confirmation (status `dropped`,
  `dropped_at`, one-line reason). Output point path and status.
- `xsk-consume-point` contract: scan `.xsk/points/` (excluding archive), list with status, highlight
  `ready`, have the user select; stop with a reason if none consumable; if an active
  `.xsk/requirements/` doc exists, prompt append-or-abort (abort leaves `.xsk/requirements/` and
  `.xsk/points/` unchanged); hand selected `Aspect` + `Landed plan` (with `Research` as context) to
  `xsk-write-req` (composed by reference); after the requirement lands, archive folded points as
  `consumed` write-before-remove with a link to the produced requirement, leave conflict-excluded or
  deferred points active, archive consume-rejected points as `dropped` only on user confirmation, and
  archive nothing if write-req stops. No `xsk-think` or `xsk-write-req` fragment changes.
Trigger fragments name distinct intents (research-and-persist vs fold-points-into-requirement) and
reuse no neighbor's trigger phrases. Regenerate both skills and goldens.

### SPEC-OPENCODE-001 opencode command-file install (REQ-004)
- Adapter: `lib/adapters/opencode.js` adds `commandsRoot(options)` returning
  `<home>/.config/opencode/commands` (mirroring `skillsRoot`'s `options.home` override).
- Command body: for each applicable skill, write `<commandsRoot>/<skill.name>.md` = the generated
  `SKILL.md` content (already carrying `description:` frontmatter) plus, when the content does not
  already contain `$ARGUMENTS`, an appended section ending in a fenced `$ARGUMENTS` placeholder,
  adapted from the req-to-plan recipe to refer to the skill above rather than a bin wrapper.
- Command-path helper: a single predicate recognizes a command-file path. Because the function set is
  basename-only in places, the helper classifies by basename (`xsk-*.md`, not `SKILL.md`) and/or by
  `commandsRoot` membership; the SPEC fixes this as: `previousInstallState` and
  `expectedInstalledPathType` classify a non-`SKILL.md`, non-`MARKER` `.md` basename as a command
  file, and `validateOperationalSemantics` uses `commandsRoot` membership.
- `validateOperationalSemantics` (`lib/manifest.js:83`) gains an optional `commandsRoot`; an opencode
  `installed_paths` entry is valid under `skillsRoot` OR `commandsRoot`; platforms without a
  `commandsRoot()` keep skillsRoot-only. Both call sites pass it: `uninstallPlatform`
  (`lib/uninstall.js:181`) gains a `commandsRoot` param, supplied by the reset call at
  `install.js:466` and by `uninstall()` at `uninstall.js:557`; `computeStatus` (`lib/status.js:107`)
  resolves and passes it.
- install: record each command file in `installed_paths` and its sha256 in `installed_hashes`;
  `previousInstallState` tracks prior command paths and their hashes so the loop's `wasInstalled` and
  prior-hash signals (`install.js:365-366`, gate `:118`) adopt a hash-matched command file, refuse a
  hash-mismatched (user-edited) one, and refuse one absent from the prior manifest (never clobber a
  user's own file). Command files carry no `.xsk-owned` marker and no backup record.
- snapshot: `capturePlatformSnapshot` captures current command paths and generalizes its
  prior-manifest loop beyond `isInsideDir(p, skillsRoot)` (`install.js:270,285`) to also capture
  pruned skills' command files, so a failed uninstall-first prune rolls back transactionally.
- uninstall: a dedicated command-file pass, filtered out before `classifyPaths`, `ownedDirs`, and
  `validateBackupTargets` (`uninstall.js:43-54,277-282,85-104`), removes a hash-matched command file,
  retains a hash-mismatched one, and prunes command files for skills no longer installed; the
  narrowed-manifest reconstruction records a retained or removed command path and its hash
  (generalizing `retainedInstalledHashes`, `uninstall.js:74-79`, and the reconstruction at `:496-505`,
  which today filter on skill files) so status/uninstall keep tracking it.
- status: classify a `commandsRoot` entry as expected type `file` so a missing or edited command file
  reports `drift`; `installedCount` (`:133`) keeps counting only skill files.
- Docs: README.md and README.zh-CN.md state opencode installs both a skill and a
  `commands/xsk-<name>.md` command, EN and CN aligned. The skills-directory install is unchanged and
  additive; Codex and Gemini stay out of code.

### SPEC-STANDARD-001 skill-scaffold standard refresh and per-platform invocability (REQ-005 + REQ-006)
Co-edit `templates/fragments/skill-scaffold.behavior.md` in one pass and regenerate once:
- REQ-005: replace the four-platforms line (`:16`) with the coverage-only line (R-5.1) and add the
  per-platform user-invocability checklist item (R-5.2, verbatim).
- REQ-006: add the built-from-source item (R-6.1, verbatim), replace the install-safety line (`:17`)
  with the content-hash plus markerless-detection wording (R-6.2, verbatim), and add the
  install-surface test-coverage item (R-6.3, verbatim).
Each item reads as a verify-per-platform principle with xsk as the reference example, not a
hard-coded recipe. Contract: `skills/skill-scaffold/SKILL.md` and its golden regenerate consistently,
keeping the headings `Gate`, `Audit`, `Propose`, `Apply on approval`, `error out`, with no U+2014 or
U+2013; pinned assertions in `test/skill-behavior.test.js` / `test/generator.test.js` updated. This
area lands after SPEC-OPENCODE-001 so xsk's self-conformance to the tightened bar is already true.

## API / Data / Config Contracts

- Registry entry shape (`lib/skills.js`): `{ name, description, platforms, fragmentBase }`; new
  skills `xsk-point` / `xsk-consume-point` use `platforms: ALL_PLATFORMS.slice()`.
- Generated skill shape (`templates/skill.md.tmpl`): frontmatter `name` / `description`, then
  `# {name}`, `## When to use`, `## How it works`, `## Output`, and the shared body; `buildSkill`
  composes `purpose` / `triggers` / `behavior` / `output` fragments (`lib/generator.js:19`).
- Point document (`.xsk/points/<slug>.md`): frontmatter `status` (`researching` | `ready`; archived
  `consumed` | `dropped`), `slug`, `created_at` (and `consumed_at` / `dropped_at` on archive);
  sections `# <title>`, `## Aspect`, `## Research`, `## Landed plan`.
- Manifest (`lib/manifest.js`): `installed_paths: string[]`, `backups: {target, backup}[]`,
  optional `installed_hashes: {target, sha256}[]`; `REQUIRED_FIELDS` does not include
  `installed_hashes`. opencode `installed_paths` may include `<commandsRoot>/xsk-*.md` entries;
  each command file gets a matching `installed_hashes` entry and no `backups` entry.
- opencode command file: frontmatter `description:`; body = skill content; when the body does not
  already contain `$ARGUMENTS`, append a skill-referring (not wrapper-referring) section pinned to
  this shape: a `## opencode invocation arguments` heading, the line
  `Use these arguments when running the skill above:`, a fenced `text` code block whose sole content
  is `$ARGUMENTS`, then the line `If no arguments were supplied, follow the default usage.` Path
  `<home>/.config/opencode/commands/<skill.name>.md`.
- `.xsk/.gitignore`: shared, one ignore line per store (`requirements/archive/`, `points/archive/`),
  append-if-missing, never overwritten.

## External Documentation Checked

| Dependency | Version | Check Date | Conclusion |
|---|---|---|---|
| opencode custom commands (opencode.ai/docs/commands) | command-file format, no package version | 2026-06-29 | Confirmed via Context7 (opencode.ai docs) and live machine evidence: markdown files under `~/.config/opencode/commands/` (global) or `.opencode/commands/` (per-project), the file name becomes the command name, frontmatter carries `description:`, and `$ARGUMENTS` is the all-arguments placeholder; corroborated by working command files on this machine: all carry a `description:` header, and the `r2p-*.md` set carries a fenced `$ARGUMENTS` section (some `fm-*.md` omit it, which opencode treats as a valid no-args command) |
| npm runtime dependencies | none (zero deps) | 2026-06-29 | xsk ships zero runtime dependencies (package.json); no third-party library contract applies beyond the Node.js standard library already in use |

## Test Matrix

- SPEC-WRITEREQ-001: `golden.test.js` (write-req byte-match), `generator.test.js` (write-req carries
  self-audit checkpoint, bans em/en dash), `skill-behavior.test.js` write-req block (sequential and
  loop cues present).
- SPEC-STORES-001: `golden.test.js` (write-req, archive-req), `generator.test.js:111` and
  `skill-behavior.test.js:123,129` repointed to `.xsk/...`, a grep-clean assertion that no bare
  `requirements/` reference survives, README pinning unchanged-but-aligned.
- SPEC-POINTS-001: `generator.test.js:69-73` name list to eight (and title), per-skill blocks in
  `skill-behavior.test.js` for `xsk-point` and `xsk-consume-point`, `self-conformance.test.js:132-144`
  adds `skills/point/SKILL.md` and `skills/consume-point/SKILL.md`, new goldens in `golden.test.js`.
- SPEC-OPENCODE-001: `install.test.js` (command file written + hashed, additive to skills dir),
  `uninstall.test.js` (command files removed and pruned, opencode-specific), `safety.test.js`
  (user-edited command file refused; failed install/prune rolls back via snapshot), `status.test.js`
  (drift on edited/missing command file), `self-conformance.test.js` (opencode command-file
  assertions). A second install and a status call do not flip the manifest to invalid.
- SPEC-STANDARD-001: `golden.test.js` (skill-scaffold byte-match), `skill-behavior.test.js` /
  `generator.test.js` assertions for the new and changed checklist wording, `self-conformance.test.js`
  green against the tightened bar.
- Whole batch gate: `node --test` green across every suite.

## Non-goals

- No migration, fallback, or compatibility code for pre-existing `requirements/` data.
- No `xsk-think` or `xsk-write-req` behavior or fragment change from REQ-003.
- No Codex or Gemini command-file install code; REQ-004 is opencode-only and REQ-005 states the
  cross-platform principle only.
- No xsk generation, install, or test code change for REQ-006 (standard text only).
- No re-install or publish to any platform; publish is a later batched step owned by the user.
- No separate multi-requirement store and no new manifest schema field.

## PLAN Handoff

PLAN decomposes into ordered tasks honoring REQ-002 -> REQ-001 -> REQ-003, then REQ-004, then the
combined REQ-005 + REQ-006 skill-scaffold pass (one regeneration). Per area:
- SPEC-STORES-001: a fragments-and-descriptions repoint task, the `.xsk/.gitignore` contract, README
  EN/CN, test-assertion repoints, regenerate write-req and archive-req; grep-clean check.
- SPEC-WRITEREQ-001: the two verbatim swaps, regenerate, golden + generator + skill-behavior checks.
- SPEC-POINTS-001: registry entries, four-section fragments for each new skill, regenerate, README
  EN/CN, and the three test-enumeration deltas.
- SPEC-OPENCODE-001: `commandsRoot`, the command-body writer, the command-path helper, the
  generalized `validateOperationalSemantics` plus both call-site plumbings, `previousInstallState`
  command-file class, install record + snapshot prune generalization, the uninstall command-file pass
  with narrowed-manifest hash bookkeeping, status `file` classification, README EN/CN, and the
  install/uninstall/safety/status/self-conformance test additions.
- SPEC-STANDARD-001: the verbatim checklist edits, one regeneration, pinned-assertion updates.
Every skill-touching task carries the regeneration invariant and the no em/en dash rule; each task's
verification is a concrete `node --test` (or targeted suite) pass. REQ-004 additionally carries a
manual acceptance step: after the change, a real `xsk install --platform opencode` confirms
`/xsk-think` is invocable in opencode, since automated tests verify command-file shape and placement
but not opencode's runtime command loading.

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| SPEC-WRITEREQ-001 | DES-WRITEREQ-001 | [ADDRESSED] |
| SPEC-STORES-001 | DES-STORES-001 | [ADDRESSED] |
| SPEC-POINTS-001 | DES-POINTS-001 | [ADDRESSED] |
| SPEC-OPENCODE-001 | DES-OPENCODE-001 | [ADDRESSED] |
| SPEC-STANDARD-001 | DES-STANDARD-001 | [ADDRESSED] |
<!-- /r2p-read-only -->

## Project Context (read-only)
# Project Context Pack

- repo_root: `/Users/xubo/x-studio/xsk`
- languages: {'JavaScript': 5259}
- package_managers: npm
- test_commands: ['npm test']
- entrypoints: none
- config_files: none
- dependencies (0): none
- source_dirs: ['bin', 'docs', 'lib', 'requirements', 'scripts', 'shared', 'skills', 'templates', 'test']
<!-- /r2p-read-only -->

# Design

## Design Summary

The batch is five design areas mapped to the six requirements, implemented in the declared
order. Four areas are content-and-regeneration only and one (opencode command files) is the
sole code-bearing area that also widens the install-safety surface.

- DES-WRITEREQ-001 (REQ-001): two verbatim text swaps in `write-req.behavior.md` (step 5 and the
  closing bullet of step 8), then regenerate the packed skill and golden.
- DES-STORES-001 (REQ-002): repoint every `requirements/` reference to `.xsk/requirements/`
  across two fragments-by-skill, two `lib/skills.js` descriptions, README EN/CN, and two pinned
  test assertions; regenerate two skills and goldens. Content-only: no `lib/` runtime code reads
  the store path.
- DES-POINTS-001 (REQ-003): add two registry entries and two fragment sets (`point`,
  `consume-point`), each composing an existing skill by reference; regenerate; extend three test
  enumerations and README. No `xsk-think` / `xsk-write-req` fragment changes.
- DES-OPENCODE-001 (REQ-004): the one architectural change. opencode gains `commandsRoot()` and an
  install branch writing `commands/xsk-<name>.md`. Command files live outside `skillsRoot`, have no
  ownership marker, and are flat files, so the manifest model (today: every `installed_paths` entry
  is a marker-bearing skill dir inside `skillsRoot`) must be generalized to tolerate a second owned
  root and a markerless, hash-owned flat file across validate, install, snapshot, uninstall, and
  status.
- DES-STANDARD-001 (REQ-005 + REQ-006): co-edit the shared `skill-scaffold.behavior.md` checklist
  (one reword plus four added/extended items), regenerate once, update pinned assertions. Lands
  after REQ-004 so xsk's self-conformance to the tightened bar is already true.

The whole batch is gated by `node --test`; the skill-regeneration invariant (fragment is source,
packed `skills/<base>/SKILL.md` byte-matches `buildSkill`, masked golden matches, no em/en dash)
applies to every touched skill.

## Current Code Evidence

- Generator and registry: `lib/generator.js:19` `buildSkill` composes `SECTIONS`
  (`['purpose','triggers','behavior','output']`, `lib/generator.js:7`) plus `SHARED` and
  `templates/skill.md.tmpl` by `{{TOKEN}}` substitution (`lib/generator.js:9`). The registry is
  `lib/skills.js:5` (`skills[]`), with `ALL_PLATFORMS = ['claude','codex','opencode','gemini']`
  (`lib/skills.js:3`).
- write-req: step 5 is single-shot at `templates/fragments/write-req.behavior.md:13`; the step 8
  closing bullet is single-pass at `:25`; the step 4 Open-questions discipline (REQ-001's stated
  prerequisite) is already present at `:11`. The working tree shows uncommitted edits on
  `skills/write-req/SKILL.md`, `templates/fragments/write-req.behavior.md`, and
  `test/fixtures/golden/xsk-write-req.md`, which this batch reconciles.
- Runtime stores: `requirements/` is referenced only as content, in
  `templates/fragments/write-req.behavior.md:3` and `:5`, `write-req.purpose.md:1`,
  `archive-req.behavior.md:1,4,5`, `archive-req.purpose.md:1`, `archive-req.output.md:1`,
  `lib/skills.js:30` and `:37`, `README.md:56-57`, `README.zh-CN.md:56-57`,
  `test/generator.test.js:111`, and `test/skill-behavior.test.js:123` and `:129`. No `lib/`
  install/runtime module reads the store path.
- opencode install: `lib/adapters/opencode.js:8` exposes only `skillsRoot`. `lib/install.js`
  installs identically for every platform in one loop (`lib/install.js:317`) with no per-platform
  branch; `rootFor` (`lib/install.js:24`) returns `adapter.skillsRoot()`.
- Manifest model: `REQUIRED_FIELDS` (`lib/manifest.js:11`) includes `installed_paths` and `backups`
  (alongside `schema_version`, `platform`, `version`, `installed_at`) but not `installed_hashes`,
  which is an optional field validated conditionally at `lib/manifest.js:210-222` and created at
  `:235`. `validateOperationalSemantics` (`lib/manifest.js:83`) requires every
  `installed_paths` entry to satisfy `isInsideDir(p, skillsRoot)` (`lib/manifest.js:88`), and is
  called from exactly two sites, `lib/uninstall.js:229` and `lib/status.js:107`, each passing only
  `skillsRoot`. This is the hard blocker for command files under `commandsRoot`.
- install internals: `previousInstallState` classifies prior paths by basename into `installedDirs`
  / `installedFiles` (`lib/install.js:99-114`) and is the source of the `wasInstalled` and
  prior-hash signals the install loop reads at `lib/install.js:365-366`; `capturePlatformSnapshot`
  enumerates `skillsRoot`-shaped paths and filters its prior-manifest loop to
  `isInsideDir(p, skillsRoot)` (`lib/install.js:235-294`, filter at `:270` and `:285`); markerless
  adoption is `isPreviouslyInstalledGeneratedContent`, gated on `wasInstalled`
  (`lib/install.js:117-125`); the user-edit refusal is `lib/install.js:357` and the drift refusal
  `lib/install.js:370`.
- uninstall internals: `classifyPaths` buckets every path into skill dirs by basename
  (`lib/uninstall.js:43-54`); the per-skill loop assumes a `skillDir/SKILL.md/MARKER` triple and a
  per-skill backup (`safeBackupForSkill`, `lib/ownership.js:50`). A flat command file does not fit
  this shape.
- status internals: `expectedInstalledPathType` returns `file` only for basename `SKILL.md` /
  `MARKER`, else `directory` (`lib/status.js:12-18`); `installedCount` counts paths ending in
  `SKILL.md` (`lib/status.js:133`).
- Ownership constants: `MARKER = '.xsk-owned'`, `PACKAGE_NAME = '@xenonbyte/xsk'`
  (`lib/ownership.js:12-13`).
- skill-scaffold standard: the four-platforms line is
  `templates/fragments/skill-scaffold.behavior.md:16`; the install-safety line is `:17`; the golden
  item `:19`; the README item `:20`; the self-conformance clause `:22-24`.
- Test enumerations: the sorted skill-name assertion is `test/generator.test.js:70-73`; the
  required-paths list is `test/self-conformance.test.js:132-144`; per-skill behavior blocks are
  `test/skill-behavior.test.js:55,65,80,...`; `test/install.test.js` already carries opencode
  assertions while `test/uninstall.test.js` and `test/status.test.js` are platform-generic and gain
  opencode-specific cases.

## Requirements Coverage

Scope coverage (every brief in-scope item maps to a design area):

- SCOPE-IN-001 -> DES-WRITEREQ-001; SCOPE-IN-002 -> DES-STORES-001; SCOPE-IN-003 -> DES-POINTS-001;
  SCOPE-IN-004 -> DES-OPENCODE-001; SCOPE-IN-005 and SCOPE-IN-006 -> DES-STANDARD-001;
  SCOPE-IN-007 -> the implementation-order constraint stated in Design Summary and SPEC Handoff.
- Out-of-scope items SCOPE-OUT-001..007 are honored as boundaries: no migration code, no
  `xsk-think` / `xsk-write-req` behavior edits, opencode-only command code, no publish, no `docs/`
  target, no REQ-006 code change.

Risk closure (each risk from risk discovery is addressed by a design choice):

- RISK-REGEN-001 [ADDRESSED] every touched skill follows fragment-edit then regenerate then
  `node --test`, with an em/en-dash scan; the working-tree write-req partials are reconciled first.
- RISK-ORDER-001 [ADDRESSED] the fixed order REQ-002, REQ-001, REQ-003 and REQ-004 before the
  single combined REQ-005 + REQ-006 skill-scaffold regeneration is encoded in Design Summary and
  SPEC Handoff.
- RISK-INSTALL-001 [ADDRESSED] DES-OPENCODE-001 threads command files through every consumer that
  assumes a marker-bearing skill dir inside `skillsRoot`: `validateOperationalSemantics` (both call
  sites), `previousInstallState`, the install adopt/refuse loop, `capturePlatformSnapshot` (current
  and pruned), the uninstall command-file pass, and status, as one change with tests on each path.
- RISK-MIGRATION-001 [ADDRESSED] DES-STORES-001 is content-only with a grep-clean acceptance and a
  create-if-absent, append-line-if-missing `.xsk/.gitignore` rule that never overwrites.
- RISK-SELFCONF-001 [ADDRESSED] DES-STANDARD-001 lands after DES-OPENCODE-001 so the tightened bar
  is already satisfied by xsk's own instance before self-conformance runs.
- RISK-CROSS-001 [ADDRESSED] every new or changed standard item is a verify-per-platform principle
  with xsk as the reference example, not a hard-coded recipe; the external opencode recipe is
  adapted, not copied.
- RISK-TEST-001 [ADDRESSED] each new skill or artifact updates every hardcoded enumeration
  (generator name list, self-conformance paths, skill-behavior blocks, opencode install / uninstall
  / safety / status assertions), gated by a green full suite.

## Options Considered

The only area with a genuine fork is DES-OPENCODE-001 (how command files enter the manifest model):

- Option A — record command files in the existing `installed_paths` / `installed_hashes`, and
  generalize the consumers to tolerate a second owned root (`commandsRoot`) and a markerless,
  hash-owned flat file. Chosen. It satisfies REQ-004 R-4.4 verbatim ("recorded in installed_paths
  and installed_hashes", "same user-edit and drift guards"), reuses the existing transactional
  snapshot and `installed_hashes` ownership signal, and adds no new manifest schema field.
- Option B — a separate manifest array (for example `installed_commands`) with its own lifecycle.
  Rejected: it contradicts R-4.4's explicit "installed_paths and installed_hashes", duplicates the
  hash and rollback machinery, and forks status/uninstall reporting.

Ownership signal for command files: opencode commands are flat `.md` files, so a sibling
`.xsk-owned` marker is impossible (it would itself become a stray command). Command-file ownership
therefore rests solely on `installed_hashes` content matching, which is the same markerless-generated
detection the codebase already implements for skills (`lib/install.js:117`,
`isPreviouslyInstalledGeneratedContent`) and which REQ-006 documents as a first-class guarantee. No
new trust mechanism is introduced. That detection is gated on `wasInstalled` (`lib/install.js:118`),
so it only holds once `previousInstallState` (`lib/install.js:99-114`) is generalized to track prior
command paths and their hashes; the chosen design includes that generalization (DES-OPENCODE-001),
without which a command file could be neither safely adopted nor safely refused.

For the four content-only areas there is no fork: the requirement supplies the exact replacement
text (REQ-001 R-1.1/R-1.2, REQ-005 R-5.1/R-5.2, REQ-006 R-6.1/R-6.2/R-6.3), the path target
(REQ-002), or the schema (REQ-003 point document), so the design records them directly.

## Chosen Design

### DES-WRITEREQ-001 write-req sequential decisions and self-audit loop (REQ-001)
Swap the two pieces of `write-req.behavior.md` with the verbatim text from REQ-001: step 5 (`:13`)
becomes the dependency-ordered, one-at-a-time resolution paragraph (R-1.1), and the step 8 closing
bullet (`:25`) becomes the re-audit fixpoint loop paragraph (R-1.2). Regenerate
`skills/write-req/SKILL.md` and `test/fixtures/golden/xsk-write-req.md` from the fragment. The
tested headings `Self-audit checkpoint`, `Conflict check`, `Ambiguity check` stay intact (they are
other lines of step 8); no em/en dash enters the generated text.

### DES-STORES-001 consolidate runtime stores under .xsk/ (REQ-002)
Mechanically repoint every content reference from `requirements/` to `.xsk/requirements/` and
`requirements/archive/` to `.xsk/requirements/archive/`: write-req behavior steps 2 and 3
(`:3`,`:5`), write-req purpose, archive-req behavior/purpose/output, the two `lib/skills.js`
descriptions (`:30`,`:37`), README.md and README.zh-CN.md rows (`:56-57` each), and the pinned
test assertions (`test/generator.test.js:111`, `test/skill-behavior.test.js:123` and `:129`).
write-req step 3
now ensures `.xsk/.gitignore` contains the line `requirements/archive/` (relative to `.xsk/`),
created if absent, appended only if missing, never overwriting an existing file; this shared
gitignore rule is reused unchanged by DES-POINTS-001 for its `points/archive/` line. Regenerate the
write-req and archive-req skills and goldens. The existing top-level `requirements/` directory in
this repo is not migrated (boundary SCOPE-OUT-001).

### DES-POINTS-001 xsk-point and xsk-consume-point research funnel (REQ-003)
Add two registry entries to `lib/skills.js` (`fragmentBase` `point` and `consume-point`, all four
platforms) and two fragment sets (`purpose`, `triggers`, `behavior`, `output`) under
`templates/fragments/`. `xsk-point` composes `xsk-think`'s discipline by reference to research one
aspect into `.xsk/points/<slug>.md` per the REQ-003 schema (frontmatter `status:
researching|ready`, plus `Aspect` / `Research` / `Landed plan`), ensures the shared
`.xsk/.gitignore` carries `points/archive/` (append-if-missing), and drops a point only on user
confirmation. `xsk-consume-point` scans `.xsk/points/`, has the user select a set, guards the
single-active `.xsk/requirements/` case with an append-or-abort prompt, hands the selected points to
`xsk-write-req` as the input need, then archives folded points as `consumed` write-before-remove and
leaves non-folded points per the REQ-003 disposition rules, archiving nothing if write-req stops.
Neither `xsk-think` nor `xsk-write-req` fragments change. Regenerate both new skills and goldens;
extend `test/generator.test.js:69-73` (name list to eight, re-sorted, and its "all six skills"
title), `test/self-conformance.test.js:132-144` (add `skills/point/SKILL.md`,
`skills/consume-point/SKILL.md`), add a `test/skill-behavior.test.js` block per new skill, and add
README EN/CN rows. Trigger fragments name distinct intents and reuse no neighbor's trigger phrases.

### DES-OPENCODE-001 opencode command-file install (REQ-004)
`lib/adapters/opencode.js` gains `commandsRoot(options)` = `<home>/.config/opencode/commands`. The
opencode install path, in addition to the kept skills-directory write, writes
`<commandsRoot>/<skill.name>.md`, whose body is the generated skill content with a short
`$ARGUMENTS` section appended when absent (adapted from the req-to-plan `_render_opencode_command`
recipe, referring to the skill above rather than a bin wrapper). Command files are flat, live under
`commandsRoot` (outside `skillsRoot`), and carry no `.xsk-owned` marker (a sibling marker would
itself become a stray command), so ownership rests solely on `installed_hashes` content matching.
They enter the same manifest arrays, which requires generalizing every consumer that today assumes
"an `installed_paths` entry is a marker-bearing skill dir inside `skillsRoot`". A single helper
recognizes a command-file path (under `commandsRoot`, basename `xsk-*.md`); each consumer below
branches on it:

- `validateOperationalSemantics` (`lib/manifest.js:83`) takes an optional `commandsRoot` and accepts
  an opencode `installed_paths` entry under either `skillsRoot` or `commandsRoot`; platforms without
  a `commandsRoot()` keep the skillsRoot-only rule. Both call sites are wired:
  `uninstallPlatform` (`lib/uninstall.js:181`, check at `:229`) gains a `commandsRoot` parameter,
  resolved and passed by `install.js:466` (the uninstall-first reset) and by `uninstall()`
  (`lib/uninstall.js:557`); and `computeStatus` (`lib/status.js:107`) resolves and passes it too.
  Without this plumbing, a second `xsk install` (whose reset re-validates the manifest at
  `install.js:467`) or an `xsk status` would read the recorded command paths as "escapes platform
  root" and flip the manifest to invalid.
- `previousInstallState` (`lib/install.js:99-114`) recognizes prior command paths as a distinct
  third class (not skill dir, not skill file), tracking their prior membership and prior hash, so
  the install loop's `wasInstalled` and prior-hash signals (`lib/install.js:365-366`) drive
  `isPreviouslyInstalledGeneratedContent` (`:117`) for command files: a hash-matched prior command
  file is adopted, a hash-mismatched (user-edited) one is refused, and a command file absent from the
  prior manifest is refused rather than clobbered. This is the consumer the hash-only ownership
  safety depends on.
- install records each command file in `installed_paths` and a sha256 in `installed_hashes`, and
  `capturePlatformSnapshot` (`lib/install.js:235-294`) captures both the current command paths and,
  by generalizing its prior-manifest loop beyond the `isInsideDir(p, skillsRoot)` filter (`:270`,
  `:285`) to also include prior `commandsRoot` paths, the command files of skills being pruned, so an
  uninstall-first prune that later fails rolls back transactionally (AC-4).
- uninstall handles command files in a dedicated pass, filtered out before `classifyPaths`, the
  `ownedDirs` set, and `validateBackupTargets` (`lib/uninstall.js:43-54`, `:277-282`, `:85-104`), so
  a flat command path is never synthesized into a `<cmd>.md/SKILL.md` skill triple. The pass removes
  a command file whose on-disk hash matches its recorded `installed_hashes` entry (owned), retains a
  hash-mismatched one (user-edited), and prunes command files for skills no longer installed. Command
  files carry no backup record (the marker-less backup branch at `install.js:360-400` is keyed on
  `skillFileExisted && !markerFileExisted` and never applies to them), so `validateBackupTargets` is
  never asked to accept a non-`SKILL.md` target.
- status classifies a `commandsRoot` entry as expected type `file` (`lib/status.js:12-18`) so a
  missing or edited command file reports `drift`; `installedCount` (`:133`) keeps counting only
  skill files.

README.md and README.zh-CN.md state that opencode installs both a skill and a
`commands/xsk-<name>.md` command, EN and CN aligned (R-4.8 / AC-7). The skills-directory install is
unchanged and additive (boundary: opencode-only; Codex and Gemini stay out of code). Tests gain
opencode command-file cases in install, uninstall, safety, status, and self-conformance: written and
hashed on install, rolled back on a failed install (including a failed prune), removed and pruned on
uninstall, and drift-detected by status.

### DES-STANDARD-001 skill-scaffold standard refresh and per-platform invocability (REQ-005 + REQ-006)
Co-edit `templates/fragments/skill-scaffold.behavior.md` in one pass: reword the four-platforms line
(`:16`) to coverage-only and add the per-platform user-invocability principle (REQ-005 R-5.1/R-5.2);
add the built-from-source item, replace the install-safety line (`:17`) with the content-hash plus
markerless-detection wording, and add the install-surface test-coverage item (REQ-006
R-6.1/R-6.2/R-6.3). Each is a verify-per-platform principle with xsk as the reference example.
Regenerate `skills/skill-scaffold/SKILL.md` and its golden exactly once, keeping the tested headings
`Gate`, `Audit`, `Propose`, `Apply on approval`, `error out`, with no em/en dash. Update any pinned
assertion in `test/skill-behavior.test.js` / `test/generator.test.js`. This area lands after
DES-OPENCODE-001 so the tightened standard is already true of xsk itself.

## Decision Requests

none

## Rollback

Every change is a git-tracked working-tree edit with no runtime migration and no remote or
production state, so rollback is `git restore` / `git checkout` of the touched files plus a
regenerate-and-test to return to a green baseline. The pre-existing `requirements/` data is never
moved or deleted, so DES-STORES-001 has nothing to restore. DES-OPENCODE-001's installer change is
itself transactional at runtime: a failed `xsk install` already rolls back through the per-platform
snapshot (`lib/install.js:444-485`). The current command files are added to that snapshot, and the
snapshot's prior-manifest loop is generalized beyond its `skillsRoot` filter (`lib/install.js:270`,
`:285`) to also capture the command files of pruned skills, so both a partial command-file write and
a failed uninstall-first prune are reverted rather than stranded (AC-4). No separate rollback tooling
is added.

## Observability

The observable signal is the executable test suite: `node --test` across golden, generator,
skill-behavior, self-conformance, install, uninstall, safety, and status. Each design area is
verified by an assertion (regenerated goldens byte-match; new skills registered and present; no bare
`requirements/` path survives; opencode command files are written, hashed, rolled back, removed, and
drift-detected; the skill-scaffold standard carries the new wording). `xsk status` reports `drift`
when an owned skill or command file is edited or missing, which is the runtime observability surface
for the installed artifacts. REQ-004's checkpoint additionally calls for a manual
`xsk install --platform opencode` confirming `/xsk-think` is invocable.

## SPEC Handoff

The SPEC stage contracts, per design area:
- DES-WRITEREQ-001: the exact step 5 and step 8 replacement text and the regeneration byte-equality
  contract.
- DES-STORES-001: the full reference inventory to repoint and the `.xsk/.gitignore`
  create/append/never-overwrite contract.
- DES-POINTS-001: the point document schema, the two skills' behavior contracts (compose-by-
  reference, single-active guard, archive-on-consume write-before-remove, user-confirmed drop), and
  the test-enumeration deltas.
- DES-OPENCODE-001: the `commandsRoot` value; the command-file body shape (skill content plus
  `$ARGUMENTS`); the command-path helper; the generalized `validateOperationalSemantics` signature
  and its two call-site plumbings (the `commandsRoot` params on `uninstallPlatform` / `uninstall` /
  `computeStatus`, resolved at `install.js:466`, `uninstall.js:557`, `status.js:107`); the
  `previousInstallState` command-file class and the `wasInstalled` / hash adopt-versus-refuse
  contract; the `capturePlatformSnapshot` prior-paths generalization for a transactional prune; the
  uninstall command-file pass (separated from `classifyPaths` / `ownedDirs` / `validateBackupTargets`,
  no backup record); the status `file` classification; and the README EN/CN parity (R-4.8). SPEC also
  pins two follow-through mechanics the design defers to it: how the command-path helper feeds the
  basename-only functions `previousInstallState` (`lib/install.js:77`) and `expectedInstalledPathType`
  (`lib/status.js:12`) — classify by basename (`*.md` and not `SKILL.md`) or thread `commandsRoot`
  through them — and how the uninstall pass records a retained or removed command path and its hash
  into the narrowed manifest (`retainedInstalledHashes`, `lib/uninstall.js:74-79`, reconstruction
  `:496-505`), which today filter on skill files only, so a retained user-edited command file keeps
  its `installed_paths` and `installed_hashes` entry.
- DES-STANDARD-001: the verbatim checklist edits and the once-only co-regeneration.
SPEC also restates the cross-cutting contracts: the skill-regeneration invariant, the no em/en dash
rule, and the implementation order REQ-002, REQ-001, REQ-003, then REQ-004, then the combined
REQ-005 + REQ-006 skill-scaffold pass.

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| DES-WRITEREQ-001 | SCOPE-IN-001 | designed |
| DES-STORES-001 | SCOPE-IN-002 | designed |
| DES-POINTS-001 | SCOPE-IN-003 | designed |
| DES-OPENCODE-001 | SCOPE-IN-004 | designed |
| DES-STANDARD-001 | SCOPE-IN-005, SCOPE-IN-006 | designed |

## Upstream Summary (read-only)
# Risk Discovery

## Risks

### RISK-REGEN-001 Skill-regeneration drift and house-rule breakage
Status: open, high likelihood, suite-blocking.
Five of the six requirements edit a `templates/fragments/*` source and require regenerating the
packed `skills/<base>/SKILL.md` plus the masked golden under `test/fixtures/golden/`. Any fragment
edit without a matching regeneration, or an em-dash (U+2014) / en-dash (U+2013) leaking into
generated content, fails `golden.test.js`. The working tree already carries partial write-req edits
(modified `skills/write-req/SKILL.md`, `templates/fragments/write-req.behavior.md`, and
`test/fixtures/golden/xsk-write-req.md`), so a stale or half-applied edit can byte-mismatch the
generator before this batch even starts.

### RISK-ORDER-001 Dependency-order and shared-fragment co-edit violations
Status: open, high impact on correctness.
The batch declares a strict order: REQ-002, then REQ-001, then REQ-003 (write-req's self-audit loop
must exist before points are folded into one requirement); REQ-004 before REQ-005; REQ-005 and
REQ-006 co-edit the same `skill-scaffold.behavior.md` and must be regenerated once. Implementing out
of order, or regenerating skill-scaffold twice from divergent fragment states, yields conflicting or
lost edits and a golden that matches neither requirement.

### RISK-INSTALL-001 First platform-specific artifact widens the install/uninstall/rollback surface
Status: open, safety-critical.
REQ-004 introduces the first per-platform branch in `lib/install.js`. The opencode command files
must be threaded through every install-safety path: manifest `installed_paths` and
`installed_hashes` (`lib/manifest.js`), the pre-install snapshot for transactional rollback,
uninstall removal and pruning, and status drift detection. Missing any one path leaves an orphaned
or untracked command file, a rollback that strands a partial write, or undetected user-edit drift,
defeating the manifest-backed safety guarantees.

### RISK-MIGRATION-001 Runtime-store relocation leaves stale references or breaks dogfooding
Status: open, medium.
REQ-002 moves runtime stores from top-level `requirements/` to `.xsk/requirements/` without
migrating existing data (D-2). A fragment, `lib/skills.js` description, README row, test assertion,
or generated artifact could still pin a bare `requirements/` path (REQ-002 AC-1), or this repo's own
active requirement could be left under the old path while the skills now expect `.xsk/`. The shared
`.xsk/.gitignore` append-if-missing logic could also clobber a user-authored gitignore if
implemented as a blind write.

### RISK-SELFCONF-001 Tightened standard outruns its own instance
Status: open, medium, ordering-sensitive.
xsk must satisfy its own `xsk-skill-scaffold` standard (self-conformance). REQ-005 and REQ-006 raise
the bar (user-invocability per platform, built-from-source, hash and markerless install safety,
install-surface tests). If the standard is tightened before REQ-004 makes opencode actually
user-invocable, xsk fails its own self-conformance. The declared REQ-004-before-REQ-005 order
mitigates this, but only if honored.

### RISK-CROSS-001 Standard wording propagates to every scaffolded project
Status: open, medium, cross-project blast radius.
The skill-scaffold standard is canonical and propagates outward to every scaffolded project.
Over-specifying a hard-coded per-platform recipe (instead of a verify-per-platform principle), or
wording that assumes xsk's exact file layout, would harm unrelated projects. The reference recipe
lives in an external repo (`~/x-skills/req-to-plan`) and must be adapted, not copied verbatim, since
xsk skills have no bin wrapper.

### RISK-TEST-001 Hardcoded test enumerations under-cover new skills and artifacts
Status: open, medium.
Adding skills (REQ-003) and command files (REQ-004) requires updating several hardcoded
enumerations: the skill-name list in `test/generator.test.js`, the required-paths list in
`test/self-conformance.test.js`, per-skill blocks in `test/skill-behavior.test.js`, and the
opencode-specific assertions in install, uninstall, safety, and status. Missing one either fails the
suite or, worse, silently leaves the new surface untested.

## Boundaries

- `xsk-think` and `xsk-write-req` fragments are off-limits to REQ-003: the new skills compose them
  by reference, never edit them (REQ-003 AC-3; SCOPE-OUT-002, SCOPE-OUT-003).
- No migration, fallback, or compatibility code for pre-existing `requirements/` data
  (SCOPE-OUT-001); the single instance is hand-managed by the user.
- REQ-006 touches only the propagated standard text, never xsk's generation, install, or test code
  (SCOPE-OUT-007).
- Command-file install is opencode-only in code (REQ-004); Codex and Gemini stay out of code,
  addressed only as a standard-level principle in REQ-005 (SCOPE-OUT-004).
- No re-install or publish to any platform within this batch (SCOPE-OUT-005).
- The `docs/` backlog is never a runtime target (SCOPE-OUT-006).

## Scope Overflow Risks

- REQ-003 could drift into editing `xsk-write-req` or `xsk-think` to make points fit; it must stay
  composition-only (bounds RISK-ORDER-001; SCOPE-OUT-002 and SCOPE-OUT-003).
- REQ-004 could expand into Codex and Gemini command install once the opencode branch exists; it is
  bounded to opencode plus the REQ-005 principle (bounds RISK-CROSS-001; SCOPE-OUT-004).
- REQ-002 could tempt refactoring install or adapter code, or migrating data, while tidying stores;
  it is content-only and data is not migrated (bounds RISK-MIGRATION-001; SCOPE-OUT-001).
- REQ-005 and REQ-006 could expand to rewrite other skill-scaffold checklist items; they are bounded
  to the named items and co-regenerated once (bounds RISK-ORDER-001).

## Mitigations

- For RISK-REGEN-001: reconcile the working-tree write-req partials first, then for every touched
  skill edit the fragment, regenerate the packed skill and masked golden, and run `node --test`;
  grep generated content for U+2014 / U+2013 and confirm the tested headings before marking ready.
- For RISK-ORDER-001: implement strictly as REQ-002, then REQ-001, then REQ-003, and REQ-004 before
  REQ-005 and REQ-006; make all `skill-scaffold.behavior.md` edits for REQ-005 and REQ-006 in one
  pass and regenerate skill-scaffold exactly once.
- For RISK-INSTALL-001: extend manifest, snapshot, uninstall, and status together for the opencode
  command files, and assert each path (written, hashed, rolled back, removed, drift-detected) in the
  opencode-specific tests before approval.
- For RISK-MIGRATION-001: enforce REQ-002 AC-1 by grepping the repo for any surviving bare
  `requirements/` reference, and implement `.xsk/.gitignore` as create-if-absent plus
  append-line-if-missing, never an overwrite.
- For RISK-SELFCONF-001: land REQ-004 (opencode user-invocability) before REQ-005 and REQ-006 tighten
  the standard, and run self-conformance after the combined skill-scaffold regeneration.
- For RISK-CROSS-001: state each new or changed standard item as a verify-per-platform principle with
  xsk as the reference example, not a hard-coded recipe, and adapt rather than copy the external
  opencode command recipe.
- For RISK-TEST-001: update every hardcoded enumeration (generator skill list, self-conformance
  required paths, skill-behavior blocks, opencode install/uninstall/safety/status assertions) and
  gate on a green full `node --test`.

## Trace

| This ID | Upstream | Status |
|---|---|---|
| RISK-REGEN-001 | SCOPE-IN-001, SCOPE-IN-002, SCOPE-IN-003, SCOPE-IN-005, SCOPE-IN-006 | open |
| RISK-ORDER-001 | SCOPE-IN-007 | open |
| RISK-INSTALL-001 | SCOPE-IN-004 | open |
| RISK-MIGRATION-001 | SCOPE-IN-002 | open |
| RISK-SELFCONF-001 | SCOPE-IN-004, SCOPE-IN-005, SCOPE-IN-006 | open |
| RISK-CROSS-001 | SCOPE-IN-005, SCOPE-IN-006 | open |
| RISK-TEST-001 | SCOPE-IN-003, SCOPE-IN-004 | open |
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
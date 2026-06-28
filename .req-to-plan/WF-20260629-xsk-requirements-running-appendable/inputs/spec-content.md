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

## Upstream Summary (read-only)
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

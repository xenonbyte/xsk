# Risk Discovery

## Risks

### RISK-REGEN-001 Skill-regeneration drift and house-rule breakage
Status: mitigated
Severity: high likelihood, suite-blocking.
Five of the six requirements edit a `templates/fragments/*` source and require regenerating the
packed `skills/<base>/SKILL.md` plus the masked golden under `test/fixtures/golden/`. Any fragment
edit without a matching regeneration, or an em-dash (U+2014) / en-dash (U+2013) leaking into
generated content, fails `golden.test.js`. The working tree already carries partial write-req edits
(modified `skills/write-req/SKILL.md`, `templates/fragments/write-req.behavior.md`, and
`test/fixtures/golden/xsk-write-req.md`), so a stale or half-applied edit can byte-mismatch the
generator before this batch even starts.

### RISK-ORDER-001 Dependency-order and shared-fragment co-edit violations
Status: mitigated
Severity: high impact on correctness.
The batch declares a strict order: REQ-002, then REQ-001, then REQ-003 (write-req's self-audit loop
must exist before points are folded into one requirement); REQ-004 before REQ-005; REQ-005 and
REQ-006 co-edit the same `skill-scaffold.behavior.md` and must be regenerated once. Implementing out
of order, or regenerating skill-scaffold twice from divergent fragment states, yields conflicting or
lost edits and a golden that matches neither requirement.

### RISK-INSTALL-001 First platform-specific artifact widens the install/uninstall/rollback surface
Status: mitigated
Severity: safety-critical.
REQ-004 introduces the first per-platform branch in `lib/install.js`. The opencode command files
must be threaded through every install-safety path: manifest `installed_paths` and
`installed_hashes` (`lib/manifest.js`), the pre-install snapshot for transactional rollback,
uninstall removal and pruning, and status drift detection. Missing any one path leaves an orphaned
or untracked command file, a rollback that strands a partial write, or undetected user-edit drift,
defeating the manifest-backed safety guarantees.

### RISK-MIGRATION-001 Runtime-store relocation leaves stale references or breaks dogfooding
Status: mitigated
Severity: medium.
REQ-002 moves runtime stores from top-level `requirements/` to `.xsk/requirements/` without
migrating existing data (D-2). A fragment, `lib/skills.js` description, README row, test assertion,
or generated artifact could still pin a bare `requirements/` path (REQ-002 AC-1), or this repo's own
active requirement could be left under the old path while the skills now expect `.xsk/`. The shared
`.xsk/.gitignore` append-if-missing logic could also clobber a user-authored gitignore if
implemented as a blind write.

### RISK-SELFCONF-001 Tightened standard outruns its own instance
Status: mitigated
Severity: medium, ordering-sensitive.
xsk must satisfy its own `xsk-skill-scaffold` standard (self-conformance). REQ-005 and REQ-006 raise
the bar (user-invocability per platform, built-from-source, hash and markerless install safety,
install-surface tests). If the standard is tightened before REQ-004 makes opencode actually
user-invocable, xsk fails its own self-conformance. The declared REQ-004-before-REQ-005 order
mitigates this, but only if honored.

### RISK-CROSS-001 Standard wording propagates to every scaffolded project
Status: mitigated
Severity: medium, cross-project blast radius.
The skill-scaffold standard is canonical and propagates outward to every scaffolded project.
Over-specifying a hard-coded per-platform recipe (instead of a verify-per-platform principle), or
wording that assumes xsk's exact file layout, would harm unrelated projects. The reference recipe
lives in an external repo (`~/x-skills/req-to-plan`) and must be adapted, not copied verbatim, since
xsk skills have no bin wrapper.

### RISK-TEST-001 Hardcoded test enumerations under-cover new skills and artifacts
Status: mitigated
Severity: medium.
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

## Upstream Summary (read-only)
# Requirement Brief

## Goal

Deliver the six-item xsk requirements batch (REQ-001 through REQ-006) as one coordinated
change set: harden `xsk-write-req` (sequential decision resolution plus a self-audit fixpoint
loop), consolidate all xsk runtime stores under a hidden `.xsk/` working directory, add the
`xsk-point` / `xsk-consume-point` research-points funnel, make opencode expose `/xsk-*` through
installed command files, and bring the `xsk-skill-scaffold` standard current on per-platform
user-invocability and on the build / install-safety / test-coverage axes. The batch respects
the stated dependency order and the skill-regeneration invariant, and finishes with
`node --test` green across every suite before the user publishes.

## In-Scope

- SCOPE-IN-001 REQ-001: rewrite `write-req.behavior.md` step 5 to resolve genuine decisions one
  at a time in dependency order (re-deriving the remaining forks between decisions) and step 8
  into a re-audit fixpoint loop; regenerate `skills/write-req/SKILL.md` and
  `test/fixtures/golden/xsk-write-req.md`.
- SCOPE-IN-002 REQ-002: repoint `xsk-write-req` and `xsk-archive-req` from top-level
  `requirements/` to `.xsk/requirements/` and `.xsk/requirements/archive/`, update the two
  `lib/skills.js` descriptions, establish the shared `.xsk/.gitignore` discipline
  (append-if-missing, never overwrite), update README EN/CN rows and the pinned test assertions,
  and regenerate both skills and their goldens.
- SCOPE-IN-003 REQ-003: add the two instruction skills `xsk-point` and `xsk-consume-point` on all
  four platforms (fragments, `lib/skills.js` entries, regenerated skills and goldens), the
  `.xsk/points/` and `.xsk/points/archive/` stores, the point document schema, trigger
  disambiguation, README EN/CN rows, and the test enumerations (generator, skill-behavior,
  self-conformance).
- SCOPE-IN-004 REQ-004: add the opencode adapter `commandsRoot()` and an opencode install branch
  that writes `commands/xsk-<name>.md` (skill body plus an appended `$ARGUMENTS` section)
  alongside the kept skills directory, and teach the manifest, pre-install snapshot, uninstall,
  and status paths about the command files (installed_paths, installed_hashes, rollback, drift);
  update install / uninstall / safety / status / self-conformance tests and the README.
- SCOPE-IN-005 REQ-005: in `skill-scaffold.behavior.md`, reword the platform-coverage item to
  coverage-only and add a per-platform user-invocability principle (a command file for platforms
  that do not auto-expose skill files as slash commands); regenerate
  `skills/skill-scaffold/SKILL.md` and its golden and update any pinned assertions.
- SCOPE-IN-006 REQ-006: in the same `skill-scaffold.behavior.md` checklist, add a
  built-from-source item, extend the install-safety item with content-hash and
  markerless-generated detection, and add an install-surface test-coverage item; regenerate the
  skill and golden and update any pinned assertions.
- SCOPE-IN-007 Batch coordination: implement in the order REQ-002, then REQ-001, then REQ-003;
  REQ-004 before REQ-005; co-edit and co-regenerate the shared `skill-scaffold.behavior.md` for
  REQ-005 and REQ-006 in a single pass landing after REQ-004; confirm `node --test` is green
  before publish.

## Out-of-Scope

- SCOPE-OUT-001 Migrating or deleting the existing top-level `requirements/` directory; only this
  repo has an instance and the user handles it by hand (REQ-002 D-2).
- SCOPE-OUT-002 Any change to `xsk-think` behavior or fragments; it is composed by reference only
  (REQ-001 D-1, REQ-003 AC-3).
- SCOPE-OUT-003 Any change to `xsk-write-req` behavior from REQ-003; the new skills compose it
  unchanged, though REQ-003 depends on REQ-001 having already landed.
- SCOPE-OUT-004 Codex and Gemini command-file install code in xsk; REQ-004 is opencode-only and
  REQ-005 states the cross-platform principle without enumerating each platform's recipe.
- SCOPE-OUT-005 Re-installing or publishing to `~/.claude` or any platform; publish is a later
  batched step owned by the user.
- SCOPE-OUT-006 The `docs/` backlog as a points target or any pipeline writing to it; it is a
  temporary self-development scaffold retired by the user.
- SCOPE-OUT-007 Any change to xsk's generation, install, or test code for REQ-006; that
  requirement refreshes only the propagated standard, since xsk already implements all three axes.

## Non-Goals

- Building migration, fallback, or backward-compatibility code for old `requirements/` data; "no
  compatibility with old data" is an explicit requirement.
- Introducing a separate multi-requirement store; the "many" lives in `.xsk/points/` while consume
  output stays the single-active `.xsk/requirements/<slug>.md`.
- Duplicating reasoning or authoring logic; `xsk-point` composes `xsk-think` and
  `xsk-consume-point` composes `xsk-write-req`.
- Hard-coding per-platform command recipes into the skill-scaffold standard; it states verifiable
  principles instead.

## Assumptions

- The REQ-001 prerequisite Open-questions discipline change (write-req step 4 plus the step 8
  Open-questions check) is already applied in the working tree and is not reverted by this batch.
- The working tree already carries partial write-req hardening edits (modified
  `skills/write-req/SKILL.md`, `templates/fragments/write-req.behavior.md`, and the write-req
  golden), which this batch completes and reconciles rather than discards.
- The four target platforms are Claude Code, Codex, opencode, and Gemini, and `npm test`
  (`node --test`) is the authoritative full-suite gate.
- opencode exposes `/`-commands from `~/.config/opencode/commands/*.md` (file name is the command
  name, `description:` frontmatter, `$ARGUMENTS` placeholder), as verified in REQ-004.
- The batch is implemented and verified locally as one unit; publishing to platforms is deferred
  to the user.

## Acceptance Criteria

- AC-001 Every REQ-001..REQ-006 acceptance criterion is met, and `node --test` passes across all
  suites (golden, generator, skill-behavior, self-conformance, install, uninstall, safety, status).
- AC-002 The skill-regeneration invariant is honored for every touched skill: the fragment is the
  source, `skills/<base>/SKILL.md` byte-matches `buildSkill` output, and the masked golden fixture
  matches; generated skill content contains no em-dash (U+2014) or en-dash (U+2013) and preserves
  every tested heading.
- AC-003 No skill fragment, `lib/skills.js` description, README row, or generated artifact
  references a bare top-level `requirements/` path; all xsk runtime stores resolve under `.xsk/`.
- AC-004 `xsk-point` and `xsk-consume-point` exist and are registered on all four platforms, with
  the point schema, trigger disambiguation, and the consume-archives-on-success /
  archive-nothing-on-stop invariants in place.
- AC-005 After `xsk install --platform opencode`, `~/.config/opencode/commands/xsk-<name>.md` exists
  per applicable skill (with `description:` and `$ARGUMENTS`), is tracked in the manifest, rolled
  back on a failed install, removed on uninstall, and drift-detected by status; `/xsk-*` is
  invocable.
- AC-006 The `xsk-skill-scaffold` standard defines platform support as user-invocability (not file
  presence) and is current on the built-from-source, content-hash / markerless install-safety, and
  install-surface test-coverage axes.
- AC-007 README.md and README.zh-CN.md are updated and EN/CN aligned for every change above.

## Open Questions

- OQ-001 Whether Gemini and Codex share opencode's missing-command gap. Non-blocking; owner: user.
  Disposition: out of this batch's scope (REQ-004 is opencode-only); REQ-005 settles it at the
  standard level (any platform that does not auto-expose skills needs a command file), and a
  concrete per-platform fix, if needed, is a separate requirement.
- OQ-002 Whether the opencode skills-directory install should later be dropped if opencode is
  confirmed not to read it. Non-blocking; owner: user. Disposition: deferred cleanup, revisited
  only if confirmed inert; this batch keeps the skills directory and adds command files additively.

## Sources

- `docs/requirements-20260628.md` — the source requirements batch (REQ-001 through REQ-006),
  captured verbatim as this run's raw requirement.
- xsk code referenced by the batch: `templates/fragments/` (write-req, archive-req, skill-scaffold,
  and the new point / consume-point fragments), `lib/skills.js`, `lib/generator.js`,
  `lib/install.js`, `lib/manifest.js`, `lib/adapters/opencode.js`, `skills/<base>/SKILL.md`, and
  `test/` (golden, generator, skill-behavior, self-conformance, install, uninstall, safety,
  status), plus `README.md` and `README.zh-CN.md`.
- Reference recipe: `~/x-skills/req-to-plan` `tools/workflow_cli/install.py`
  (`_render_opencode_command`) for the opencode command body with an injected `$ARGUMENTS` section.
- opencode custom-commands documentation (command files under `~/.config/opencode/commands/`).

## Trace

| This ID | Upstream | Status |
|---|---|---|
| SCOPE-IN-001 | REQ-001 | in scope |
| SCOPE-IN-002 | REQ-002 | in scope |
| SCOPE-IN-003 | REQ-003 | in scope |
| SCOPE-IN-004 | REQ-004 | in scope |
| SCOPE-IN-005 | REQ-005 | in scope |
| SCOPE-IN-006 | REQ-006 | in scope |
| SCOPE-IN-007 | REQ-001..REQ-006 | in scope |
| SCOPE-OUT-001 | REQ-002 | out of scope |
| SCOPE-OUT-002 | REQ-001, REQ-003 | out of scope |
| SCOPE-OUT-003 | REQ-003 | out of scope |
| SCOPE-OUT-004 | REQ-004, REQ-005 | out of scope |
| SCOPE-OUT-005 | REQ-001..REQ-006 | out of scope |
| SCOPE-OUT-006 | REQ-003 | out of scope |
| SCOPE-OUT-007 | REQ-006 | out of scope |
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

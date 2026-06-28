# xsk Requirements

A running, appendable collection of requirements for the xsk project. Each entry is
a self-contained `REQ-NNN` block that an implementer can act on without guessing.
Append new requirements at the end; do not rewrite closed ones. When a batch ships,
this file is archived to `docs/archive/` (per `docs/.gitignore`).

## Document conventions

- Each requirement is a `## REQ-NNN <title>` section carrying, in order: a one-line
  **Status**, then **Background**, **Goal**, **Scope** (In and Out), **Requirements**
  (`R-N.M` items), **Acceptance & Checkpoints**, optional **Decisions**, and
  **Open Questions**.
- **Status** is one of `proposed`, `approved`, `done`.
- Open Questions hold only non-blocking, owned items. A choice that would change the
  implementation is resolved in the body or recorded under Decisions, never parked open.
- A requirement that modifies a skill inherits the **skill regeneration invariant**:
  edit the fragment under `templates/fragments/`, regenerate the packed
  `skills/<base>/SKILL.md` and the masked golden fixture
  `test/fixtures/golden/<name>.md`, then run `node --test`. The generated skill body
  must contain no em-dash (U+2014) or en-dash (U+2013).

## Index

| ID | Title | Status |
|----|-------|--------|
| REQ-001 | write-req: sequential decision resolution + self-audit loop | proposed |
| REQ-002 | Consolidate xsk runtime stores under `.xsk/` | proposed |
| REQ-003 | Add `xsk-point` + `xsk-consume-point` (research-points funnel) | proposed |
| REQ-004 | opencode: install slash commands so `/xsk-*` works | proposed |
| REQ-005 | Encode per-platform user-invocability in the skill-scaffold standard | proposed |
| REQ-006 | Refresh the skill-scaffold standard to match the current implementation | proposed |

---

## REQ-001 write-req: sequential decision resolution + self-audit loop

**Status:** proposed

### Background

`xsk-write-req` turns plain-language needs into a grounded requirement document. Its
behavior lives in `templates/fragments/write-req.behavior.md`. Two gaps remain in how
it handles decisions:

- **Step 5 (decision points)** tells the agent to stop and ask the user on a genuine
  technical or scoping choice, but says nothing about what to do when several genuine
  decisions exist. Nothing forbids surfacing them all at once.
- **Step 8 (self-audit)** is a single pass: "if the audit surfaces issues only the user
  can resolve, stop, list them, and ask." It does not re-audit after the user resolves
  them.

Genuine requirement decisions are usually dependent, not orthogonal: resolving one
reshapes or removes the forks beneath it, and a batch of joint selections can be
mutually inconsistent. A single-pass audit cannot catch a conflict introduced by the
user's own resolution, so such a conflict can ship.

Related, already applied in the working tree as part of the same write-req hardening
batch: the Open-questions discipline change (step 4 plus a step 8 "Open-questions
check") that requires every Open Question to be non-blocking and owned. REQ-001 builds
on that and does not revert it.

### Goal

Make `write-req` resolve genuine decisions one at a time in dependency order, and make
the self-audit a fixpoint loop, so a finalized requirement is both decision-complete and
free of resolution-introduced conflicts. Guiding principle: quality first over
round-trip count.

### Scope

**In scope**

- Rewrite step 5 of `write-req.behavior.md` to resolve decisions sequentially in
  dependency order, re-deriving the remaining forks after each.
- Rewrite the closing bullet of step 8 so the self-audit is a re-audit loop.
- Regenerate `skills/write-req/SKILL.md` and `test/fixtures/golden/xsk-write-req.md`
  from the fragment.

**Out of scope**

- `xsk-think`. Its planning-only model already encodes the discipline through a fixed
  owner (the user) and a mandatory stop-for-approval gate. See Decisions (D-1).
- Any other skill, the CLI, or the install flow.
- Re-installing to `~/.claude`. Publish is batched and done by the user later.

### Requirements

- **R-1.1 Sequential decisions.** Step 5 becomes:

  > **5. Decision points go to the user, resolved one at a time.** When a genuine
  > technical or scoping choice would change the implementation, stop and ask the user
  > to decide: surface the options and the tradeoffs, let them pick, do not pick
  > silently. When several genuine decisions exist, take them in dependency order rather
  > than all at once. Surface the most upstream open one first, fold the answer in, then
  > re-derive what remains before surfacing the next. A resolved decision often removes
  > or reshapes the forks beneath it, so never surface a fork whose options still depend
  > on an open decision.

- **R-1.2 Self-audit loop.** The closing bullet of step 8 becomes:

  > The audit is a loop, not a single pass. If it surfaces issues only the user can
  > resolve, take them one at a time in dependency order (as in step 5), then re-run the
  > checks before finalizing. Repeat until one full pass finds zero conflicts, zero
  > blocking ambiguity, and nothing left for the user to resolve. Do not write a
  > contradictory or under-specified doc.

- **R-1.3 Regeneration.** After editing the fragment, regenerate the two committed
  artifacts so `test/golden.test.js` stays green: the packed `skills/write-req/SKILL.md`
  byte-matches `buildSkill` output, and the masked `test/fixtures/golden/xsk-write-req.md`
  matches the masked shell.

- **R-1.4 House rules preserved.** Generated skill content keeps the headings the tests
  assert (`Self-audit checkpoint`, `Conflict check`, `Ambiguity check`) and contains no
  em-dash (U+2014) or en-dash (U+2013).

### Acceptance & Checkpoints

- **AC-1** Step 5 instructs sequential, dependency-ordered resolution with a re-derive
  between decisions; it never directs batching all forks at once.
- **AC-2** Step 8 instructs a loop that re-audits after each user resolution and
  finalizes only on a clean full pass.
- **AC-3** `node --test` passes across all suites, including `golden`, `generator`, and
  `skill-behavior`.
- **AC-4** No em-dash or en-dash in the generated skill content.
- **Checkpoint C-1.** After regeneration, the implementer pauses and confirms
  `node --test` is green before the batch is published.

### Decisions

- **D-1.** `xsk-think` is left unchanged. Rationale: it is planning-only and stops for
  explicit approval, so every Open Question is owned by the user by construction.
  Importing write-req's "non-blocking only" rule would contradict its step 6, which
  intentionally allows surfacing blocking ambiguities and then stopping.

### Open Questions

None blocking.

---

## REQ-002 Consolidate xsk runtime stores under `.xsk/`

**Status:** proposed

### Background

xsk skills create their runtime markdown stores at the consumer project root:
`xsk-write-req` writes the active requirement to `requirements/`, and `xsk-archive-req`
archives to `requirements/archive/`. The planned point skills (a future requirement)
would add `points/`. Left as-is, every store scatters another top-level directory at the
project root.

This project already groups tool state under hidden working directories: `.claude/`,
`.codegraph/`, `.drfx/`, `.req-to-plan/`. A single hidden `.xsk/` working directory for
all xsk runtime stores is consistent with that and keeps the consumer root clean.

The change is content-only. `requirements` has zero functional dependence in `lib/`
runtime code; the only references are two description strings in `lib/skills.js`, the
skill fragments, README prose, and a few test assertions. Install, uninstall, manifest,
and adapter code never touch the runtime stores, so none of it changes.

### Goal

Route all xsk runtime stores under one hidden working directory `.xsk/`: `xsk-write-req`
to `.xsk/requirements/` and `xsk-archive-req` to `.xsk/requirements/archive/`.
Pre-existing `requirements/` data is not migrated.

### Scope

**In scope**

- Repoint `xsk-write-req` (behavior + purpose) from `requirements/` to
  `.xsk/requirements/`: the active-doc scan, the `<slug>.md` creation path, and the
  gitignore-ensure step.
- Repoint `xsk-archive-req` (behavior + output + purpose) to `.xsk/requirements/` and
  `.xsk/requirements/archive/`, preserving its single-active and write-before-remove
  invariants unchanged.
- Update the two `lib/skills.js` descriptions (write-req, archive-req).
- Regenerate `skills/{write-req,archive-req}/SKILL.md` and the golden fixtures.
- Update the README.md and README.zh-CN.md skill rows, EN and CN aligned.
- Update test assertions that pin a bare `requirements/` path.

**Out of scope**

- Migrating or deleting the existing `requirements/` directory. Only this repo has an
  instance; the user handles it manually (D-2).
- The point skills and `points/`, beyond reserving `.xsk/points/` as their future home.
- Any install, uninstall, manifest, or adapter code. It does not reference the runtime
  stores.
- Re-installing to platforms. Publish is batched by the user later.

### Requirements

- **R-2.1 Working directory.** All xsk runtime stores live under `.xsk/` at the consumer
  project root. `.xsk/` is git-tracked by default (it is not added to the root
  `.gitignore`); only archive subdirectories are ignored.
- **R-2.2 write-req paths.** `xsk-write-req` scans `.xsk/requirements/*.md` (excluding
  `.xsk/requirements/archive/`) for the single `status: active` doc, creates
  `.xsk/requirements/<slug>.md`, and ensures `.xsk/.gitignore` contains the line
  `requirements/archive/`. Create `.xsk/` and the gitignore if absent; append the line
  only if missing; never overwrite an existing `.xsk/.gitignore`.
- **R-2.3 archive-req paths.** `xsk-archive-req` scans `.xsk/requirements/*.md` (excluding
  `.xsk/requirements/archive/`) and archives to `.xsk/requirements/archive/<slug>.md`. The
  single-active, slug-validation, and write-before-remove steps are unchanged except for
  the path.
- **R-2.4 Descriptions.** The `lib/skills.js` descriptions for write-req and archive-req
  name `.xsk/requirements/` and `.xsk/requirements/archive/`.
- **R-2.5 Shared gitignore.** `.xsk/.gitignore` is shared across xsk skills. Each skill
  ensures only its own archive line, append-if-missing, never overwriting. This is
  forward-compatible with a later `points/archive/` line.
- **R-2.6 Regeneration and house rules.** After editing the fragments and descriptions,
  regenerate the packed `skills/<base>/SKILL.md` and the masked golden fixtures so
  `golden.test.js` stays green. Generated skill content keeps the tested headings and
  contains no em-dash (U+2014) or en-dash (U+2013).
- **R-2.7 Docs parity.** README.md and README.zh-CN.md skill rows name the `.xsk/...`
  paths, EN and CN aligned.

### Acceptance & Checkpoints

- **AC-1** No skill fragment, `lib/skills.js` description, README row, or generated
  artifact references a bare top-level `requirements/` path; all are under `.xsk/`.
- **AC-2** write-req creates or locates its active doc under `.xsk/requirements/` and
  maintains `.xsk/.gitignore` with `requirements/archive/`.
- **AC-3** archive-req archives under `.xsk/requirements/archive/` and preserves
  single-active and write-before-remove.
- **AC-4** `node --test` passes across all suites; no test still pins a bare
  `requirements/` path.
- **AC-5** No em-dash or en-dash in generated skill content; tested headings preserved.
- **Checkpoint C-1.** After regeneration, the implementer confirms `node --test` is green
  before the batch is published.

### Decisions

- **D-2.** The pre-existing `requirements/` directory is not migrated or deleted by this
  change. Only this repo has an instance; the user handles it manually. Rationale: no
  migration or fallback code for a single hand-managed case, and "no compatibility with
  old data" was an explicit requirement.
- **D-3.** The working directory is hidden `.xsk/`, not visible `xsk/`, consistent with
  `.claude/`, `.codegraph/`, `.drfx/`, `.req-to-plan/`.
- **D-4.** `.xsk/` is git-tracked (active docs are versioned); only `*/archive/` is
  gitignored, mirroring the prior `requirements/.gitignore` semantics.

### Open Questions

None blocking.

---

## REQ-003 Add `xsk-point` and `xsk-consume-point` (research-points funnel)

**Status:** proposed

### Background

Some bullets of a requirement need to be researched and planned before the requirement is
written, instead of being invented cold at authoring time. Nothing captures that
pre-research today: `xsk-write-req` expects a need it can ground and structure in one
pass, and `xsk-think` reasons but does not persist.

This adds a two-skill funnel upstream of `xsk-write-req`, parallel to the
`xsk-write-req` / `xsk-archive-req` create-and-archive shape over `.xsk/requirements/`:

- A **point** is one researched, actionable content item of a future requirement (one
  bullet). Many points accumulate; they are not single-active.
- `xsk-point` researches one aspect and lands it as a point under `.xsk/points/`.
- `xsk-consume-point` selects a set of ripe points, hands them to `xsk-write-req` as the
  input need (which synthesizes them with the current code into one requirement), then
  archives the consumed points.

Builds on REQ-002 (`.xsk/` working directory), and depends on REQ-001: because one
consume folds several points into one requirement, write-req's self-audit loop (REQ-001)
catches conflicts between points before the requirement is produced, so REQ-003 is built
and verified on a write-req that already carries REQ-001. Consume output is the native
`xsk-write-req` artifact `.xsk/requirements/<slug>.md`. The points pipeline never targets
the `docs/` backlog; that backlog is a temporary self-development scaffold and is retired
by the user once `xsk-write-req` is dogfooded.

### Goal

Let a requirement's research-heavy bullets be investigated and landed ahead of time as
points, then folded into one grounded requirement by `xsk-consume-point` calling
`xsk-write-req`. Reuse, do not reinvent: `xsk-point` composes `xsk-think`,
`xsk-consume-point` composes `xsk-write-req`.

### Scope

**In scope**

- Two new instruction skills, `xsk-point` and `xsk-consume-point` (fragmentBases `point`
  and `consume-point`), on all four platforms.
- The `.xsk/points/` and `.xsk/points/archive/` runtime stores, plus the `points/archive/`
  line in the shared `.xsk/.gitignore` (append-if-missing, per R-2.5).
- The point document schema (below).
- All add-a-skill artifacts: fragments, `lib/skills.js` entries, regenerated
  `skills/<base>/SKILL.md` and golden fixtures, README EN/CN rows, test updates.

**Out of scope**

- Any change to `xsk-write-req` or `xsk-think` behavior. The new skills compose them by
  reference, unchanged. REQ-003 does not modify write-req, but it depends on REQ-001 being
  applied first (see Background and D-10).
- The `docs/` backlog. Not a target; retired later by the user.
- Install, uninstall, manifest, or adapter code. Adding entries to `lib/skills.js`
  propagates automatically.
- Re-installing to platforms. Publish is batched by the user later.

### Point document schema

`.xsk/points/<slug>.md`:

```
---
status: researching | ready
slug: <slug>
created_at: <ISO date>
---
# <point title: the single aspect>

## Aspect
The one requirement bullet this point will become.

## Research
Findings grounded in the current code (file:line) and any external references.

## Landed plan
The actionable conclusion: concretely what to do for this bullet. This is the payload
`xsk-consume-point` feeds to `xsk-write-req`.
```

Active points are `researching` or `ready` (`ready` means consumable). On archive a point
becomes terminal: `consumed` (folded into a requirement) or `dropped` (rejected, with a
one-line reason); both live in `.xsk/points/archive/`. Points are many; `.xsk/points/` has
no single-active invariant.

### Requirements

- **R-3.1 `xsk-point` behavior.** Capture or refine one aspect: ground in the current
  project, research and plan it with `xsk-think`'s discipline to a decision-complete
  landed plan, and persist it as `.xsk/points/<slug>.md` per the schema. Re-invoking with
  an existing slug locks onto and refines that point. Ensure `.xsk/` and a `.xsk/.gitignore`
  line `points/archive/` exist (create if absent; append-if-missing; never overwrite). Set
  `status` to `researching` or `ready`. If research concludes the aspect is not worth
  pursuing, surface that conclusion and, only on user confirmation, archive the point as
  `dropped` to `.xsk/points/archive/<slug>.md` (status `dropped`, `dropped_at`, a one-line
  reason); never drop silently. Output the point path and status.
- **R-3.2 `xsk-consume-point` behavior.** Scan `.xsk/points/*.md` (excluding
  `.xsk/points/archive/`), list them with status, highlight `ready`, and have the user
  select the set to consume. If no consumable point exists, stop with a reason. Before
  delegating, check `.xsk/requirements/` for an active doc: if one exists, ask the user to
  either append the selected points to that active requirement or abort and handle it
  later (on abort, stop with zero changes, consuming and archiving nothing); if none
  exists, proceed. Hand the selected points' `Aspect` and `Landed plan` (with `Research`
  as context) to `xsk-write-req` as the input need; `xsk-write-req` grounds, synthesizes,
  sequences decisions, and self-audits into `.xsk/requirements/<slug>.md` (single-active:
  it appends to the active doc or creates a new one, per its own step 2; more than one
  active doc is blocked by write-req's own rule). One consume produces one requirement;
  the user groups related points.
- **R-3.3 Archive on consume.** Only after the requirement lands: archive every point that
  was actually folded into the requirement as `consumed` (write `.xsk/points/archive/<slug>.md`
  with `status: consumed`, `consumed_at`, and a link to the produced requirement; confirm it
  landed; remove the active point file). For each selected point that was not folded in, ask
  the user its disposition: a point excluded by conflict or deferred stays active in
  `.xsk/points/` and is not archived; a point rejected or obsoleted at consume is archived as
  `dropped` (status `dropped`, `dropped_at`, a one-line reason). Never silently archive a
  non-incorporated point and never silently discard a still-valid one. If `xsk-write-req`
  stops before producing the requirement, archive nothing, so no point is lost. Confirm no
  dangling actives.
- **R-3.4 Many points, no single-active.** `.xsk/points/` holds many points concurrently.
  Unlike `.xsk/requirements/`, there is no single-active invariant.
- **R-3.5 Registry and descriptions.** Add `xsk-point` and `xsk-consume-point` to
  `lib/skills.js` (all four platforms), with descriptions naming `.xsk/points/` and the
  consume-into-requirement behavior.
- **R-3.6 Regeneration and house rules.** Generate `skills/{point,consume-point}/SKILL.md`
  and the masked golden fixtures from the fragments; generated content carries name and
  description frontmatter, a stop point, and no em-dash (U+2014) or en-dash (U+2013).
- **R-3.7 Tests.** Update the hardcoded skill-name list in `test/generator.test.js`, add a
  per-skill behavior block in `test/skill-behavior.test.js` for each new skill, and add
  `skills/{point,consume-point}/SKILL.md` to the required-paths list in
  `test/self-conformance.test.js`. Add any other enumeration the suite surfaces.
- **R-3.8 Docs parity.** Add a row for each new skill to README.md and README.zh-CN.md, EN
  and CN aligned.
- **R-3.9 Trigger disambiguation.** The trigger fragments route by intent and by the
  presence of point data, not by overlapping keywords. `xsk-point` triggers on
  research-and-persist-an-aspect intent, distinct from `xsk-think`, which reasons in the
  conversation and persists nothing. `xsk-consume-point` triggers on
  fold-points-into-a-requirement intent, distinct from `xsk-write-req`, which authors from
  a fresh need; the presence of points under `.xsk/points/` is the signal toward consume.
  Neither new skill reuses the trigger phrases of the skill it sits next to.
- **R-3.10 REQ-001 prerequisite.** Because one consume folds several points into one
  requirement, conflicts between points are caught only by write-req's self-audit loop
  (REQ-001). REQ-003 is implemented and verified on a write-req that already carries
  REQ-001. Implementation order is REQ-002, then REQ-001, then REQ-003.

### Acceptance & Checkpoints

- **AC-1** `xsk-point` lands a point under `.xsk/points/<slug>.md` per the schema and
  maintains `.xsk/.gitignore` with `points/archive/`.
- **AC-2** `xsk-consume-point` produces one `.xsk/requirements/<slug>.md` from the selected
  points via `xsk-write-req`, archives the incorporated points as `consumed`
  write-before-remove, and archives nothing when write-req stops.
- **AC-3** Neither `xsk-write-req` nor `xsk-think` fragments change.
- **AC-4** `node --test` passes across all suites (golden, generator, skill-behavior,
  self-conformance).
- **AC-5** Generated content for both skills has no em-dash or en-dash and carries the
  required frontmatter and stop point.
- **AC-6** When an active requirement already exists, `xsk-consume-point` asks the user to
  append or abort before delegating; on abort, `.xsk/requirements/` and `.xsk/points/` are
  left unchanged.
- **AC-7** The new skills' trigger fragments name distinct intents and do not duplicate the
  trigger phrases of `xsk-think` or `xsk-write-req`.
- **AC-8** A multi-point consume that contains a conflict between points surfaces it via
  write-req's self-audit (REQ-001) before the requirement is produced, rather than shipping
  a contradiction.
- **AC-9** `xsk-point` never drops a point silently; a researched-but-rejected point is
  archived as `dropped` with a reason only after the user confirms.
- **AC-10** At consume, a selected point not folded into the requirement is never silently
  archived: a conflict-excluded or deferred point stays active, and a point rejected at
  consume is archived as `dropped` only on user confirmation.
- **Checkpoint C-1.** After regeneration, confirm `node --test` is green before publish.

### Decisions

- **D-5.** A point is one researched bullet of a future requirement, not a standalone
  requirement. Batching is on the input side: `xsk-consume-point` folds a selected set of
  points into one requirement.
- **D-6.** Consume output is the native `xsk-write-req` artifact
  `.xsk/requirements/<slug>.md` (single-active). The "many" lives in `.xsk/points/`, so no
  separate multi-requirement store is introduced.
- **D-7.** `xsk-point` composes `xsk-think` (research) and `xsk-consume-point` composes
  `xsk-write-req` (authoring). No reasoning or authoring logic is duplicated.
- **D-8.** Names are `xsk-point` and `xsk-consume-point`.
- **D-9.** `xsk-consume-point` guards the single-active case with an append-or-abort prompt
  rather than driving archiving itself; archiving stays a separate manual step via
  `xsk-archive-req`, and `xsk-write-req` is unchanged. Rationale: keeps consume-point's
  scope narrow and honors "do not pick silently" without coupling consume to archive.
- **D-10.** REQ-003 depends on REQ-001 (it does not merely inherit whatever is current);
  implementation order is REQ-002, then REQ-001, then REQ-003. Rationale: write-req's
  self-audit loop is what makes folding multiple points into one requirement safe.
- **D-11.** A point reaches a terminal state only as `consumed` (folded into a requirement)
  or `dropped` (rejected, with a reason). Dropping is always user-confirmed and can happen
  at the research stage (`xsk-point`) or at consume (`xsk-consume-point`); a point excluded
  by conflict or merely deferred stays active rather than dropped. Rationale: user-confirmed
  disposition avoids both silent loss of valid research and accumulation of dead points.

### Open Questions

None blocking.

---

## REQ-004 opencode: install slash commands so `/xsk-*` works

**Status:** proposed

### Background

After `xsk install` for opencode, the `/xsk-*` slash commands are unavailable. Root cause:
the opencode adapter (`lib/adapters/opencode.js`) exposes only `skillsRoot()` =
`~/.config/opencode/skills`, and `lib/install.js` writes only `SKILL.md` files there.
opencode does not expose skills-directory skills as slash commands.

Verified facts:

- opencode docs: custom commands are Markdown files in `~/.config/opencode/commands/`
  (global) or `.opencode/commands/` (per-project); the file name is the command name; the
  frontmatter carries `description:`; arguments use the `$ARGUMENTS` placeholder.
- This machine: `~/.config/opencode/commands/` holds working `r2p-*.md` and `fm-*.md` but
  no `xsk-*.md`, while `~/.config/opencode/skills/` holds the xsk skills (inert for slash
  commands).
- Reference `~/x-skills/req-to-plan` (`tools/workflow_cli/install.py`) installs opencode
  commands by reusing the claude command body and injecting a `$ARGUMENTS` section
  (`_render_opencode_command`) so invocation args are not dropped.

`lib/install.js` currently installs identically across all platforms (one `SKILL.md` into
each platform's `skillsRoot`), with no per-platform branch. This requirement introduces the
first platform-specific artifact, so the manifest, snapshot, uninstall, and status paths
must all learn about the new command files.

### Goal

Make `xsk install` for opencode also generate `~/.config/opencode/commands/xsk-<name>.md`
per applicable skill, so `/xsk-*` is invocable, following the req-to-plan recipe (a
`description:` frontmatter, the skill body, and a `$ARGUMENTS` placeholder). The existing
skills-directory install is kept.

### Scope

**In scope**

- opencode adapter: add `commandsRoot()` = `<home>/.config/opencode/commands`.
- `lib/install.js` opencode path: in addition to the skill file, write a command file at
  `<commandsRoot>/<skill.name>.md` whose body is the generated skill content with a
  `$ARGUMENTS` section appended when absent.
- Manifest, snapshot, uninstall, and status: track the command files (installed_paths and
  installed_hashes), capture them in the pre-install rollback snapshot, remove them on
  uninstall, and detect drift on them.
- Tests: opencode-specific assertions in install, uninstall, safety, status, and
  self-conformance updated to cover command files.
- README.md and README.zh-CN.md Platforms and Skills sections.

**Out of scope**

- Other platforms. Claude already exposes `/xsk-*` through its skills directory; Codex and
  Gemini command exposure is not addressed here (see Open Questions).
- Changing skill content or the generator. The command body reuses the generated skill
  content; there is no separate command template.
- Dropping the opencode skills-directory install (kept; see D-12 and Open Questions).
- Re-installing to platforms. Publish is batched by the user later.

### Requirements

- **R-4.1 commandsRoot.** The opencode adapter exposes `commandsRoot(options)` =
  `<home>/.config/opencode/commands`, alongside the existing `skillsRoot`.
- **R-4.2 Command generation.** For each applicable skill, the opencode install writes
  `<commandsRoot>/<skill.name>.md`. The body is the generated `SKILL.md` content (which
  already carries `description:` frontmatter); if it does not already contain `$ARGUMENTS`,
  append a short opencode-arguments section ending in a `$ARGUMENTS` placeholder so
  slash-command args are passed through, adapted from the reference (xsk skills have no bin
  wrapper, so the section refers to the skill above, not a wrapper).
- **R-4.3 Keep skills directory.** The existing `~/.config/opencode/skills/<name>/SKILL.md`
  install is unchanged; commands are additive.
- **R-4.4 Manifest and rollback.** Command files are recorded in the opencode manifest
  (installed_paths and installed_hashes), captured in the pre-install snapshot for
  transactional rollback, and protected by the same user-edit and drift guards as skill
  files.
- **R-4.5 Uninstall.** `xsk uninstall` for opencode removes the managed command files along
  with the skill files, and prunes command files for skills no longer installed.
- **R-4.6 Status and drift.** `xsk status` for opencode detects drift or user edits on the
  command files, the same as for skill files.
- **R-4.7 Tests.** Update opencode-specific assertions in `test/install.test.js`,
  `test/uninstall.test.js`, `test/safety.test.js`, `test/status.test.js`, and
  `test/self-conformance.test.js` to cover command files (written on install, removed on
  uninstall, tracked in the manifest, rolled back by the snapshot). Add any other
  enumeration the suite surfaces.
- **R-4.8 Docs parity.** README.md and README.zh-CN.md state that opencode installs both a
  skill and a `commands/xsk-<name>.md` command, EN and CN aligned.

### Acceptance & Checkpoints

- **AC-1** After `xsk install --platform opencode`, `~/.config/opencode/commands/xsk-<name>.md`
  exists for each applicable skill, each with `description:` frontmatter and a `$ARGUMENTS`
  placeholder, and `/xsk-*` is invocable in opencode.
- **AC-2** The opencode manifest lists the command files in installed_paths and
  installed_hashes.
- **AC-3** `xsk uninstall --platform opencode` removes the command files and leaves no
  xsk-managed command behind.
- **AC-4** A failed opencode install rolls the command files back via the snapshot, leaving
  no partial command file.
- **AC-5** `xsk status` reports drift when a command file is edited or missing.
- **AC-6** `node --test` passes across all suites.
- **AC-7** README.md and README.zh-CN.md are updated and aligned.
- **Checkpoint C-1.** After the change, `node --test` is green and a manual
  `xsk install --platform opencode` is verified to make `/xsk-think` available in opencode
  before publish.

### Decisions

- **D-12.** The fix is additive: opencode installs both the skill (unchanged) and a command
  file. Rationale: the command file is what opencode exposes as `/xsk-*` (verified via docs
  and machine state); the skills directory is kept because it may serve agent-side discovery
  and removing it is a separate concern.
- **D-13.** The command body reuses the generated skill content with `$ARGUMENTS` appended
  when absent, rather than a separate command template. Rationale: one source of truth (the
  fragments and generated skill), no second body to keep in sync.
- **D-14.** Scope is opencode-only, as reported. Codex and Gemini are not assumed fixed or
  broken here; see Open Questions.

### Open Questions

- Whether Gemini and Codex have the same missing-command gap (xsk installs no command
  artifact for any platform; only Claude auto-exposes skills as `/` commands). Non-blocking;
  disposition: out of REQ-004 scope, owned by the user as a separate requirement if their
  `/xsk-*` is also missing.
- Whether the opencode skills-directory install should later be dropped if opencode is
  confirmed not to read it. Non-blocking; disposition: deferred cleanup owned by the user,
  revisited only if confirmed inert.

---

## REQ-005 Encode per-platform user-invocability in the skill-scaffold standard

**Status:** proposed

### Background

`xsk-skill-scaffold` carries the canonical "xsk standard" in
`templates/fragments/skill-scaffold.behavior.md` (the Canonical checklist), and its purpose
states the standard is self-owned and canonical, living in the skill rather than an external
file that can drift.

The checklist item "Four platforms, all full: Claude Code, Codex, opencode, Gemini" leaves
"full" undefined. It does not require that installed skills are actually user-invocable on
each platform, so a project that meets the checklist by placing skill files on all four
platforms still passes while `/xsk-*` is broken on opencode (and likely Gemini). REQ-004
establishes that those platforms do not auto-expose skill files as slash commands and need a
command file in the platform command directory. Because the skill's self-conformance clause
means xsk must satisfy its own standard, REQ-004 (fix the instance) and REQ-005 (fix the
standard) keep xsk aligned.

### Goal

Tighten the skill-scaffold standard so supporting a platform means the skills are
user-invocable there, and add explicit guidance that platforms which do not auto-expose
skill files as slash commands get a command file (with the skill body and the platform's
argument placeholder) in the platform command directory. State it as a general principle
verified per platform, not a hard-coded per-platform recipe.

### Scope

**In scope**

- Edit `templates/fragments/skill-scaffold.behavior.md`: reword the platform-coverage
  checklist item and add a per-platform-invocability item.
- Regenerate `skills/skill-scaffold/SKILL.md` and the masked golden fixture
  `test/fixtures/golden/xsk-skill-scaffold.md`.
- Update any skill-scaffold test assertions that pin the changed checklist text.

**Out of scope**

- The concrete opencode command install in xsk. That is REQ-004; REQ-005 changes only the
  propagated standard.
- Any Codex or Gemini install code in xsk. The standard states the principle; xsk's own
  per-platform fixes beyond opencode, if needed, are separate requirements.
- Other skill-scaffold checklist items.
- Re-installing to platforms. Publish is batched by the user later.

### Requirements

- **R-5.1 Reword platform coverage.** Replace the checklist line
  "Four platforms, all full: Claude Code, Codex, opencode, Gemini." with a coverage-only
  line: "Four platforms covered: Claude Code, Codex, opencode, Gemini." Completeness is then
  defined by R-5.2 rather than implied by file presence.
- **R-5.2 Add per-platform invocability.** Add a checklist item, worded as a principle:

  > User-invocable on every platform, not merely present. Installing a skill must make it
  > invocable on each target platform. Platforms that do not auto-expose skill files as
  > slash commands (opencode, and Gemini through its `commands/*.toml`) also get a command
  > file in the platform's command directory, carrying the skill body and the platform's
  > argument placeholder so invocation arguments are not dropped. Claude exposes skill files
  > directly. Verify per platform rather than assuming.

- **R-5.3 Regeneration and house rules.** Regenerate `skills/skill-scaffold/SKILL.md` and
  the masked golden fixture so `golden.test.js` stays green; generated content has no
  em-dash (U+2014) or en-dash (U+2013) and keeps the headings the tests assert (`Gate`,
  `Audit`, `Propose`, `Apply on approval`, `error out`).
- **R-5.4 Tests.** Update any assertion in `test/skill-behavior.test.js` or
  `test/generator.test.js` that pins the old "all full" text; `node --test` stays green.

### Acceptance & Checkpoints

- **AC-1** The skill-scaffold standard defines platform support as user-invocability, not
  file presence, and names command-file installation for platforms that do not auto-expose
  skills as slash commands.
- **AC-2** The new item reads as a general principle verified per platform, not a hard-coded
  per-platform recipe.
- **AC-3** `skills/skill-scaffold/SKILL.md` and the golden fixture are regenerated and
  consistent, with no em-dash or en-dash and the asserted headings intact.
- **AC-4** `node --test` passes across all suites.
- **Checkpoint C-1.** After regeneration, confirm `node --test` is green before publish.

### Decisions

- **D-15.** REQ-005 updates only the propagated standard in `xsk-skill-scaffold`; the
  concrete opencode install fix is REQ-004. Rationale: separate the standard from its
  instance, keep each reviewable.
- **D-16.** The standard states a general per-platform-invocability principle (verify per
  platform) rather than enumerating each platform's command recipe, so it stays correct as
  platforms evolve. This also resolves REQ-004's Gemini/Codex open question at the standard
  level: any platform that does not auto-expose skills needs a command file.
- **D-17.** REQ-005 depends on REQ-004 for the concrete recipe the standard describes;
  implementation order is REQ-004 then REQ-005.

### Open Questions

None blocking.

---

## REQ-006 Refresh the skill-scaffold standard to match the current implementation

**Status:** proposed

### Background

The `xsk-skill-scaffold` standard (the Canonical checklist in
`templates/fragments/skill-scaffold.behavior.md`) has drifted behind the actual xsk
implementation on three axes. Because the standard is self-owned and canonical, the drift
propagates to every scaffolded project and lets xsk pass its own self-conformance against a
weaker bar than it meets.

- **Skills not required to be built from source.** The skill's purpose is to make a project generate
  skills and CLI commands to the standard, yet the checklist names only "a golden snapshot
  of the generated skill shell." The real build pipeline (`lib/generator.js` `buildSkill` composes
  per-section fragments plus a shared body and a template; `lib/skills.js` is the registry;
  the packed `skills/<base>/SKILL.md` is kept byte-for-byte in sync, enforced by
  `golden.test.js`) is not stated, so a project could pass with hand-maintained skills and
  no generator.
- **Install-safety wording stale.** `lib/install.js` records `installed_hashes`
  (`lib/manifest.js`), refuses a user-edited owned file by content hash
  (`install.js` "refusing to overwrite user-edited owned skill"), and recognizes a
  previously generated install even without the marker (markerless detection). The
  checklist names only "ownership markers."
- **Test coverage too narrow.** The checklist names the golden snapshot, README content
  pinning, and self-conformance, but xsk also ships install, uninstall, safety, and status
  suites; the standard does not require the install surface to be tested.

### Goal

Bring the Canonical checklist current with the implementation on the three axes above: add a
built-from-source item, extend the install-safety item to include content-hash and markerless
detection, and broaden the test item to require the install surface to be tested. Each is
stated as a principle with the xsk implementation as the reference example, not a hard-coded
file layout.

### Scope

**In scope**

- Edit the Canonical checklist in `templates/fragments/skill-scaffold.behavior.md`: add the
  built-from-source item, extend the install-safety item, add the test-coverage item.
- Regenerate `skills/skill-scaffold/SKILL.md` and the masked golden fixture.
- Update any skill-scaffold test assertion pinned to changed text.

**Out of scope**

- The per-platform invocability item (REQ-005), which also edits this fragment.
- Any change to xsk's generation, install, or test code. xsk already implements all three;
  REQ-006 only updates the propagated standard.
- Re-installing to platforms. Publish is batched by the user later.

### Requirements

- **R-6.1 Built-from-source item.** Add a checklist item:

  > Built from source: skills are generated from a single per-skill source, not
  > hand-maintained per platform or per file. The reference composes each skill from
  > per-section fragments (`purpose`, `triggers`, `behavior`, `output`) plus a shared common
  > body and a template, with one registry listing the skills. The build is deterministic,
  > and the committed packed skill output stays byte-for-byte in sync with the generator,
  > enforced by a test. The golden snapshot below is the masked form of that output.

- **R-6.2 Install-safety update.** Replace the item
  "Manifest-backed install safety: owned-only removal, ownership markers, atomic writes,
  symlink refusal." with:

  > Manifest-backed install safety: owned-only removal, ownership markers, atomic writes,
  > symlink refusal, and content-hash modification detection. The manifest records a hash
  > per owned file; a previously generated install is recognized by that hash even without
  > the marker (markerless detection), so a user-edited owned file is detected and refused
  > or rolled back rather than silently overwritten.

- **R-6.3 Test-coverage item.** Add a checklist item:

  > Test coverage spans the install surface, not only generation and docs: install,
  > uninstall, uninstall-first reset, transactional rollback, and the safety refusals (a
  > user-edited owned file, symlinked paths) are exercised by executable tests, alongside
  > the golden snapshot, README parity, and self-conformance tests.

- **R-6.4 Regeneration and house rules.** Regenerate `skills/skill-scaffold/SKILL.md` and
  the masked golden fixture so `golden.test.js` stays green; generated content has no
  em-dash (U+2014) or en-dash (U+2013) and keeps the headings the tests assert (`Gate`,
  `Audit`, `Propose`, `Apply on approval`, `error out`).
- **R-6.5 Tests.** Update any assertion in `test/skill-behavior.test.js` or
  `test/generator.test.js` pinned to changed checklist text; `node --test` stays green.
- **R-6.6 Co-edit with REQ-005.** REQ-005 and REQ-006 both edit
  `skill-scaffold.behavior.md`. When implemented together, regenerate once and verify the
  golden and self-conformance in a single pass. Because REQ-005 depends on REQ-004, this
  combined skill-scaffold pass lands after REQ-004.

### Acceptance & Checkpoints

- **AC-1** The checklist requires skills to be built from source: single per-skill source,
  registry-driven, deterministic build, packed output kept in sync, golden snapshot.
- **AC-2** The install-safety item names content-hash modification detection and
  markerless-generated detection.
- **AC-3** The test item requires the install, uninstall, rollback, and safety-refusal
  surface to be exercised by tests.
- **AC-4** `skills/skill-scaffold/SKILL.md` and the golden fixture are regenerated and
  consistent, with no em-dash or en-dash and the asserted headings intact.
- **AC-5** `node --test` passes across all suites.
- **Checkpoint C-1.** After regeneration, confirm `node --test` is green before publish.

### Decisions

- **D-18.** REQ-006 refreshes the propagated standard only; xsk already implements the
  build pipeline, hash-based install safety, and the install/uninstall/safety test suites.
  Rationale: the standard drifted behind the implementation, so no code change is needed.
- **D-19.** Each new or changed item is stated as a principle with the xsk implementation as
  the reference example, so the standard does not hard-code one project's exact file layout.
- **D-20.** REQ-006 is independent of REQ-004. It shares the `skill-scaffold.behavior.md`
  fragment with REQ-005, so the two are co-regenerated (R-6.6).

### Open Questions

None blocking.

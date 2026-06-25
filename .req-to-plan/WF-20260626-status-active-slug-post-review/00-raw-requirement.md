---
r2p_stage: raw_requirement
r2p_version: 1
r2p_status: approved
r2p_created_at: 2026-06-25T16:59:44.294645+00:00
r2p_updated_at: 2026-06-25T17:06:04.809139+00:00
---

---
status: active
slug: post-review-hardening
created_at: 2026-06-26
---

# xsk Post-Review Hardening

A focused set of hardening and skill-semantics requirements derived from a
project review and validated against the source at commit `addb4ed`. This
document governs follow-on work only; it does not restate the master spec.
The master spec remains `docs/REQUIREMENTS.md`; every requirement here either
tightens an existing invariant in that spec or fixes a verified gap.

## 1. Background

A review raised twelve issues. Each was checked against the actual code before
being accepted here. The validation outcome:

- **Accepted (real gap or real fix):** manifest path containment, `doctor`
  missing `~/.xsk` writability, `version`/`help` silently accepting
  `--platform`, `xsk-bypass-claude` settings scope and missing safety guards,
  `xsk-archive-req` non-atomic move and target collision.
- **Accepted as documentation/UX gap, not a correctness bug:** cross-platform
  skill-directory discovery aliases (already a recorded design consequence in
  `docs/REQUIREMENTS.md` section 7, but undisclosed in the README).
- **Reframed per maintainer decision:** the "multiple active requirement docs"
  case is not a supported scenario. The invariant is at most one active doc.
  These skills maintain that invariant; they do not implement a multi-active
  workflow.
- **Rejected (conflicts with a locked decision):** changing `install` to target
  only a primary platform contradicts decision D4 and the success criterion
  that `install` writes into every target platform. The default stays
  install-all; the alias consequence is addressed by disclosure instead.
- **Deferred (out of scope this round):** `status` content-drift detection,
  a `discoveryWarnings` JSON field, an `xsk-check` read-only-by-default change,
  and trigger-enriched descriptions.

### Validation evidence

| Area | Verdict | Evidence |
|---|---|---|
| Manifest containment | Real gap | `lib/manifest.js` `validate()` is shape-only; `lib/uninstall.js` `uninstallPlatform({platform, xskRoot})` never resolves the platform skills root; `lib/ownership.js` `safeBackupForSkill` validates the backup file location but not the restore target |
| `doctor` xsk-root | Real gap | `lib/capability.js` `doctor()` checks Node, per-platform roots, and manifest validity only |
| Parser options | Real bug | `lib/input.js` word-form `version`/`help` fall through to the generic option loop and accept `--platform` silently, while the dash forms reject extra arguments |
| bypass scope | Real, deliberate surface | `skills/bypass-claude/SKILL.md` targets the shared `.claude/settings.json` and refuses to touch `settings.local.json` |
| archive atomicity | Real gap | `skills/archive-req/SKILL.md` moves the file then updates frontmatter, with no collision guard |
| discovery aliases | Documented consequence, undisclosed in README | `docs/REQUIREMENTS.md` section 7 records it; `README.md` / `README.zh-CN.md` do not |

## 2. Goal

Bring the implementation in line with the safety contract the project already
advertises ("xsk writes nowhere except the platform skill dirs and `~/.xsk/`",
owned-only removal), close the verified correctness gaps, and tighten three
skill semantics, without weakening any existing install/uninstall invariant.

## 3. Scope

### In scope

R-A manifest path containment, R-B `doctor` xsk-root writability, R-C
command-specific option validation, R-D `xsk-bypass-claude` scope change and
safety guards, R-E `xsk-archive-req` atomicity and collision handling, R-F
single-active guard, R-H README discovery disclosure, R-I1 `xsk-think` output
wording.

### Out of scope (this round)

- R-G `status` content-drift detection (regenerate-and-compare in `status`).
- R-H2 `status --json` `discoveryWarnings` field.
- R-I2 `xsk-check` default-read-only behavior change.
- R-I3 trigger-enriched skill descriptions.
- Any change to the install-all default (rejected; see section 1).
- Any multi-active requirement-doc workflow (not a supported scenario).

## 4. Cross-cutting constraints

- Every skill-body change goes through the generation pipeline: edit
  `templates/fragments/<base>.{purpose,triggers,behavior,output}.md` (and
  `shared/skill-common.md` if shared), regenerate the canonical
  `skills/<base>/SKILL.md` from `buildSkill`, then regenerate the masked golden
  fixture in `test/fixtures/golden/`. Never hand-edit a generated `SKILL.md`.
- No em-dash (U+2014) or en-dash (U+2013) in any skill content; no
  AI-formulaic filler. Skill content stays English; triggers remain
  multilingual cues in the body, not required frontmatter fields.
- Generated frontmatter stays `name` + `description` only. Do not add
  `when_to_use` / `dispatch_intent` as required fields (alias-collision rule).
- Every new install/uninstall/status/doctor test injects per-test temp
  `platformRoots` + `xskRoot`. No test may fall back to `os.homedir()`.
- Do not weaken any existing install-safety invariant listed in `AGENTS.md`.
- Run `npm test` + `npm run syntaxcheck` before claiming any phase done.

## 5. Requirements

### R-A. Manifest path containment (the owned-only contract)

The safety promise is "owned-only removal, platform dirs only". A
shape-valid-but-corrupted manifest must not be able to make uninstall, status,
or doctor act on a path outside the resolved platform skills root.

- **R-A1.** `uninstallPlatform` receives or resolves the platform `skillsRoot`.
  `uninstall()` resolves it via `rootFor(platform, opts.platformRoots)` and
  passes it through. Every entry in `installed_paths[]` must satisfy
  `isInsideDir(path, skillsRoot)`; if any entry is not, the whole manifest is
  treated as `invalid` and uninstall refuses (removes nothing, changes nothing,
  retains the manifest).
- **R-A2.** Backup restore is containment-checked on both ends: the backup file
  must resolve inside `~/.xsk/install/backups/<platform>/` (already enforced by
  `safeBackupForSkill`) and the restore `target` must resolve inside
  `skillsRoot`. A restore whose target escapes `skillsRoot` is refused and the
  skill dir goes partial/retained.
- **R-A3.** `status` and `doctor` apply the same containment. An out-of-root
  recorded path makes the platform report `invalid`, not `drift`. (`doctor`'s
  `manifest-valid` check already fails on `invalid`.)
- **R-A4 (implementation note, optional).** Containment may be factored as a
  second validation layer, for example `validateOperationalSemantics({platform,
  skillsRoot, xskRoot})` alongside the existing shape `validate()`. The factoring
  is at the implementer's discretion; the behavior in R-A1..R-A3 is the
  requirement.

**Acceptance:**
- New test `uninstall: refuses installed_paths outside platform root`: manifest
  is shape-valid, marker content is valid, the on-disk SKILL.md matches
  generated content, but a recorded path resolves outside the platform root.
  Expected: result is `invalid`/refused, the out-of-root file is untouched, the
  manifest is retained.
- New test: a backup record whose `target` escapes the platform root is refused
  and does not write outside the root.
- New test: `status` and `doctor` report `invalid` (not `drift`) for an
  out-of-root recorded path.
- All existing install/uninstall/status/doctor tests still pass.

### R-B. `doctor` checks `~/.xsk` writability

- **R-B1.** `doctor` adds a `writable-xsk-root` check over the resolved
  `xskRoot`, reusing the `isWritableDir` logic (symlink and non-directory
  ancestor refusal, creatable-if-absent). The check fails when `xskRoot` is not
  writable or is a symlink, and a failure makes `doctor` exit non-zero.

**Acceptance:**
- New test: `doctor` with an unwritable `xskRoot` reports the
  `writable-xsk-root` check as FAIL and `allPass` is false.
- New test: `doctor` with a symlinked `xskRoot` reports FAIL.
- `doctor` JSON output includes the new check entry.

### R-C. Command-specific option validation

`version` and `help` must not silently accept options. The current parser
rejects extra arguments after the dash forms (`-v`, `--version`, `-h`,
`--help`) but lets the word forms (`version`, `help`) absorb `--platform`.

- **R-C1.** Option acceptance per command:
  - `version`, `help`: accept no options. Any option is an error.
  - `install`, `uninstall`: accept `--platform <list>` (and `--platform=<list>`).
  - `status`, `doctor`: accept `--platform` and `--json`.
  - Any unknown or not-allowed option for the resolved command fails loud with a
    non-zero exit.

**Acceptance:**
- New test: `xsk version --platform claude` exits non-zero with a clear error.
- New test: `xsk help --json` and `xsk help --platform x` exit non-zero.
- Existing behavior preserved: `xsk version`, `xsk -v`, `xsk help`, `xsk status
  --json`, `xsk install --platform claude,codex` unchanged; `xsk version --json`
  still rejected.

### R-D. `xsk-bypass-claude` scope change and safety guards

The skill currently writes the shared, version-controlled `.claude/settings.json`
and sets `permissions.defaultMode = "bypassPermissions"`, which leaks an
auto-approve default to anyone who checks out the repo. Decision: write the
personal, gitignored `.claude/settings.local.json` instead.

- **R-D1.** The skill operates on the current project directory and targets
  `.claude/settings.local.json` only. It must never write or modify
  `.claude/settings.json`. The created-from-scratch payload, the merge-in-place
  rule (set only `permissions.defaultMode`, preserve every other field, 2-space
  indent, trailing newline), and the idempotent no-op when already set, all
  apply to `settings.local.json`.
- **R-D2.** The skill refuses to act outside a Claude Code environment: if the
  current agent is not Claude Code, it states that it is a Claude Code-only
  skill, writes nothing, and stops.
- **R-D3.** If `.claude/settings.local.json` exists but is not valid JSON or is
  not a JSON object, the skill stops and reports the malformed file. It never
  overwrites or truncates a file it could not parse.
- **R-D4.** Because the target is a personal gitignored file, no team-impact
  confirmation is required. The skill reports the path written and that
  `permissions.defaultMode` is `bypassPermissions`, without echoing other
  preserved values.

**Acceptance:**
- `docs/REQUIREMENTS.md` section 4.2 (steps 2 to 4 and the "reads only
  `.claude/settings.json`" note) and the skill registry `description` in
  `lib/skills.js` are updated to reference `settings.local.json`. A new
  locked-decision row in section 13 records the scope change (D7 stays as-is:
  it is about Claude-only targeting, not the settings file).
- `templates/fragments/bypass-claude.*.md` regenerated; canonical
  `skills/bypass-claude/SKILL.md` and `test/fixtures/golden/xsk-bypass-claude.md`
  regenerated to match.
- `README.md` and `README.zh-CN.md` skill descriptions updated to
  `settings.local.json`.
- `test/skill-behavior.test.js` asserts the body references
  `.claude/settings.local.json`, includes a non-Claude refusal, includes a
  malformed-JSON refusal, and does not instruct writing `.claude/settings.json`.

### R-E. `xsk-archive-req` atomicity and collision handling

The skill moves the active doc then updates its frontmatter. A failure between
the two steps leaves the active doc gone but not properly archived, and a
re-archive of the same slug silently overwrites an existing archived file.

- **R-E1.** If `requirements/archive/<slug>.md` already exists, the skill does
  not overwrite it. It either uses a timestamped name
  `requirements/archive/<slug>-YYYYMMDD-HHMMSS.md` or stops and asks the user to
  decide. The chosen behavior is stated in the skill body.
- **R-E2.** The archive is write-then-remove, not move-then-edit: first write
  the fully-updated archived content (frontmatter `status: archived` plus
  `archived_at`, body unchanged) to the archive path and confirm it landed, then
  remove the source active doc. No intermediate state may leave the active doc
  deleted while no valid archived doc exists.
- **R-E3.** If the active doc has a missing or invalid slug (a slug that does not
  match `^[a-z0-9]+(-[a-z0-9]+)*$`), the skill stops and reports it rather than
  writing an archive file under a bad name.

**Acceptance:**
- `templates/fragments/archive-req.*.md` regenerated; canonical
  `skills/archive-req/SKILL.md` and golden fixture regenerated.
- `test/skill-behavior.test.js` asserts the body specifies: no-overwrite on
  archive-target collision, write-then-remove ordering, and invalid-slug refusal.
- `docs/REQUIREMENTS.md` section 4.5 updated to match.

### R-F. Single-active invariant guard

The invariant (at most one active requirement doc) is unchanged. These skills
maintain it; this requirement only adds a loud guard against an invariant that
was broken externally (a manual edit or a merge), so the skill does not silently
pick one of several active docs.

- **R-F1.** When `xsk-write-req` or `xsk-archive-req` scans
  `requirements/*.md` (excluding `archive/`) and finds more than one doc with
  `status: active`, it stops, lists the offending paths, and reports the broken
  invariant for the user to resolve. It does not implement a multi-active
  workflow and does not auto-resolve.

**Acceptance:**
- `templates/fragments/write-req.*.md` and `templates/fragments/archive-req.*.md`
  regenerated; canonical skills and golden fixtures regenerated.
- `test/skill-behavior.test.js` asserts both bodies specify the
  more-than-one-active stop-and-report guard, and that the single-active
  invariant language is retained.
- `docs/REQUIREMENTS.md` section 10 wording confirms the guard without
  introducing a multi-active flow.

### R-H. README discovery-alias disclosure

The READMEs imply each platform sees only its own installed skills. In practice
opencode also reads `~/.claude/skills` and `~/.agents/skills`, and Gemini also
reads `~/.agents/skills`, so same-name skills can be duplicated or shadowed
across platforms. This is already recorded in `docs/REQUIREMENTS.md` section 7
but not surfaced to users.

- **R-H1.** `README.md` and `README.zh-CN.md` gain a short "Discovery aliases
  and duplicate skills" note (under Platforms or Safety) stating: opencode also
  reads `~/.claude/skills` and `~/.agents/skills`; Gemini also reads
  `~/.agents/skills`; the same skill name may therefore be visible to more than
  one platform; xsk still installs each platform's own owned copy so each install
  is independently uninstallable; `xsk-bypass-claude` is inert off Claude Code.
- **R-H1 verification gate.** Before writing the README copy, re-verify the
  discovery-alias facts against the current official opencode and Gemini docs
  (the repo last verified them on 2026-06-25). If a fact has changed, update the
  copy and `docs/REQUIREMENTS.md` section 7/14 to match. Owner: the Phase 3
  implementer.

**Acceptance:**
- Both READMEs contain the new section with identical headings (EN/CN parity).
- English literals (paths, skill names) preserved in the zh-CN copy.
- `test/readme-pinning.test.js` heading-parity check still passes.

### R-I1. `xsk-think` output wording

- **R-I1.** The `xsk-think` output section is emitted before approval, so its
  heading should read "Proposed Design Summary" rather than "Approved Design
  Summary".

**Acceptance:**
- `templates/fragments/think.output.md` regenerated; canonical
  `skills/think/SKILL.md` and golden fixture regenerated.
- No occurrence of "Approved Design Summary" remains in the generated
  `xsk-think` body.

## 6. Implementation phasing

Each phase is independently mergeable; after each phase the system is usable.

- **Phase 1 (lib/CLI safety and correctness):** R-A, R-B, R-C, R-E. Pure code
  plus the `xsk-archive-req` body for R-E.
- **Phase 2 (bypass recast):** R-D1, R-D2, R-D3, R-D4, with the section 4.2 / D7
  / registry / README / golden / test updates.
- **Phase 3 (guard, disclosure, wording):** R-F, R-H1 (after its verification
  gate), R-I1.

## 7. Verification

- `npm test` (full `node --test` suite) green.
- `npm run syntaxcheck` clean.
- `npm pack --dry-run` shows no unexpected content change.
- Golden snapshots regenerated for every touched skill; golden tests pass.
- Self-conformance test (`test/self-conformance.test.js`) still passes.
- README pinning test (EN/CN heading parity, English literals) passes.

## 8. Checkpoints

- **C1 (after Phase 1):** an out-of-root manifest is refused by uninstall,
  status, and doctor; `doctor` fails on an unwritable `~/.xsk`; `xsk version
  --platform claude` exits non-zero; `xsk-archive-req` cannot leave a
  deleted-but-unarchived active doc.
- **C2 (after Phase 2):** `xsk-bypass-claude` writes only
  `.claude/settings.local.json`, refuses off Claude Code, and refuses a
  malformed file; all generated artifacts and docs reference
  `settings.local.json` with zero stale `settings.json` references in the skill
  surface.
- **C3 (after Phase 3):** both skills stop-and-report on more than one active
  doc; both READMEs disclose discovery aliases with EN/CN parity; the generated
  `xsk-think` body says "Proposed Design Summary".

## 9. Open questions

None blocking. R-H1's external facts are deferred to a verification gate with a
named owner (Phase 3 implementer), not left as an unresolved unknown.

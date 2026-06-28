# SPEC Subagent Review v1

stage: spec
verdict: approve-with-nits

## Summary
The SPEC faithfully contracts all five approved design areas into SPEC-* behavior contracts with
no dropped or contradicted design item, and every restated `file:line` claim checks out against the
real code. The opencode consumer wiring (previousInstallState command-file class, both
validateOperationalSemantics call sites + commandsRoot plumbing, snapshot prune generalization,
uninstall command-file pass with narrowed-manifest hash bookkeeping, status `file` classification)
is carried over intact, and the SPEC actually *resolves* the design's deferred NIT-3 by committing
to a concrete classifier per function (basename for the two basename-only functions, commandsRoot
membership for validateOperationalSemantics). Remaining items are low-severity: the appended
`$ARGUMENTS` section text is not pinned verbatim, the external-doc corroboration slightly
overgeneralizes the `fm-*.md` files, and REQ-004's manual invocability checkpoint is not surfaced
for PLAN. None blocks approval.

## SPEC↔design fidelity & code accuracy
- SPEC-WRITEREQ-001 (`06-spec.md:13-23`) — faithful to DES-WRITEREQ-001: two verbatim swaps at
  `write-req.behavior.md:13` / `:25`, byte-match + headings + no-dash, step 4 (`:11`) preserved.
  Confirmed those are the live single-shot/single-pass passages.
- SPEC-STORES-001 (`:25-40`) — faithful: full reference inventory including the v2/v3 fix
  `test/skill-behavior.test.js:123` and `:129` (`:32`), the shared `.xsk/.gitignore`
  create/append/never-overwrite contract, archive-req invariants, no migration. Grep-clean assertion
  present (`:33-34`).
- SPEC-POINTS-001 (`:42-62`) — faithful: registry entries `{fragmentBase point/consume-point,
  platforms ALL_PLATFORMS.slice()}`, four-section fragments, the full point schema, both
  compose-by-reference contracts, single-active append-or-abort guard, archive-on-consume
  write-before-remove, user-confirmed drop, trigger disambiguation.
- SPEC-OPENCODE-001 (`:64-100`) — faithful and complete; restated code claims re-verified:
  - adapter `options.home` override — accurate: `lib/adapters/opencode.js:9` is
    `const home = opts.home || os.homedir();` (skillsRoot pattern the SPEC says commandsRoot mirrors).
  - `validateOperationalSemantics` (`lib/manifest.js:83`), two call sites `lib/uninstall.js:229` /
    `lib/status.js:107`, plumbing via `uninstallPlatform` (`uninstall.js:181`), `install.js:466`,
    `uninstall.js:557`, invalid-throw `install.js:467` — all correct.
  - `previousInstallState` wasInstalled/prior-hash at `install.js:365-366`, gate `:118`,
    `isPreviouslyInstalledGeneratedContent` `:117` — correct.
  - snapshot filter generalization `install.js:270,285`; marker-less backup branch keyed on
    `skillFileExisted && !markerFileExisted` (`install.js:360`) — correct.
  - uninstall separation cites `classifyPaths` `uninstall.js:43-54`, `ownedDirs` `:277-282`,
    `validateBackupTargets` `:85-104`; narrowed-manifest `retainedInstalledHashes` `:74-79` +
    reconstruction `:496-505` "today filter on skill files" — correct.
  - command-path helper: SPEC (`:71-75`) commits previousInstallState + expectedInstalledPathType to
    a non-`SKILL.md`/non-`MARKER` `.md` basename classifier, validateOperationalSemantics to
    commandsRoot membership. Sound: in xsk's path set, the only `.md`-basename-not-`SKILL.md` entries
    are command files under commandsRoot, so the two predicates never diverge.
- SPEC-STANDARD-001 (`:102-113`) — faithful: REQ-005 reword `:16` + invocability item, REQ-006 three
  items, install-safety `:17` replacement, regenerate once, headings preserved, lands after OPENCODE.
- Data contracts (`:115-132`): registry shape `{name,description,platforms,fragmentBase}` matches
  `lib/skills.js:5-48`; generated skill shape matches `templates/skill.md.tmpl:1-22` exactly
  (`name`/`description` frontmatter, `# {{NAME}}`, `## When to use`, `## How it works`, `## Output`,
  shared body); manifest contract (`installed_paths`/`backups` required, `installed_hashes` optional)
  matches `lib/manifest.js:11-18,210-222`; opencode `installed_paths` may carry `<commandsRoot>/xsk-*.md`
  with a matching hash and no backup — consistent with the install/uninstall contracts.
- No design item silently dropped.

## Completeness for PLAN
- Contracts are executable: the Test Matrix (`:141-160`) maps each area to concrete suites with
  objective assertions (byte-match goldens, name-list-to-eight, self-conformance path additions,
  command-file written+hashed+rolled-back+pruned+drift, "a second install and a status call do not
  flip the manifest to invalid" at `:156`). PLAN can write verifiable tasks from these.
- Point document schema (`:45-47,122-124`) and gitignore contract (`:131-132`) are concrete.
- NIT-1 (low): the appended opencode `$ARGUMENTS` section text is not pinned verbatim (`:67-70`,
  `:129-130`) — only "fenced `$ARGUMENTS` placeholder ... refer to the skill above." The observable
  contract (body contains `$ARGUMENTS`, carries `description:` frontmatter) is testable, so PLAN can
  proceed, but the exact section wording is left to the implementer. Acceptable; consider pinning a
  one-line template in PLAN.
- NIT-2 (low): REQ-004's manual checkpoint (the design's Observability: a real
  `xsk install --platform opencode` confirming `/xsk-think` is invocable) is not surfaced in the SPEC
  Test Matrix or PLAN Handoff. It is inherently manual (automated tests prove file shape/placement,
  not opencode runtime invocation); PLAN should carry it as an acceptance step.
- NIT-3 (very low): REQ-004 README parity is contracted (`:98-99`, data/test text) but not given its
  own Test-Matrix row; `readme-pinning.test.js` heading/token parity and self-conformance heading
  parity backstop it, so this is cosmetic.

## External docs & ambiguity
- The opencode row (`:138`) is accurate on every core convention, verified against the live machine:
  `~/.config/opencode/commands/` exists and holds working `r2p-*.md` / `fm-*.md` and NO `xsk-*.md`;
  filename = command name; `description:` frontmatter present; `$ARGUMENTS` is the all-args
  placeholder; `r2p-start.md:18-20` carries a fenced ```` ```text\n$ARGUMENTS\n``` ```` block. The
  per-project `.opencode/commands/` variant is also correct.
- NIT-4 (low): the corroboration overgeneralizes — it says working "r2p-*.md / fm-*.md command files
  ... use a `description:` header and a fenced `$ARGUMENTS` section," but `fm-design.md` carries
  `description:` and NO `$ARGUMENTS`. This does not affect the contract (the design appends
  `$ARGUMENTS` only "when absent," and opencode treats a command without `$ARGUMENTS` as valid), but
  the sentence should read "r2p-*.md (and some fm-*.md)" to be exact.
- No unresolved ambiguity: "Decision Requests: none" holds — Option A is dictated by R-4.4, the
  command-path classifier is now decided per function, and the `$ARGUMENTS` text is an implementation
  detail, not a fork.

## Recommended changes
Optional, none gate-blocking:
1. NIT-4: narrow the external-doc corroboration to the files that actually carry a fenced
   `$ARGUMENTS` (the r2p set; not all fm files).
2. NIT-2: add REQ-004's manual `xsk install --platform opencode` invocability checkpoint to the PLAN
   Handoff as an explicit acceptance step.
3. NIT-1: optionally pin a one-line shape for the appended `$ARGUMENTS` section so the command-body
   writer is unambiguous.

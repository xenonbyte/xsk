# Design Subagent Review v2

stage: design
verdict: approve-with-nits

## Summary
The v2 revision resolves all seven v1 recommendations. DES-OPENCODE-001 now enumerates every
consumer that assumed "an installed_paths entry is a marker-bearing skill dir inside skillsRoot"
— `previousInstallState`, both `validateOperationalSemantics` call sites with the `commandsRoot`
plumbing, the `capturePlatformSnapshot` prior-paths generalization, the uninstall command-file
pass separated from `classifyPaths`/`ownedDirs`/`validateBackupTargets`, and status — and the
hash-only ownership safety argument is now correctly grounded on the `wasInstalled` gate. The
Rollback section's prune claim is fixed and consistent. Remaining items are low-severity
citation imprecisions and SPEC-level mechanics (how basename-only helpers obtain `commandsRoot`,
narrowed-manifest bookkeeping for retained command files); none is a human-decision fork or a
contradiction that changes the build, so the r2p gate is satisfiable.

## Resolution of v1 findings

1. previousInstallState wiring — RESOLVED. design `:215-221`: "`previousInstallState`
   (`lib/install.js:99-114`) recognizes prior command paths as a distinct third class ... tracking
   their prior membership and prior hash, so the install loop's `wasInstalled` and prior-hash
   signals (`lib/install.js:365-366`) drive `isPreviouslyInstalledGeneratedContent` (`:117`) ... a
   command file absent from the prior manifest is refused rather than clobbered." Code-checked:
   install.js:365 is `previousHash:`, :366 is `wasInstalled:`, gate at :118. Correct.
2. capturePlatformSnapshot prune + Rollback scope — RESOLVED. design `:222-226` and Rollback
   `:268-272`: snapshot "generalizing its prior-manifest loop beyond the `isInsideDir(p, skillsRoot)`
   filter (`:270`, `:285`) to also include prior `commandsRoot` paths ... so an uninstall-first
   prune that later fails rolls back transactionally (AC-4)." Code-checked: filter is at install.js:270
   (`if (!isInsideDir(p, skillsRoot)) continue;`) and :285 (backup-target filter). Correct.
3. Both validateOperationalSemantics call sites + commandsRoot plumbing + non-opencode — RESOLVED.
   design `:206-214`: "Both call sites are wired: `uninstallPlatform` (`lib/uninstall.js:181`, check
   at `:229`) gains a `commandsRoot` parameter, resolved and passed by `install.js:466` ... and by
   `uninstall()` (`lib/uninstall.js:557`); `computeStatus` / `statusOf` (`lib/status.js:107`) resolves
   and passes it too. ... platforms without a `commandsRoot()` keep the skillsRoot-only rule."
   Code-checked: uninstall.js:181/229, install.js:466 (reset call) / :467 (invalid throw),
   uninstall.js:557, status.js:107 all correct. (Nit on `statusOf` below.)
4. uninstall separation + no backup — RESOLVED. design `:227-234`: command files "filtered out
   before `classifyPaths`, the `ownedDirs` set, and `validateBackupTargets` (`lib/uninstall.js:43-54`,
   `:277-282`, `:85-104`) ... Command files carry no backup record (the marker-less backup branch at
   `install.js:360-400` is keyed on `skillFileExisted && !markerFileExisted` ...)." Code-checked:
   ownedDirs at uninstall.js:277-282, validateBackupTargets :85-104, backup branch install.js:360. Correct.
5. REQ-004 README parity — RESOLVED. design `:239-240`: "README.md and README.zh-CN.md state that
   opencode installs both a skill and a `commands/xsk-<name>.md` command, EN and CN aligned (R-4.8 /
   AC-7)." and SPEC Handoff `:302`: "and the README EN/CN parity (R-4.8)."
6. REQ-002 inventory adds skill-behavior.test.js:123 — RESOLVED. design `:56`: "`test/generator.test.js:111`,
   and `test/skill-behavior.test.js:123` and `:129`." and `:168` repeats it in DES-STORES-001. (Bonus:
   `:188` now extends `test/generator.test.js:69-73` to also fix the "all six skills" title — my v1 nit.)
7. manifest.js:11 citation corrected — RESOLVED (with a residual imprecision, NIT-1 below). design
   `:61-63`: "`REQUIRED_FIELDS` (`lib/manifest.js:11`) is `installed_paths` and `backups` only;
   `installed_hashes` is an optional field, validated conditionally at `lib/manifest.js:210-222` and
   created at `:235`." The substantive correction (installed_hashes is optional, not required) is right.

## Code-evidence verification (changed lines re-checked)

| Cited fact (v2) | Result |
|---|---|
| `manifest.js:88` for the `isInsideDir(p, skillsRoot)` check (v1 said `:87`) | confirmed — line 88 is the check; off-by-one fixed |
| validateOperationalSemantics "called from exactly two sites, `uninstall.js:229` and `status.js:107`, each passing only `skillsRoot`" | confirmed (grep: only those two call sites) |
| `install.js:365-366` are the `wasInstalled` / prior-hash signals | confirmed |
| `isPreviouslyInstalledGeneratedContent ... gated on wasInstalled (install.js:117-125)` / `:118` | confirmed (gate `if (!wasInstalled) return false;` at :118) |
| capturePlatformSnapshot filter at `install.js:270` and `:285` | confirmed |
| marker-less backup branch keyed on `skillFileExisted && !markerFileExisted` (`install.js:360-400`) | confirmed (branch opens at :360) |
| `uninstallPlatform` (`uninstall.js:181`), reset call `install.js:466`, invalid throw `:467`, `uninstall()` rootFor `uninstall.js:557` | all confirmed |
| `ownedDirs` `uninstall.js:277-282`; `validateBackupTargets` `:85-104` | confirmed |
| status `expectedInstalledPathType` `:12-18`; `installedCount` `:133` counts only `SKILL.md` | confirmed (command paths end `.md`, not `SKILL.md`, so the "keeps counting only skill files" claim holds) |
| `test/generator.test.js:69` is the "all six skills" title | confirmed; `test/skill-behavior.test.js:123` pins `/requirements\/archive\/<slug>\.md/` | confirmed |

## REQ-004 architecture findings

The consumer set is now complete for every safety-critical path (adoption/refusal via
`wasInstalled`, prune rollback via the generalized snapshot, both validate call sites, and the
classifyPaths separation). Residual SPEC-level mechanics only:

- NIT-3 (low) — command-path helper plumbing into basename-only functions. The helper "recognizes
  a command-file path (under `commandsRoot`, basename `xsk-*.md`)" (design `:203`), but
  `previousInstallState(platform, xskRoot)` (`install.js:77`, no skillsRoot/commandsRoot in scope)
  and `recordedPathEntries(manifest)` -> `expectedInstalledPathType(p)` (`status.js:20-22,12`) have
  no `commandsRoot` argument today. The design must either thread `commandsRoot` into them or have
  them classify by basename alone (`*.md` and not `SKILL.md`), which is unambiguous given xsk's
  path shapes. Not specified, but SPEC-resolvable and not a fork.
- NIT-4 (low) — narrowed-manifest bookkeeping for retained command files. The design owns "the
  uninstall command-file pass" including "retains a hash-mismatched one (user-edited)", but does
  not explicitly state that a retained/removed command path and its hash flow into the narrowed
  manifest (`retainedInstalledHashes` `uninstall.js:74-79`, reconstruction `:496-505`), which today
  filter on skill files only. A retained user-edited command file must keep its installed_paths +
  installed_hashes entry or a later status/uninstall loses track of it. SPEC detail, within the
  named pass.

## Requirement coverage findings

No new gaps. REQ-004 R-4.8/AC-7 (README) is now covered; REQ-002 AC-1/AC-4 inventory is complete;
REQ-001/003/005/006 coverage is unchanged from v1 (all ACs and D-1..D-20 mapped, no contradiction).

## Undecided points / hedging

- NIT-1 (low, NEW inaccuracy in a fix passage) — design `:61` says "`REQUIRED_FIELDS`
  (`lib/manifest.js:11`) is `installed_paths` and `backups` only." `REQUIRED_FIELDS` (`manifest.js:11-18`)
  actually contains six entries: `schema_version`, `platform`, `version`, `installed_at`,
  `installed_paths`, `backups`. The intended (correct) point is that `installed_hashes` is NOT among
  the required fields; "is installed_paths and backups only" overstates by dropping the other four.
  Reword to "includes `installed_paths` and `backups` but not `installed_hashes`."
- NIT-2 (low) — design `:211` writes "`computeStatus` / `statusOf` (`lib/status.js:107`) resolves
  and passes it too." `statusOf` (`status.js:64`) does not call `validateOperationalSemantics`; only
  `computeStatus` does, at `:107`. Drop `statusOf` from that clause (or move it to the
  expectedType/file-classification sentence, which is where statusOf is actually involved).
- "Decision Requests: none" remains justified — Option A is dictated by R-4.4 verbatim, hash-only
  ownership is forced by the flat-file shape, Gemini/Codex are deferred by REQ-004 OQ + D-16. No
  silent human-decision fork.

## Recommended changes (if any)

Optional cleanups only (none gate-blocking):
1. NIT-1: reword `:61` to "REQUIRED_FIELDS includes installed_paths and backups but not installed_hashes."
2. NIT-2: drop `statusOf` from the validateOperationalSemantics clause at `:211`.
3. NIT-3/NIT-4: let SPEC pin the command-path helper's input (commandsRoot vs basename-only) for
   `previousInstallState` and `expectedInstalledPathType`, and the narrowed-manifest recording of
   retained/removed command paths + hashes in the uninstall pass.

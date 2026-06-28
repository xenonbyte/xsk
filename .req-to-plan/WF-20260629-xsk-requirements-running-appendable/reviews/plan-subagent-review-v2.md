# PLAN Subagent Review v2

stage: plan
verdict: approve-with-nits

## Summary
Both v1 HIGH defects are genuinely closed. REQ-004 now lands atomically in one self-verifying task
(T9 carries all five lib changes plus the round-trip test files it must keep green), and the
hermetic `platformCommandsRoots` override is specified and threaded through
`install()`/`uninstall()`/`computeStatus`. SPEC coverage is still complete, ordering still honors
SCOPE-IN-007, and renumbering is contiguous 1-13. Two low residuals remain: the intro paragraph
(`07-plan.md:11-13`) was not updated to the new 13-task numbering, and T10's self-conformance
command-file assertion has an unpinned hermeticity route (the existing self-conformance install goes
through `main()`, which does not forward `platformCommandsRoots`). Neither blocks approval.

## Resolution of v1 findings
1. REQ-004 atomically green — RESOLVED. The three old tasks are merged into two. New T9 Files
   (`07-plan.md:196-203`) include `lib/adapters/opencode.js`, `lib/install.js`, `lib/manifest.js`,
   `lib/uninstall.js`, `lib/status.js` AND `test/install.test.js`, `test/uninstall.test.js`,
   `test/status.test.js` — so T9 owns the tests it must keep green and is self-verifying
   (Verification `:235` runs exactly those suites + `manifest.test.js`). The skeleton states it
   explicitly: "All REQ-004 lib changes land in ONE task so the suite is green after it (the existing
   opencode round-trip test breaks if installed_paths records command paths while validate/uninstall/
   status are still skillsRoot-only)" (`:206-208`). No task records command paths while
   validate/uninstall/status are skillsRoot-only — T9 changes all of them together; T10 adds only
   tests + README (`:241-244`), no lib change. The round-trip break I cited (`install.test.js:1028-1044`)
   is now fixed inside T9.
2. Hermetic commandsRoot override — RESOLVED (lib + direct-call tests). T9 adds `commandsRootFor(platform,
   platformCommandsRoots)` mirroring `rootFor`, threads `platformCommandsRoots` through
   `install()`/`uninstall()`/`computeStatus` (`:210-211,219,223`), and routes the round-trip tests
   through `platformCommandsRoots = {opencode: <tmp>/cmds}` so "NOTHING writes to the real
   ~/.config/opencode/commands/" (`:224-227`), asserted by the Verification (`:235`). Confirmed the
   round-trip tests (`install.test.js`) and safety tests call `install()`/`uninstall()` directly
   (`safety.test.js:13-14,29,38`), so passing the override is straightforward and hermetic.
3. LOW nits — RESOLVED. T3 (`:87`) and T13 (`:314`) now use `grep -rnP "(?<!\.xsk/)requirements/"`,
   a correct negative-lookbehind that flags only bare `requirements/` and never matches
   `.xsk/requirements/`. T12 (`:283-301`) reframes the live install as "REQ-004 Checkpoint C-1: a
   pre-publish verification, kept distinct from the deferred publish (SCOPE-OUT-005)" and adds a
   hermetic automated check (`:295-297`).

## SPEC coverage & ordering
- Coverage complete: SPEC-WRITEREQ-001 -> T4; SPEC-STORES-001 -> T1/T2/T3; SPEC-POINTS-001 ->
  T5/T6/T7/T8; SPEC-OPENCODE-001 -> T9 (lib+round-trip), T10 (safety/self-conformance/README), T12
  (Checkpoint C-1); SPEC-STANDARD-001 -> T11. Trace table (`:320-332`) maps all 13. Nothing dropped.
- Ordering still correct by task sequence: REQ-002 (T1-3) -> REQ-001 (T4) -> REQ-003 (T5-8) ->
  REQ-004 (T9-10) -> REQ-005+006 once (T11, only task touching `skill-scaffold.behavior.md`) ->
  Checkpoint C-1 (T12) -> whole-batch gate (T13). skill-scaffold lands after REQ-004 (RISK-SELFCONF-001).
- Renumbering is contiguous PLAN-TASK-001..013 with no gaps.

## Task correctness vs code
- T9 lib claims re-checked, all accurate: `commandsRoot` mirrors `skillsRoot`'s
  `opts.home || os.homedir()` (`opencode.js:8-12`); `commandsRootFor` mirrors `rootFor`
  (`install.js:24-30`); `validateOperationalSemantics` optional `commandsRoot` with
  `isInsideDir(p,skillsRoot) || (commandsRoot && isInsideDir(p,commandsRoot))` matches `manifest.js:83-93`;
  uninstall pass filtered before `classifyPaths`/`ownedDirs`/`validateBackupTargets`
  (`uninstall.js:43-54,277-282,85-104`); narrowed-manifest `retainedInstalledHashes` generalization
  (`uninstall.js:74-79`, `:496-505`); snapshot prior-loop filter (`install.js:270,285`). No new
  inaccuracy in the merged lib task.
- T2/T7 regeneration still faithful to `golden.test.js:15-18,40-47,64-79` (unchanged from v1).

## Executability & ambiguity
- T9 is now self-verifying and its Verification is satisfiable (it owns the round-trip test files).
- LOW-MED (R2) — T10 self-conformance hermeticity is unpinned. The existing self-conformance install
  runs through `main()` (`self-conformance.test.js:74`, importing `main` at `:16`), and
  `bin/xsk.js:103-106` builds `dispatchOptions = { platformRoots, xskRoot }` only — it does NOT forward
  `platformCommandsRoots`, and `bin/xsk.js` is in no task's Files. So if T10 lands the opencode
  command-file assertion by extending the main()-based install to `--platform opencode`, the command
  files resolve to the REAL `~/.config/opencode/commands/` (non-hermetic). T10 must instead call
  `install()` directly with `platformCommandsRoots` (as `install.test.js`/`safety.test.js` do), which
  is in scope (`self-conformance.test.js` is in T10's Files). Recommend stating this explicitly. Note
  not forwarding the override through `main()` is correct for production (real users want the real
  commands dir), so the fix is test-side only.
- LOW (R1) — stale intro paragraph. `07-plan.md:11-13` still reads "REQ-004 (T9-T11) ... pass (T12),
  with two final acceptance gates (T13-T14)", which describes the OLD 14-task numbering. Post-merge it
  is REQ-004 (T9-T10), skill-scaffold (T11), Checkpoint C-1 (T12), one final gate (T13). The tasks and
  trace table are correct; only this header sentence is stale.
- LOW (trivial) — `grep -P` (PCRE lookbehind in T3/T13) is unavailable in macOS BSD grep; the executor
  needs GNU grep/`ggrep`. This matches the pre-existing `grep -lP "\x{2014}"` usage (T5 `:134`, T13
  `:314`), so it is a consistent environment assumption, not a regression.

## Recommended changes
Optional, none gate-blocking:
1. R2: state in T10 that the opencode self-conformance command-file assertion uses a direct
   `install()` call with `platformCommandsRoots` (not the main()-based path), or add `bin/xsk.js` to
   scope if main() must thread the override.
2. R1: update the intro paragraph (`07-plan.md:11-13`) to the 13-task numbering (REQ-004 T9-T10,
   skill-scaffold T11, Checkpoint C-1 T12, single gate T13).

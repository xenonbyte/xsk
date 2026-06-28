# PLAN Subagent Review v1

stage: plan
verdict: changes-requested

## Summary
SPEC coverage, task ordering, Change Types, and the regeneration tasks (T2, T7) are all correct and
faithful to how `golden.test.js` verifies sync. Two concrete executability defects in the REQ-004
slice block approval: (A) PLAN-TASK-009 changes opencode install to record command paths in
`installed_paths`, which makes existing `test/install.test.js` assertions fail (status flips to
`invalid`, round-trip uninstall exits non-zero) because the matching `validateOperationalSemantics`
/ uninstall / status generalization is deferred to PLAN-TASK-010 — so T9's own stated verification
`node --test test/install.test.js` cannot pass, and T9 cannot fix it (it does not own the test
file). (B) Neither T9 nor T10 (nor the SPEC) specifies how `commandsRoot` is redirected to a temp
tree in tests; the harness overrides `skillsRoot` via `platformRoots` (absolute path map), which has
no `commandsRoot` equivalent, so opencode install tests would write `xsk-*.md` into the developer's
real `~/.config/opencode/commands/`. Both must be resolved before the PLAN is executable.

## SPEC coverage & ordering
- Coverage complete: SPEC-WRITEREQ-001 -> T4; SPEC-STORES-001 -> T1/T2/T3; SPEC-POINTS-001 ->
  T5/T6/T7/T8; SPEC-OPENCODE-001 -> T9/T10/T11/T13; SPEC-STANDARD-001 -> T12. Nothing dropped.
- Order honors SCOPE-IN-007 by task number: REQ-002 (T1-3) -> REQ-001 (T4) -> REQ-003 (T5-8) ->
  REQ-004 (T9-11) -> REQ-005+006 (T12) -> gates (T13-14).
- write-req regenerated after BOTH edits: T1 edits the path refs in `write-req.behavior.md`, T2
  regenerates (keeps the suite green after T1), then T4 applies the R-1.1/R-1.2 step5/8 swaps and
  regenerates again (`07-plan.md:104-106`). The final write-req artifact (after T4) reflects path +
  decision/loop edits — correct, and T2's interim regen is necessary (otherwise `golden.test.js`
  fails between T1 and T4). Confirmed against `golden.test.js:64-79`.
- skill-scaffold regenerated exactly once: only T12 touches `skill-scaffold.behavior.md`,
  `skills/skill-scaffold/SKILL.md`, and its golden (`07-plan.md:269-290`). No other task touches it.
  Lands after REQ-004 (T9-11), satisfying RISK-SELFCONF-001.
- Minor (low): T6 registers the two new skills before T7 generates their packed/golden artifacts, so
  the full `golden.test.js` is momentarily red between T6 and T7 — but T6's Verification is the
  narrow `get('xsk-point')` check (`07-plan.md:150`), not a full-suite run, so an executor that gates
  per-task does not trip. Acceptable as sequenced.

## Task correctness vs code
- Change Types correct against the tree: `skills/` dirs are named by `fragmentBase`
  (`skills/write-req`, `skills/archive-req`, ...), goldens by skill name (`test/fixtures/golden/xsk-*.md`).
  So T5 (new `point.*`/`consume-point.*` fragments) and T7 (`skills/point/SKILL.md`,
  `skills/consume-point/SKILL.md`, `xsk-point.md`, `xsk-consume-point.md`) are correctly `create`;
  T1/T2/T3/T4/T6/T8/T9/T10/T11/T12 are correctly `modify` (all targets exist).
- T2/T7 faithful to `golden.test.js`: write `skills/${fragmentBase}/SKILL.md = buildSkill(s).content`
  matches the byte-match check at `golden.test.js:64-79`; golden = `buildSkill` content with trimmed
  `shared/skill-common.md` replaced by `<SHARED_MASKED>`, file named `${name}.md`, matches
  `golden.test.js:15-18,40-47`. T2 skeleton (`07-plan.md:58-62`) and T7 skeleton (`:162-166`) both
  use `s.fragmentBase` for the dir and `${name}.md` for the golden — correct.
- HIGH — T9/T10 are not independently green; T9's Verification is unsatisfiable. T9
  (`07-plan.md:192-219`) records command files in `installed_paths`/`installed_hashes`, but the
  `validateOperationalSemantics` generalization, uninstall command pass, and status `file`
  classification are in T10 (`:221-241`). With command paths recorded but `validateOperationalSemantics`
  still skillsRoot-only (`lib/status.js:107`, `lib/uninstall.js:229` both pass only `skillsRoot`),
  the existing round-trip test `test/install.test.js:1028-1036` (`status.platforms.opencode.state ===
  'ok'`) flips to `invalid` ("installed path escapes platform root"), and `:1039-1044`
  (`summary.exitCode === 0`) fails because uninstall returns invalid. T9's files are only
  `lib/adapters/opencode.js` + `lib/install.js`, so T9 cannot repair the test. Its stated
  Verification "`node --test test/install.test.js` passes" (`:219`) is therefore not achievable.
- HIGH — `commandsRoot` test-override mechanism is unspecified, breaking hermeticity. The install
  integration tests override `skillsRoot` via `platformRoots` (an absolute path map, e.g.
  `opencode: <tmp>/opencode-skills`, `install.test.js:960-969,985-994,1017-1028`), resolved by
  `rootFor(platform, platformRoots)` (`lib/install.js:24-30`). There is NO `commandsRoot` entry in
  that map and no `home` threaded through `install()`. If T9 resolves `commandsRoot` via
  `adapter.commandsRoot()` it returns the real `os.homedir()/.config/opencode/commands`, so the
  opencode install tests (and T13's manual step) write `xsk-*.md` into the developer's real opencode
  config — non-hermetic and polluting. The SPEC's "mirroring skillsRoot's options.home override"
  (`07-plan.md:397`) does not apply, because in `install()` skillsRoot is overridden by `platformRoots`,
  not by `options.home`. The PLAN must define a `commandsRoot` override (a parallel
  `platformCommandsRoots` map, or a shared per-test home) and route T9/T10/T11 tests through it.
- REQ-004 skeleton wiring otherwise matches the code: `commandsRoot` mirrors `skillsRoot`'s
  `opts.home || os.homedir()` shape (`opencode.js:8-12`); `validateOperationalSemantics` optional
  `commandsRoot` and both call sites (`uninstall.js:229`, `status.js:107`) are named; previousInstallState
  third class + `wasInstalled`/prior-hash at `install.js:365-366` gate `:118`; snapshot filter
  `install.js:270,285`; uninstall separation cites `uninstall.js:43-54,277-282,85-104`; narrowed-manifest
  `retainedInstalledHashes` `uninstall.js:74-79` reconstruction `:496-505` — all correct.

## Executability & ambiguity
- Most Verifications are objective and runnable (grep clean-checks T1/T3/T14; `node --test <suite>`;
  `grep -c` count checks T4/T12; `get()` exit-code check T6).
- The two HIGH items above are the executability blockers: T9 verification fails as written, and the
  `commandsRoot` redirection is undefined.
- LOW — TDD discipline is split: T9/T10/T11 are marked `TDD Applicable: yes`, but the behavior lands
  in T9/T10 while the bulk of the opencode test assertions are in T11 (code-first, tests-last), which
  is the inverse of test-first and is what surfaces the T9 red window.
- LOW — grep robustness: T3 (`07-plan.md:87`) and T14 (`:318`) use `grep -rnE "[^.x]?requirements/"
  ... | grep -v "\.xsk/"`. A line carrying BOTH `.xsk/requirements/` and a stray bare `requirements/`
  is wholly dropped by `grep -v "\.xsk/"` (false negative), and a bare `requirements/` at column 0
  has no preceding char for `[^.]`/`[^.x]` to match. T1's grep (`:43`) is the cleaner pattern. Tighten
  the clean-check or rely on it only as a backstop to the explicit inventory.
- LOW — T13 runs a real `xsk install --platform opencode` against the live config (`:303-305`), which
  mildly tensions the "no re-install/publish" non-goal (`07-plan.md:504`); it is REQ-004's own
  Checkpoint C-1 (a verification install, not a publish), so acceptable, but call it out so it is not
  mistaken for the deferred publish.

## Recommended changes
1. Make REQ-004 atomically green: land the `validateOperationalSemantics` / uninstall / status
   generalization (currently T10) together with the install-side record change (T9) — merge T9+T10
   into one task, or reorder so validate/status/uninstall tolerate command paths BEFORE T9 records
   them — and add `test/install.test.js` to the editable set so the existing round-trip
   (`:1028-1044`) is updated in lockstep. T9's Verification must not claim a full `install.test.js`
   pass while T10 is pending.
2. Specify the `commandsRoot` test-override: add a `platformCommandsRoots` (or equivalent) so
   `install()` / `uninstall()` / `computeStatus` resolve `commandsRoot` to the temp tree, and route
   all T9/T10/T11 opencode tests through it. No test may write to the real
   `~/.config/opencode/commands/`.
3. Tighten the T3/T14 grep clean-checks (or treat them as a backstop to the explicit per-file
   inventory in T1/T3).
4. Optionally re-mark the REQ-004 test ordering as test-first, or move T11's install/status/uninstall
   assertions into T9/T10 so each behavior task is verified by its own tests.

# Design Subagent Review (v5)

## Verdict
APPROVE-WITH-NITS - all four v4 CHANGES-REQUESTED findings (TC-1..TC-4) and all three nits are resolved and verified against the real code; spec coverage, risk closure, and DECISION-001 remain complete and consistent. One cosmetic nit only (function-name attribution for the reset call site), which does not block the SPEC.

## Spec compliance
Coverage is unchanged from v4 and still complete. Every requirement and AC maps to a non-empty design element.

| Requirement | Covered? | Note |
|---|---|---|
| R-A1 | Yes | DES-A-002; cycle now resolved via lazy require (TC-2). |
| R-A2 / AC-002 | Yes | DES-A-003; reachability honestly reconciled as a unit-boundary assertion (TC-3). |
| R-A3 | Yes | DES-A-004; doctor now forwards platformRoots (TC-1). |
| R-A4 | Yes | DES-ARCH-001; `validateOperationalSemantics({ platform, skillsRoot, manifest })`. |
| R-B1 / AC-003 | Yes | DES-B-005. |
| R-C1 / AC-004 | Yes | DES-C-006; existing input.test.js assertion update now called out (TC-4). |
| R-D1..R-D4 / AC-005 | Yes | DES-D-008. |
| R-E1..R-E3 / AC-006 | Yes | DES-E-007 + DECISION-001 (stop-and-ask). |
| R-F1 / AC-007 | Yes | DES-F-009. |
| R-H1 / AC-008 | Yes | DES-H-010 (verification gate deferred to Phase 3 owner). |
| R-I1 / AC-009 | Yes | DES-I-011. |
| AC-010 | Yes | `npm pack --dry-run` + `npm run syntaxcheck` now enumerated in Observability (nit N-2 fixed). |
| SCOPE-IN-001..008 | Yes | Requirements Coverage table maps all eight. |

## Technical correctness findings

Prior findings re-audited against the unchanged source:

1. **TC-1 (doctor must forward platformRoots) - RESOLVED.** DES-A-004 (design lines 170-174) now states: "Required call-site fix: `doctor()` must forward `opts.platformRoots` into its `computeStatus(...)` call (lib/capability.js:74 currently passes only `{ platforms, xskRoot }`)...". SPEC Handoff Call-site contract item (c) (design line 314) repeats it. Verified against code: lib/capability.js:74 is `const status = computeStatus({ platforms, xskRoot });` - `opts.platformRoots` is indeed dropped today, while doctor already uses it for the writable checks (lib/capability.js:56). Forwarding it is the correct and sufficient fix; status's own bin path already receives platformRoots (bin/xsk.js:139). CONFIRMED sufficient.

2. **TC-2 (install/uninstall require cycle) - RESOLVED.** DES-A-002 (design lines 127-142) now pins a function-scope lazy `require('./install').rootFor` inside `uninstall()`, with the alternative (relocating `rootFor`) explicitly considered and rejected. Verified against code:
   - Cycle asymmetry holds: lib/install.js:11 `require('./uninstall')`; lib/uninstall.js does not require `./install`. A top-level destructure in uninstall.js would capture `undefined` (install exports `rootFor` at lib/install.js:450, after it requires uninstall). A function-scope `require('./install').rootFor` defers resolution to call time, by which point install.js has fully loaded - the standard Node cycle-break. CONFIRMED correct.
   - install.js:424 reset site genuinely has `skillsRoot` in scope: verified that both lib/install.js:404 (`const skillsRoot = rootFor(platform, opts.platformRoots);`) and the reset call at lib/install.js:424 (`uninstallPlatform({ platform, xskRoot })`) live inside the same top-level `install(options)` function (defined at lib/install.js:393), within the same `for (const platform ...)` body. So the reset can pass the already-resolved `skillsRoot` directly, no lazy require needed there. CONFIRMED.
   - The design also notes status.js imports `rootFor` normally because it already requires `./install` and is not in the cycle (verified lib/status.js:8). CONFIRMED.

3. **TC-3 (backup-target reachability / AC-002) - RESOLVED (honest reconciliation).** DES-A-003 (design lines 153-161) adds a reachability note: because `safeBackupForSkill` matches only when `b.target === skillFile`, and `skillFile` derives from an `installed_paths` entry that DES-A-002 rejects wholesale when out-of-root, the target-containment branch is exercised and asserted at the `safeBackupForSkill` unit boundary ("a backup whose `target` escapes `skillsRoot` returns `unsafe: true` and writes nothing"), and "the SPEC pins this as a unit test, not an integration scenario." Verified against code: lib/ownership.js:51 matches by `b.target === skillFile`; the loop's existing unsafe branch (lib/uninstall.js:140-167) retains the skill dir/file and sets `partial = true`, which is the `partial/retained` outcome R-A2/AC-002 name. This is an honest reconciliation of AC-002's "refused and writes nothing outside the root" - the design no longer claims an unreachable integration path. CONFIRMED honest. Residual (informational, not blocking): the SPEC's unit assertion should cover both halves it relies on - `safeBackupForSkill` returning `unsafe: true` on an out-of-root target (new) and the loop's unsafe -> retain/partial handling (existing) - so AC-002's full "partial/retained" clause is demonstrably met.

4. **TC-4 (input.test.js:97-101 existing assertion) - RESOLVED.** DES-C-006 (design lines 191-194) now states the existing assertion is "updated (not merely augmented) alongside the new negative cases," and SPEC Handoff "Existing-test updates required" (design lines 317-320) lists the input.test.js `--json` rejection-message assertion (lines ~97-101) plus the skill-behavior.test.js bypass (~64-73) and Approved-Design-Summary (~60) assertions. Verified against code: test/input.test.js:97-101 asserts `/--json.*status.*doctor/` for `['install','uninstall','version','help']`; that message originates from the shared gate at lib/input.js:84, so version/help up-front rejection will change it. CONFIRMED addressed.

Nits re-audit:
- **N-1 (out-of-root status wording) - RESOLVED.** Current Code Evidence (design lines 42-46) now reads: "an out-of-root recorded path that exists on disk currently reports `ok`, and a missing/unsafe one reports `drift`; neither is `invalid`." Matches the code: lib/status.js:105 `safe` uses `isSafePath` (symlink/non-dir only), not containment. CONFIRMED accurate.
- **N-2 (npm pack --dry-run for AC-010) - RESOLVED.** Observability (design line 297) now lists "`npm run syntaxcheck` and `npm pack --dry-run` (AC-010)." CONFIRMED.
- **N-3 (unused xskRoot param) - RESOLVED.** DES-ARCH-001 (design line 115) drops it: `validateOperationalSemantics({ platform, skillsRoot, manifest })`, with the rationale (design lines 118-120) that backup-dir/backup-file containment stays in `safeBackupForSkill`. CONFIRMED.

New issues introduced by the v5 edits: none of substance.

- **N-4 (new, cosmetic) - function-name attribution.** Current Code Evidence (design line 30) and DES-A-002 (design line 137) call the line-424 reset "installPlatform's uninstall-first reset" / "the uninstall-first reset call site in installPlatform (lib/install.js:424)". The reset at lib/install.js:424 actually lives in the top-level `install()` function (lib/install.js:393), not `installPlatform()` (lib/install.js:271, which receives `skillsRoot` as a parameter). The line number (424), the scope claim (`skillsRoot` resolved at 404, in scope at 424), and the required edit are all correct; only the enclosing-function name is loose. Cosmetic; the SPEC can simply attribute it to `install()`.

## Unresolved ambiguity
None. The lazy-require mechanism is decided (alternative explicitly rejected, not hedged). The DES-A-003 reachability note is a decision (unit test, not integration), not an open question. DECISION-001 remains resolved: `Status: selected`, `Selected: A (stop and ask). Selected by the user on 2026-06-26.` (design lines 262, 269), applied consistently in DES-E-007 step (3) (design lines 202-203) and the SPEC Handoff archive-collision assertion (design lines 323-324). No new contradiction was introduced by the edits.

## Risk closure
Unchanged from v4 and still complete; all 11 carried risks have a defensible verdict (design lines 329-339).

| RISK id | Closure | Verdict |
|---|---|---|
| RISK-SEC-001 | ADDRESSED (DES-A-002) | OK. |
| RISK-SEC-002 | ADDRESSED (DES-ARCH-001) | OK - single shared resolution; cycle now handled (TC-2). |
| RISK-SEC-003 | ADDRESSED (DES-A-003) | OK - unit-boundary defense-in-depth, honestly scoped. |
| RISK-SEC-004 | ADDRESSED (DES-D-008) | OK. |
| RISK-SEC-005 | ADDRESSED (DES-E-007) | OK. |
| RISK-COR-001 | ADDRESSED (DES-C-006) | OK - existing-test message update now included. |
| RISK-COR-002 | ADDRESSED (DES-A-004) | OK - invalid before drift; doctor inherits via forwarded platformRoots. |
| RISK-PROC-001 | ADDRESSED (DES-PROC-012) | OK. |
| RISK-PROC-002 | ADDRESSED (DES-PROC-012) | OK. |
| RISK-PROC-003 | ADDRESSED (DES-PROC-012) | OK. |
| RISK-PROC-004 | DEFERRED (DES-H-010 Phase 3 gate) | OK - named owner, explicit gate. |

## Recommended changes (if any)
Optional, non-blocking:

1. (N-4, cosmetic) Re-attribute the line-424 reset from `installPlatform` to `install()` in Current Code Evidence and DES-A-002 wording. Line numbers and the scope claim are correct as-is.
2. (TC-3 residual, informational) Ensure the SPEC's `safeBackupForSkill` unit test asserts both the new `unsafe: true` on an out-of-root target and the loop's existing unsafe -> retain/partial handling, so AC-002's "partial/retained" clause is fully demonstrated.

Neither blocks proceeding to SPEC.

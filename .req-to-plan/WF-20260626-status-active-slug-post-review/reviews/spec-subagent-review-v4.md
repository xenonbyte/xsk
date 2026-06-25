# Spec Subagent Review (v4)

## Verdict
APPROVE-WITH-NITS - every approved design fix is carried into the contracts faithfully, all R-* and AC-* map to a contract plus a test-matrix row, and the API/data contracts are accurate against the real code. Four low-severity nits (one call-site enumeration, one ordering-presentation clarity, one label imprecision, one undecided test-file location); none blocks PLAN.

## Design-SPEC fidelity

Each SPEC-BEHAVIOR-001..012 faithfully translates its DES-* element into concrete, testable assertions. No contract drifts from, weakens, or contradicts the approved v5 design. Spot-checks of the specifically-flagged fixes:

- **SPEC-BEHAVIOR-002 (06-spec.md:21-32) - lazy require + install.js:424 threading: FAITHFUL.** Pins the function-scope `require('./install').rootFor(platform, opts.platformRoots)` inside `uninstall()` and `uninstallPlatform({ platform, xskRoot, skillsRoot })` with `skillsRoot` required; shape `validate()` then `validateOperationalSemantics` before the per-skill loop; out-of-root returns the existing invalid shape (`invalid:true`, empty removed/restored/skipped, `error`, `exitCode === FAILURE_EXIT`, manifest unchanged on disk). It also correctly attributes the reset to "the top-level `install()` function (lib/install.js:424)", which fixes the design's cosmetic "installPlatform" mislabel (v5 nit N-4). Verified against code: both callers exist (lib/install.js:424, lib/uninstall.js:307); `skillsRoot` is in scope at install.js:404 in the same `install()` loop; FAILURE_EXIT=1 and the invalid early-returns (lib/uninstall.js:98-111) match.
- **SPEC-BEHAVIOR-003 (06-spec.md:34-42) - backup-target as a unit-boundary check: FAITHFUL.** `safeBackupForSkill` gains `skillsRoot`, returns `unsafe:true` on `!isInsideDir(target, skillsRoot)`, drives the existing retain/partial path, writes nothing outside root; explicitly "asserted at the `safeBackupForSkill` unit boundary" with the rationale that SPEC-BEHAVIOR-002 rejects out-of-root installed paths wholesale first. Matches the v5 reachability note exactly.
- **SPEC-BEHAVIOR-004 (06-spec.md:44-52) - doctor forwards platformRoots: FAITHFUL.** `computeStatus` resolves `skillsRoot` per platform from `opts.platformRoots`; out-of-root -> `state:'invalid'` with `reason` before the drift check (in-root drift stays `drift`, healthy stays `ok`); "`doctor()` forwards `opts.platformRoots` into its `computeStatus(...)` call (fixing lib/capability.js:74, which currently passes only `{ platforms, xskRoot }`)". Verified capability.js:74 is exactly that today.
- **SPEC-BEHAVIOR-007 (06-spec.md:71-79) - collision = stop-and-ask (DECISION-001): FAITHFUL.** Step (3) "stop and ask the user, writing nothing (DECISION-001 stop-and-ask; no silent overwrite, R-E1)". Consistent with PLAN Handoff (06-spec.md:205-206) and the resolved DECISION-001. (See nit N-2 on step ordering presentation.)
- **SPEC-BEHAVIOR-006 (06-spec.md:60-69) - preserved vs newly-rejected forms: FAITHFUL.** Preserved set (`xsk`, `-v`, `--version`, `version`, `-h`, `help`, `status --json`, `doctor --json`, `install --platform claude,codex`, `uninstall --platform=claude`) and rejected set (`version --platform claude`, `version --json`, `help --json`, `help --platform x`, `install --json`) match DES-C-006 and R-C1. (See nit N-3 on the `version --json` label.)
- **SPEC-BEHAVIOR-008 (06-spec.md:81-95) - settings.local.json only: FAITHFUL.** Targets `.claude/settings.local.json`, never writes `.claude/settings.json`; create/merge/idempotent (R-D1), non-Claude refusal (R-D2), malformed/non-object refusal (R-D3), reports only path + `defaultMode` (R-D4); registry (lib/skills.js:16), docs 4.2, D-row, both READMEs, golden, skill-behavior test all listed; zero stale `settings.json` references (C2).

## Requirement + AC coverage

Complete. Every requirement and AC maps to a contract and a test-matrix row.

| Req | Contract | AC | Test-matrix row |
|---|---|---|---|
| R-A1 | SPEC-BEHAVIOR-002 | AC-001 | uninstall refuses out-of-root (test/uninstall.test.js) |
| R-A2 | SPEC-BEHAVIOR-003 | AC-002 | safeBackupForSkill unit (uninstall/safety) |
| R-A3 | SPEC-BEHAVIOR-004 | AC-001 | status invalid + doctor invalid rows |
| R-A4 | SPEC-BEHAVIOR-001 | - | (helper exercised by 002/004 tests) |
| R-B1 | SPEC-BEHAVIOR-005 | AC-003 | 3 doctor rows (unwritable, symlink, --json entry) |
| R-C1 | SPEC-BEHAVIOR-006 | AC-004 | input.test.js + cli.test.js rows |
| R-D1..R-D4 | SPEC-BEHAVIOR-008 | AC-005 | bypass skill-behavior row |
| R-E1..R-E3 | SPEC-BEHAVIOR-007 | AC-006 | archive skill-behavior row |
| R-F1 | SPEC-BEHAVIOR-009 | AC-007 | write-req+archive-req row |
| R-H1 | SPEC-BEHAVIOR-010 | AC-008 | readme-pinning row |
| R-I1 | SPEC-BEHAVIOR-011 | AC-009 | think skill-behavior row |
| (AC-010) | SPEC-BEHAVIOR-012 | AC-010 | golden + self-conformance + CI commands |

No requirement or AC is unmapped.

## Test matrix soundness

- All named test files exist and are plausible homes: test/uninstall.test.js, test/status.test.js, test/safety.test.js, test/input.test.js, test/cli.test.js, test/skill-behavior.test.js, test/readme-pinning.test.js, test/golden.test.js, test/self-conformance.test.js are present. `test/capability.test.js` is correctly flagged "new" (no doctor-dedicated test exists today; doctor is currently exercised via status.test.js/cli.test.js).
- The three required existing-test UPDATEs are explicitly called out, not just additions: input.test.js `--json` message (06-spec.md:170 "+ update lines ~97-101"), skill-behavior bypass-target (06-spec.md:172 "rewrite lines ~64-73"), think wording (06-spec.md:175 "update line ~60"). Reinforced in PLAN Handoff (06-spec.md:202-204) and the design's Existing-test list.
- AC-003 is well covered (separate rows for unwritable, symlinked, and `--json` inclusion). AC-004 is covered at both the `parse()` unit layer and the CLI exit-code layer.
- Each AC has at least one concrete row; the behavior contracts supply the assertion detail the terse rows abbreviate (e.g. the uninstall row's "manifest retained / out-of-root file untouched" lives in SPEC-BEHAVIOR-002).

Residual (informational, carried and accepted at design): AC-002's "skill dir goes partial/retained" clause is proven via the `safeBackupForSkill` unit boundary (`unsafe:true`, no write) plus the pre-existing unsafe->retain/partial loop branch (already tested for the backup-file-unsafe trigger). A target-escape integration path is unreachable by construction (SPEC-BEHAVIOR-003 rationale), so the unit test is the honest maximum; no new gap.

## API / Data contracts

Verified against the real code; all accurate and internally consistent:

- `validateOperationalSemantics({ platform, skillsRoot, manifest }) -> { valid, reason?, offending? }` (06-spec.md:127-129): consistent with SPEC-BEHAVIOR-001's "boolean + reason naming first offending path"; `xskRoot` correctly dropped.
- `uninstallPlatform({ platform, xskRoot, skillsRoot })` required (06-spec.md:130-132): CONFIRMED exactly two callers - lib/install.js:424 and lib/uninstall.js:307 - both named.
- `safeBackupForSkill(backups, skillFile, xskRoot, platform, skillsRoot)`, return shape unchanged (06-spec.md:133-134): CONFIRMED current signature is the 4-arg form (lib/ownership.js:50) and there is exactly ONE call site (lib/uninstall.js:136); appending `skillsRoot` positionally is sound. (See nit N-1.)
- doctor check entry `{ name, label, pass, detail }` (06-spec.md:135-137): matches the existing check shape in lib/capability.js; `doctor()` passing `platformRoots` into `computeStatus` is the correct fix.
- `computeStatus`/`statusOf` invalid `{ state:'invalid', reason }` (06-spec.md:138-139): matches the existing invalid shape (lib/status.js:92-95).
- `parse()` allow-list map (06-spec.md:140-142): matches SPEC-BEHAVIOR-006 and R-C1.
- settings.local.json payload `{"permissions":{"defaultMode":"bypassPermissions"}}` 2-space indent + trailing newline (06-spec.md:143-145): matches R-D1 and the current bypass payload.
- `D10` row (06-spec.md:146-147): CONFIRMED next free number - docs section 13 currently holds D1..D9, D7 about Claude-only targeting stays unchanged.

## Unresolved ambiguity

No contract leaves a behavioral decision open. Two minor clarity/enumeration points (below). DECISION-001 is consistently resolved (stop-and-ask) across SPEC-BEHAVIOR-007 and the PLAN Handoff.

## Recommended changes (nits only; none blocking)

1. **N-1 (low) - enumerate the `safeBackupForSkill` call-site update.** The Call-site contract (06-spec.md:196-199) lists uninstallPlatform/uninstall lazy-require/doctor/computeStatus but omits that lib/uninstall.js:136 must now pass `skillsRoot` into `safeBackupForSkill`. There is only one caller, and `skillsRoot` is in scope there, but if the new 5th arg is added to the signature without threading the call site, the check runs `isInsideDir(target, undefined)` (resolves to cwd) and false-positively refuses legitimate backups. Add it to the call-site contract.
2. **N-2 (low) - make SPEC-BEHAVIOR-007 collision-before-write explicit.** The numbered body steps present write-then-remove (2) before the collision guard (3); a literal "specifies, in order" reading would write before checking, defeating R-E1. The "writing nothing" phrase signals intent, but the SPEC should state the existing-target check executes before the write.
3. **N-3 (very low) - relabel `xsk version --json` in SPEC-BEHAVIOR-006.** It is listed under "Newly rejected" but it was already rejected (via the `--json` gate). Cosmetic; it stays rejected either way.
4. **N-4 (low) - pin the two "X or Y" test-file locations.** The backup-target row (test/uninstall.test.js or test/safety.test.js) and the doctor rows (test/status.test.js or new test/capability.test.js) leave the file undecided. Both alternatives exist (capability.test.js would be new); the PLAN should pin one each.

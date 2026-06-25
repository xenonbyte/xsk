# Design Subagent Review (v4)

## Verdict
CHANGES-REQUESTED - spec coverage, risk closure, and DECISION-001 are complete and consistent, but two mechanism claims are incomplete in a way that would produce a broken or test-isolation-violating implementation if the SPEC inherits them verbatim: (1) the `doctor` -> `computeStatus` call is not threaded with `platformRoots`, and (2) threading `rootFor` into `uninstall.js` creates an `install` <-> `uninstall` require cycle the design only cleared for `status.js`.

## Spec compliance

Every requirement and AC has a corresponding, non-empty design element. Coverage is complete.

| Requirement | Covered? | Note |
|---|---|---|
| R-A1 (uninstall resolves+threads skillsRoot, refuse out-of-root) | Yes | DES-A-002. Mechanism gap: require cycle (see TC-2). |
| R-A2 (backup restore target containment) | Yes (partial) | DES-A-003. Reachability/outcome gap vs AC-002 (see TC-3). |
| R-A3 (status/doctor invalid not drift) | Yes | DES-A-004. Doctor side incomplete (see TC-1). |
| R-A4 (optional `validateOperationalSemantics` factoring) | Yes | DES-ARCH-001, placed in manifest.js beside `validate`/`isInsideDir`. |
| R-B1 (`doctor` writable-xsk-root) | Yes | DES-B-005; check added to `checks[]`, ANDs into `allPass`. |
| R-C1 (per-command option allow-lists) | Yes | DES-C-006. One existing test-assertion impact missed (see TC-4). |
| R-D1 (target settings.local.json only) | Yes | DES-D-008. |
| R-D2 (non-Claude refusal) | Yes | DES-D-008. |
| R-D3 (malformed-JSON refusal) | Yes | DES-D-008. |
| R-D4 (report path + defaultMode only) | Yes | DES-D-008. |
| R-E1 (collision no-overwrite) | Yes | DES-E-007 + DECISION-001 (stop-and-ask). |
| R-E2 (write-then-confirm-then-remove) | Yes | DES-E-007. |
| R-E3 (invalid-slug refusal, regex pinned) | Yes | DES-E-007. |
| R-F1 (single-active stop-and-report guard) | Yes | DES-F-009 (write-req + archive-req). |
| R-H1 (README disclosure, gated re-verify) | Yes | DES-H-010 (gate deferred to Phase 3 owner). |
| R-I1 (`xsk-think` heading) | Yes | DES-I-011. |
| SCOPE-IN-001..008 | Yes | Requirements Coverage table maps all eight. |
| AC-001..AC-009 | Yes | Mapped per element. AC-002 has a reachability caveat (TC-3). |
| AC-010 (full green: npm test, syntaxcheck, pack --dry-run, golden, self-conformance, readme-pinning) | Mostly | `npm pack --dry-run` is in the upstream verification list but is not enumerated in the design's Verification/Observability (nit N-2). |

## Technical correctness findings

All file:line and current-code claims in the design's "Current Code Evidence" were checked against the source and are accurate except where noted:

- CONFIRMED: `validate()` shape-only at lib/manifest.js:145; `isInsideDir` at lib/manifest.js:76.
- CONFIRMED: `uninstallPlatform({ platform, xskRoot })` at lib/uninstall.js:65 takes no `skillsRoot`; `uninstall()` at lib/uninstall.js:299 calls it (loop at :307) with only `{platform, xskRoot}`.
- CONFIRMED: install reset call site lib/install.js:424 `uninstallPlatform({ platform, xskRoot })` with `skillsRoot` already in scope (resolved at lib/install.js:404). Must be updated to pass `skillsRoot` - design states this.
- CONFIRMED: `safeBackupForSkill` (lib/ownership.js:50) checks the backup file is inside `~/.xsk/install/backups/<platform>/` (lines 54-61) but never checks `backup.target`.
- CONFIRMED: `doctor`'s `manifest-valid` check flips to FAIL on `computeStatus` `invalid` (lib/capability.js:82, manifestPass at :88).
- CONFIRMED: `parse()` accepts `--platform` for word-form `version`/`help` today (lib/input.js:58-82: word forms enter the generic loop; only `--json` is gated at :84), while dash forms reject extras (:43-47, :51-55). `version --json` is rejected today (input.test.js:97-101).
- CONFIRMED: bin/xsk.js threads `platformRoots`+`xskRoot` via `dispatchOptions` (defined :100-103) into uninstall (:128), computeStatus (:139), doctor (:146). Claim (c) holds at the bin boundary.
- CONFIRMED: bypass registry description still says `.claude/settings.json` (lib/skills.js:16); fragment `bypass-claude.behavior.md` targets `settings.json` and says "Never touch `.claude/settings.local.json`" (:17); docs 4.2 (:88-108) and 4.5 (:199-212) match the design's edit targets; section 13 D7 intact (:420).
- CONFIRMED: test assertions the design says will break exist: skill-behavior.test.js:60 asserts `/Approved Design Summary/`; :64-73 assert `.claude/settings.json` targeting (:67), name `settings.local.json` as excluded (:69), and `!/resulting JSON|full JSON/` (:72). golden.test.js:64-79 byte-matches `skills/<base>/SKILL.md` to `buildSkill`.

Numbered issues:

1. **TC-1 (ISSUE, high) - missed call site: `doctor` does not forward `platformRoots` to `computeStatus`.** DES-A-004 states "doctor inherits this through its existing manifest-valid coupling to computeStatus; no separate containment code in capability.js," and the design's Call-site contract names only `uninstallPlatform`'s new `skillsRoot`. But the internal call at **lib/capability.js:74** is `computeStatus({ platforms, xskRoot })` - it omits `opts.platformRoots`. Once `computeStatus` resolves `skillsRoot = rootFor(platform, opts.platformRoots)` for containment (DES-A-004), the doctor-side status will resolve `skillsRoot` from the default (os.homedir-based) platform roots, not the injected temp `platformRoots`. That (a) violates the mandated test-isolation contract ("no os.homedir() fallback") and (b) makes the AC-001 doctor branch resolve containment against the real `~/.claude/skills` instead of the test root. Required edit the design omits: lib/capability.js:74 -> `computeStatus({ platforms, xskRoot, platformRoots: opts.platformRoots })`.

2. **TC-2 (ISSUE, high) - unaddressed `install` <-> `uninstall` require cycle.** DES-A-002 says `uninstall()` "resolves `skillsRoot = rootFor(platform, opts.platformRoots)`." `rootFor` is exported from lib/install.js (:23, :450). The design verified cycle-safety only for the status side ("status.js already imports from ./install ... importing `rootFor` adds no new require cycle") and did not apply the same analysis to uninstall. Verified asymmetry: **lib/install.js:11 requires `./uninstall`, and lib/uninstall.js does NOT require `./install`.** Adding `require('./install')` to uninstall.js to obtain `rootFor` therefore creates an `install` <-> `uninstall` cycle. capability.js:7 and status.js can import `rootFor` at top level safely precisely because install does not import them back; uninstall is the one module where it does. A naive top-level `const { rootFor } = require('./install')` in uninstall.js (mirroring capability.js:7) would capture `undefined` (install.js exports `rootFor` at the bottom, after it requires uninstall), breaking at runtime. Resolution options the SPEC must pin: relocate `rootFor`/adapters to a cycle-safe leaf module, have the caller pass a resolved `skillsRoot` down, or use a lazy in-function require. The design's "no new require cycle" reasoning does not cover this case.

3. **TC-3 (ISSUE, medium) - DES-A-003 restore-target check is unreachable in the integrated flow, and AC-002's "partial/retained" outcome cannot be constructed.** `safeBackupForSkill` matches a backup only when `b.target === skillFile` (lib/ownership.js:51), and `skillFile` is derived from `installed_paths` (lib/uninstall.js:130-134 via `classifyPaths`). DES-A-002 rejects the whole manifest as `invalid` (before the per-skill loop) whenever any `installed_paths[]` entry is out-of-root. So a matched backup's `target` is always inside an in-root installed dir; the new `isInsideDir(target, skillsRoot)` check can only fail when `skillFile` (hence an installed path) is out-of-root, which DES-A-002 has already short-circuited to `invalid`. Consequences: (a) the DES-A-003 branch fires only as a direct unit test of `safeBackupForSkill`, not through a `uninstallPlatform` call; (b) AC-002 ("the skill dir goes partial/retained") is unreachable - an out-of-root target co-occurs only with an out-of-root installed path, which yields wholesale `invalid`, not per-skill partial/retained. The SPEC must either have `validateOperationalSemantics` also scan `backups[].target` (so an out-of-root backup target yields a clear `invalid`), or pin DES-A-003 as a unit-level defense and reconcile AC-002's "partial/retained" wording. The safety direction is sound; this is a test-construction/spec-precision gap, not a hole in the owned-only contract.

4. **TC-4 (ISSUE, low-medium) - missed existing-test impact in DES-C-006.** input.test.js:97-101 iterates `['install','uninstall','version','help']` with `--json` and asserts each throws `/--json.*status.*doctor/`. Today that message comes from the shared `--json`-gate at lib/input.js:84. Under per-command allow-lists, `version`/`help` reject every option up front, so `version --json` / `help --json` will throw a different message (e.g. "version accepts no options") that no longer matches that regex. The design frames input.test.js changes as "keeps all preserved forms and adds new negative cases" (MIT-006) and does not flag that this existing assertion must be updated for the version/help cases. SPEC should pin the new messages and adjust input.test.js:97-101.

Minor/nits:
- **N-1 (nit):** "Current Code Evidence" says an out-of-root recorded path "currently surfaces as drift." It surfaces as `drift` only if the out-of-root file is missing on disk; if it exists (as the AC-001 test would create it), `computeStatus`'s `safe` predicate checks symlink/ancestor safety (lib/status.js:105), not containment, so it currently surfaces as `ok`. The substantive claim (not `invalid` today; reclassify to `invalid` before the drift check) is correct.
- **N-2 (nit):** AC-010's `npm pack --dry-run` is not enumerated in the design's Verification/Observability or DES-PROC-012 (which cite golden/self-conformance/readme-pinning/syntaxcheck). Add it to the SPEC verification gate.
- **N-3 (nit):** DES-ARCH-001 gives `validateOperationalSemantics({ platform, skillsRoot, xskRoot, manifest })` an `xskRoot` parameter, but the described logic only consults `skillsRoot` against `installed_paths`. `xskRoot` is unused by the stated behavior (backup-file containment stays in `safeBackupForSkill`). Either drop the param or state its purpose.

## Unresolved ambiguity

None blocking. DECISION-001 (archive-collision) is resolved to stop-and-ask (Selected: A, user, 2026-06-26) and is applied consistently: DES-E-007 step (3) "stop and ask the user to decide and write nothing (DECISION-001 resolved to stop-and-ask; no silent overwrite, R-E1)", and the SPEC Handoff pins it as the archive-collision assertion. No lingering hedge or undecided point was found in the Chosen Design, Options Considered, or Decision Requests sections.

## Risk closure

Every carried risk has a closure verdict; all are defensible.

| RISK id | Closure | Verdict |
|---|---|---|
| RISK-SEC-001 | ADDRESSED (DES-A-002) | OK - containment rejects only out-of-root; existing suite must stay green. |
| RISK-SEC-002 | ADDRESSED (DES-ARCH-001) | OK in principle (single shared helper); but see TC-2 - the single shared `skillsRoot` resolution must not introduce the uninstall require cycle. |
| RISK-SEC-003 | ADDRESSED (DES-A-003) | Defensible at unit level; integration reachability/outcome needs the TC-3 fix. |
| RISK-SEC-004 | ADDRESSED (DES-D-008) | OK - body/registry/docs/READMEs/golden retargeted; C2 zero-stale gate. |
| RISK-SEC-005 | ADDRESSED (DES-E-007) | OK - write-then-confirm-then-remove pinned in body+tests. |
| RISK-COR-001 | ADDRESSED (DES-C-006) | OK on behavior; note the TC-4 message-assertion update. |
| RISK-COR-002 | ADDRESSED (DES-A-004) | OK - invalid evaluated before drift; in-root drift preserved. |
| RISK-PROC-001 | ADDRESSED (DES-PROC-012) | OK - fragments -> buildSkill -> SKILL.md -> masked golden. |
| RISK-PROC-002 | ADDRESSED (DES-PROC-012) | OK - ASCII hyphens, no filler; syntaxcheck/self-conformance. |
| RISK-PROC-003 | ADDRESSED (DES-PROC-012) | OK - EN/CN heading parity; readme-pinning test. |
| RISK-PROC-004 | DEFERRED (DES-H-010 Phase 3 gate) | OK - named owner, explicit verification gate; legitimate deferral. |

## Recommended changes (if any)

Priority order:

1. (TC-2, high) Resolve the `install` <-> `uninstall` require cycle for `rootFor` before SPEC. Decide the mechanism (relocate `rootFor`/adapters to a leaf module, pass a caller-resolved `skillsRoot` into `uninstall()`, or lazy-require), and record it in the design's "no require cycle" reasoning so it covers uninstall, not just status.
2. (TC-1, high) Add lib/capability.js:74 `computeStatus(... , platformRoots: opts.platformRoots)` to the Call-site contract. Correct the "no separate containment code in capability.js" statement to acknowledge the required `platformRoots` forwarding.
3. (TC-3, medium) Decide how the backup-target containment is exercised: either extend `validateOperationalSemantics` to scan `backups[].target` (yielding `invalid`), or designate DES-A-003 a unit-tested per-skill defense and reconcile AC-002's "partial/retained" expected outcome accordingly. Pin the test level explicitly.
4. (TC-4, low-medium) Note in DES-C-006/MIT-006 that input.test.js:97-101 (`/--json.*status.*doctor/`) must be updated for `version`/`help`, and pin the new per-command error messages.
5. (N-2) Add `npm pack --dry-run` to the SPEC verification gate to fully satisfy AC-010.
6. (N-3) Drop or justify the unused `xskRoot` parameter on `validateOperationalSemantics`.

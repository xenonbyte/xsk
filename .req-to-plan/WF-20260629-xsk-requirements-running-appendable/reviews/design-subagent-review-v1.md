# Design Subagent Review v1

stage: design
verdict: changes-requested

## Summary
The design is largely sound: the five-area decomposition is correct, the four content-only
areas (REQ-001/002/003/005/006) are faithful to the requirements, and the "Current Code
Evidence" section is unusually accurate (only one real citation error and a couple of
off-by-one loop pointers). The blocker is REQ-004 / DES-OPENCODE-001: its enumeration of
manifest consumers is incomplete. It omits `previousInstallState` (the basename classifier
that also produces the `wasInstalled` signal the design's own hash-only ownership safety
depends on), and the `capturePlatformSnapshot` prior-paths loop filters to `skillsRoot`,
which makes the design's Rollback claim ("command files are added to that same snapshot")
factually wrong for the prune case. REQ-004's README parity (R-4.8 / AC-7) is also dropped.
These are concrete correctness/coverage gaps, not vagueness, so the r2p gate should not pass
as-is.

## Code-evidence verification

| Cited fact (design) | Result |
|---|---|
| `lib/generator.js:19` `buildSkill` composes SECTIONS | confirmed (`generator.js:19`) |
| `lib/generator.js:7` SECTIONS `['purpose','triggers','behavior','output']` | confirmed (`generator.js:7`) |
| `lib/generator.js:9` `{{TOKEN}}` substitution | confirmed (`render`, `generator.js:9`) |
| `lib/skills.js:5` `skills[]`; `:3` ALL_PLATFORMS | confirmed (`skills.js:3,5`) |
| `lib/skills.js:30`/`:37` write-req/archive-req descriptions name `requirements/` | confirmed |
| write-req step 5 single-shot `:13`; step 8 closing bullet `:25`; step 4 open-q `:11` | confirmed (working-tree copy; step 5 + step 8 still the OLD single-pass text — swap targets correct) |
| `requirements/` reference inventory (content-only, no `lib/` runtime read) | confirmed COMPLETE for bare refs; BUT see below — the "two pinned test assertions" undercounts |
| `lib/adapters/opencode.js:8` exposes only `skillsRoot` | confirmed (module.exports = {PLATFORM, skillsRoot}) |
| `lib/install.js:317` one platform-generic loop, no per-platform branch | confirmed |
| `lib/install.js:24` `rootFor` returns `adapter.skillsRoot()` | confirmed (`install.js:24-30`) |
| `lib/manifest.js:11` "defines installed_paths / backups / **installed_hashes**" | WRONG — `manifest.js:11-18` is `REQUIRED_FIELDS`, which contains `installed_paths` and `backups` only. `installed_hashes` is NOT required: it is an optional field, validated conditionally at `manifest.js:210-222` and created at `:235`. (low) |
| `lib/manifest.js:83` validateOperationalSemantics; `:87` `isInsideDir(p, skillsRoot)` | confirmed at `:83`; the `isInsideDir` check is actually `manifest.js:88` (line 87 is the `for`). (trivial off-by-one) |
| `lib/install.js:99-114` previousInstallState classifies by basename | confirmed |
| `lib/install.js:235-294` capturePlatformSnapshot enumerates skillsRoot-shaped paths | confirmed (and the prior-owned-paths loop filters `isInsideDir(p, skillsRoot)` at `:270`, `:285` — load-bearing for REQ-004, see below) |
| `lib/install.js:117` markerless adoption `isPreviouslyInstalledGeneratedContent` | confirmed (`:117-125`) |
| `lib/install.js:357` user-edit refusal; `:370` drift refusal | confirmed |
| `lib/uninstall.js:43-54` classifyPaths buckets by basename | confirmed |
| `lib/ownership.js:50` safeBackupForSkill (per-skill triple) | confirmed (`ownership.js:50-75`) |
| `lib/status.js:12-18` expectedInstalledPathType; `:133` installedCount counts `SKILL.md` | confirmed (filter spans `:133-135`) |
| `lib/ownership.js:12-13` `MARKER`/`PACKAGE_NAME` | confirmed (note: `:12` is PACKAGE_NAME, `:13` is MARKER — design prose lists them reversed; lines correct) |
| `skill-scaffold.behavior.md:16` four-platforms; `:17` install-safety; `:19` golden; `:20` README; `:22-24` self-conformance | all confirmed |
| `test/generator.test.js:70-73` sorted skill-name assertion | confirmed (note: test title `:69` says "all six skills"; design's "name list to eight" must also reword the title/comment — nit) |
| `test/self-conformance.test.js:132-144` required-paths list | confirmed (array `:132-143`) |
| `test/skill-behavior.test.js:55,65,80` per-skill blocks | confirmed |
| `test/install.test.js` carries opencode assertions; uninstall/status platform-generic | confirmed (install.test.js 17 `opencode` hits; uninstall.test.js 0; status.test.js 0) |
| `lib/install.js:444-485` failed install rolls back via per-platform snapshot | confirmed (`install()` `:435-486`, snapshot `:455`, restore `:480-482`) |

Net: evidence section is ~95% accurate. One genuine error (`installed_hashes` not at `manifest.js:11`); one undercount in the REQ-002 test inventory (below); the rest are exact.

## REQ-004 architecture findings

The chosen design (DES-OPENCODE-001, design `:182-204`) names these consumers:
validateOperationalSemantics, install record+snapshot+refuse/adopt, an uninstall command pass,
and status `expectedType=file`. The following consumers are NOT named and each assumes
"installed_paths entries are marker-bearing skill dirs inside skillsRoot":

- **HIGH — `previousInstallState` (`lib/install.js:99-114`) is unaddressed, and the design's
  hash-only ownership safety depends on it.** A flat command path `<commandsRoot>/xsk-think.md`
  has basename `xsk-think.md`, so the classifier at `:100-104` (`base !== 'SKILL.md' && base
  !== MARKER`) would misfile it into `installedDirs`, and it would NOT appear in `installedFiles`
  (`:105-107`, requires basename `SKILL.md`). The design says install "adopts a hash-matched
  one, reusing the markerless detection at `:117`" — but `isPreviouslyInstalledGeneratedContent`
  gates on `wasInstalled` (`install.js:118`), and the install loop derives `wasInstalled` from
  `previousState.installedFiles.has(skillFile)` (`install.js:366`) and the prior hash from
  `installedHashesByTarget` (`:365`). Command files are in neither map unless
  `previousInstallState` is generalized. Without it, a command file cannot be correctly adopted
  vs. refused, so the whole "refuse hash-mismatched, adopt hash-matched" guarantee is not wired.
  This is the consumer most central to REQ-004 and the design omits it while its own evidence
  section flags the function.

- **MED — `capturePlatformSnapshot` prior-paths loop (`lib/install.js:261-292`) filters
  `isInsideDir(p, skillsRoot)` (`:270`, and `:285` for backup targets), so prior command files
  are never snapshotted; the Rollback section's claim is therefore wrong for pruning.** The
  design (Rollback, design `:226-229`; AC-4) asserts command files "are added to that same
  snapshot, so a partial command-file write is reverted." That holds only for CURRENT applicable
  skills (the `:252-258` region the design intends to extend). The prior-manifest loop exists
  specifically so an uninstall-first reset of a skill **no longer installed** can roll back
  (`install.js:260-261` comment), and it is `skillsRoot`-scoped. R-4.5 requires "prunes command
  files for skills no longer installed"; if that prune runs during the uninstall-first reset
  (`install.js:466`) and a later step fails, the pruned command file is NOT restored because the
  snapshot never captured it. The design must also generalize this filter, or the prune is
  non-transactional — directly contradicting AC-4.

- **MED — uninstall/status `validateOperationalSemantics` call sites and `commandsRoot`
  plumbing are unaddressed.** `validateOperationalSemantics` is called in exactly two places —
  `lib/uninstall.js:229` and `lib/status.js:107` — and both pass only `skillsRoot`. After the
  first opencode install records command paths in `installed_paths`, a SECOND `xsk install`
  triggers the uninstall-first reset (`install.js:466` -> `uninstallPlatform` ->
  `validateOperationalSemantics` at `uninstall.js:229`), which would return
  `installed path escapes platform root` and make `install.js:467` throw "existing manifest is
  invalid." Likewise `xsk status` would report `invalid`. The design says validateOperational-
  Semantics "accepts a second allowed root" but never states that both call sites must pass
  `commandsRoot`, that `uninstallPlatform({platform,xskRoot,skillsRoot})` (`uninstall.js:181`)
  needs a new `commandsRoot` param, that `install.js:466` and `uninstall.js:557` must resolve and
  pass it, or how non-opencode platforms (no `commandsRoot()`) are handled. These are real wiring
  points, not just an interface signature.

- **LOW/MED — uninstall main-loop separation is under-specified.** `classifyPaths`
  (`uninstall.js:246`) would bucket a flat command path as a pseudo "skillDir" (`:49-51`), and the
  per-skill loop (`:283`) would then synthesize `<cmd>.md/SKILL.md` and `<cmd>.md/.xsk-owned`.
  The design says command files must not route "through the skill-dir classifyPaths logic," which
  is correct, but does not say they must be filtered out before `classifyPaths`, before the
  `ownedDirs` set (`:277-282`), and before `validateBackupTargets` (`:85-104`, which requires
  every backup target basename to be `SKILL.md`). It also leaves implicit that command files
  carry NO backups (consistent with the install design, since the marker-less backup branch at
  `install.js:360-400` is keyed on `skillFileExisted && !markerFileExisted` and would not apply).
  This should be stated so SPEC does not accidentally give command files a backup record that
  `validateBackupTargets` would then reject.

Ownership/pruning assessment:
- **Hash-only (markerless) ownership is safe in principle, but only via the missed consumer.**
  Safety against clobbering a user's own pre-existing `xsk-think.md` rests entirely on the
  `wasInstalled` gate (`install.js:118`): a path not in the prior manifest's command set returns
  `false` -> refuse. That gate requires `previousInstallState` to track command paths (HIGH
  finding). As designed (without that wiring) the safety argument is incomplete.
- **Pruning is feasible** (iterate prior-manifest command paths, remove hash-matched, retain
  hash-mismatched) **but its rollback is not**, per the MED snapshot finding. Feasibility and
  transactional-safety must both be addressed for R-4.5 + AC-4 to hold.

## Requirement coverage findings

- **MED — REQ-004 R-4.8 / AC-7 (README EN/CN parity for the opencode command install) is
  dropped.** DES-OPENCODE-001 (design `:182-204`), the SPEC Handoff bullet for it (`:253-254`),
  and Observability never mention updating `README.md` / `README.zh-CN.md` to state that opencode
  installs both a skill and `commands/xsk-<name>.md`. REQ-002 and REQ-003 README updates are
  covered (design `:158`, `:180`); REQ-004's is not. `readme-pinning.test.js` would NOT catch the
  omission (it only checks the token `opencode`, already present), so AC-7 would silently fail.
- **LOW — REQ-002 test inventory undercounts.** The design names "the two pinned test assertions
  (`test/generator.test.js:111`, `test/skill-behavior.test.js:129`)." `test/skill-behavior.test.js:123`
  (`/requirements\/archive\/<slug>\.md/`) also pins a bare `requirements/` path and, per AC-1/AC-4
  ("no test still pins a bare `requirements/` path"), should be repointed too. Note both
  assertions are unanchored substring matches, so neither would actually FAIL under the new
  `.xsk/...` content; the design's grep-clean acceptance (RISK-MIGRATION-001 mitigation) backstops
  this, which is why severity is low — but the explicit inventory is incomplete.
- REQ-001, REQ-002 (paths/gitignore/descriptions/docs), REQ-003 (schema, compose-by-reference,
  single-active append-or-abort guard D-9, archive-on-consume write-before-remove, non-folded
  disposition D-11, trigger disambiguation, test enumerations), REQ-005, REQ-006: all ACs and
  D-1..D-20 are covered with no contradiction found. The strict implementation order
  (REQ-002 -> REQ-001 -> REQ-003; REQ-004 before the combined REQ-005+REQ-006 pass) matches
  D-10/D-17/D-20 and RISK-ORDER-001/RISK-SELFCONF-001.

## Undecided points / hedging

- "Decision Requests: none" is **justified at the human-decision level.** Option A vs B is
  dictated by R-4.4's verbatim "installed_paths and installed_hashes"; the hash-only ownership
  signal is forced by the flat-file shape (a sibling marker would itself be a stray command);
  Gemini/Codex are deferred by REQ-004 Open Questions + D-16. No genuine product/scoping fork was
  silently picked.
- However, the gate concern is not an undecided fork but **under-specified mechanism**: the
  missed consumers above and the incorrect Rollback claim are technical gaps a human reviewer
  would expect resolved before "ready." The design reads as decision-complete but is not
  consumer-complete for REQ-004.

## Recommended changes (if any)

1. REQ-004: add `previousInstallState` (`install.js:99-114`) to the consumer list — it must
   recognize `<commandsRoot>/xsk-*.md` as command files (not dirs/skill files) and expose their
   prior membership + prior hash so the markerless `wasInstalled` adoption/refusal at
   `install.js:118,365-366` works for command files. This is prerequisite to the hash-only
   ownership safety the design already relies on.
2. REQ-004: generalize the `capturePlatformSnapshot` prior-paths filter (`install.js:270`, `:285`)
   to also capture prior `commandsRoot` paths, OR explicitly scope-limit the Rollback/AC-4 claim.
   As written, "command files are added to that same snapshot" is false for pruned skills.
3. REQ-004: name the two `validateOperationalSemantics` call sites (`uninstall.js:229`,
   `status.js:107`) and the `commandsRoot` plumbing — the new `uninstallPlatform` param, the
   `install.js:466` / `uninstall.js:557` resolution, and how platforms without `commandsRoot()`
   are handled — so a second `xsk install` / `xsk status` does not flip to `invalid`.
4. REQ-004: state how command paths are separated from `classifyPaths` / `ownedDirs` /
   `validateBackupTargets` in uninstall (`uninstall.js:43-54,85-104,277-282`) and that command
   files carry no backup record.
5. REQ-004: add the README.md / README.zh-CN.md update for the opencode command install to the
   design and SPEC Handoff (R-4.8 / AC-7).
6. REQ-002: add `test/skill-behavior.test.js:123` to the repoint inventory (or rely explicitly on
   the grep-clean step for completeness).
7. Fix the `manifest.js:11` citation — `installed_hashes` is an optional field (validated at
   `manifest.js:210-222`, created at `:235`), not part of `REQUIRED_FIELDS`.

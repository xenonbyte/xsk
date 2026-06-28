# Design Subagent Review v3

stage: design
verdict: approve

## Item confirmations

1. NIT-1 — CLOSED, accurate. design `:61-63`: "`REQUIRED_FIELDS` (`lib/manifest.js:11`) includes
   `installed_paths` and `backups` (alongside `schema_version`, `platform`, `version`,
   `installed_at`) but not `installed_hashes`, which is an optional field validated conditionally at
   `lib/manifest.js:210-222` and created at `:235`." Matches `manifest.js:11-18` exactly (6 required
   fields; installed_hashes validated 210-222, created 235).

2. NIT-2 — CLOSED, accurate. design `:212`: "and `computeStatus` (`lib/status.js:107`) resolves and
   passes it too." `statusOf` dropped; `status.js:107` is the `validateOperationalSemantics` call
   inside `computeStatus`.

3. NIT-3/NIT-4 — CLOSED, accurate. SPEC Handoff `:303-310` names "the basename-only functions
   `previousInstallState` (`lib/install.js:77`) and `expectedInstalledPathType` (`lib/status.js:12`)
   — classify by basename (`*.md` and not `SKILL.md`) or thread `commandsRoot` through them — and ...
   the narrowed manifest (`retainedInstalledHashes`, `lib/uninstall.js:74-79`, reconstruction
   `:496-505`), which today filter on skill files only." All four citations verified: install.js:77
   is `function previousInstallState(...)`; status.js:12 is `function expectedInstalledPathType(p)`;
   uninstall.js:74-79 is `retainedInstalledHashes`; uninstall.js:496-505 is the narrowed-manifest
   build (`narrowed.installed_hashes = retainedInstalledHashes(manifest, retainedFiles)` at :502).
   The `*.md`-and-not-`SKILL.md` heuristic correctly isolates command files from skill dirs/files/
   markers. No new error introduced.

## Residual issues
None. All seven v1 findings and all three v2 nits are closed; every code citation in the changed
passages is correct.

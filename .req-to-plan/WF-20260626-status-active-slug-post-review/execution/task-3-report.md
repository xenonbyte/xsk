# PLAN-TASK-003 Report

## Status
done

## Files Changed
- `lib/ownership.js`
- `lib/uninstall.js`
- `test/uninstall.test.js`

## RED Evidence
Targeted test before the fix:

```text
✖ uninstall: refuses backup targets outside skillsRoot (5.472625ms)
AssertionError [ERR_ASSERTION]: outside target forces partial
0 !== 2
```

## Implementation Summary
- Added `skillsRoot` to `safeBackupForSkill(backups, skillFile, xskRoot, platform, skillsRoot)`.
- Marked matched backups unsafe when `path.resolve(backup.target)` is not inside `skillsRoot`.
- Threaded `skillsRoot` through the `uninstallPlatform` call site in `lib/uninstall.js`.
- Added a focused unit test that calls `safeBackupForSkill` directly with an out-of-root target and verifies the target file is not overwritten.

## Final Verification
Command:

```text
node --test test/uninstall.test.js
```

Result:

```text
ℹ tests 18
ℹ pass 18
ℹ fail 0
```

## Self-review
- The change is narrow and matches the existing partial/uninstall retention path.
- The new containment check preserves the existing backup-file and backup-dir safety checks.
- The test exercises the unit boundary called out by the spec and keeps all test roots isolated under temp dirs.

# PLAN-TASK-002 Report

## Status

- Result: complete
- Task: Thread `skillsRoot` through uninstall and refuse out-of-root
- Base commit: `6a020e1ecfe0601527e848e86a87b24289d0dd41`

## Files Changed

- `lib/uninstall.js`
- `lib/install.js`
- `test/uninstall.test.js`
- `test/install.test.js`

## RED Evidence

Initial TDD run:

```text
$ node --test test/uninstall.test.js test/install.test.js
✖ install: refuses a previous manifest with an out-of-root installed path and leaves state untouched
  AssertionError [ERR_ASSERTION]: Missing expected exception.

✖ uninstall: shape-valid manifest with an out-of-root installed path refuses and leaves manifest untouched
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + undefined
  - true
```

This confirmed the missing behavior on both the uninstall path and the install uninstall-first reset path.

## Implementation Summary

- `lib/uninstall.js`
  - Lazy-loads `rootFor` inside `uninstall()`.
  - Resolves `skillsRoot` per platform and passes it into `uninstallPlatform(...)`.
  - Runs `validateOperationalSemantics({ platform, skillsRoot, manifest })` immediately after shape validation.
  - Returns the existing invalid result shape when an installed path escapes the platform root.
- `lib/install.js`
  - Threads the already-resolved `skillsRoot` into the uninstall-first reset call.
- `test/uninstall.test.js`
  - Added a refusal test for a shape-valid manifest whose `installed_paths` escape the platform root.
  - Updated uninstall call sites to inject `platformRoots` or `skillsRoot` explicitly where required by the new behavior.
- `test/install.test.js`
  - Added an install regression test covering a prior shape-valid manifest with an out-of-root `installed_paths` entry.
  - Verifies install refuses, retains the manifest, and does not write outside the injected platform root.

## Final Verification Output

```text
$ node --test test/uninstall.test.js test/install.test.js
✔ 54 tests passed
ℹ fail 0

$ npm run syntaxcheck
syntaxcheck: all bin/, lib/, test/ files OK
```

## Self-Review

- Change is narrow and matches the requested spec surface.
- Added tests first and captured RED before implementation.
- Preserved existing uninstall/install behavior for in-root manifests; only out-of-root manifests are newly refused.
- No unrelated files were modified or reverted. Existing user change in `run.md` was left untouched.

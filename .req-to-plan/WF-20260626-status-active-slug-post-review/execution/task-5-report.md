# PLAN-TASK-005 Report

## Status

Done for scoped files and targeted verification.

## Files Changed

- `lib/capability.js`
- `test/status.test.js`
- `.req-to-plan/WF-20260626-status-active-slug-post-review/execution/task-5-report.md`

## RED Evidence

Added failing tests first in `test/status.test.js`, then ran:

```bash
node --test test/status.test.js
```

RED result before implementation:

- `doctor: writable-xsk-root check fails when xskRoot is not writable`
- `doctor: writable-xsk-root check fails when xskRoot is a symlink`
- `doctor: render json parses and includes checks`

Representative failure details:

```text
AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

  assert.ok(w)
```

and

```text
AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:

  assert.ok(parsed.checks.some((c) => c.name === 'writable-xsk-root'))
```

This confirmed `doctor()` did not emit the `writable-xsk-root` check yet.

## Implementation Summary

- Forwarded `opts.platformRoots` into `computeStatus(...)` inside `doctor()`.
- Added the `writable-xsk-root` doctor check using `isWritableDir(xskRoot)`.
- Added focused doctor tests for:
  - non-writable `xskRoot`
  - symlinked `xskRoot`
  - out-of-root recorded manifest path causing `manifest-valid` failure when injected `platformRoots` are used
  - JSON render including `writable-xsk-root`

## Final Verification Output

Targeted verification required by the task:

```bash
node --test test/status.test.js
```

Result:

```text
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Additional project checks:

```bash
npm run syntaxcheck
```

Result:

```text
syntaxcheck: all bin/, lib/, test/ files OK
```

```bash
npm test
```

Result:

```text
pass 179
fail 7
```

Observed failing files during full-suite run:

- `test/install.test.js`
- `test/safety.test.js`

These failures were outside this task's edited scope. They were not changed here.

## Self-Review

- Diff is narrow and limited to the requested doctor/status behavior.
- Tests use injected temp roots only; no real home directories are touched.
- The new check participates in `allPass`, so CLI exit behavior can become non-zero on unwritable or symlinked `xskRoot`, matching the task/spec.

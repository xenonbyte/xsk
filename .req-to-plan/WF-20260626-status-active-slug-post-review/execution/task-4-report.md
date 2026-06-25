# PLAN-TASK-004 Report

Status: done

Files changed:
- `lib/status.js`
- `test/status.test.js`
- `.req-to-plan/WF-20260626-status-active-slug-post-review/execution/task-4-report.md`

RED evidence:

Command:

```bash
node --test test/status.test.js
```

Observed failure before implementation:

```text
✖ status: computeStatus reports invalid when a recorded installed path escapes the injected platform root
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  'ok' !== 'invalid'
```

Implementation summary:
- Imported `rootFor` into `lib/status.js` and resolved `skillsRoot` from `opts.platformRoots` per platform.
- After manifest shape validation passes, `computeStatus` now runs `validateOperationalSemantics` before drift evaluation.
- When a recorded installed path escapes the platform root, status now returns `invalid` with the semantic failure reason.
- Updated status tests to inject `platformRoots` where the new semantic check depends on the install root, preserving existing `ok` and `drift` expectations for in-root cases.
- Added a focused regression test for the out-of-root installed path case.

Final verification output:

```text
$ node --test test/status.test.js
✔ status: statusOf ok when shape valid and all paths exist
✔ status: statusOf drift when a recorded path is missing on disk
✔ status: statusOf drift when a recorded backup is missing on disk
✔ status: statusOf invalid for shape-broken manifest (invalid wins over drift)
✔ status: statusOf invalid for wrong platform
✔ status: statusOf not-installed when no manifest
✔ status: computeStatus reports ok after a real install (injected roots)
✔ status: computeStatus reports drift when a recorded path is deleted
✔ status: computeStatus reports invalid when a recorded installed path escapes the injected platform root
✔ status: computeStatus reports drift when a recorded skill file becomes a directory
✔ status: computeStatus reports drift when a recorded marker becomes a directory
✔ status: computeStatus reports drift when a recorded owned dir becomes a file
✔ status: computeStatus reports drift when a recorded backup is deleted
✔ status: computeStatus reports drift when a recorded backup becomes a directory
✔ status: computeStatus reports invalid for truncated manifest JSON
✔ status: computeStatus reports invalid for shape-invalid installed_paths without counting paths
✔ status: computeStatus reports not-installed when no manifest
✔ status: render text and json both produce output containing the state
✔ doctor: reports Node version check pass on this host
✔ doctor: writable check passes for a creatable temp root
✔ doctor: writable check fails when an ancestor is a regular file
✔ doctor: writable check fails when the skill dir has a symlink ancestor
✔ doctor: manifest-valid check reflects a valid manifest
✔ doctor: manifest-valid check fails when a recorded install path drifts
✔ doctor: manifest-valid check fails when a recorded backup drifts
✔ doctor: manifest-valid check fails when a manifest is shape-invalid
✔ doctor: manifest-valid checks the default manifest root when xskRoot is omitted
✔ doctor: render json parses and includes checks
ℹ tests 28
ℹ pass 28
ℹ fail 0
```

Additional check:

```text
$ npm run syntaxcheck
syntaxcheck: all bin/, lib/, test/ files OK
```

Self-review:
- Scope stayed within Task 4: `status` behavior only; `doctor` behavior was not changed.
- The semantic invalid branch runs only after manifest shape validation, so shape-invalid manifests still report `invalid` through the existing path.
- In-root regressions are covered by explicit `ok` and `drift` tests with injected platform roots.

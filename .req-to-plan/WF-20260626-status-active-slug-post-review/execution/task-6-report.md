# PLAN-TASK-006 Report

## Status
- Completed

## Files Changed
- `lib/input.js`
- `test/input.test.js`
- `test/cli.test.js`

## RED Evidence
Command:

```bash
node --test test/input.test.js test/cli.test.js
```

Exit: `1`

Key failures:

```text
✖ cli: version rejects --platform with non-zero exit
  AssertionError [ERR_ASSERTION]: Expected "actual" to be strictly unequal to: 0

✖ input: per-command option allow-lists reject not-allowed options
  AssertionError [ERR_ASSERTION]: Missing expected exception.
```

## Implementation Summary
- Added per-command option allow-lists in `parse(argv)`.
- Routed `-v` / `--version` and `-h` / `--help` through the same command validation path as word-form `version` / `help`.
- Preserved `--platform <value>` and `--platform=<value>` parsing.
- Kept `--json` available only for `status` and `doctor` by allow-list rather than post-parse special-casing.
- Added parser negatives for disallowed options and a CLI regression for `xsk version --platform claude`.
- Updated the legacy help/version extra-argument assertion to match the unified parser behavior.

## Final Verification Output
Command:

```bash
node --test test/input.test.js test/cli.test.js
```

Exit: `0`

```text
ℹ tests 28
ℹ suites 0
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Additional repo checks:

- `npm run syntaxcheck` -> exit `0`
- `npm test` -> exit `1` due unrelated existing failures in `test/install.test.js` and `test/safety.test.js`

## Self-Review
- Scope stayed within the parser and its direct tests.
- CLI error shape remains `xsk: <message>` via existing `bin/xsk.js` handling.
- Existing positive paths required by the task still pass: `-v`, `help`, `status --json`, `install --platform claude,codex`.
- Full-suite failures observed after the task appear outside this diff and were left untouched per in-place multi-agent constraints.

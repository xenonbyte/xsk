# Plan subagent review v8

## Verdict

**approve.** The v7 major is fixed, the fix is correct and complete for both gate lines, the README criterion is intact, and `s` reuse is safe as written. **I have nothing at any severity — no blocker, no major, no minor.** The run is closeable from my side.

## Verified facts

Read-only. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

Checked only PLAN-TASK-004's ```sh block, as instructed. I ran the block rather than inspecting it — six tests, all executed under `/bin/sh`.

### The fix is correct and complete for both lines

Both gate lines now carry the identical capture-then-clean shape:

```sh
<command chain>
s=$?
rm -rf "<dir>"
[ "$s" -eq 0 ]
```

| Test | Result |
|---|---|
| `sh -n` on the exact block | **syntax OK** |
| forced-failure payload → exit status | **1** (v7 gave **0** here — the regression is gone) |
| success payload → exit status | **0** |
| temp dir removed on the **failure** path | **cleaned** |
| temp dir removed on the **success** path | **cleaned** |
| real README group against the current tree | **exit 0, no output** |

So `npm pack`'s status now propagates to the criterion that checks it, and cleanup still happens unconditionally. Applying it to both lines rather than only the failing one was the right call — the `$d` line was correct at v7 only because its criterion happened to be output-based, and a document meant to be followed mechanically should not depend on the reader knowing which of two identical-looking lines is safe for a subtle reason.

The two comments are accurate: the first correctly states that `;` makes the status `rm`'s and that `&&` skips cleanup on exactly the failure path; the second correctly states the `$d` line's status is now `diff`'s, not `rm`'s.

### The README criterion is intact — diff output still reaches stdout

This is the one that could have broken silently, so I tested it with a deliberate mismatch rather than reasoning about it:

```
1c1
< a
---
> b
  exit=1
```

`diff "$d/en" "$d/cn"` has no redirection, so its output goes to stdout exactly as before; `s=$?` only reads the status afterwards. **Both signals are now available** — the Verification's "README 标题行 `diff` 无输出" still works, and the status is correct too, where before only the output was trustworthy. Against the current tree the group produces no output and exits 0.

### `s` reuse is safe as written

Three properties make it safe, and all three hold in the block as written:

1. **Each `s=$?` immediately follows its command chain** with nothing between them. In the `$d` group the backslash continuation makes `d=… && grep … && grep … && diff …` a single logical line, so `$?` is `diff`'s (or the first failing link's), not something else's.
2. **Each `s` is consumed by its own `[ "$s" -eq 0 ]` before the next group reassigns it.** No cross-group read.
3. **Both `s=$?` lines are unconditional** — neither sits inside an `&&` chain — so there is no path where a group's assignment is skipped and a stale value from the previous group is tested.

The comment lines between the two groups are not commands and do not disturb `$?`.

### Nothing else broke

The `Files:` continuation is unchanged from v7 and remains correct. It makes no cleanup claim, while the block now cleans both directories on both paths — so the sentence is weaker than the behaviour, which is the safe direction and the one you deliberately chose last round.

## Findings

**None.** No blocker, no major, no minor.

## Unresolved ambiguity

**None.** v8 changes no contract, literal, count, or acceptance criterion; it restores the one criterion that v7 had made unenforceable. Nothing in the block requires a decision the PLAN does not make.

## Notes

- **One edge worth knowing, not a defect and not introduced here.** Under `set -e`, POSIX ignores `-e` for all but the last command of an AND-OR list — so if `npm pack` fails, the shell aborts at that line *before* `s=$?` and `rm` run, leaking the temp dir and never reaching the `[ ]`. The gate outcome is still correct (the script stops on failure), and the previous `; rm` form leaked identically under `set -e`, so this is not a regression. As written — a plain sequence, no `set -e` — every path behaves correctly, which is what I measured.
- **`[ "$s" -eq 0 ]` is silent on failure**, so the criterion depends on the reader checking the status, which is exactly what the Verification says ("退出 0"). In practice a real `npm pack` failure also prints to stderr, so it will not pass unnoticed. Adding an `|| echo` would be gold-plating; the form is right as it stands.
- **This round is a good argument for testing shell snippets rather than reading them.** The v7 masking was invisible on inspection — the line looked like a tidy cleanup idiom — and took one forced-failure run to expose. The same two commands settled all four questions here, including the diff-output one, which was the plausible way this fix could have broken something while looking correct.
- **Run position.** Across design, SPEC and PLAN this run closed 5 majors and 29 minors. Every quantity asserted anywhere in the chain has been independently reproduced against the repository: the byte account (115 / 411 / 26 / 609 = 1161; 10,129 / 13,155 / 12,629), the twelve frozen literals, the 21-pattern split with its single negative assertion, the block counts 10 / 16 / 22 and the file-global 224, the six-state failure table, the three per-task failure sets, and the gate-block anchor mapping. The PLAN is executable as written and I would close the run on it.

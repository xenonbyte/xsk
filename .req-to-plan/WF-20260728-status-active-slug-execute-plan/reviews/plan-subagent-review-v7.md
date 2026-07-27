# Plan subagent review v7

## Verdict

**changes requested** — both edits landed and the `Files:` sentence is now correctly weaker than the block, but you were right to ask: **the `; rm -rf "$c"` does mask `npm pack` failure**, and the Verification's "`npm pack --dry-run --json` 退出 0" is an exit-code criterion, so that gate check is now always satisfied regardless of outcome. One major, introduced by this edit, with a one-line fix.

## Verified facts

Read-only. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

Checked only PLAN-TASK-004's `Files:` continuation and its ```sh block, as instructed.

### Edit 1 — landed

The `npm pack` line is now `c=$(mktemp -d) && npm_config_cache="$c" npm pack --dry-run --json; rm -rf "$c"`. Both temp dirs are removed; there is now one `rm -rf` per `mktemp -d`. The v6 leak is genuinely closed.

### Edit 2 — landed, and the sentence is now strictly weaker than the block

The continuation reads: "本任务不写入仓库内的任何文件：…… 门禁命令会用到两个 `mktemp -d` 目录（README 标题比对的暂存、`npm pack` 的隔离 cache），两者都在仓库之外，因此 Change Type 为 non_code。"

| Clause | Status |
|---|---|
| writes no file inside the repo | true |
| uses two `mktemp -d` directories | true — exactly two, `$c` and `$d` |
| both outside the repo | true |
| any cleanup claim | **none** |

This is the right shape: the block *does* clean both up, and the sentence no longer says so, so nothing in the prose can run ahead of the code again. Making the sentence claim less rather than claim more accurately was the correct call.

### POSIX portability and failure modes — both good

- `sh -n` on the whole two-line block: **syntax OK**. `c=$(mktemp -d)`, `&&`, the `VAR=value command` prefix assignment, `;`, and quoted `"$c"` are all POSIX.
- **Failed `mktemp -d` is not destructive**, the same property I checked for `$d`. I forced it (`mktemp -d /nonexistent-dir-xyz/XXXX`): `c` comes back empty, the `&&` short-circuits so `npm pack` never runs (my sentinel `echo` did not fire), and `rm -rf ""` exits 0 harmlessly. It is not `rm -rf /` and never can be — `$c` is quoted at its only use.

### The exit-status question — measured, and it is a real problem

I tested the exact shape with the payload command forced to fail and forced to succeed:

| Shape | Payload | Compound exit |
|---|---|---|
| **v7**: `c=$(mktemp -d) && npm_config_cache="$c" CMD …; rm -rf "$c"` | **fails** | **0** |
| **v7**: same | succeeds | 0 |
| **v6**: `npm_config_cache="$(mktemp -d)" CMD …` | **fails** | **1** |

Success and failure are indistinguishable under v7 — the line's status is `rm`'s, which is 0 whenever `$c` is removable. v6's single-command form propagated the real status. **This is a regression introduced by this edit**, and it is the one place in the PLAN where it bites, because `npm pack` is the only gate whose criterion is stated as an exit code.

I checked the other four criteria in the same Verification; none is affected:

| Criterion | Basis | Affected? |
|---|---|---|
| `npm test` → `tests 247 / pass 247 / fail 0` | output | no |
| `npm run syntaxcheck` 退出 0 | exit code, but the line is standalone with no `; rm` | no |
| **`npm pack --dry-run --json` 退出 0** | **exit code, line ends `; rm -rf "$c"`** | **yes** |
| README `diff` 无输出 | output | no — this is why the identical `;` on the `$d` line is harmless |
| `git log` / `git status` | output | no |

## Findings

### 1. MAJOR — `; rm -rf "$c"` masks `npm pack`'s exit status, and the Verification checks exactly that status

**Claim.** PLAN-TASK-004's Verification requires "隔离 cache 的 `npm pack --dry-run --json` 退出 0". After edit 1 the line's exit status is `rm`'s, not `npm pack`'s, so the criterion is satisfied unconditionally.

**Evidence.** Measured above: with the payload forced to fail, the compound line exits **0** — the same value as the success case. The v6 form returned **1** on the same failure. A packaging regression would therefore pass this gate silently.

**Why major rather than minor.** It disables one of the final task's four gate checks, and it fails in the false-negative direction: a broken gate reports success. Every other criterion in this run is either output-based or standalone, so this is the single check where the pattern is load-bearing — and it is in the task whose entire purpose is to be the last line of defence. The practical likelihood of `npm pack` failing on this change is low (no `package.json` or `files` change), but a gate exists for the unlikely case.

**Fix — fully POSIX, keeps unconditional cleanup, preserves the real status:**

```sh
c=$(mktemp -d) && npm_config_cache="$c" npm pack --dry-run --json
s=$?
rm -rf "$c"
[ "$s" -eq 0 ]
```

If you want to keep it on one line: `c=$(mktemp -d) && { npm_config_cache="$c" npm pack --dry-run --json; s=$?; }; rm -rf "$c"; [ "${s:-1}" -eq 0 ]`.

Avoid the tempting `… && rm -rf "$c"` — it propagates the status correctly but skips cleanup precisely on the failure path, reintroducing the leak edit 1 just fixed.

## Unresolved ambiguity

**None.** v7 changes no contract, no literal, no count, and no acceptance criterion other than the one Finding 1 identifies as now-unenforceable. Nothing requires a decision the PLAN does not make; Finding 1 is a correction, not a choice.

## Notes

- **The asymmetry between the two lines is the whole lesson here.** Both end `; rm -rf "$<dir>"`. The README line is fine because its criterion is "diff 无输出" — output survives the status being overwritten. The `npm pack` line is not, because its criterion is an exit code, and exit codes are exactly what `;` discards. The latent trap I flagged at v6 became live the moment a `; rm` was attached to a command whose contract is its status.
- **Applying the same status-capture pattern to the README line is optional, not required.** As specified it works correctly today. Doing it anyway would make both lines robust under an exit-code harness and remove the need to remember which criterion is which — but it is a hardening, not a fix.
- **Edit 2 is the right way to end a three-round sentence.** v5 and v6 both tried to describe the block's cleanup behaviour precisely and both drifted; v7 stops describing it at all and asserts only what is structurally true (two dirs, both outside the repo). A sentence that claims less cannot fall out of sync with code that changes.
- **Everything else in TASK-004 is unchanged and still verified**: the block parses under `sh -n`, the README parity check passes against the current tree, and the `non_code` / `Files: - N/A` encoding remains honest — nothing writes inside the repository.
- **Run position.** This is the first finding above minor since the SPEC stage, and it is a fresh one rather than a survivor: it was introduced by the edit under review, which is why catching it now rather than at execution was worth the round. With it fixed I would approve; the rest of the PLAN is unchanged from the v6 I approved and remains executable as written.

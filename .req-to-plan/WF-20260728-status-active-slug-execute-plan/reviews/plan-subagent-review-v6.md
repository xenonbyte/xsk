# Plan subagent review v6

## Verdict

**approve.** All three v6 edits landed and are correct. The load-bearing new claim — that R3a is the only replacement able to turn the gate block red — I verified exhaustively and it is exactly right. **I have nothing above minor**: one minor precision defect remains, in a descriptive sentence, with no effect on execution. The run is closeable from my side.

## Verified facts

Final narrow delta. Read-only. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

Per instruction I did not re-measure failure sets or re-walk coverage. Structure spot-confirmed unchanged: 4 `Spec References` lines covering **13** distinct SPEC ids, **4** Trace rows, **9** Risk Handling rows.

### 1. Stale step count — fixed

PLAN-TASK-001 has **12** steps and the Verification now says "上面 12 步". Matched. It was the only stale step reference in the file.

### 2. The diagnostic — the key claim is verified exhaustively

I computed the full intersection rather than spot-checking, since this is the whole diagnostic value of the check.

**All four replacement targets** (the Verification enumerates three distinct lines; I resolved all four replacements):

| Replacement | Fragment line |
|---|---|
| R1 | `:60` |
| R2 | `:54` |
| R3a | `:52` |
| R3b | `:60` |

**Gate-block assertion anchor lines**: `11, 22, 24, 52, 56, 56, 58, 58`.

**Intersection — which replacements share a line with a gate-block assertion:**

| Replacement | Line | Shares a gate assertion? |
|---|---|---|
| R1 | `:60` | no |
| R2 | `:54` | no |
| **R3a** | **`:52`** | **yes — the only one** |
| R3b | `:60` | no |

So **"唯一能让这个块变红的是 R3a" is correct.** Confirming the stated mechanism precisely: the `:52` assertion is `/The ledger is a recovery log, not tamper-evident evidence and not a deliverable/`, R3a's target sentence `Write it here, at step 7's terminal write, and in step 6, nowhere else.` is on that same **physical line 52**, and both are present on it simultaneously. An R3a replacement that over-consumed characters would break that assertion, exactly as the Verification says.

Two supporting points also check out:

- **The claim survives the sentence enumerating only three replacement points.** R1 is the fourth replacement and it shares `:60` with R3b, where there is no gate assertion — so omitting R1 from the enumeration does not weaken "only R3a". "三个替换点" is accurate read as three distinct *lines*.
- **"按行号排序，不对应断言的书写顺序"** is now explicit and correct — the actual per-assertion source order is `11, 24, 52, 22, 56, 56, 58, 58`, so the sorted presentation needed exactly this caveat. My v5 finding on the ordering is fully addressed.
- **The byte-signal caveat is honest**: "前提是按 Skeleton 做一对一字面替换；若自行改写措辞则字节数也不再是可靠信号". That is precisely the limit of the 10129 check, and it closes the mild overclaim I raised at v5.

On the `R3b` line number: we agree, and the artifact is now right. For the record, my v5 finding said the same thing — it flagged the PLAN's then-wording "R3b（`:58`）" *because* R3b's target is at `:60`. Either way both of us measured `:60` and the v6 text states it correctly.

### 3. TASK-004's shell block — POSIX-portable, and I ran it

```sh
d=$(mktemp -d) && grep '^#' README.md > "$d/en" && grep '^#' README.zh-CN.md > "$d/cn" \
  && diff "$d/en" "$d/cn"; rm -rf "$d"
```

Not just inspected — executed:

- `/bin/sh -n` → **syntax OK**, so it parses under POSIX sh, not merely bash.
- Run under `/bin/sh` from the repo root → **no output, exit 0**. The README parity regression passes today, so the check is meaningful and will not fire spuriously.

Construct-by-construct: `d=$(mktemp -d)` is POSIX command substitution; `&&` chaining, quoted redirection targets `"$d/en"`, and backslash-newline continuation with the next line beginning `&&` are all POSIX-valid. Quoting is correct throughout.

Failure behaviour is safe. If `mktemp -d` fails, the assignment returns nonzero, the `&&` chain short-circuits before any write, and the trailing `rm -rf "$d"` degenerates to `rm -rf ""` — a harmless no-op error, **not** `rm -rf /`. `$d` is otherwise an absolute path under `$TMPDIR`, quoted at every use. Joining cleanup with `;` rather than `&&` is the right choice: the scratch dir is removed even when `diff` reports differences.

**Wording accuracy**: "本任务不写入仓库内的任何文件" is now literally true — I confirmed both scratch mechanisms live outside the repository. One clause is still overreaching; see Findings.

## Findings

### 1. MINOR — "用后即删" is true for one of the two named scratch mechanisms, not both

**Claim.** The `Files:` continuation says the gate commands' temp files — "`mktemp -d` 目录、`npm_config_cache`" — are "全部在仓库之外且用后即删".

**Evidence.** "全部在仓库之外" is correct for both. "用后即删" is correct for only one:

- The README scratch dir is removed: the skeleton ends `; rm -rf "$d"`.
- The npm cache dir from `npm_config_cache="$(mktemp -d)" npm pack --dry-run --json` is **never removed** — `grep` finds exactly one `rm -rf` in the whole skeleton, and it targets `"$d"`.

**Weight.** Very low. A leftover directory under `$TMPDIR` is harmless and the OS reaps it; nothing in the repo is touched and the `non_code` classification stands. But this is the third revision of this same sentence, and it is again slightly ahead of what the block does.

**Fix, either one:** narrow the clause to "README 比对用的临时目录用后即删；`npm_config_cache` 目录留在 `$TMPDIR` 由系统回收", or capture the npm cache dir in a variable and remove it too.

## Unresolved ambiguity

**None.** Nothing in v6 introduces a choice. The four literals, the one-ASCII-space R2 separator, the two bounded authoring latitudes with their 取法, the mandated 001 → 002 → 003 → 004 order, the two-part per-task acceptance, and the three delivery reconciliation items are all unchanged and fully determined. Finding 1 is a correction to make, not a decision to resolve.

## Notes

- **The diagnostic is now genuinely useful rather than merely correct.** v4's version pointed at the wrong replacement; v5's was right but imprecise; v6 states what the check *can* diagnose (R3a over-consuming at `:52`), what it *cannot* (R2, invisible here and caught by the anchor counts plus the byte figure), and where the remaining errors surface instead (R1/R3b at `:60`, inside a block already expected red). That is the shape a failure-triage note should have, and every element of it reproduces against the repository.
- **One latent trap worth knowing, not a defect as written.** Because cleanup is joined with `;`, the compound line's exit status is `rm`'s, not `diff`'s — so a README divergence would print output but leave status 0. The Verification correctly checks *output* ("README 标题行 `diff` 无输出"), so this is fine today. It would silently stop working if anyone converted the check to an exit-code test under `set -e`.
- **Verification method note.** For the portability question I ran `/bin/sh -n` and then executed the block from the repo root rather than reasoning about POSIX conformance. Two commands, and it settles both syntax and behaviour — worth preferring over inspection whenever a shell snippet is short and side-effect-free.
- **Run position.** Across design, SPEC and PLAN this run has closed 4 majors and 29 minors. Every quantity asserted anywhere in the chain has been independently reproduced against the repository: the byte account (115 / 411 / 26 / 609 = 1161 and 10,129 / 13,155 / 12,629), the twelve frozen literals, the 21-pattern split with its single negative assertion, the block counts 10 / 16 / 22 and the file-global 224, the six-state failure table, the three per-task failure sets, and now the gate-block anchor mapping. The PLAN is executable as it stands.

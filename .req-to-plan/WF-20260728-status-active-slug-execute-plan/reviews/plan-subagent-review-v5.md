# Plan subagent review v5

## Verdict

**approve.** All five remediations landed and are correct, SPEC-FRAGMENT-002 is now fully executed, and the not-adding-a-20th-assertion call is right. **I have nothing above minor** — three minor defects remain, one of them introduced by the v5 edits, and none blocks execution. The PLAN stage and the run can close.

## Verified facts

Narrow delta check. Read-only. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

Per instruction I did not re-measure the three failure sets or re-walk coverage beyond what the edits touched. Coverage spot-confirmed unchanged where it could have moved: Spec References still 6 / 4 / 1 / 2 = **13**, Trace still **4** rows, all **9** SCOPE-IN items still named in steps.

### 1. The diagnostic rewrite — the load-bearing claim is exactly right

I re-derived the mapping from scratch rather than trusting my v4 note: extracted the eight regex literals from the `gate, ledger, and dispatch` block and matched each against every line of the fragment.

**Actual anchor lines: {11, 22, 24, 52, 56, 56, 58, 58}** — identical as a multiset to what the PLAN states. And the claim that carries the whole diagnostic:

- R2's anchor `Require a compact result and the paths it believes it wrote.` is on **`:54`** (confirmed).
- **`54` is not in the anchor set.** So no gate-block assertion covers R2's line, and the conclusion — R2 errors leave the block green, and a red block means R3a or R3b disturbed covered text — is sound and actionable.

Three precision nits in how it is phrased are Finding 2; none of them changes the guidance.

### 2. The token-line step — and the no-20th-assertion call is correct

The step reads: "台账状态词汇未变：`pending|in-flight|done|failed` 在 fragment 中仍为 1 次且逐字未变。**这条没有任何测试兜底** —— 全套 247 条测试里没有一条提到这个 token 集合，而 SPEC-FRAGMENT-002 与 RISK-STATE-001 都依赖它，所以它只能在这里人工核。"

Independently re-confirmed: the token line is at fragment `:49`, occurs once, and `grep` finds **zero** occurrences of that token string in `test/skill-behavior.test.js`.

**Not adding a 20th assertion is the right call, for three independent reasons:**

1. Raw requirement R5 authorises exactly 19 assertions, and the SPEC's checkpoint explicitly forbids "补写需求未授权的断言".
2. A 20th would break the block counts `10 / 16 / 22`, which are an acceptance criterion in both SPEC-TEST-002 and PLAN-TASK-002.
3. It would break the file-global `224`, likewise an acceptance criterion.

So the manual check is the only conforming way to cover it, and the step says so in its own text. On skippability: the step carries bold emphasis and states it is the only place the check exists. It is also **step 8 of 12**, so it falls inside the Verification's (stale) "上面 8 步" — the item you were most concerned about is not the one at risk. Two other steps are; see Finding 1.

### 3. SPEC-FRAGMENT-002 — now fully executed, no postcondition left out

All five postconditions now have a step in PLAN-TASK-001:

| SPEC-FRAGMENT-002 postcondition | PLAN step |
|---|---|
| `Between tasks…` = 1, verbatim | step 7 |
| `record the command-backed criteria as \`skipped\`` = 1 **and** `functional acceptance not run` = 1 | step 7 — **both** now |
| ledger token line `pending\|in-flight\|done\|failed` = 1, set unchanged | step 8 |
| `verdict` = 0 | step 7 |
| three untouched fragments + `lib/skills.js` description byte-invariant | step 9 |

**Nothing remains unexecuted.** Step 9 is in fact *stricter* than the SPEC asks: the SPEC pins `lib/skills.js` 的 description, the step pins the whole file's byte count. That is a safe tightening — the file is out of scope entirely, so whole-file invariance is the honest check.

### 4. RISK-CONV-001 — reassigned correctly and the fragment gap is closed

The Risk Handling row now reads "PLAN-TASK-001（fragment 新增行）、PLAN-TASK-002（测试文件新增行）、PLAN-TASK-003（生成内容）", which matches where the three scans actually run. PLAN-TASK-001 gained step 10 — "对本任务新增行（`git diff` 的 `+` 行）扫 U+2014 与 U+2013，各为 0" — so the fragment's added lines are now scanned **directly**, not merely transitively through TASK-003's packed scan. The v4 gap is closed.

### 5. TASK-004's shell block — POSIX-portable, no repo collision

```sh
grep '^#' README.md > /tmp/h-en.txt && grep '^#' README.zh-CN.md > /tmp/h-cn.txt && diff /tmp/h-en.txt /tmp/h-cn.txt
```

- **Portable**: output redirection, `&&`, `grep`, and `diff` are all POSIX. No process substitution. Runs under `dash`/`sh`, not only bash. The v4 defect is fixed, and the explanatory comment says why.
- **No repo collision**: both paths are outside the repository, so they cannot shadow or clobber anything under `/Users/xubo/x-studio/xsk`. I also confirmed no repo file references those names. Neither file exists on this machine right now.

A residual hygiene point about the fixed paths is Finding 3.

## Findings

### 1. MINOR — v5 added three steps to PLAN-TASK-001 but left the Verification saying "上面 8 步"

**Claim.** PLAN-TASK-001 now has **12** steps; its Verification still opens "逐条执行上面 8 步的计数并贴出实际数值".

**Evidence.** Counted: TASK-001 = 12 steps (TASK-002 = 8, TASK-003 = 5, TASK-004 = 9). At v4 the task had 9 steps and "8" plausibly meant the eight non-bookkeeping ones; after v5 added the token-line, three-fragment, and dash-scan steps, "8" is wrong under either reading. It is the only stale step reference in the file.

Under a literal reading of "the 8 steps above", the ones that fall outside are **step 9 (three-fragment + `lib/skills.js` byte invariance)** and **step 10 (fragment added-lines dash scan)** — precisely the two v5 additions that close v4 Findings 2 and 3. Step 8 (token line) is safely inside, and step 11 (`wc -c` = 10129) is separately restated in the same Verification sentence, so it cannot be missed.

**Fix.** Change "上面 8 步" to "上面各步" or to "上面 11 步"; the count will drift again otherwise.

### 2. MINOR — three precision nits in the new diagnostic sentence

The operative guidance is correct and I verified it; these are phrasing issues.

- **"分别锚在 `:11`、`:22`、`:24`、`:52`、`:56`、`:56`、`:58`、`:58`"** — "分别" implies a one-to-one correspondence in order. The list is the *sorted* multiset; the actual per-assertion order in the source block is `11, 24, 52, 22, 56, 56, 58, 58`. Because the PLAN does not enumerate the eight assertions, there is no visible ordering to map against, so it reads correctly as a set — but "分别" invites the stricter reading. "这 8 条落在 …… 这几行上" would be exact.
- **"R3b（`:58`）"** — R3b's replacement target is on fragment **`:60`** (confirmed), not `:58`. `:58` is the line whose assertions would be damaged if the replacement spilled. For R3a the parenthetical is correct on both counts (`:52` is both the edit site and the covered line), which makes the asymmetry easy to miss.
- **"R2 追加落错位置……不会让它变红"** — true under the prescribed skeleton, where a literal-anchor `replace()` can only land at the unique `:54` occurrence. It would not hold for arbitrary hand-editing that pasted the R2 text into, say, `:56`'s covered sentence. Since the PLAN mandates the skeleton this is safe, but the claim is broader than its own guarantee.

### 3. MINOR — TASK-004 now writes two fixed-path temp files, and the "writes no file" line is no longer literally true

**Claim.** `Files: - N/A` carries the continuation "本任务不写入任何文件"; the v5 skeleton writes `/tmp/h-en.txt` and `/tmp/h-cn.txt`.

**Evidence.** Two `>` redirections to fixed, predictable paths in a shared, world-writable directory. Nothing in the repo is affected — I verified both paths are outside it and that no repo file references those names — so the `Files:` field and the `non_code` type remain accurate for their purpose. But the sentence is now inaccurate as written, and fixed `/tmp` names are the classic predictable-temp-file pattern: a pre-existing file from another user or process would be clobbered, or the redirect would fail on a permissions error that looks like a README parity failure.

**Fix.** Use `mktemp` here too, which is what the line two above already does for the npm cache — e.g. `d="$(mktemp -d)"` then write into `"$d"`. Adjust the continuation line to "本任务不写入仓库内任何文件" so it stays true.

## Unresolved ambiguity

**None.** Re-checked strictly against v5:

- **The four literals and the R2 separator** — copied from SPEC-FRAGMENT-001's byte-verified fences; one ASCII space pinned in both skeleton and step.
- **The two bounded authoring latitudes** — 取法 fixed for the 19 message strings and the budget comment; SPEC-TEST-004's numbered checklist is the criterion.
- **The token-line check** — now explicitly a manual step, with its lack of a backstop stated in the step itself rather than left implicit. That converts what was an unexecuted mitigation into a named, ownerless-no-longer check.
- **Execution order, per-task acceptance, the three delivery reconciliation items** — all unchanged and fully determined.

Findings 1-3 are corrections to make, not choices to resolve. No step requires a decision the PLAN does not make.

## Notes

- **The token-line step is the best kind of finding-fix**: rather than inventing a 20th assertion that would have violated the requirement's authorisation and broken two acceptance counts, it names the gap in the artifact and assigns it to a human check with the reason attached. A future reader learns both that the check exists and why it cannot be automated under this requirement's constraints.
- **Re-deriving the eight anchor lines independently was worth it.** The multiset matched, which is the claim that matters — but the per-assertion order does not, and that only surfaces if you recompute rather than trust the prior note. Worth remembering that "the set is right" and "the mapping is right" are different assertions.
- **Finding 1 is the only thing v5 broke**, and it is the characteristic risk of adding steps to a task whose Verification counts them. If the count is going to be restated, "各步" is more durable than a number.
- **Cumulative position.** Across design, SPEC and PLAN this run has closed 4 majors and 26 minors. Every quantity asserted anywhere in the chain — the byte account, the 21-pattern split, the block counts, the six-state failure table, the three per-task failure sets, and now the eight gate-block anchor lines — has been independently reproduced against the repository. From my side the PLAN is executable as it stands and the run is closeable.

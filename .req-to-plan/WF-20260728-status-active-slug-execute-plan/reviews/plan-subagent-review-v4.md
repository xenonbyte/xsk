# Plan subagent review v4

## Verdict

**approve with notes** — the PLAN is executable end to end, and its highest-risk content is exactly right: all three per-task expected-failure sets match my own measurements test-name for test-name, and coverage of the 13 SPEC contracts, 9 SCOPE-IN items and 9 risks is complete with nothing double-assigned or orphaned. Four minor defects, none blocking: the task-001 gate-block *diagnostic* is an unsound inference, SPEC-FRAGMENT-002 is executed at 2.5 of 5 postconditions, RISK-CONV-001 is assigned to the wrong task, and one shell block needs bash.

## Verified facts

Read-only on the repo. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

### 2. The per-task expected-failure sets — all three correct

Every number and every test name checked against clones I built during the SPEC audits:

| PLAN claim | My measurement |
|---|---|
| **TASK-001**: `tests 247 / pass 243 / fail 4` | **247 / 243 / 4** ✔ |
| its four named failures | ✔ all four match character-for-character: `golden: masked shell matches the committed golden fixture per skill`, `golden: committed skills/<base>/SKILL.md matches buildSkill output (packed source stays in sync)`, `skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting`, `skill-behavior: xsk-execute-plan: stays inside its byte budget` |
| **TASK-001**: `gate, ledger, and dispatch` still green | ✔ green — not among the four failures |
| **TASK-002**: `tests 247 / pass 245 / fail 2`, reds = the two `golden:` cases | **247 / 245 / 2**, both `golden:` ✔ |
| **TASK-002**: the other three must have turned green | ✔ confirmed with explicit pass lines for `gate, ledger, and dispatch`, `acceptance, recovery, and reporting`, and `stays inside its byte budget` |
| **TASK-003**: `tests 247 / pass 247 / fail 0` | **247 / 247 / 0** ✔ |
| TASK-002: file-global `assert.ok` = 224 | ✔ 205 + 19 |
| TASK-002: block counts 10 / 16 / 22 | ✔ |
| TASK-004: HEAD still `4c1a081` | ✔ |

The **"gate block must still be green"** assertion is correct. The inference attached to it is not — see Finding 1.

### 4. The dash-scan instruction — line numbers right, wording safe

`grep -nP '\x{2014}' test/skill-behavior.test.js` → **8 57 120 135 155 198 238**, exactly the seven the PLAN names. En-dash count is 0. The wording — "是本次不接触的既有文本" — states non-involvement and carries no imperative; it cannot be read as licence to edit them. Two independent guards reinforce it: the SPEC's Boundaries limit test-file edits to the caps, the budget comment, and the three content-contract blocks, and none of the seven lines falls in any of those. The instruction to scan only `git diff`'s `+` lines is objectively executable.

### 5. TASK-004's `non_code` / `Files: - N/A` encoding — honest

The task runs `npm test`, `npm run syntaxcheck`, `npm pack --dry-run` (dry run writes nothing), a README heading `diff`, and two `git` reads, then writes the delivery reconciliation as prose. `mktemp -d` creates a directory outside the repo. **Nothing in the task writes a repo file**, and nothing in the PLAN directs the reconciliation into a file. The encoding matches reality and hides nothing; the continuation line explains the gate constraint honestly rather than disguising a write.

### 3. Coverage — complete, nothing double-assigned or orphaned

- **13 SPEC contracts**: TASK-001 {FRAGMENT-001, FRAGMENT-002, STATE-001, REVIEW-001, REVIEW-002, REVIEW-003} = 6; TASK-002 {TEST-001..004} = 4; TASK-003 {GEN-001} = 1; TASK-004 {VERIFY-001, DELIVER-001} = 2. Union = **13 distinct**, no repeats, no omissions.
- **9 SCOPE-IN**: 001→001/002/003, 002→004/005/006/007, 003→008, 004→009. All nine, each once.
- **9 RISK**: each appears exactly once in the Risk Handling table. Assignments are sensible except RISK-CONV-001 (Finding 3).

Each task's Spec References do match what the task does. The one structural subtlety, which is correct rather than a defect: SPEC-STATE-001 / REVIEW-001 / REVIEW-002 are referenced by TASK-001 because they are contracts *about the fragment text*, while the assertions that verify them per the SPEC's Test Matrix are added in TASK-002. TASK-001 verifies them the only way it can at that point — "四段新文本各 1", i.e. the text landed verbatim — and TASK-002's "three blocks must turn green" closes the loop.

### 1. Executability — an implementer can carry this out without guessing

Every step is an instruction with a numeric or command-level check, not a restatement. Spot-checks:

- **TASK-001's skeleton** references undefined constants (`R1_OLD` …) but tells the implementer to copy them from SPEC-FRAGMENT-001's fenced blocks and not retype. That is unambiguous, and the SPEC's fences are byte-verified.
- **A `String.replace` hazard I checked and cleared**: the skeleton uses `s.replace(OLD, NEW)` with *string* replacements, where `$&`, `` $` `` and `$'` in the replacement would be interpreted as substitution patterns. I tested all eight literals — **none contains a `$`** — so the plain string form is safe here. (My own verification scripts used function replacers defensively; the PLAN does not need to.)
- **The two bounded authoring latitudes** both carry a 取法: the 19 message strings ("沿用文件既有英文口吻，一条一句一性质") and the budget comment ("覆盖 SPEC-TEST-004 编号 1 到 4"). No decision is left open.
- **The two human-judged criteria** (SPEC-TEST-004's four layers, SPEC-DELIVER-001's three reconciliation items) are exactly the two the SPEC already declared as such, and each reduces to a named checklist.
- **README parity** currently holds — I ran the PLAN's own `diff` and it produces no output, so the regression check is meaningful and will not fire spuriously.

## Findings

### 1. MINOR — task 001's "if the gate block is red, the R2 append landed wrong" is an unsound inference in both directions

**Claim.** TASK-001's Verification says `gate, ledger, and dispatch` must be green and adds "它若也红，说明 R2 追加落错了位置".

**Evidence.** The block holds eight pre-existing assertions, and I mapped each to the fragment line it matches: `:11` (out-of-scope actions), `:22` (orchestration-owned path), `:24` (exclusive-worktree declaration), `:52` (`The ledger is a recovery log…`), `:56` ×2 (invariants twice; two separately sourced facts), `:58` ×2 (`A task that ends failed…`; `Between tasks…`). **R2's anchor is on `:54`, and not one of the eight matches any text on `:54`.**

So the inference fails both ways:

- *Not sensitive.* R2's realistic failure modes — two spaces instead of one, a newline instead of a space, a mistyped word — all leave the gate block **green**. They are caught instead by the 10,129 byte count and the "四段新文本各 1" count, both already in the steps. The one check that would detect them is not the one the PLAN points at.
- *Not specific.* If the block *is* red, the damage is to `:11/:22/:24/:52/:56/:58` — none of which R2 can touch, since the skeleton's literal-anchor `replace()` can only land at the unique `:54` occurrence. The plausible causes are an R3a mishap damaging `:52`'s `The ledger is a recovery log…` sentence, which sits in the same line as R3a's anchor and has **no step-level count check in the PLAN**, or an R3b mishap damaging `:58` — the AC-3 mis-edit hazard the design called 最强的误改诱因.

**Why minor rather than major.** The acceptance criterion itself ("failure set exactly these four") is correct and would fail correctly, so the run still stops. Step 7 also count-checks `Between tasks…` before the suite runs, which pre-empts the `:58` case. Only the diagnosis is wrong — but under the one failure mode it cannot pre-empt (an R3a mishap at `:52`) it sends the implementer to inspect a correct edit.

**Fix.** Replace the clause with something like: "它若也红，问题不在 R2（R2 改的 `:54` 不被这 8 条断言覆盖），而在 `:52` 的 `The ledger is a recovery log…` 或 `:58` 两句之一被替换动作波及。"

### 2. MINOR — SPEC-FRAGMENT-002 is executed at 2.5 of its 5 postconditions, and one has no backstop anywhere

**Claim.** TASK-001 step 7 is the PLAN's whole execution of SPEC-FRAGMENT-002. It checks `verdict` = 0, `Between tasks…` = 1 verbatim, and `functional acceptance not run` = 1.

**Evidence.** SPEC-FRAGMENT-002 lists five postconditions, "全部可用精确子串计数判定":

| Postcondition | PLAN step | Backstop if unstepped |
|---|---|---|
| `Between tasks…` = 1, verbatim | ✔ step 7 | assertion in gate block |
| `record the command-backed criteria as \`skipped\`` = 1 **and** `functional acceptance not run` = 1 | **half** — only the second | the acceptance-block assertion starts *at* `functional acceptance not run`, so the `skipped` phrase itself is unasserted |
| ledger token line `pending\|in-flight\|done\|failed` = 1, set unchanged | **none** | **none** — `grep` finds 0 assertions mentioning the token string anywhere in the suite |
| `verdict` = 0 | ✔ step 7 | none needed |
| other three fragments + `lib/skills.js` description byte-invariant | **none** | `test/golden.test.js` (a changed fragment breaks that skill's golden) — strong |

The consequence that matters: the Risk Handling table marks **RISK-STATE-001 `[ADDRESSED]` by PLAN-TASK-001**, but risk_discovery's stated mitigation is "用 grep 确认 `verdict` 零命中，**并确认台账 token 集合未变**". The PLAN executes the first half only, and the second half is the one postcondition with no test backstop.

**Weight.** Real breakage risk is close to zero — the four replacements are literal and none touches `:49`. This is an unexecuted mitigation claimed as ADDRESSED, not a live hole. Adding two substring counts to step 7 closes it at no cost.

### 3. MINOR — RISK-CONV-001 is assigned to PLAN-TASK-002, but its mitigation executes in PLAN-TASK-003

**Claim.** The Risk Handling table maps RISK-CONV-001 → PLAN-TASK-002.

**Evidence.** RISK-CONV-001 is "生成内容混入仓库禁止的字符", and risk_discovery's mitigation is "生成后对 packed 与 golden 扫描 U+2014 与 U+2013". That scan is **TASK-003's** step ("对生成的 packed 内容扫 U+2014 与 U+2013，各为 0"), not TASK-002's. TASK-002 scans its own `git diff` added lines in `test/skill-behavior.test.js` — a file that is not generated content and is not what RISK-CONV-001 covers.

The risk also names the fragment as a contamination source ("实现者在 fragment 里补写连接词"), and **no task dash-scans the fragment's added lines directly** — TASK-001 has no dash step at all. It is covered transitively, because TASK-003's packed scan contains the fragment text verbatim, so nothing escapes.

**Weight.** Attribution error, not a verification hole. Scanning packed is also sufficient for golden, since golden is packed with the shared body masked out and therefore contains strictly less text. Fix is to move the row to PLAN-TASK-003, or split it across 002 and 003.

### 4. MINOR — TASK-004's shell block is marked `sh` but requires bash

**Claim.** The skeleton is fenced ```sh and contains `diff <(grep '^#' README.md) <(grep '^#' README.zh-CN.md)`.

**Evidence.** `<(...)` is bash/zsh process substitution and is a syntax error under POSIX `sh` (dash). An implementer copying the block into a `sh` invocation gets a failure that looks like a README parity problem rather than a shell problem. I confirmed the check itself is correct — run under bash it produces no output today, so the regression assertion is sound.

**Fix.** Either retag the fence ```bash, or use a portable form such as `grep '^#' README.md > a && grep '^#' README.zh-CN.md > b && diff a b`.

## Unresolved ambiguity

**None.** Applying a strict reading:

- **The 19 message strings** — 取法 fixed (file's existing English voice, one sentence, one property each). Bounded.
- **The budget comment** — 取法 fixed, with SPEC-TEST-004's numbered four-item checklist as the criterion and the "no style or length requirements" clause preventing scope creep.
- **The four literals** — copied verbatim from SPEC-FRAGMENT-001's byte-verified fences; the R2 separator is pinned to exactly one ASCII space in both the skeleton and step 3.
- **Execution order** — mandated 001 → 002 → 003 → 004 with the rejected alternative named and its consequence given.
- **Acceptance for every task** — two-part and fully determined: own counts/bytes plus an exact failure-set match, with 247-green reserved for 004.
- **The delivery reconciliation** — three named items, each with prescribed content.

Nothing requires a decision the PLAN does not make. Findings 1-4 are errors to correct, not choices to resolve.

## Notes

- **The riskiest part of this PLAN is the part that is most right.** The three expected-failure sets are where a wrong number would silently derail execution, and all three reproduce exactly — including the counter-intuitive detail that `stays inside its byte budget` is red at task 001 and green at task 002 (the cap moves in one state, the file in the other). The PLAN also correctly reserves "all green" for task 003 alone among the intermediate boundaries.
- **The `$`-in-replacement hazard is worth recording as checked-and-clear**, because it is invisible until it bites: `String.prototype.replace` with a string replacement interprets `$&`, `` $` ``, `$'` and `$n`. None of the eight literals contains a `$`, so the skeleton's plain form is safe. If any future literal gains one, the skeleton must switch to a function replacer.
- **The "本任务闭合 SCOPE-IN-00N" checkbox** at the end of each task's Steps is bookkeeping rather than an action — there is nothing to *do* and nothing to check. Harmless, and it does make the trace legible inline, but it is the one step type that is a restatement. Not counted as a finding.
- **SPEC-VERIFY-001's fifteen stopping rows are distributed across all four tasks**, not concentrated in TASK-004 which references it: TASK-004 executes rows 10/12/13/15, TASK-001 rows 1-7, TASK-002 row 11, TASK-003 rows 8-9, and row 14 (dash scan of added lines) is split between TASK-002 and TASK-003. That distribution is correct for a layered matrix and I verified all fifteen are executed somewhere.
- **Cumulative position.** With this stage the run has closed 4 majors and 23 minors across design, SPEC and PLAN. Every quantity asserted anywhere in the chain — the byte account, the 21-pattern split, the block counts, the six-state failure table, and now the PLAN's three per-task failure sets — has been independently reproduced against the repository.

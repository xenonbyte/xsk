# Spec subagent review v2

## Verdict

**approve.** Plainly: both v1 majors are fully and correctly fixed, and I independently reproduced every row of the new measured table — including the two states I had not previously measured, which came back exactly as claimed (243/4 and 245/2, with the failing test names matching character-for-character). Three minors remain, all cosmetic or cross-referential; none affects an edit, a number, or a task's ability to pass its own acceptance.

## Verified facts

Delta check. Read-only on the repo; all states built in `tar` clones under the scratchpad. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

### Frozen literals — untouched, re-confirmed

Fingerprinting the SPEC body's fenced blocks gives 14 blocks with byte lengths `257, 60, 71, 183, 372, 410, 97, 792, 79, 454, 691, 129, 110` for S0-S12 — identical to v1. Only S13 changed (229 → 435 B), which is the intended SPEC-GEN-001 fix. I re-ran the full character-exact diff anyway since it costs one command: **all 12 frozen literals still byte-identical to `00-raw-requirement.md`, zero divergences.** The four old anchors still occur exactly once each in the live fragment, and all 21 patterns still evaluate correctly (8/11 split, 18 positives match, the negative correctly does not). No byte recomputation was needed and none of the accounting moved.

### 1. The measured table — every row independently reproduced

I built each state from the SPEC's own literals in separate clones and ran `node --test`:

| State | SPEC claims | I measured | Failing names match? |
|---|---|---|---|
| baseline | 247 / 247 / 0 | **247 / 247 / 0** | n/a |
| task 1 only | 247 / 243 / 4 | **247 / 243 / 4** | **all four, exactly** |
| task 2 only | 247 / 245 / 2 | **247 / 245 / 2** | yes (measured in v1) |
| tasks 1+2, no regen | 247 / 245 / 2 | **247 / 245 / 2** | **yes, the two `golden:` tests** |
| tasks 1+2+3 | 247 / 247 / 0 | **247 / 247 / 0** | n/a |

The fragment-only row — the one you flagged as unverified — reproduces exactly, and the four names in the SPEC are character-identical to the runner's output:

```
✖ golden: masked shell matches the committed golden fixture per skill
✖ golden: committed skills/<base>/SKILL.md matches buildSkill output (packed source stays in sync)
✖ skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting
✖ skill-behavior: xsk-execute-plan: stays inside its byte budget
```

The fragment+tests-no-regen row likewise: exactly the two `golden:` tests, nothing else.

All three call-outs verified:

- **`stays inside its byte budget` is red under fragment-only and green under tests-only** ✔ — red because the fragment is 10,129 against a 9,000 cap; green under tests-only because the caps rose while the file did not change. Confirmed in both directions.
- **The two `golden:` tests are green under tests-only** ✔ — confirmed in v1, where all five `golden:` cases passed.
- **Tests-only reds are exactly the two content-contract blocks** ✔.

The mechanism behind the whole table is worth recording because it makes the numbers predictable rather than magical: `body()` at `test/skill-behavior.test.js:38` is `buildSkill(skill).content`, i.e. it regenerates from the fragment at run time. That is why every content-contract assertion flips the instant the fragment changes, and why only the two `golden:` tests — the ones that compare against *committed* artifacts — care about regeneration.

The restructured per-task acceptance is right: tasks 1-3 are now judged on their own counts and bytes plus an exact failure-set match, with "247 全绿" reserved for task 4. That removes the trap where task 2 could never pass its own gate.

### 2. R3b-vs-`:58` — restored in full

SPEC-FRAGMENT-002 now carries both reconciliations under the `Between tasks...` contract, with the R3b side explicitly labelled 更强的诱因. Checking it against `05-design.md` DES-STATE-001's second bullet, every load-bearing element survives: the fix is not an enumerated envelope task so `between tasks` does not reach it; the post-fix rerun is a **second** pass (the first ran and failed, which is why a fix exists) explicitly rationed to one; `under every step 4 rule` means task discipline (self-contained prompt, allowed paths, double invariant check, two separately sourced facts, `done`/`failed` writing). It closes with "这是解释而非文本自明，字面张力在 fragment 里仍然存在" and pins the contract's actual test as mechanical (count 1, wording verbatim). This is a faithful carry, not a summary.

### 3. SPEC-GEN-001 — fixed, and better than requested

S13 is now **byte-identical to the raw requirement's R8 recipe** (435 B), not a rewrite: `require('fs')`, `require('./lib/generator')`, `require('./lib/skills')`, the `sharedTrim` definition, and template-literal output paths derived from `s.fragmentBase` / `s.name`. Runnable as written, and it no longer hardcodes paths that could drift from the registry.

### 6. Byte-budget scope — fixed and accurate

SPEC-TEST-004 now states both the comment and the 19 message strings sit in `test/skill-behavior.test.js`, which is outside every byte budget, so neither enters the 1,161-byte account. Accurate: the two caps constrain only the behavior fragment and the packed skill.

### Structure — intact after the edits

13 `### SPEC-*` contracts, 13 Test Matrix rows, 13 Trace rows — one-to-one, no orphans, unchanged from v1. SPEC-VERIFY-001's table still has exactly 15 data rows, matching its "表内 15 行" reference.

## Findings

### 1. MINOR — three patterns are still unclaimed; the stated mechanism for two of them does not hold

**Claim.** You reported that broadening SPEC-STATE-001 to "返回下界与任务状态映射" makes B1/B2 belong to it. It does not, and B6 was not addressed either.

**Evidence.** Tallying every pattern against the Test Matrix's 验证手段 columns:

| Pattern | Claimed by |
|---|---|
| A1-A7 | SPEC-STATE-001 (now explicitly enumerated) |
| A8 `for step 5's bounded fix` | SPEC-REVIEW-002 |
| B3, B4, B5 | SPEC-REVIEW-001 |
| B7-B11 | SPEC-REVIEW-002 |
| T3-2 | SPEC-REVIEW-002 |
| **B1** `/diff against \`base\` itself/` | **none** |
| **B2** `/the diff against \`base\`/` (negative) | **none** |
| **B6** `/A valid concern or command failure is a functional failure/` | **none** |
| T3-1 | block-level only (SPEC-TEST-003's row) |

The 7 + 1 split you describe **did land and is correct** — SPEC-STATE-001's row enumerates the seven state-mapping patterns and SPEC-REVIEW-002's row explicitly takes A8 as the ledger-boundary assertion, with "7 条" arithmetic checking out on both rows (7, and 1 + 5 + 1). No pattern is double-claimed.

But B1/B2 are about the **reviewer** fetching the diff (R1), not about the implementation subagent's return, so a title broadened to "实施子代理的返回下界与任务状态映射" does not reach them — and SPEC-STATE-001's row does not mention them. Semantically they belong to SPEC-FRAGMENT-001, whose row still lists only substring counts and `wc -c`. B6 belongs to SPEC-REVIEW-001 or -002 and appears in neither.

**Weight.** No coverage is lost: SPEC-TEST-002's row covers all 19 collectively via `npm test` plus the 10 / 16 / 22 counts, and I confirmed all three patterns evaluate correctly. This is a cross-reference gap only. Adding B1/B2 to SPEC-FRAGMENT-001's row and B6 to SPEC-REVIEW-001's closes it.

### 2. MINOR — "本 SPEC 唯一一条主观判据" is an overclaim contradicted by the SPEC's own Test Matrix

**Claim.** SPEC-TEST-004 asserts it is the SPEC's only subjective criterion.

**Evidence.** SPEC-DELIVER-001's pass criterion is "四项齐备；无新 commit". Of its four delivery items, only the last ("确认工作区不含任何 commit") is mechanical via `git log`. Item 1 — "逐条说明这 1,161 字节买到了什么" — is a prose-adequacy judgement of exactly the same kind as "四层齐备", with no greppable criterion. Item 2 (the fixed-snapshot explanation) is likewise judged, though the SPEC specifies its content tightly. Only item 3 has a mechanical negative check, supplied by SPEC-REVIEW-003's row.

**Weight.** Low, and slightly self-inflicted: the reduction of "四层齐备" to a numbered four-item checklist with no style or length requirements is a real improvement and does make it the *most* constrained of the subjective checks. The word to fix is "唯一".

### 3. MINOR — the task DAG permits an ordering with no row in the table, under which task 3's stated outcome is false

**Claim.** `:314` gives dependencies as "2 依赖 1；3 依赖 1；4 依赖 2 与 3". That permits 1 → 3 → 2. Task 3's description says "做完这一步 `npm test` 应当全绿", and the new acceptance rule requires the failure set to equal "上表对应行". Neither holds for that ordering.

**Evidence.** I built tasks 1 + 3 with task 2 not done (fragment 10,129, regenerated packed 13,155 and golden 12,629, test file untouched at caps 12000/9000):

```
ℹ tests 247   pass 245   fail 2
✖ skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting
✖ skill-behavior: xsk-execute-plan: stays inside its byte budget
```

That state appears nowhere in the five-row table, so "失败集合与上表对应行逐条相等" is undefined for it, and task 3's "应当全绿" is false under it. The table's note that "任务 1 与 2 的顺序不影响终态" contemplates swapping 1 and 2 but not moving 3 ahead of 2.

**Weight.** Low. "依赖是严格串行的" plus the numbered list arguably already fixes execution to 1 → 2 → 3 → 4, and the terminal state is order-independent. One clause — "任务按列出顺序执行" — removes the ambiguity, or a sixth row covers it. Task 3's *own* acceptance (two separate comparisons, 13,155 / 12,629) is order-independent and correct either way.

## Unresolved ambiguity

**None that blocks an implementer.**

- **The 19 message strings** and **the R7 comment prose** — both still bounded and decided, with SPEC-TEST-004's new four-item checklist tightening the second one and explicitly declining to add style or length requirements. Good.
- **The R2 join** — still pinned to exactly one ASCII space, still load-bearing for the 411.
- **Which existing assertion gets which new pattern** — SPEC-TEST-003 still identifies each by property string and line range.
- **Assertion insertion position within a block** — I raised this in v1 as worth pinning, and v2 resolves the concern that motivated it: the failure descriptions now name *test cases*, not individual assertions, so ordering inside a block no longer affects whether a task's acceptance can be evaluated. Position remains unspecified and is now genuinely inert.
- **Task ordering** — the one residual, tracked as Finding 3; it is an ambiguity in execution sequence, not in what to write.

## Notes

- **The table is the right artifact.** Replacing a one-line prose claim with five measured states, exact failing names, and three explicit "do not infer this" call-outs converts the weakest part of the SPEC into its most verifiable. Every number and every test name reproduced on my side; I found no discrepancy of any kind in it.
- **The fragment-only row is the most valuable one**, and it is the row that most repays having been measured rather than reasoned: `stays inside its byte budget` going red there while going green under tests-only is genuinely counterintuitive (the cap moves in one state, the file in the other), and it is exactly the kind of thing an implementer would have mis-predicted.
- **SPEC-FRAGMENT-002 is now the better home for the `:58` argument than the design was.** Putting both reconciliations under the contract whose test is mechanical — count 1, wording verbatim — makes the relationship between the reasoning and the check explicit in a way DES-STATE-001 did not, since there the reasoning sat in a state-mapping section while the guard lived elsewhere.
- **Nothing regressed.** The frozen literals, the anchor uniqueness, the 8/11 pattern split, the negative assertion, the 13/13/13 structure, and SPEC-VERIFY-001's 15 rows all still hold as measured at v1. The only fence that changed is the one that was supposed to.
- **Cumulative position across this run:** design closed 2 majors and 12 minors, SPEC has now closed 2 majors and 3 of 4 minors. Every number that has been asserted at any stage — 115 / 411 / 26 / 609 = 1161, 10,129 / 13,155 / 12,629, 10 / 16 / 22, 205 → 224, 247, and now the five-state failure table — has been independently reproduced. The SPEC is implementable as it stands.

# Spec subagent review v3

## Verdict

**changes requested** — all three v3 edits landed and are correct in themselves, but the newly mandated 1 → 2 → 3 → 4 order moved task 2's boundary state without updating the three bullets below the table, so the SPEC now tells PLAN to copy a prescription ("把 golden 写进任务 2 的预期红名单同样是错的") that directly contradicts its own row for task 2's terminal state.

## Adjudication

### DISPUTE 1 — finding **stands**, but the fault in communicating it was mine

**Outcome: upheld.** The three unclaimed patterns are not the ones you read me as naming. This was a label collision I created: in my v1/v2 reviews I labelled the `gate, ledger, and dispatch` block's eight patterns **A1-A8** and the `acceptance, recovery, and reporting` block's eleven **B1-B11**. You read "B1/B2/B6" as indices into the eight-pattern gate list, which maps to my A1/A2/A6. Those three *are* claimed by `:295`, and your reasoning about them is entirely correct — they come from the R2 text appended to step 4's dispatch paragraph.

The three I meant, in full text rather than labels:

| Pattern | Block | Origin | Claimed by |
|---|---|---|---|
| `` /diff against `base` itself/ `` | acceptance, recovery, and reporting | R1 reviewer-dispatch sentence | **none** |
| `` /the diff against `base`/ `` (the negative assertion) | acceptance, recovery, and reporting | R1 reviewer-dispatch sentence | **none** |
| `/A valid concern or command failure is a functional failure/` | acceptance, recovery, and reporting | R3b reviewer/fix protocol | **none** |

Quoting `:295` as requested — it enumerates seven patterns, **all seven from the gate block**, and none of the three above appears:

> `| SPEC-STATE-001 [ADDRESSED] | `gate, ledger, and dispatch` 块新增 8 条中的前 7 条：`Require nothing else back`、`For each task-acceptance check...exit result`、`` or `not run` and why ``、``an omitted check becomes `not run: not reported` ``、``any failed final check...makes the task `failed` ``、``missing or malformed task result makes the task `failed` ``、``Otherwise write `done` and keep the check evidence for step 7`` | 7 条全部通过 |`

I walked all thirteen Test Matrix rows again. Block B's eleven patterns are claimed as: positions 3, 4, 5 by SPEC-REVIEW-001 (`no concerns` / concern 行 / 空或畸形) and positions 7-11 by SPEC-REVIEW-002 (envelope / 台账标记 / step 4 继承 / 诊断输入 / failed 路由) — eight of eleven. Positions 1, 2, and 6 are claimed by no row.

My v2 rationale ("about the reviewer, not the implementation subagent") was correct for the patterns I meant and wrong-sounding for the ones you thought I meant. Both of us were right about different sets. The substance is unchanged from v2 and the severity stays **minor**: SPEC-TEST-002's row covers all 19 collectively via `npm test` plus the 10 / 16 / 22 counts, so nothing is unverified — only the per-contract cross-reference is incomplete.

### DISPUTE 2 — **withdrawn, and no edit is needed: your names were already my names**

**Outcome: you are right, and so was my review file.** I never reported `gate, ledger, and dispatch` for the 1 → 3 → 2 state. My v2 review, Finding 3, contains verbatim:

```
ℹ tests 247   pass 245   fail 2
✖ skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting
✖ skill-behavior: xsk-execute-plan: stays inside its byte budget
```

That is character-identical to what you measured. Re-measured today in a fresh clone (fragment 10,129, regenerated packed 13,155 / golden 12,629, test file untouched at caps 12000/9000):

```
✖ skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting (0.933583ms)
✖ skill-behavior: xsk-execute-plan: stays inside its byte budget (0.313583ms)
ℹ tests 247   pass 245   fail 2
```

Your mechanism is right too: the gate block stays green because its eight pre-existing assertions cover text this change does not touch, and the byte test goes red because 13,155 and 10,129 are measured against the still-unraised 12000/9000 caps. **The names you wrote into the SPEC's sixth row are correct and require no change.** This dispute was a misreading of my report rather than a measurement disagreement; the confusion most likely came from my summary message to you, which gave "245/2" without naming the tests.

## Verified facts

Narrow delta check. Read-only; the one state I re-measured was built in a fresh `tar` clone. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

### Nothing outside the two edited sections moved

Fence fingerprint is unchanged from v2 — 14 blocks, lengths `257, 60, 71, 183, 372, 410, 97, 792, 79, 454, 691, 129, 110, 435`. Per instruction I did not re-diff the literals or recompute byte figures; the fingerprint confirms there was no reason to. Structure holds at 13 contracts / 13 Test Matrix rows / 13 Trace rows.

### The three edits landed

1. **Mandated order** — `:PLAN Handoff` now carries "**执行顺序必须是 1 → 2 → 3 → 4，不得按依赖图另择合法拓扑序。**" It explicitly states the DAG alone would permit 1 → 3 → 2, gives that path's outcome as 245 / 2, names both failing tests correctly, explains the cause (R6's two patterns not yet swapped; the two caps not yet raised), and states why task 3's "should be green" is false there. Accurate against my measurement in every particular.
2. **Sixth table row** — `| 任务 1 + 3，未改测试文件（**被规定顺序排除**） | 247 | 245 | 2 | ... |` with the two correct names. Verified.
3. **SPEC-TEST-004** — now reads "**这是本 SPEC 两条需要人工判断的判据之一**（另一条是 SPEC-DELIVER-001 的"四项齐备"）". The v2 overclaim is gone and the cross-reference is correct.

## Findings

### 1. MAJOR — the order mandate moved task 2's boundary, but the three bullets below the table still describe the old one, and one of them now contradicts the table

**Claim.** Under the mandated 1 → 2 → 3 → 4, task 2's boundary state is "任务 1 + 2，未再生成" — which the table itself now labels "**规定顺序下任务 2 的终态**" and gives reds as "上表两条 `golden:` 用例". The bullets below still assume task 2's boundary is the "仅任务 2" state, which the mandate makes unreachable.

**Evidence.** The row and the bullet sit fourteen lines apart and say opposite things:

> Row: `| 任务 1 + 2，未再生成（**规定顺序下任务 2 的终态**） | 247 | 245 | 2 | 上表两条 `golden:` 用例 |`
>
> Bullet 2: **仅任务 2 时两条 `golden:` 用例是绿的**，因为 fragment 与两份产物仍然彼此一致。**把 golden 写进任务 2 的预期红名单同样是错的。**

Under the mandated order the two `golden:` tests **are** task 2's expected reds — I measured that state at 247 / 245 / 2 with exactly those two failing. Bullet 2's prescriptive sentence is therefore false as written.

Three leftovers from the pre-mandate framing, all the same root cause:

- **Bullet 2** (above) — its factual half is still true *about the "仅任务 2" state*; its prescriptive half is now false about task 2's actual boundary.
- **Bullet 3** — "**任务 2 单独完成时红的恰好是两个内容契约块**" describes a state the mandate excludes, exactly like the "任务 1 + 3" row. That row is marked **被规定顺序排除**; the "仅任务 2" row and this bullet are not.
- **The sentence introducing the table** — "任务 1 与 2 的顺序不影响终态" contemplates running 2 before 1, which the mandate forbids.

Bullet 1 survives intact: I confirmed `stays inside its byte budget` is green at the 1 + 2 no-regen state (behavior 10,129 ≤ 10,200; packed is rebuilt at run time to 13,155 ≤ 13,200), so "把它写进任务 2 的预期红名单是错的" remains true.

**Why this is major rather than cosmetic.** The bullets are introduced by "**三点由此得到确证，PLAN 必须照抄而不是自行推断**" — copy these verbatim, do not infer. A PLAN author following that instruction would write "golden must not be in task 2's expected-red list" into task 2's acceptance criterion, then hit exactly those two golden failures at task 2's boundary and conclude the task failed. That is the same failure mode as the original v1 MAJOR 1, reintroduced from the opposite direction. The operative rule two paragraphs down ("失败集合与上表对应行逐条相等") is correct and unambiguous, which bounds the damage — but the SPEC instructs PLAN to copy the bullets, not just the rule.

**Fix is small.** Mark the "仅任务 2" row **被规定顺序排除** alongside the "任务 1 + 3" row; rewrite bullet 2's second sentence to say that under the mandated order task 2's expected reds *are* the two `golden:` cases and that this is why regeneration is task 3; reframe bullet 3 as a statement about the excluded state; and drop or qualify "任务 1 与 2 的顺序不影响终态".

### 2. MINOR — three block-B patterns remain unclaimed by any contract row

Carried from v2 and upheld in Adjudication above: `` /diff against `base` itself/ ``, `` /the diff against `base`/ `` (negative), and `/A valid concern or command failure is a functional failure/`. Semantically the first two belong to SPEC-FRAGMENT-001 (whose row lists only substring counts and `wc -c`) and the third to SPEC-REVIEW-001. No coverage is lost — SPEC-TEST-002's row covers all 19 collectively, and I re-confirmed all three evaluate correctly. Cross-reference gap only.

## Unresolved ambiguity

**None introduced by v3, and one long-standing item now closed.**

- **Task execution order** — closed. This was my v2 Finding 3's residual; `:PLAN Handoff` now mandates 1 → 2 → 3 → 4 explicitly and says the DAG alone would permit otherwise. The ambiguity is gone; what replaced it is the inconsistency in Finding 1, which is a different problem (stale commentary, not an open choice).
- **The 19 message strings**, **the R7 comment prose** — still bounded and decided, unchanged by v3.
- **The R2 join**, **which existing assertion gets which new pattern**, **assertion position within a block** — unchanged and still inert.

No implementer is left with a choice to make. The one thing an implementer is left with is a contradiction to resolve, which is Finding 1.

## Notes

- **On my labelling.** The A/B block prefixes were mine, not the SPEC's, and they collided with a natural reading of "the eight gate patterns" as B-something. I have restated the three patterns by full text in the Adjudication section and will use full text rather than positional labels from here. The dispute cost a round-trip and that is on me.
- **Dispute 2 is worth one sentence of reassurance:** nothing in the SPEC needs changing there, and your independent measurement matching mine on all six table rows is the strongest evidence available that the table is right. Six states, six agreements, two of them measured twice from different clones.
- **The order mandate itself is the right call** and is argued well — it names the alternative topological order, gives its measured outcome, and explains why pinning the order is what makes each table row correspond to exactly one task boundary. Finding 1 is not an objection to the mandate; it is that the mandate's consequences were not propagated fourteen lines down.
- **Everything else in the SPEC is unchanged and still verified:** the twelve frozen literals, the four anchor uniqueness conditions, the 8/11 pattern split with its one negative assertion, the 13/13/13 structure, SPEC-VERIFY-001's fifteen rows, and the zero-dependency claim. The only fences that have ever changed across v1 → v3 are the SPEC-GEN-001 recipe, which was fixed deliberately and is now byte-identical to the raw requirement's R8.

# Spec subagent review v4

## Verdict

**approve.** Plainly: both edits landed and are correct against direct measurement. **I have no findings at any severity — no blocker, no major, no minor.** The SPEC stage can be closed.

## Verified facts

Narrow delta check. Read-only on the repo; the two states I measured were built in scratchpad clones. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

Per instruction I did not re-diff the frozen literals or recompute byte figures. The fence fingerprint confirms there was no reason to: 14 blocks, lengths `257, 60, 71, 183, 372, 410, 97, 792, 79, 454, 691, 129, 110, 435` — identical to v2 and v3. Structure holds at 13 contracts / 13 Test Matrix rows / 13 Trace rows. The contradictory bullet is gone (`grep` for "把 golden 写进任务 2 的预期红名单同样是错的" returns 0).

### 1. The three boundary bullets — each verified against measurement

**Task 1 boundary (row 2, 243 / 4).** All four claims check out against my fragment-only clone:

| Bullet claims | Measured |
|---|---|
| `stays inside its byte budget` red (10,129 vs cap 9,000) | ✔ red |
| both `golden:` red (artifacts not regenerated) | ✔ red |
| `acceptance, recovery, and reporting` red (R6 patterns not yet swapped) | ✔ red |
| `gate, ledger, and dispatch` **still green** | ✔ green — not among the four failures |

The stated cause for the third is right: at this boundary the test file is untouched, so the *old* R6 pattern `telling it to read the untracked paths directly...` no longer matches, because R1 inserted `diff against \`base\` itself and ` after `telling it to `.

**Task 2 boundary (row 4, 245 / 2).** This is the one you asked me to check specifically. Confirmed with explicit pass lines rather than inferred from the failure count:

```
✔ skill-behavior: xsk-execute-plan: gate, ledger, and dispatch (0.689417ms)
✔ skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting (0.688042ms)
✔ skill-behavior: xsk-execute-plan: stays inside its byte budget (0.613042ms)
ℹ tests 247   pass 245   fail 2
```

**Both content-contract blocks green, the byte-budget test green, and the only two reds are the `golden:` pair** — exactly as the bullet states. The two stated causes are also correct: the caps are now 13200 / 10200 (so 13,155 and 10,129 both fit), and the text the new assertions match was written into the fragment back in task 1.

**Task 3 boundary (row 6, 247 / 0).** I had previously only *inferred* this row, so I built the true terminal state today — fragment edits **plus** the full task-2 test file (caps, comment, all 19 new assertions, both pattern swaps) **plus** regeneration:

```
TERMINAL STATE: fragment 10129 | packed 13155 | golden 12629 | caps 13200/10200
ℹ tests 247   pass 247   fail 0
```

Green. That closes the last row I had not measured directly; all six rows of the table are now independently reproduced.

The `body()` = `buildSkill(skill).content` note is correctly demoted to an explanatory aside ("对照用的机制说明（不是任务边界）") rather than a boundary claim, which is the right placement — it explains *why* the table looks the way it does without being mistaken for a criterion.

### 2. All 21 patterns — each claimed exactly once, arithmetic sound

Re-walked every pattern against the v4 Test Matrix:

| Pattern | Claiming row |
|---|---|
| `Require nothing else back` … through … `Otherwise write \`done\` and keep the check evidence for step 7` (gate block, 7 patterns) | SPEC-STATE-001 |
| `` for step 5's bounded fix `` (gate block, 8th) | SPEC-REVIEW-002 |
| `` /diff against `base` itself/ `` (positive) | **SPEC-FRAGMENT-001** (new) |
| `` /the diff against `base`/ `` (negative) | **SPEC-FRAGMENT-001** (new) |
| `Require exactly \`no concerns\` when clean` / concern-line / `Empty or malformed review` | SPEC-REVIEW-001 |
| `/A valid concern or command failure is a functional failure/` | **SPEC-REVIEW-002** (new, as fix trigger condition) |
| envelope / 台账标记 / step 4 继承 / 诊断输入 / failed 路由 (5 patterns) | SPEC-REVIEW-002 |
| `` /read the untracked paths directly…/ `` (R6 replacement 1) | SPEC-TEST-003 |
| `` /Allow at most one bounded fix…/ `` (R6 replacement 2) | SPEC-TEST-003, cited by SPEC-REVIEW-002 |

**Coverage: 21 of 21.** No pattern is unclaimed. Per-row arithmetic:

- SPEC-STATE-001 — 7 enumerated, row says "7 条" ✔
- SPEC-REVIEW-002 — 1 (gate 8th) + 6 (`A valid concern` + envelope + 台账标记 + step 4 继承 + 诊断输入 + failed 路由) + 1 (SPEC-TEST-003 bounded-fix) = **8**, row says "8 条" ✔ (correctly incremented from 7)
- SPEC-REVIEW-001 — 3 enumerated, "全部通过" ✔
- SPEC-FRAGMENT-001 — 2 enumerated, "两条 R1 断言通过" ✔
- Block totals: gate 7 + 1 = 8 ✔; acceptance 2 + 3 + 6 = 11 ✔; replacements 2 ✔

**No double-claim.** The one pattern appearing in two rows is `` /Allow at most one bounded fix…/ ``, cited by SPEC-REVIEW-002 as evidence for the fix-revalidation property while owned by SPEC-TEST-003 as one of the two replacements. Those are different granularities serving different purposes, and neither count is corrupted: SPEC-REVIEW-002's 8 is internally consistent, and SPEC-TEST-003's row counts the block (22), not individual patterns. This cross-reference predates v4 and is intentional.

Pairing the positive and negative R1 patterns under SPEC-FRAGMENT-001 is the right home — together they are exactly what proves R1 landed on both sides (reviewer fetches it itself; the controller no longer relays it), and that is SPEC-FRAGMENT-001's subject.

## Findings

**None.** No blocker, no major, no minor. Both edits landed, both are correct against measurement, and I found nothing that the v4 edits broke.

## Unresolved ambiguity

**None.** Re-checked from scratch:

- **Task execution order** — closed at v3 (mandated 1 → 2 → 3 → 4), and v4 completes it by mapping each of the three intermediate boundaries to a specific table row and explicitly labelling rows 3 and 5 as unreachable under that order. The mapping is now total: every task boundary has exactly one row, and every row is either a boundary or marked as not one.
- **The 19 message strings** and **the R7 comment prose** — bounded, decided, unchanged.
- **The R2 join** (exactly one ASCII space), **which existing assertion gets which new pattern**, **assertion position within a block** — unchanged and inert.
- **Per-task acceptance** — fully determined: own counts and bytes, plus an exact failure-set match against the named row, with "247 green" reserved for task 4.

Nothing is left for an implementer to decide or to resolve.

## Notes

- **One observation worth recording for PLAN, not a defect.** SPEC-FRAGMENT-001's two new R1 assertions are not *observable* at task 1's boundary: they live at the end of the `acceptance, recovery, and reporting` block, which aborts at its second assertion (the not-yet-swapped R6 pattern) under `assert.ok`'s throw-on-first-failure. They become observable at task 2's boundary onward, where I confirmed the block is green. This creates no inconsistency — task 1's acceptance is explicitly "前后精确计数加 10,129 字节，**不是** `npm test`", and the Test Matrix is contract-scoped rather than task-scoped — but if PLAN ever wants to point at those two assertions as evidence, task 2's boundary is the earliest place it can.
- **"任务 1 与 2 的顺序不影响终态" reads correctly now**, and I withdraw the concern I raised about it in v3. Next to the order mandate it is not a permission but a supporting fact: the constraint costs nothing, because the terminal state does not depend on which of 1 or 2 ran first. That is a reason the mandate is cheap, not an exception to it.
- **All six table rows are now measured, not inferred.** Baseline, fragment-only, tests-only, fragment+tests-no-regen, fragment+regen-no-tests, and the terminal state — every one reproduced in an isolated clone, several of them twice from independently built clones, and every failing test name matched character-for-character. I am not aware of a number or a test name anywhere in this SPEC that has not been independently confirmed.
- **Cumulative position.** Across the design and SPEC stages this run has closed 4 majors and 19 minors; every asserted quantity — 115 / 411 / 26 / 609 = 1161, 10,129 / 13,155 / 12,629, 10 / 16 / 22, 205 → 224, 247, the 21-pattern split with its one negative, and the six-state failure table — has been independently reproduced. The SPEC is implementable as it stands and I would close the stage on it.

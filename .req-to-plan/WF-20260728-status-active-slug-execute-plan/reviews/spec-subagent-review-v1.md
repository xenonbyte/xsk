# Spec subagent review v1

## Verdict

**changes requested** — every one of the twelve fenced literals is byte-identical to the authoritative source and the whole byte account reproduces exactly, but the PLAN Handoff names the wrong failure set for task 2 (I measured it: golden and byte-budget are *green*, and the two tests that actually redden are unnamed), and the design's R3b-vs-`:58` reconciliation was dropped.

## Verified facts

Read-only throughout; all edits applied to an in-memory copy or a `tar` clone under the scratchpad. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

### A. The fenced literals — character-exact, zero mismatches

I extracted every fenced block from the SPEC body (stopping at `## Upstream Summary` so the embedded design copy could not contaminate the comparison) and diffed each against the corresponding fence in `00-raw-requirement.md`. **All twelve are byte-identical — no divergence at any character index.**

| SPEC block | Line | Source | Bytes | Result |
|---|---|---|---|---|
| R1 old anchor | `:26` | raw `:67` | 257 | **identical** |
| R3a old anchor | `:38` | raw `:104` | 71 | **identical** |
| R3b old anchor | `:44` | raw `:118` | 183 | **identical** |
| R1 new text | `:52` | raw `:73` | 372 | **identical** |
| R2 appended text | `:58` | raw `:83` | 410 | **identical** |
| R3a new text | `:64` | raw `:110` | 97 | **identical** |
| R3b new text | `:70` | raw `:124` | 792 | **identical** |
| R4 caps (js) | `:137` | raw `:142` | 79 | **identical** |
| R5 block A (8 patterns) | `:150` | raw `:165` | 454 | **identical** |
| R5 block B (11 patterns) | `:163` | raw `:178` | 691 | **identical** |
| R6 pattern 1 | `:189` | raw R6 | 129 | **identical** |
| R6 pattern 2 | `:195` | raw R6 | 110 | **identical** |

Backticks, apostrophes, spacing, and the `[\s\S]*?` escapes all match. The R2 anchor (`:32`) has no fence in the raw requirement (it is given inline there), so I diffed it against the live fragment instead — see B.

### B. The four "old" literals against the real current fragment

Each occurs **exactly once** in `templates/fragments/execute-plan.behavior.md` at HEAD `4c1a081`: R1 old ✔, R2 anchor ✔, R3a old ✔, R3b old ✔. The SPEC's precondition ("四个锚点在文件中各精确出现一次") is therefore satisfiable as written.

### C. Byte account, recomputed from the SPEC's literals (not the design's)

I applied `S[0]→S[4]`, `S[1]→S[1] + " " + S[5]`, `S[2]→S[6]`, `S[3]→S[7]` to an in-memory copy, using the SPEC's own strings:

| Quantity | SPEC claims | Measured |
|---|---|---|
| R1 delta | 115 | **115** |
| R2 delta | 411 | **411** |
| R3a delta | 26 | **26** |
| R3b delta | 609 | **609** |
| Total | 1161 | **1161** |
| behavior | 10,129 | **10129** |
| packed | 13,155 | **13155** |
| masked golden | 12,629 | **12629** |

The 411 holds only because SPEC-FRAGMENT-001 `:55` pins the join to "恰好一个 ASCII 空格" — the raw text alone is 410 bytes. That instruction is more explicit than the design's and is load-bearing; good.

All SPEC-FRAGMENT-001 postconditions verified on the result: R1 old = 0, R3a old = 0, R3b old = 0, R2 anchor = 1, each of the four new texts = 1. All SPEC-FRAGMENT-002 postconditions are objectively measurable and hold: `verdict` = 0, `Between tasks there is no code review and no acceptance run` = 1, the `skipped` clause = 1, `functional acceptance not run` = 1, `[pending|in-flight|done|failed]` = 1. SPEC-REVIEW-002's product-side check holds: `the run's one fix` = **1**, and `for step 5's bounded fix` = 1.

### D. The 21 patterns

Split verified: block A = **8**, block B = **11**, plus 2 SPEC-TEST-003 replacements = **21**. All 21 parse as valid `/.../` literals. Evaluated against the regenerated packed content:

- 18 positive patterns in blocks A and B: **all match**.
- `/the diff against \`base\`/` (block B, position 2): **does not match** — correctly identified at `:176` as the one negative assertion requiring `assert.ok(!pattern.test(c), ...)`.
- Both SPEC-TEST-003 replacements: **match**.

The `:178` argument for keeping `/Append it to the ledger as the run's one fix/` and `/an ordinary serial task under every step 4 rule/` as two assertions rather than one is correct and matches the raw requirement.

### E. SPEC-Handoff fidelity — all 11 items represented

1 → SPEC-FRAGMENT-001; 2 → SPEC-STATE-001 + SPEC-FRAGMENT-002; 3 → SPEC-REVIEW-002; 4 → SPEC-REVIEW-001; 5 → SPEC-TEST-001/002/003 + SPEC-VERIFY-001's counts; 6 → SPEC-TEST-004; 7 → SPEC-GEN-001; 8 → SPEC-VERIFY-001; 9 → SPEC-DELIVER-001; 10 → SPEC-REVIEW-002 + SPEC-REVIEW-003; 11 → SPEC-TEST-002 final para + SPEC-TEST-004.

Spot-checking the items you flagged:

- **Four-branch mapping and its default arm** — SPEC-STATE-001's table reproduces all four branches, and point 1 explicitly names the bottom arm plus both fall-through cases (reasonless `not run`; a final result predating the last write). Faithful, not narrowed.
- **`In a valid result` reading** — point 2 carries the design's reading verbatim in substance, including why a literal read self-contradicts. ✔
- **Conjunctive relationship with `:56`** — point 3 carries it, including `No later step may reach \`done\` past one` taking precedence. ✔
- **SPEC-REVIEW-003 does NOT claim full closure.** It states the marker buys 可辨识 not 强制查询, splits 已闭合 from 未闭合, names the missing scan explicitly, and cites DECISION-001 option A. This is exactly right and is the item I was most prepared to find watered down.
- **Dash-scan scoping** — SPEC-VERIFY-001 `:249` scopes it to `git diff` added lines, records the 7 pre-existing em-dashes with correct line numbers and en-dash = 0, and warns the whole-file grep necessarily returns 7. Carried faithfully.
- **Two bounded authoring latitudes** — both carried with their 取法.
- **R3b-vs-`:58` reconciliation** — **not carried.** See Finding 2.

### F. Contracts, external docs, and structure

`package.json` verified: `dependencies` null, `devDependencies` null, `peerDependencies` null, `engines.node` `>=20`, no `type` field (so CommonJS), `scripts.test` = `node --test`. **The zero-dependency claim in `## External Documentation Checked` is accurate**, and "基于 `node:test` 与 `node:assert`" matches the actual test harness. Nothing in that section requires an external-docs lookup — correct call.

`## API / Data / Config Contracts`: every claim checks out against `CLAUDE.md` and the code layout — `lib/` untouched, `main(argv, options)` and its four dispatched behaviors untouched, manifest keys (`installed_paths`, `backups`, `installed_hashes`) unchanged, four platform `skillsRoot`s plus opencode's `commandsRoot` unchanged, skill set unchanged. The ledger claim is right too: the marker lands inside the task description text, so `.xsk/runs/<slug>.md`'s frontmatter and task-line format are genuinely unchanged.

SPEC-GEN-001's hardcoded paths are correct: `get('xsk-execute-plan')` yields `fragmentBase = execute-plan` and `name = xsk-execute-plan`, so `skills/execute-plan/SKILL.md` and `test/fixtures/golden/xsk-execute-plan.md` are the right targets.

Structure: 13 `### SPEC-*` contracts, 13 Test Matrix rows, 13 Trace rows — one-to-one, no orphans. SPEC-VERIFY-001's table has exactly **15** data rows, matching the Test Matrix's "表内 15 行".

### G. The PLAN Handoff task-2 claim — measured, and it is wrong

I built the exact state task 2 would leave in a clone: caps → 13200/10200, the forbidden budget sentence removed, 19 new assertions inserted into the correct blocks (block counts came out 10 / 16 / 22 ✔), and the 2 in-place pattern swaps — with **no** fragment edit and **no** regeneration (fragment still 8968 bytes, packed still 11994).

```
ℹ tests 247
ℹ pass 245
ℹ fail 2
✖ skill-behavior: xsk-execute-plan: gate, ledger, and dispatch
✖ skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting
```

And, explicitly from the same run:

```
✔ golden: masked shell matches the committed golden fixture per skill
✔ golden: committed skills/<base>/SKILL.md matches buildSkill output (packed source stays in sync)
✔ golden: generated shell is deterministic across builds
✔ golden: generated shell is platform-neutral
✔ golden: the shared body is fully masked exactly once per skill
✔ skill-behavior: xsk-execute-plan: stays inside its byte budget
```

All five golden tests pass and the byte-budget test passes. See Finding 1.

Mechanism, for precision: block A reddens on its first new assertion (`/Require nothing else back.../`). Block B reddens earlier than the new assertions — on the SPEC-TEST-003 replacement `/Allow at most one bounded fix[\s\S]*?Only a \`done\` fix reruns.../`. Notably the *other* replacement, `/read the untracked paths directly, .../`, **still matches the unedited text** (it is a strict suffix of the old sentence), so it stays green at task 2 and contributes no signal.

## Findings

### 1. MAJOR — the PLAN Handoff names the wrong red set for task 2, and gives the wrong reason

**Claim.** `:310`: "此任务的 `npm test` 会红（生成产物尚未更新），这是预期，红的范围必须仅限 golden 与字节预算相关用例".

**Evidence.** Both halves are contradicted by measurement:

- **The named set is green.** All five `golden:` tests pass and `stays inside its byte budget` passes. Golden passes because at task 2 the fragment and the generated artifacts are still perfectly in sync — nothing has desynced them. The byte-budget test passes because the caps were *raised* while the actual sizes are unchanged (11994 ≤ 13200, 8968 ≤ 10200); it was already passing at 12000/9000 and is even further inside now.
- **The actual red set is two different tests**, neither mentioned: `skill-behavior: xsk-execute-plan: gate, ledger, and dispatch` and `skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting`.
- **The stated reason is inverted.** "生成产物尚未更新" is exactly why golden is *green*, not why anything is red. The red comes from the new content-contract assertions being written against text the fragment does not yet contain.

**Why this matters for the PLAN.** You asked whether "红只限于预期范围" is a well-defined acceptance criterion. It is well-defined *only if the expected set is named correctly*, and here it is named wrongly. An implementer following `:310` would check golden and byte-budget, find both green, find two unexpected tests red, and reasonably conclude task 2 went wrong — or worse, start "repairing" the two content-contract blocks, which is precisely the failure mode RISK-TEST-001 exists to prevent.

**Correct wording** (measured, drop-in): task 2 leaves `npm test` at 247 tests, 245 pass, 2 fail; the two failures are exactly `skill-behavior: xsk-execute-plan: gate, ledger, and dispatch` and `skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting`; everything else stays green, including all five golden tests and the byte-budget test; the cause is that the new assertions target text task 1 writes, so they go green only once task 1 and task 3 have landed.

**Second-order note.** Because task 2's own red set is caused by the *missing fragment edit*, the dependency ordering in `:314` is worth restating: running task 1 before task 2 would leave only the golden pair red instead, which is a cleaner boundary. That is a PLAN-stage choice, not a defect here, but the SPEC's stated order is the one that produces the confusing signal.

### 2. MAJOR — the R3b-vs-`:58` reconciliation is dropped, and `:81` presents the weaker one as the whole story

**Claim.** `05-design.md` DES-STATE-001 carries two `:58` alignments. The SPEC carries only the first.

**Evidence.** The design's second bullet reconciles R3b's `an ordinary serial task under every step 4 rule` against `:58` "Between tasks there is no code review and no acceptance run" — arguing the fix is not one of the envelope's enumerated tasks, that the post-fix rerun is a second acceptance pass explicitly rationed to one, and that the `under every step 4 rule` narrowing is an interpretation with the literal tension surviving. The design ranks it explicitly: "这里是最强的误改诱因，比 R2 那处更强".

Grepping the SPEC body, `under every step 4 rule` appears only three times — inside the frozen R3b literal (`:70`), as a pattern (`:171`), and in the split-the-assertion argument (`:178`). **It never appears in a reconciliation with `:58`.** The SPEC's only `:58` bullet is `:81`, which carries the R2 rationale alone ("R2 是子代理对自己已跑检查的报告义务，`:58` 是控制器不在任务之间另开门禁，两者主语不同") and reads as a complete account of the `:58` question.

**Weight, stated fairly.** The *contract* survives: `:81` requires `Between tasks...` to remain at count 1 with wording unchanged and forbids "顺手修好", and the Test Matrix row for SPEC-FRAGMENT-002 makes that a substring check. So a mechanical guard would still catch a `:58` edit. What is lost is the reasoning that keeps an implementer from perceiving a contradiction in the first place — and the design identified that specific perception as the higher-risk of the two. Restoring it is two sentences.

### 3. MINOR — SPEC-GEN-001's code block is a non-runnable sketch where the upstream recipe was runnable

**Claim.** `:216-219` gives three lines that reference `fs`, `buildSkill`, `get`, and `sharedTrim` with no bindings.

**Evidence.** Raw requirement R8 (`:230-239`) gives a complete, copy-pasteable script including `require('fs')`, `require('./lib/generator')`, `require('./lib/skills')`, and the `sharedTrim` definition. The SPEC condensed it to three lines; the prose at `:221` does name all four sources correctly (including the "`buildSkill` 吃技能对象，不是名字字符串" trap), so nothing is *wrong* — but a copy-paste yields `ReferenceError`. Given SPEC-GEN-001's own point is that this is the *only* legal generation path, handing over a runnable form costs nothing. The hardcoded paths it substitutes for the template literals are correct (verified against `lib/skills.js`).

### 4. MINOR — three of the 19 assertions are claimed by no Test Matrix row

**Claim.** The per-contract 验证手段 columns account for 16 of the 19 new assertions.

**Evidence.** SPEC-STATE-001's row claims 7 (block A positions 1-7 — correct, since A8 `/for step 5's bounded fix/` is the ledger-boundary assertion, not a state-mapping one; that precision is a nice touch). SPEC-REVIEW-001's row claims 3 (B3, B4, B5). SPEC-REVIEW-002's row claims 5 (B7-B11) plus T3-2. That leaves **B1** (`/diff against \`base\` itself/`), **B2** (the negative), and **B6** (`/A valid concern or command failure is a functional failure/`) unclaimed by any row — B1 and B2 belong to SPEC-FRAGMENT-001's R1 change, whose row lists only substring counts and `wc -c`. SPEC-TEST-002's own row covers all 19 collectively via `npm test` plus the 10/16/22 counts, so nothing is unverified; the cross-reference is just incomplete.

### 5. MINOR — one Test Matrix row is a judgment call rather than a check

**Claim.** You asked which rows are restatements rather than checks. One qualifies.

**Evidence.** SPEC-TEST-004's pass criterion is "`The packed cap is back at its original 12000` 为 0；**四层齐备**". The first half is a substring count. The second is unavoidably subjective — "四层齐备" has no mechanical test, and the four layers are prose requirements. This is inherited from R7 and was already accepted upstream as bounded authoring latitude, so it is not a defect so much as the one place where the matrix's "objectively checkable" property does not hold. SPEC-REVIEW-003's and SPEC-DELIVER-001's manual rows are better off: their criteria reduce to greppable strings ("交付未复述'两条路径都收敛'", "无新 commit"). Every other row is a substring count, a byte count, or a test result.

### 6. MINOR — SPEC-Handoff item 11's byte-budget half is not restated in the SPEC

**Claim.** Item 11 requires recording that both authoring latitudes sit outside the byte budget. The SPEC carries this for one of the two.

**Evidence.** SPEC-TEST-002 `:180` says the message strings "不影响任何计数与任何字节预算" ✔. SPEC-TEST-004 says only "注释正文由实现者自撰，覆盖上述四层即可" — no statement that it is outside the account. Grepping the SPEC body for the design's supporting fact ("`test/skill-behavior.test.js` 不在任何字节预算内" / 33,716) returns nothing. Immaterial to correctness — the comment genuinely does not enter the 1,161-byte account — but an implementer reading only the SPEC could wonder whether a long comment threatens the budget.

## Unresolved ambiguity

**None that blocks an implementer**, with one item worth pinning.

- **The 19 assertion message strings** — decided at `:180`: self-authored, file's existing English voice, one sentence per assertion, one property each. Bounded.
- **The R7 comment prose** — decided at `:209`: self-authored, must cover the four layers, must not retain the 12000 sentence. Bounded, with the subjectivity noted in Finding 5.
- **The R2 join** — pinned harder than upstream ("恰好一个 ASCII 空格，不另起段落、不换行"), and I confirmed the 411 figure depends on exactly that.
- **Which existing assertion gets which new pattern** — SPEC-TEST-003 identifies each by property string *and* current line range. Unambiguous.
- **Worth pinning:** the SPEC does not say **where inside its block** each new assertion goes (append at the end, or group by topic). This is immaterial to the block counts and to the final green state — but it is not entirely inert: `assert.ok` throws on first failure, so the insertion position determines which assertion surfaces in the task-2 failure output. If Finding 1's corrected red-set description is going to name specific assertions, the ordering should be fixed too, or the description should name only the two failing *test cases* and not the assertions inside them.

## Notes

- **The literal transcription is flawless**, which is the outcome that mattered most here. Twelve blocks, 3,545 bytes of frozen text, zero divergence at any character — including the four backtick-heavy strings and both `[\s\S]*?` escapes, which are the places a transcription error would most plausibly hide and would most expensively corrupt the byte account downstream.
- **SPEC-REVIEW-003 is the strongest section.** It resists the exact temptation the coordinator flagged: it does not soften "可辨识 but not 强制查询" into "closed", it names the missing `:49` schema field and the missing scan instruction, and it ends by binding the delivery language. Carried from the design without loss.
- **SPEC-VERIFY-001 `:249` and `:251` carry both operational traps forward correctly** — the `git diff`-scoped dash scan with the seven pre-existing em-dashes named, and the `grep -c` exit-1 hazard. These were the last two things fixed in the design and they survived the handoff intact.
- **On task ordering**, worth surfacing to PLAN independent of Finding 1: the SPEC's dependency statement at `:314` ("2 依赖 1") is correct, but its task *list* presents fragment → tests → regenerate, while its narrative treats task 2 as the one that goes red. Running 1 → 3 → 2 would leave the suite green at every task boundary except the last, and running 1 → 2 → 3 leaves exactly the two content-contract tests red at boundary 2. Either is workable; only the current *description* of what red means is wrong.
- **Nothing in the SPEC contradicts a number I verified across the design reviews.** The 1,161 account, the 10 / 16 / 22 split, the 247-case suite, the 45 / 71 cap headroom, and the four anchor uniqueness conditions all still hold as measured, now against the SPEC's own literals rather than the design's.

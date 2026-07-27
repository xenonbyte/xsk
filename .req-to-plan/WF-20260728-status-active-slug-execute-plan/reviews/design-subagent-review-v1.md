# Design subagent review v1

## Verdict

**changes requested** — every executable number in the design is exactly right (I reproduced all eight byte figures and both broken assertions independently), but the artifact ships with an empty `## Trace` table plus a `<!-- fill in -->` leftover at `r2p_status: ready`, and it states the fix-budget cross-session closure as achieved when a reachable second-fix path still exists.

## Verified facts

All measurements taken read-only at HEAD `4c1a081`. The repo was never modified: the four replacements were applied to an in-memory copy for the byte math, and separately to a `tar`-cloned sandbox at `/private/tmp/.../scratchpad/repo` for the suite run.

**Final `git status --short` in the real repo:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

(only this run's own untracked directory; `wc -c` on the four target files is unchanged at 8968 / 11994 / 11468 / 33716)

### Anchor uniqueness (pre-edit, exact substring counts)

| Anchor | Design claims | Measured |
|---|---|---|
| R1 reviewer-dispatch sentence | 1 | **1** |
| R2 anchor `Require a compact result and the paths it believes it wrote.` | 1 | **1** |
| R3a `Write it here, at step 7's terminal write, and in step 6, nowhere else.` | 1 | **1** |
| R3b `A reviewer objection or a command failure is a functional failure. Allow at most one bounded fix ... never loop.` | 1 | **1** |

### Byte accounting (independently recomputed)

| Item | Design claims | Measured | Match |
|---|---|---|---|
| R1 delta | 115 | 115 | yes |
| R2 delta | 411 | 411 | yes |
| R3a delta | 26 | 26 | yes |
| R3b delta | 609 | 609 | yes |
| Total | 1161 | 1161 | yes |
| behavior fragment | 10129 | 10129 | yes |
| packed `SKILL.md` | 13155 | 13155 | yes |
| masked golden | 12629 | 12629 | yes |

The R2 figure of 411 is only reachable if the appended text is joined to the anchor with **exactly one space** (the raw text alone is 410 bytes). The design pins this ("以一个空格相连，不另起段落"); the raw requirement does not. That is a genuine ambiguity the design correctly closed — credit where due.

Post-edit counts also confirmed: three old sentences at 0, R2 anchor still 1, four new texts each exactly 1, `verdict` at 0, U+2014/U+2013 at 0 in both fragment and packed content.

### Assertion counts

| Item | Design claims | Measured |
|---|---|---|
| `invocation and admission` block | 10 | **10** (lines 382-418) |
| `gate, ledger, and dispatch` block | 8 | **8** (lines 420-451) |
| `acceptance, recovery, and reporting` block | 11 | **11** (lines 453-496) |
| Three blocks combined | 29 | **29** |
| `assert.ok` file-wide | 205 | **205** |
| `npm test` cases at HEAD | 247 | **247 pass, 0 fail** |

### The two assertions predicted to break

Reasoned against the real patterns and confirmed empirically against the regenerated packed content:

- `test/skill-behavior.test.js:459-462` — `/telling it to read the untracked paths directly, .../` → **false**. R1 inserts `diff against \`base\` itself and ` immediately after `telling it to `, so the literal run is broken. The proposed replacement (drop the leading `telling it to `) → **true**.
- `test/skill-behavior.test.js:463-466` — `/Allow at most one bounded fix as an ordinary serial task, then rerun the commands and the reviewer once; never loop/` → **false**. R3b replaces the whole sentence. The proposed non-greedy replacement `/Allow at most one bounded fix[\s\S]*?Only a \`done\` fix reruns all commands and the reviewer once; never loop/` → **true**.

### End-to-end sandbox run (the strongest check available)

In the cloned repo I applied only: the four fragment replacements, the two cap bumps to 13200/10200, and the `buildSkill` regeneration — deliberately **without** the 19 new assertions.

- Result: `tests 247 / pass 246 / fail 1`. The single failing case is `skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting`, i.e. exactly the block holding the two R6 assertions. Nothing else in the suite regressed — `test/golden.test.js`, `test/generator.test.js` (dash ban), `test/self-conformance.test.js`, and the retired-mechanism blacklist all stayed green.
- Then applying only the two R6 pattern swaps: `tests 247 / pass 247 / fail 0`, and `npm run syntaxcheck` passed.

This independently confirms R6's central claim: **exactly two** existing assertions break, both are fixed in place by the given patterns, and the test-case count stays 247. It also confirms the new prose does not trip the retired-forensic-mechanism blacklist (a regression the design's verification matrix never names, though `npm test` covers it).

### All 19 new patterns

All 18 positive patterns match the regenerated packed content; `/the diff against \`base\`/` evaluates **false**, so the mandated `assert.ok(!pattern.test(c), ...)` form passes. Split 8 (`gate, ledger, and dispatch`) + 11 (`acceptance, recovery, and reporting`) — matches the raw requirement's two code fences exactly.

### Arithmetic

10 + 16 + 22 = 48 ✔; 29 + 19 = 48 ✔; 8 + 8 = 16 ✔; 11 + 11 = 22 ✔; 205 + 19 = 224 ✔; 13200 − 13155 = 45 ✔; 10200 − 10129 = 71 ✔. No arithmetic error found anywhere in the design.

### Spec compliance

All nine SCOPE-IN items are covered by a concrete design item, and I traced each of AC-1..AC-9 to a stopping condition in `DES-VERIFY-001` or a constraint in `DES-EDIT-001`/`DES-GEN-001`. Nothing from the brief is silently dropped, narrowed, or widened. No SCOPE-OUT item is breached: `lib/`, the other three fragments, `lib/skills.js` descriptions, both READMEs, `AGENTS.md`, and the retired-mechanism blacklist are all explicitly left alone; candidates C/D/E/F are not smuggled in; the Rollback section explicitly forbids commits (SCOPE-OUT-010). README heading parity appears only as a regression check, not as an edit.

## Findings

### 1. MAJOR — the fix-budget cross-session closure is stated as achieved, but a reachable second-fix path remains

**Claim.** `DES-STATE-001` says flatly: "控制器把 fix 作为追加 ledger task 写入并带上该标记，恢复端因此从台账读得出额度已用" and the coverage table marks `RISK-STATE-002 [ADDRESSED]`. Both overstate what the frozen prose achieves.

**Evidence.** Two independent gaps, both checkable against the fragment as it will read after the edit:

1. *The marker has no on-disk representation.* The ledger task-line schema at `templates/fragments/execute-plan.behavior.md:49` is `1. [pending|in-flight|done|failed] <full task description with dependencies and acceptance items> - <compact result; subagent self-reported paths; observed Git-visible changes>`. There is no field for "this is the run's one fix". The new R3b sentence reads `Append it to the ledger as the run's one fix, an ordinary serial task under every step 4 rule.` — which an implementing agent can satisfy by appending an ordinary task line, since the appended task *is* the run's one fix. Nothing compels the literal token to land on disk. If it does not, the recovering session sees a task line indistinguishable from any other.
2. *No sentence instructs anyone to read it.* Step 6 (`:64-70`) is untouched by this change and says `always re-run full acceptance`. Step 5 says `Allow at most one bounded fix` without saying "check the ledger first". The budget is at best *discoverable*; it is never *consulted*.

**Reachable path (the exact one RISK-STATE-002 names, still open).** All tasks `done` → commands fail → fix dispatched → fix writes `done` → session dies before the rerun completes. New session: `status: running`, everything `done`, no `in-flight`, no `pending`. Step 6 resumes, re-runs full acceptance, acceptance fails again, step 5 reads "at most one bounded fix" with no instruction to look for a prior one, and dispatches a second fix.

**Assessment.** This is a *defect in the design artifact*, not a request to change the frozen wording or expand scope. The wording is upstream-approved and byte-pinned; nothing here justifies editing it. What the design must do instead is one of: (a) downgrade `RISK-STATE-002` from `[ADDRESSED]` to a named residual with the surviving path written out, or (b) push a decidable contract to SPEC that the fix's ledger task description must contain the literal string `the run's one fix` and that step 6's acceptance rerun must scan for it before dispatch — and say explicitly that this is agent-inference, not prose-enforced. Silently carrying `[ADDRESSED]` forward is what an implementer will read as "closed".

### 2. MAJOR — the artifact is incomplete: empty `## Trace` table and a leftover `<!-- fill in -->`, at `r2p_status: ready`

**Claim.** `05-design.md` declares `r2p_status: ready` while carrying an unfilled required section and a template placeholder.

**Evidence.** Line 201 still holds the literal `<!-- fill in -->` at the end of `## SPEC Handoff`. Lines 203-207 are:

```
## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
```

— header row, separator row, **zero data rows**. Both upstream artifacts populate theirs: `03-requirement-brief.md` has 20 Trace rows, `04-risk-discovery.md` has 9. The design's own DES-* IDs (`DES-EDIT-001`, `DES-STATE-001`, `DES-TEST-001`, `DES-GEN-001`, `DES-VERIFY-001`) appear nowhere in a Trace row, so downstream closure checking has nothing to derive from on the design side. The `## Requirements Coverage` table carries the same information informally, which makes this mechanical to fix, not a rethink.

### 3. MINOR — "Decision Requests: none" and "每一条都已有唯一答案" are overclaims; two authoring choices are genuinely undecided

**Claim.** The `## SPEC Handoff` preamble asserts "每一条都已有唯一答案，不需要再做选择". Two concrete choices are left to the implementer.

**Evidence.**

- *The 19 assertion message strings.* The raw requirement's R5 gives 19 regex patterns and nothing else. Every existing `assert.ok` in `test/skill-behavior.test.js` takes a third argument naming the property (e.g. `'no per-task review'` at `:450`). The design's `DES-TEST-001` item 3 says only "沿用文件现有写法". The implementer must author 19 message strings from scratch. Choices: (a) translate the property list in R5's "其余依次断言" paragraph, (b) author fresh English in the file's existing voice. Low blast radius (messages affect no count and no byte budget), but it is not "唯一答案".
- *The R7 comment's literal text.* Only four required *meanings* are pinned; the wording is free prose. It sits in `test/skill-behavior.test.js`, which is outside both byte budgets, so the 1,161-byte account is unaffected — but the design should say that explicitly rather than implying the whole change is byte-frozen. Related unaddressed point: `test/generator.test.js` bans U+2014/U+2013 only in **generated** content, so the new comment is governed by repo convention with no test guard. The design's `约定层` correctly scopes the dash scan to generated content and therefore leaves the new comment unguarded without saying so.

### 4. MINOR — the conflict analysis is incomplete: R3b vs `:58` is never examined

**Claim.** The design examines exactly two interactions for the new prose: R2 vs `:58` (design lines 31, 263) and R3b vs the `skipped` handling (line 33/114). It never examines R3b vs `:58`.

**Evidence.** R3b introduces `an ordinary serial task under every step 4 rule`. `:58` — `Between tasks there is no code review and no acceptance run` — **is** a step 4 rule. Yet R3b's next sentences mandate that after the fix task `Only a \`done\` fix reruns all commands and the reviewer once`, i.e. a code review and an acceptance run immediately after a task that is declared subject to every step 4 rule. The tension resolves on a charitable reading ("between tasks" means between the envelope's enumerated tasks, and the fix is terminal), but the universal quantifier `every step 4 rule` is exactly the kind of phrasing that invites an implementer to "fix" `:58` — which AC-3 forbids. The design's Scope Overflow Risks section flags this temptation only for R2, not for R3b, which is the stronger trigger.

### 5. MINOR — R2's placement creates a second, earlier `done`/`failed` write instruction that the design does not reconcile with `:56`

**Claim.** After the R2 append, `:54` ends with `Otherwise write \`done\` and keep the check evidence for step 7.` while the immediately following paragraph `:56` still ends with `Then record two separately sourced facts, never merged into one claim: ... Write \`done\` or \`failed\`.`

**Evidence.** `:56` also mandates the post-return invariant check (`check the run-wide invariants twice: before writing \`in-flight\`, and again when the subagent returns`), and `:58` states `No later step may reach \`done\` past one` [a broken invariant]. A reader can take `:54`'s "Otherwise write `done`" as authorizing the write at return time, before the `:56` invariant re-check. The two compose correctly if read as conjunctive preconditions, but nothing in the text says so, and the design's `DES-STATE-001` maps R2's four branches to `done`/`failed` without ever mentioning that a second gate on the same write already exists one paragraph later. This is an unexamined interaction, not a wording change request.

### 6. MINOR — the four-branch state mapping is presented as total but has fall-through holes

**Claim.** `DES-STATE-001`'s table and R2's prose both read as an exhaustive partition. Two subagent behaviors fall through to `done` by default.

**Evidence.** The prose is `... report its final run after the task's last write and exit result, or \`not run\` and why. In a valid result, an omitted check becomes \`not run: not reported\`; any failed final check or missing or malformed task result makes the task \`failed\`. Otherwise write \`done\`...`

- A check reported as `not run` **without** a reason satisfies neither "and why" nor "omitted" nor "failed final check" nor "missing or malformed task result" — it lands on `Otherwise write \`done\``. The "and why" requirement is therefore unenforced by the state machine.
- A check whose reported run predates the task's last write is unverifiable by the controller and also lands on `Otherwise → done`. The design correctly says the `after the task's last write` qualifier "排除最后一次改动之前的陈旧 pass", but the mapping has no branch that acts on a violation.

Neither is a request to change the frozen text. The defect is that the design asserts the mapping is total ("四个分支必须都落进这四个里") without naming the default arm. Separately, a mild prose artifact inherited verbatim from upstream: `In a valid result` grammatically scopes the whole sentence including `missing or malformed task result makes the task \`failed\``, which is self-contradictory on a literal read (a missing result is not a valid result). The design repeats upstream's gloss without noting it.

### 7. MINOR — factual: the budget comment at `:368-378` is two paragraphs, not "四段叙事"

**Claim.** Design line 39: "`:368-378` 是四段叙事预算注释". (Inherited from raw requirement R7.)

**Evidence.** `test/skill-behavior.test.js` lines 368-371 are one comment paragraph ("The byte budgets are a product decision..."), line 372 is a bare `//`, and lines 373-378 are a second paragraph ("The packed cap is back at its original 12000..."). Two paragraphs, roughly six sentences. Not four of anything. Cosmetic, but it is a claim about current code, and R7's actual instruction ("整段重写，保住四层意思") is unaffected.

### 8. MINOR — citation precision nits

- Design line 45: "`:497` 起的 `stays inside its byte budget`" — the test declaration is on **line 498**; 497 is blank.
- Design line 138: "该文件已有 5 处同样写法" (5 existing `[\s\S]*?` patterns) — correct if scoped to the three xsk-execute-plan blocks (lines 386, 390, 468, 472, 488). File-wide there are **11 lines / 12 occurrences**. Reading "该文件" as the file makes the number wrong. Inherited from R6's "文件里已有 5 处".

### 9. MINOR — the Rollback self-proof covers only three of the four files it reverts

**Claim.** The rollback command reverts four paths; the self-proof checks three.

**Evidence.** Design line 170 runs `git checkout --` on `templates/fragments/execute-plan.behavior.md test/skill-behavior.test.js skills/execute-plan/SKILL.md test/fixtures/golden/xsk-execute-plan.md`. Line 172's proof is "`wc -c` 回到 8,968 / 11,994 / 11,468" — the test file's 33,716 is missing. `git status --short` being empty for all four paths (also stated) does cover it, so this is redundancy, not a hole.

## Unresolved ambiguity

Two genuinely undecided points, both detailed in Finding 3:

1. **The 19 `assert.ok` message strings.** Not supplied by the raw requirement, the brief, or the design. Choices: (a) render R5's "其余依次断言" property list into English messages, (b) author fresh messages matching the file's existing voice. The design should pick one, or SPEC should. Consequence of leaving it open: none testable — counts and byte budgets are unaffected — but it contradicts "Decision Requests: none".
2. **The literal text of the rewritten budget comment (R7).** Only the four required meanings are pinned. Sub-choice the design never states: whether the repo's no-em-dash/no-en-dash convention applies to it (it does by convention; no test enforces it, because `test/generator.test.js` only scans generated skill content).

Checked and found **not** ambiguous: the R2 separator (design pins one space, and 411 bytes is only reachable that way); assertion block assignment (pinned 8/11 by upstream and reproduced verbatim); the negative-assertion form; the two R6 replacement patterns (given verbatim); the generation recipe and the two separate byte comparisons; the cap values; the rollback command.

## Notes

- **Rollback is real, not ceremonial.** All four target files are tracked at HEAD `4c1a081`, so `git checkout --` restores them exactly; I verified the three stated byte targets (8968 / 11994 / 11468) hold at HEAD. The claim that the two generated files carry no independent state is correct — `lib/generator.js` `buildSkill` is a pure function of the four fragments plus `templates/skill.md.tmpl` plus `shared/skill-common.md`, so regenerating after a fragment-only revert is sufficient. No data migration, no external state: accurate.
- **Observability is real for what a prose-only change can offer.** Every listed signal is a deterministic command with a pre-stated expected value, and I confirmed each is computable and each expected value is correct. One trivial nit: `grep -c verdict <file>` exits **1** when there are zero matches, so it will abort a `set -e` verification script even though zero is the desired outcome.
- **Two things the verification matrix does not name but `npm test` covers**, both confirmed green in my sandbox run: the retired-forensic-mechanism blacklist (`skill-behavior.test.js:518-536`) is not tripped by the new words `diagnostics`, `evidence`, or `envelope`; and `test/self-conformance.test.js` / `test/golden.test.js` need no change.
- **The masked-golden arithmetic checks out structurally**, not just numerically: `shared/skill-common.md` is 542 bytes, 541 after `trim()`, and `541 − len('<SHARED_MASKED>') = 541 − 15 = 526`; `13155 − 526 = 12629`. `lib/generator.js` `readTrim` strips trailing whitespace from each fragment, which is why the packed delta equals the fragment delta exactly (1161) with no off-by-one from the file's trailing newline.
- **Option analysis quality.** The six option pairs in `## Options Considered` are real trade-offs with stated losers, not decoration. The strongest is the R6 (A) vs (B) argument — I confirmed independently that the two retained assertions are not duplicated by any of the 19 new patterns: `/diff against \`base\` itself/` asserts reviewer-self-fetch, while the retained `:459` pattern asserts untracked-path coverage; and no new pattern spans "at most one" through "done-gated full revalidation" the way the retained `:463` non-greedy pattern does.
- **No scope expansion is recommended by this review.** Findings 1, 4, 5, and 6 are all about what the design *claims* or *fails to examine*, not about changing the frozen wording, the byte account, or the assertion set. The correct remedies are edits to `05-design.md` (and, for Finding 1, an honest residual-risk statement plus a decidable SPEC contract), not new prose in the fragment.

# Design subagent review v2

## Verdict

**changes requested** — all ten v1 remediations landed and every one is substantive rather than cosmetic, but v2's new honesty about the fix-budget residual now openly contradicts an explicit claim in the approved raw requirement without naming or routing that contradiction, and the design (in both v1 and v2) asserts a `test/generator.test.js` dash backstop that does not exist for this skill.

## Verified facts

Read-only throughout. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

(only this run's own untracked directory; no repo file touched)

I did not re-run the sandbox suite or recompute the byte accounting: no v2 edit changed any of the eight byte figures, the 1,161 total, the 10 + 16 + 22 = 48 / 29 + 19 = 48 / 205 → 224 arithmetic, or the 247 test count. All of those remain exactly as verified in v1. The numbers that are **new or changed** in v2 I did verify:

| v2 claim | Location | Measured |
|---|---|---|
| `test/skill-behavior.test.js` is 33,716 bytes | `:48`, `:201` | **33716** ✔ |
| `:498` is where `stays inside its byte budget` starts | `:47` | **498** ✔ (was `:497` in v1) |
| `:368-371` para, `:372` bare `//`, `:373-378` para | `:41` | ✔ exactly as described |
| 5 non-greedy patterns inside the three blocks; 11 lines / 12 occurrences file-wide | `:160` | **5** (lines 386, 390, 468, 472, 488) / **11 lines, 12 occurrences** ✔ |
| every `assert.ok` in the file carries a message string, e.g. `:450` `'no per-task review'` | `:166` | **205 of 205 carry one; 0 without** ✔; `:450` verbatim match ✔ |
| `the run's one fix` occurs exactly once in the new fragment | `:211` | **1** ✔ (also `for step 5's bounded fix` = 1) |

### v1 remediation checklist — all ten landed, none cosmetic

1. **(v1 MAJOR 1, partial-closure honesty)** `### DES-STATE-002` exists at `:143-153`. It is real content, not a mention: it separates 可辨识 from 强制查询 (`:145`), lists what *is* closed (`:147`), writes the surviving path out verbatim (`:149`), argues why the frozen wording is not edited (`:151`), and pushes SPEC contract item 10 (`:231`). The Design Summary names it up front (`:24`), Observability adds the product-side check (`:211`), and the Coverage cell says 部分闭合 (`:83`). **Substantive.** Two residues below (Findings 3 and 5).
2. **(v1 MAJOR 2, artifact completeness)** `<!-- fill in -->` is gone — `grep -n "fill in\|TODO\|TBD"` over `05-design.md` returns nothing; the only `<!--` left are the two `r2p-read-only` fence markers at `:328` and `:341`. `## Trace` at `:234-242` has **6 data rows**. **Landed.**
3. **(v1 minor 3, undecided authoring)** `DES-TEST-001:164-169` names both latitudes, picks a 取法 for each, and states the test file is outside both byte budgets. The SPEC Handoff preamble at `:220` no longer claims 每一条都已有唯一答案 and explicitly separates items 1-9 from 10-11. **Landed.** (The dash-scope sentence inside it is Finding 2.)
4. **(v1 minor 4, R3b vs `:58`)** `DES-STATE-001:135` analyses it and states it is the stronger mis-edit trigger. **Landed.**
5. **(v1 minor 5, two `done` writes)** `DES-STATE-001:134` reconciles them as conjunctive preconditions on one write and cites `No later step may reach \`done\` past one`. I re-checked the attribution: that sentence really is in `:58` of the fragment. **Landed and accurate.**
6. **(v1 minor 6, default arm)** `DES-STATE-001:137` names `Otherwise write \`done\`` as the 兜底臂 and both fall-throughs (reasonless `not run`; a final result predating the last write), and records the intended scoping of `In a valid result`. **Landed.**
7. **(v1 minor 7, `:368-378`)** `:41` now says two paragraphs, ~six sentences, and calls out upstream R7's "四段" as inaccurate. **Landed and verified correct.**
8. **(v1 minor 8, citations)** `:497`→`:498` and the 5-vs-11/12 split both corrected and both verified. **Landed.**
9. **(v1 minor 9, rollback proof)** `:201` now lists all four byte targets including 33,716. **Landed.**
10. **(v1 notes)** `:210` warns that `grep -c` exits 1 on zero matches and mandates `|| true` / `grep -o | wc -l`; `:211` adds the marker occurrence check. **Landed.**

### DES-* id set integrity

Six IDs defined as `### DES-*` headings (`:106`, `:119`, `:143`, `:155`, `:171`, `:179`). Every ID referenced anywhere in the artifact is defined; every defined ID appears in `## Trace`. No orphan, no dangling ID. The v1→v2 addition of `DES-STATE-002` did not break the set.

## Findings

### 1. MAJOR — v2 now contradicts an explicit claim in the approved raw requirement, without naming or routing the contradiction

**Claim.** `DES-STATE-002` establishes that the done-fix recovery path is still reachable. The approved raw requirement asserts the opposite. The design never says so.

**Evidence.** `00-raw-requirement.md:129` (R3), approved and frozen, ends:

> 加上这个标记后，恢复端从台账即可读出额度已用，**两条路径都收敛到 run `failed` 并进入 step 7**。

`05-design.md:149` (DES-STATE-002) says of exactly one of those two paths:

> 因此闭合依赖读文档的 agent 自己把"台账里可见的标记"与"每 run 至多一次"两条连起来。若它不连，……那条路径……在原则上仍然可达。

These cannot both be true. The design is right and the requirement is wrong — but the design presents this as a design-stage boundary decision ("本次明确接受"), never as an upstream defect. `:151` characterises upstream as having "选择用标记而非新增指令来收敛", which is accurate about the *mechanism* chosen but silently reframes upstream's asserted-complete convergence as a knowingly-accepted partial. Upstream did knowingly accept a cost — but only for the *failed-fix* path (`00-raw-requirement.md:131`: "这只剩一次多余的验收重跑……属于可接受的代价"). For the done-fix path it claimed closure.

**Why this matters concretely.** `## Decision Requests` is still `none`. An implementer who reads the requirement (the authoritative statement of what the user approved) gets "budget survives the session boundary". Only a reader who also reaches `DES-STATE-002` learns it does not. The user approved R3 on the strength of a guarantee the design has now determined is not delivered.

**Remedy (no scope expansion).** Cheap and prose-only, pick one: (a) quote `00-raw-requirement.md:129` inside `DES-STATE-002` and state plainly that this design supersedes that sentence, or (b) route it as an upstream gap to the requirement owner via the r2p gap mechanism, or (c) record it under `## Decision Requests` as "accept the residual second-fix path vs. spend bytes to close it — upstream believed it closed". Do **not** edit the frozen fragment wording; the design's reasoning for leaving it alone is sound.

### 2. MAJOR — the design asserts a `test/generator.test.js` dash backstop that does not exist for this skill

**Claim.** `Observability:213` — "`test/generator.test.js` 是 U+2014 与 U+2013 的背板". `DES-TEST-001:169` — "`test/generator.test.js` 的 U+2014 与 U+2013 禁令只扫**生成内容**，不扫测试文件". Both imply the generated `xsk-execute-plan` content is scanned. It is not.

**Evidence.** Every U+2014/U+2013 assertion in the repo:

```
test/skill-behavior.test.js:194:  assert.ok(!/—/.test(c), 'no em-dash');
test/skill-behavior.test.js:195:  assert.ok(!/–/.test(c), 'no en-dash');
test/generator.test.js:105:  assert.ok(!/—/.test(c), 'no em-dash (U+2014)');
test/generator.test.js:106:  assert.ok(!/–/.test(c), 'no en-dash (U+2013)');
```

`generator.test.js:105-106` sits inside `test('generator: xsk-write-req carries self-audit checkpoint and bans em/en dash')` where `const c = buildSkill(get('xsk-write-req')).content` — **xsk-write-req only**. `skill-behavior.test.js:194-195` sits inside the xsk-write-req block where `c = body(skills.find((s) => s.name === 'xsk-write-req'))` — same skill. I checked every all-skills loop in `generator.test.js` (`:46`, `:64`, `:75`, `:116`): they cover placeholders, frontmatter, non-empty content, and Waza-path bans. **None bans dashes.** No test anywhere scans `xsk-execute-plan`'s generated content for either character.

**Assessment.** `DES-VERIFY-001:188` mandates an explicit scan as an independent stopping condition, so the risk is genuinely mitigated — the defect is the *claimed* second layer. The design is otherwise meticulous that "每一层有独立的停机条件"; asserting a gate that does not exist invites an implementer to skip the manual scan on the belief that `npm test` catches it. RISK-CONV-001 is marked `[ADDRESSED]` on the strength of "DES-VERIFY-001 的字符扫描" (correct) while upstream's own mitigation text at `:314` names the same non-existent backstop (inherited, not the design's error to fix, but repeated uncorrected).

**Honesty note.** This sentence was present verbatim in v1 (`v1:183`) and I did not catch it. It is not a v2 regression; it is a defect I owe you late.

**Remedy.** Delete "背板" framing for the dash check in `Observability`, or correct it to "本技能的生成内容没有 dash 门禁，`DES-VERIFY-001` 的显式扫描是唯一一道". Note it does **not** change any number: I confirmed in v1 that the regenerated packed content contains zero U+2014 and zero U+2013.

### 3. MINOR — the RISK-STATE-002 status token was not downgraded, and `:153` claims it was

**Claim.** `DES-STATE-002:153` says "因此 Requirements Coverage 里 RISK-STATE-002 记为部分闭合". The table's machine-readable status token still reads `[ADDRESSED]`.

**Evidence.** `:83` is:

```
| RISK-STATE-002 [ADDRESSED] | DES-STATE-001 的 ... ；**部分闭合**，残余路径写在 DES-STATE-002 | [ADDRESSED] |
```

Two `[ADDRESSED]` tokens on the row (first column and status column); "部分闭合" appears only as free prose in the middle cell. The `## Trace` row at `:239` for `DES-STATE-002` is likewise `[ADDRESSED]`. Every other row in both tables uses the same token, so nothing distinguishes this risk from the fully-closed ones on a skim or to any tooling that reads the status column. This is the one place where the v1 MAJOR 1 remediation is thinner than the prose describes — the analysis is real, the status label is not.

### 4. MINOR — dangling cross-reference: the Coverage row credits DES-STATE-001 for content v2 moved out of it

**Claim.** `:83` credits "DES-STATE-001 的 `the run's one fix` 台账标记与两条独立断言". Neither is in DES-STATE-001 any more.

**Evidence.** v1's DES-STATE-001 contained the marker paragraph ("R3b 的 fix 额度靠台账标记 `the run's one fix` 跨会话…"). v2 correctly removed it and rebuilt it as DES-STATE-002. Grepping `05-design.md:119-141` (the whole of DES-STATE-001) for `one fix` returns **no match**. The two split assertions are specified in `DES-TEST-001:159` (the 19-assertion item), not in DES-STATE-001. So the Coverage cell points at a section for two things it no longer contains. Should read DES-STATE-002 (marker) and DES-TEST-001 (assertions).

### 5. MINOR — `## Trace` and `## Requirements Coverage` disagree in two places

**Claim.** The two tables encode the same ID↔upstream relation and no longer match after the DES-STATE-002 insertion.

**Evidence.**

- Trace `:239` links `DES-STATE-002 | SCOPE-IN-003, RISK-STATE-002`. The Coverage row for SCOPE-IN-003 (`:73`) lists only `DES-EDIT-001, DES-STATE-001` — DES-STATE-002 is absent.
- Coverage `:83` attributes RISK-STATE-002 partly to DES-STATE-001. Trace `:238` lists DES-STATE-001's upstream as `SCOPE-IN-002, SCOPE-IN-003, RISK-STATE-001` — RISK-STATE-002 is absent.

Both directions are one-cell edits. Everything else reconciles: I walked all 9 SCOPE-IN rows and all 9 RISK rows against the 6 Trace rows and found no other mismatch.

### 6. MINOR — new overclaim: "增写会打破按字面匹配的断言"

**Claim.** `:24` and `:151` both argue the residual cannot be closed because adding a sentence "会同时打破字节账与按字面匹配的断言".

**Evidence.** The byte half is true and decisive: 10,129 is an AC-2 hard number and 10,200 is the cap, so an added sentence breaks the account. The assertion half is not. The 19 new patterns plus the 2 R6 patterns are literal substrings or non-greedy spans; inserting a new sentence in step 5 or step 6 outside those spans breaks none of them, and even an insertion *between* `Allow at most one bounded fix` and `Only a \`done\` fix reruns…` would still match, because `[\s\S]*?` is unbounded. The argument does not need this second leg — the byte account alone carries it. Stating it anyway is the kind of surplus claim this design is otherwise careful to avoid.

### 7. MINOR — three-times-repeated misattribution: the second-fix path is not in the requirement's Background

**Claim.** `:24` "需求 Background 描述的'第二次 fix'路径"; `:149` "需求 Background 描述的那条路径"; `:151` "上游在 Background 与 R3 里逐段论证过这条路径".

**Evidence.** `00-raw-requirement.md` Background is lines 17-26: the purpose/behavior gap, the point-doc provenance, the two structural premises, and the current byte baselines. It contains no mention of fix, budget, or recovery. The path is argued in **R3** (`:129-131`) and independently in **RISK-STATE-002** (`04-risk-discovery.md`). Cosmetic in effect, but it sends a reader to the wrong section of a frozen upstream document, and correcting it is a three-word edit.

### 8. MINOR — `:135`'s "step 5 本来就要做的那一次验收" understates what follows a `done` fix

**Claim.** The `:58` reconciliation says the post-fix rerun "是 step 5 本来就要做的那一次验收".

**Evidence.** The new R3b text says `Only a \`done\` fix reruns all commands and the reviewer once` — a *second* acceptance pass, explicitly rationed to one, not the pass step 5 was already going to run (that one already happened and failed; that is why a fix was dispatched). The load-bearing part of the reconciliation is sound and unaffected — the fix is not one of the envelope's enumerated tasks, so `:58`'s "between tasks" does not reach it — but the supporting clause as written is not accurate about the fragment.

## Unresolved ambiguity

Re-checked from scratch against v2.

**None that requires human adjudication, with one caveat.**

- **The 19 assertion message strings** — no longer ambiguous. `DES-TEST-001:166` fixes the 取法 (self-authored, file's existing English voice, one sentence per assertion, property drawn from R5's "其余依次断言" paragraph) and states it affects no count and no budget. Bounded and decided.
- **The R7 comment prose** — no longer ambiguous. `:167` fixes the 取法 (self-authored, covers the four meanings, must delete `The packed cap is back at its original 12000`) and `:227` restates the deletion as a SPEC post-condition. Bounded and decided.
- **The dash convention for the new test-file prose** — `:169` states it is convention-governed with no test guard and instructs the implementer to avoid both characters. Decided. (Finding 2 is about the *other* half of that sentence, the claim about generated content.)
- **The R2 separator** (one space), **assertion block assignment**, **the negative assertion form**, **the two R6 patterns**, **the generation recipe and the two separate comparisons**, **the cap values**, **the rollback command** — all still pinned, unchanged from v1.

**Caveat (the one open item, tracked as Finding 1):** `## Decision Requests: none` is now correct for both authoring latitudes, but the residual second-fix path is a product-level acceptance that diverges from what the approved requirement promises. Whether that is a Decision Request or an upstream gap route is itself the choice the design has not made — it took the third option (accept silently) without saying it was choosing among three.

## Notes

- **v2 is a real improvement, not a paper one.** I checked each of the ten remediations for substance rather than presence, and none is a mention-only fix. `DES-STATE-002` in particular does exactly what a partial-closure section should: it says what the marker buys, what it does not buy, writes the surviving path as an executable trace, gives a defensible reason for not spending bytes, and converts the closable half into a checkable product-side signal (`the run's one fix` exactly once — verified: it is exactly once).
- **The `In a valid result` reading recorded at `:137` is the right call.** Upstream's own gloss (`00-raw-requirement.md:95`) says the phrase "把漏报 check 与整份任务返回缺失或畸形分开", which is compatible with, but weaker than, the design's stated reading that it scopes only the first clause. The design's reading is the only one that is not self-contradictory, and recording it rather than editing the frozen text is correct.
- **`:135`'s narrowing of `under every step 4 rule`** (task discipline yes, `:58`'s prohibition no) is presented as fact ("指的是") when it is an interpretation. It is the right interpretation and the design's reason for it is sound, but the literal tension in the fragment survives — which is precisely why `:135`'s closing observation that this is the strongest AC-3 mis-edit trigger is worth keeping prominent.
- **Nothing in v2 changed a number I verified in v1**, so the byte accounting (115 / 411 / 26 / 609 = 1161; 10129 / 13155 / 12629), the anchor uniqueness, the 29→48 assertion split, and the 247-case suite result all still stand as measured. I re-ran no sandbox suite, per instruction.
- **Everything I could check about the repo in v2 is now correct except Finding 2.** The `:498` fix, the two-paragraph description of `:368-378`, the 5-vs-11/12 non-greedy split, the 33,716 byte figure, the `:450` example, the "every `assert.ok` carries a message" claim (205/205), and the marker occurrence count all verified true against the working tree at HEAD `4c1a081`.

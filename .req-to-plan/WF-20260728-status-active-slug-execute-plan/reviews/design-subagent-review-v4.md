# Design subagent review v4

## Verdict

**approve with notes** — both v2 majors are properly closed: DECISION-001 is schema-conformant against `r2p/SKILL.md:36` with all six required fields and `Status: selected`, and the dash-gate correction is accurate down to every cited line number. Five minor defects remain, all prose-level and none affecting the implementation plan or any number.

## Verified facts

Read-only throughout. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

No repo file touched. No v3/v4 edit changed a byte figure, an assertion count, or the 247 test-case count, so per instruction I did not re-run the sandbox suite or recompute the byte accounting. Spot-confirmed that the untouched numbers are still on the page unaltered: `:54-63` byte table (115 / 411 / 26 / 609 = 1161; 10129 / 13155 / 12629), `:164` (10 + 8 + 11 = 29 → 10 + 16 + 22 = 48; 247; 205 → 224), `:41`/`:47`/`:48`/`:162` (`:368-378` two paragraphs, `:498`, 33,716 bytes, 5 in-block / 11 lines 12 occurrences). All identical to what I measured in v1 and v2.

### Remediation checklist — all eight landed, all substantive

**1. (v2 MAJOR 1) DECISION-001 — landed, and it is well-formed.**

The authoritative schema is `~/.claude/skills/r2p/SKILL.md:36`:

> Standard-tier DESIGN: record any human technical choice in `## Decision Requests` as a `### DECISION-NNN` block (`Question:`/`Options:`/`Recommended:`/`Status: pending`); pending blocks `gate-quality` until a human selects (`Status: selected` + `Selected:`/`Rationale:`), or write exactly `none` when no decision is needed

v4 `:197-203` supplies all six fields in schema order: `### DECISION-001` heading, `Question:`, `Options:` (A/B/C), `Recommended: A`, `Selected: A`, `Rationale:`, `Status: selected`. Conformant, and `selected` is precisely the state that unblocks `gate-quality`. It also matches repo precedent — `archive/WF-20260626-status-active-slug-post-review/05-design.md:262,269` uses the same field set.

The substance is real, not a stub:
- `:151` and `:198` quote `00-raw-requirement.md:129` **verbatim**. I checked the source: that line really does end "加上这个标记后，恢复端从台账即可读出额度已用，两条路径都收敛到 run `failed` 并进入 step 7。" ✔
- `:151` states plainly that the upstream sentence is 断言过强 on the done-fix path, and distinguishes it from the failed-fix path where upstream *did* accept a cost, citing `00-raw-requirement.md:131`. I checked: `:131` really does end "属于可接受的代价，不为它再花字节。" ✔ The distinction the design draws (upstream *accepted* one path, *claimed closure* on the other) is accurate to both lines.
- Downstream propagation landed in all three places named: Design Summary `:24`, SPEC Handoff preamble `:230` ("无未决项"), DES-VERIFY-001 交付层 `:193` ("不复述上游 R3'两条路径都收敛'的措辞").

**Nothing describes DECISION-001 as pending or unrouted.** I grepped all seven mentions (`:24`, `:83`, `:151`, `:155`, `:193`, `:197`, `:230`); six state or imply the decision is closed. The one exception is `:83`, raised as Finding 4 below. There are no `Status: pending`, `TODO`, `fill in`, or `<!-- -->` leftovers anywhere in the design body — the only `Status: open` lines in the file are inside the read-only upstream risk-discovery block (`:261` onward), which is not the design's to change.

**2. (v2 MAJOR 2) Dash-gate correction — landed, accurate, and not overcorrected.** I re-measured every claim in `DES-TEST-001:173`:

| Claim | Measured |
|---|---|
| all four dash assertions are at `generator.test.js:105-106` and `skill-behavior.test.js:194-195` | ✔ exactly those four lines, repo-wide |
| both sites target `xsk-write-req` | ✔ `generator.test.js:102` `const c = buildSkill(get('xsk-write-req')).content`; `skill-behavior.test.js:155` block header `xsk-write-req` |
| `generator.test.js` all-skills loops are at `:46`, `:64`, `:75`, `:116` | ✔ exactly those four line numbers |
| those loops scan placeholder / frontmatter / non-empty content / Waza paths, not dashes | ✔ `:46` placeholders, `:64` non-empty, `:75` frontmatter+description+placeholders, `:116` `check-update.sh` + `../../` |
| `xsk-execute-plan` generated content has **no** dash gate | ✔ confirmed |
| the test file itself has none | ✔ confirmed |

The `Observability:223` bullet no longer calls `generator.test.js` a dash 背板 and now states the explicit scan is the only check; it correctly *retains* `test/golden.test.js` as the generation-consistency backstop, which is true. `DES-VERIFY-001:192` 约定层 now covers 生成内容 + 新注释 + 新断言说明串. The design also correctly flags that this diverges from `CLAUDE.md:74`'s generalisation ("No em-dash ... in generated skill content (`test/generator.test.js`)") — I confirmed `CLAUDE.md:74` reads exactly that and does overstate. No overcorrection: every sentence in the new paragraph is literally true as measured.

**3. (v2 minor 3) RISK-STATE-002 row — landed. On adequacy: adequate, with one wording caveat.** `:83` now reads "**部分闭合**：可辨识性由 DES-STATE-002 ... 落地 ... 强制查询未落地 ... 此行的 `[ADDRESSED]` 只覆盖可辨识性那一半". I verified your premise about the vocabulary: grepping every closure tag across `03`, `04`, and `05` returns exactly two tokens, `[ADDRESSED]` and `[OUT-OF-SCOPE]` — there is no PARTIAL. Given that, encoding partiality as in-cell prose plus a `selected` DECISION-001 is the right call and is **not** misleading: the cell explicitly scopes what the token covers, which is stronger than v2's bare `[ADDRESSED]`. See Finding 4 for the one thing the cell still omits.

**4. (v2 minor 4) Mis-credit removed — landed.** `:83` now credits DES-STATE-002 (marker + product-side check) and DES-TEST-001 (the two split assertions). DES-STATE-001 is no longer credited for either; I re-confirmed `:119-141` contains no occurrence of `one fix`.

**5. (v2 minor 5) Trace vs Coverage — landed and now fully reconciled.** I walked both tables bidirectionally, every pair:

- Coverage → Trace: all 16 rows' 22 (source, DES-id) pairs appear in the Trace rows. The two v2 gaps are closed — SCOPE-IN-003 now lists DES-STATE-002 (`:73`), and DES-TEST-001's Trace row now lists RISK-STATE-002 (`:250`).
- Trace → Coverage: all 6 rows' 22 upstream references appear in Coverage.

**Zero mismatch in either direction, and no new mismatch introduced.** The DES-* ID set is intact: six headings (`:106`, `:119`, `:143`, `:157`, `:175`, `:183`), every referenced ID defined, every defined ID in Trace, no orphans.

**6. (v2 minor 6) Overclaim removed — landed.** `:153` now says the byte account is the only leg and explicitly notes the patterns survive an insertion ("19 条新 pattern 与 2 条 R6 pattern 要么是字面子串，要么是无界的 `[\s\S]*?` 跨段匹配，插入新句不影响它们"), with the self-aware coda about not propping a good conclusion on a bad reason. `:24` is correspondingly narrowed to the byte leg. This matches what I measured in v1. See Finding 1 for where the removed overclaim reappeared.

**7. (v2 minor 7) Background → R3 — landed.** `grep -n "Background" 05-design.md` returns **nothing**. All three misattributions are gone; `:24` and `:149` now say 需求 R3, which is where the path actually lives.

**8. (v2 minor 8) `:135` — landed and materially strengthened.** It now says the post-fix rerun is 第二遍验收 ("第一遍已经跑过并失败，这才有 fix"), 被显式限额为一次, and 不是 step 5 那一遍的延续 — which is what the fragment actually says. It also now labels the `under every step 4 rule` narrowing as "本设计的读法 ... 这是解释而非文本自明，字面张力在 fragment 里仍然存在", which is the honest framing I asked for.

## Findings

### 1. MINOR — DECISION-001 option B contradicts `:153`, inside the option set the owner decided on

**Claim.** `:199` option B ends "等于本需求退回 raw_requirement 重开，**R4 到 R8 全部重算**". `:153` says the opposite for two of those five.

**Evidence.** `:153` states, correctly and as I measured in v1, that inserting a sentence would not disturb the 19 new patterns or the 2 R6 patterns, because each is either a literal substring or an unbounded `[\s\S]*?` span. R5 *is* the 19 patterns and R6 *is* the two patterns. So under option B, R5 and R6 would need no recomputation at all — only R4 (caps), R7 (the comment's byte figure), and R8 (regeneration) would. "R4 到 R8 全部重算" is the same overstatement v4 just removed from `:24` and `:153`, resurfacing one section later in the very text the human read before choosing.

**Consequence.** Low: A was selected and A is the option that changes nothing. But it inflated B's cost in the document of record, and it is an internal contradiction between two sections written in the same pass.

### 2. MINOR — the option set omits a materially different fourth option, and B conflates two different costs

**Claim.** `:199` offers A (accept), B (spend bytes in the fragment), C (the design's reading is wrong). Missing: leave the implementation exactly as under A, and correct only the false closing claim in `00-raw-requirement.md:129`.

**Evidence.** The frozen, byte-bearing content is the four English replacement texts (raw `:73`, `:83`, `:110`, `:124`). Line `:129` is the Chinese rationale paragraph explaining why `the run's one fix` matters — it is not quoted into the fragment, not measured by the 1,161-byte account, and not matched by any assertion. Correcting that one sentence would change no byte figure, no cap, no pattern, and no implementation step. Option B as written bundles two distinct costs — "breaks 10,129 / 13,155 / 12,629 and R4's caps" (true only of a fragment edit) and "退回 raw_requirement 重开" (true of any upstream touch) — so the cheap doc-only variant is invisible in the choice presented.

**Counterweight, stated fairly.** It is not free in r2p mechanics: `/Users/xubo/.claude/commands/r2p-gap-open.md` says a route back to an owner stage marks downstream artifacts stale and forces re-derivation, so touching `00-raw-requirement` would stale `03`, `04`, and `05`. That is a real cost and it may well be why A still wins. The defect is that the owner was not shown the option, not that A is wrong.

**Residual after A.** An approved, frozen upstream artifact keeps a sentence the design has determined is false, and r2p's downstream stages re-derive from upstream artifacts. `DES-VERIFY-001:193` mitigates the delivery-facing half ("不复述上游 R3'两条路径都收敛'的措辞"), which is good, but `00-raw-requirement.md:129` itself stays wrong for any future reader.

### 3. MINOR — the 约定层 stopping condition can false-positive; the file being edited already contains 7 em-dashes

**Claim.** `DES-VERIFY-001:192` makes "生成内容、新注释、新断言说明串中均无 U+2014 与 U+2013" a stopping condition, and `DES-TEST-001:173` says the dash constraint on all three comes from 仓库约定. Neither notes that `test/skill-behavior.test.js` already violates that convention.

**Evidence.** `grep -cP '\x{2014}' test/skill-behavior.test.js` → **7**, at lines **8, 57, 120, 135, 155, 198, 238** — the file's own header comment plus six test titles, e.g. `:198` `test('skill-behavior: xsk-archive-req — validates slug, ...')`. So (a) the file's actual practice contradicts the "仓库约定" the design invokes, and (b) an implementer who runs the mandated scan at file granularity — the natural reading of a `wc`/`grep` stopping condition, and the form Observability otherwise encourages — will hit 7 pre-existing hits and stop on a false signal.

**Fix is one clause.** Scope the check to the newly written lines, and say the file already contains 7 em-dashes in pre-existing titles that must not be touched (SCOPE-OUT-004 territory anyway).

### 4. MINOR — `:83` is the only DECISION-001 mention that leaves the outcome unstated

**Claim.** The Coverage row says "残余路径见 DES-STATE-002 并已路由为 DECISION-001" — routed, with no indication the decision closed.

**Evidence.** Every other mention states the outcome: `:24` "裁决为'接受残余'", `:151` "裁决结果为 A", `:193` "按 DECISION-001 的裁决", `:230` "已由需求所有者裁决为 A ... 无未决项". `:83` stops at routing. It does not *assert* pendency, so it is not wrong — but Requirements Coverage is the summary view a checkpoint reader scans first, and it is the one place that leaves "was this ever decided?" open. Appending "，裁决为 A（接受残余）" closes it.

### 5. MINOR — DECISION-001 is absent from `## Trace`

**Claim.** The Trace table's stated job is "Map this stage's IDs to upstream/downstream" (template comment). It carries six DES-* rows and no DECISION row.

**Evidence.** DECISION-001 is a stage-local ID with an unambiguous upstream (SCOPE-IN-003, RISK-STATE-002, and `00-raw-requirement.md:129` itself) and a downstream consumer (SPEC Handoff items 3 and 10, DES-VERIFY-001's 交付层). This is the same class as the v1 finding about the empty Trace, one row smaller: the artifact's newest ID is the one ID the trace does not carry.

## Unresolved ambiguity

Re-checked from scratch against v4. **None found.**

- **The residual fix-budget closure** — no longer an unresolved point. It is routed, optioned, decided (`Selected: A`), rationalised, and marked `Status: selected`, which is exactly the disposition `r2p/SKILL.md:37` requires ("resolve it by evidence, or route it (DESIGN: `### DECISION-NNN`) before approving"). The design used the DESIGN-stage-correct mechanism. My v2 suggestion that it might go through `r2p-gap-open` was the weaker option for this stage; DECISION-NNN is right.
- **The 19 assertion message strings** — 取法 fixed at `:168` (self-authored, file's English voice, one sentence per assertion, property from R5's "其余依次断言"). Bounded, decided, affects no count.
- **The R7 comment prose** — 取法 fixed at `:169` (self-authored, four meanings, must delete `The packed cap is back at its original 12000`). Bounded, decided.
- **Dash handling for the new prose** — `:173` and `:192` now state exactly what is and is not gated and mandate the explicit scan. Decided (Finding 3 is about a false-positive hazard in the check, not about an undecided choice).
- **R2 separator, assertion block assignment, negative-assertion form, the two R6 patterns, the generation recipe and its two separate comparisons, the cap values, the rollback command** — all still pinned exactly as verified in v1.

The `## SPEC Handoff` preamble at `:230` now claims "无未决项" and, having walked items 1-11 plus the decision block, I agree: that claim is now accurate, where the v1/v2 equivalents were not.

## Notes

- **On the decision's provenance — UNCONFIRMED, and I checked before saying so.** The design records "需求所有者于 2026-07-28 在本 run 内裁决为 A". `run.md`'s `## User Confirmations` table is empty, which initially looked like a missing corroboration. It is not evidence of anything: I checked all four archived runs (`WF-20260625`, `WF-20260626`, `WF-20260629`, `WF-20260711`) and that table is empty in **every one**, including `WF-20260626` which demonstrably carried a human-selected DECISION block. r2p simply does not record decision selections there. So the selection has no independent record in run state by design, and I can neither confirm nor contradict it — I flag it only so nobody mistakes my acceptance for verification. `run.md` is otherwise consistent with a design under review: status `checkpoint_review`, last operation `review_checkpoint_design`, next `checkpoint_decide`, `## Open Routes` empty.
- **Precedent note on the `Selected:` line.** The archived design writes `Selected: A (stop and ask). Selected by the user on 2026-06-26.` — attribution on the `Selected:` line itself. v4 puts the bare choice on `Selected:` and the attribution in `Rationale:`. Both satisfy the schema; the archived form is marginally more scannable if you ever want to grep for who decided what.
- **`:151` is the strongest paragraph in the document.** Quoting the upstream sentence verbatim, naming it 断言过强, and then separating it from the adjacent path where upstream genuinely accepted a cost is precisely the distinction that was collapsed in v2. I verified both citations against the source lines and both are exact.
- **Nothing in v4 disturbed a verified number.** The byte table, anchor counts, assertion split, cap headroom (45 / 71), and 247-case suite all still stand as measured in v1's sandbox run. The five findings above are entirely prose-level; none of them changes what an implementer types.
- **What would make this a clean approve.** All five are one- or two-clause edits: drop "R4 到 R8 全部重算" from option B (or narrow it to R4/R7/R8), add the missing option or a sentence saying why a doc-only upstream correction was not offered, scope the dash scan to new lines and name the 7 pre-existing ones, append the decision outcome to `:83`, and add a DECISION-001 row to `## Trace`.

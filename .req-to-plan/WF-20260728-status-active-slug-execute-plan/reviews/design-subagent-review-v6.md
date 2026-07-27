# Design subagent review v6

## Verdict

**approve.** Plainly: all five v4 minors are properly fixed, the v5 gate rephrasing strengthened rather than weakened both statements, and nothing in the v5/v6 edits broke anything. The two minors below are about where an upstream-document finding gets filed, not about the change itself — neither touches an implementation step, a number, or a file in scope.

## Verified facts

Delta check only, per instruction: I audited the five changed sites plus a regression sweep, did not re-derive the artifact, and did not re-run the sandbox suite. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

No repo file touched.

### Regression sweep — nothing broken

Confirmed the invariants I measured in v1/v2/v4 are untouched at v6: `1,161` (14 occurrences), `10 + 16 + 22` (6), `205 变为 224` (1), `247 条` (3), and the `10,129 / 13,155 / 12,629` triple (13 hits). Six `### DES-` headings, seven Trace rows (6 DES + 1 DECISION), every referenced ID defined, no orphans. The Requirements Coverage ↔ Trace reconciliation I walked bidirectionally at v4 is undisturbed — the only Trace change is the appended DECISION-001 row.

### 1. Option B overclaim — fixed, and now consistent with DES-STATE-002

`:199` option B now reads: breaks 1,161's byte account, AC-2's 10,129, AC-4's 13,155 / 12,629, and R4's two cap values, therefore requires a reopen and a recompute of R4 and R7's byte narrative; "R5 与 R6 的 21 条 pattern 本身不受影响（见 DES-STATE-002 对这一点的说明）".

- The v4 contradiction is gone: `grep` finds no remaining "R4 到 R8 全部重算".
- **Consistent with `:153`**, which says the 19 R5 patterns and 2 R6 patterns survive an insertion because each is a literal substring or an unbounded `[\s\S]*?` span. 19 + 2 = **21** ✔ — the arithmetic matches and option B now explicitly cross-references that paragraph instead of contradicting it.
- Citations check out: AC-2 is the 10,129 criterion and AC-4 is the 13,155 / 12,629 criterion in `03-requirement-brief.md`; R4 is the cap values; R7 is the byte narrative. Dropping R8 from the list is correct — regeneration is re-run, not recomputed.

### 2. Fourth disposition — recorded, concrete, and adequate as a record

`:161` records it explicitly: a fourth action exists (correct the false sentence in the requirement doc, touching no byte of the fragment), it differs in kind from option B ("B 是往 fragment 里花字节，这条是纯文档订正，不碰任何字节账"), it edits a file outside what In-Scope covers, and this run's disposition is to use the 可辨识 framing in delivery and hand the correction back to the requirement owner as a finding.

I verified the handback target is real: `.xsk/requirements/execute-plan-return-bounds.md` exists (24,067 bytes) and contains the sentence exactly once. The In-Scope characterisation ("fragment、`test/skill-behavior.test.js` 与两份生成产物") is accurate against SCOPE-IN-001..008.

**Judgment on your question — adequate, not misrepresenting.** It does not misrepresent the owner's choice: it is explicitly labelled 未列入 DECISION-001 选项集, so the record now says plainly that the option set was {A, B, C} and that a fourth path was identified afterward. That is the honest disposition, and declining to decide it here is correct — the action edits a file this design has no mandate over, so it is a finding about an upstream document rather than an open point about this design. See Finding 2 for the one thing it does not do.

### 3. Dash scan scoping — fixed, and this is the strongest of the five edits

`:194` 约定层 now scopes the check to 本次改动引入的文本 (new fragment text, new comment, 19 message strings, 2 replaced patterns), explicitly not the whole file. Every factual claim in it verified:

| Claim | Measured |
|---|---|
| 7 em-dashes in `test/skill-behavior.test.js` | **7** ✔ |
| at `:8`, `:57`, `:120`, `:135`, `:155`, `:198`, `:238` | **8 57 120 135 155 198 238** ✔ exact match |
| en-dash count 0 | **0** ✔ (`grep -c` returns 0) |
| all in existing test titles and the top comment | ✔ `:8` is the header comment (`//   1. Reads naturally, in the author's voice — no AI-formulaic phrasing.`); `:57`, `:238` and the rest are `test('...')` titles |
| a whole-file grep necessarily returns 7, not 0 | ✔ follows |
| the correct check is scanning `git diff`'s added lines | ✔ sound, and the only method that distinguishes new from pre-existing |

**It does not read as an instruction to clean them up.** The operative clause is "它们是本次改动既不产生也不接触的既有文本" — a statement of non-involvement, with no imperative. There is defence in depth here too: the Boundaries section already limits test-file edits to 字节上限、预算注释与三个 xsk-execute-plan 内容契约块, and none of the seven lines falls in any of those (`:8` is the file header, `:155` is xsk-write-req's title, the rest belong to other skills' blocks). So an implementer has two independent reasons not to touch them.

### 4. `:83` coverage cell — fixed

Now reads "...已路由为 DECISION-001 并由需求所有者裁决为 A（接受残余）。此行的 `[ADDRESSED]` 只覆盖可辨识性那一半". The outcome is stated where a checkpoint reader scans first. All seven DECISION-001 mentions now carry the closed outcome; none reads as pending.

### 5. `[CLOSED]` token and the non-DES Trace row — both fine, neither breaks anything

**Is `[CLOSED]` right versus `[ADDRESSED]`?** Yes, and it is the better of the two. `[ADDRESSED]` in this run means "an upstream item is covered by a design item"; DECISION-001 is not a design item covering upstream, it is a decision that was made. `[CLOSED]` matches `Status: selected` in the block, and it is semantically aligned with the Trace template's own stated job ("R3 derives & checks closure"). Calling a decision "addressed" would have been the odd choice.

**Does a non-DES id break r2p's trace derivation?** No, on two pieces of evidence from the archive:

- The Trace `Status` column is **free-form in practice**, not a fixed vocabulary. Archived designs use bare lowercase words: `designed` (WF-20260629, WF-20260626), `derived` (WF-20260625), `mapped` (WF-20260711). This run's `[ADDRESSED]` is already outside that set, so `[CLOSED]` is not a new kind of departure.
- **Non-DES rows have direct precedent.** `archive/WF-20260625-.../05-design.md` puts `Requirements Coverage`, `Options Considered`, `Rollback`, and `Observability` in the "This ID" column. A `DECISION-001` row is far more id-shaped than those.

Token census across this run's four artifacts: 88 `[ADDRESSED]`, 20 `[OUT-OF-SCOPE]`, 1 `[CLOSED]`. See Notes on the singleton.

### v5 gate failure / R20 rephrasing — confirmed clean, and not weakened

I swept the entire design body (everything before `## Upstream Summary`) for deferral constructions — 不在本次、范围之外、留待、后续、推迟、将来、以后、defer, TODO — and for SCOPE-OUT citations:

- **No unanchored deferral survives.** The only hits are `:94` ("下一次增补不再需要论证", an argument about cap headroom, not a deferral of work) and `:153` ("为什么不在本次消除它", which states the reason inline — the byte account — and has been in the artifact since v2 and passed the gate then).
- **No SCOPE-OUT id is cited in either rephrased paragraph.** The body's only SCOPE-OUT citation is `:209`'s SCOPE-OUT-010 for the no-commit rollback statement, which is correct and pre-existing. You were right not to cite one: I re-checked SCOPE-OUT-001..010 and none covers either `.xsk/requirements/` or pre-existing test-file em-dashes.
- **Neither statement went vague — both got sharper.** The dash paragraph replaced a scope claim with seven exact line numbers, two exact counts, the reason a whole-file grep returns 7, and the correct method. The fourth-disposition paragraph names the exact file, the exact sentence, the exact replacement wording, the distinction from B, and a named recipient. Both are now more checkable than a "不在本次范围内" clause would have been.

## Findings

### 1. MINOR — the handback names one copy of the false sentence; three more survive on the r2p side

**Claim.** `:161` proposes correcting `.xsk/requirements/execute-plan-return-bounds.md`. DECISION-001's `Question:` and `:151` both anchor the same claim at `00-raw-requirement.md:129`. Those are different files, and correcting only the first leaves the r2p-side copies wrong.

**Evidence.** `grep -c "两条路径都收敛"`:

| File | Hits |
|---|---|
| `.xsk/requirements/execute-plan-return-bounds.md` | 1 (the handback target) |
| `00-raw-requirement.md` | 1 (what DECISION-001 quotes) |
| `03-requirement-brief.md` | 1 (its `## Upstream Summary` block) |
| `inputs/requirement_brief-content.md` | 1 |

The r2p copies are what downstream SPEC and PLAN stages re-derive from, and `00-raw-requirement.md:129` is the exact anchor the design itself uses when it argues the claim is 断言过强. So the handback as written would leave the design's own cited source uncorrected.

**Weight.** Low. `DES-VERIFY-001:193` already forbids repeating the wording in delivery, and `:151` records the divergence against the r2p copy, so a reader of the design gets the correct picture either way. The fix is one clause naming the r2p-side copies alongside the `.xsk` source, or a note that correcting them is a reopen-cascade decision the owner also has to make.

### 2. MINOR — the decision block is silent about the fourth disposition

**Claim.** `:161` is in DES-STATE-002. Nothing in DECISION-001's six fields mentions a fourth path.

**Evidence.** I read `Question:`, `Options:`, `Recommended:`, `Selected:`, `Rationale:`, `Status:` (`:197-203`) — none references `:161` or the doc-only correction. So an owner or auditor reading `## Decision Requests` as the record of what was decided sees a clean three-option choice and never learns a fourth was later identified and routed back to them. Given that the whole point of `:161` is to hand something *to the owner*, the handback is filed in the one section the owner is least likely to re-read.

**Weight.** Low, and it does not invalidate the decision — A is the option that changes nothing, so no realistic fourth-option analysis flips it. One sentence appended to `Rationale:` ("另有一条纯文档订正的处置，见 DES-STATE-002 末段，作为发现项交还") closes it.

## Unresolved ambiguity

**None found.** Re-checked from scratch against v6.

- **The fix-budget residual** — routed, optioned, `Selected: A`, rationalised, `Status: selected`, and now traced with `[CLOSED]`. Fully discharged per `r2p/SKILL.md:36-37`.
- **The fourth disposition** — not an open point about *this* design. It is a finding about a file outside the four in scope, explicitly labelled as outside the option set, with a named recipient and a stated disposition for this run. Findings 1 and 2 are about the completeness and filing of that handback, not about an undecided choice facing the implementer.
- **The 19 assertion message strings** and **the R7 comment prose** — 取法 still fixed at `:168`/`:169`, untouched by v5/v6.
- **Dash handling** — now the most precisely specified item in the verification matrix; the previously latent false-stop is named and the correct method given.
- **R2 separator, assertion block assignment, negative-assertion form, the two R6 patterns, the generation recipe and its two separate comparisons, the cap values, the rollback command** — all still pinned as verified in v1.

Nothing in the artifact now requires an implementer to make a judgment call the design has not already made for them.

## Notes

- **`[CLOSED]` is a singleton.** It appears once across all four of this run's artifacts (against 88 `[ADDRESSED]` and 20 `[OUT-OF-SCOPE]`) and is not glossed anywhere. It is the right word and it breaks nothing — but if you want the tables to be self-describing, one parenthetical at its only use site would do it. Not worth a revision on its own.
- **`DES-TEST-001:180` still says the dash constraint on the three new text sites "全部来自仓库约定"**, without the seven-em-dash context that `DES-VERIFY-001:194` now carries. The two paragraphs are complementary rather than contradictory — one describes where the constraint comes from, the other describes how to check it — and the operative one (the stopping condition) is now correct, which is what matters. Flagging only so you know the softer sentence is still there if you touch that section again.
- **Option B's "以及 R4 给定的两个上限取值" is very slightly over-general**: an insertion under 45 bytes would break AC-2 and AC-4 without breaching the caps (headroom is 45 packed / 71 behavior). For any realistic "显式查询指令" sentence it is true. Not worth changing in a decided option.
- **The v5 gate failure was worth having.** The rephrasing it forced produced the single most useful paragraph added since v2 — `:194` converts a latent false-stop I could only describe in v4 into a concrete, line-numbered, method-specified check. That is the opposite of what a gate-driven edit usually does to a document.
- **Trajectory.** v1 → v6 closed 2 majors and 12 minors with no number ever disturbed and no scope ever widened. Everything I measured at v1 — the four anchors, the per-change deltas, the 29 → 48 assertion split, the two assertions that break and the two patterns that fix them, the 247-case suite — still holds exactly as written. The design is implementable as it stands.

# Design subagent review v7

## Verdict

**changes requested** — the added paragraph is substantively accurate and the design's content genuinely did not need to change, but the design's own embedded `## Upstream Summary` still carries the **pre-gap** risk_discovery (nine × `Status: open`, no partial-closure paragraph), so the artifact now contradicts itself: the new paragraph says the nine are `mitigated` while the snapshot 235 lines below shows all nine `open`.

## Verified facts

Narrow re-derivation check. Read-only; no clone needed. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

Per instruction I did not re-audit the design, re-diff literals, or recompute byte figures.

### Q1 — I cannot do a reliable line-level diff, so I verified the claim directly

**Saying so plainly, as you allowed for.** My v6 audit was done with targeted `sed`/`awk` section reads rather than a full-file read, so I do not hold a trustworthy v6 line map. I attempted a landmark-offset diff and it came out internally inconsistent — the v6 position I had recorded for `### DES-TEST-001` cannot be reconciled with the v6 position I had recorded for DES-STATE-002's fourth-disposition paragraph. Publishing offsets from that would have been a guess dressed as a measurement, so I discarded it.

What I did instead was verify, element by element, that everything I *substantively* confirmed at v6 is present and unchanged at v7:

| Element verified at v6 | State at v7 |
|---|---|
| DES-STATE-002's seven paragraphs (marker 可辨识-vs-强制查询; 已闭合的部分; 残余路径; 与上游断言的落差 quoting `:129` and `:131`; 为什么不在本次消除它 with the byte-only leg and the patterns-survive note; 因此 Requirements Coverage…; the fourth-disposition paragraph) | all seven present, wording unchanged |
| Requirements Coverage — nine RISK rows, incl. the RISK-STATE-002 部分闭合 cell naming DES-STATE-002, DES-TEST-001 and DECISION-001 A | unchanged |
| `## Trace` — 6 DES rows + `DECISION-001 … [CLOSED]` | unchanged, still 7 rows |
| `## Decision Requests` — DECISION-001 with Selected: A / Status: selected | unchanged |

The Design Summary's re-derivation paragraph is new. **I found no other substantive change** — but I want to be exact about the limit of that statement: I am certifying "no substantive change I can detect", not "byte-identical outside the paragraph". And separately, one thing that *should* have moved did not (Finding 1).

### Q2 — the paragraph's factual claims

| Claim | Verified |
|---|---|
| the nine were `Status: open` before | ✔ — the design's own embedded copy still shows 9 `Status: open`, 0 `mitigated` |
| the nine are `Status: mitigated` now | ✔ — `04-risk-discovery.md` v3: 9 `mitigated`, 0 `open` |
| RISK-STATE-002's body records partial closure in those words | ✔ verbatim — v3 reads "**闭合是部分的，`Status: mitigated` 只覆盖落地的那一半。**" |
| `[ADDRESSED]` tags on the DES-STATE-002 / SPEC-REVIEW-003 references | ✔ — "（DES-STATE-002 [ADDRESSED] 与 SPEC-REVIEW-003 [ADDRESSED] 分别给出设计表述与契约判据）" |
| product-side check `the run's one fix` exactly once | ✔ present in v3's new paragraph |
| **"本设计的内容不因此改变"** | ✔ **true** — see below |

On the last one, which is the load-bearing claim: risk_discovery v3's new paragraph and the design's DES-STATE-002 assert the same four things — identifiability landed, enforced consultation did not, the residual is accepted under DECISION-001 option A with the frozen wording and the 1,161-byte account untouched, and the product-side check is `the run's one fix` occurring exactly once. The Requirements Coverage RISK-STATE-002 cell says the same and scopes its `[ADDRESSED]` to the identifiability half. **No contradiction between the design body and risk_discovery v3.** One inaccuracy in the paragraph is Finding 2.

### Q3 — does the upstream edit invalidate anything the design asserts?

**No.** Grepping the entire design body (everything before `## Upstream Summary`) for a dependency on the risks being open returns exactly one hit — the new paragraph itself, which describes the transition rather than relying on the old state. The design expresses risk closure through `[ADDRESSED]` tags in Requirements Coverage and Trace, which are a different field from `Status:` and were already `[ADDRESSED]` at v6. Nothing in the design ever asserted, implied, or depended on `Status: open`.

### Q4 — what else the v3 edit touched downstream

Finding 1 below is the substantive one. Two further observations:

- `06-spec.md`'s embedded `## Upstream Summary` carries design **v6** and is now stale against v7. You already know the SPEC must be re-derived, so this resolves itself — but it is worth checking on that re-derivation that the SPEC's snapshot actually refreshes to v7, because the same miss that produced Finding 1 would produce a stale design snapshot there.
- risk_discovery v3's own `## Trace` still tags all nine RISK rows `[ADDRESSED]`, consistent with both v1 and the design. No issue.

## Findings

### 1. MAJOR — the design's embedded upstream snapshot is the pre-gap risk_discovery, contradicting the paragraph that was just added

**Claim.** `05-design.md:24` asserts "九条统一改为 `Status: mitigated`". The design's own `## Upstream Summary (read-only)` block, starting at `:259`, still reproduces the **old** risk_discovery.

**Evidence.**

- Inside the design's embedded block: **9 × `Status: open`, 0 × `Status: mitigated`**.
- The embedded RISK-STATE-002 body has **no** partial-closure paragraph — grep for 部分闭合 / 可辨识 inside the block returns 0. So it is the pre-v3 text, not merely stale statuses.
- Net effect: one artifact says both things. `:24` — "九条统一改为 `Status: mitigated`". `:259+` — nine consecutive `Status: open` lines.

**These snapshots are populated at derivation time, not frozen at first creation.** `06-spec.md` (created 19:22) embeds design **v6** content including the fourth-disposition paragraph that v6 introduced — so the block tracks whatever the upstream said when the artifact was derived. Design v7's `r2p_updated_at` is `19:54:35`; risk_discovery v3's is `19:54:09`. The refreshed upstream existed 26 seconds before the design was rewritten, and the snapshot did not pick it up.

**Why major.** The re-derivation existed for exactly one purpose: to consume risk_discovery v3. The design's own record of that upstream is still the version showing the precise condition that failed the PLAN gate. The gate itself is safe — you confirmed r2p reads closure from `04-risk-discovery.md`, not from a downstream artifact's snapshot — so this is not a re-rejection risk. But a reviewer or a later stage reading the design's Upstream Summary as the authoritative picture of risk closure gets nine `open`, and the artifact fails an internal-consistency read.

**Remedy, either is fine.** Refresh the embedded block from risk_discovery v3 (preferred — it is what a re-derivation means), or, if that block is tool-owned and cannot be regenerated on re-derivation, add one clause to `:24` recording that the snapshot below predates the fix. I could not determine from the repo whether the fence is author-writable or r2p-generated; the contradiction needs resolving either way.

### 2. MINOR — the parenthetical "（写它时确实还没有缓解方案）" is not true

**Claim.** `:24` explains the nine `Status: open` values with "写它时确实还没有缓解方案" (there genuinely were no mitigations when it was written).

**Evidence.** The old risk_discovery embedded in this very design carries a full `## Mitigations` section with **nine** entries, every one tagged `[ADDRESSED]` and giving a concrete mitigation — e.g. "RISK-IMPL-001 [ADDRESSED]：编辑前先对四个锚点各做一次精确计数…". risk_discovery v3 still has the same nine. Mitigations existed from v1 onward.

So the gap was never an absence of mitigations; it was that the `Status:` field was never updated to match the Mitigations section that already existed alongside it. The paragraph misdiagnoses its own history in the artifact of record.

**Weight.** Low — it is a retrospective note, not a contract, and the corrective action (flip the field, record the partial closure) was right regardless. But the note exists to explain the gap to a future reader, and as written it explains it wrongly. Replacing the parenthetical with something like "（缓解方案当时已写在 `## Mitigations` 里，只是 `Status:` 字段没有同步）" makes it accurate at no cost.

## Unresolved ambiguity

**None introduced by v7.** The re-derivation is a documentation change; it adds no choice for an implementer. DECISION-001 remains `Status: selected` with option A, the two bounded authoring latitudes remain decided, and the mandated fragment/test/generation contracts are untouched. Everything I certified as unambiguous at v6 remains so.

The one open question is not an ambiguity in the design but a fact I could not establish from the repo: whether the `<!-- /r2p-read-only -->` upstream block is author-writable or regenerated by r2p. That determines which of the two remedies in Finding 1 applies, not whether a remedy is needed.

## Notes

- **The substance of the re-derivation is right.** "本设计的内容不因此改变" is the claim that mattered most and it holds: I checked risk_discovery v3's new partial-closure paragraph against DES-STATE-002 and against the Requirements Coverage RISK-STATE-002 cell, and all three tell the same story with the same four elements. The upstream fix and the design agree, which is what makes this a genuine no-op re-derivation rather than a silent semantic change.
- **The gap R-1 diagnosis is worth recording as a reusable lesson**, and it is a good catch on r2p's part: the `## Mitigations` section and the per-block `Status:` field were two representations of the same fact that drifted apart, and only one of them is machine-read. Any future run that writes mitigations should set `Status:` in the same pass. The design's note would carry that lesson well if Finding 2's parenthetical were corrected — as written it teaches the wrong lesson ("we hadn't mitigated yet") instead of the right one ("we had, and the field didn't say so").
- **Scope of my certification, stated honestly.** I verified that no substantive element changed between v6 and v7 and that the added paragraph is accurate except for one parenthetical. I did not and cannot certify byte-level identity outside the paragraph, because I lack a reliable v6 line map. If you need that guarantee, a `git diff` against a stored v6 copy would give it directly; I would not want the offset reconstruction I attempted to stand in for it.
- **Nothing in the frozen-content areas is affected.** This change touches no literal, no byte figure, no assertion, and no contract. Everything measured across the earlier reviews — the four anchors, 115 / 411 / 26 / 609 = 1161, 10,129 / 13,155 / 12,629, the 21-pattern split, 247 — is untouched and still stands.

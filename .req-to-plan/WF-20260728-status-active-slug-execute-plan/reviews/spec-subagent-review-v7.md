# Spec subagent review v7

## Verdict

**approve.** The snapshot refresh is byte-faithful to design v8, every body invariant I approved at v4 is unchanged, and the new paragraph's factual claims check out. **I have nothing at any severity — no blocker, no major, no minor.**

## Verified facts

Narrow re-derivation check. Read-only; no clone needed. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

Per instruction I did not re-audit the SPEC, re-diff the frozen literals, or recompute byte figures.

### 1. The refreshed snapshot — byte-faithful to design v8

Same method I verified for design v8: took `05-design.md`, stripped its r2p frontmatter, cut at its own first nested `(read-only)` section, and compared against the SPEC's block between `## Upstream Summary (read-only)` and the first fence.

**`embedded.trim() === stripped.trim()` → TRUE.** Raw delta 2 bytes (34,494 vs 34,496), both whitespace, matching the identical normalization I confirmed on the design side. **Nothing was dropped or mangled — the comparison is exact.** Confirming the specific structures you named:

| Check | Result |
|---|---|
| design's re-derivation paragraph | present, 1× |
| `### DES-*` headings | **6** |
| `### DECISION-001` with `Status: selected` | present, 1 each |
| design Trace rows (`DES-*` + `DECISION-001`) | **7** |
| Requirements Coverage rows (`SCOPE-IN-*` + `RISK-*`) | **18** |
| nested `(read-only)` sections leaked | **0** — correctly stripped, so the design's own embedded risk_discovery copy is not carried through |

### Fences and Project Context — intact

Counted and paired, as you suggested: `<!-- /r2p-read-only -->` occurs exactly **2** times — one closing the upstream snapshot, one closing Project Context. `## Project Context (read-only)` is present exactly once with its body intact (`repo_root` through `source_dirs`). No unclosed, duplicated, or displaced fence.

### 2. The SPEC body is unchanged from the v4 I approved

The cheapest decisive check is the fenced-block fingerprint over the body only (everything before `## Upstream Summary`, so the newly embedded design cannot contaminate it):

```
SPEC body fenced blocks: 14
lengths: 257,60,71,183,372,410,97,792,79,454,691,129,110,435
MATCH v4 fingerprint: true
```

Byte-length-identical to v4 across all fourteen blocks. That covers the twelve frozen literals plus the caps and generation blocks without re-diffing any of them.

Every structural invariant likewise:

| Invariant | v4 | v7 |
|---|---|---|
| `### SPEC-*` contracts | 13 | **13** |
| Test Matrix rows | 13 | **13** |
| Trace rows | 13 | **13** |
| Pattern split (block A / block B / replacements) | 8 / 11 / 2 = 21 | **8 / 11 / 2 = 21** |
| Measured table rows | 6 | **6** |
| SPEC-VERIFY-001 stopping table (data rows) | 15 | **15** |

So the 13/13/13 structure, the 21 patterns and their claim allocation, the six-row measured table, and the fifteen-row stopping table are all exactly as approved.

### 3. The new paragraph — factually accurate

Verbatim:

> **针对上游 R-1 缺口的重新派生说明**：PLAN 的 trace 闭合只从 risk_discovery 每个 `### RISK-*` 块的 `Status:` 字段读风险闭合，而九条都停在 `Status: open`；缺的不是缓解方案（`## Mitigations` 自 v1 起就有九条 `[ADDRESSED]`），而是 `Status:` 从未与之同步。缺口经 R-1 路由回 risk_discovery 修复（九条改 `Status: mitigated`，RISK-STATE-002 [ADDRESSED] 另补记了"闭合是部分的，该状态只覆盖落地的可辨识性那一半"，判据见 SPEC-REVIEW-003），design 随之重新派生到 v8。本 SPEC 的契约内容不因此改变：13 条 `SPEC-*` 契约、9 段冻结文本、21 条 pattern、六行实测表与 15 行停机表全部与重新派生前逐字相同，本节下方的 Upstream Summary 快照已同步到 design v8。

| Claim | Verified |
|---|---|
| the nine sat at `Status: open` | ✔ — I measured this directly at design v7, where the then-embedded **pre-gap** copy showed 9 `Status: open`, 0 `mitigated` |
| **`## Mitigations` had nine `[ADDRESSED]` from v1** | ✔ — the same pre-gap copy carried a full `## Mitigations` section with 9 `[ADDRESSED]` entries; this is first-hand evidence of the pre-fix state, not an inference from v3 |
| the gap was `Status:` never syncing | ✔ follows from the two above |
| nine changed to `Status: mitigated` | ✔ — `04-risk-discovery.md` v3: 9 mitigated, 0 open |
| RISK-STATE-002 gained the partial-closure note | ✔ — present in v3 and in the design's refreshed snapshot |
| **design re-derived to v8** | ✔ — `05-design.md` `r2p_version: 8` |
| `RISK-STATE-002 [ADDRESSED]` tag present | ✔ — 1 occurrence in the SPEC body |
| **"本 SPEC 的契约内容不因此改变"** | ✔ — independently confirmed by the fingerprint and the six structural counts above |
| 13 contracts / 21 patterns / 6 rows / 15 rows | ✔ all four counts verified |
| snapshot synced to design v8 | ✔ — byte-faithful, per section 1 |

Nothing in the paragraph is false.

### 4. What the refresh broke

**Nothing.** The fingerprint match plus six matching structural counts rules out collateral change in the body; the exact snapshot comparison rules out damage in the embedded block; the fence count rules out a structural break.

## Findings

**None.** No blocker, no major, no minor.

## Unresolved ambiguity

**None.** v7 is a documentation-only re-derivation: a refreshed read-only snapshot and one narrative paragraph. It adds no choice for an implementer. Every contract, literal, pattern, count, and acceptance criterion is byte-identical to the v4 I approved, and the two bounded authoring latitudes remain decided as before.

## Notes

- **Two small imprecisions in the paragraph, neither an inaccuracy, neither worth an edit on its own.**
  - "9 段冻结文本" is ambiguous. SPEC-FRAGMENT-001 holds **8** fenced literals (four old anchors including the preserved R2 anchor, plus four new/appended texts); counting the caps block as a ninth piece of upstream-frozen verbatim text makes it 9. Under that reading it is correct. Either way the claim it supports — that they are byte-identical to pre-re-derivation — is verified true.
  - The paragraph names `design v8` but does not name `risk_discovery v3`, though your message described it as recording both. Not a defect: the SPEC's direct upstream is the design, which it does version explicitly, and the design's own paragraph names risk_discovery v3 one hop up. Nothing false is stated.
- **The `RISK-STATE-002` reference is not the hazard I flagged on the design side.** I checked, and it is ordinary: the SPEC's Trace table already references `SCOPE-IN-*` and `DES-*` IDs that are not defined locally either. Referencing upstream IDs across stage boundaries is the norm here, which is why the tag was sufficient to clear the closure gate. The design-side oddity I noted at v8 was different in kind — a stage-04 artifact citing a stage-06 ID, i.e. a *forward* reference. Nothing like that appears here.
- **The `## Trace` heading collision between the SPEC body and the embedded design snapshot predates v7** and is inherent to embedding an upstream artifact that carries its own Trace. The refresh introduced no new collision.
- **Method note for future refreshes.** The strip transformation has now been verified byte-faithful twice — risk_discovery v3 → design v8, and design v8 → SPEC v7 — each time landing a 2-byte whitespace delta and a trimmed-identical body. That is a reusable, cheap verification: compare `embedded.trim()` against `stripped.trim()`, count fences, and fingerprint the body's fenced blocks. Three commands, and it certifies the refresh without re-auditing anything.
- **SPEC stage looks closeable from my side.** Across v1 → v7 this artifact has closed 3 majors and 7 minors, and every quantity it asserts — the twelve literals, the byte account, the 21-pattern split, the six-state failure table, the fifteen stopping rows — has been independently reproduced.

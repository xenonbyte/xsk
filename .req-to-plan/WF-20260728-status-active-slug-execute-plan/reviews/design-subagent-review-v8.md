# Design subagent review v8

## Verdict

**approve.** Both v7 findings are properly fixed. The refreshed snapshot is a byte-faithful copy of risk_discovery v3's body, and the design body outside the two edit sites is positionally identical to v7. **I have nothing at any severity — no blocker, no major, no minor.**

## Verified facts

Narrow check. Read-only; no clone needed. **Final `git status --short`:**

```
?? .req-to-plan/WF-20260728-status-active-slug-execute-plan/
```

### 1. The embedded snapshot — byte-faithful, nothing dropped or mangled

I reproduced your transformation programmatically: took `04-risk-discovery.md` v3, stripped its r2p frontmatter, cut at its own first nested `(read-only)` section, and compared against the design's block between `## Upstream Summary (read-only)` and the first `<!-- /r2p-read-only -->` fence.

**`embedded.trim() === stripped.trim()` → TRUE.** The raw byte delta is 2 (9,500 vs 9,502), and both bytes are whitespace: the stripped source carries a leading `\n` left by the frontmatter cut and one extra trailing `\n`. That normalization matches how the original embed was written. **Nothing was dropped or mangled — the comparison is exact, so no enumeration is needed to prove it.** Enumerating anyway, since you asked for the specific structures:

| Check | Result |
|---|---|
| `Status: mitigated` (line-anchored) | **9** |
| `Status: open` | **0** |
| RISK-STATE-002 partial-closure paragraph (闭合是部分的) | present, 1× |
| `DES-STATE-002 [ADDRESSED]` / `SPEC-REVIEW-003 [ADDRESSED]` | both present |
| product-side check (`恰好命中一次`) | present |
| `### RISK-*` blocks | **9** |
| `## Mitigations` entries tagged `[ADDRESSED]` | **9** |
| `## Trace` table rows | **9** |
| Headings preserved | `# Risk Discovery`, `## Risks`, all 9 `### RISK-*` (with their full Chinese titles), `## Boundaries`, `## Scope Overflow Risks`, `## Mitigations`, `## Trace` |
| Nested read-only sections leaked | **0** occurrences of `(read-only)` inside the snapshot — correctly stripped |

One number worth explaining so it does not look like an anomaly: a naive substring count of `Status: mitigated` returns **10**, not 9. The tenth is the inline mention inside RISK-STATE-002's own partial-closure sentence ("`Status: mitigated` 只覆盖落地的那一半"), not a status line. Line-anchored counting gives the correct 9.

### Fence and Project Context integrity

- `<!-- /r2p-read-only -->` occurs exactly **2** times — one closing the upstream snapshot, one closing Project Context. No unclosed or duplicated fence.
- `## Project Context (read-only)` is present exactly once and its body is intact (`repo_root` … through `source_dirs`), untouched by the refresh.

### 2. The Design Summary paragraph — false claim removed, replacement accurate

The parenthetical "（写它时确实还没有缓解方案）" is gone. The replacement states that risk_discovery has had a complete `## Mitigations` section with all nine `[ADDRESSED]` since v1, and that the actual gap was `Status:` never syncing with it. **That is accurate** — I verified 9 `[ADDRESSED]` mitigation entries in both the pre-gap copy (which v7 still embedded) and in v3.

Two further improvements I did not ask for and that check out:

- It now describes the gate precisely as reading "每个 `### RISK-*` 块的 `Status:` 字段", matching the mechanism you described.
- It states "本节下方的 Upstream Summary 快照也已同步到 v3" — which is now true, and closes the v7 self-contradiction from the assertion side as well as the snapshot side.

### 3. The design body outside the two edit sites — unchanged from v7

This check is much stronger than the one I could run at v7, because the v7 landmark positions were measured directly from the v7 file rather than reconstructed from memory.

**All 17 section landmarks sit at identical line numbers in v8 and v7 — delta +0 across the board**, including `## Upstream Summary` at line 259. So lines 1-258 are positionally identical, meaning the Design Summary paragraph was rewritten in place at the same one-line length despite being longer in characters.

Total file length: v8 = 358, v7 = 356, **+2 lines, all of them after line 259** — entirely inside the refreshed snapshot, and exactly accounted for by risk_discovery v3's added partial-closure paragraph (one content line plus one blank).

Stating the limit honestly, as I did at v7: landmark equality proves positional identity, not character identity, for lines 1-258. Combined with the +2 total being fully explained by the snapshot's known growth, and with the substantive spot-checks I ran at v7 (DES-STATE-002's seven paragraphs, the nine Requirements Coverage RISK rows, the 7-row Trace with `DECISION-001 [CLOSED]`), I am confident nothing else moved — but a `git diff` against a stored v7 copy remains the only way to certify that at character level.

### 4. Hazards checked — none found

- **Duplicate headings**: the snapshot contains `## Trace`, which the design body also has at :248. That duplication is inherent to embedding an upstream artifact that carries its own Trace, and it predates v8 — v6 and v7 had the same shape. The refresh introduced no *new* collision; `## Risks`, `## Boundaries`, `## Scope Overflow Risks`, and `## Mitigations` are unique to the snapshot.
- **Broken read-only fence**: no. Exactly two fences, correctly paired, and the upstream block terminates cleanly before `## Project Context`.
- **Unclosed upstream ID reference inside the embedded text**: every ID cited in the snapshot resolves or is deliberate — see Notes for the one structural oddity, which is not a defect.

## Findings

**None.** No blocker, no major, no minor. Both v7 findings are fixed, the refresh is byte-faithful, and I found nothing that v8 broke.

## Unresolved ambiguity

**None.** v8 is a documentation-only change: a refreshed read-only snapshot and a corrected historical note. It adds no choice for an implementer. DECISION-001 remains `Status: selected` / option A, the two bounded authoring latitudes remain decided, and every fragment, test, and generation contract is untouched.

## Notes

- **One structural oddity worth watching, not a finding.** The refreshed snapshot carries risk_discovery v3's reference to `SPEC-REVIEW-003 [ADDRESSED]` — a SPEC-stage ID cited from a stage-04 artifact, now transitively present inside the design. It is a forward reference across two stage boundaries, and `SPEC-REVIEW-003` is not defined anywhere in `05-design.md`. It is deliberate (you added those tags so risk_discovery would pass its own closure-tag gate), it did not stop the design's gate, and it accurately describes where the contract lives. Flagging it only because if a future gate revision scans read-only blocks for reference resolution, this is the reference that would trip it. `DES-STATE-002` in the same sentence resolves fine — it is defined in the design body at :145.
- **The whitespace normalization was the right call.** Trimming the leading newline the frontmatter cut leaves behind, and the trailing blank, is what the original embed did; had you preserved them the block would have been a faithful copy that nonetheless differed from every other embed in the run. Consistency here matters more than raw fidelity, and the trimmed comparison proves no content was affected.
- **The corrected paragraph now teaches the right lesson.** The v7 wording implied "we had not mitigated yet"; the v8 wording says the mitigations existed and the machine-read field did not reflect them. That is the reusable takeaway from gap R-1, and it is the version a future run benefits from reading.
- **Nothing in the frozen-content areas is affected**, and I did not revisit them. The four anchors, 115 / 411 / 26 / 609 = 1161, 10,129 / 13,155 / 12,629, the 21-pattern split, and the 247-case suite all stand as measured across the earlier reviews.
- **Design stage looks closeable from my side.** Across v1 → v8 this artifact has closed 4 majors and 14 minors, and every quantity it asserts has been independently reproduced at least once.

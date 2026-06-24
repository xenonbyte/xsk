stage: design
version: 2
reviewer: subagent (read-only)
audited_at: 2026-06-25T00:00:00Z

## Audit Scope

Reviewed `docs/REQUIREMENTS.md` (spec, §1–14) against `.req-to-plan/WF-20260625-xsk-agent-skill-aggregator-status/05-design.md` (design v2) on the four required axes: spec compliance, design quality, unresolved ambiguity, and hedging.

## Findings

### a. Spec compliance

- **[Info]** All seven in-scope items (SCOPE-IN-001..007) are explicitly mapped in the design's "Requirements Coverage" section, each to a concrete module or skill-behavior owner. No in-scope item is dropped.
- **[Info]** Acceptance criteria are covered: install round-trip (DES-ARCH-001 install/uninstall flows), `status --json` (Observability), user-edit retention with partial report (Rollback), and non-agent-skill refusal (mapped to scaffold skill behavior in SCOPE-IN-007). The design references "AC-001..007" which are not literally numbered in REQUIREMENTS.md §12, but every Success Criterion (§1) and every manual Acceptance check (§12) has a corresponding design element.
- **[Minor]** REQUIREMENTS.md §7 / D7 / §4.2 state `xsk-bypass-claude` is Claude-only and other platforms skip it. The design's `skills.js` description mentions "platforms targeting," but the **install-flow prose** ("for each platform, write `<skill-root>/<name>/SKILL.md`...") does not surface the per-skill platform filter step. An implementer reading only the flow sentence could install bypass-claude to all four. The spec disambiguates, so this is minor, but the install-flow description should name the filter explicitly. (Cites REQUIREMENTS.md §7, §4.2, D7.)
- **[Minor]** REQUIREMENTS.md §6 specifies `--platform=<list>` (equals form) and `--json` for `status`/`doctor`. The design's `input.js` line covers "`--platform` list parsing" but does not mention the `=`-form or the `--json` machine-output flag. Not contradictory, but unstated in the design. (Cites REQUIREMENTS.md §6.)
- **[Minor]** REQUIREMENTS.md §4.3 / §12 require a bilingual README (`README.md` + `README.zh-CN.md`) with content-pinning tests as a self-conformance deliverable. The design folds this entirely under "SCOPE-IN-007 → self-conformance test" and never lists README parity as a design element or build artifact, unlike `LICENSE`/`package.json` which the spec also mandates. (Cites REQUIREMENTS.md §4.3, §12.)

### b. Code / design quality

- **[Info]** DES-ARCH-001 mirrors REQUIREMENTS.md §5 faithfully. Responsibilities are cleanly separated: parsing (`input.js`), registry (`skills.js`), rendering (`generator.js`), install/uninstall/manifest safety trio, read-only surface (`status.js`), environment probes (`capability.js`), and per-platform adapters with no capability logic leaked into them. No speculative abstraction or unnecessary indirection detected.
- **[Info]** Zero-dependency constraint (D5) is honored: design states "zero third-party runtime deps" twice and relies only on Node built-ins (`node:test`, `assert`, `fs.rename`, `path.join`).
- **[Info]** Locked decisions D1–D8 are respected. D4 (uniform `<name>/SKILL.md`, all 4 full) and D5 (self-contained zero-dep) are explicitly restated; D8 (doctor = env + manifest only) is precisely bounded in Observability and Boundaries.
- **[Minor]** D7 (bypass-claude Claude-only) is only implicit via the registry's `platforms` field; see finding (a) above. Restating it in DES-ARCH-001 would tighten the contract.
- **[Info]** DES-SEC-001 correctly carries the five safety invariants from §9 (owned-only removal, marker-gated dir removal, symlink refusal, atomic write + backup restore, field-preserving merge). The Rollback section restates them operationally.

### c. Unresolved ambiguity / undecided points

- **[Minor]** DES-ARCH-001 describes adapters as "skills-dir root + optional frontmatter rendering." The word "optional" is the only soft term. REQUIREMENTS.md §7 specifies that `when_to_use`/`dispatch_intent` "may" be rendered into frontmatter, body, or metadata, and that opencode ignores unknown frontmatter fields. The design does not state which adapter renders what, leaving the per-platform frontmatter policy to the implementer. The spec's alias-collision rule (§7) constrains the outcome, so this is resolvable from the spec, but the design could commit a one-line rule (e.g., "required frontmatter is the opencode subset; extras go to body/metadata only"). (Cites REQUIREMENTS.md §7.)
- **[Info]** "Light environment checks" for `capability.js` is vague in isolation, but Observability and Boundaries pin `doctor` precisely to Node version, target-dir writability, and manifest validity (D8). No implementer would guess wrong.
- **[Info]** No undefined terms, no use of banned qualifiers ("fast", "supported", "as needed") in the design's own prose.

### d. Hedging without decision

- **[Info]** The design is decision-complete. "Decision Requests: none." Chosen Design and Options Considered commit to a single option in each case (manifest-backed safety, build-time inlining, uniform SKILL.md, self-owned checklist). No "may/could/or" hedging that defers a decision to the implementer.
- **[Info]** The only "may" in the design's vicinity lives in the upstream REQUIREMENTS.md §7 ("adapters may render..."), which is a spec-level allowance, not design-level hedging. The design inherits it without adding new hedging.
- **[Info]** Rollback, Observability, and SPEC Handoff sections each state hard invariants ("must hold"), not soft preferences.

## Verdict

Verdict: pass — the design is a faithful, decision-complete distillation of the spec with clean module separation and all in-scope items and acceptance points covered; the four Minor findings are prose-completeness gaps (per-skill platform filter in the install-flow sentence, `--platform=`/`--json` flags, bilingual README as an explicit deliverable, adapter frontmatter policy) that the spec already disambiguates, none of which block implementation.

stage: spec
version: 2
reviewer: subagent (read-only)
audited_at: 2026-06-24T20:09:12Z

## Audit Scope

Read-only audit of `06-spec.md` against `docs/REQUIREMENTS.md` (§1, §2, §4, §5–§9, §12, §13) and the approved `05-design.md`, on four axes: completeness/coverage, quality, unresolved ambiguity, and hedging-without-decision.

## Findings

### a. Spec completeness / coverage

All 7 Behavior Contracts (SPEC-BEHAVIOR-001..007) trace cleanly to a design component and acceptance criterion via the spec's Trace table (06-spec.md:71–83), and all 7 ACs appear in the Test Matrix (06-spec.md:52–57): AC-001/AC-007 via the round-trip, AC-002 via the safety suite, AC-003 via golden snapshots, AC-004 via manual scaffold-gate acceptance, AC-005 via the self-conformance test, AC-006 via README content-pinning. No AC or DES-ARCH-001/DES-SEC-001 component is left unspecified.

- [Info] The 5 skills split into 1 CLI-backed behavior contract (`xsk-bypass-claude`, SPEC-BEHAVIOR-007) and 4 pure-instruction skills (`xsk-think`, `xsk-skill-scaffold`, `xsk-write-req`, `xsk-archive-req`). The latter are authored SKILL.md content with no CLI-testable behavior beyond "installs correctly," so the absence of behavior contracts for them is correct for a CLI-level spec; their behavior lives in REQUIREMENTS.md §4.1/§4.3/§4.4/§4.5. AC-003's "behaves as specified / reads naturally" half is honestly acknowledged as non-mechanical (06-spec.md:54 golden-snapshots the shell only), matching §12's "executable floor" framing.
- [Info] SCOPE-IN-006 (the `requirements/` convention, REQUIREMENTS.md §10) is carried only implicitly — via PLAN Handoff Phase 3 (06-spec.md:67) — with no Trace row and no Test Matrix entry. Acceptable since write-req/archive-req are instruction skills, not CLI code, but worth noting it is the one in-scope item with no explicit spec surface.
- [Minor] No dedicated Test Matrix assertion that `xsk-bypass-claude` is *skipped* on the 3 non-Claude platforms (D7 / REQUIREMENTS.md §7, §4.2). SPEC-BEHAVIOR-001 states the skip rule (06-spec.md:13) and the round-trip would implicitly expose it, but the per-`(skill × platform)` golden snapshot (06-spec.md:54) does not call out the `(bypass-claude × {codex,opencode,gemini}) = absent` case. A targeted assertion would close AC-001's targeting half explicitly.

### b. Spec quality

Behavior contracts are concrete and testable: SPEC-BEHAVIOR-007 pins exact JSON, 2-space indent, trailing newline, and idempotency; SPEC-BEHAVIOR-003 defines `ok`/`drift`/`invalid` with explicit triggers; SPEC-BEHAVIOR-001/002 pin the install→manifest and manifest→remove flows with exit-code requirements. The manifest schema (06-spec.md:35) lists `schema_version`, `platform`, `version`, `installed_at`, `installed_paths[]`, `backups[]` — a complete match to REQUIREMENTS.md §9. All five safety invariants (owned-only removal, ownership markers, symlink refusal, atomic write, user-edit preservation) are each captured as testable behavior in SPEC-BEHAVIOR-001/002 and the safety Test Matrix row.

- [Important] **User-edit detection mechanism is unspecified.** SPEC-BEHAVIOR-002 requires "if a generated file was modified by the user, keep it, report a partial uninstall, and narrow the retained manifest" (06-spec.md:16), but neither the spec nor the manifest schema defines *how* a user modification is detected. The schema (06-spec.md:35) has no checksum/hash field, so stored-hash comparison is not pre-registered; regenerate-and-diff is feasible (generation is deterministic `{{PLACEHOLDER}}` substitution per SPEC-BEHAVIOR-006) but not committed. This is safety-relevant (user-edit preservation underpins RISK-SEC-001) and an implementer must currently guess. Note the gap originates upstream — REQUIREMENTS.md §9 and 05-design.md are equally mechanism-agnostic — so it is faithful distillation, not a spec defect; PLAN should pin one mechanism (recommend regenerate-and-diff, or extend the schema with a per-path digest).

### c. Unresolved ambiguity

- [Important] See (b): the user-edit-preservation detection method is the one ambiguity that would force an implementer to make a safety-relevant design choice at coding time.
- [Minor] Partial-uninstall exit code value is not pinned. SPEC-BEHAVIOR-002 (06-spec.md:16) and API/Config Contracts (06-spec.md:38) commit to "a distinct code" but not the integer. Given the requirement is decision-complete with no placeholders, pinning it (e.g. `2`) removes a small guess.
- [Minor] Re-install / manifest-rewrite semantics are loose. SPEC-BEHAVIOR-001 says install "append[s] every created path" to the manifest (06-spec.md:13). It is unstated whether a re-install over xsk's own prior output dedupes/rewrites the manifest or appends duplicate entries, and whether an xsk-owned file from a previous install is backed up as a "pre-existing user file." Affects install idempotency.
- [Info] `status` precedence when a manifest is simultaneously schema-invalid *and* path-drifting is unspecified (SPEC-BEHAVIOR-003, 06-spec.md:19); the reasonable default is `invalid` wins, but it is not stated.
- [Info] `.xsk-owned` marker "content = package name" (06-spec.md:37) is ambiguous between the scoped name `@xenonbyte/xsk` and the binary `xsk`; trivial to pin.

### d. Hedging without decision

No uncommitted "may/could/or" that defeats the decision-complete requirement. The only flagged hedging is non-blocking:

- [Info] "the adapter **may** render [`when_to_use`/`dispatch_intent`] into supported frontmatter, body, or sidecar — never a required field for a platform that ignores it" (06-spec.md:28, 36). This "may" is deliberate, bounded platform flexibility inherited verbatim from REQUIREMENTS.md §7, with a hard constraint ("never required") that makes it decision-complete. No action.
- [Minor] "a distinct code" for partial uninstall (see c) is the sole genuine hedge against a decision-complete baseline; everything else commits.

## Verdict

Verdict: pass — the spec is a faithful, internally consistent distillation of the approved design with all 7 ACs and Behavior Contracts traceable and testable; the single [Important] finding (unspecified user-edit detection mechanism) originates upstream and is resolvable at PLAN time without reopening any locked decision, so it does not block this stage.

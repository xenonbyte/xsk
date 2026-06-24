---
r2p_stage: risk_discovery
r2p_version: 1
r2p_status: approved
r2p_created_at: 2026-06-24T19:57:28.015519+00:00
r2p_updated_at: 2026-06-24T19:57:28.235036+00:00
---

# Risk Discovery

## Risks
### RISK-SEC-001 — Destructive writes into user home config dirs
Status: mitigated
Installing into `~/.claude/skills/`, `~/.agents/skills/`, `~/.config/opencode/skills/`, `~/.gemini/skills/` can delete or overwrite user/third-party files if uninstall removes the wrong path.

### RISK-SEC-002 — Symlink traversal / removal
Status: mitigated
Following or removing through a symlink could escape the intended directory and delete unintended files.

### RISK-SEC-003 — Corruption of existing user config on merge
Status: mitigated
`xsk-bypass-claude` merges `.claude/settings.json`; a bad merge could drop user fields.

### RISK-TECH-001 — Platform skill-loading behavior drifts over time
Status: mitigated
The install paths and discovery rules (§7) are time-sensitive facts verified only as of 2026-06-25. Future Codex/Gemini/opencode/Claude changes can silently break installs.

### RISK-TECH-002 — Cross-platform alias collision
Status: mitigated
`~/.agents/skills/` is read by Codex (primary), Gemini and opencode (alias). A skill body that depends on a field one platform ignores will break silently.

### RISK-TECH-003 — Self-conformance circularity
Status: mitigated
The project must conform to its own scaffold standard; the standard and the project co-evolve, risking a permanently-failing self-conformance test.

## Boundaries
- `xsk` writes only under `~/.xsk/` and the four platform skill dirs it installs into — nowhere else under the user's home.
- Uninstall removes only manifest-recorded paths, and only after verifying the `.xsk-owned` ownership marker inside each directory.
- `xsk` never removes or traverses through symlinks; it refuses on encounter.
- `xsk-bypass-claude` writes exactly one field (`permissions.defaultMode`), preserving every other key, and reads only `.claude/settings.json` (not `settings.local.json`).
- `doctor` is read-only probing of Node version, target-dir writability, and manifest shape; it makes no capability claims.

## Scope Overflow Risks
- Growing into a general skill marketplace / registry / distribution server (SCOPE-OUT-001).
- Embedding an MCP server (SCOPE-OUT-002).
- Adding runtime capability verification that spawns sub-agents (SCOPE-OUT-003).
- Adding automatic upstream skill-update fetching after distillation (SCOPE-OUT-004).
- Extending to Windows-first guarantees (SCOPE-OUT-005).
- Adding a 6th skill beyond the locked set of 5 (SCOPE-IN-001).

## Mitigations
- Manifest-backed install/uninstall with per-directory `.xsk-owned` markers gates all directory removal (RISK-SEC-001).
- Symlink refusal at every removal/traversal path (RISK-SEC-002).
- Atomic writes (temp-sibling + rename) with backup restore on failure; field-preserving merge for `xsk-bypass-claude` (RISK-SEC-003).
- Platform facts carry a verification date (2026-06-25) and a reference list (§14); `doctor` and docs flag staleness rather than assert immutability (RISK-TECH-001).
- Alias-collision rule: generated skill bodies and required frontmatter are platform-neutral; platform-specific extras are optional metadata/sidecars only (RISK-TECH-002).
- Self-conformance split into an executable machine-checkable test floor (§12) plus the scaffold skill's judgment (RISK-TECH-003); Locked Decisions (§13) freeze scope.

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| RISK-SEC-001 | requirement_brief SCOPE-IN-004, AC-002 | derived |
| RISK-SEC-002 | requirement_brief SCOPE-IN-004 | derived |
| RISK-SEC-003 | requirement_brief SCOPE-IN-001 (bypass-claude), AC-002 | derived |
| RISK-TECH-001 | requirement_brief Assumptions, SCOPE-IN-003 | derived |
| RISK-TECH-002 | requirement_brief SCOPE-IN-003, Assumptions | derived |
| RISK-TECH-003 | requirement_brief SCOPE-IN-007, AC-005 | derived |
| Boundaries | requirement_brief SCOPE-IN-004, SCOPE-IN-001 | derived |
| Scope Overflow | requirement_brief SCOPE-OUT-001..005 | derived |

## Upstream Summary (read-only)
# Requirement Brief

## Goal
Ship `xsk` — a zero-dependency Node 20 CommonJS CLI that curates 5 agent skills (2 distilled from third parties + 3 original) and installs them across Claude Code, Codex, opencode, and Gemini with manifest-backed safety. The project itself conforms to the same scaffold standard it ships.

## In-Scope
- SCOPE-IN-001: 5 skills — `xsk-think`, `xsk-bypass-claude`, `xsk-skill-scaffold`, `xsk-write-req`, `xsk-archive-req`
- SCOPE-IN-002: CLI surface — `install`, `uninstall`, `status`, `help`, `version`, `doctor`
- SCOPE-IN-003: 4 platforms full — Claude Code, Codex, opencode, Gemini
- SCOPE-IN-004: Manifest-backed install/uninstall safety — owned-only removal, ownership markers, atomic writes (temp-sibling + rename), symlink refusal
- SCOPE-IN-005: Generation model — `shared/` + `templates/skill.md.tmpl` + `templates/fragments/`, inlined into each generated SKILL.md at build time
- SCOPE-IN-006: `requirements/` directory convention — at-most-one active doc, gitignored `archive/`, maintained by write-req/archive-req
- SCOPE-IN-007: Self-conformance — the repo satisfies its own scaffold standard (machine-checkable floor via the self-conformance test)

## Out-of-Scope
- SCOPE-OUT-001: No remote skill marketplace, registry, or distribution server
- SCOPE-OUT-002: No MCP server embedded in the project
- SCOPE-OUT-003: No runtime capability verification via isolated sub-agents (pure-instruction skills; `doctor` probes environment/manifest only)
- SCOPE-OUT-004: No automatic upstream skill-update fetch after distillation (one-time authoring step)
- SCOPE-OUT-005: No Windows-first guarantees; target macOS/Linux with Node ≥ 20 (`path.join` separators)

## Non-Goals
- Not a general-purpose skill marketplace or distribution platform.
- Not a replacement for any platform's native skill system; xsk only emits `SKILL.md` skill directories.
- Not a runtime capability verifier; skills are pure instructions.

## Assumptions
- Node ≥ 20 is available on the target machine.
- Target OS is macOS or Linux; path separators handled via `path.join`.
- The user's home directory and the platform skill dirs are writable by `xsk`.
- Platform skill-loading behavior matches REQUIREMENTS.md §7, verified 2026-06-25 against the official Codex, opencode, Gemini, and Claude Code docs (auto-discovery of `<name>/SKILL.md` directories; Codex at `~/.agents/skills/` with no launch flag).

## Acceptance Criteria
- AC-001: `xsk install` installs every applicable skill into every target platform's skill directory at full capability (no advisory-only).
- AC-002: `xsk uninstall` removes exactly and only the files `xsk` created; user/third-party files untouched.
- AC-003: Each of the 5 skills installs, behaves per its spec (§4.1–4.5), and reads naturally (no AI-formulaic wording).
- AC-004: `xsk-skill-scaffold` on a non-agent-skill project fails loud with a one-sentence reason.
- AC-005: `xsk-skill-scaffold` applied to this repo audits to zero gaps (self-conformance).
- AC-006: `npm test` (`node --test`) full suite passes; `npm run syntaxcheck` clean; `npm pack --dry-run` contents correct.
- AC-007: `status` validates manifest shape (not just parse success) and reports `ok`/`drift`/`invalid` per platform; uninstall preserves user edits with a partial report.

## Open Questions
- None. REQUIREMENTS.md is decision-complete with no placeholders ("Open Questions: None blocking").

## Sources
- `docs/REQUIREMENTS.md` — §1 Success Criteria, §2 Scope, §4 Skills Spec, §7 Multi-Platform Install Model, §9 Install Safety, §12 Verification.
- Official platform docs verified 2026-06-25 — Codex Agent Skills, opencode Skills, Gemini CLI Agent Skills, Claude Code settings.

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| SCOPE-IN-001 | raw_requirement §2, §4.1–4.5 | derived |
| SCOPE-IN-002 | raw_requirement §2, §6 | derived |
| SCOPE-IN-003 | raw_requirement §2, §7 | derived |
| SCOPE-IN-004 | raw_requirement §2, §9 | derived |
| SCOPE-IN-005 | raw_requirement §2, §8 | derived |
| SCOPE-IN-006 | raw_requirement §2, §10 | derived |
| SCOPE-IN-007 | raw_requirement §4.3 | derived |
| SCOPE-OUT-001..005 | raw_requirement §2 Out-of-Scope | derived |
| AC-001..005 | raw_requirement §1 Success Criteria | derived |
| AC-006 | raw_requirement §12 | derived |
| AC-007 | raw_requirement §9 | derived |
<!-- /r2p-read-only -->

## Project Context (read-only)
# Project Context Pack

- repo_root: `/Users/xubo/x-studio/skills-group`
- languages: {}
- package_managers: none
- test_commands: none
- entrypoints: none
- config_files: none
- dependencies (0): none
- source_dirs: ['docs']
<!-- /r2p-read-only -->

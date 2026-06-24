---
r2p_stage: spec
r2p_version: 2
r2p_status: approved
r2p_created_at: 2026-06-24T20:06:12.464961+00:00
r2p_updated_at: 2026-06-24T20:10:07.031430+00:00
---

# Spec

## Behavior Contracts
### SPEC-BEHAVIOR-001 — `install [--platform <list>]`
Generate one `<name>/SKILL.md` per (skill × selected platform) by inlining `shared/` + the skill's `templates/fragments/` into `templates/skill.md.tmpl`. For each platform: preflight writability, back up any pre-existing user file at the target, write atomically (temp-sibling + `rename`), drop a `.xsk-owned` marker inside each created skill dir, then append every created path to `~/.xsk/manifests/<platform>.manifest`. Per-skill platform targeting: a skill with `platforms: [claude]` (e.g. `xsk-bypass-claude`) is skipped on other platforms. `--platform` defaults to all 4; rejects unknown/duplicate values and any unknown option (fail loud). Exit 0 on success, non-zero on any failure after rollback.

### SPEC-BEHAVIOR-002 — `uninstall [--platform <list>]`
Read the manifest; remove only manifest-recorded paths. Before removing a directory, require a valid `.xsk-owned` marker inside it; if absent, skip and report. Never remove or traverse a symlink. If a generated file was modified by the user, keep it, report a *partial* uninstall, and narrow the retained manifest so a later run can finish. Exit 0 (full) or a distinct code (partial).

### SPEC-BEHAVIOR-003 — `status [--json]`
Read-only. For each platform report one of `ok` (manifest shape valid AND recorded paths present on disk), `drift` (paths no longer match disk), or `invalid` (schema version mismatch, wrong platform, or missing required fields). Shape validation, not just parse success. `--json` emits machine-readable output.

### SPEC-BEHAVIOR-004 — `doctor [--json]`
Read-only probing only: Node version (>= 20), target skill-dir writability, manifest validity. Pass/fail per check. Makes no capability claim about the pure-instruction skills.

### SPEC-BEHAVIOR-005 — `version` / `help` / no-args
`version` (also `--version`/`-v`) prints the package version. `help` (also `--help`/`-h`, and on no-args) prints the user command list. Unknown options fail loud.

### SPEC-BEHAVIOR-006 — Generation model
`shared/` is the single source of truth, inlined into every generated SKILL.md at build time (no runtime `shared/` dir under user home). `templates/fragments/<skill>.<section>.md` supplies per-skill variant text; `{{PLACEHOLDER}}` substitution only. The emitted body and required frontmatter are platform-neutral (alias-collision rule).

### SPEC-BEHAVIOR-007 — `xsk-bypass-claude` skill (Claude only)
Operate on cwd's `.claude/settings.json`. If absent, create `.claude/` and write `{"permissions":{"defaultMode":"bypassPermissions"}}`. If present, set only `permissions.defaultMode` preserving every other field (2-space indent + trailing newline). Idempotent no-op if already set. Reads only `.claude/settings.json`, never `settings.local.json`.

## API / Data / Config Contracts
- **CLI argv**: subcommand in {install, uninstall, status, doctor, version, help}; `--platform <list>` (comma-separated, also `--platform=<list>`); `--json`; `-v`/`--version`/`-h`/`--help`. Unknown options → non-zero exit.
- **Manifest schema** (`~/.xsk/manifests/<platform>.manifest`, JSON): `schema_version`, `platform`, `version` (package version/provenance), `installed_at`, `installed_paths[]` (every file/dir created), `backups[]` (each `{target, backup}` for a displaced pre-existing file).
- **SKILL.md frontmatter**: `name` (lowercase, hyphenated, <=64 chars, matches folder) and `description` (required) on every generated file; `when_to_use`/`dispatch_intent` are source metadata the adapter may render into supported frontmatter, body, or sidecar — never a required field for a platform that ignores it.
- **Filesystem**: `xsk` writes only under `~/.xsk/` and the four platform skill roots (`~/.claude/skills/`, `~/.agents/skills/`, `~/.config/opencode/skills/`, `~/.gemini/skills/`). `.xsk-owned` marker (content = package name) inside each installed skill dir.
- **Exit codes**: 0 success; non-zero on failure (with rollback); distinct partial-uninstall code.

## External Documentation Checked
Platform install/discovery behavior verified against the official docs (REQUIREMENTS.md section 14).

| Dependency | Version | Check Date | Conclusion |
|---|---|---|---|
| Codex Agent Skills | n/a | 2026-06-25 | user skills at `$HOME/.agents/skills/<name>/SKILL.md`; auto-detected with restart fallback; no `--enable skills` flag |
| opencode Skills | n/a | 2026-06-25 | `<name>/SKILL.md` from `~/.config/opencode/skills/`; Claude- and agent-compatible; frontmatter limited to name/description/license/compatibility/metadata |
| Gemini CLI Agent Skills | n/a | 2026-06-25 | `~/.gemini/skills/<name>/SKILL.md` plus the `~/.agents/skills/` alias |
| Claude Code settings | n/a | 2026-06-25 | `permissions.defaultMode = "bypassPermissions"` verified |

## Test Matrix
- `npm test` (`node --test`) full suite; `node --test test/<file>` single; `npm run syntaxcheck` (`node --check` all `bin/`,`lib/`,`test/`).
- Install -> status valid -> uninstall -> clean round-trip (AC-001, AC-002, AC-007).
- Safety: owned-only removal, ownership-marker gating, symlink refusal, atomic-write rollback, user-edit preservation (AC-002; RISK-SEC-001 [ADDRESSED], RISK-SEC-002 [ADDRESSED], RISK-SEC-003 [ADDRESSED]).
- Golden-snapshot of generated SKILL.md shell per (skill × platform), masking embedded `shared/` body (AC-003).
- README content-pinning (commands/tokens present; EN/CN heading parity) (AC-006).
- Self-conformance test: five CLI commands resolve, EN/CN README headings match, `lib/manifest.js` + `LICENSE` exist, `package.json` carries required fields (AC-005, SCOPE-IN-007).
- Manual acceptance: `xsk install` -> `~/.claude/skills/xsk-think/SKILL.md` loads; `xsk status --json` valid; non-agent-skill project + scaffold errors out (AC-004).

## Non-goals
- No remote skill marketplace/registry/distribution server (SCOPE-OUT-001).
- No embedded MCP server (SCOPE-OUT-002).
- No runtime capability verification via sub-agents (SCOPE-OUT-003).
- No automatic upstream skill-update fetch after distillation (SCOPE-OUT-004).
- No Windows-first guarantees; macOS/Linux, Node >= 20 (SCOPE-OUT-005).

## PLAN Handoff
Build in the REQUIREMENTS.md section 11 phase order: Phase 1 (skeleton + install core + `xsk-think` on Claude, with project baseline `package.json`/`LICENSE`/bilingual README + self-conformance floor), Phase 2 (`xsk-bypass-claude` + codex/opencode/gemini adapters + `doctor`), Phase 3 (`xsk-skill-scaffold` + `xsk-write-req` + `xsk-archive-req`). Hold invariants: zero third-party runtime deps; one SKILL.md per (skill × platform); platform-neutral generated body + required frontmatter; `status` validates shape not just parse; the self-conformance test is the executable floor. The module list from DES-ARCH-001 is the build order.

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| SPEC-BEHAVIOR-001 | design DES-ARCH-001, DES-SEC-001; requirement SCOPE-IN-004, AC-001 | derived |
| SPEC-BEHAVIOR-002 | design DES-ARCH-001, DES-SEC-001; requirement AC-002; risk RISK-SEC-001 [ADDRESSED], RISK-SEC-002 [ADDRESSED] | derived |
| SPEC-BEHAVIOR-003 | design DES-ARCH-001; requirement AC-007 | derived |
| SPEC-BEHAVIOR-004 | design DES-ARCH-001; requirement D8 | derived |
| SPEC-BEHAVIOR-005 | requirement SCOPE-IN-002 | derived |
| SPEC-BEHAVIOR-006 | design DES-ARCH-001; requirement SCOPE-IN-005; risk RISK-TECH-002 [ADDRESSED] | derived |
| SPEC-BEHAVIOR-007 | requirement SCOPE-IN-001, D7; risk RISK-SEC-003 [ADDRESSED] | derived |
| API/Config Contracts | design DES-ARCH-001, DES-SEC-001 | derived |
| External Docs Checked | requirement Assumptions; risk RISK-TECH-001 [ADDRESSED] | derived |
| Test Matrix | requirement AC-001..007, section 12 | derived |
| PLAN Handoff | design DES-ARCH-001; requirement section 11 | derived |

## Upstream Summary (read-only)
# Design

## Design Summary
A self-contained, zero-dependency Node ≥ 20 CommonJS CLI. A `skills.js` registry describes 5 skills with per-platform targeting; `generator.js` renders one `<name>/SKILL.md` per (skill × platform) by inlining `shared/` behavior and per-skill `templates/fragments/` into `templates/skill.md.tmpl`. `install.js` writes each artifact into the platform's skill dir via atomic temp-sibling + `rename`, backed by per-platform manifests under `~/.xsk/`. `uninstall.js` is manifest-owned and ownership-marker-gated. `status`/`doctor` are read-only surface checks. The repo is greenfield, so this design is the from-scratch blueprint.

## Current Code Evidence
Greenfield. The repo currently contains only `docs/REQUIREMENTS.md` plus tooling dirs (`.req-to-plan`, `.codegraph`, `.drfx`, `.claude`). No `package.json`, no `bin/`, no `lib/`, no dependencies, no entrypoints (Project Context Pack: `source_dirs: ['docs']`). Every component below is to be built.

## Requirements Coverage
- SCOPE-IN-001 (5 skills) → `skills.js` registry + `skills/<name>/SKILL.md` sources.
- SCOPE-IN-002 (CLI surface) → `bin/xsk.js` dispatching `lib/input.js`-parsed commands.
- SCOPE-IN-003 (4 platforms full) → `lib/adapters/{claude,codex,opencode,gemini}.js`.
- SCOPE-IN-004 (manifest-backed safety) → `lib/install.js` + `lib/uninstall.js` + `lib/manifest.js` + `.xsk-owned` markers.
- SCOPE-IN-005 (generation model) → `lib/generator.js` + `shared/` + `templates/`.
- SCOPE-IN-006 (requirements/ convention) → the write-req/archive-req skill behaviors.
- SCOPE-IN-007 (self-conformance) → the self-conformance test + scaffold skill.
- AC-001..007 → covered by install/uninstall/generator + status/doctor + the test suite.

## Options Considered
- Install safety: (A) manifest-backed owned-only removal vs (B) naive copy/overwrite with timestamp markers. Chose A — only A can prove "remove exactly what we created" and gate directory removal (RISK-SEC-001 [ADDRESSED], RISK-SEC-002 [ADDRESSED]).
- Generation model: (A) build-time inlining of `shared/` vs (B) a runtime `shared/` dir under the user home. Chose A — single source of truth, no stray runtime dir, simpler uninstall (D5).
- Cross-platform artifact: (A) one uniform `<name>/SKILL.md` vs (B) per-platform distinct artifacts. Chose A — all 4 platforms load SKILL.md skill dirs (D4); platform differences stay frontmatter/body-neutral.
- Standard source: (A) self-owned canonical checklist vs (B) an external rule file. Chose A — no external source to track or drift from (§4.3).

## Chosen Design
### DES-ARCH-001 — Layered zero-dep CLI
Module layout (mirrors REQUIREMENTS.md §5):
- `bin/xsk.js` — entry; argv → command.
- `lib/input.js` — argv parsing, `--platform` list parsing, unknown-option rejection.
- `lib/skills.js` — skill registry: 5 skills, metadata, `platforms` targeting.
- `lib/generator.js` — render SKILL.md from `shared/` + `templates/skill.md.tmpl` + `templates/fragments/`.
- `lib/install.js` — plan → preflight → backup → atomic write → manifest record.
- `lib/uninstall.js` — manifest-owned, `.xsk-owned`-gated, symlink-refusing removal.
- `lib/manifest.js` — read/validate/write `~/.xsk/manifests/<platform>.manifest`.
- `lib/status.js` — read-only; `ok`/`drift`/`invalid` by validating manifest shape vs disk.
- `lib/capability.js` — light environment checks for `doctor`.
- `lib/adapters/{claude,codex,opencode,gemini}.js` — skills-dir root + optional frontmatter rendering; no capability probes.

Install flow: generate → for each platform, write `<skill-root>/<name>/SKILL.md` + `.xsk-owned` marker atomically, displacing pre-existing user files to backups, then record every path in the manifest. Uninstall flow: read manifest → for each path, verify the ownership marker for dirs → remove file/dir → never traverse symlinks → report full or partial (user-edited files retained, manifest narrowed).

### DES-SEC-001 — Safety invariants
Owned-only removal; ownership markers gate directory removal; symlink refusal; atomic write with backup restore; field-preserving JSON merge for bypass-claude.

## Decision Requests
none

## Rollback
`xsk uninstall` is the rollback. It removes only manifest-recorded paths after verifying `.xsk-owned` markers; never touches unowned or third-party files; refuses symlinks; retains user-edited generated files with a *partial* report and a narrowed manifest so a later uninstall can finish. Atomic writes keep a pre-write backup so a failed write restores the original in place.

## Observability
- `xsk status [--json]` — per-platform `ok` / `drift` / `invalid`; validates manifest shape, not just parse success; flags path drift vs disk.
- `xsk doctor [--json]` — Node version, target-dir writability, manifest validity; pass/fail per check.
- Each manifest records `schema_version`, `platform`, `version`/provenance, `installed_at`, `installed_paths[]`, `backups[]` — the audit trail for any install/uninstall.
- Install/uninstall report every path written/removed and any displaced user files.

## SPEC Handoff
Implementation must hold these invariants: zero third-party runtime deps; one `<name>/SKILL.md` per (skill × platform); generated body + required frontmatter are platform-neutral (alias-collision rule); `status` validates shape not just parse; the self-conformance test is the machine-checkable floor. The module list in DES-ARCH-001 is the build order; REQUIREMENTS.md §11 phases map features to deliverables.

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| DES-ARCH-001 | requirement_brief SCOPE-IN-002..005; risk RISK-SEC-001 [ADDRESSED], RISK-SEC-002 [ADDRESSED], RISK-SEC-003 [ADDRESSED] | derived |
| DES-SEC-001 | requirement_brief SCOPE-IN-004, AC-002, AC-007; risk RISK-SEC-001 [ADDRESSED], RISK-SEC-002 [ADDRESSED], RISK-SEC-003 [ADDRESSED] | derived |
| Requirements Coverage | requirement_brief SCOPE-IN-001..007, AC-001..007 | derived |
| Options Considered | requirement_brief Non-Goals, Assumptions; raw §13 Locked Decisions | derived |
| Rollback | requirement_brief AC-002; risk RISK-SEC-001 [ADDRESSED] | derived |
| Observability | requirement_brief AC-007; risk RISK-TECH-001 [ADDRESSED] | derived |
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

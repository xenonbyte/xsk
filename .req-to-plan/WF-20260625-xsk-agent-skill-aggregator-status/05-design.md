---
r2p_stage: design
r2p_version: 2
r2p_status: approved
r2p_created_at: 2026-06-24T19:58:44.481076+00:00
r2p_updated_at: 2026-06-24T20:04:47.820214+00:00
---

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

## Upstream Summary (read-only)
# Risk Discovery

## Risks
### RISK-SEC-001 — Destructive writes into user home config dirs
Status: open (mitigation in place)
Installing into `~/.claude/skills/`, `~/.agents/skills/`, `~/.config/opencode/skills/`, `~/.gemini/skills/` can delete or overwrite user/third-party files if uninstall removes the wrong path.

### RISK-SEC-002 — Symlink traversal / removal
Status: open (mitigation in place)
Following or removing through a symlink could escape the intended directory and delete unintended files.

### RISK-SEC-003 — Corruption of existing user config on merge
Status: open (mitigation in place)
`xsk-bypass-claude` merges `.claude/settings.json`; a bad merge could drop user fields.

### RISK-TECH-001 — Platform skill-loading behavior drifts over time
Status: open (monitor)
The install paths and discovery rules (§7) are time-sensitive facts verified only as of 2026-06-25. Future Codex/Gemini/opencode/Claude changes can silently break installs.

### RISK-TECH-002 — Cross-platform alias collision
Status: open (mitigation in place)
`~/.agents/skills/` is read by Codex (primary), Gemini and opencode (alias). A skill body that depends on a field one platform ignores will break silently.

### RISK-TECH-003 — Self-conformance circularity
Status: open (mitigation in place)
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

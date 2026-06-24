---
r2p_stage: plan
r2p_version: 2
r2p_status: approved
r2p_created_at: 2026-06-24T20:13:13.308170+00:00
r2p_updated_at: 2026-06-24T20:21:30.750062+00:00
---

# Plan

## Execution Preconditions and Safety
- Automated install/status/uninstall/doctor tests must run with a per-test temporary HOME/XDG_CONFIG_HOME or injected platform roots. They must not write real `~/.claude`, `~/.agents`, `~/.config/opencode`, `~/.gemini`, or `~/.xsk` paths.
- Stop implementation if a planned automated check would mutate a real user skill/config directory. Convert it to a fixture-root test or move it to explicit manual acceptance.
- Manual acceptance that writes real user config is opt-in only and comes after the automated sandboxed suite passes.

## Tasks
### PLAN-TASK-001: Project baseline (package.json, LICENSE, bilingual README)
Spec References: SPEC-BEHAVIOR-005
Scope Coverage: AC-006 and baseline prerequisites for SCOPE-IN-007 (whole-plan in-scope closure is declared in the Trace section)
Change Type: create
TDD Applicable: yes
Files:
- package.json
- LICENSE
- README.md
- README.zh-CN.md
- test/baseline.test.js
Skeleton:
```javascript
// test/baseline.test.js — package metadata and README heading parity
const test = require('node:test');
const assert = require('node:assert');
test('baseline: package metadata and README heading parity', () => {
  assert.ok(true);
});
```
Steps:
- [ ] Author package.json (name @xenonbyte/xsk, bin.xsk, engines.node >=20, scripts test/syntaxcheck, zero runtime deps)
- [ ] Add LICENSE (MIT); write README.md + README.zh-CN.md with identical headings and English literals preserved
- [ ] Write the baseline test asserting package metadata and EN/CN README heading parity; defer full self-conformance assertions for five CLI commands and `lib/manifest.js` until Task 010 after those files exist
Verification: `node --test test/baseline.test.js` passes and `node --check test/baseline.test.js` is clean.

### PLAN-TASK-002: lib/input.js — argv and --platform parsing
Spec References: SPEC-BEHAVIOR-005
Change Type: create
TDD Applicable: yes
Files:
- lib/input.js
- test/input.test.js
Skeleton:
```javascript
// lib/input.js — argv parsing, --platform list, unknown-option rejection
'use strict';
function parse(argv) {
  return { command: null, platforms: ['claude','codex','opencode','gemini'], json: false, help: false, version: false };
}
module.exports = { parse };
```
Steps:
- [ ] Parse subcommand; map -v/--version, -h/--help, no-args to help
- [ ] Parse --platform <list> and --platform=<list>; reject unknown/duplicate platforms; default to all 4
- [ ] Parse --json; reject any unknown option (fail loud)
- [ ] Tests for every command, both platform forms, duplicates, and unknown options
Verification: `node --test test/input.test.js` passes; parser-level tests prove `parse(['install','--platform','foo'])` rejects the unknown platform.

### PLAN-TASK-003: lib/skills.js registry schema + generator + templates + shared + xsk-think source
Spec References: SPEC-BEHAVIOR-006
Change Type: create
TDD Applicable: yes
Files:
- lib/skills.js
- lib/generator.js
- templates/skill.md.tmpl
- shared/skill-common.md
- skills/think/SKILL.md
- test/generator.test.js
Skeleton:
```javascript
// lib/generator.js — render SKILL.md via {{PLACEHOLDER}} substitution
'use strict';
function render(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(values, k) ? values[k] : m));
}
module.exports = { render };
```
Steps:
- [ ] Define skills.js registry schema and register the Phase 1 skill `xsk-think`; Task 009 completes the remaining four skill entries and Claude-only targeting for `xsk-bypass-claude`
- [ ] Author templates/skill.md.tmpl with {{PLACEHOLDER}} slots (frontmatter + body) and shared/ single-source behavior text + skills/think source
- [ ] generator.js: inline shared/ + per-skill fragments via {{PLACEHOLDER}} substitution only; emit platform-neutral output, no runtime shared/ dir
- [ ] Tests: Phase 1 generation for `xsk-think` on Claude; fragments inlined; name+description frontmatter present; no unreplaced placeholders
Verification: `node --test test/generator.test.js` passes; generated `xsk-think` SKILL.md carries name + description frontmatter and inlined shared/fragments.

### PLAN-TASK-004: lib/manifest.js — read/validate/write manifest
Spec References: SPEC-BEHAVIOR-003
Change Type: create
TDD Applicable: yes
Files:
- lib/manifest.js
- test/manifest.test.js
Skeleton:
```javascript
// lib/manifest.js — ~/.xsk/manifests/<platform>.manifest CRUD + shape validation
'use strict';
const SCHEMA_VERSION = 1;
function validate(manifest) {
  return Boolean(manifest && manifest.platform && Array.isArray(manifest.installed_paths));
}
module.exports = { SCHEMA_VERSION, validate };
```
Steps:
- [ ] read/write ~/.xsk/manifests/<platform>.manifest as JSON
- [ ] validate shape: schema_version, platform, version, installed_at, installed_paths[], backups[]; missing field -> invalid
- [ ] Tests: valid passes; truncated-but-parseable -> invalid; missing required field -> invalid
Verification: `node --test test/manifest.test.js` passes; validate() rejects a truncated manifest as invalid.

### PLAN-TASK-005: lib/install.js + lib/adapters/claude.js — atomic install
Spec References: SPEC-BEHAVIOR-001
Change Type: create
TDD Applicable: yes
Files:
- lib/install.js
- lib/adapters/claude.js
- test/install.test.js
Skeleton:
```javascript
// lib/install.js — plan -> preflight -> backup -> atomic write -> manifest record
'use strict';
function install(skillRoot, files) {
  return { installed: [] };
}
module.exports = { install };
```
Steps:
- [ ] adapters/claude.js: skills-dir root ~/.claude/skills/; optional frontmatter rendering
- [ ] install.js: per (skill x platform) preflight writability, backup pre-existing file, atomic write (temp-sibling + rename), drop .xsk-owned marker
- [ ] Append every created path to the manifest; apply per-skill platform targeting (skip bypass-claude off Claude)
- [ ] Tests: atomic write; .xsk-owned marker present; pre-existing user file backed up; manifest recorded
Verification: `node --test test/install.test.js` passes with temporary HOME or injected roots; install creates the fixture equivalent of `~/.claude/skills/xsk-think/SKILL.md` plus `.xsk-owned`.

### PLAN-TASK-006: lib/uninstall.js — manifest-owned removal with user-edit preservation
Spec References: SPEC-BEHAVIOR-002
Change Type: create
TDD Applicable: yes
Files:
- lib/uninstall.js
- test/uninstall.test.js
Skeleton:
```javascript
// lib/uninstall.js — manifest-owned, ownership-gated, symlink-refusing removal
'use strict';
function uninstall(manifest) {
  return { removed: [], retained: [] };
}
module.exports = { uninstall };
```
Steps:
- [ ] Read manifest; remove only recorded paths
- [ ] Require .xsk-owned marker before removing a dir (skip + report if absent); never traverse or remove symlinks
- [ ] Restore each valid `backups[]` entry to its target when the generated file is unmodified; if the generated file was user-edited, retain it, preserve the backup record, report partial, and narrow the manifest
- [ ] DECISION (resolves spec review [Important]): user-edit detection via regenerate-and-diff — regenerate the file from current sources and byte-compare to disk; if they differ, treat as user-edited, retain it, report partial, narrow the retained manifest
- [ ] Tests: owned-only removal; missing marker skips dir; symlink refused; valid backup restored; edited generated file retained with partial report and narrowed manifest
Verification: `node --test test/uninstall.test.js` passes; a displaced original is restored from backup when safe, and an edited generated file is retained with a partial exit code.

### PLAN-TASK-007: lib/status.js + lib/capability.js — status and doctor
Spec References: SPEC-BEHAVIOR-003, SPEC-BEHAVIOR-004
Change Type: create
TDD Applicable: yes
Files:
- lib/status.js
- lib/capability.js
- test/status.test.js
Skeleton:
```javascript
// lib/status.js — per-platform ok/drift/invalid by manifest shape vs disk
'use strict';
function statusOf(manifest, onDisk) {
  return 'ok';
}
module.exports = { statusOf };
```
Steps:
- [ ] status.js: ok (shape valid + paths present) / drift (paths no longer match disk) / invalid (schema/platform/field problems); shape not just parse; --json output
- [ ] capability.js: read-only doctor probes — Node >= 20, target-dir writability, manifest validity; pass/fail per check; no capability claims
- [ ] Define drift-vs-invalid precedence (invalid wins when shape is bad)
- [ ] Tests: ok/drift/invalid cases; --json shape; doctor checks
Verification: `node --test test/status.test.js` passes; status reports invalid for a shape-broken manifest and drift for a missing recorded path.

### PLAN-TASK-008: bin/xsk.js — CLI entry wiring all commands
Spec References: SPEC-BEHAVIOR-005
Change Type: create
TDD Applicable: yes
Files:
- bin/xsk.js
- test/cli.test.js
Skeleton:
```javascript
#!/usr/bin/env node
// bin/xsk.js — dispatch version/help/install/uninstall/status/doctor
'use strict';
const { parse } = require('../lib/input');
function main(argv) {
  const opts = parse(argv);
  return 0;
}
module.exports = { main };
if (require.main === module) process.exit(main(process.argv.slice(2)));
```
Steps:
- [ ] Wire parse() to command dispatch (version/help/install/uninstall/status/doctor)
- [ ] version prints package version; help prints command list (also -v/--version, -h/--help, no-args)
- [ ] Unknown options exit non-zero (fail loud)
- [ ] Smoke checks for version, help, install, uninstall, status, doctor, and unknown options; install/uninstall/status/doctor smoke checks use fixture roots
Verification: `node --test test/cli.test.js` passes; `node bin/xsk.js version` prints the version; `node bin/xsk.js --bad` exits non-zero.

### PLAN-TASK-009: codex/opencode/gemini adapters + remaining 4 skills
Spec References: SPEC-BEHAVIOR-001, SPEC-BEHAVIOR-006, SPEC-BEHAVIOR-007, SPEC-BEHAVIOR-008
Change Type: create
TDD Applicable: yes
Files:
- lib/adapters/codex.js
- lib/adapters/opencode.js
- lib/adapters/gemini.js
- skills/bypass-claude/SKILL.md
- skills/skill-scaffold/SKILL.md
- skills/write-req/SKILL.md
- skills/archive-req/SKILL.md
- test/generator.test.js
- test/install.test.js
Skeleton:
```javascript
// lib/adapters/codex.js — skills-dir root ~/.agents/skills/ (agent-compatible)
'use strict';
module.exports = { skillsRoot: '.agents/skills' };
```
Steps:
- [ ] codex adapter root ~/.agents/skills/; opencode root ~/.config/opencode/skills/; gemini root ~/.gemini/skills/
- [ ] Complete skills.js registry with the remaining four skills; register `xsk-bypass-claude` as platforms:[claude]
- [ ] Author skills/bypass-claude/SKILL.md (Claude only; writes .claude/settings.json permissions.defaultMode)
- [ ] Author skills/skill-scaffold, write-req, archive-req SKILL.md sources
- [ ] Adapters render platform-neutral frontmatter (when_to_use/dispatch_intent as optional source metadata, never a required field a platform ignores)
- [ ] Tests: per-platform roots correct; generator emits one artifact per supported (skill x platform); bypass-claude skipped on non-Claude platforms
Verification: `node --test test/generator.test.js test/install.test.js` passes with all adapters and fixture roots; bypass-claude installs only under the fixture Claude skills root.

### PLAN-TASK-010: golden snapshots + safety suite + README/self-conformance pinning + package dry-run
Spec References: SPEC-BEHAVIOR-001, SPEC-BEHAVIOR-002, SPEC-BEHAVIOR-003, SPEC-BEHAVIOR-005, SPEC-BEHAVIOR-008
Change Type: create
TDD Applicable: yes
Files:
- test/golden.test.js
- test/safety.test.js
- test/skill-behavior.test.js
- test/self-conformance.test.js
- test/readme-pinning.test.js
Skeleton:
```javascript
// test/safety.test.js — owned-only, marker gating, symlink refusal, atomic rollback, edit preservation
const test = require('node:test');
const assert = require('node:assert');
test('uninstall is owned-only', () => { assert.ok(true); });
```
Steps:
- [ ] golden.test.js: snapshot generated SKILL.md shell per (skill x platform); mask embedded shared/ body with a sentinel
- [ ] safety.test.js: owned-only removal, ownership-marker gating, symlink refusal, atomic-write rollback, backup restoration for displaced originals, user-edit preservation
- [ ] skill-behavior.test.js: for all 5 skills, pin required purpose, trigger/when-to-use cues, critical constraints, output/stop behavior, prohibited placeholders/internal references, and no AI-formulaic filler; record a manual prose-review checklist for natural wording
- [ ] readme-pinning.test.js: commands/tokens present; EN/CN heading parity
- [ ] self-conformance.test.js: assert the five CLI commands resolve, EN/CN README headings match, `lib/manifest.js` + `LICENSE` exist, and package.json carries required fields
- [ ] Full round-trip with temporary HOME/XDG_CONFIG_HOME or injected platform roots: install -> status valid -> uninstall -> clean
- [ ] `npm pack --dry-run` contents check: package includes package.json, LICENSE, README.md, README.zh-CN.md, bin/xsk.js, lib/**, skills/**, shared/**, templates/**, and docs/REQUIREMENTS.md; excludes .req-to-plan/, .drfx/, .claude/, test fixtures, and archived requirement outputs
Verification: `npm test` (node --test) full suite passes; `npm run syntaxcheck` clean; `npm pack --dry-run` contents are correct; sandboxed install -> status -> uninstall leaves zero stale fixture files.

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| PLAN-TASK-001 | spec SPEC-BEHAVIOR-005; requirement AC-006 and baseline prerequisites for SCOPE-IN-007 | derived |
| PLAN-TASK-002 | spec SPEC-BEHAVIOR-005; requirement SCOPE-IN-002 | derived |
| PLAN-TASK-003 | spec SPEC-BEHAVIOR-006; requirement SCOPE-IN-005 | derived |
| PLAN-TASK-004 | spec SPEC-BEHAVIOR-003; requirement SCOPE-IN-004 | derived |
| PLAN-TASK-005 | spec SPEC-BEHAVIOR-001; requirement SCOPE-IN-004, AC-001; risk RISK-SEC-001 [ADDRESSED] | derived |
| PLAN-TASK-006 | spec SPEC-BEHAVIOR-002; requirement AC-002; risk RISK-SEC-001 [ADDRESSED], RISK-SEC-002 [ADDRESSED] | derived |
| PLAN-TASK-007 | spec SPEC-BEHAVIOR-003, SPEC-BEHAVIOR-004; requirement D8 | derived |
| PLAN-TASK-008 | spec SPEC-BEHAVIOR-005; requirement SCOPE-IN-002 | derived |
| PLAN-TASK-009 | spec SPEC-BEHAVIOR-001, SPEC-BEHAVIOR-006, SPEC-BEHAVIOR-007, SPEC-BEHAVIOR-008; requirement SCOPE-IN-001, AC-003, D7; risk RISK-TECH-002 [ADDRESSED] | derived |
| PLAN-TASK-010 | spec SPEC-BEHAVIOR-001, SPEC-BEHAVIOR-002, SPEC-BEHAVIOR-003, SPEC-BEHAVIOR-005, SPEC-BEHAVIOR-008; requirement AC-003, AC-005, AC-006, SCOPE-IN-007 | derived |

## Upstream Summary (read-only)
# Spec

## Behavior Contracts
### SPEC-BEHAVIOR-001 — `install [--platform <list>]`
Generate one `<name>/SKILL.md` per (skill × selected platform) by inlining `shared/` + the skill's `templates/fragments/` into `templates/skill.md.tmpl`. For each platform: preflight writability, back up any pre-existing user file at the target, write atomically (temp-sibling + `rename`), drop a `.xsk-owned` marker inside each created skill dir, then append every created path to `~/.xsk/manifests/<platform>.manifest`. Per-skill platform targeting: a skill with `platforms: [claude]` (e.g. `xsk-bypass-claude`) is skipped on other platforms. `--platform` defaults to all 4; rejects unknown/duplicate values and any unknown option (fail loud). Exit 0 on success, non-zero on any failure after rollback.

### SPEC-BEHAVIOR-002 — `uninstall [--platform <list>]`
Read the manifest; remove only manifest-recorded generated paths. Before removing a directory, require a valid `.xsk-owned` marker inside it; if absent, skip and report. For each `backups[]` entry, restore the valid recorded backup to its target when the generated file at that target is unmodified; if the generated file was modified by the user, keep it, keep the backup record, report a *partial* uninstall, and narrow the retained manifest so a later run can finish. Never remove, restore through, or traverse a symlink. Exit 0 (full) or a distinct code (partial).

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

### SPEC-BEHAVIOR-008 — Generated skill body contracts
Every generated `SKILL.md` must preserve the behavior promised for its source skill in REQUIREMENTS.md section 4, not only valid frontmatter. The emitted body for each skill includes purpose, when-to-use cues, constraints, and output/stop behavior matching its source: `xsk-think` stays planning-only until approval; `xsk-bypass-claude` targets only `.claude/settings.json`; `xsk-skill-scaffold` gates non-agent-skill projects before mutation; `xsk-write-req` grounds requirements in the current project and asks on blocking decisions; `xsk-archive-req` archives exactly the active requirement and leaves zero active docs. Generated text must have no unreplaced placeholders, no Waza-internal update scripts or relative reference paths, no unsupported platform-specific required fields, and no AI-formulaic filler. Natural prose quality is checked by pinned content rules plus manual review for wording not mechanically decidable.

## API / Data / Config Contracts
- **CLI argv**: subcommand in {install, uninstall, status, doctor, version, help}; `--platform <list>` (comma-separated, also `--platform=<list>`); `--json`; `-v`/`--version`/`-h`/`--help`. Unknown options → non-zero exit.
- **Manifest schema** (`~/.xsk/manifests/<platform>.manifest`, JSON): `schema_version`, `platform`, `version` (package version/provenance), `installed_at`, `installed_paths[]` (every file/dir created), `backups[]` (each `{target, backup}` for a displaced pre-existing file).
- **SKILL.md frontmatter**: `name` (lowercase, hyphenated, <=64 chars, matches folder) and `description` (required) on every generated file; `when_to_use`/`dispatch_intent` are source metadata the adapter may render into supported frontmatter, body, or sidecar — never a required field for a platform that ignores it.
- **Filesystem**: `xsk` writes only under `~/.xsk/` and the four platform skill roots (`~/.claude/skills/`, `~/.agents/skills/`, `~/.config/opencode/skills/`, `~/.gemini/skills/`). `.xsk-owned` marker (content = package name) inside each installed skill dir.
- **Exit codes**: 0 success; non-zero on failure (with rollback); distinct partial-uninstall code.
- **Automated filesystem tests**: install/status/uninstall/doctor tests that touch home-like paths must use a per-test temporary HOME/XDG_CONFIG_HOME or injected platform roots. Automated checks must not mutate real `~/.claude`, `~/.agents`, `~/.config/opencode`, `~/.gemini`, or `~/.xsk` paths.

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
- Install -> status valid -> uninstall -> clean round-trip using temporary HOME/XDG_CONFIG_HOME or injected platform roots (AC-001, AC-002, AC-007).
- Safety: owned-only removal, ownership-marker gating, symlink refusal, atomic-write rollback, backup restoration for displaced originals, user-edit preservation (AC-002; RISK-SEC-001 [ADDRESSED], RISK-SEC-002 [ADDRESSED], RISK-SEC-003 [ADDRESSED]).
- Golden-snapshot of generated SKILL.md shell per (skill × platform), masking embedded `shared/` body (AC-003).
- Skill body behavior/prose checks: pinned tests for each source skill's purpose, trigger/when-to-use cues, critical constraints, output/stop behavior, prohibited placeholders/internal references, and no AI-formulaic filler; manual prose review for natural wording that cannot be fully machine-checked (AC-003).
- README content-pinning (commands/tokens present; EN/CN heading parity) (AC-006).
- `npm pack --dry-run` contents check: package includes `package.json`, `LICENSE`, `README.md`, `README.zh-CN.md`, `bin/xsk.js`, `lib/**`, `skills/**`, `shared/**`, `templates/**`, and `docs/REQUIREMENTS.md`; excludes `.req-to-plan/`, `.drfx/`, `.claude/`, test fixtures, and archived requirement outputs (AC-006).
- Self-conformance test: five CLI commands resolve, EN/CN README headings match, `lib/manifest.js` + `LICENSE` exist, `package.json` carries required fields (AC-005, SCOPE-IN-007).
- Manual acceptance, opt-in only because it writes real user config: `xsk install` -> `~/.claude/skills/xsk-think/SKILL.md` loads; `xsk status --json` valid; non-agent-skill project + scaffold errors out (AC-004).

## Non-goals
- No remote skill marketplace/registry/distribution server (SCOPE-OUT-001).
- No embedded MCP server (SCOPE-OUT-002).
- No runtime capability verification via sub-agents (SCOPE-OUT-003).
- No automatic upstream skill-update fetch after distillation (SCOPE-OUT-004).
- No Windows-first guarantees; macOS/Linux, Node >= 20 (SCOPE-OUT-005).

## PLAN Handoff
Build in the REQUIREMENTS.md section 11 phase order: Phase 1 (skeleton + install core + `xsk-think` on Claude, with project baseline `package.json`/`LICENSE`/bilingual README and the self-conformance floor verified once the CLI/manifest files exist), Phase 2 (`xsk-bypass-claude` + codex/opencode/gemini adapters + `doctor`), Phase 3 (`xsk-skill-scaffold` + `xsk-write-req` + `xsk-archive-req`). Hold invariants: zero third-party runtime deps; one SKILL.md per (skill × platform); platform-neutral generated body + required frontmatter; `status` validates shape not just parse; the self-conformance test is the executable floor. The module list from DES-ARCH-001 is the build order.

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
| SPEC-BEHAVIOR-008 | requirement AC-003, SCOPE-IN-001; design SPEC Handoff | derived |
| API/Config Contracts | design DES-ARCH-001, DES-SEC-001 | derived |
| External Docs Checked | requirement Assumptions; risk RISK-TECH-001 [ADDRESSED] | derived |
| Test Matrix | requirement AC-001..007, section 12 | derived |
| PLAN Handoff | design DES-ARCH-001; requirement section 11 | derived |
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

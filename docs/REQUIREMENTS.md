# xsk — Agent Skill Aggregator

**Status**: Draft (pending review)
**Package**: `@xenonbyte/xsk` · **Binary**: `xsk` · **Language**: English (skill content)

---

## 1. Background & Goal

### Problem

Two recurring frictions when working across multiple AI coding agents (Claude Code, Codex, opencode, Gemini):

1. **Third-party skill packs are all-or-nothing.** Projects like [Waza](https://github.com/tw93/Waza) ship excellent skills, but installing the whole package pulls in skills I do not use. I want just the one or two skills, distilled and self-owned, without the weight of the rest.
2. **Self-authored skills are scattered.** Small, useful skills I write live in ad-hoc locations with no shared install/manifest/safety story. I want a home for my commonly used skills with the same multi-platform install rigor as a real tool.

### Goal

Build `xsk` — a Node 20 CommonJS CLI that curates a small set of agent skills (2 distilled from third parties + 4 original) and installs them across Claude Code, Codex, opencode, and Gemini with manifest-backed safety. The project itself conforms to the same standard it ships (it is both an agent-skill project and the source of the scaffold skill that enforces the standard).

### Success Criteria

- `xsk install` installs every applicable skill into every target platform's skill directory, full-capability (no advisory-only).
- `xsk uninstall` removes exactly and only the files `xsk` created, leaving user/third-party files untouched.
- Each of the 6 skills is installable, behaves as specified, and reads naturally (no AI-formulaic wording).
- A non-agent-skill project invoking `xsk-skill-scaffold` fails loud with a clear reason.
- `xsk-skill-scaffold` applied to this repo audits to zero gaps (the project conforms to its own standard; see §4.3 self-conformance).

---

## 2. Scope

### In Scope

- 6 skills: `xsk-think`, `xsk-bypass-claude`, `xsk-skill-scaffold`, `xsk-write-req`, `xsk-archive-req`, `xsk-check`.
- CLI: `install`, `uninstall`, `status`, `help`, `version`, `doctor`.
- 4 platforms: Claude Code, Codex, opencode, Gemini (all full).
- Manifest-backed install/uninstall safety (owned-only removal, ownership markers, atomic writes, symlink refusal).
- Template + shared generation model (`shared/` + templates + fragments), implemented in-repo.
- The `requirements/` directory convention maintained by the two requirement skills.

### Out of Scope

- No remote skill marketplace, registry, or distribution server.
- No MCP server embedded in the project.
- No runtime capability verification that spawns isolated sub-agents (these are pure-instruction skills; `doctor` is environment/manifest probing only).
- No automatic skill-update fetch from upstream third parties after distillation (distillation is a one-time authoring step).
- No Windows-first guarantees; target macOS/Linux with Node ≥ 20. Path separators use `path.join`.

---

## 3. Naming & Conventions

| Item | Value |
|---|---|
| npm package | `@xenonbyte/xsk` |
| CLI binary | `xsk` |
| Skill prefix | `xsk-` |
| Skills | `xsk-think`, `xsk-bypass-claude`, `xsk-skill-scaffold`, `xsk-write-req`, `xsk-archive-req`, `xsk-check` |
| Skill content language | English |
| Runtime | Node ≥ 20, CommonJS, zero third-party runtime dependencies |
| Requirement output directory | `requirements/` (project-local, version-controlled) |
| Requirement archive directory | `requirements/archive/` (gitignored) |

---

## 4. Skills Specification

### 4.1 `xsk-think` (distilled from Waza `/think`)

**Purpose**: Turn a rough idea into a decision-complete plan before any code is written.

**Distillation policy** (promote / do not promote):

- **Promote**: the multi-mode structure (Lightweight, Evaluation, Triage), Outcome Contract, Durable Context Preflight (scan `AGENTS.md`/`CLAUDE.md`/rules for hard-rule conflicts), Check-for-Official-Solutions-first, Premise-Collapse explicit declaration, "no placeholders in approved plans", phase-independence, Implementation Handoff shape, Gotchas table.
- **Do NOT promote**: Waza's `../../scripts/check-update.sh` invocation, the 🥷 line prefix, Waza-internal reference paths, Waza's `durable-context.md` relative link. Replace the update mechanism with `xsk`'s own (or omit). Re-author wording; do not copy verbatim.

**Triggers**: "出方案", "给方案", "怎么设计", "用什么方案", "判断一下", "有没有必要", "值不值得", "plan this", "how should I", "should we keep this".

**Behavior**: No code, no scaffolding, no pseudo-code until the user approves. Give one recommended approach with rationale; mention one alternative only if the tradeoff is genuinely close. Surface blocking ambiguities as one-sentence questions. Output a Proposed Design Summary, then stop.

**Output**: one recommended direction or handoff plan; execution starts only on explicit approval.

**Platforms**: all 4 (Claude, Codex, opencode, Gemini), full.

---

### 4.2 `xsk-bypass-claude`

**Purpose**: Set the current project to Claude Code bypass-permissions mode (auto-approve tools) by writing `.claude/settings.local.json`.

**Triggers**: "bypass permissions", "跳过权限", "auto approve", "设置 bypassPermissions", "免确认".

**Behavior**:
1. Operate on the **current project directory** (`cwd`); the target is `.claude/settings.local.json`. Refuse on non-Claude platforms.
2. If `.claude/settings.local.json` does not exist, create `.claude/` and write:
   ```json
   {
     "permissions": {
       "defaultMode": "bypassPermissions"
     }
   }
   ```
3. If it exists, merge in place: set `permissions.defaultMode = "bypassPermissions"`, preserving every other field. If the file is not a JSON object, refuse without changing it. Write with 2-space indent and a trailing newline.
4. If `permissions.defaultMode` is already `"bypassPermissions"`, make no change (idempotent no-op).
5. Report the path written and the resulting `defaultMode` only. No further action.

`permissions.defaultMode = "bypassPermissions"` is verified against the Claude Code settings schema (see §14); it is the only field this skill writes, and the skill reads only `.claude/settings.local.json`.

**Targeting**: **Claude Code only.** The skill registry marks `platforms: [claude]`. `xsk install --platform codex|opencode|gemini` skips this skill.

**Platforms**: Claude only.

---

### 4.3 `xsk-skill-scaffold` (original)

**Purpose**: Bring an agent-skill project up to the `xsk` standard (CLI + multi-platform install + manifest safety), or refuse if the target is not an agent-skill project.

**Standard definition**: the canonical checklist below is defined in this document and self-owned (no external rule source to track or drift from). It covers four full platforms (Claude, Codex, opencode, Gemini) using one uniform SKILL.md skill-directory artifact, manifest-backed install safety, and a bilingual README.

**Triggers**: "scaffold skill project", "make this a skill installer", "项目规范化", "agent 技能项目脚手架", "conform to skill standard".

**Behavior**:
1. **Gate first.** Detect whether the current directory is an agent-skill project: has (or is intended to have) a CLI that generates and installs skill files into agent config dirs. Heuristics: presence of `bin/` + `skills/`/`shared/`/`templates/`, or a `package.json` describing skill installation. If it is clearly **not** an agent-skill project (e.g. an application, a library with no install surface), **error out** with a one-sentence reason and stop. Do not mutate a non-agent-skill project.
2. **Audit** the project against the standard: CLI surface (`version/help/install/uninstall/status` + optional `doctor`), platform adapters, generation model (`shared/` + `templates/` + `fragments/`), manifest-backed safety, bilingual README, `package.json` fields, license.
3. **Propose** the gap-closing changes as a concrete, reviewable patch plan (files to add/edit, with targets). Do not rewrite wholesale; patch what is missing or non-conforming.
4. On approval, apply: add missing `lib/` modules (install/manifest/generator/adapters), wire CLI commands, add templates, add README parity tests, add `LICENSE`.

**Standard enforced** (the canonical checklist the scaffold applies):
- CLI: `version`/`--version`/`-v`, `help`/`--help`/`-h`, `install [--platform <list>]`, `uninstall [--platform <list>]`, `status` (read-only), optional `doctor`.
- `--platform` optional, comma-separated, defaults to all; reject unknown/duplicate.
- Fail loud on unknown options.
- `status` validates manifest shape, not just parse success.
- Removed/renamed commands leave no stale references (grep-clean across CLI/help/README/generated text/`AGENTS.md`/`CLAUDE.md`).
- 4 platforms: Claude, Codex, opencode, Gemini — all full.
- Manifest-backed install safety (see §9).
- Golden-snapshot the generated skill shell; mask embedded `shared/` body.
- Bilingual README (`README.md` + `README.zh-CN.md`) with identical headings, English literals preserved; content-pinning tests.

**Self-conformance (dogfooding)**: `xsk` is itself an agent-skill project and MUST conform to this standard when implementation is complete. The completed project must satisfy every checklist item above:

- **CLI surface**: `version`, `help`, `install [--platform <list>]`, `uninstall [--platform <list>]`, `status`, `doctor` (see §6).
- **Platforms**: Claude Code, Codex, opencode, Gemini — all 4 full (see §7).
- **Generation model**: `shared/` + `templates/` + `fragments/` (see §8).
- **Manifest-backed safety**: owned-only removal, ownership markers, atomic writes, symlink refusal (see §9).
- **Uninstall-first install**: a reinstall resets prior owned files (pruning skills no longer installed) before regenerating, so no manual `uninstall` is needed; user-edited owned files are still refused and rolled back, never destroyed.
- **Bilingual README** with content-pinning tests.

Release invariant: before `xsk` is considered complete, running `xsk-skill-scaffold` against this repo MUST audit to zero gaps. The machine-checkable portion of this invariant is enforced by the self-conformance test (§12); the remainder is the scaffold skill's judgment when applied to its own source project.

**Platforms**: all 4, full.

---

### 4.4 `xsk-write-req` (original)

**Purpose**: Convert plain-language ("白话") needs into a compliant requirement document in `requirements/`, grounded in the current project's actual code.

**Inspirations**:
- [OpenSpec `/opsx:explore`](https://github.com/Fission-AI/OpenSpec) — investigate the problem space before crystallizing.
- superpowers `brainstorming` — explore intent before deciding.
- Waza `/write` — natural, fluent wording; no AI-formulaic phrasing; no em-dash.

**Triggers**: "写需求", "需求文档", "把这个需求写清楚", "write a requirement", "turn this into a spec", "需求整理".

**Behavior**:
1. **Read the project first.** `grep`/`read` the current project structure, config files (`package.json`, etc.), and relevant code to ground the requirement in reality. Never quote defaults from memory.
2. **Locate or create the active requirement doc.** Scan `requirements/*.md` for frontmatter `status: active`. There is **at most one** active doc at a time.
   - If more than one exists, stop, list the offending paths, and report the broken invariant for the user to resolve.
   - If one exists, lock onto it (append/refine).
   - If none, create `requirements/<slug>.md` with `status: active` and a generated slug from the need.
3. **Ensure the directory convention.** Auto-create `requirements/.gitignore` containing `archive/` if absent (create `requirements/` and `requirements/archive/` as needed). Never overwrite an existing `.gitignore`; append `archive/` if missing.
4. **Convert fuzzy → concrete.** Structure the document according to input richness:
   - Minimal one-liner input → a concise requirement (Goal + Scope + Acceptance), without forcing a Background section that would be filler.
   - Richer input → Background, Goal, Scope (in/out), Requirements, Open Questions, Checkpoints.
5. **Decision points → ask the user.** When a genuine technical or scoping choice changes the implementation, stop and ask the user to decide (brainstorming style: surface the options and tradeoffs, let them pick). Do not silently pick.
6. **Brainstorming points.** Where the need is genuinely open-ended, run a short exploration with the user before writing.
7. **Wording.** Natural, fluent English (or match the project's language). No em-dash (U+2014) or en-dash (U+2013). No formulaic phrasing, no filler conclusions. The author's voice wins; most editing is subtraction.
8. **Self-audit checkpoint.** Before finalizing, audit the requirement against itself. A document that fails this gate is not ready.
   - **Conflict check**: verify no internal contradictions — Goal vs Scope, in-scope vs out-of-scope, Requirements vs Open Questions, any two statements that cannot both hold. Resolve every conflict, or surface it to the user. A finalized doc must contain zero conflicts.
   - **Ambiguity check**: verify no undefined terms, unstated assumptions, or vague qualifiers ("fast", "supported", "as needed") that would force the implementer to guess. Tighten each to a concrete, testable statement. A finalized doc must leave no ambiguity that blocks implementation.
   - **Checkpoint gates**: ensure the requirement defines its necessary checkpoints — the verification points where downstream implementation must pause and confirm against the requirement (acceptance criteria, integration gates, review gates). If the requirement lacks checkpoints, add them before finalizing.
   - If the audit surfaces issues only the user can resolve (a genuine conflict of intent, an irreducible ambiguity), stop, list them, and ask. Do not write a contradictory or under-specified doc.
9. Write the file; report the path and that it is now the active doc.

**Document frontmatter**:
```markdown
---
status: active
slug: <slug>
created_at: <ISO date>
---
```

**Platforms**: all 4, full.

---

### 4.5 `xsk-archive-req` (original)

**Purpose**: Archive the active requirement document into `requirements/archive/`.

**Triggers**: "归档需求", "archive requirement", "需求归档", "把这个需求存档".

**Behavior**:
1. Scan `requirements/*.md` (excluding `archive/`) for the single doc with `status: active`. If more than one exists, stop, list the offending paths, and report the broken invariant for the user to resolve.
2. If none, refuse with a one-line reason and stop.
3. Read the doc slug and validate it against `^[a-z0-9]+(-[a-z0-9]+)*$`. If the slug is missing/invalid, stop with the reason before any write.
4. Check `requirements/archive/<slug>.md` before any write. If it already exists, stop, ask the user how to proceed, leave it unchanged, and write nothing.
5. Write the fully updated archived file at `requirements/archive/<slug>.md`: set `status: archived`, add `archived_at: <ISO date>`, preserve all other frontmatter fields and the body unchanged.
6. Confirm it landed, then remove the source active doc.
7. After archiving, zero active docs remain. Report the archived path.

**Platforms**: all 4, full.

---

## 5. Architecture

A zero-dependency Node CommonJS CLI. The install / manifest / generation layers are implemented in-repo and self-contained, following a verified 4-platform install pattern: per-platform home roots, atomic write via temp-sibling + `rename`, and owned-only manifest-backed uninstall.

```
xsk/
├── bin/xsk.js                  # CLI entry point
├── lib/
│   ├── input.js                # argv parsing, platform-list parsing, unknown-option rejection
│   ├── skills.js               # NEW: skill registry (6 skills + metadata + platform targeting)
│   ├── install.js              # plan -> preflight -> backup -> atomic write -> manifest
│   ├── uninstall.js            # manifest-backed, owned-only removal
│   ├── manifest.js             # read/validate/write install manifest (~/.xsk/manifests/)
│   ├── generator.js            # render SKILL.md from shared/ + templates/ + fragments/
│   ├── capability.js           # (light) environment checks
│   ├── status.js               # read-only manifest validation + per-platform report
│   └── adapters/               # per-platform: skills-dir root + any frontmatter overrides (NOT capability probes)
│       ├── claude.js
│       ├── codex.js
│       ├── opencode.js
│       └── gemini.js
├── skills/                     # source skill descriptors
│   ├── think/SKILL.md
│   ├── bypass-claude/SKILL.md
│   ├── skill-scaffold/SKILL.md
│   ├── write-req/SKILL.md
│   ├── archive-req/SKILL.md
│   └── check/SKILL.md
├── shared/                     # behavior shared across skills/platforms (single source of truth)
├── templates/
│   ├── skill.md.tmpl           # the SKILL.md shell with {{PLACEHOLDER}} slots
│   └── fragments/              # per-skill variant text
├── docs/                       # this requirement doc
├── test/                       # node:test + assert
├── package.json
├── LICENSE
├── README.md
└── README.zh-CN.md
```

**Zero third-party runtime dependencies.** Tests use Node's built-in `node:test` and `assert`.

---

## 6. CLI Command Surface

| Command | Purpose |
|---|---|
| `version` | Print package version. Also `--version` / `-v`. |
| `help` | Print user command list. Also `--help` / `-h`, and on no-args. |
| `install [--platform <list>]` | Generate and install skills, uninstall-first: a reinstall resets prior owned files (pruning skills no longer installed) before regenerating, so no manual `uninstall` is needed; it still refuses to overwrite a user-edited owned file and rolls back. `--platform` optional, comma-separated, defaults to all 4. Reject unknown/duplicate platforms. |
| `uninstall [--platform <list>]` | Remove manifest-owned generated files only. |
| `status` | Read-only: report what is installed per platform; validate manifest shape. Supports `--json`. |
| `doctor` | Probe environment + manifest only: Node version, target-dir writability, manifest validity, and recorded-path drift (the `manifest-valid` check fails on `invalid` or `drift` state). Reports each check pass/fail. These are pure-instruction skills with no runtime capabilities, so `doctor` makes no capability claims. |

Conventions:
- `--platform` accepts `--platform=<list>` form too.
- `--json` for machine-readable output on `status`/`doctor`.
- Fail loud on unknown options.

---

## 7. Multi-Platform Install Model

All 4 platforms are **full** and use the same `SKILL.md` skill-directory shape.

| Platform | Install location (global) | Artifact |
|---|---|---|
| Claude Code | `~/.claude/skills/<name>/SKILL.md` | skill dir |
| Codex | `~/.agents/skills/<name>/SKILL.md` | skill dir |
| opencode | `~/.config/opencode/skills/<name>/SKILL.md` | skill dir |
| Gemini | `~/.gemini/skills/<name>/SKILL.md` | skill dir |

External platform behavior in this section is verified as of 2026-06-25 against the §14 references.

- All four auto-discover skills from their skills dir; each skill is a `<name>/SKILL.md` folder (not arbitrary `**/SKILL.md` wildcard scanning).
- Codex user skills use the agent-compatible `~/.agents/skills/` directory. Current Codex docs do not require a `--enable skills` launch flag; Codex detects skill changes automatically, with restart as the fallback if a new skill does not appear.
- Gemini is **full**: native SKILL.md skill-directory support. Official Gemini CLI docs verify both user and workspace discovery tiers, including the `~/.gemini/skills/` / `.gemini/skills/` native locations and the compatible `~/.agents/skills/` / `.agents/skills/` aliases. Same SKILL.md artifact as the other three platforms.
- Frontmatter/source metadata: every generated `SKILL.md` has at least `name` (lowercase, hyphenated, ≤64 chars, matches folder) and `description` (required, covers what + when). `when_to_use` and `dispatch_intent` are source metadata that adapters may render into supported frontmatter, body text, or platform metadata.
- opencode recognizes only `name`, `description`, `license`, `compatibility`, and string-to-string `metadata` in frontmatter; unknown fields are ignored. The opencode adapter must not rely on `when_to_use` or `dispatch_intent` as recognized opencode frontmatter.
- Alias collision rule: because Gemini and opencode can also read `~/.agents/skills/`, the generated skill body and required frontmatter must be platform-neutral. Platform-specific extras must be optional metadata or sidecar files; core behavior cannot depend on a field that another selected platform ignores.
- `xsk-bypass-claude` installs to Claude only; other platforms skip it (`platforms: [claude]` in the registry).
- opencode is Claude-skill-compatible and agent-compatible: official docs verify project/global discovery under `.opencode/skills/` and `~/.config/opencode/skills/`, plus compatible `.claude/skills/`, `~/.claude/skills/`, `.agents/skills/`, and `~/.agents/skills/`. `xsk` still installs opencode's copy under `~/.config/opencode/skills/` so each platform's install is independently owned and cleanly uninstallable. (A consequence: a Claude-only skill in `~/.claude/skills/` is also visible to opencode; `xsk-bypass-claude`'s body targets Claude settings and is inert elsewhere.)

---

## 8. Generation Model

One artifact shape across all four platforms:

- **`shared/`** — behavior text reused across skills and platforms. Single source of truth. Editing one file updates every generated skill. It is inlined into every generated `SKILL.md` at build time; there is no runtime `shared/` directory under the user's home.
- **`templates/skill.md.tmpl`** — the SKILL.md shell with `{{PLACEHOLDER}}` slots (frontmatter + body structure).
- **`templates/fragments/<skill>.<section>.md`** — per-skill variant text the generator injects.
- Rendering is `{{PLACEHOLDER}}` substitution. The generator emits one `<name>/SKILL.md` per (skill × platform), embedding the relevant `shared/` content and fragments, and writing to the platform's install location.

---

## 9. Install Safety (Manifest-Backed)

Installing into user home config dirs is destructive if careless.

`xsk` owns exactly one home directory, `~/.xsk/`:

```
~/.xsk/
├── manifests/<platform>.manifest        # per-platform install record (JSON)
└── install/backups/<platform>/          # pre-write originals, for atomic-write rollback and uninstall restore
```

Each manifest records: `schema_version`, `platform`, `version` (package version/provenance), `installed_at`, `installed_paths[]` (every file/dir created), and `backups[]` (each `{target, backup}` pair for a pre-existing user file that was displaced). `xsk` writes nowhere under the user's home except the platform skill dirs it installs into and `~/.xsk/` itself.

Required properties:

- **Write an install manifest** at `~/.xsk/manifests/<platform>.manifest` recording every file/dir created, plus version and provenance.
- **Uninstall is owned-only.** Remove only paths in the manifest. Never delete a file `xsk` did not create.
- **Ownership markers gate directory removal.** Drop a marker (e.g. `.xsk-owned`, content = package name) inside each installed skill directory; remove a directory only if it carries a valid marker. Prevents deleting a user/third-party dir at the same path.
- **Never remove symlinks**; refuse to traverse/remove through them.
- **Atomic writes.** Write to a staging path, then `rename` into place; on failure restore the original from backup.
- **Preserve user edits.** If uninstall finds a generated file the user modified, keep it, report a *partial* uninstall, and retain a narrowed manifest so a later uninstall can finish.

`status` is read-only and reports one of `ok` / `drift` / `invalid` per platform. It validates the manifest **shape** (schema version, matching platform, required fields, expected collections), not merely parse success: a truncated-but-parseable manifest reports **invalid**, not "installed"; a manifest whose recorded paths no longer match what is on disk reports **drift**.

---

## 10. The `requirements/` Directory Convention

Maintained by `xsk-write-req` and `xsk-archive-req`:

```
requirements/
├── .gitignore            # contains "archive/" (auto-created, never overwritten)
├── archive/              # gitignored; holds archived requirement docs
└── <slug>.md             # requirement docs; at most one has status: active
```

- `.gitignore` content: `archive/` (directory pattern).
- Active-doc invariant: at most one `requirements/*.md` (excluding `archive/`) has frontmatter `status: active` at any time.
- If that invariant is broken, `xsk-write-req` and `xsk-archive-req` stop, list the offending paths, and leave resolution to the user.
- `xsk-write-req` locks the active doc or creates a new one; `xsk-archive-req` archives it (active count returns to zero).

---

## 11. Implementation Phasing

Each phase is independently deliverable; the system is usable after each.

### Phase 1 — Skeleton + install core + `xsk-think` (Claude)
- Implement core in-repo: `lib/install.js`, `lib/manifest.js`, `lib/generator.js`, `lib/input.js`, `lib/adapters/claude.js`, `bin/xsk.js`.
- New: `lib/skills.js` registry.
- Project baseline (so Phase 1 self-conforms): `package.json` with required fields, `LICENSE`, bilingual `README.md` + `README.zh-CN.md`.
- CLI: `version`, `help`, `install [--platform claude]`, `uninstall`, `status`.
- `xsk-think` source + generation.
- Tests: manifest safety, install/uninstall round-trip, golden snapshot of generated SKILL.md shell, README content-pinning, self-conformance floor (§12).
- **Deliverable**: `xsk install` installs a working `xsk-think` into Claude Code.

### Phase 2 — `xsk-bypass-claude` + remaining 3 platforms
- `xsk-bypass-claude` source (writes `.claude/settings.local.json` `permissions.defaultMode`).
- Adapters: codex, opencode, gemini.
- Golden snapshots per platform.
- `doctor` command.
- **Deliverable**: 2 skills × 4 platforms (bypass-claude on Claude only).

### Phase 3 — `xsk-skill-scaffold` + `xsk-write-req` + `xsk-archive-req`
- `xsk-skill-scaffold` (4 platforms full).
- `xsk-write-req` + `xsk-archive-req` + `requirements/` convention.
- **Deliverable**: all 5 pre-check skills live.

### Phase 4 — `xsk-check` (distilled from Waza `/check`)
- `xsk-check` (4 platforms full): the default-review discipline as a single self-contained skill, dropping Waza's file-backed modes and parallel-specialist machinery.
- **Deliverable**: all 6 skills live.

No "Phase 0 investigation" (research done). No phase depends on the next to be useful.

---

## 12. Verification & Testing

- `npm test` (`node --test`) — full suite.
- `node --test test/<file>.test.js` — single file; `--test-name-pattern` for one test.
- `npm run syntaxcheck` — `node --check` every `.js` under `bin/`, `lib/`, `test/`.
- `npm pack --dry-run` — verify package contents.
- Golden-snapshot tests for generated SKILL.md shells per (skill × platform); mask embedded `shared/` body with a sentinel so snapshots track the shell, not the shared prose.
- Manifest round-trip tests (install → status valid → uninstall → clean).
- Safety tests: owned-only removal, ownership-marker gating, symlink refusal, atomic-write rollback, user-edit preservation.
- README content-pinning tests (commands/tokens present; EN/CN heading parity).
- Self-conformance test: assert this repo satisfies the machine-checkable parts of the §4.3 standard — the five core CLI commands resolve, EN/CN README headings match, `lib/manifest.js` and `LICENSE` exist, and `package.json` carries the required fields. This is the executable floor under the §1 "audits to zero gaps" criterion; the full audit remains the scaffold skill's judgment.

**Acceptance checks (manual)**:
- `xsk install` then verify `~/.claude/skills/xsk-think/SKILL.md` exists and loads as a skill.
- `xsk status --json` reports installed + manifest valid.
- `xsk uninstall` leaves zero stale files; user-edited files retained with partial report.
- Non-agent-skill project + `xsk-skill-scaffold` errors out.

---

## 13. Locked Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Package `@xenonbyte/xsk`, binary `xsk`, prefix `xsk-` | matches npm scope; short; "X SKills" |
| D2 | Skill names: `xsk-think`, `xsk-bypass-claude`, `xsk-skill-scaffold`, `xsk-write-req`, `xsk-archive-req`, `xsk-check` | user-defined; catalog extended from 5 to 6 to add `xsk-check`, distilled from Waza `/check` (default-review discipline only; Waza's multi-mode and parallel-specialist machinery deliberately not promoted) |
| D3 | Skill content language: English | matches the Waza ecosystem; triggers are multilingual |
| D4 | All 4 platforms full; uniform `<skill-root>/<name>/SKILL.md` | verified: Claude, Codex, Gemini, opencode all load `SKILL.md` skill directories; Codex uses the agent-compatible `~/.agents/skills/` user root, Gemini and opencode also support that alias, and opencode is Claude-skill-compatible |
| D5 | Self-contained zero-dep Node CJS; install/manifest/CLI modeled on a verified 4-platform install pattern, implemented in-repo | reuses a proven mechanism (per-platform homes, atomic write + `rename`, owned-only manifest uninstall, `ok`/`drift`/`invalid` status) without coupling the doc to an external source |
| D6 | Requirement dir `requirements/`, archive gitignored | clear, version-controlled active docs |
| D7 | `xsk-bypass-claude` is Claude-only | only sets Claude Code permissions |
| D10 | `xsk-bypass-claude` writes `.claude/settings.local.json` | keeps bypass scope local to the project while preserving the shared settings file |
| D8 | `doctor` probes environment + manifest only (Node version, dir writability, manifest validity + recorded-path drift) | pure-instruction skills have no runtime capability to verify, so `doctor` makes no capability claims |
| D9 | `install` is uninstall-first by default (no opt-out flag) | a reinstall should reach a clean state with no manual `uninstall` and no orphaned skills; the reset reuses the tested owned-only uninstall and rolls back rather than destroying user-edited files. Implemented by routing install through `uninstallPlatform` before regenerating; `MARKER`/`PACKAGE_NAME` + ownership predicates live in `lib/ownership.js` so this introduces no install/uninstall require cycle |

---

## 14. References

- [tw93/Waza `/think`](https://github.com/tw93/Waza/blob/master/skills/think/SKILL.md) — think skill source.
- [tw93/Waza `/write`](https://github.com/tw93/Waza/blob/master/skills/write/SKILL.md) — natural-writing style reference.
- [Fission-AI/OpenSpec `/opsx:explore`](https://github.com/Fission-AI/OpenSpec/blob/master/docs/opsx.md) — fuzzy→requirement exploration model.
- [Codex Agent Skills](https://developers.openai.com/codex/skills) — Codex SKILL.md native support; user skills live in `$HOME/.agents/skills/<name>/SKILL.md`; current docs do not require a `--enable skills` launch flag.
- [Gemini CLI Using Agent Skills](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/using-agent-skills.md) — verified 2026-06-25: user skills are discovered from `~/.gemini/skills/` or the `~/.agents/skills/` alias; workspace skills are discovered from `.gemini/skills/` or the `.agents/skills/` alias.
- [Gemini CLI Creating Skills](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/creating-skills.md) — verified 2026-06-25: discovery tiers and the `.agents/skills` compatibility alias are documented in the official repository.
- [opencode Agent Skills](https://opencode.ai/docs/skills/) — verified 2026-06-25: opencode discovers `<name>/SKILL.md` from `.opencode/skills/`, `~/.config/opencode/skills/`, `.claude/skills/`, `~/.claude/skills/`, `.agents/skills/`, and `~/.agents/skills/`.
- [Claude Code settings](https://docs.claude.com/en/docs/claude-code/settings) — `permissions.defaultMode = "bypassPermissions"` verified.

---

## Open Questions

None blocking. The design is decision-complete with no placeholders.

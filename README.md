<div align="center">

# xsk

*Curate a small set of agent skills and install them across Claude Code, Codex, opencode, and Gemini, with manifest-backed safety*

[![npm version](https://img.shields.io/npm/v/@xenonbyte/xsk?style=flat-square)](https://www.npmjs.com/package/@xenonbyte/xsk)
[![Node](https://img.shields.io/badge/node->=20-3c873a?style=flat-square)](https://nodejs.org/)
[![Runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen?style=flat-square)](package.json)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Skills](#skills) • [How it works](#how-it-works) • [Safety](#safety)

**English** | [简体中文](README.zh-CN.md)

</div>

Working across AI coding agents has two recurring frictions: third-party skill packs are all-or-nothing, and self-authored skills end up scattered with no shared install, manifest, or safety story.

`xsk` (`@xenonbyte/xsk`) solves both. It ships nine curated skills (two distilled from third parties, seven original) and a zero-dependency CLI that installs each one into every supported platform's skill directory, then records exactly what it created so `uninstall` removes only those files and nothing else.

`xsk` is itself an agent-skill project and conforms to the same standard its own scaffold skill enforces.

## Features

- **Nine curated skills**, not an all-or-nothing pack: install everything, or pick per platform.
- **Four platforms, one shape.** Claude Code, Codex, opencode, and Gemini share a `<name>/SKILL.md` layout; opencode additionally gets directly invocable `/xsk-<name>` commands.
- **Manifest-backed safety.** Owned-only removal, ownership markers, atomic writes, symlink refusal, and content-hash drift detection.
- **Uninstall-first installs.** A reinstall resets prior owned files (pruning skills no longer installed) before regenerating, so no manual `uninstall` is needed.
- **User edits are never clobbered.** A modified owned file is refused and rolled back instead of being overwritten.
- **Zero runtime dependencies.** Pure Node.js (>= 20), CommonJS, no build step.

## Installation

```sh
npm install -g @xenonbyte/xsk
```

> [!IMPORTANT]
> Requires Node >= 20 on macOS or Linux.

## Usage

```sh
xsk install                       # install every skill into every platform
xsk install --platform claude,codex
xsk status                        # read-only: what is installed per platform
xsk status --json
xsk uninstall                     # remove only what xsk created
xsk doctor                        # probe environment + manifest health
xsk version
xsk help
```

After `xsk install`, `xsk status` reports each platform independently:

```
claude: ok (9 skills) v0.3.0
codex: ok (8 skills) v0.3.0
opencode: ok (8 skills) v0.3.0
gemini: ok (8 skills) v0.3.0
```

The non-Claude platforms show 8 because `xsk-bypass-claude` is Claude-only and is skipped there.

`xsk doctor` checks the environment rather than the install, one line per probe:

```
[PASS] Node >= 20 - running Node 24.8.0
[PASS] ~/.xsk writable - writable or creatable
[PASS] claude skill dir writable - writable or creatable
[PASS] manifests valid - 4 manifest(s) valid
doctor: all checks passed
```

Installed skills belong to the agent, not to `xsk`: there is no `xsk run`. In Claude Code and opencode each one is directly invocable as `/xsk-<name>`, and every skill also states its own triggers, so an agent can pick it up from intent instead.

## Commands

| Command | Purpose |
|---|---|
| `version` (also `--version` / `-v`) | Print the package version. |
| `help` (also `--help` / `-h`, and on no args) | Print the user command list. |
| `install [--platform <list>]` | Generate and install skills, uninstall-first: a reinstall resets prior owned files (pruning skills no longer installed) before regenerating, so no manual `uninstall` is needed; user-edited owned files are still refused and rolled back. `--platform` is comma-separated, defaults to all four platforms. Unknown or duplicate values are rejected. |
| `uninstall [--platform <list>]` | Remove only the manifest-recorded generated files. |
| `status [--json]` | Read-only per-platform report: `ok`, `drift`, or `invalid`. Validates manifest shape, not just parse success. |
| `doctor [--json]` | Read-only probe of Node version, target-dir writability, and manifest validity. Pass/fail per check. No capability claims. |

Unknown options fail loud with a non-zero exit.

## Skills

Nine skills, prefixed `xsk-`:

| Skill | Purpose |
|---|---|
| `xsk-think` | Turn a rough idea into a proportionate, decision-complete plan with acceptance checks and concrete next-action choices. Distilled from Waza `/think`. |
| `xsk-bypass-claude` | Set the current project to Claude Code bypass-permissions mode by writing `.claude/settings.local.json`. Claude only. |
| `xsk-skill-scaffold` | Bring an agent-skill project up to the `xsk` standard, or refuse if it is not one. |
| `xsk-write-req` | Convert plain-language needs into a compliant requirement doc in `.xsk/requirements/`, grounded in the current project. |
| `xsk-execute-req` | Implement an active requirement or a think plan explicitly routed to this skill, verify and review the result, then automatically archive on success. Inline think execution stays in normal conversation. |
| `xsk-archive-req` | Archive the active requirement doc into `.xsk/requirements/archive/`. |
| `xsk-check` | Review changes before they ship: scope drift, shared root causes, evidence-gated findings, and verification of the reviewed state. Distilled from Waza `/check`. |
| `xsk-point` | Research one aspect of the current project to a decision-complete landed plan and persist it as a point document in `.xsk/points/`. |
| `xsk-consume-point` | Fold selected `.xsk/points/` documents into one `.xsk/requirements/` doc via `xsk-write-req`, archiving consumed points write-before-remove. |

> [!NOTE]
> `xsk-bypass-claude` targets Claude Code only; `xsk install` skips it on the other three platforms.

### Choosing a skill

- Use `xsk-think` while the approach or important decisions are unsettled. Ready work offers execution or revision; select by number or natural language. Small edits execute in normal conversation without a forced document. Complete complex work routes directly to `xsk-execute-req`, whose option names saving the requirement, implementation, verification, and automatic archival. Think itself stays planning-only until selection; questions and no-change judgments do not offer execution.
- Use `xsk-write-req` for a saved specification without implementation now. Every shape includes Goal, Scope, and Acceptance; dependency batches are allowed without dropping wanted scope. A finalized standalone requirement offers execution or revision.
- `xsk-execute-req` accepts an active requirement or a think summary explicitly routed to requirement execution. An inline/direct think selection stays inline, even when an active requirement exists. It saves routed summaries internally through writer, then implements, verifies, reviews with `xsk-check`, and automatically archives on success. One requirement holds a compact `Execution` section; no separate PLAN or run ledger by default. Existing decisions and valid verification are reused. Dirty worktrees, non-Git projects, and unavailable subagents do not block admission.
- For durable research, use `xsk-point` to save evidence and a confirmed ready conclusion, then select `xsk-consume-point` to incorporate it through writer. Consume preflights the batch, revalidates both source and archive target before each point mutation, and creates new archives without replacing an existing target. Drift leaves the consume incomplete for reconciliation, even if writer already saved the requirement. Complete point archival precedes execution; partial adoption preserves the remainder. Requirement slugs keep provenance resolvable after archival.
- Use `xsk-check` for existing code, configuration, generated artifacts, or behavioral skill instructions. Independent reviews are read-only; an explicit implementation/repair request covers confirmed in-scope fixes. Review uses the actual Git diff or non-Git file/acceptance evidence and reuses valid checks instead of repeating them.
- Execution completes only when the current required acceptance and review are satisfied. Incomplete work stays active with remaining steps. A verified implementation whose archival fails retains its evidence and retries only the unfinished archival after checking current state. `xsk-archive-req` also supports explicit manual archival of cancelled or superseded requirements; archived status alone is not completion proof.
- Internal writer, checker, and archiver calls return to their caller without extra approval menus, recursive execution, or commit offers. User-selected execution authorizes the stated workflow, not Git commits, real installation, pushes, or releases. Archives under `.xsk/requirements/archive/` and `.xsk/points/archive/` are local ignored records unless already tracked; archival does not commit them or make them recoverable from a fresh clone.

## How it works

Skills are generated, not copied. Each one is a registry entry plus four prose fragments (purpose, triggers, behavior, output) that the generator renders into a single platform-neutral `SKILL.md` alongside a shared body. One source produces the same skill for all four platforms, so they cannot drift apart.

Installing writes that `SKILL.md` into each selected platform's skill directory, drops a `.xsk-owned` marker beside it, and records every path it created in a per-platform manifest under `~/.xsk/`, along with a content hash of each file.

That manifest is what makes the rest safe. `uninstall` removes only recorded paths that still carry a valid marker. `status` re-hashes each file and reports `drift` when one no longer matches what `xsk` wrote, which is how a user edit is detected and preserved rather than overwritten.

## Platforms

All four platforms are full and use the same `<name>/SKILL.md` skill-directory shape.

| Platform | Install location |
|---|---|
| Claude Code | `~/.claude/skills/<name>/SKILL.md` |
| Codex | `~/.agents/skills/<name>/SKILL.md` |
| opencode | `~/.config/opencode/skills/<name>/SKILL.md` (skill) and `~/.config/opencode/commands/xsk-<name>.md` (command) |
| Gemini | `~/.gemini/skills/<name>/SKILL.md` |

For opencode, `xsk install` writes both a skill directory entry and a flat `commands/xsk-<name>.md` command file for each installed skill, making each skill directly invocable as an opencode `/xsk-<name>` command. Both the skill and the command file are manifest-tracked, and uninstall removes them together.

Platform behavior was verified as of 2026-06-25 against each platform's official documentation.

## Discovery aliases and duplicate skills

opencode also reads `~/.claude/skills/<name>/SKILL.md` and `~/.agents/skills/<name>/SKILL.md` in addition to its native `~/.config/opencode/skills/<name>/SKILL.md`. Gemini also reads `~/.agents/skills/<name>/SKILL.md` as an alias for `~/.gemini/skills/<name>/SKILL.md`.

Because those aliases are cross-platform visible, a skill copied into one readable alias directory can also be discovered by another agent. `xsk` still writes one manifest-owned copy per selected platform, so each platform copy stays independently uninstallable even when another platform can also see an alias copy.

`xsk-bypass-claude` remains Claude Code-only. If another agent discovers it through an alias, the skill body refuses or stops inertly outside Claude Code instead of applying Claude-specific behavior.

## Safety

> [!WARNING]
> Installing into user home config dirs is destructive if careless. `xsk` is manifest-backed so every write is owned and reversible.

- **Owned-only removal.** Uninstall removes only paths the manifest recorded.
- **Ownership markers.** A `.xsk-owned` marker inside each installed skill dir gates directory removal.
- **No symlink traversal or removal.** `xsk` refuses on encounter.
- **Atomic writes.** Each file is written to a temp sibling then renamed into place; a failed write restores the original.
- **User edits preserved.** If a generated file was user-modified, uninstall keeps it, reports a partial result, and narrows the retained manifest so a later run can finish.

`xsk` writes only under `~/.xsk/`, the four platform skill dirs, and opencode's `~/.config/opencode/commands/` command dir.

## Development

```sh
npm test            # full node:test suite
npm run syntaxcheck # node --check every bin/, lib/, test/ file
npm pack --dry-run  # verify package contents
```

There is no build step and no linter: the test suite is the gate. Skills under `skills/` and their golden fixtures are generated output, so change the fragments in `templates/fragments/` and regenerate rather than editing them directly.

---

MIT licensed. See [LICENSE](LICENSE).

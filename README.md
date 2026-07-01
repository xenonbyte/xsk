# xsk

**English** | [简体中文](README.zh-CN.md)

> Curate a small set of agent skills and install them across Claude Code, Codex, opencode, and Gemini, with manifest-backed safety.

[![Node](https://img.shields.io/badge/node-%3E%3D20-3c873a)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](package.json)

`xsk` (`@xenonbyte/xsk`) is a zero-dependency CLI that installs a curated set of agent skills into every supported AI coding agent, then tracks exactly what it created so uninstall removes only those files.

## Overview

Working across AI coding agents has two recurring frictions: third-party skill packs are all-or-nothing, and self-authored skills are scattered with no shared install/manifest/safety story. `xsk` solves both. It ships eight curated skills (two distilled from third parties, six original) and a CLI that installs each skill into every supported platform's skill directory, then records exactly what it created so uninstall removes only those files.

`xsk` is itself an agent-skill project and conforms to the same standard its scaffold skill enforces.

## Features

- **Eight curated skills**, not an all-or-nothing pack: install everything, or pick per platform.
- **Four platforms, one shape.** Claude Code, Codex, opencode, and Gemini share a `<name>/SKILL.md` layout; opencode additionally gets directly invocable `/xsk-<name>` commands.
- **Manifest-backed safety.** Owned-only removal, ownership markers, atomic writes, symlink refusal, and content-hash drift detection.
- **Uninstall-first installs.** A reinstall resets prior owned files (pruning skills no longer installed) before regenerating, so no manual `uninstall` is needed.
- **User edits are never clobbered.** A modified owned file is refused and rolled back instead of being overwritten.
- **Zero runtime dependencies.** Pure Node.js (>= 20), CommonJS.

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

Eight skills, prefixed `xsk-`:

| Skill | Purpose |
|---|---|
| `xsk-think` | Turn a rough idea into a decision-complete plan before any code is written. Distilled from Waza `/think`. |
| `xsk-bypass-claude` | Set the current project to Claude Code bypass-permissions mode by writing `.claude/settings.local.json`. Claude only. |
| `xsk-skill-scaffold` | Bring an agent-skill project up to the `xsk` standard, or refuse if it is not one. |
| `xsk-write-req` | Convert plain-language needs into a compliant requirement doc in `.xsk/requirements/`, grounded in the current project. |
| `xsk-archive-req` | Archive the active requirement doc into `.xsk/requirements/archive/`. |
| `xsk-check` | Review a code change before it ships: scope drift, hard stops, evidence-gated findings, then verify and sign off. Distilled from Waza `/check`. |
| `xsk-point` | Research one aspect of the current project to a decision-complete landed plan and persist it as a point document in `.xsk/points/`. |
| `xsk-consume-point` | Fold selected `.xsk/points/` documents into one `.xsk/requirements/` doc via `xsk-write-req`, archiving consumed points write-before-remove. |

> [!NOTE]
> `xsk-bypass-claude` targets Claude Code only; `xsk install` skips it on the other three platforms.

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

---

MIT licensed. See [LICENSE](LICENSE).

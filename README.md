# xsk

Agent skill aggregator. `xsk` curates a small set of agent skills and installs them across Claude Code, Codex, opencode, and Gemini with manifest-backed safety.

Package: `@xenonbyte/xsk` · Binary: `xsk` · Runtime: Node >= 20, CommonJS, zero third-party runtime dependencies.

## Overview

Two recurring frictions when working across AI coding agents: third-party skill packs are all-or-nothing, and self-authored skills are scattered with no shared install/manifest/safety story. `xsk` solves both. It ships six curated skills (two distilled from third parties, four original) and a CLI that installs each skill into every supported platform's skill directory, then tracks exactly what it created so uninstall removes only those files.

`xsk` is itself an agent-skill project and conforms to the same standard its scaffold skill enforces.

## Installation

```sh
npm install -g @xenonbyte/xsk
```

Requires Node >= 20 on macOS or Linux.

## Usage

```sh
xsk install                 # install every skill into every platform
xsk install --platform claude,codex
xsk status                  # read-only: what is installed per platform
xsk status --json
xsk uninstall               # remove only what xsk created
xsk doctor                  # probe environment + manifest health
xsk version
xsk help
```

## Commands

| Command | Purpose |
|---|---|
| `version` (also `--version` / `-v`) | Print the package version. |
| `help` (also `--help` / `-h`, and on no args) | Print the user command list. |
| `install [--platform <list>]` | Generate and install skills. `--platform` is comma-separated, defaults to all four platforms. Unknown or duplicate values are rejected. |
| `uninstall [--platform <list>]` | Remove only the manifest-recorded generated files. |
| `status [--json]` | Read-only per-platform report: `ok`, `drift`, or `invalid`. Validates manifest shape, not just parse success. |
| `doctor [--json]` | Read-only probe of Node version, target-dir writability, and manifest validity. Pass/fail per check. No capability claims. |

Unknown options fail loud with a non-zero exit.

## Skills

Six skills, prefixed `xsk-`:

| Skill | Purpose |
|---|---|
| `xsk-think` | Turn a rough idea into a decision-complete plan before any code is written. Distilled from Waza `/think`. |
| `xsk-bypass-claude` | Set the current project to Claude Code bypass-permissions mode by writing `.claude/settings.json`. Claude only. |
| `xsk-skill-scaffold` | Bring an agent-skill project up to the `xsk` standard, or refuse if it is not one. |
| `xsk-write-req` | Convert plain-language needs into a compliant requirement doc in `requirements/`, grounded in the current project. |
| `xsk-archive-req` | Archive the active requirement doc into `requirements/archive/`. |
| `xsk-check` | Review a code change before it ships: scope drift, hard stops, evidence-gated findings, then verify and sign off. Distilled from Waza `/check`. |

`xsk-bypass-claude` targets Claude Code only; `xsk install` skips it on the other three platforms.

## Platforms

All four platforms are full and use the same `<name>/SKILL.md` skill-directory shape.

| Platform | Install location |
|---|---|
| Claude Code | `~/.claude/skills/<name>/SKILL.md` |
| Codex | `~/.agents/skills/<name>/SKILL.md` |
| opencode | `~/.config/opencode/skills/<name>/SKILL.md` |
| Gemini | `~/.gemini/skills/<name>/SKILL.md` |

Platform behavior is verified as of 2026-06-25 against the official docs linked from the source repository's `docs/REQUIREMENTS.md`.

## Safety

Installing into user home config dirs is destructive if careless. `xsk` is manifest-backed:

- Owned-only removal. Uninstall removes only paths the manifest recorded.
- Ownership markers. A `.xsk-owned` marker inside each installed skill dir gates directory removal.
- No symlink traversal or removal. `xsk` refuses on encounter.
- Atomic writes. Each file is written to a temp sibling then renamed into place; a failed write restores the original.
- User edits preserved. If a generated file was user-modified, uninstall keeps it, reports a partial result, and narrows the retained manifest so a later run can finish.

`xsk` writes only under `~/.xsk/` and the four platform skill dirs.

## Development

```sh
npm test            # full node:test suite
npm run syntaxcheck # node --check every bin/, lib/, test/ file
npm pack --dry-run  # verify package contents
```

The full requirement specification lives in the source repository at `docs/REQUIREMENTS.md`.

## License

MIT

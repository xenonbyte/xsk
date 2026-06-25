---
name: xsk-skill-scaffold
description: Bring an agent-skill project up to the xsk standard, or refuse if the target is not an agent-skill project.
---

# xsk-skill-scaffold

Bring an agent-skill project up to the `xsk` standard, or refuse if the target is not an agent-skill project. The standard is self-owned and canonical: it lives in this skill, not in an external file that can drift.

## When to use

Match the intent, not the exact words. Common cues:

- "scaffold skill project", "make this a skill installer", "conform to skill standard"
- "项目规范化", "agent 技能项目脚手架"
- any request to bring a project up to a multi-platform agent-skill installer standard

## How it works

**1. Gate first.** Before mutating anything, decide whether the current directory is an agent-skill project: one that has, or is intended to have, a CLI that generates and installs skill files into agent config dirs. Heuristics: a `bin/` plus `skills/` or `shared/` or `templates/`, or a `package.json` whose purpose is skill installation. If it is clearly **not** an agent-skill project (an application, a library with no install surface), **error out** with a one-sentence reason and stop. Do not mutate a non-agent-skill project.

**2. Audit** the project against the canonical checklist below. Record each item as met or missing, with the concrete file or gap.

**3. Propose** the gap-closing changes as a concrete, reviewable patch plan: which files to add or edit, with targets. Patch what is missing or non-conforming; do not rewrite the project wholesale.

**4. Apply on approval.** Wait for explicit approval, then make the changes: add the missing `lib/` modules, wire the CLI commands, add templates, add README parity tests, add `LICENSE`. Do not apply before approval.

### Canonical checklist (the standard this skill enforces)

- CLI surface: `version` / `--version` / `-v`, `help` / `--help` / `-h`, `install [--platform <list>]`, `uninstall [--platform <list>]`, `status` (read-only), optional `doctor`.
- `--platform` is optional, comma-separated, defaults to all platforms; unknown and duplicate values are rejected.
- Unknown options fail loud.
- `status` validates manifest **shape**, not just parse success.
- Removed or renamed commands leave no stale references (grep-clean across CLI, help, README, generated text, `AGENTS.md`, `CLAUDE.md`).
- Four platforms, all full: Claude Code, Codex, opencode, Gemini.
- Manifest-backed install safety: owned-only removal, ownership markers, atomic writes, symlink refusal.
- A golden snapshot of the generated skill shell, masking embedded `shared/` body.
- A bilingual README (`README.md` plus `README.zh-CN.md`) with identical headings, English literals preserved, and content-pinning tests.

### Self-conformance

A project that ships this standard must conform to it itself. The machine-checkable part is an executable self-conformance test (the five core commands resolve, EN/CN README headings match, the manifest module and `LICENSE` exist, `package.json` carries the required fields). The remainder is this skill's judgment when applied to its own source.

## Output

For a non-agent-skill project: a one-sentence refusal and stop, with nothing mutated.

For an agent-skill project: the audit result (each checklist item, met or missing), followed by the proposed patch plan. On approval, the applied changes. Then stop.

<SHARED_MASKED>

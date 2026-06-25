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
- `install` is uninstall-first: a reinstall resets the previously-owned files (pruning skills no longer installed) before regenerating, so no manual `uninstall` is needed. It still refuses to overwrite a user-edited owned file and rolls back instead of destroying it.
- A golden snapshot of the generated skill shell, masking embedded `shared/` body.
- A bilingual README (`README.md` plus `README.zh-CN.md`) with identical headings, English literals preserved, and content-pinning tests.

### Self-conformance

A project that ships this standard must conform to it itself. The machine-checkable part is an executable self-conformance test (the five core commands resolve, EN/CN README headings match, the manifest module and `LICENSE` exist, `package.json` carries the required fields). The remainder is this skill's judgment when applied to its own source.

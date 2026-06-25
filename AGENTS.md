# AGENTS.md

`xsk` (`@xenonbyte/xsk`) — zero-dependency Node >=20 CommonJS CLI that installs 5 curated agent skills across Claude Code, Codex, opencode, and Gemini with manifest-backed install/uninstall safety. Full spec: `docs/REQUIREMENTS.md`. The project conforms to its own scaffold standard; `test/self-conformance.test.js` is the executable floor.

## Commands
- `npm test` — full `node --test` suite (auto-discovers `test/**/*.test.js`).
- `node --test test/install.test.js` — one file; add `--test-name-pattern="phrase"` for one test.
- `npm run syntaxcheck` — `node --check` every `.js` under `bin/`, `lib/`, `test/` via `scripts/syntaxcheck.js` (uses `execFileSync`, no shell).
- `npm pack --dry-run` — verify package contents (sources in; `test/`, `.req-to-plan/`, fixtures excluded by the `files` field).

There is no lint, typecheck, or build step. Run `npm test` + `npm run syntaxcheck` before claiming done.

## CRITICAL — test isolation
Install/uninstall/status/doctor tests must NEVER touch real `~/.claude`, `~/.agents`, `~/.config/opencode`, `~/.gemini`, or `~/.xsk`. Every such test injects per-test temp `platformRoots` + `xskRoot` (via `fs.mkdtempSync`). Do not add a test that falls back to `os.homedir()`. Production code defaults to `os.homedir()`; tests always override it.

## Generation model — single source of truth
- `skills/<name>/SKILL.md` are GENERATED output of `lib/generator.js` `buildSkill`. Do not hand-edit them. Edit `templates/fragments/<base>.{purpose,triggers,behavior,output}.md` and `shared/skill-common.md`, then regenerate the canonical files (buildSkill output) and the golden fixtures.
- `templates/skill.md.tmpl` uses `{{PLACEHOLDER}}` substitution only; the body is platform-neutral.
- `test/fixtures/golden/<skill>.md` are masked snapshots (inlined `shared/` body replaced by `<SHARED_MASKED>`). Changing fragments fails the golden test — regenerate the fixtures from `buildSkill` output + the same mask.

## Skill content rules
- English. Triggers are multilingual cues, not exact-match incantations.
- No em-dash (U+2014) or en-dash (U+2013) — enforced for `xsk-write-req`, apply project-wide. No AI-formulaic filler (banned-phrase list pinned in `test/skill-behavior.test.js`).
- Generated frontmatter is `name` + `description` only. Never add `when_to_use`/`dispatch_intent` as required fields (opencode ignores them — alias-collision rule).
- `xsk-bypass-claude` is Claude-only (`platforms: ['claude']` in `lib/skills.js`); the other 4 skills target all 4 platforms.

## Install safety invariants — do not weaken
Manifest-backed (`~/.xsk/manifests/<platform>.manifest`): owned-only removal; `.xsk-owned` marker gates directory removal; symlink refusal on BOTH install and uninstall; atomic write (temp-sibling + `rename`) with per-run rollback; user-edit detection via regenerate-and-diff (byte-compare current sources to disk); partial uninstall exits `2` and narrows the retained manifest so a later run can finish. Re-install must carry forward prior displaced-file backup records (`previousBackupsFor`).

## Conventions
- Zero third-party runtime deps. Tests use only `node:test` + `node:assert`.
- README is bilingual: `README.md` (EN) + `README.zh-CN.md` (zh-CN) must share identical headings; English literals (commands, paths, tokens) preserved in zh-CN (`test/readme-pinning.test.js`).
- Commit messages: conventional-commits English (`feat(xsk):`, `fix(xsk):`, `chore:` …).

## Not part of xsk — external tooling, do not confuse
- `.req-to-plan/` — r2p (req-to-plan) workflow tool. `.drfx/` — a separate review/fix tool. Neither ships in the package (excluded by the `files` field) and neither is xsk source. `.drfx/` is gitignored; `.req-to-plan/` tracks only its own `.gitignore` (its `archive/` and `.workflow-active` are gitignored).
- After executing an r2p plan, archive the run with `~/.req-to-plan/bin/r2p-archive --work-id <id>` — it moves the WF dir to `.req-to-plan/archive/` (gitignored) and auto-commits the removal. The `r2p` binary and the installed `r2p` skill only cover install/status of the integration, not workflow advance.

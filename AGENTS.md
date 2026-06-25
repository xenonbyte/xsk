# AGENTS.md

`xsk` (`@xenonbyte/xsk`) — zero-dependency Node >=20 CommonJS CLI that installs 6 curated agent skills across Claude Code, Codex, opencode, and Gemini with manifest-backed install/uninstall safety. Full spec: `docs/REQUIREMENTS.md`. The project conforms to its own scaffold standard; `test/self-conformance.test.js` is the executable floor.

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
- `xsk-bypass-claude` is Claude-only (`platforms: ['claude']` in `lib/skills.js`); the other 5 skills target all 4 platforms.

## Install safety invariants — do not weaken
Manifest-backed (`~/.xsk/manifests/<platform>.manifest`): owned-only removal; `.xsk-owned` marker gates directory removal AND its content must be exactly `@xenonbyte/xsk\n` (install refuses to overwrite a marker with any other content; uninstall refuses a non-regular or wrong-content marker and goes partial); symlink AND non-directory-ancestor refusal across the whole path on BOTH install and uninstall (`assertSafePath` walks every segment, with a narrow top-level-symlink exception so `/var`, `/tmp` style roots still resolve); atomic write via an `O_EXCL | O_NOFOLLOW` temp-sibling with a random suffix (no predictable temp path to pre-seed a symlink) plus `rename`, with per-run rollback; cross-platform install is transactional (a later platform's failure rolls back every already-completed platform via a pre-captured path snapshot); `install` is uninstall-first (it routes through `uninstallPlatform` to reset prior owned state and prune skills no longer installed before regenerating; the per-platform snapshot also covers the prior manifest's paths so the reset and install roll back together; a partial reset is tolerated because `installPlatform` then handles retained skills in place, but an invalid prior manifest is refused; `MARKER`/`PACKAGE_NAME` + ownership predicates live in `lib/ownership.js` so install can do this with no install/uninstall require cycle); a previously-owned skill dir is only re-recorded as owned when its `.xsk-owned` marker still exists (a markerless dir whose generated file was replaced by user content is not re-owned, so uninstall leaves the user's dir); user-edit detection via regenerate-and-diff (byte-compare current sources to disk); partial uninstall exits `2` and narrows the retained manifest so a later run can finish. Uninstall backups must resolve inside `~/.xsk/install/backups/<platform>/` and be a regular file, else the skill dir is refused and retained for a later retry. Re-install must carry forward prior displaced-file backup records (`previousBackupsFor`); when the marker is missing but a recorded backup exists, reuse that original backup and refuse to discard a drifted (user-edited) skill file rather than backing up the generated content. When an owned skill dir cannot be removed (e.g. the user left an extra file in it), the `.xsk-owned` marker is rewritten so the dir stays recognizably owned and removal is retryable. `status`/`doctor` drift detection covers recorded `backups` as well as `installed_paths`, and counts a path as drift when it is missing, has a symlink ancestor, or no longer matches its expected type (SKILL.md/marker must be files, owned dirs must be directories); `installedCount` is computed only for `ok`/`drift`, never for an `invalid` (shape-broken) manifest.

## Conventions
- Zero third-party runtime deps. Tests use only `node:test` + `node:assert`.
- README is bilingual: `README.md` (EN) + `README.zh-CN.md` (zh-CN) must share identical headings; English literals (commands, paths, tokens) preserved in zh-CN (`test/readme-pinning.test.js`).
- Commit messages: conventional-commits English (`feat(xsk):`, `fix(xsk):`, `chore:` …).

## Not part of xsk — external tooling, do not confuse
- `.req-to-plan/` — r2p (req-to-plan) workflow tool. `.drfx/` — a separate review/fix tool. Neither ships in the package (excluded by the `files` field) and neither is xsk source. `.drfx/` is gitignored; `.req-to-plan/` tracks only its own `.gitignore` (its `archive/` and `.workflow-active` are gitignored).
- After executing an r2p plan, archive the run with `~/.req-to-plan/bin/r2p-archive --work-id <id>` — it moves the WF dir to `.req-to-plan/archive/` (gitignored) and auto-commits the removal. The `r2p` binary and the installed `r2p` skill only cover install/status of the integration, not workflow advance.

# AGENTS.md

`xsk` (`@xenonbyte/xsk`) - zero-dependency Node >=20 CommonJS CLI that installs 8 curated agent skills across Claude Code, Codex, opencode, and Gemini with manifest-backed install/uninstall safety. `xsk` self-conforms to its own scaffold standard (`test/self-conformance.test.js` is the executable floor).
## Commands
- `npm test` - full `node --test` suite (auto-discovers `test/**/*.test.js`).
- `node --test test/install.test.js` - one file; add `--test-name-pattern="phrase"` for one test.
- `npm run syntaxcheck` - `node --check` every `.js` under `bin/`, `lib/`, `test/` via `scripts/syntaxcheck.js` (uses `execFileSync`, no shell).
- `npm pack --dry-run` - verify package contents (only `bin/`, `lib/`, `skills/`, `shared/`, `templates/`, the two READMEs, `LICENSE` ship; `test/` and `.req-to-plan/` are excluded by the `files` field).

No lint, typecheck, or build step. Run `npm test` + `npm run syntaxcheck` before claiming done.

## Skills
8 skills registered in `lib/skills.js` (shape `{ name, description, platforms, fragmentBase }`; `ALL_PLATFORMS = ['claude','codex','opencode','gemini']`): `xsk-think`, `xsk-bypass-claude`, `xsk-skill-scaffold`, `xsk-write-req`, `xsk-archive-req`, `xsk-point`, `xsk-consume-point`, `xsk-check`. `xsk-bypass-claude` is Claude-only (`platforms: ['claude']`); the other 7 target all 4 platforms.

## Generation model - single source of truth
`skills/<name>/SKILL.md` are GENERATED output. Do not hand-edit them; direct edits pass locally but fail `test/golden.test.js`.

- `lib/generator.js` `buildSkill(skill)` fills `templates/skill.md.tmpl` (`{{PLACEHOLDER}}` substitution only, platform-neutral body) from four per-skill fragments `templates/fragments/<base>.{purpose,triggers,behavior,output}.md` plus the shared body `shared/skill-common.md`.
- `test/fixtures/golden/<skill>.md` is a masked snapshot: the trimmed `shared/skill-common.md` body replaced by the literal `<SHARED_MASKED>` sentinel, so the golden tracks per-skill shape, not the shared body. `test/golden.test.js` byte-compares.
- To change a skill: edit the fragment(s) and/or the `lib/skills.js` entry, then regenerate BOTH the packed `skills/<base>/SKILL.md` and its golden, e.g. from repo root:
  ```js
  const fs = require('fs');
  const { buildSkill } = require('./lib/generator');
  const { get } = require('./lib/skills');
  const sharedTrim = fs.readFileSync('shared/skill-common.md', 'utf8').trim();
  const s = get('xsk-write-req');                                  // the skill you changed
  const content = buildSkill(s).content;
  fs.writeFileSync(`skills/${s.fragmentBase}/SKILL.md`, content);
  fs.writeFileSync(`test/fixtures/golden/${s.name}.md`, content.replace(sharedTrim, '<SHARED_MASKED>'));
  ```
- Adding a new skill = new registry entry + four new fragments + regenerate + extend the hardcoded skill enumerations in `test/generator.test.js`, `test/self-conformance.test.js`, and `test/skill-behavior.test.js`, plus a README row in both READMEs.

## Skill content rules
- English. Triggers are multilingual cues, not exact-match incantations.
- No em-dash (U+2014) or en-dash (U+2013) - enforced for `xsk-write-req`, applied project-wide. Use ASCII hyphen, colon, or comma. No AI-formulaic filler (banned-phrase list pinned in `test/skill-behavior.test.js`).
- Generated frontmatter is `name` + `description` only. Never add `when_to_use`/`dispatch_intent` as required fields (opencode ignores them - alias-collision rule).
- `xsk-write-req`, `xsk-archive-req`, `xsk-point`, `xsk-consume-point` describe reading/writing a project's `.xsk/` dir (`.xsk/requirements/`, `.xsk/points/`, `.xsk/.gitignore`). That is documented skill behavior living in the fragments, NOT runtime code in `lib/`; `lib/` never touches those paths.

## Install/safety model
`bin/xsk.js` `main(argv, options)` dispatches to `lib/install.js` (`install`), `lib/uninstall.js`, `lib/status.js` (`computeStatus`), `lib/capability.js` (`doctor`). Manifest owned by `lib/manifest.js` (`installed_paths`, `backups`, optional `installed_hashes`; `validateOperationalSemantics` checks every recorded path stays under its platform's skills root, or the commands root for command files). Ownership predicates and `MARKER`/`PACKAGE_NAME` live in `lib/ownership.js`, kept separate so install and uninstall have no require cycle.

`lib/adapters/{claude,codex,opencode,gemini}.js` map each platform to its `skillsRoot`. Only opencode also has a `commandsRoot` (`~/.config/opencode/commands`): for each installed skill it additionally writes a flat `xsk-<name>.md` command file (skill body + a `$ARGUMENTS` section) so the skill is directly invocable as `/xsk-<name>`. Command files are manifest-tracked and hashed but carry no `.xsk-owned` marker.

Invariants - do not weaken:
- Owned-only removal, gated by a `.xsk-owned` marker inside each installed skill dir; marker content must be exactly `@xenonbyte/xsk\n` (install refuses to overwrite a marker with any other content; uninstall refuses a non-regular or wrong-content marker and goes partial).
- Content-hash modification detection (`lib/content-hash.js` `contentSha256`): a user-edited owned file is recognized by hash even without the marker - refused/rolled back on install, retained on uninstall, reported as `drift` by `status`. Never clobber user edits.
- Symlink AND non-directory-ancestor refusal across the whole path on BOTH install and uninstall (`assertSafePath` walks every segment, with a narrow top-level-symlink exception so `/var`, `/tmp` roots still resolve).
- Atomic writes: `O_EXCL | O_NOFOLLOW` temp-sibling with a random suffix (no predictable temp path to pre-seed a symlink), then `rename`; per-run rollback on failure. Uninstall backups must resolve inside `~/.xsk/install/backups/<platform>/` and be a regular file, else the skill dir is refused and retained for a later retry.
- Install is uninstall-first: a reinstall resets prior owned files (pruning skills no longer installed) before regenerating. Cross-platform install is transactional: a later platform's failure rolls back every already-completed platform via a pre-captured path snapshot. An invalid prior manifest is refused.
- A previously-owned skill dir is only re-recorded as owned when its `.xsk-owned` marker still exists (a markerless dir holding user content is not re-owned, so uninstall leaves it). When an owned dir cannot be removed, the marker is rewritten so it stays owned and removal is retryable.
- Partial uninstall exits `2` and narrows the retained manifest so a later run can finish. Re-install carries forward prior displaced-file backup records (`previousBackupsFor`); a drifted (user-edited) skill file is refused, not re-backed-up.
- `status`/`doctor` drift covers recorded `backups` as well as `installed_paths`, and counts a path as drift when missing, has a symlink ancestor, or no longer matches its expected type; `installedCount` counts only `ok`/`drift`, never `invalid` (shape-broken) manifests.

## CRITICAL - test isolation
Install/uninstall/status/doctor tests must NEVER touch real `~/.claude`, `~/.agents`, `~/.config/opencode`, `~/.gemini`, or `~/.xsk`. `main()`, `install()`, `computeStatus()`, `uninstall*()`, and `doctor()` accept injected roots via their `options`: `platformRoots`, `platformCommandsRoots`, `xskRoot`. Tests MUST thread per-test temp dirs (via `fs.mkdtempSync`) through these. The overrides are injection-only (never parsed from real CLI argv), so real-user behavior is unchanged. When adding an opencode test, route through `platformCommandsRoots` or it writes to the real config. Do not add a test that falls back to `os.homedir()`; production code defaults to `os.homedir()`, tests always override it.

## Conventions
- Zero third-party runtime deps. Tests use only `node:test` + `node:assert`.
- `README.md` (EN) + `README.zh-CN.md` (zh-CN) must have byte-identical heading lines, in order (`test/baseline.test.js`, `test/readme-pinning.test.js`, `test/self-conformance.test.js`). Edit both in lockstep; the CN README keeps English headings and English literals (commands, paths, `npm test`).
- Commit messages: conventional-commits English (`feat(xsk):`, `fix(xsk):`, `chore:` ...).

## Not part of xsk - external tooling, do not confuse
- `.req-to-plan/` - r2p (req-to-plan) workflow tool. `.drfx/` - a separate review/fix tool. Neither ships in the package (excluded by the `files` field) and neither is xsk source. `.drfx/` is gitignored; `.req-to-plan/` tracks only its own `.gitignore` (its `archive/` and `.workflow-active` are gitignored).
- After executing an r2p plan, archive the run with `~/.req-to-plan/bin/r2p-archive --work-id <id>` - it moves the WF dir to `.req-to-plan/archive/` (gitignored) and auto-commits the removal. The `r2p` binary and the installed `r2p` skill cover only install/status of the integration, not workflow advance.

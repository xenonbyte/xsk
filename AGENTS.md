# AGENTS.md

`xsk` (`@xenonbyte/xsk`) - zero-dependency Node >=20 CommonJS CLI that installs 9 curated agent skills across Claude Code, Codex, opencode, and Gemini with manifest-backed install/uninstall safety. `xsk` self-conforms to its own scaffold standard (`test/self-conformance.test.js` is the executable floor).
## Commands
- `npm test` - full `node --test` suite (auto-discovers `test/**/*.test.js`).
- `node --test test/install.test.js` - one file; add `--test-name-pattern="phrase"` for one test.
- `npm run syntaxcheck` - `node --check` every `.js` under `bin/`, `lib/`, `test/` via `scripts/syntaxcheck.js` (uses `execFileSync`, no shell).
- `npm pack --dry-run` - verify package contents (only `bin/`, `lib/`, `skills/`, `shared/`, `templates/`, the two READMEs, `LICENSE` ship; `test/` and `.req-to-plan/` are excluded by the `files` field).

No lint, typecheck, or build step. Run `npm test` + `npm run syntaxcheck` before claiming done.

Release shape (identical across every prior release): bump `version` in `package.json`, commit that file alone as `chore(release): vX.Y.Z`, tag `vX.Y.Z`, push main + tag, `npm publish`, `gh release create`. History is linear - merge feature branches `--ff-only`. Breaking changes bump the minor while 0.x. `npm publish` is irreversible; gate it on `npm test` + `npm run syntaxcheck` + `npm pack --dry-run`, and never publish/push/tag unless the user asked.

## Skills
9 skills registered in `lib/skills.js` (shape `{ name, description, platforms, fragmentBase }`; `ALL_PLATFORMS = ['claude','codex','opencode','gemini']`): `xsk-think`, `xsk-bypass-claude`, `xsk-skill-scaffold`, `xsk-write-req`, `xsk-archive-req`, `xsk-point`, `xsk-consume-point`, `xsk-check`, `xsk-execute-plan`. `xsk-bypass-claude` is Claude-only (`platforms: ['claude']`); the other 8 target all 4 platforms.

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
- Adding a new skill = new registry entry + four new fragments + regenerate packed + golden, then sync every site that hardcodes the skill set: `test/generator.test.js` (count in title + sorted names list), `test/install.test.js` (per-platform count assertions + title; claude=N, non-claude platforms=N-1 since `xsk-bypass-claude` is claude-only), `test/self-conformance.test.js` (packed-file list), `test/skill-behavior.test.js` (per-skill block); a table row + the body count phrases in both READMEs; this file's header count and `## Skills` list; CLAUDE.md's `Skill runtime stores` section and the `.xsk/` line under `Skill content rules` below when the skill touches `.xsk/`. `npm test` guards the test-file + README-parity edits; the README and this file's counts have NO test - eyeball them.

## Which test goes red tells you what you forgot
`body()` in `test/skill-behavior.test.js` calls `buildSkill()` at run time, so every content assertion flips the instant a fragment changes, regenerated or not; only the two `golden:` cases compare against on-disk files. Content assertions red = fragment and assertions disagree. `golden:` red alone = fragment is fine, you just have not regenerated.

## Skill handoff graph - names are load-bearing
Fragments reference each other, so no skill is editable in isolation: `think` -> `xsk-execute-plan`, `xsk-write-req`; `execute-plan` -> `xsk-think` (accepted input + selection source); `consume-point` -> `xsk-point`, `xsk-write-req`; `point` -> `xsk-think`. Renaming or removing a skill means fixing every fragment naming it; `test/skill-behavior.test.js` asserts the handoff strings, so a miss fails instead of shipping a dangling pointer.

`xsk-think` never invokes an executor - it presents choices and stops. `xsk-execute-plan` is explicit-invocation-only and never self-triggers on execution intent (deliberate local rule, so it cannot collide with a harness's own plan/execution modes). Do not make either auto-chain.

## `xsk-execute-plan` - two guards no other skill has
Both in `test/skill-behavior.test.js`:
- **Byte budget.** `EXECUTE_PLAN_PACKED_MAX` / `EXECUTE_PLAN_BEHAVIOR_MAX` cap packed skill + behavior fragment in UTF-8 bytes; this skill once reached 50757 bytes and its job is to be cheap to load. Over budget is a real signal: drop a guarantee, or raise the cap deliberately and state in the delivery what the bytes bought. Never raise a cap just to get green; keep the reasoning comment above the constants truthful.
- **Retired-mechanism blacklist.** Removed mechanism names (`anchor-v1`, `JCS`, `acceptance fingerprint`, `reconciled HEAD`, ...) must not reappear, plus a ban on after-the-fact attribution language. The skill was deliberately rebuilt from an audit system into an orchestrator; this stops the audit machinery creeping back. Do not edit the list to accommodate new prose.

## Skill content rules
- English. Triggers are multilingual cues, not exact-match incantations.
- No em-dash (U+2014) or en-dash (U+2013) - applied project-wide, but the ONLY automated check is scoped to `xsk-write-req` (assertions sit inside that test in `test/generator.test.js`; the all-skills loops there check Waza scripts and relative paths, not dashes). A dash in any other fragment ships green - scan your own added lines (`git diff` `+` lines, not whole files: `test/skill-behavior.test.js` legitimately holds pre-existing em-dashes). Use ASCII hyphen, colon, or comma. No AI-formulaic filler (banned-phrase list pinned in `test/skill-behavior.test.js`).
- Generated frontmatter is `name` + `description` only. Never add `when_to_use`/`dispatch_intent` as required fields (opencode ignores them - alias-collision rule).
- `xsk-write-req`, `xsk-archive-req`, `xsk-point`, `xsk-consume-point`, `xsk-execute-plan` describe reading/writing a project's `.xsk/` dir (`.xsk/requirements/`, `.xsk/points/`, `.xsk/runs/`, `.xsk/.gitignore`). That is documented skill behavior living in the fragments, NOT runtime code in `lib/`; `lib/` never touches those paths.

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

<!-- code-guidelines:begin -->
Maintained by /code-guidelines. Do not edit between these markers.
Progressive-disclosure rule pointers:
- Before any edits, read `.code-guidelines/project-conventions.md` (project conventions).
- Before editing `**/*`, read `.code-guidelines/guardrails-core.md`.
- Before editing `**/*.js`, `**/*.mjs`, `**/*.cjs`, read `.code-guidelines/javascript.md`.
<!-- code-guidelines:end -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Keep shared project facts and workflow rules synchronized with `AGENTS.md`. The registry, fragments, source, and tests are authoritative; these files are contributor guidance, not an execution log.

## What this is

`xsk` (`@xenonbyte/xsk`) is a zero-dependency Node.js CLI that installs 9 curated agent skills into Claude Code, Codex, opencode, and Gemini, with a manifest that records exactly what it created so uninstall removes only those files. Runtime: Node >= 20, CommonJS, no runtime or dev dependencies (do not add any).

9 skills registered in `lib/skills.js` (shape `{ name, description, platforms, fragmentBase }`; `ALL_PLATFORMS = ['claude','codex','opencode','gemini']`): `xsk-think`, `xsk-bypass-claude`, `xsk-skill-scaffold`, `xsk-write-req`, `xsk-execute-req`, `xsk-archive-req`, `xsk-point`, `xsk-consume-point`, `xsk-check`. `xsk-bypass-claude` is Claude-only (`platforms: ['claude']`); the other 8 target all 4 platforms.

## Commands

```sh
npm test                                         # full node:test suite (test/**/*.test.js)
node --test test/install.test.js                 # run a single test file
node --test --test-name-pattern="opencode" test/install.test.js  # filter one file's tests
npm run syntaxcheck                              # node --check on every bin/, lib/, test/ file
npm pack --dry-run                               # verify packaged file list (see package.json "files")
```

No lint, typecheck, or build step. Run `npm test` + `npm run syntaxcheck` before claiming done. `package.json`'s `files` allowlist ships `bin/`, `lib/`, `skills/`, `shared/`, `templates/`, the two READMEs, and `LICENSE`; npm also includes `package.json`. Tests and workflow stores are excluded.

Release workflow: bump `version` in `package.json`, commit that file alone as `chore(release): vX.Y.Z`, tag `vX.Y.Z`, push main + tag, `npm publish`, `gh release create`. Keep history linear by merging feature branches with `--ff-only`. Breaking changes bump the minor while 0.x. Gate publication on `npm test` + `npm run syntaxcheck` + `npm pack --dry-run`; commits, tags, pushes, real installation, and publication require explicit authorization for the relevant action.

## The generation pipeline (read this first)

`skills/<base>/SKILL.md` and `test/fixtures/golden/<name>.md` are generated output. Do not hand-edit them: `test/golden.test.js` compares both against `buildSkill()` and fails when either is stale.

Flow:
- `lib/skills.js` is the registry: each skill is `{ name, description, platforms, fragmentBase }`. `ALL_PLATFORMS` lists the four platforms. `skills` (the array), `get(name)`, and `forPlatform(p)` are the accessors.
- `templates/fragments/<base>.{purpose,triggers,behavior,output}.md` hold the per-skill prose, one file per section.
- `lib/generator.js` `buildSkill(skill)` fills `templates/skill.md.tmpl` with those four sections plus the shared body `shared/skill-common.md`, producing the packed `SKILL.md` content.
- `test/fixtures/golden/<name>.md` is the "masked shell": the packed content with the trimmed `shared/skill-common.md` body replaced by the literal `<SHARED_MASKED>` sentinel (so the golden tracks per-skill shape, not the shared body).

`body()` in `test/skill-behavior.test.js` calls `buildSkill()` at run time. Content assertions check the generated instructions without reading the packed copy. In `test/golden.test.js`, the committed-shell and committed-skill cases separately compare the masked golden and full packed output. A failure in either file comparison means that output needs regeneration; other golden cases also check determinism, platform neutrality, and masking.

Content assertions and snapshots do not prove agent decisions. For workflow behavior changes, exercise the affected cases in `test/fixtures/workflow-evals.md` using isolated temporary workspaces and the generated repository skills plus their companions. Check actual file changes, interruptions, and handoffs; distinguish these fixture results from untested installed-host behavior. No real installation is needed for these evaluations.

To change a skill, edit the fragment(s) and/or the `lib/skills.js` entry, then regenerate BOTH the packed skill and its golden:

```js
// node -e '...' from the repo root
const fs = require('node:fs');
const { buildSkill } = require('./lib/generator');
const { get } = require('./lib/skills');
const { atomicWriteFile } = require('./lib/manifest');
const sharedTrim = fs.readFileSync('shared/skill-common.md', 'utf8').trim();
const s = get('xsk-write-req');                                  // the skill you changed
const content = buildSkill(s).content;
atomicWriteFile(`skills/${s.fragmentBase}/SKILL.md`, content);
atomicWriteFile(`test/fixtures/golden/${s.name}.md`, content.replace(sharedTrim, '<SHARED_MASKED>'));
```

Adding a new skill = new `lib/skills.js` registry entry + four new fragments + regenerate the packed skill AND its golden, then sync every place that hardcodes the skill set:
- `test/generator.test.js`: the skill-count in the test title + the sorted names list.
- `test/install.test.js`: the per-platform count assertions and the test title (claude gets all N; the non-claude platforms get N-1 because `xsk-bypass-claude` is claude-only).
- `test/self-conformance.test.js`: the required packed-file list (`skills/<base>/SKILL.md`).
- `test/skill-behavior.test.js`: a per-skill behavior assertion block.
- Both READMEs: a table row AND all five body count spots (the intro sentence, the feature bullet, the `Nine skills` line above the table, the `xsk status` sample block, and the sentence right after it saying how many the non-Claude platforms show).
- Both `AGENTS.md` and `CLAUDE.md`: skill counts/lists, handoffs, and store rules.

Tests cover the registry expectations, package contents, and README heading parity; prose counts still need a manual check against `lib/skills.js`.

## Install / safety model

`lib/install.js` (`install`), `lib/uninstall.js`, `lib/status.js` (`computeStatus`), and `lib/capability.js` (`doctor`) implement the CLI behaviors dispatched from `bin/xsk.js` `main(argv, options)`. The manifest is owned by `lib/manifest.js` (`installed_paths`, `backups`, optional `installed_hashes`; `validateOperationalSemantics` checks every recorded path stays under its platform's skills root, or the commands root for command files).

Ownership predicates and `MARKER`/`PACKAGE_NAME` live in `lib/ownership.js`, kept separate so install and uninstall have no require cycle.

Invariants - do not weaken:
- Owned-only removal, gated by a `.xsk-owned` marker inside each installed skill dir; marker content must be exactly `@xenonbyte/xsk\n` (install refuses to overwrite a marker with any other content; uninstall refuses a non-regular or wrong-content marker and goes partial).
- Content-hash modification detection (`lib/content-hash.js` `contentSha256`): a user-edited owned file is recognized by hash even without the marker - refused/rolled back on install, retained on uninstall, reported as `drift` by `status`. Never clobber user edits.
- Symlink AND non-directory-ancestor refusal across the whole path on BOTH install and uninstall (`assertSafePath` walks every segment, with a narrow top-level-symlink exception so `/var`, `/tmp` roots still resolve).
- Atomic writes: `O_EXCL | O_NOFOLLOW` temp-sibling with a random suffix (no predictable temp path to pre-seed a symlink), then `rename`; per-run rollback on failure. Uninstall backups must resolve inside `~/.xsk/install/backups/<platform>/` and be a regular file, else the skill dir is refused and retained for a later retry.
- `atomicWriteFile()` replaces its final target. Its exclusive temporary file does not provide create-only/no-clobber publication at the final path; do not confuse installer replacement with the document-archive rules in the workflow fragments.
- Install is uninstall-first: a reinstall resets prior owned files (pruning skills no longer installed) before regenerating. Cross-platform install is transactional: a later platform's failure rolls back every already-completed platform via a pre-captured path snapshot. An invalid prior manifest is refused.
- A previously-owned skill dir is only re-recorded as owned when its `.xsk-owned` marker still exists (a markerless dir holding user content is not re-owned, so uninstall leaves it). Unrecorded user files in an owned directory retain its marker for retry. Once a displaced user file is restored and cleanup succeeds, remove the marker and relinquish directory ownership, even if reinstall recreated that directory.
- Partial uninstall exits `2` and narrows the retained manifest so a later run can finish. Per-skill/command I/O failures roll back that unit and retain its original records; failed final manifest writing or removal rolls back the platform journal, including deleted backups. Re-install refuses operational reset errors and restores its pre-run snapshot. Critical rollback failures report the affected paths while other safe recovery attempts continue. Re-install carries forward prior displaced-file backup records; a drifted (user-edited) skill file is refused, not re-backed-up.
- `status`/`doctor` drift covers recorded `backups` as well as `installed_paths`, and counts a path as drift when missing, has a symlink ancestor, or no longer matches its expected type; `installedCount` counts only `ok`/`drift`, never `invalid` (shape-broken) manifests.

`lib/adapters/{claude,codex,opencode,gemini}.js` map each platform to its `skillsRoot`. Only opencode also has a `commandsRoot` (`~/.config/opencode/commands`): for each installed skill it additionally writes a flat `xsk-<name>.md` command file (skill body + a `$ARGUMENTS` section) so the skill is invocable as `/xsk-<name>`. Command files are manifest-tracked and hashed but carry no `.xsk-owned` marker.

## Hermetic testing (required for any install-path test)

Install/uninstall/status/doctor tests must NEVER touch real `~/.claude`, `~/.agents`, `~/.config/opencode`, `~/.gemini`, or `~/.xsk`. `main()`, `install()`, `computeStatus()`, `uninstall*()`, and `doctor()` accept injected roots via their `options`: `platformRoots`, `platformCommandsRoots`, `xskRoot`. Tests MUST thread per-test temp dirs (via `fs.mkdtempSync`) through these. The overrides are injection-only (never parsed from real CLI argv), so real-user behavior is unchanged. When adding an opencode test, route through `platformCommandsRoots` or it writes to the real config. Do not add a test that falls back to `os.homedir()`; production code defaults to `os.homedir()`, tests always override it.

## Project conventions and check coverage

- Skill content is English; triggers are multilingual intent cues. Generated frontmatter contains only `name` and `description`, without required `when_to_use` or `dispatch_intent` fields. The banned filler phrases are pinned in `test/skill-behavior.test.js`.
- No em-dash (U+2014) or en-dash (U+2013). Applied project-wide by convention, but the only automated check is scoped to ONE skill: the assertions live inside `test/generator.test.js`'s `xsk-write-req` test, and the all-skills loops there check Waza scripts and relative paths, not dashes. A dash added to any other skill's fragment ships green. Scan the added lines yourself (`git diff` `+` lines, not whole files: `test/skill-behavior.test.js` legitimately holds pre-existing em-dashes). Use ASCII hyphen, colon, or comma.
- `README.md` and `README.zh-CN.md` must have byte-identical heading lines, in order (`test/baseline.test.js`, `test/readme-pinning.test.js`, `test/self-conformance.test.js`). Edit both in lockstep; the CN README keeps English headings and certain English literals (commands, paths, `npm test`).
- `xsk` is itself an agent-skill project and self-conforms to the `xsk-skill-scaffold` standard (`test/self-conformance.test.js`): the packed file list, README parity, and required modules are all asserted.
- Commit messages: conventional-commits English (`feat(xsk):`, `fix(xsk):`, `chore:` ...).

## Skills reference each other, and the names are load-bearing

The fragments form a handoff graph: `think` offers `xsk-execute-req` or documentation-only `xsk-write-req`; `point` applies think's research discipline and offers `xsk-consume-point`; `consume-point` uses writer and archives points before offering executor; executor uses writer, `xsk-check`, and `xsk-archive-req`. Nested calls return to their caller without next-action menus or commit offers. Renaming or removing a skill means fixing each handoff; tests pin these names.

- `xsk-think` stays planning-only until selection. Ready work offers exactly two choices: execute the stated route, or revise. Small changes execute inline in normal conversation; an existing active requirement must not divert that choice. Complete complex work needing a durable requirement offers `xsk-execute-req`; documentation-only intent offers `xsk-write-req`. Open questions and no-change judgments do not offer execution.
- `xsk-execute-req` accepts a requirement-execution request or a think plan explicitly routed to it. A generic approved plan or option number alone does not override the selected route. Explicit invocation still selects the requirement workflow for a small plan. Bind the target and scope before writes; never merge an unrelated active requirement silently.
- Executor saves a routed summary through writer and keeps Goal, Scope, Acceptance, and a compact `Execution` section in one requirement. A separate PLAN is needed only when the user or repository requires it. Reuse settled decisions and applicable verification; no mandatory subagents, per-task review ceremony, or repeated approval for the same scope. `xsk-check` reviews the actual change and valid evidence; confirmed in-scope repairs use the existing implementation authorization.
- Consumption finishes before execution. After writer returns, revalidate both point source and archive target before every partial rewrite or archive write. Preserve changes on drift, use content-checked partial edits and create-only/no-clobber publication for new point archives, and verify both files again before source removal. A matching retry archive is reused without rewriting; unresolved consumption never hands off to execution.
- Requirement archival and explicit point drops also use create-only/no-clobber publication, reuse matching retry archives without rewriting, and verify both source and target again before source removal. During execution, unresolved substantive requirement changes pause only the affected work; existing authorization and independent work remain usable.
- Executor automatically archives only after the current required acceptance and review pass. Required failed or unrun checks leave the requirement active. If completion was verified but archival failed, preserve evidence and retry only the remaining persistence work after checking current state. Manual archival may close cancelled or superseded work; `status: archived` alone is not proof of implementation. Git commits, real installation, and publication remain on demand.

## Skill runtime stores

Several skills (`xsk-write-req`, `xsk-execute-req`, `xsk-archive-req`, `xsk-point`, `xsk-consume-point`) describe behavior that reads/writes a project's `.xsk/` directory (`.xsk/requirements/`, `.xsk/points/`, and a `.xsk/.gitignore`). That is the documented behavior of the generated skills (it lives in the fragments), not runtime code in `lib/`; `lib/` never reads those store paths.

Keep at most one active requirement; slugs must match filenames/frontmatter and remain stable in `consumed_by` after archival. Archives are local records ignored through `.xsk/.gitignore`; preserve other ignore rules and check actual Git tracking. Ignored archives are not automatically committed or recoverable from a fresh clone.

## Not part of xsk (do not confuse for source)

`.req-to-plan/` belongs to the external r2p workflow tool; `.drfx/` belongs to a separate review/fix tool. Neither is xsk source or included by the package's `files` allowlist. The project's `.xsk/` is its own use of the documented skill stores, separate from installer state under the default user-level `~/.xsk/`.

When explicitly working on an external workflow, use that tool's installed skill/CLI instructions. Do not hardcode its executable location or assume its archival and commit side effects from xsk's requirement workflow.

<!-- code-guidelines:begin -->
Maintained by /code-guidelines. Do not edit between these markers.
Progressive-disclosure rule pointers:
- Before any edits, read `.code-guidelines/project-conventions.md` (project conventions).
- Before editing `**/*`, read `.code-guidelines/guardrails-core.md`.
- Before editing `**/*.js`, `**/*.mjs`, `**/*.cjs`, read `.code-guidelines/javascript.md`.
<!-- code-guidelines:end -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`xsk` (`@xenonbyte/xsk`) is a zero-dependency Node.js CLI that installs a curated set of agent skills into Claude Code, Codex, opencode, and Gemini, with a manifest that records exactly what it created so uninstall removes only those files. Runtime: Node >= 20, CommonJS, no third-party runtime dependencies (do not add any).

## Commands

```sh
npm test                                         # full node:test suite (test/*.test.js)
node --test test/install.test.js                 # run a single test file
node --test --test-name-pattern="opencode"       # run tests whose name matches a regex
npm run syntaxcheck                              # node --check on every bin/, lib/, test/ file
npm pack --dry-run                               # verify packaged file list (see package.json "files")
```

There is no build step and no linter. The tests ARE the gate; the suite must be fully green before anything ships.

Releasing (the shape every prior release used): bump `version` in `package.json` and commit that file alone as `chore(release): vX.Y.Z`, tag `vX.Y.Z`, push main and the tag, `npm publish`, then `gh release create`. History is linear, so merge feature branches with `--ff-only`. Breaking changes bump the minor while the package is 0.x. `npm publish` is irreversible: run `npm test`, `npm run syntaxcheck`, and `npm pack --dry-run` first, and do not publish, push, or tag unless the user asked for it.

## The generation pipeline (read this first)

Packed skills are GENERATED, not hand-written. The committed `skills/<base>/SKILL.md` files and their golden fixtures are build outputs kept byte-for-byte in sync with the generator. Editing them directly will pass locally but fail `test/golden.test.js`.

Flow:
- `lib/skills.js` is the registry: each skill is `{ name, description, platforms, fragmentBase }`. `ALL_PLATFORMS` lists the four platforms. `skills` (the array), `get(name)`, and `forPlatform(p)` are the accessors.
- `templates/fragments/<base>.{purpose,triggers,behavior,output}.md` hold the per-skill prose, one file per section.
- `lib/generator.js` `buildSkill(skill)` fills `templates/skill.md.tmpl` with those four sections plus the shared body `shared/skill-common.md`, producing the packed `SKILL.md` content.
- `test/fixtures/golden/<name>.md` is the "masked shell": the packed content with the trimmed `shared/skill-common.md` body replaced by the literal `<SHARED_MASKED>` sentinel (so the golden tracks per-skill shape, not the shared body).

Which tests go red when tells you what you forgot. `body()` in `test/skill-behavior.test.js` calls `buildSkill()` at run time, so every content assertion flips the instant you edit a fragment, regenerated or not. Only the two `golden:` cases compare against the files on disk. So: content assertions red = your fragment edit and the assertions disagree; `golden:` red alone = the fragment is fine and you just have not regenerated yet.

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
- `AGENTS.md`: the header install count and the `## Skills` list/count (this is the twin of this file for non-Claude agents).
- The `Skill runtime stores` section below (and its `AGENTS.md` counterpart) when the skill reads/writes `.xsk/`.

`npm test` is the backstop for the test-file and README-parity edits, but the README and `AGENTS.md` counts have no test guard: verify those by eye. `AGENTS.md` carries the count twice, in its opening line and under `## Skills`; both go stale independently.

## Install / safety model

`lib/install.js` (`install`), `lib/uninstall.js`, `lib/status.js` (`computeStatus`), and `lib/capability.js` (`doctor`) implement the CLI behaviors dispatched from `bin/xsk.js` `main(argv, options)`. The manifest is owned by `lib/manifest.js` (`installed_paths`, `backups`, optional `installed_hashes`; `validateOperationalSemantics` checks every recorded path stays under its platform's skills root, or the commands root for command files).

Safety invariants that span these files:
- Owned-only removal, gated by a `.xsk-owned` marker (`lib/ownership.js` `MARKER`) inside each installed skill dir.
- Content-hash modification detection (`lib/content-hash.js` `contentSha256`): a user-edited owned file is recognized by hash even without the marker, and is refused/rolled back on install and retained on uninstall rather than clobbered. `status` reports it as `drift`.
- Atomic writes (temp sibling + rename) with transactional snapshot rollback on a mid-run failure.
- Install is uninstall-first: a reinstall resets prior owned files (pruning skills no longer installed) before regenerating.

`lib/adapters/{claude,codex,opencode,gemini}.js` map each platform to its `skillsRoot`. Only opencode also has a `commandsRoot` (`~/.config/opencode/commands`): for each installed skill it additionally writes a flat `xsk-<name>.md` command file (skill body + a `$ARGUMENTS` section) so the skill is invocable as `/xsk-<name>`. Command files are manifest-tracked and hashed but carry no `.xsk-owned` marker.

## Hermetic testing (required for any install-path test)

`main()`, `install()`, `computeStatus()`, `uninstall*()`, and `doctor()` accept injected roots via their `options` argument: `platformRoots`, `platformCommandsRoots`, and `xskRoot`. Tests MUST thread temp dirs through these so nothing touches the real `~/.claude`, `~/.config/opencode`, etc. These overrides are injection-only (they are not parsed from real CLI argv), so real-user behavior is unchanged. When adding an opencode test, route through `platformCommandsRoots` or it will write to the real config.

## Project conventions enforced by tests

- No em-dash (U+2014) or en-dash (U+2013). Applied project-wide by convention, but the only automated check is scoped to ONE skill: the assertions live inside `test/generator.test.js`'s `xsk-write-req` test, and the all-skills loops there check Waza scripts and relative paths, not dashes. A dash added to any other skill's fragment ships green. Scan the added lines yourself (`git diff` `+` lines, not whole files: `test/skill-behavior.test.js` legitimately holds pre-existing em-dashes). Use ASCII hyphen, colon, or comma.
- `README.md` and `README.zh-CN.md` must have byte-identical heading lines, in order (`test/baseline.test.js`, `test/readme-pinning.test.js`, `test/self-conformance.test.js`). Edit both in lockstep; the CN README keeps English headings and certain English literals (commands, paths, `npm test`).
- `xsk` is itself an agent-skill project and self-conforms to the `xsk-skill-scaffold` standard (`test/self-conformance.test.js`): the packed file list, README parity, and required modules are all asserted.

## Skills reference each other, and the names are load-bearing

The fragments form a handoff graph: `think` offers `xsk-execute-req` or documentation-only `xsk-write-req`; `point` applies think's research discipline and offers `xsk-consume-point`; `consume-point` uses writer and archives points before offering executor; executor uses writer, `xsk-check`, and `xsk-archive-req`. Nested calls return to their caller without next-action menus or commit offers. Renaming or removing a skill means fixing each handoff; tests pin these names.

`xsk-think` stays planning-only and never invokes a skill before selection. Ready work offers execution or revision: small changes execute inline, complete complex work goes directly to `xsk-execute-req`, and documentation-only intent goes to writer. Selection authorizes the stated route without repeating approval. Executor saves a summary internally, keeps progress in the requirement's Execution section, and automatically archives only after current required acceptance and review pass. Failed archival preserves completed implementation evidence for a scoped retry. Git commits, real installation, and publication remain on demand.

## Skill runtime stores

Several skills (`xsk-write-req`, `xsk-execute-req`, `xsk-archive-req`, `xsk-point`, `xsk-consume-point`) describe behavior that reads/writes a project's `.xsk/` directory (`.xsk/requirements/`, `.xsk/points/`, and a `.xsk/.gitignore`). That is the documented behavior of the generated skills (it lives in the fragments), not runtime code in `lib/`; `lib/` never reads those store paths.

## Not part of xsk (do not confuse for source)

`.req-to-plan/` is the r2p (req-to-plan) workflow tool and `.drfx/` is a separate review/fix tool. Neither is xsk source, neither ships in the package (both excluded by the `files` field), and `.xsk/` here is this repo's own use of the skills' runtime store, not `lib/` code. `.drfx/` is gitignored; `.req-to-plan/` tracks only its own `.gitignore`.

<!-- code-guidelines:begin -->
Maintained by /code-guidelines. Do not edit between these markers.
Progressive-disclosure rule pointers:
- Before any edits, read `.code-guidelines/project-conventions.md` (project conventions).
- Before editing `**/*`, read `.code-guidelines/guardrails-core.md`.
- Before editing `**/*.js`, `**/*.mjs`, `**/*.cjs`, read `.code-guidelines/javascript.md`.
<!-- code-guidelines:end -->

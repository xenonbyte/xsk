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

## The generation pipeline (read this first)

Packed skills are GENERATED, not hand-written. The committed `skills/<base>/SKILL.md` files and their golden fixtures are build outputs kept byte-for-byte in sync with the generator. Editing them directly will pass locally but fail `test/golden.test.js`.

Flow:
- `lib/skills.js` is the registry: each skill is `{ name, description, platforms, fragmentBase }`. `ALL_PLATFORMS` lists the four platforms. `skills` (the array), `get(name)`, and `forPlatform(p)` are the accessors.
- `templates/fragments/<base>.{purpose,triggers,behavior,output}.md` hold the per-skill prose, one file per section.
- `lib/generator.js` `buildSkill(skill)` fills `templates/skill.md.tmpl` with those four sections plus the shared body `shared/skill-common.md`, producing the packed `SKILL.md` content.
- `test/fixtures/golden/<name>.md` is the "masked shell": the packed content with the trimmed `shared/skill-common.md` body replaced by the literal `<SHARED_MASKED>` sentinel (so the golden tracks per-skill shape, not the shared body).

To change a skill, edit the fragment(s) and/or the `lib/skills.js` entry, then regenerate BOTH the packed skill and its golden:

```js
// node -e '...' from the repo root
const fs = require('fs');
const { buildSkill } = require('./lib/generator');
const { get } = require('./lib/skills');
const sharedTrim = fs.readFileSync('shared/skill-common.md', 'utf8').trim();
const s = get('xsk-write-req');                                  // the skill you changed
const content = buildSkill(s).content;
fs.writeFileSync(`skills/${s.fragmentBase}/SKILL.md`, content);
fs.writeFileSync(`test/fixtures/golden/${s.name}.md`, content.replace(sharedTrim, '<SHARED_MASKED>'));
```

Adding a new skill = new registry entry + four new fragments + regenerate + extend the hardcoded skill enumerations in `test/generator.test.js`, `test/self-conformance.test.js`, and `test/skill-behavior.test.js`, plus a README row in both READMEs.

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

- No em-dash (U+2014) or en-dash (U+2013) in generated skill content (`test/generator.test.js`). By convention the repo avoids them in docs too; use ASCII hyphen, colon, or comma.
- `README.md` and `README.zh-CN.md` must have byte-identical heading lines, in order (`test/baseline.test.js`, `test/readme-pinning.test.js`, `test/self-conformance.test.js`). Edit both in lockstep; the CN README keeps English headings and certain English literals (commands, paths, `npm test`).
- `xsk` is itself an agent-skill project and self-conforms to the `xsk-skill-scaffold` standard (`test/self-conformance.test.js`): the packed file list, README parity, and required modules are all asserted.

## Skill runtime stores

Several skills (`xsk-write-req`, `xsk-archive-req`, `xsk-point`, `xsk-consume-point`) describe behavior that reads/writes a project's `.xsk/` directory (`.xsk/requirements/`, `.xsk/points/`, and a `.xsk/.gitignore`). That is the documented behavior of the generated skills (it lives in the fragments), not runtime code in `lib/`; `lib/` never reads those store paths.
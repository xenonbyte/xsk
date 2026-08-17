---
name: project-conventions
description: Project-specific conventions distilled from this repository's own code; not general best practice.
source: distilled
---

# Project Conventions

## Guardrails

- MUST require Node builtins with the `node:` prefix; bare `require('fs')` does not appear anywhere in this repository. (Evidence: `lib/generator.js`, `lib/ownership.js`, `bin/xsk.js`)
- MUST open every `.js` file with `'use strict';`, placed after the shebang in an executable. All 30 tracked `.js` files carry it. (Evidence: `lib/install.js`, `test/golden.test.js`, `scripts/syntaxcheck.js`)
- MUST NOT add a runtime or dev dependency. `package.json` declares neither a `dependencies` nor a `devDependencies` key, and tests import only `node:test` and `node:assert`. (Evidence: `package.json`, `test/install.test.js`)
- MUST NOT call `process.exit()` from `lib/`. Command functions return a numeric exit code that only the `require.main === module` guard turns into an exit. (Evidence: `bin/xsk.js`, `lib/status.js`)
- MUST NOT introduce `async`, `await`, `Promise`, or `.then()` into `bin/`, `lib/`, or `scripts/`. Every filesystem call is the `*Sync` form. (Evidence: `lib/install.js`, `lib/uninstall.js`)
- MUST write user-facing output through an injected stream (`opts.stdout` / `opts.stderr`), never `console.log`, so a caller can capture it. (Evidence: `bin/xsk.js`, `lib/capability.js`)
- MUST thread filesystem targets through the injected roots `platformRoots`, `platformCommandsRoots`, and `xskRoot`. These are injection-only and MUST NOT be parsed from CLI argv. (Evidence: `bin/xsk.js`, `lib/install.js`)
- MUST take optional configuration as one trailing `options` argument normalized by `const opts = options || {};`, never as positional flags or destructured parameter defaults. (Evidence: `lib/status.js`, `lib/adapters/opencode.js`)
- MUST NOT let an install-path test fall back to `os.homedir()`; every such test creates its own `fs.mkdtempSync` dir and passes it through the injected roots. (Evidence: `test/install.test.js`, `test/uninstall.test.js`)
- MUST write installed and generated file content through `atomicWriteFile` from `lib/manifest.js` (exclusive temp sibling then rename), never a direct `fs.writeFileSync` to the target path. (Evidence: `lib/install.js`, `lib/uninstall.js`)
- MUST pass every filesystem target through `assertSafePath` before touching it, so a symlinked or non-directory ancestor is refused on the install and uninstall paths alike. (Evidence: `lib/install.js`, `lib/uninstall.js`)
- MUST phrase a safety refusal as a lowercase `refusing to <action>: <path>` message; no error message thrown from `lib/` begins with a capital letter. (Evidence: `lib/install.js`, `lib/manifest.js`)
- MUST NOT hand-edit `skills/<base>/SKILL.md` or `test/fixtures/golden/<name>.md`. They are generator output; change the fragments under `templates/fragments/` and regenerate both. (Evidence: `skills/think/SKILL.md`, `test/fixtures/golden/xsk-think.md`)
- MUST keep a platform adapter to exactly `{ PLATFORM, skillsRoot }`, adding `commandsRoot` only for the one platform that installs command files. (Evidence: `lib/adapters/claude.js`, `lib/adapters/opencode.js`)
- MUST prefix every test title with its area followed by a colon, matching the module under test rather than the filename when they differ. (Evidence: `test/status.test.js`, `test/install.test.js`)
- MUST edit `README.md` and `README.zh-CN.md` in lockstep; their heading lines are asserted byte-identical and in order. The Chinese README keeps English headings and English literals. (Evidence: `README.md`, `README.zh-CN.md`)
- MUST NOT use em-dash (U+2014) or en-dash (U+2013) in skill content or docs; use an ASCII hyphen, colon, or comma. The automated check covers only one skill, so scan added lines yourself. (Evidence: `test/generator.test.js`, `templates/fragments/write-req.behavior.md`)

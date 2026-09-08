---
name: project-conventions
description: Project-specific conventions distilled from this repository's own code; not general best practice.
source: distilled
---

# Project Conventions

## Guardrails

- MUST keep runtime and tests free of third-party packages; use the built-in `node:test` runner and `node:assert` assertions. (Evidence: `package.json`, `test/generator.test.js`, `test/install.test.js`)
- MUST keep JavaScript modules in CommonJS with explicit `'use strict';`, after the shebang when present. (Evidence: `bin/xsk.js`, `lib/generator.js`, `lib/skills.js`)
- MUST require Node builtins with the `node:` prefix. (Evidence: `lib/ownership.js`, `lib/capability.js`, `test/golden.test.js`)
- MUST keep installer, uninstaller, and manifest filesystem operations synchronous; do not introduce Promise-based I/O into those paths. (Evidence: `lib/install.js`, `lib/uninstall.js`, `lib/manifest.js`)
- MUST take optional helper configuration through a trailing `options` object normalized with `const opts = options || {};`. (Evidence: `lib/generator.js`, `lib/status.js`, `lib/adapters/opencode.js`)
- MUST NOT terminate the process from `lib/`; return results and exit-code data to the CLI entrypoint. (Evidence: `bin/xsk.js`, `lib/uninstall.js`)
- MUST keep CLI output routed through `main(argv, options)` stream injection and have status/doctor renderers return strings. (Evidence: `bin/xsk.js`, `lib/status.js`, `lib/capability.js`)
- MUST pass `platformRoots`, `platformCommandsRoots`, and `xskRoot` through command options; these overrides are injection-only, not CLI flags. (Evidence: `bin/xsk.js`, `lib/input.js`, `lib/install.js`)
- MUST give install/uninstall/status/doctor tests temporary injected roots, including `platformCommandsRoots` for opencode; never let their I/O reach real agent homes. (Evidence: `test/install.test.js`, `test/self-conformance.test.js`)
- MUST keep platform adapters limited to `PLATFORM` and `skillsRoot(options)`, with `commandsRoot(options)` for opencode's additional command artifacts. (Evidence: `lib/adapters/claude.js`, `lib/adapters/opencode.js`, `lib/install.js`)
- MUST check installer-managed paths with `assertSafePath` or `isSafePath`; use `allowNonDirectoryTarget` for file leaves without relaxing ancestor checks. (Evidence: `lib/manifest.js`, `lib/ownership.js`, `lib/status.js`)
- MUST route generated installation files, manifest writes, and ownership-marker restoration through `atomicWriteFile`; do not replace these paths with direct writes to final targets. (Evidence: `lib/install.js`, `lib/manifest.js`, `lib/uninstall.js`)
- MUST change skill sources in the registry/fragments/shared template inputs and regenerate both packed `skills/<base>/SKILL.md` and masked golden fixtures; do not hand-edit either generated copy. (Evidence: `lib/generator.js`, `test/golden.test.js`)
- MUST keep generated skill frontmatter to `name` and `description` and keep the shared skill body platform-neutral; platform command wrappers belong in the installer. (Evidence: `templates/skill.md.tmpl`, `test/golden.test.js`, `lib/install.js`)
- MUST prefix test titles with the tested area and a colon, such as `generator:` or `skill-behavior:`. (Evidence: `test/generator.test.js`, `test/skill-behavior.test.js`, `test/install.test.js`)
- MUST preserve identical ordered headings in both READMEs and keep commands, paths, and skill names as English literals in the Chinese README. (Evidence: `README.md`, `README.zh-CN.md`, `test/self-conformance.test.js`)

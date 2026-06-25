---
r2p_stage: plan
r2p_version: 2
r2p_status: approved
r2p_created_at: 2026-06-25T18:10:31.488690+00:00
r2p_updated_at: 2026-06-25T18:25:30.108080+00:00
---

# Plan

## Tasks

### PLAN-TASK-001 Path-containment helper in lib/manifest.js
Scope: SCOPE-IN-001
Spec References: SPEC-BEHAVIOR-001
Change Type: modify
TDD Applicable: yes
Files:
- lib/manifest.js
- test/manifest.test.js
Skeleton:
```js
// lib/manifest.js
function validateOperationalSemantics({ platform, skillsRoot, manifest }) {
  const paths = Array.isArray(manifest && manifest.installed_paths) ? manifest.installed_paths : [];
  for (const p of paths) {
    if (!isInsideDir(p, skillsRoot)) {
      return { valid: false, reason: `installed path escapes platform root: ${p}` };
    }
  }
  return { valid: true };
}
module.exports = { /* existing exports */ validateOperationalSemantics };
```
Steps:
- [ ] Implement validateOperationalSemantics beside validate/isInsideDir; pure (no fs, no mutation), does not re-run shape validate().
- [ ] Export it from lib/manifest.js.
- [ ] Add unit tests: in-root manifest valid; one out-of-root installed_path invalid with a reason; empty installed_paths valid.
Verification: `node --test test/manifest.test.js` passes including the new validateOperationalSemantics cases.

### PLAN-TASK-002 Thread skillsRoot through uninstall and refuse out-of-root
Scope: SCOPE-IN-001
Spec References: SPEC-BEHAVIOR-002
Change Type: modify
TDD Applicable: yes
Files:
- lib/uninstall.js
- lib/install.js
- test/uninstall.test.js
- test/install.test.js
Skeleton:
```js
// lib/uninstall.js
function uninstall(options) {
  const opts = options || {};
  const { rootFor } = require('./install'); // lazy: avoids install/uninstall load-time cycle
  for (const platform of platforms) {
    const skillsRoot = rootFor(platform, opts.platformRoots);
    summary.platforms[platform] = uninstallPlatform({ platform, xskRoot, skillsRoot });
  }
}
function uninstallPlatform({ platform, xskRoot, skillsRoot }) {
  // after shape validate() passes:
  const sem = validateOperationalSemantics({ platform, skillsRoot, manifest });
  if (!sem.valid) {
    return { platform, invalid: true, removed: [], restored: [], retained: [], skipped: [], refused: [], partial: false, error: sem.reason, exitCode: FAILURE_EXIT };
  }
}
// lib/install.js reset call site (line 424; skillsRoot already resolved at 404):
const reset = uninstallPlatform({ platform, xskRoot, skillsRoot });
```
Steps:
- [ ] In uninstall(), lazy-require rootFor, resolve skillsRoot per platform, and pass it into uninstallPlatform.
- [ ] In uninstallPlatform, after shape validate(), run validateOperationalSemantics; on invalid return the existing invalid shape (remove nothing, retain manifest, FAILURE_EXIT).
- [ ] Update the install() reset call site at lib/install.js:424 to pass the already-resolved skillsRoot. install() already throws on `reset.invalid` and rolls back via its catch/snapshot path, so the install side needs only this skillsRoot thread (no new abort/rollback logic).
- [ ] Add a test: shape-valid manifest with one out-of-root installed_path makes uninstall refuse, leaves the file untouched, retains the manifest (inject platformRoots + xskRoot).
- [ ] Add a `test/install.test.js` case where install encounters a prior shape-valid manifest with an out-of-root `installed_paths` entry, the uninstall-first reset refuses, install rolls back any attempted install work, the manifest is retained, and nothing is written outside the platform root (inject platformRoots + xskRoot).
Verification: `node --test test/uninstall.test.js test/install.test.js` passes the uninstall refusal case, the install reset rollback case, and existing install coverage.

### PLAN-TASK-003 Backup restore-target containment in safeBackupForSkill
Scope: SCOPE-IN-001
Spec References: SPEC-BEHAVIOR-003
Change Type: modify
TDD Applicable: yes
Files:
- lib/ownership.js
- lib/uninstall.js
- test/uninstall.test.js
Skeleton:
```js
// lib/ownership.js
function safeBackupForSkill(backups, skillFile, xskRoot, platform, skillsRoot) {
  // existing backup-file-inside-backup-dir and backup-dir-safe checks unchanged...
  if (!isInsideDir(path.resolve(backup.target), skillsRoot)) {
    return { backup, unsafe: true, missing: false };
  }
}
// lib/uninstall.js call site (line 136): thread skillsRoot so it is never undefined
const backupState = safeBackupForSkill(backups, skillFile, xskRoot, platform, skillsRoot);
```
Steps:
- [ ] Add a skillsRoot parameter to safeBackupForSkill; return unsafe when the matched backup target escapes skillsRoot, preserving the existing backup-file and backup-dir checks.
- [ ] Thread skillsRoot at the uninstall.js:136 call site so it is never passed as undefined.
- [ ] Add a unit test: a backup whose target escapes skillsRoot returns unsafe and writes nothing outside the root.
Verification: `node --test test/uninstall.test.js` passes including the backup-target unit test.

### PLAN-TASK-004 status reports invalid (not drift/ok) on out-of-root paths
Scope: SCOPE-IN-001
Spec References: SPEC-BEHAVIOR-004
Change Type: modify
TDD Applicable: yes
Files:
- lib/status.js
- test/status.test.js
Skeleton:
```js
// lib/status.js
const { rootFor } = require('./install'); // status.js already requires ./install
function computeStatus(options) {
  const skillsRoot = rootFor(platform, opts.platformRoots);
  const sem = validateOperationalSemantics({ platform, skillsRoot, manifest });
  if (manifest && validate(manifest, { expectedPlatform: platform }) && !sem.valid) {
    result.platforms[platform] = { state: 'invalid', reason: sem.reason };
    continue;
  }
}
```
Steps:
- [ ] Import rootFor in status.js and resolve skillsRoot per platform.
- [ ] After shape validate passes, consult validateOperationalSemantics; an out-of-root path yields state 'invalid' with a reason, evaluated before the drift check.
- [ ] Add tests: out-of-root recorded path reports 'invalid' (not drift/ok); in-root drift still 'drift'; healthy install still 'ok'.
Verification: `node --test test/status.test.js` passes including the invalid-on-out-of-root case.

### PLAN-TASK-005 doctor forwards platformRoots and adds writable-xsk-root check
Scope: SCOPE-IN-001, SCOPE-IN-002
Spec References: SPEC-BEHAVIOR-004, SPEC-BEHAVIOR-005
Change Type: modify
TDD Applicable: yes
Files:
- lib/capability.js
- test/status.test.js
Skeleton:
```js
// lib/capability.js
const status = computeStatus({ platforms, xskRoot, platformRoots: opts.platformRoots }); // fixes line 74
const writable = isWritableDir(xskRoot);
checks.push({ name: 'writable-xsk-root', label: `~/.xsk writable (${xskRoot})`, pass: writable, detail: writable ? 'writable or creatable' : 'not writable' });
```
Steps:
- [ ] Forward opts.platformRoots into the computeStatus call (lib/capability.js:74) so doctor's manifest-valid check reflects containment.
- [ ] Add a writable-xsk-root check using isWritableDir(xskRoot); a failure makes allPass false and the process exit non-zero, and it appears in --json output.
- [ ] Add doctor tests in test/status.test.js: unwritable xskRoot FAIL with allPass false; symlinked xskRoot FAIL; out-of-root recorded path makes doctor manifest-valid invalid; --json includes the writable-xsk-root entry.
Verification: `node --test test/status.test.js` passes the doctor writable-xsk-root and invalid cases.

### PLAN-TASK-006 Per-command option allow-lists in the parser
Scope: SCOPE-IN-003
Spec References: SPEC-BEHAVIOR-006
Change Type: modify
TDD Applicable: yes
Files:
- lib/input.js
- test/input.test.js
- test/cli.test.js
Skeleton:
```js
// lib/input.js
const ALLOWED = { version: [], help: [], install: ['--platform'], uninstall: ['--platform'], status: ['--platform', '--json'], doctor: ['--platform', '--json'] };
function parse(argv) {
  // resolve command from word and dash forms, then for each option token:
  //   if it is not in ALLOWED[command] throw new Error(`unknown or not-allowed option for ${command}: ${tok}`)
}
```
Steps:
- [ ] Build per-command allow-lists; route word-form version/help through the same validation so they accept no options.
- [ ] Reject any not-allowed or unknown option with a non-zero exit and a clear message; keep --platform value and `--platform=` parsing and --json semantics for status/doctor.
- [ ] Update the existing input.test.js version/help+--json assertion (the message changes) and add negatives (version --platform, version --json, help --json, help --platform x, install --json); keep positives (-v, help, status --json, install --platform claude,codex).
- [ ] Add a CLI-level test in test/cli.test.js asserting non-zero exit for `xsk version --platform claude`.
Verification: `node --test test/input.test.js test/cli.test.js` passes with the updated assertion and new negative cases.

### PLAN-TASK-007 xsk-archive-req atomicity, collision, invalid-slug
Scope: SCOPE-IN-005
Spec References: SPEC-BEHAVIOR-007
Change Type: modify
TDD Applicable: yes
Files:
- templates/fragments/archive-req.behavior.md
- templates/fragments/archive-req.output.md
- skills/archive-req/SKILL.md
- test/fixtures/golden/xsk-archive-req.md
- docs/REQUIREMENTS.md
- test/skill-behavior.test.js
Skeleton:
```js
// regenerate after editing fragments:
const { buildSkill } = require('./lib/generator');
const { get } = require('./lib/skills');
const s = get('xsk-archive-req');
fs.writeFileSync('skills/archive-req/SKILL.md', buildSkill(s).content);
// golden: write the shared-masked shell to test/fixtures/golden/xsk-archive-req.md
```
Steps:
- [ ] Rewrite archive-req.behavior.md in order: (1) validate slug against ^[a-z0-9]+(-[a-z0-9]+)*$ and stop on a missing/invalid slug before any write; (2) check the archive target and, if requirements/archive/<slug>.md already exists, stop and ask the user, writing nothing (collision check BEFORE the write); (3) write the fully-updated archived content (status: archived + archived_at, body unchanged), confirm it landed, then remove the source active doc.
- [ ] Update archive-req.output.md and docs section 4.5 to match.
- [ ] Regenerate skills/archive-req/SKILL.md and the masked golden fixture.
- [ ] Add skill-behavior assertions: collision stop-and-ask with no overwrite, write-then-remove ordering, invalid-slug refusal.
Verification: `node --test test/skill-behavior.test.js test/golden.test.js` passes; the archive-req body specifies collision-before-write, write-then-remove, and invalid-slug stop.

### PLAN-TASK-008 xsk-bypass-claude recast to settings.local.json (skill + registry + golden)
Scope: SCOPE-IN-004
Spec References: SPEC-BEHAVIOR-008
Change Type: modify
TDD Applicable: yes
Files:
- templates/fragments/bypass-claude.purpose.md
- templates/fragments/bypass-claude.behavior.md
- templates/fragments/bypass-claude.output.md
- lib/skills.js
- skills/bypass-claude/SKILL.md
- test/fixtures/golden/xsk-bypass-claude.md
- test/skill-behavior.test.js
Skeleton:
```js
// lib/skills.js registry description
description: 'Set the current project to Claude Code bypass-permissions mode by writing .claude/settings.local.json. Claude only.',
// fragments now target .claude/settings.local.json only and add a non-Claude refusal and a malformed/non-object JSON refusal
```
Steps:
- [ ] Rewrite bypass-claude.{purpose,behavior,output}.md to target .claude/settings.local.json only and never settings.json; keep the create payload, merge-only defaultMode (2-space indent + trailing newline), and idempotent no-op.
- [ ] Add the Claude-Code-only refusal and the malformed/non-object JSON refusal; report only the path and that defaultMode is bypassPermissions.
- [ ] Update the lib/skills.js registry description to settings.local.json.
- [ ] Regenerate skills/bypass-claude/SKILL.md and the golden fixture.
- [ ] Rewrite the skill-behavior.test.js bypass assertions (lines ~64-73): body references settings.local.json, includes the non-Claude and malformed-JSON refusals, and does not instruct writing settings.json.
Verification: `node --test test/skill-behavior.test.js test/golden.test.js` passes; `grep -R "settings.json" skills/bypass-claude` shows no write instruction to the shared file.

### PLAN-TASK-009 xsk-bypass-claude docs, READMEs, and D10
Scope: SCOPE-IN-004
Spec References: SPEC-BEHAVIOR-008
Change Type: modify
TDD Applicable: no
Files:
- docs/REQUIREMENTS.md
- README.md
- README.zh-CN.md
Skeleton:
```text
docs section 4.2: steps 2-4, the "reads only settings.json" note, and the step-5 wording -> settings.local.json (report path + defaultMode only).
docs section 13: add a D10 row recording the bypass scope change to settings.local.json; leave D7 unchanged.
README.md and README.zh-CN.md: bypass skill description -> settings.local.json.
```
Steps:
- [ ] Update docs section 4.2 (steps 2-4, the reads-only note, the step-5 wording) to settings.local.json.
- [ ] Add a D10 row to section 13; leave D7 as-is.
- [ ] Update both READMEs' bypass skill description to settings.local.json.
Verification: `node --test test/readme-pinning.test.js` passes and `grep -R "settings\.json" docs/REQUIREMENTS.md README.md README.zh-CN.md` finds no stale bypass reference to the shared file.

### PLAN-TASK-010 Single-active invariant guard in write-req and archive-req
Scope: SCOPE-IN-006
Spec References: SPEC-BEHAVIOR-009
Change Type: modify
TDD Applicable: yes
Files:
- templates/fragments/write-req.behavior.md
- templates/fragments/archive-req.behavior.md
- skills/write-req/SKILL.md
- skills/archive-req/SKILL.md
- test/fixtures/golden/xsk-write-req.md
- test/fixtures/golden/xsk-archive-req.md
- docs/REQUIREMENTS.md
- test/skill-behavior.test.js
Skeleton:
```text
Both behavior fragments, at the active-doc scan step: if more than one requirements/*.md (excluding archive/) has status: active, stop, list the offending paths, and report the broken invariant for the user to resolve. No multi-active workflow, no auto-resolution. Keep the existing single-active language.
```
Steps:
- [ ] Add the more-than-one-active stop-and-report guard to write-req.behavior.md and archive-req.behavior.md; retain the single-active language.
- [ ] Regenerate both SKILL.md files and both golden fixtures.
- [ ] Confirm docs section 10 wording states the guard without introducing a multi-active flow.
- [ ] Add skill-behavior assertions: both bodies specify the more-than-one-active stop-and-report and retain the single-active language.
Verification: `node --test test/skill-behavior.test.js test/golden.test.js` passes with the new guard assertions.

### PLAN-TASK-011 README discovery-alias disclosure after the verification gate
Scope: SCOPE-IN-007
Spec References: SPEC-BEHAVIOR-010
Change Type: modify
TDD Applicable: no
Files:
- README.md
- README.zh-CN.md
- docs/REQUIREMENTS.md
Skeleton:
```text
Verification gate first: re-verify that opencode reads ~/.claude/skills and ~/.agents/skills and that Gemini reads ~/.agents/skills against current official docs (Context7 or web). If a fact moved, update the copy and docs sections 7 and 14.
If current official docs cannot be verified, stop before writing README copy, mark the fact UNCONFIRMED, and record the blocker.
Then add a "Discovery aliases and duplicate skills" section to README.md and README.zh-CN.md with identical headings and English literals preserved.
```
Steps:
- [ ] Run the R-H1 verification gate against the current official opencode and Gemini docs; update docs sections 7 and 14 if the facts moved, and record the source, date, and outcome in docs section 14 (References) or the PR/commit description.
- [ ] If current official docs cannot be verified, stop before writing README copy, mark the discovery-alias facts UNCONFIRMED, and report the blocked gate instead of guessing.
- [ ] Add the discovery-alias section to README.md and README.zh-CN.md with identical headings and English literals preserved (alias reads, cross-platform visibility, per-platform owned independently-uninstallable copy, bypass inert off Claude Code).
Verification: R-H1 verification has a recorded source/date/outcome (or the task stops with UNCONFIRMED before README edits); `node --test test/readme-pinning.test.js` passes (EN/CN heading parity) and both READMEs contain the new section.

### PLAN-TASK-012 xsk-think output heading wording
Scope: SCOPE-IN-008
Spec References: SPEC-BEHAVIOR-011
Change Type: modify
TDD Applicable: yes
Files:
- templates/fragments/think.output.md
- skills/think/SKILL.md
- test/fixtures/golden/xsk-think.md
- test/skill-behavior.test.js
Skeleton:
```js
// templates/fragments/think.output.md line 1
// before: An **Approved Design Summary** with these parts:
// after:  A **Proposed Design Summary** with these parts:
// then regenerate skills/think/SKILL.md and the golden, and update skill-behavior.test.js:60
```
Steps:
- [ ] Edit think.output.md to read "A **Proposed Design Summary**" (fixing the article from "An").
- [ ] Regenerate skills/think/SKILL.md and the golden fixture.
- [ ] Update skill-behavior.test.js:60 to assert "Proposed Design Summary" and the absence of "Approved Design Summary".
Verification: `node --test test/skill-behavior.test.js test/golden.test.js` passes and the generated xsk-think body contains zero "Approved Design Summary".

### PLAN-TASK-013 Full verification sweep
Spec References: SPEC-BEHAVIOR-012
Change Type: non_code
TDD Applicable: no
Files:
- N/A
Skeleton:
```text
Run the full verification surface after each phase and before claiming a phase done: npm test, npm run syntaxcheck, npm pack --dry-run, golden, self-conformance, readme-pinning.
```
Steps:
- [ ] Run `npm test` and `npm run syntaxcheck`; both clean.
- [ ] Run `npm pack --dry-run` and confirm no unexpected content change.
- [ ] Confirm golden, self-conformance, and readme-pinning tests pass and every touched skill's SKILL.md and golden fixture were regenerated.
Verification: `npm test` and `npm run syntaxcheck` exit 0 and `npm pack --dry-run` shows no unexpected files.

## Spec Closure
Closure status for every SPEC behavior contract this PLAN consumes:

- SPEC-BEHAVIOR-001 [ADDRESSED] by PLAN-TASK-001.
- SPEC-BEHAVIOR-002 [ADDRESSED] by PLAN-TASK-002.
- SPEC-BEHAVIOR-003 [ADDRESSED] by PLAN-TASK-003.
- SPEC-BEHAVIOR-004 [ADDRESSED] by PLAN-TASK-004 and PLAN-TASK-005.
- SPEC-BEHAVIOR-005 [ADDRESSED] by PLAN-TASK-005.
- SPEC-BEHAVIOR-006 [ADDRESSED] by PLAN-TASK-006.
- SPEC-BEHAVIOR-007 [ADDRESSED] by PLAN-TASK-007.
- SPEC-BEHAVIOR-008 [ADDRESSED] by PLAN-TASK-008 and PLAN-TASK-009.
- SPEC-BEHAVIOR-009 [ADDRESSED] by PLAN-TASK-010.
- SPEC-BEHAVIOR-010 [ADDRESSED] by PLAN-TASK-011.
- SPEC-BEHAVIOR-011 [ADDRESSED] by PLAN-TASK-012.
- SPEC-BEHAVIOR-012 [ADDRESSED] by PLAN-TASK-013.

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| PLAN-TASK-001 | SPEC-BEHAVIOR-001, AC-001 | planned |
| PLAN-TASK-002 | SPEC-BEHAVIOR-002, AC-001 | planned |
| PLAN-TASK-003 | SPEC-BEHAVIOR-003, AC-002 | planned |
| PLAN-TASK-004 | SPEC-BEHAVIOR-004, AC-001 | planned |
| PLAN-TASK-005 | SPEC-BEHAVIOR-004, SPEC-BEHAVIOR-005, AC-001, AC-003 | planned |
| PLAN-TASK-006 | SPEC-BEHAVIOR-006, AC-004 | planned |
| PLAN-TASK-007 | SPEC-BEHAVIOR-007, AC-006 | planned |
| PLAN-TASK-008 | SPEC-BEHAVIOR-008, AC-005 | planned |
| PLAN-TASK-009 | SPEC-BEHAVIOR-008, AC-005 | planned |
| PLAN-TASK-010 | SPEC-BEHAVIOR-009, AC-007 | planned |
| PLAN-TASK-011 | SPEC-BEHAVIOR-010, AC-008 | planned |
| PLAN-TASK-012 | SPEC-BEHAVIOR-011, AC-009 | planned |
| PLAN-TASK-013 | SPEC-BEHAVIOR-012, AC-010 | planned |

## Upstream Summary (read-only)
# Spec

## Behavior Contracts

### SPEC-BEHAVIOR-001 Path-containment helper (DES-ARCH-001)
`validateOperationalSemantics({ platform, skillsRoot, manifest })` in
lib/manifest.js returns a result that is invalid when any `installed_paths[]`
entry fails `isInsideDir(entry, skillsRoot)`, and valid otherwise. It is pure (no
fs writes, no manifest mutation), does not re-run shape `validate()`, and takes no
`xskRoot` (backup containment stays in `safeBackupForSkill`). Result shape exposes
a boolean and, when invalid, a reason string naming the first offending path.

### SPEC-BEHAVIOR-002 uninstall refuses an out-of-root manifest (DES-A-002)
`uninstall(options)` resolves `skillsRoot` per platform via a function-scope lazy
`require('./install').rootFor(platform, opts.platformRoots)` and passes it as a
required field into `uninstallPlatform({ platform, xskRoot, skillsRoot })`.
`uninstallPlatform` runs shape `validate()` then `validateOperationalSemantics`
before the per-skill loop. On an out-of-root installed path it returns the
existing invalid result shape: `invalid: true`, empty `removed`/`restored`/
`skipped`, an `error` string, `exitCode === FAILURE_EXIT`, and the manifest file
is left unchanged on disk. The uninstall-first reset call site in the top-level
`install()` function (lib/install.js:424) passes the already-resolved `skillsRoot`
(in scope from lib/install.js:404); a corrupt out-of-root prior manifest makes the
reset refuse and install rolls back via its snapshot path.

### SPEC-BEHAVIOR-003 Backup restore-target containment (DES-A-003)
`safeBackupForSkill` gains a `skillsRoot` argument and returns `unsafe: true` when
the matched backup `target` fails `isInsideDir(target, skillsRoot)`, in addition
to the existing backup-file-inside-backup-dir and backup-dir-safe checks. An
unsafe result drives the existing retain/partial path (the skill dir and file are
retained, the platform is partial), and nothing is written outside `skillsRoot`.
This is reachable and asserted at the `safeBackupForSkill` unit boundary;
SPEC-BEHAVIOR-002 already rejects out-of-root installed paths wholesale in full
uninstall integration.

### SPEC-BEHAVIOR-004 status and doctor report invalid (not drift/ok) on out-of-root (DES-A-004)
`computeStatus` resolves `skillsRoot` per platform from `opts.platformRoots`
(`rootFor` imported normally in status.js) and consults
`validateOperationalSemantics`. An out-of-root recorded path yields
`state: 'invalid'` with a `reason`, evaluated before the drift check, so genuine
in-root drift still reports `drift` and an in-root healthy install still reports
`ok`. `doctor()` forwards `opts.platformRoots` into its `computeStatus(...)` call
(fixing lib/capability.js:74, which currently passes only `{ platforms, xskRoot }`);
its existing `manifest-valid` check then flips to FAIL on the invalid state.

### SPEC-BEHAVIOR-005 doctor writable-xsk-root check (DES-B-005)
`doctor()` adds a check `{ name: 'writable-xsk-root', label, pass, detail }` where
`pass === isWritableDir(xskRoot)`. A symlinked or unwritable `xskRoot` yields
`pass: false`, making `allPass` false and the process exit non-zero. The entry is
in `result.checks[]`, so `--json` output includes it.

### SPEC-BEHAVIOR-006 Per-command option allow-lists (DES-C-006)
`parse(argv)` enforces: `version`/`help` accept no options (any option errors);
`install`/`uninstall` accept `--platform`/`--platform=`; `status`/`doctor` accept
`--platform` and `--json`. Any not-allowed or unknown option for the resolved
command throws, yielding a non-zero CLI exit with a clear `xsk: <message>`.
Preserved: `xsk` (no args -> help), `xsk -v`, `xsk --version`, `xsk version`,
`xsk -h`, `xsk help`, `xsk status --json`, `xsk doctor --json`,
`xsk install --platform claude,codex`, `xsk uninstall --platform=claude`. Newly
rejected: `xsk version --platform claude`, `xsk version --json`, `xsk help --json`,
`xsk help --platform x`, `xsk install --json`.

### SPEC-BEHAVIOR-007 xsk-archive-req atomicity, collision, invalid-slug (DES-E-007)
The regenerated `xsk-archive-req` body specifies, in order: (1) validate the slug
against `^[a-z0-9]+(-[a-z0-9]+)*$`; a missing/invalid slug stops with a reported
reason and no write (R-E3); (2) write the fully-updated archived content
(`status: archived` + `archived_at`, body otherwise unchanged) to
`requirements/archive/<slug>.md`, confirm it landed, then remove the source active
doc (write-then-remove, R-E2); (3) if `requirements/archive/<slug>.md` already
exists, stop and ask the user, writing nothing (DECISION-001 stop-and-ask; no
silent overwrite, R-E1). `archive-req.output.md` and docs section 4.5 match.

### SPEC-BEHAVIOR-008 xsk-bypass-claude recast to settings.local.json (DES-D-008)
The regenerated `xsk-bypass-claude` body targets `.claude/settings.local.json`
only and never writes `.claude/settings.json`. It: creates the file with the
fixed `permissions.defaultMode = "bypassPermissions"` payload when absent; else
merges in place setting only `permissions.defaultMode`, preserving every other
field, 2-space indent, trailing newline; no-ops idempotently when already set
(R-D1). Off Claude Code it states it is a Claude-Code-only skill, writes nothing,
stops (R-D2). If `settings.local.json` exists but is not valid JSON or not a JSON
object, it stops and reports the malformed file, never overwriting/truncating
(R-D3). It reports only the path written and that `defaultMode` is
`bypassPermissions` (R-D4). The registry description (lib/skills.js:16), docs
section 4.2 (steps 2-4, the "reads only settings.json" note, and the step-5
"resulting JSON" wording), a new section-13 D-row, both READMEs, the golden
fixture, and `skill-behavior.test.js` are updated; zero stale `settings.json`
references remain in the skill surface.

### SPEC-BEHAVIOR-009 Single-active invariant guard (DES-F-009)
Both `xsk-write-req` and `xsk-archive-req` bodies specify: when scanning
`requirements/*.md` (excluding `archive/`), if more than one doc has
`status: active`, stop, list the offending paths, and report the broken invariant
for the user to resolve; no multi-active workflow, no auto-resolution. The
existing single-active language is retained. Docs section 10 confirms the guard.

### SPEC-BEHAVIOR-010 README discovery-alias disclosure, gated (DES-H-010)
At Phase 3 start the discovery-alias facts are re-verified against current
official opencode/Gemini docs (owner: Phase 3 implementer); if changed, copy and
docs section 7/14 are updated. Then both `README.md` and `README.zh-CN.md` gain a
"Discovery aliases and duplicate skills" section with identical headings and
English literals preserved, stating the alias reads, the cross-platform
visibility consequence, the per-platform owned independently-uninstallable copy,
and that `xsk-bypass-claude` is inert off Claude Code. `readme-pinning.test.js`
heading-parity passes.

### SPEC-BEHAVIOR-011 xsk-think output heading (DES-I-011)
`think.output.md` reads "Proposed Design Summary"; the generated `xsk-think` body
contains zero "Approved Design Summary" occurrences. `skill-behavior.test.js:60`
is updated to assert "Proposed Design Summary" (and absence of the old phrase).

### SPEC-BEHAVIOR-012 Generation and test-update discipline (DES-PROC-012)
For every touched skill: edit fragments only, regenerate `skills/<base>/SKILL.md`
via `buildSkill`, and regenerate the masked golden fixture; never hand-edit a
generated SKILL.md. ASCII hyphens only, no AI-formulaic filler. README EN/CN
heading parity preserved. Existing tests are updated where their assertions change
(input.test.js `--json` message; skill-behavior bypass-target and think wording).

## API / Data / Config Contracts
- `validateOperationalSemantics({ platform, skillsRoot, manifest }) ->
  { valid: boolean, reason?: string, offending?: string }` (lib/manifest.js,
  exported).
- `uninstallPlatform({ platform, xskRoot, skillsRoot })`: `skillsRoot` is now
  required; both callers (lib/uninstall.js `uninstall()`, lib/install.js:424)
  pass it.
- `safeBackupForSkill(backups, skillFile, xskRoot, platform, skillsRoot)`:
  `skillsRoot` appended; return shape unchanged (`{ backup, unsafe, missing }`).
- `doctor` check entry: `{ name: 'writable-xsk-root', label: string,
  pass: boolean, detail: string }` appended to `checks[]`; `doctor()` passes
  `platformRoots` into `computeStatus`.
- `computeStatus`/`statusOf` invalid result for out-of-root: `{ state: 'invalid',
  reason: string }`.
- `parse()` per-command allowed-option sets:
  `{ version: [], help: [], install: ['--platform'], uninstall: ['--platform'],
  status: ['--platform','--json'], doctor: ['--platform','--json'] }`.
- `.claude/settings.local.json` create-from-scratch payload:
  `{"permissions":{"defaultMode":"bypassPermissions"}}` with 2-space indent and a
  trailing newline.
- Locked decision row: add `D10` to docs section 13 recording the bypass scope
  change to `settings.local.json` (D7 unchanged).

## External Documentation Checked
This round verified the one external fact its implementation depends on this cycle
(Claude Code settings, Phase 2); the opencode/Gemini discovery facts are deferred
to the Phase 3 gate by the requirement, and there are no new package dependencies.

| Dependency | Version | Check Date | Conclusion |
|---|---|---|---|
| Claude Code settings (.claude/settings.local.json, permissions.defaultMode) | current docs | 2026-06-26 | Context7 (/anthropics/claude-code) confirms .claude/*.local.json is the user-local gitignored settings file and permissions.defaultMode is a schema-validated field; bypassPermissions is the auto-approve mode (repo section 14). R-D premise holds. |
| opencode / Gemini skill-discovery dirs (R-H1) | current docs | 2026-06-26 | Re-verification deferred to the Phase 3 gate (SPEC-BEHAVIOR-010), owner Phase 3 implementer; not re-checked this round. |
| New runtime dependencies | n/a | 2026-06-26 | None added; this change introduces no external package dependencies. |

## Test Matrix
| Test | Behavior | Location |
|---|---|---|
| uninstall refuses installed_paths outside platform root | SPEC-BEHAVIOR-002 / AC-001 | test/uninstall.test.js (inject platformRoots+xskRoot) |
| backup record whose target escapes skillsRoot is refused, no outside write | SPEC-BEHAVIOR-003 / AC-002 | unit test on safeBackupForSkill (test/uninstall.test.js or test/safety.test.js) |
| status reports invalid (not drift/ok) for out-of-root recorded path | SPEC-BEHAVIOR-004 / AC-001 | test/status.test.js |
| doctor reports invalid (not drift) for out-of-root recorded path | SPEC-BEHAVIOR-004 / AC-001 | doctor test surface (test/status.test.js or new test/capability.test.js) |
| doctor writable-xsk-root FAIL for unwritable xskRoot; allPass false | SPEC-BEHAVIOR-005 / AC-003 | doctor test surface |
| doctor writable-xsk-root FAIL for symlinked xskRoot | SPEC-BEHAVIOR-005 / AC-003 | doctor test surface |
| doctor --json includes the writable-xsk-root entry | SPEC-BEHAVIOR-005 / AC-003 | doctor test surface |
| version/help reject options; status/doctor accept --json; preserved forms; version --json rejected | SPEC-BEHAVIOR-006 / AC-004 | test/input.test.js (+ update lines ~97-101) |
| version --platform / help --json / help --platform exit non-zero via CLI | SPEC-BEHAVIOR-006 / AC-004 | test/cli.test.js |
| bypass body references settings.local.json, non-Claude refusal, malformed-JSON refusal, no settings.json write | SPEC-BEHAVIOR-008 / AC-005 | test/skill-behavior.test.js (rewrite lines ~64-73) |
| archive body: no-overwrite collision (stop-and-ask), write-then-remove order, invalid-slug refusal | SPEC-BEHAVIOR-007 / AC-006 | test/skill-behavior.test.js |
| write-req + archive-req bodies: >1-active stop-and-report; single-active language retained | SPEC-BEHAVIOR-009 / AC-007 | test/skill-behavior.test.js |
| think body: Proposed Design Summary, no Approved Design Summary | SPEC-BEHAVIOR-011 / AC-009 | test/skill-behavior.test.js (update line ~60) |
| both READMEs: discovery-alias section, identical headings, English literals | SPEC-BEHAVIOR-010 / AC-008 | test/readme-pinning.test.js |
| golden fixtures + canonical SKILL.md match buildSkill for every touched skill | SPEC-BEHAVIOR-012 / AC-010 | test/golden.test.js |
| self-conformance still passes; npm run syntaxcheck clean; npm pack --dry-run no unexpected change | SPEC-BEHAVIOR-012 / AC-010 | test/self-conformance.test.js + CI commands |

## Non-goals
- No change to `schema_version` or the shape `validate()` contract (containment is
  a separate layer).
- No install-all default change; no multi-active requirement-doc workflow.
- No new runtime dependencies; no `when_to_use`/`dispatch_intent` frontmatter.
- No fresh external re-verification of opencode/Gemini facts outside the Phase 3
  gate; no Claude Code settings re-verification (relies on §14).

## PLAN Handoff
- Phase 1 (independently mergeable): SPEC-BEHAVIOR-001..007 (containment helper,
  uninstall refusal + call-site threading + lazy require, backup-target unit
  check, status/doctor invalid + doctor platformRoots forwarding, doctor
  writable-xsk-root, parser allow-lists, archive-req body). Phase 2:
  SPEC-BEHAVIOR-008 (bypass recast + all propagation). Phase 3:
  SPEC-BEHAVIOR-009..011 (single-active guard, README disclosure behind the gate,
  think wording). SPEC-BEHAVIOR-012 spans every skill-touching task.
- Call-site contract: (a) `uninstallPlatform` requires `skillsRoot`, passed by
  both callers; (b) `uninstall()` lazy-requires `rootFor`; (c) `doctor()` forwards
  `platformRoots` into `computeStatus`; (d) `computeStatus` resolves `skillsRoot`
  per platform.
- Test-isolation contract: every new install/uninstall/status/doctor test injects
  per-test temp `platformRoots` + `xskRoot`; no `os.homedir()` fallback.
- Regenerate `skills/<base>/SKILL.md` and the masked golden for every touched
  skill in the same change; update the existing assertions named in the test
  matrix rather than only adding new ones.
- DECISION-001 is resolved (stop-and-ask); the PLAN pins it as the archive
  collision assertion. The R-H1 verification gate is a Phase 3 precondition.
- Per-phase verification: `npm test`, `npm run syntaxcheck`, and (release)
  `npm pack --dry-run` green before a phase is claimed done.

## Behavior Contract Closure
Closure status for every behavior contract specified in this SPEC. All are fully
specified here; none is deferred (the only deferral is the external re-verify in
SPEC-BEHAVIOR-010, recorded in External Documentation Checked).

- SPEC-BEHAVIOR-001 [ADDRESSED] containment helper specified (DES-ARCH-001).
- SPEC-BEHAVIOR-002 [ADDRESSED] uninstall out-of-root refusal specified (DES-A-002, AC-001).
- SPEC-BEHAVIOR-003 [ADDRESSED] backup-target unit check specified (DES-A-003, AC-002).
- SPEC-BEHAVIOR-004 [ADDRESSED] status/doctor invalid specified (DES-A-004, AC-001).
- SPEC-BEHAVIOR-005 [ADDRESSED] doctor writable-xsk-root specified (DES-B-005, AC-003).
- SPEC-BEHAVIOR-006 [ADDRESSED] per-command option allow-lists specified (DES-C-006, AC-004).
- SPEC-BEHAVIOR-007 [ADDRESSED] archive atomicity/collision/slug specified (DES-E-007, AC-006).
- SPEC-BEHAVIOR-008 [ADDRESSED] bypass recast specified (DES-D-008, AC-005).
- SPEC-BEHAVIOR-009 [ADDRESSED] single-active guard specified (DES-F-009, AC-007).
- SPEC-BEHAVIOR-010 [ADDRESSED] README disclosure specified; external re-verify [DEFERRED] to Phase 3 gate (DES-H-010, AC-008).
- SPEC-BEHAVIOR-011 [ADDRESSED] think wording specified (DES-I-011, AC-009).
- SPEC-BEHAVIOR-012 [ADDRESSED] generation/test discipline specified (DES-PROC-012, AC-010).

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| SPEC-BEHAVIOR-001 | DES-ARCH-001, R-A4 | specified |
| SPEC-BEHAVIOR-002 | DES-A-002, R-A1, AC-001 | specified |
| SPEC-BEHAVIOR-003 | DES-A-003, R-A2, AC-002 | specified |
| SPEC-BEHAVIOR-004 | DES-A-004, R-A3, AC-001 | specified |
| SPEC-BEHAVIOR-005 | DES-B-005, R-B1, AC-003 | specified |
| SPEC-BEHAVIOR-006 | DES-C-006, R-C1, AC-004 | specified |
| SPEC-BEHAVIOR-007 | DES-E-007, R-E1..R-E3, AC-006 | specified |
| SPEC-BEHAVIOR-008 | DES-D-008, R-D1..R-D4, AC-005 | specified |
| SPEC-BEHAVIOR-009 | DES-F-009, R-F1, AC-007 | specified |
| SPEC-BEHAVIOR-010 | DES-H-010, R-H1, AC-008 | specified |
| SPEC-BEHAVIOR-011 | DES-I-011, R-I1, AC-009 | specified |
| SPEC-BEHAVIOR-012 | DES-PROC-012, AC-010 | specified |
<!-- /r2p-read-only -->

## Project Context (read-only)
# Project Context Pack

- repo_root: `/Users/xubo/x-studio/skills-group`
- languages: {'JavaScript': 4125}
- package_managers: npm
- test_commands: ['npm test']
- entrypoints: none
- config_files: none
- dependencies (0): none
- source_dirs: ['bin', 'docs', 'lib', 'requirements', 'scripts', 'shared', 'skills', 'templates', 'test']
<!-- /r2p-read-only -->

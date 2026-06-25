# PLAN-TASK-010 Report

## Status

- Result: complete
- Task: Single-active invariant guard in `write-req` and `archive-req`
- Base commit: `721fa62f3d82b3e50e92f53820cb898351f4142c`

## Files Changed

- `templates/fragments/write-req.behavior.md`
- `templates/fragments/archive-req.behavior.md`
- `skills/write-req/SKILL.md`
- `skills/archive-req/SKILL.md`
- `test/fixtures/golden/xsk-write-req.md`
- `test/fixtures/golden/xsk-archive-req.md`
- `docs/REQUIREMENTS.md`
- `test/skill-behavior.test.js`

## TDD RED Evidence

Test added first in `test/skill-behavior.test.js`, then executed:

```bash
node --test test/skill-behavior.test.js
```

Observed RED:

- `skill-behavior: xsk-write-req — grounded, asks on decisions, self-audit, no em/en dash`
  - `AssertionError [ERR_ASSERTION]: stops when more than one active doc exists`
- `skill-behavior: xsk-archive-req — validates slug, stops on collision, writes before remove`
  - `AssertionError [ERR_ASSERTION]: stops when more than one active doc exists`

Exit code: `1`

## Regeneration Commands

Generated artifacts were refreshed from source with:

```bash
node -e 'const fs=require("node:fs");const path=require("node:path");const {buildSkill}=require("./lib/generator");const {get}=require("./lib/skills");const root=process.cwd();const sharedTrim=fs.readFileSync(path.join(root,"shared/skill-common.md"),"utf8").trim();for (const name of ["xsk-write-req","xsk-archive-req"]) { const skill=get(name); const built=buildSkill(skill).content; fs.writeFileSync(path.join(root,"skills",skill.fragmentBase,"SKILL.md"), built); fs.writeFileSync(path.join(root,"test/fixtures/golden",`${name}.md`), built.replace(sharedTrim,"<SHARED_MASKED>")); }'
```

## Final Verification

Executed:

```bash
node --test test/skill-behavior.test.js test/golden.test.js
```

Observed GREEN:

- `tests 15`
- `pass 15`
- `fail 0`
- exit code `0`

## Self-Review

- Both behavior fragments now stop when more than one non-archived requirement doc is active.
- Both fragments explicitly list offending paths, report the broken invariant, and leave resolution to the user.
- Existing single-active wording remains in both skills.
- `docs/REQUIREMENTS.md` section 10 now documents the guard without introducing a multi-active workflow or auto-resolution path.
- Generated `skills/.../SKILL.md` files and masked golden fixtures were regenerated from source, not hand-edited.

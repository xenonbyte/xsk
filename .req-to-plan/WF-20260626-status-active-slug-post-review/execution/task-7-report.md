# PLAN-TASK-007 Report

## Status

Completed.

## Files Changed

- `test/skill-behavior.test.js`
- `templates/fragments/archive-req.behavior.md`
- `templates/fragments/archive-req.output.md`
- `docs/REQUIREMENTS.md`
- `skills/archive-req/SKILL.md`
- `test/fixtures/golden/xsk-archive-req.md`

## RED Evidence

Command:

```bash
node --test test/skill-behavior.test.js
```

Output:

```text
✔ skill-behavior: every generated skill is free of unreplaced placeholders (6.125292ms)
✔ skill-behavior: no AI-formulaic filler phrases across all skills (0.72625ms)
✔ skill-behavior: xsk-think — purpose, triggers, stop-before-approval, output (0.169542ms)
✔ skill-behavior: xsk-bypass-claude — target field, preserve-others, settings.json only (0.184625ms)
✔ skill-behavior: xsk-skill-scaffold — gate, audit, propose, apply; refuses non-agent projects (0.14975ms)
✔ skill-behavior: xsk-write-req — grounded, asks on decisions, self-audit, no em/en dash (0.174083ms)
✖ skill-behavior: xsk-archive-req — validates slug, stops on collision, writes before remove (0.623833ms)
✔ skill-behavior: xsk-check — diff review, hard stops, evidence gate, verify, stop (0.211625ms)
✔ skill-behavior: every skill carries name + description frontmatter and a stop point (0.600583ms)
✔ skill-behavior: manual prose-review checklist is recorded (see file header) (0.093042ms)
ℹ tests 10
ℹ suites 0
ℹ pass 9
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 45.9035

✖ failing tests:

test at test/skill-behavior.test.js:98:1
✖ skill-behavior: xsk-archive-req — validates slug, stops on collision, writes before remove (0.623833ms)
  AssertionError [ERR_ASSERTION]: pins the slug validation regex
      at TestContext.<anonymous> (/Users/xubo/x-studio/skills-group/test/skill-behavior.test.js:101:10)
```

## Regeneration Commands

```bash
node -e "const fs=require('node:fs'); const path=require('node:path'); const { buildSkill }=require('./lib/generator'); const { get }=require('./lib/skills'); const skill=get('xsk-archive-req'); fs.writeFileSync(path.join('skills','archive-req','SKILL.md'), buildSkill(skill).content);"
node -e "const fs=require('node:fs'); const path=require('node:path'); const { buildSkill }=require('./lib/generator'); const { get }=require('./lib/skills'); const skill=get('xsk-archive-req'); const root=process.cwd(); const shared=fs.readFileSync(path.join(root,'shared','skill-common.md'),'utf8').trim(); const masked=buildSkill(skill).content.replace(shared,'<SHARED_MASKED>'); fs.writeFileSync(path.join('test','fixtures','golden','xsk-archive-req.md'), masked);"
```

## Final Verification

Command:

```bash
node --test test/skill-behavior.test.js test/golden.test.js
```

Output:

```text
✔ golden: generated shell is deterministic across builds (4.531667ms)
✔ golden: generated shell is platform-neutral (identical for every platform) (3.17675ms)
✔ golden: masked shell matches the committed golden fixture per skill (1.397583ms)
✔ golden: the shared body is fully masked exactly once per skill (0.512833ms)
✔ golden: committed skills/<base>/SKILL.md matches buildSkill output (packed source stays in sync) (1.216708ms)
✔ skill-behavior: every generated skill is free of unreplaced placeholders (4.30225ms)
✔ skill-behavior: no AI-formulaic filler phrases across all skills (0.814291ms)
✔ skill-behavior: xsk-think — purpose, triggers, stop-before-approval, output (0.206584ms)
✔ skill-behavior: xsk-bypass-claude — target field, preserve-others, settings.json only (0.211417ms)
✔ skill-behavior: xsk-skill-scaffold — gate, audit, propose, apply; refuses non-agent projects (0.155458ms)
✔ skill-behavior: xsk-write-req — grounded, asks on decisions, self-audit, no em/en dash (0.179583ms)
✔ skill-behavior: xsk-archive-req — validates slug, stops on collision, writes before remove (0.282875ms)
✔ skill-behavior: xsk-check — diff review, hard stops, evidence gate, verify, stop (0.223167ms)
✔ skill-behavior: every skill carries name + description frontmatter and a stop point (0.688125ms)
✔ skill-behavior: manual prose-review checklist is recorded (see file header) (0.086334ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 47.62275
```

## Self-Review

- Kept changes scoped to the archive-req fragments, generated outputs, requirement spec section 4.5, and behavior assertions.
- Followed the required order: validate slug, check collision before write, write archived content, confirm it landed, then remove the source doc.
- Regenerated `skills/archive-req/SKILL.md` and the masked golden fixture from source fragments instead of hand-editing generated files.
- Left unrelated workspace change `.req-to-plan/WF-20260626-status-active-slug-post-review/run.md` untouched.

# PLAN-TASK-008 Report

Status: done

Task: recast `xsk-bypass-claude` to `.claude/settings.local.json` with Claude-only and malformed-file refusals, then regenerate canonical outputs.

Base commit for controller diff: `b081caa9f61cccddfbebc6961bc2d6bf178713d4`

## Files changed

- `templates/fragments/bypass-claude.purpose.md`
- `templates/fragments/bypass-claude.behavior.md`
- `templates/fragments/bypass-claude.output.md`
- `lib/skills.js`
- `skills/bypass-claude/SKILL.md`
- `test/fixtures/golden/xsk-bypass-claude.md`
- `test/skill-behavior.test.js`
- `test/generator.test.js`
- `.req-to-plan/WF-20260626-status-active-slug-post-review/execution/task-8-report.md`

## TDD RED evidence

Tests updated first, then run before implementation:

Command:

```bash
node --test test/skill-behavior.test.js test/generator.test.js
```

RED output excerpt:

```text
✖ generator: xsk-bypass-claude targets .claude/settings.local.json and refuses unsafe cases
AssertionError [ERR_ASSERTION]: refuses outside Claude Code

✖ skill-behavior: xsk-bypass-claude — settings.local.json only, Claude-only refusal, malformed-file refusal
AssertionError [ERR_ASSERTION]: refuses outside Claude Code
```

Follow-up adjustment:

- One intermediate failure came from my test wording (`writes nothing`) not matching the intended skill wording (`write nothing`).
- One intermediate failure came from the generated body saying `non-object JSON value`; the fragment was tightened to the required `not a JSON object`.

## Regeneration commands

Canonical skill and masked golden were regenerated from source:

```bash
node -e 'const fs=require("node:fs"); const path=require("node:path"); const {buildSkill}=require("./lib/generator"); const {get}=require("./lib/skills"); const skill=get("xsk-bypass-claude"); const content=buildSkill(skill).content; fs.writeFileSync(path.join("skills", skill.fragmentBase, "SKILL.md"), content); const shared=fs.readFileSync(path.join("shared","skill-common.md"),"utf8").trim(); const masked=content.replace(shared, "<SHARED_MASKED>"); fs.writeFileSync(path.join("test","fixtures","golden",`${skill.name}.md`), masked);'
```

## Final verification

Required verification command:

```bash
node --test test/skill-behavior.test.js test/golden.test.js
```

Output:

```text
✔ golden: generated shell is deterministic across builds
✔ golden: generated shell is platform-neutral (identical for every platform)
✔ golden: masked shell matches the committed golden fixture per skill
✔ golden: the shared body is fully masked exactly once per skill
✔ golden: committed skills/<base>/SKILL.md matches buildSkill output (packed source stays in sync)
✔ skill-behavior: every generated skill is free of unreplaced placeholders
✔ skill-behavior: no AI-formulaic filler phrases across all skills
✔ skill-behavior: xsk-think — purpose, triggers, stop-before-approval, output
✔ skill-behavior: xsk-bypass-claude — settings.local.json only, Claude-only refusal, malformed-file refusal
✔ skill-behavior: xsk-skill-scaffold — gate, audit, propose, apply; refuses non-agent projects
✔ skill-behavior: xsk-write-req — grounded, asks on decisions, self-audit, no em/en dash
✔ skill-behavior: xsk-archive-req — validates slug, stops on collision, writes before remove
✔ skill-behavior: xsk-check — diff review, hard stops, evidence gate, verify, stop
✔ skill-behavior: every skill carries name + description frontmatter and a stop point
✔ skill-behavior: manual prose-review checklist is recorded (see file header)
ℹ pass 15
ℹ fail 0
```

Additional verification run for the adjacent generator contract:

```bash
node --test test/generator.test.js
```

Output:

```text
✔ generator: xsk-bypass-claude targets .claude/settings.local.json and refuses unsafe cases
ℹ pass 15
ℹ fail 0
```

## Grep verification

Command:

```bash
grep -R "settings.json" skills/bypass-claude
```

Output:

```text
skills/bypass-claude/SKILL.md:2. Never write or modify `.claude/settings.json`.
```

Assessment:

- The only remaining occurrence is an explicit negative guard forbidding writes to the shared file.
- There is no positive write instruction targeting `.claude/settings.json`.

## Self-review

- Reviewed the inherited staged Task 8 diff in place and kept it because the staged behavior matches `SPEC-BEHAVIOR-008`.
- Kept `test/generator.test.js` intentionally: it pins the generator contract adjacent to the fragments so future fragment edits cannot regress the generated `xsk-bypass-claude` body without a focused failure.
- The registry description now points to `.claude/settings.local.json`.
- Generated `skills/bypass-claude/SKILL.md` was regenerated from fragments, not hand-edited.
- The golden fixture matches the regenerated output with the shared body masked once.
- The generated body now states:
  - Claude Code-only refusal off Claude
  - malformed / not-a-JSON-object refusal
  - merge-only update of `permissions.defaultMode`
  - 2-space indent, trailing newline, idempotent no-op
  - output limited to the path written and `bypassPermissions`

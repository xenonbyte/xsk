# PLAN-TASK-012 Report

Status: done

Files changed:
- `templates/fragments/think.output.md`
- `skills/think/SKILL.md`
- `test/fixtures/golden/xsk-think.md`
- `test/skill-behavior.test.js`
- `.req-to-plan/WF-20260626-status-active-slug-post-review/execution/task-12-report.md`

RED evidence:
- `node --test test/skill-behavior.test.js`
- Failing assertion before implementation:
  - `AssertionError [ERR_ASSERTION]: output is a Proposed Design Summary`
  - The test failed because the generated `xsk-think` body still contained `Approved Design Summary`.

Regeneration command:
- `node -e "const fs=require('node:fs'); const path=require('node:path'); const {buildSkill}=require('./lib/generator'); const {skills}=require('./lib/skills'); const root=process.cwd(); const skill=skills.find(s=>s.name==='xsk-think'); const built=buildSkill(skill).content; fs.writeFileSync(path.join(root,'skills/think/SKILL.md'), built); const shared=fs.readFileSync(path.join(root,'shared/skill-common.md'),'utf8').trim(); fs.writeFileSync(path.join(root,'test/fixtures/golden/xsk-think.md'), built.replace(shared,'<SHARED_MASKED>'));"`

Verification:
- `node --test test/skill-behavior.test.js test/golden.test.js`
- `rg -n "Approved Design Summary" skills/think/SKILL.md || printf 'no matches\n'`
  - Output: `no matches`

Self-review:
- Kept the scope limited to the requested output-heading wording change.
- Regenerated the generated skill and masked golden from `buildSkill` rather than editing generated content by hand.
- Left the unrelated `.req-to-plan/WF-20260626-status-active-slug-post-review/run.md` edit untouched.

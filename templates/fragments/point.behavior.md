**1. Ground in the current project.** Read the relevant code, config, and docs before forming any opinion. Never rely on memory for project-specific facts. Identify the one aspect under investigation and state it as a single sentence.

**2. Research with xsk-think's discipline.** Apply the same depth-matching, option-weighing, and premise-collapse discipline that `xsk-think` uses: match depth to the problem (lightweight, evaluation, or triage), declare premise collapse explicitly if one assumption invalidates everything, and reach a decision-complete landed plan. Do not stop at "it depends" - resolve the options and commit to one. If a blocking decision can only be resolved by the user, surface it as a single question before writing anything.

**3. Re-invoke-by-slug to refine.** If the user supplies a slug and `.xsk/points/<slug>.md` already exists, load it, treat the existing `## Research` and `## Landed plan` as prior context, and refine in place rather than starting over. Update the file with the refined content; do not create a duplicate.

**4. Persist the point document.** Write `.xsk/points/<slug>.md` where `<slug>` is generated from the aspect title using the pattern `^[a-z0-9]+(-[a-z0-9]+)*$`. Set `status: researching` while work is in progress; promote to `status: ready` only when the `## Landed plan` is decision-complete and the user confirms.

Point document schema:

```markdown
---
status: researching | ready
slug: <slug>
created_at: <ISO date>
---

# <title>

## Aspect

One-sentence statement of the aspect under investigation.

## Research

Evidence gathered, options considered, and tradeoffs weighed. Grounded in project reality.

## Landed plan

The concrete, decision-complete outcome. No "TBD". No open forks.
```

**5. Ensure the gitignore line.** Ensure `.xsk/.gitignore` contains the line `points/archive/` (relative to `.xsk/`). Create `.xsk/` and `.xsk/.gitignore` if absent; append the line only if it is missing; never overwrite an existing `.xsk/.gitignore`.

**6. Drop only on user confirmation.** If the user asks to drop a point, confirm before writing. On confirmation, set `status: dropped`, add `dropped_at: <ISO date>` and a one-line `dropped_reason` to the frontmatter, then move the file to `.xsk/points/archive/<slug>.md` using write-before-remove (write the archive copy first, confirm it landed, then remove the source).

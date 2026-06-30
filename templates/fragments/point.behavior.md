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

**5. Ensure the gitignore line.** Ensure `.xsk/.gitignore` contains the line `points/archive/` (relative to `.xsk/`). Create `.xsk/` and `.xsk/.gitignore` if absent; append the line only if it is missing; never overwrite an existing `.xsk/.gitignore`. Track `.xsk/.gitignore` as a path this run wrote when this step created it or appended the missing line.

**6. Offer to commit, git-aware.** Only after the point document is persisted, decide whether to offer a commit. Build the commit path set from every path this run wrote: the point document, plus `.xsk/.gitignore` if step 5 created it or appended the missing line. If the project is not a git repository (`git rev-parse --is-inside-work-tree` fails), or none of those paths has a change git would record, skip silently and say nothing about committing. Otherwise ask the user once whether to commit this point, and act on the answer:

- On yes, commit only that commit path set. Stage those exact paths first, then commit only them: `git add -- <those paths> && git commit -m "docs(xsk): research point <slug>" -- <those paths>`. Stage first because a bare `git commit -- <path>` rejects an untracked new doc. Never `git add -A` or `git add .`, so unrelated working-tree changes are never swept in.
- On no, leave the document uncommitted and report that it was left for the user to commit.

**7. Drop only on user confirmation.** If the user asks to drop a point, confirm before writing. On confirmation, set `status: dropped`, add `dropped_at: <ISO date>` and a one-line `dropped_reason` to the frontmatter. Before writing, check the archive target `.xsk/points/archive/<slug>.md`: if it already exists, stop, ask the user how to proceed, and leave everything unchanged, writing nothing. Otherwise move the file to `.xsk/points/archive/<slug>.md` using write-before-remove (write the archive copy first, confirm it landed, then remove the source). Then offer to commit the drop, git-aware. Build the drop commit path set from the recordable paths this run touched: the removed point source if git was tracking it, plus `.xsk/.gitignore` if step 5 created it or appended the missing `points/archive/` line. The archive copy lives under the git-ignored `points/archive/`, so it is intentionally not part of the drop commit path set. If the project is not a git repository (`git rev-parse --is-inside-work-tree` fails), or none of those paths has a change git would record, skip silently and say nothing about committing. Otherwise ask the user once whether to commit this drop, and act on the answer:

- On yes, commit only that drop commit path set. Decide whether to include the removed point source with `git ls-files --error-unmatch <path>` (it still succeeds for a tracked file already removed from the working tree but still in the index); omit a point git never tracked, since its removal is not a change git records and listing a never-tracked, now-deleted path would make `git add` fail on an unmatched pathspec and abort the whole commit. Stage those exact paths first, then commit only them: `git add -- <those paths> && git commit -m "docs(xsk): drop point <slug>" -- <those paths>`. Never `git add -A` or `git add .`.
- On no, leave the working tree as is and report that the deletion was left for the user to commit.

**8. Stop at the document.** The point document is the only deliverable. Whether you wrote, refined, or dropped a point, stop once it is persisted and any commit offer is handled. Do not propose, offer, or begin any code change, scaffolding, or requirement document; implementation is a separate action that starts only on the user's explicit, later approval.

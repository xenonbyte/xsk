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

**6. Offer to commit, git-aware.** Only after the point document is persisted, decide whether to offer a commit. If the project is not a git repository (`git rev-parse --is-inside-work-tree` fails), or the point document is byte-identical to what git already tracks, skip silently and say nothing about committing. Otherwise ask the user once whether to commit this point, and act on the answer:

- On yes, commit only the paths this run wrote: the point document, plus `.xsk/.gitignore` if this run created it. Stage those exact paths first, then commit only them: `git add -- <those paths> && git commit -m "docs(xsk): research point <slug>" -- <those paths>`. Stage first because a bare `git commit -- <path>` rejects an untracked new doc. Never `git add -A` or `git add .`, so unrelated working-tree changes are never swept in.
- On no, leave the document uncommitted and report that it was left for the user to commit.

**7. Drop only on user confirmation.** If the user asks to drop a point, confirm before writing. On confirmation, set `status: dropped`, add `dropped_at: <ISO date>` and a one-line `dropped_reason` to the frontmatter. Before writing, check the archive target `.xsk/points/archive/<slug>.md`: if it already exists, stop, ask the user how to proceed, and leave everything unchanged, writing nothing. Otherwise move the file to `.xsk/points/archive/<slug>.md` using write-before-remove (write the archive copy first, confirm it landed, then remove the source). Then offer to commit the drop, git-aware: the archive copy lives under the git-ignored `points/archive/`, so from git's view the only change is the deletion of the source point doc. If the project is a git repository and that point doc was tracked (`git ls-files --error-unmatch <path>` succeeds), ask the user once whether to commit this drop, and act on the answer:

- On yes, commit only that deleted path. Stage the deletion first, then commit only that path: `git add -- <the removed point doc path> && git commit -m "docs(xsk): drop point <slug>" -- <the removed point doc path>`. Never `git add -A` or `git add .`.
- On no, leave the working tree as is and report that the deletion was left for the user to commit.

If the doc was untracked, or the project is not a git repository, skip the prompt and say nothing about committing.

**8. Stop at the document.** The point document is the only deliverable. Whether you wrote, refined, or dropped a point, stop once it is persisted and any commit offer is handled. Do not propose, offer, or begin any code change, scaffolding, or requirement document; implementation is a separate action that starts only on the user's explicit, later approval.

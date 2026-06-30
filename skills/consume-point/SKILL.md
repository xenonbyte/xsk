---
name: xsk-consume-point
description: Fold selected .xsk/points into one .xsk/requirements doc via xsk-write-req, archiving consumed points write-before-remove and leaving unconsumed points active.
---

# xsk-consume-point

Fold one or more researched point documents from `.xsk/points/` into a single requirement document via `xsk-write-req`. Points that land in the requirement are archived as `consumed`; the rest stay active or are dropped only on user confirmation.

## When to use

Match the intent, not the exact words. Common cues:

- "把这些 point 变成需求", "消费 point", "把调研结果写成需求"
- "consume points", "turn points into a requirement", "fold points into a req"
- any request to convert accumulated point documents into a structured requirement document

## How it works

**1. Scan and list available points.** Read all `.md` files under `.xsk/points/` excluding `.xsk/points/archive/`. For each, extract `slug`, `status`, and the `## Aspect` line. Display the list with status, highlighting `ready` entries as eligible. If no files exist, or all are already archived, stop with a one-line reason and do not proceed. If no unarchived point has `status: ready`, stop with a one-line reason, leave every point unchanged, and do not proceed.

**2. Have the user select.** Ask the user which `ready` points to fold into the requirement. Only points with `status: ready` may be selected. If the user selects or names any `researching` or otherwise non-ready point, stop without writing or archiving anything and say it must be completed by `xsk-point` first. If the user selects none, stop without writing anything.

**3. Guard the single-active requirement.** Scan `.xsk/requirements/*.md` (excluding `.xsk/requirements/archive/`) for frontmatter `status: active`. If one exists, prompt the user: append the selected points to the existing active requirement, or abort. If the user aborts, leave `.xsk/requirements/` and `.xsk/points/` entirely unchanged and stop. If more than one active requirement exists, stop, list the offending paths, and report the broken invariant for the user to resolve.

**4. Hand off to xsk-write-req.** Pass the selected `ready` points to `xsk-write-req` as the input need. Before the handoff, re-read each selected point and confirm `status: ready`; if any selected point is no longer ready, stop, archive nothing, and leave all points unchanged. For each selected point, supply the `## Aspect` and `## Landed plan` as the core input, with `## Research` as supporting context. Do not duplicate or modify the rest of the `xsk-write-req` behavior; invoke it by reference, with one deliberate exception: suppress its commit offer (the final commit step) during this handoff, because consume-point makes a single combined commit in step 6 so the requirement doc and the consumed-point removals land together. If `xsk-write-req` stops for any reason (blocking decision, user abort, audit failure), archive nothing and leave all points unchanged.

**5. Archive folded points as consumed (write-before-remove).** After the requirement lands successfully, for each selected point that was folded in: set `status: consumed`, add `consumed_at: <ISO date>` and `consumed_by: .xsk/requirements/<slug>.md` to the frontmatter. Before writing, check the archive target `.xsk/points/archive/<slug>.md`: if it already exists, stop, ask the user how to proceed, and leave that point's source and archive unchanged rather than overwriting. Otherwise write the updated content to `.xsk/points/archive/<slug>.md`, confirm it landed, then remove `.xsk/points/<slug>.md`. Complete write-before-remove for every folded point before reporting done.

**6. Offer to commit the consume, git-aware.** consume-point owns one commit for the whole fold: the requirement doc written in step 4 plus every consumed-point source removed in step 5. If the project is not a git repository (`git rev-parse --is-inside-work-tree` fails), or nothing in those paths is a change git would record (the requirement doc is byte-identical to what git tracks and no removed point was tracked), skip silently and say nothing about committing. Otherwise ask the user once whether to commit this consume, and act on the answer:

- On yes, stage then commit only the paths this run touched: the requirement doc (newly created or appended), each removed `.xsk/points/<slug>.md` that git was tracking, plus `.xsk/.gitignore` if this run created it. Decide which removed points to include with `git ls-files --error-unmatch <path>` (it still succeeds for a tracked file already removed from the working tree but still in the index); omit any point git never tracked, since its removal is not a change git records and listing a never-tracked, now-deleted path would make `git add` fail on an unmatched pathspec and abort the whole commit. Stage those exact paths first, then commit only them: `git add -- <those paths> && git commit -m "docs(xsk): consume points into requirement <slug>" -- <those paths>`. Stage first because a bare `git commit -- <path>` rejects an untracked new doc. Never `git add -A` or `git add .`, so unrelated working-tree changes are never swept in.
- On no, leave the working tree as is and report that the requirement doc and the consumed-point removals were left for the user to commit.

**7. Leave excluded and deferred points active.** Points not selected, or points the user deferred, stay in `.xsk/points/` unchanged with their current status.

**8. Drop consume-rejected points only on user confirmation.** If the user decides a point should be discarded rather than deferred, confirm before writing. On confirmation, set `status: dropped`, add `dropped_at: <ISO date>` and a one-line `dropped_reason`. Before writing, check the archive target `.xsk/points/archive/<slug>.md`: if it already exists, stop, ask the user how to proceed, and leave it unchanged, writing nothing. Otherwise write to `.xsk/points/archive/<slug>.md` (write-before-remove), then remove the source file. Then offer to commit the drop, git-aware, exactly as `xsk-point`'s drop does: the archive copy lives under the git-ignored `points/archive/`, so from git's view the only change is the deletion of the source point doc. If the project is a git repository and that point doc was tracked (`git ls-files --error-unmatch <path>` succeeds), ask the user once whether to commit this drop; on yes, stage the deletion then commit only that path: `git add -- <the removed point doc path> && git commit -m "docs(xsk): drop point <slug>" -- <the removed point doc path>` (never `git add -A` or `git add .`); on no, leave it for the user to commit. If the doc was untracked, or the project is not a git repository, skip the prompt.

## Output

The path of the produced requirement document (or the existing active doc if appended), plus a summary of which points were archived as `consumed` and which remain active or were dropped.

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

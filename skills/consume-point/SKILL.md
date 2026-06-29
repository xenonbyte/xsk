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

**1. Scan and list available points.** Read all `.md` files under `.xsk/points/` excluding `.xsk/points/archive/`. For each, extract `slug`, `status`, and the `## Aspect` line. Display the list with status, highlighting `ready` entries. If no files exist, or all are already archived, stop with a one-line reason and do not proceed.

**2. Have the user select.** Ask the user which points to fold into the requirement. A point with `status: researching` may be selected, but note it is not yet ready. If the user selects none, stop without writing anything.

**3. Guard the single-active requirement.** Scan `.xsk/requirements/*.md` (excluding `.xsk/requirements/archive/`) for frontmatter `status: active`. If one exists, prompt the user: append the selected points to the existing active requirement, or abort. If the user aborts, leave `.xsk/requirements/` and `.xsk/points/` entirely unchanged and stop. If more than one active requirement exists, stop, list the offending paths, and report the broken invariant for the user to resolve.

**4. Hand off to xsk-write-req.** Pass the selected points to `xsk-write-req` as the input need. For each selected point, supply the `## Aspect` and `## Landed plan` as the core input, with `## Research` as supporting context. Do not duplicate or modify the `xsk-write-req` behavior; invoke it by reference. If `xsk-write-req` stops for any reason (blocking decision, user abort, audit failure), archive nothing and leave all points unchanged.

**5. Archive folded points as consumed (write-before-remove).** After the requirement lands successfully, for each selected point that was folded in: set `status: consumed`, add `consumed_at: <ISO date>` and `consumed_by: .xsk/requirements/<slug>.md` to the frontmatter, write the updated content to `.xsk/points/archive/<slug>.md`, confirm it landed, then remove `.xsk/points/<slug>.md`. Complete write-before-remove for every folded point before reporting done.

**6. Leave excluded and deferred points active.** Points not selected, or points the user deferred, stay in `.xsk/points/` unchanged with their current status.

**7. Drop consume-rejected points only on user confirmation.** If the user decides a point should be discarded rather than deferred, confirm before writing. On confirmation, set `status: dropped`, add `dropped_at: <ISO date>` and a one-line `dropped_reason`, write to `.xsk/points/archive/<slug>.md` (write-before-remove), then remove the source file.

## Output

The path of the produced requirement document (or the existing active doc if appended), plus a summary of which points were archived as `consumed` and which remain active or were dropped.

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

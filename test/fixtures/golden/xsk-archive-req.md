---
name: xsk-archive-req
description: Archive the active requirement document into requirements/archive/ and leave zero active docs.
---

# xsk-archive-req

Archive the active requirement document into `requirements/archive/`. After it runs, zero active requirement docs remain.

## When to use

Match the intent, not the exact words. Common cues:

- "归档需求", "需求归档", "把这个需求存档"
- "archive requirement"
- any request to file away the current active requirement doc

## How it works

1. Scan `requirements/*.md` (excluding `requirements/archive/`) for the single document whose frontmatter has `status: active`.
2. If there is no active document, refuse with a one-line reason and stop. Do not archive anything.
3. Move the file to `requirements/archive/<slug>.md`.
4. Update the frontmatter: set `status: archived` and add `archived_at: <ISO date>`. Preserve every other frontmatter field and the entire body unchanged.
5. After archiving, confirm zero active documents remain.

## Output

The archived path (`requirements/archive/<slug>.md`), and confirmation that no active requirement docs remain.

<SHARED_MASKED>

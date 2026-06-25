1. Scan `requirements/*.md` (excluding `requirements/archive/`) for the single document whose frontmatter has `status: active`.
2. If there is no active document, refuse with a one-line reason and stop. Do not archive anything.
3. Move the file to `requirements/archive/<slug>.md`.
4. Update the frontmatter: set `status: archived` and add `archived_at: <ISO date>`. Preserve every other frontmatter field and the entire body unchanged.
5. After archiving, confirm zero active documents remain.

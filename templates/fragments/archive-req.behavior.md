1. Scan `.xsk/requirements/*.md` (excluding `.xsk/requirements/archive/`) for the single document whose frontmatter has `status: active`. If more than one exists, stop, list the offending paths, and report the broken invariant for the user to resolve.
2. If there is no active document, refuse with a one-line reason and stop. Do not archive anything.
3. Read the active doc slug and validate it against `^[a-z0-9]+(-[a-z0-9]+)*$`. If the slug is missing/invalid, stop with the reason before any write.
4. Check the archive target `.xsk/requirements/archive/<slug>.md`. If it already exists, stop, ask the user how to proceed, and leave it unchanged, writing nothing.
5. Write the fully-updated archived content to `.xsk/requirements/archive/<slug>.md`: set `status: archived`, add `archived_at: <ISO date>`, and preserve every other frontmatter field and the entire body unchanged.
6. Confirm it landed as written, then remove the source active doc.
7. After archiving, confirm zero active documents remain.

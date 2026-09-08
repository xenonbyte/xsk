---
name: xsk-archive-req
description: Archive the active requirement document into .xsk/requirements/archive/ and leave zero active docs.
---

# xsk-archive-req

Archive the active requirement document into `.xsk/requirements/archive/`. After it runs, zero active requirement docs remain.

## When to use

Match the intent, not the exact words. Common cues:

- "归档需求", "需求归档", "把这个需求存档"
- "archive requirement"
- any request to file away the current active requirement doc

## How it works

**1. Bind the document before any write.** Scan `.xsk/requirements/*.md` outside archive for the single document whose frontmatter has `status: active`. If more than one exists, stop, list the offending paths, and report the broken invariant for the user to resolve. Honor an explicit slug/path; never substitute a different active doc. Validate the slug against `^[a-z0-9]+(-[a-z0-9]+)*$` and require matching filename/frontmatter identity. Refuse a missing/invalid slug or unsafe path before any write.

If no active doc exists, report that there is nothing to archive. For an explicitly named or already bound requirement whose archive exists, verify its identity and report the existing result without rewriting it. Do not choose the latest archive. Manual archival may close cancelled or superseded work; `status: archived` is not proof of implementation completion.

**2. Preflight the target.** Use `.xsk/requirements/archive/<slug>.md`. If it already exists, resume only when the entire body and other frontmatter match the source, allowing only the expected status/archived_at differences. Reuse the existing archived_at. On conflicting content, preserve both files, ask the user about the conflict, and stop without writes. Do not overwrite a different archive.

For an `xsk-execute-req` call, compare the bound document with the requirement whose scope and acceptance were actually verified. New or unimplemented content must not be archived; return it for execution/revalidation instead. Do not replace this check with a completed checkbox or whichever doc is currently active.

**3. Write before removing.** Ensure `.xsk/.gitignore` contains `requirements/archive/`: create it if absent, otherwise append only the missing line. Preserve other rules. Revalidate source and archive target immediately before publication. Write the fully-updated archived content with `status: archived` and `archived_at: <ISO date>`, preserving every other field and the entire body, including Execution evidence. For an absent target, use create-only publication with no-clobber semantics; a prior existence check followed by an overwriting write or rename is insufficient. If another writer wins creation, stop and preserve the source and winning target. Reuse a verified matching retry archive without rewriting it or changing archived_at.

Confirm it landed as written; re-read the source and confirm it has not changed since that copy was prepared, and re-read the archive to confirm it still matches the prepared archived content, then remove the source active doc. If either file changed or source removal fails, preserve recoverable files and report the remaining action. A verified matching retry copy only needs the unfinished removal.

**4. Report the actual result.** Confirm the archive content, source removal, and zero active documents after success. If another active doc appeared, report that fact without removing it. A failure after implementation completion is an archival failure, not a reason to redo the code. Return the archive path and changed paths to an invoking workflow; suppress commit offers and next-action menus. Standalone archival reports and stops.

Commit only on an explicit request. Check actual Git tracking and same-file/index changes; ignored archives are not automatically untracked or committed. A scoped commit can include the tracked source deletion, any ignore-file change, and other explicitly authorized recordable archive changes. Never stage a removed source Git never tracked, use `git add -A` or `git add .`, or untrack existing files automatically. Archive files ignored by Git are local records and do not survive a fresh clone unless preserved separately.

## Output

Return the actual archived path (`.xsk/requirements/archive/<slug>.md`), verified source removal, and active-document state. For a matching completed retry, report the existing archive or the removal just completed. On a conflict or I/O failure, name the preserved files and the exact remaining action; do not claim archival succeeded.

When invoked by `xsk-execute-req`, return the result and changed paths without a commit offer or next-action menu. Manual archival does not certify implementation completion. Ignored archives remain local; report Git actions only if explicitly requested and actually performed.

<SHARED_MASKED>

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

1. Scan `.xsk/requirements/*.md` (excluding `.xsk/requirements/archive/`) for the single document whose frontmatter has `status: active`. If more than one exists, stop, list the offending paths, and report the broken invariant for the user to resolve.
2. If there is no active document, refuse with a one-line reason and stop. Do not archive anything.
3. Read the active doc slug and validate it against `^[a-z0-9]+(-[a-z0-9]+)*$`. If the slug is missing/invalid, stop with the reason before any write.
4. Check the archive target `.xsk/requirements/archive/<slug>.md`. If it already exists, stop, ask the user how to proceed, and leave it unchanged, writing nothing.
5. Write the fully-updated archived content to `.xsk/requirements/archive/<slug>.md`: set `status: archived`, add `archived_at: <ISO date>`, and preserve every other frontmatter field and the entire body unchanged.
6. Confirm it landed as written, then remove the source active doc.
7. After archiving, confirm zero active documents remain.
8. Offer to commit the archival, git-aware. The archive copy lives under the git-ignored `requirements/archive/`, so from git's view the only change is the deletion of the source active doc. If the project is a git repository and that active doc was tracked (`git ls-files --error-unmatch <path>` succeeds), ask the user once whether to commit this archival, and act on the answer:
   - On yes, commit only that deleted path. Stage the deletion first, then commit only that path: `git add -- <the removed active doc path> && git commit -m "docs(xsk): archive requirement <slug>" -- <the removed active doc path>`. Never `git add -A` or `git add .`.
   - On no, leave the working tree as is and report that the deletion was left for the user to commit.

   If the doc was untracked, or the project is not a git repository, skip the prompt and say nothing about committing.

## Output

Either a one-line refusal that names the missing/invalid slug, a stop-and-ask response when `.xsk/requirements/archive/<slug>.md` already exists and it was left unchanged, writing nothing, or the archived path (`.xsk/requirements/archive/<slug>.md`) plus confirmation that it landed before the source active doc was removed and that no active requirement docs remain, and, when the removed doc was tracked by git, whether the user committed the archival or left it uncommitted.

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

**1. Ground one aspect.** Read relevant current code, config, and docs. State the aspect in one sentence. Apply `xsk-think`'s depth matching, option weighing, simplicity, and premise-collapse discipline, not its execution menu. Reuse relevant evidence and settled decisions; investigate gaps instead of restarting research.

**2. Bind the point identity.** Use a slug matching `^[a-z0-9]+(-[a-z0-9]+)*$`. Check `.xsk/points/<slug>.md` and `.xsk/points/archive/<slug>.md` before creating. Refine an explicitly named or clearly same-aspect active point in place; a different aspect needs a distinct unused slug. Do not overwrite a collision, reuse a historical slug, or reopen an archive implicitly. Keep filename and frontmatter slug identical.

**3. Persist research and confirmation separately.** Save evidence, options, and any blocking user question with `status: researching`; an unresolved question need not prevent saving useful research. Ask substantive questions in dependency order. Promote to `status: ready` only when the landed plan is decision-complete and the user confirms that conclusion. Reuse an explicit confirmation already given, including an unambiguous request to adopt the stated conclusion; approval to commit is not approval of a conclusion. If refinement introduces an unresolved fork or changes an approved conclusion, return it to researching until resolved and confirmed.

A conclusion such as no change, keep the current behavior, or a constraint is valid ready content when grounded and confirmed. Ready is not permanently fresh: check changed relevant facts when consuming, not age or HEAD changes alone.

Point document schema:

```markdown
---
status: researching | ready
slug: <slug>
created_at: <ISO date>
---

# <title>

## Aspect

One-sentence scope.

## Research

Necessary evidence, options, and tradeoffs.

## Landed plan

Confirmed outcome when ready; distinguish any provisional conclusion while researching.

## Open Questions

Only while needed: the unresolved decision and what answer is required.
```

**4. Keep archive conventions.** Ensure `.xsk/.gitignore` contains `points/archive/`: create if absent, otherwise append only the missing line. Preserve existing rules and record changed paths. This does not untrack already tracked archives.

**5. Drop only when authorized.** A direct request to discard this point is sufficient confirmation; do not ask twice. Without that authorization, keep it active. Before writes, validate identity and check the archive target. Set `status: dropped`, `dropped_at`, and a short `dropped_reason`. If a target already exists, resume only when its body and other fields match the source and requested drop, allowing only the expected status/drop metadata changes; reuse its timestamp. On conflict preserve both files, writing nothing, and ask about the conflict. Use write-before-remove: write the archive, verify it landed, re-read the source to ensure its content has not changed, then remove it. A changed source remains active for reconciliation.

**6. Stop at the document.** The point document is the only deliverable; do not begin any code change or requirement write without the selected next action. Ready output may offer `xsk-consume-point` or retain the point; researching output names the unresolved question. Never invoke think's executor route from inside point.

Commit only when explicitly requested. Inspect the actual scoped diff, including pre-existing same-file/index edits. Stage only authorized content and recordable paths: a changed point, a source deletion only if tracked, and any ignore-file change. Never `git add -A` or `git add .`, and do not assume ignored archives are untracked. No commit offer is required to finish.

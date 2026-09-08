---
name: xsk-point
description: Research one aspect into .xsk/points/ to a decision-complete landed plan using xsk-think discipline, then persist and manage it as a named point document.
---

# xsk-point

Research one aspect of the current project to a decision-complete landed plan and persist it as a point document in `.xsk/points/`. The result is a concrete, slug-named file an implementer can consume without re-doing the research.

It is research-and-persist only. It writes no code, no scaffolding, and no requirement document.

## When to use

Match the intent, not the exact words. Common cues:

- "研究一下", "调研一下", "先搞清楚", "这块需要研究"
- "spike this", "research this", "figure out the approach for", "investigate"
- any request to explore and nail down one aspect before writing a requirement or starting implementation
- a slug argument that names an existing point (triggers a refinement of that point, not a new one)

## How it works

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

**5. Drop only when authorized.** A direct request to discard this point is sufficient confirmation; do not ask twice. Without that authorization, keep it active. Before writes, validate identity and check the archive target. Set `status: dropped`, `dropped_at`, and a short `dropped_reason`. If a target already exists, resume only when its body and other fields match the source and requested drop, allowing only the expected status/drop metadata changes; reuse its timestamp and content without rewriting. On conflict preserve both files, writing nothing, and ask about the conflict.

Use write-before-remove. Revalidate source and archive target immediately before publication. For an absent target, use create-only publication with no-clobber semantics; an existence check followed by an overwriting write or rename is insufficient. If creation loses a race, preserve the source and winning target and stop. Verify the archive landed, then re-read both source and archive and compare them with the content prepared for the authorized drop before removing the source. If either file changed, keep the source active for reconciliation. A verified matching retry copy only needs the unfinished removal.

**6. Stop at the document.** The point document is the only deliverable; do not begin any code change or requirement write without the selected next action. Ready output may offer `xsk-consume-point` or retain the point; researching output names the unresolved question. Never invoke think's executor route from inside point.

Commit only when explicitly requested. Inspect the actual scoped diff, including pre-existing same-file/index edits. Stage only authorized content and recordable paths: a changed point, a source deletion only if tracked, and any ignore-file change. Never `git add -A` or `git add .`, and do not assume ignored archives are untracked. No commit offer is required to finish.

## Output

Report the real point path, status, and a short conclusion or remaining question. Active points (`researching`, `ready`) are at `.xsk/points/<slug>.md`; dropped points are at `.xsk/points/archive/<slug>.md`.

For ready work, offer two next actions: integrate with `xsk-consume-point`, or retain the point for later use. For researching work, ask only the unresolved substantive question. A drop reports its outcome and stops. Do not start another skill until the user selects it, unless that action was already explicitly requested.

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- Resolve consequential decisions from existing context and authorization. Ask only about unresolved choices affecting goals, behavior, interfaces, scope, or material cost. Routine local implementation choices follow project evidence; do not ask again for work already authorized.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

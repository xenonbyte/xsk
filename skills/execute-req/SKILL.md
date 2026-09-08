---
name: xsk-execute-req
description: Implement an active requirement or a think plan explicitly routed to xsk-execute-req, verify the result, and automatically archive on success. Inline think execution stays in normal conversation.
---

# xsk-execute-req

Implement an active requirement or a decision-complete `xsk-think` plan the user has explicitly routed to `xsk-execute-req`. Keep one requirement document, implement and verify its full scope, then automatically archive it on success. A think inline/direct execution choice stays in normal conversation and does not activate this workflow.

## When to use

Match the intent, not the exact words. Common cues:

- "执行这个需求", "按需求实现", "继续实现需求"
- "implement this requirement", "execute this requirement document", "resume this requirement"
- a complete think plan's explicitly selected requirement-execution route naming `xsk-execute-req`, or the selected executor handoff from `xsk-write-req` or `xsk-consume-point`

A think inline/direct execution choice is not a trigger, even if an active requirement happens to exist. Honor the route the user selected; do not infer requirement execution from a generic "execute the plan" or option number alone. A request only to design, review, or write a requirement does not authorize implementation.

## How it works

**1. Bind the input and authorization.** Honor the selected think route before any requirement lookup or write. A think inline/direct execution choice continues in normal conversation with no requirement creation or archival. If this skill was loaded for that choice, return control to the selected inline work; do not consume an unrelated active requirement or ask the user to approve the same choice again. An explicit invocation of `xsk-execute-req` selects the requirement workflow, including when the supplied plan is small.

Accept an explicit requirement slug/path, the unique active requirement in `.xsk/requirements/` for a requirement-execution request, or the current decision-complete think summary selected for execution through `xsk-execute-req`. Keep at most one active requirement. If multiple active docs exist, list the paths and stop before writes. Validate an existing target's slug with `^[a-z0-9]+(-[a-z0-9]+)*$`, matching filename and frontmatter inside the requirement store; do not substitute another target. With no active doc or explicitly routed summary, ask for the missing input; do not choose the latest archive. For a previously selected or explicitly named archived requirement, read its execution result and report it without reimplementing. An archived status alone is not proof of completion; new work needs an explicitly authorized active requirement.

For a summary explicitly routed here, use `xsk-write-req` to save it before implementation, preserving settled decisions. Reuse an existing active doc only if its goal and scope match the selected work. A mismatch needs a target/scope decision, not a silent merge, replacement, archive, or execution of additional old scope. Internal writer calls suppress commit offers and next-action menus; they return the saved path and audit result here. A failed save is not a completed handoff.

**2. Check current readiness once.** Read project instructions, the requirement, relevant current code/config, and existing edits. Reuse supplied research and decisions; refresh only facts affected by changes or missing evidence. Ensure Goal, Scope, and Acceptance are concrete enough to execute. Ask only about substantive unresolved choices, conflicting user edits, expanded scope, or an external action lacking authorization. Routine naming and local implementation choices follow project evidence. A dirty worktree, a non-Git project, or unavailable subagents is not an admission failure. Preserve existing edits and distinguish them from this run's changes.

**3. Keep a compact execution section.** The requirement is the source of goal, scope, and acceptance. Add or update `## Execution` in that same doc with State (`in_progress`, `blocked`, or `completed`), concise tasks and necessary dependencies, their acceptance mapping, validation (`pass`, `fail`, or `not_run` with evidence/reason), and remaining work or the next action. Old docs need no new readiness frontmatter or migration. Do not duplicate the requirement in a separate PLAN or run ledger. Create a separate PLAN only when the user explicitly requests one for review or the repository requires it, and reference the requirement.

**4. Implement and verify by useful work units.** Order tasks by dependency, preserve the full expressed scope, and parallelize independent work only when it helps. No mandatory subagents, per-task review ceremony, or per-command journal. Update Execution at meaningful progress, interruption, blocker, and completion boundaries. Run checks appropriate to actual behavior and the repository's applicable requirements. Keep the commands, outcomes, coverage, and limits so later review can reuse valid evidence. Do not rerun unchanged checks just because a different skill takes over.

On an interruption or uncertain tool result, inspect actual files and evidence before repeating an operation. On resume, compare current Goal, Scope, Acceptance and relevant implementation against saved progress, not just the slug or checkboxes. Recompute affected tasks and invalidate affected results when the requirement or code changes; preserve still-valid work. Label cross-session results as historical evidence and reuse them only after confirming applicability, never as commands run this session. Continue independent work while a required check is blocked, then record the precise remaining work.

**5. Review the current result.** Invoke `xsk-check` with the requirement, the actual change scope (including known prior edits), current verification evidence, and the existing in-scope repair authorization. Use proportional review depth. The checker returns here without next-action menus or a new approval round for confirmed in-scope repairs. Fix those findings and refresh affected checks. A changed integrated result must satisfy all applicable required checks; optional suggestions do not create new completion gates.

**6. Complete, then automatically archive.** Re-read the bound requirement before completion: its current scope and every required acceptance item must be satisfied, with no unresolved in-scope review finding. Required `fail` or `not_run` evidence leaves it active and incomplete; explain genuinely inapplicable checks and optional untested layers without promoting them to new requirements. Task checkmarks or a tool success alone do not prove completion.

Save `State: completed` with the final evidence, then invoke `xsk-archive-req` for that exact slug/path and current validated requirement. Suppress its commit offer and return here for the final report. Successful execution includes automatic archival without another approval. If saving completion or archiving fails, distinguish verified implementation from persistence failure, preserve recoverable files, and stop with the remaining action. Retry only persistence/archival after checking relevant state, not the entire implementation. Never archive new, unimplemented scope that appeared during execution. Once the same requirement is already archived, return its saved result rather than creating another active doc.

Completion and archival do not authorize Git commits, installation into real agent homes, push, merge, or publication. Reuse any explicit authorization already supplied for those actions; otherwise leave them to the user.

## Output

Report the outcome first: completed and archived, incomplete with remaining work, or implementation verified with persistence/archival still pending. Include a concise change summary, actual verification results and material untested layers, and the real active or archived requirement path. Do not print the entire requirement or task history.

For incomplete work, name the blocker and next executable action. For successful work, link `.xsk/requirements/archive/<slug>.md`; ignored archive records are local, not automatically committed or recoverable from a fresh clone. Then stop, or return the result to an invoking workflow. Do not add a commit or next-action approval menu.

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

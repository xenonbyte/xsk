---
name: xsk-execute-plan
description: Execute a small plan or request as context-isolated subagent tasks sharing one writable workspace, tracked in a .xsk/runs/ ledger, with one confirmation gate, no per-task review, and unified acceptance. Explicit invocation only.
---

# xsk-execute-plan

Execute a small, decision-light plan or request through context-isolated subagent tasks that share the same writable workspace, so the main conversation keeps only compact results instead of file contents. A persistent run ledger under `.xsk/runs/` records every task and its acceptance state, so a mid-run context compression loses nothing that matters.

It fits tasks that are simple to decide but heavy to execute: the work reads and writes far more content than the task description itself (several files, several steps). It is the wrong tool for trivia: a one-file tweak or a single command is cheaper done inline, and dispatching a subagent for it costs more than it saves.

## When to use

This skill is explicitly invoked only: `/xsk-execute-plan`, a direct request such as "use xsk-execute-plan to run this", or the user's selection of the `xsk-execute-plan` next action offered by `xsk-think`. As a deliberate local rule that overrides the shared intent-matching convention below, it never self-triggers on execution intent, so it cannot collide with a harness's own plan or execution modes.

Selection from `xsk-think` is an explicit invocation of this skill, but invocation starts intake only. It never means immediate task dispatch and never bypasses this skill's task-breakdown and acceptance confirmation gate.

It accepts two kinds of input:

- a concrete execution plan, such as an approved `xsk-think` design
- a small plain-language request that needs no real design work first

## How it works

**1. Intake, ground lightly, and confirm dispatch capability.** Restate the goal in one sentence. A concrete plan (such as an approved `xsk-think` design) is taken as given; a small plain-language request gets a quick scan of the directly relevant code and config, not a full design pass. Derive the run slug from the goal line using the pattern `^[a-z0-9]+(-[a-z0-9]+)*$`.

Before offering any recovery choice and before opening a run ledger, verify that the current harness can dispatch at least one subagent that can write to the same workspace and return a compact result. If writable-workspace subagent dispatch is unavailable, stop before offering a recovery choice or writing a ledger. Recommend direct execution, or return to `xsk-think` to reduce, split, or revise the plan. Never silently degrade `xsk-execute-plan` into inline execution. This is a one-time capability check, not a precondition re-tested before each ledger line.

**2. Resolve prior state, then preflight the hard rules.** If `.xsk/runs/<slug>.md` already exists:

- With `status: running` or `status: failed`, ask the user once whether to resume or restart. Resume from the current worktree, never by rolling source files back: keep done tasks, and re-dispatch only the unfinished tasks whose state is pending or failed. A task left at `in-flight` was dispatched and never reported back, so its writes may be fully, partly, or not at all applied: never re-dispatch it blind. Inspect its allowed paths, report what is already there, and ask the user whether to re-dispatch it as the next attempt, accept the existing state and mark it done, or fail it. If all tasks are already done, resume at unified acceptance and reporting instead of dispatching them again.
- Restart also uses the current worktree as its baseline. It may overwrite the ledger after confirmation, but it never resets, reverts, or otherwise rolls back existing source changes.
- With `status: done`, recompute the acceptance fingerprint recorded in `## Result` first. While it still matches the worktree, offer either to reuse the recorded result without dispatch or to start a new run that overwrites the ledger after confirmation. When it does not match, or the ledger carries no fingerprint, say so and present the recorded result as history only: a result that no longer describes the worktree must never be reported as verified, so reuse is off the table and the only offers are a new run or re-running acceptance against the current state. A `done` run whose result was already reported and consumed may instead be retired by deleting its ledger: it is transient state whose stale claims only mislead once the worktree has moved on.

A resume reuses the execution envelope recorded in the ledger, including its pre-existing dirty-path baseline: the worktree now also holds this run's own writes, so recapturing that baseline would misread them as the user's work. Before dispatching anything, sort the current changes into three groups against the recorded fingerprints: a dirty path whose fingerprint still matches is untouched user work, a path recorded as a finished task's output belongs to this run, and anything else appeared during the interruption. Report that third group and treat it as the user's, never as this run's to overwrite. A resume does not re-run the confirmation gate. When the ledger carries no `## Execution Envelope` section, or its recorded envelope does not cover every unfinished task, rebuild and re-confirm the envelope through steps 3 and 4 before dispatching anything. A restart always rebuilds and re-confirms it.

The resume, restart, or reuse choice is exceptional recovery, not the normal confirmation gate. A prior `failed` run is never overwritten silently.

Scan `CLAUDE.md`, `AGENTS.md`, and any repo rules or config for constraints that would forbid or force a choice. Keep this brief: it is a check, not a study.

**3. Decompose and define the execution envelope.** Produce an ordered task list with at least one entry and record each task's dependencies and execution order. Define the acceptance criteria before anything executes. For every task, name its expected write paths, the tolerated side-effect paths that correct work legitimately touches (regenerated output, lockfiles, formatter fallout), and the project verification commands that cover it.

Capture the pre-existing dirty paths before dispatch, each with a content fingerprint (a hash of its current content, or an equivalent saved patch). They belong to the user, not to this run. A bare path list cannot show later whether those changes survived; a fingerprint can, so record one per path. If an expected write path overlaps a dirty path, preserve the change and call out the overlap explicitly in the confirmation envelope.

Mark every task that has a UI surface and record for it the reference (a design link or image), the target platform (Android, web, or desktop), and how to render and screenshot it. Also list any external, destructive, irreversible, remote, dependency-introducing, or platform-permission action that the plan may require. Write `none` when a category has no such action.

**4. One normal confirmation gate.** Show the user the complete execution envelope: the ordered tasks and dependency order, acceptance criteria, expected write paths, tolerated side-effect paths, verification commands, pre-existing dirty paths and overlaps, UI advisory, and flagged external or destructive actions. Get one explicit go-ahead. This is the only checkpoint on the normal path; a recovery choice in step 2 is exceptional. Even an approved `xsk-think` plan passes through this gate. Selecting `xsk-execute-plan` from `xsk-think` explicitly invokes this skill, but it does not approve this envelope or authorize immediate dispatch.

The workflow gate authorizes only the confirmed, local, reversible workspace changes. It never authorizes a new product decision, scope expansion, dependency introduction, external or remote mutation, destructive or irreversible action, or a platform permission prompt. If any of those is planned or appears during execution, stop before it and obtain focused user authorization. A newly discovered decision that changes implementation also returns to the user. These exceptional authorizations do not weaken the single normal workflow gate.

**5. Open the ledger, then dispatch context-isolated tasks.** Only after the normal gate passes, write the run ledger `.xsk/runs/<slug>.md` with `status: running`:

```markdown
---
status: running | done | failed
slug: <slug>
created_at: <ISO date>
source: plan | request
---

# <goal in one line>

## Execution Envelope
- Dependency order: <task order>
- Expected write paths: <paths by task>
- Tolerated side-effect paths: <paths or none>
- Verification commands: <commands>
- Pre-existing dirty paths: <path and content fingerprint per path, or none>
- UI advisory: <task details or none>
- External or destructive actions: <actions or none; separate authorization still required>

## Acceptance
- [ ] <criterion>

## Tasks
1. [pending|in-flight|done|failed] (attempt <n>) <full task description, self-contained enough to re-dispatch, with dependencies, allowed write paths, and acceptance items> - <compact result and actual touched paths>

## Result
(after all tasks: per-criterion pass/fail/skipped, verifier result, failures, actual touched paths, leftovers)
Acceptance fingerprint: <base commit, plus every changed path and its content hash at acceptance time>
```

`source: plan` means the input was a concrete plan; `source: request` means a small plain-language request, not a `.xsk/requirements/` document. Every `## Tasks` entry carries the full task description as confirmed at the gate; a one-line stub would make resuming meaningless once the session context is gone. Ensure `.xsk/.gitignore` contains the line `runs/` (create `.xsk/` and `.xsk/.gitignore` if absent; append the line only if it is missing; never overwrite an existing `.xsk/.gitignore`). The ledger is transient execution state, not a deliverable: never offer to commit it. Overwrite or remove an existing ledger only through the recovery choice in step 2, including the retirement of a reported `done` run offered there.

Subagents are isolated from the main conversation's context, not from one another's filesystem. They share the same writable workspace. Each task goes to one subagent with a self-contained prompt containing the applicable hard rules, the full task and acceptance items, its allowed and expected write paths, required dependency results, and an explicit prohibition on remote, external, destructive, or irreversible actions. Require the subagent to return a compact result, verification evidence, and its actual touched paths.

Order tasks by dependency. A task's write footprint is its expected write paths together with its tolerated side-effect paths: a shared lockfile or regenerated index counts even when the two tasks own different source files. Run tasks in parallel only when their footprints do not overlap and neither footprint creates ambiguity with a pre-existing dirty path; when in doubt, run them serially, since parallel subagents share the same files. The ledger is write-ahead: set a task's line to `in-flight` with its attempt number and write the ledger out before dispatching it, then update it to `done` or `failed` with its compact result as soon as the subagent returns. Recording state only after a task finishes would let an interruption between dispatch and result leave finished work looking like work that never started. Between tasks there is no review and no acceptance run: the main conversation records only each task's compact result and actual touched paths.

Compare every task's actual touched paths with its confirmed allowed paths. Never revert an unexpected path automatically. A path the confirmed envelope already lists as a tolerated side effect is recorded in the ledger and the run carries on. Any other unexpected path is scope drift: pause before dispatching that task's dependents, keep the worktree intact, report the path and what the task wrote there, and ask the user once whether to accept it into scope or fail the task. Accepting records the path in the envelope and continues; failing marks the task failed and stops its dependents. That question is an exception check against the confirmed envelope, not the per-task review this skill omits. When a task otherwise fails, stop its dependents, keep what finished, and report honestly. No pretended atomicity, no unbounded auto-fixing.

**6. Accept once, after all tasks.** Two tiers with different weight.

- Functional acceptance is a real signal. First dispatch a fresh verifier that did not implement any task. Give it the confirmed goal, acceptance criteria, execution envelope, pre-existing dirty-path baseline, actual touched paths, and actual diff. It checks the implementation against the goal and criteria, verifies scope and leftovers, and returns evidence without modifying files. Then run the project's own verification commands (tests, lint, build) and read the output. A verifier mismatch or command failure is reported as a functional failure and may set the ledger to `status: failed`. Permit at most one bounded fix attempt for unified functional acceptance, then repeat the fresh-verifier check and project commands once; never loop. Dispatch that fix as its own write-ahead ledger task under the full step 5 contract: allowed paths, the drift comparison, and the same prohibition on external, destructive, and irreversible actions. When the project has no runnable verification commands at all, record the command-backed acceptance criteria as `skipped` and state "functional acceptance not run" prominently in the report: `skipped` is non-failing but must never look like `pass`, the fresh verifier does not turn skipped command checks into passes, and a run with zero runnable gates must never look verified.
- UI fidelity acceptance is warning-level, never a gate. Run it only for tasks marked with a UI surface, and only when the environment can render the UI and capture a screenshot; otherwise record the affected acceptance criteria as `skipped` and use the single line "UI acceptance skipped: cannot render or screenshot here", which is not a failure, blocks nothing, and asks nothing of the user. When it runs: render, screenshot, compare against the design reference, and list concrete deviations (spacing, color, alignment, missing elements, overflow), delegating rendering, screenshots, and visual comparison to existing tools rather than building any. Dispatch a fix subagent scoped to exactly those deviations, re-render, and re-compare, at most 2 rounds by default (the user may set another bound at invocation). Every UI fix round is dispatched as its own write-ahead ledger task under the full step 5 contract too: allowed paths, the drift comparison, and the same authority prohibitions. Any deviation that survives the last round goes into the report as a warning for the user to weigh; it never fails the run and never gates anything. After the last UI fix round that changed files, rerun the project's relevant functional verification (tests, lint, build) before deriving final status and discard any earlier functional result. A revalidation failure is a functional acceptance failure and may set the ledger to `status: failed`.

After any UI fix that changed files, the functional revalidation includes a fresh verifier against the updated diff as well as the project's relevant commands. The final `done` or `failed` comes from the latest functional acceptance and task outcomes alone; fresh-verifier failure is part of functional acceptance, while UI residuals and `skipped` criteria never fail the run by themselves.

**7. Report and stop.** Fill `## Result`: each task's compact outcome and actual touched paths, the fresh verifier's conclusion, each acceptance criterion's `pass`, `fail`, or `skipped` status (with the reason when skipped), UI warnings if any, and whether functional acceptance ran. Include scope drift with how it was resolved, blocked dependents, and separately authorized actions when present. Record the acceptance fingerprint: the base commit plus every changed path and its content hash, so a later session can tell whether this result still describes the worktree. Set the final ledger status. Do not commit, push, or publish unless the user asks for it. Stop.

## Output

A per-task list of compact results and actual touched paths; the fresh verifier's conclusion; the acceptance report with each criterion's `pass`, `fail`, or `skipped` status (including a reason for `skipped`), scope drift and UI warnings if any, and whether functional acceptance ran; and the ledger path `.xsk/runs/<slug>.md` with its final `status` (`done` or `failed`).

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

---
name: xsk-execute-plan
description: Orchestrate a small plan or request as serial context-isolated subagent tasks in a clean Git worktree, tracked in a compact .xsk/runs/ ledger, with one confirmation gate and unified acceptance at the end. Explicit invocation only.
---

# xsk-execute-plan

Execute a small, decision-light plan or request as context-isolated subagent tasks, so the main conversation keeps compact results instead of file contents. A compact run ledger under `.xsk/runs/` records every task, so a mid-run context compression loses nothing that matters.

It is an orchestrator, not an audit system. Rather than proving after the fact what a subagent changed, it requires a workspace where that proof is unnecessary: a clean Git worktree, a `HEAD` that does not move, and an index nobody stages into. When those conditions do not hold it refuses and says how to reach them.

It fits work that is simple to decide but heavy to execute, reading and writing far more content than the task description itself. Anything small enough to inspect directly, including a one-file tweak or a single command, is cheaper done inline.

## When to use

This skill is explicitly invoked only: `/xsk-execute-plan`, a direct request such as "use xsk-execute-plan to run this", or the user's selection of the `xsk-execute-plan` next action offered by `xsk-think`. As a deliberate local rule that overrides the shared intent-matching convention below, it never self-triggers on execution intent, so it cannot collide with a harness's own plan or execution modes.

Selection from `xsk-think` is an explicit invocation of this skill, but invocation starts intake only. It never means immediate task dispatch and never bypasses this skill's task-breakdown and acceptance confirmation gate.

It accepts two kinds of input:

- a concrete execution plan, such as an approved `xsk-think` design
- a small plain-language request that needs no real design work first

## How it works

**1. Intake, eligibility, and hard stops.** Restate the goal in one sentence. An approved `xsk-think` design is taken as given; a plain-language request gets a quick scan of the relevant code and config, not a design pass. Derive the run slug from the goal line using the pattern `^[a-z0-9]+(-[a-z0-9]+)*$`.

If `.xsk/runs/<slug>.md` already exists, go straight to step 6: recovery has its own entry conditions, and a resumed run expects to find the worktree holding its own earlier writes.

For a fresh run, require all of this before writing anything:

- The harness can dispatch a subagent that writes to this workspace and returns a compact result.
- `git rev-parse --is-inside-work-tree` and `git rev-parse --verify HEAD` both succeed. A non-Git directory and an unborn repository are unsupported; never invent a base commit.
- `git diff --cached --quiet` succeeds, so nothing is staged.
- `git status --porcelain=v1 --untracked-files=all` is empty. With no content baseline this skill could never show that a pending edit survived, so a task could overwrite one and still pass every check.
- The work needs no parallel writers, no `commit`, `branch`, `stash`, `reset`, `merge`, or `rebase`, no remote or external mutation, no destructive or irreversible action, no platform permission prompt, and no new product decision.
- No deliverable and no user data needing protection lives on a Git-ignored path, which is outside everything this skill checks.

Refuse with the remedy, not a bare stop: commit or stash the pending changes, run it directly, or move to a fuller workflow. Never silently degrade into inline execution.

The last two conditions hold all run: if a forbidden action or an ignored-path deliverable turns up once tasks are under way, set the run to `interrupted` and hand back, since this run never authorizes them. The clean-worktree and unstaged-index conditions are admission only, because a task is expected to change files inside its allowed paths; treating that as a broken precondition would abort every run after its first task.

Scan `CLAUDE.md`, `AGENTS.md`, and repo rules for constraints that forbid or force a choice. Keep it brief: a check, not a study.

**2. Build the execution envelope.** Record the ordered tasks with dependencies and full descriptions, the run-wide allowed Git-visible paths, the acceptance criteria, the verification commands, every task with a UI surface plus its reference, target platform, and how to render and screenshot it, and any approved local reversible action.

Decide here whether `.xsk/.gitignore` needs the line `runs/`; if so, declare it as an orchestration-owned path, since a path this skill writes without confirming would later read as scope drift against itself.

**3. One confirmation gate.** Show the whole envelope and get one explicit go-ahead. Ask at the same time for the one condition no command can check: that nobody, the user included, writes to this worktree while the run proceeds. Record it as a declaration and never report it as verified; the per-task checks in step 4 are what catch a violation afterwards. This is the only checkpoint on the normal path; step 6 recovery is exceptional. An approved `xsk-think` plan passes through it too: what is confirmed is the task breakdown, which the user has not seen.

**4. Open the ledger, then run tasks serially.** Only after the gate passes, write `.xsk/runs/<slug>.md`:

```markdown
---
status: running | done | failed | interrupted
slug: <slug>
base: <full HEAD object ID>
created_at: <ISO date>
source: plan | request
---

# <goal in one line>

## Envelope
- Allowed paths: <run-wide Git-visible paths>
- Orchestration-owned paths: <.xsk/.gitignore when this run must write it, or none>
- Verification commands: <commands>
- UI advisory: <task details or none>
- Exclusive worktree: declared by user, not verified

## Acceptance
- [ ] <criterion>

## Tasks
1. [pending|in-flight|done|failed] <full task description with dependencies and acceptance items> - <compact result; subagent self-reported paths; observed Git-visible changes>
```

Write the `.xsk/.gitignore` change declared at the gate, if any (create `.xsk/` and `.xsk/.gitignore` if absent; append only the missing `runs/` line; never overwrite an existing one). The ledger is a recovery log, not tamper-evident evidence and not a deliverable: never offer to commit it, and change it only here or in step 6.

Subagents are isolated from the main conversation's context, not from one another's filesystem, so run one task at a time in dependency order. Each goes to one subagent with a self-contained prompt carrying the applicable hard rules, the full task and its acceptance items, its allowed paths, the results it depends on, and the step 1 prohibitions. Require a compact result and the paths it believes it wrote.

Per task, check twice: before writing `in-flight`, and again when the subagent returns. Both times confirm that `HEAD` still equals `base`, that nothing is staged, and that the changed paths stay inside the allowed and orchestration-owned sets. The pre-dispatch check matters most before the first task, since the gate may have been confirmed long before it. Then record two separately sourced facts, never merged into one claim: the paths the subagent reported, and the Git-visible changes now observable. Write `done` or `failed`.

A failed check stops the run before the next task. A moved `HEAD`, a staged index, or a change outside the allowed paths means the workspace left the conditions this run was confirmed under: report what was observed, keep the worktree as it is, never revert or restore anything, and ask how to proceed. A task that ends `failed` sets `status: failed` and blocks its dependents: leave those `pending`, go to step 7, and report which were blocked. That ledger is then history, so redoing the work means a fresh run. Between tasks there is no code review and no acceptance run.

**5. Accept once, after all tasks.** Two tiers with different weight.

- Functional acceptance is a real signal. Run the project's verification commands serially and read the output. Re-check afterwards that they moved neither `HEAD` nor the index and wrote nothing outside the allowed and orchestration-owned paths; a command that did is reported, not absorbed. Then dispatch a fresh reviewer that implemented no task and modifies no files, for a second opinion on whether the change does what was asked. Give it the goal, the acceptance criteria, the command results, the diff against `base`, and the full observed path list, and tell it to read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; deletions and type changes are already in that diff. Re-check `HEAD`, the index, and the allowed and orchestration-owned scope after it returns. A reviewer objection or a command failure is a functional failure. Allow at most one bounded fix as an ordinary serial task, then rerun the commands and the reviewer once; never loop. With no runnable verification at all, record the command-backed criteria as `skipped` and state "functional acceptance not run" prominently: `skipped` is non-failing but must never look like `pass`, and a run with zero gates must never look verified.
- UI fidelity acceptance is warning-level, never a gate. Run it only for tasks marked with a UI surface, and only when the environment can render and screenshot; otherwise record those criteria `skipped` with the single line "UI acceptance skipped: cannot render or screenshot here", which fails nothing and asks nothing. When it runs: render, screenshot, compare against the reference, and list concrete deviations (spacing, color, alignment, missing elements, overflow), using existing tools, not building any. Each fix round is an ordinary serial task under step 4, at most 2 rounds by default. Any surviving deviation is a warning for the user to weigh. After the last round that changed files, rerun the commands and the reviewer and discard the earlier functional result.

The final `done` or `failed` comes from the latest functional acceptance and the task outcomes alone; UI residuals and `skipped` criteria never fail a run by themselves.

**6. Recovery, when a ledger for this slug already exists.** Route on status first. A `done` or `failed` ledger is history: read or retire it, never skip execution or acceptance on its word, and redo the work as a fresh run. An `interrupted` ledger stops here too, on the terms below. Only a `running` ledger, left by a session that ended mid-run, is resumable.

Resume only at a task boundary, and only while `HEAD` equals `base`, nothing is staged, and the changed paths sit within the allowed and orchestration-owned sets. Show the recorded goal and task list and have the user confirm both that it is the same work and that the workspace is what they expect; a matching slug is not proof of a matching request.

A task left at `in-flight` was dispatched and never reported back, so its writes may be complete, partial, or absent. Never re-dispatch it and never infer what it did: set the run to `interrupted` and stop. From `interrupted` the only routes are the user resolving the workspace by hand and then starting a fresh run that overwrites the ledger after confirmation, or retiring the ledger outright.

Otherwise dispatch only the pending tasks whose dependencies are all `done`, leaving anything downstream of a `failed` task blocked, and always re-run full acceptance: a partial run's earlier result proves nothing about the finished one.

**7. Report and stop.** Report each task's compact result, its self-reported paths, the final observed Git-visible changes, each command and its exit result, the reviewer's conclusion, and each criterion as `pass`, `fail`, or `skipped` with a reason when skipped. Whenever the run touched anything, include this line verbatim: "Ignored paths were not scanned: side effects there are outside this report." Add UI warnings if any, the ledger path, and final status. Do not commit, push, or publish unless the user asks. Stop.

## Output

A per-task list of compact results, each with the paths the subagent reported and the Git-visible changes observed afterwards, kept as separate facts; each verification command and its exit result; the fresh reviewer's conclusion; the acceptance report with every criterion as `pass`, `fail`, or `skipped` (with the reason when skipped), UI warnings if any, and whether functional acceptance ran; the ignored-paths boundary line; and the ledger path `.xsk/runs/<slug>.md` with its final `status` (`done`, `failed`, or `interrupted`).

<SHARED_MASKED>

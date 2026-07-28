---
name: xsk-execute-plan
description: Orchestrate a small plan or request as serial context-isolated subagent tasks in a clean Git worktree, tracked in a compact .xsk/runs/ ledger, with one confirmation gate and unified acceptance at the end. Explicit invocation only.
---

# xsk-execute-plan

Execute a small, decision-light plan or request as context-isolated subagent tasks, so the main conversation keeps compact results instead of file contents. A compact run ledger under `.xsk/runs/` records every task, so a mid-run context compression loses nothing that matters.

It is an orchestrator, not an audit system. Rather than proving after the fact what a subagent changed, it requires a workspace where that proof is unnecessary: a clean Git worktree, a `HEAD` that does not move, and an index nobody stages into. When those conditions do not hold it refuses and says how to reach them.

It fits work that is simple to decide but heavy to execute, reading and writing far more content than the task description itself. Anything small enough to inspect directly, a one-file tweak or a single command, is cheaper done inline.

## When to use

This skill is explicitly invoked only: `/xsk-execute-plan`, a direct request such as "use xsk-execute-plan to run this", or the user's selection of the `xsk-execute-plan` next action offered by `xsk-think`. As a deliberate local rule that overrides the shared intent-matching convention below, it never self-triggers on execution intent, so it cannot collide with a harness's own plan or execution modes.

Selection from `xsk-think` is an explicit invocation of this skill, but invocation starts intake only. It never means immediate task dispatch and never bypasses this skill's task-breakdown and acceptance confirmation gate.

It accepts two kinds of input:

- a concrete execution plan, such as an approved `xsk-think` design
- a small plain-language request that needs no real design work first

## How it works

**1. Intake, eligibility, and hard stops.** Restate the goal in one sentence. An approved `xsk-think` design is taken as given; a plain-language request gets a quick scan of the relevant code and config. Derive the run slug from the goal line using the pattern `^[a-z0-9]+(-[a-z0-9]+)*$`.

If `.xsk/runs/<slug>.md` already exists, go straight to step 6: recovery has its own entry conditions, and a resumed run expects to find the worktree holding its own earlier writes.

For a fresh run, require all of this before writing anything:

- The harness can dispatch a subagent that writes to this workspace and returns a compact result.
- `git rev-parse --is-inside-work-tree` and `git rev-parse --verify HEAD` both succeed. A non-Git directory and an unborn repository are unsupported; never invent a base.
- `git diff --cached --quiet` succeeds, so nothing is staged.
- `git status --porcelain=v1 --untracked-files=all` is empty. With no content baseline this skill could never show that a pending edit survived, so a task could overwrite one and still pass every check.
- The work needs no parallel writers, no `commit`, `branch`, `stash`, `reset`, `merge`, or `rebase`, no remote or external mutation, no destructive or irreversible action, no platform permission prompt, and no new product decision.
- No deliverable and no user data needing protection lives on a Git-ignored path, which is outside everything this skill checks.

Refuse with the remedy, not a bare stop: commit or stash the pending changes, run it directly, or move to a fuller workflow. Never silently degrade into inline execution.

Only whole-worktree cleanliness is admission-only: a task is expected to change files inside its allowed paths, and treating that as a broken precondition would abort every run after its first task. The rest are run-wide invariants: `HEAD` equal to `base`, an empty index, changes confined to the allowed and orchestration-owned paths, no forbidden action, no ignored-path deliverable. Any of them breaking at any point sets `status: interrupted` and stops the run.

Scan `CLAUDE.md`, `AGENTS.md`, and repo rules for constraints that forbid or force a choice. Keep it brief: a check, not a study.

**2. Build the execution envelope.** Record the ordered tasks with dependencies and full descriptions, the run-wide allowed Git-visible paths, the acceptance criteria, the verification commands, and any approved local reversible action.

Decide here whether `.xsk/.gitignore` needs the line `runs/`; if so, declare it as an orchestration-owned path, since a path this skill writes without confirming would later read as scope drift against itself.

**3. One confirmation gate.** Show the whole envelope and get one explicit go-ahead. Ask at the same time for the one condition no command can check: that nobody, the user included, writes to this worktree while the run proceeds. Record it as a declaration and never report it as verified; step 4 checks catch a violation afterwards. It is the only checkpoint on the normal path; step 6 recovery is exceptional. An approved `xsk-think` plan passes through it too: the task breakdown is what the user has not seen.

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
- Exclusive worktree: declared by user, not verified

## Acceptance
- [ ] <criterion>

## Tasks
1. [pending|in-flight|done|failed] <full task description with dependencies and acceptance items> - <compact result; subagent self-reported paths; observed Git-visible changes>
```

Write the `.xsk/.gitignore` change declared at the gate, if any (create `.xsk/` and `.xsk/.gitignore` if absent; append only the missing `runs/` line; never overwrite an existing one). The ledger is a recovery log, not tamper-evident evidence and not a deliverable: never offer to commit it. Write it here, for step 5's bounded fix, at step 7's terminal write, and in step 6, nowhere else.

Subagents are isolated from the main conversation's context, not from one another's filesystem, so run one task at a time in dependency order. Each goes to one subagent with a self-contained prompt carrying the applicable hard rules, the full task and its acceptance items, its allowed paths, the results it depends on, and the step 1 prohibitions. Require a compact result and the paths it believes it wrote. Require nothing else back: no diff, no file contents, no task restatement. For each task-acceptance check, report its final run after the task's last write and exit result, or `not run` and why. In a valid result, an omitted check becomes `not run: not reported`; any failed final check or missing or malformed task result makes the task `failed`. Otherwise write `done` and keep the check evidence for step 7.

Per task, check the run-wide invariants twice: before writing `in-flight`, and again when the subagent returns. The pre-dispatch check matters most before the first task, since the gate may have been confirmed long before it. Then record two separately sourced facts, never merged into one claim: the paths the subagent reported, and the Git-visible changes now observable. Write `done` or `failed`.

A broken invariant means the workspace left the conditions this run was confirmed under: write `status: interrupted`, report what was observed, keep the worktree as it is, never revert or restore anything, and stop. No later step may reach `done` past one. A task that ends `failed` sets `status: failed` and blocks its dependents: leave those `pending`, go to step 7, and report which were blocked. That ledger is then history, so redoing the work means a fresh run. Between tasks there is no code review and no acceptance run.

**5. Accept once, after all tasks.** Functional acceptance is the only tier, and a real signal. Run the project's verification commands serially and read the output, then re-check the invariants; a command that broke one is reported, not absorbed. Then dispatch a fresh reviewer that implemented no task and modifies no files, for a second opinion on whether the change does what was asked. Give it the goal, the criteria, the command results, `base`, and the full observed path list, telling it to diff against `base` itself and read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; relaying the tracked diff or untracked file contents through this conversation would pull in the material this skill exists to keep out. Re-check the invariants again when it returns. Require exactly `no concerns` when clean; otherwise one line per concern, each naming what is wrong and identifying one or more affected paths or an acceptance criterion, without quoting file contents. Empty or malformed review makes acceptance `failed`; dispatch no fix. A valid concern or command failure is a functional failure. Allow at most one bounded fix only inside the confirmed envelope; otherwise set the run to `failed` without dispatch. Append it to the ledger as the run's one fix, an ordinary serial task under every step 4 rule. Give it the concern lines and each failing command with its exit result, but no command output; it re-reads code and reruns them for diagnostics. A failed fix goes to step 7. Only a `done` fix reruns all commands and the reviewer once; never loop. With no runnable verification, record the command-backed criteria as `skipped` and state "functional acceptance not run" prominently: `skipped` is non-failing but must never look like `pass`, and a run with zero gates must never look verified.

The final `done` or `failed` comes from the latest functional acceptance and the task outcomes alone; `skipped` criteria never fail a run by themselves.

**6. Recovery, when a ledger for this slug already exists.** Route on status first. A `done`, `failed`, or `interrupted` ledger is history: read it, or retire it and start over. Starting over means retiring the ledger and re-entering step 1 for full admission and a fresh gate, never a shortcut from here, since an interrupted run can leave writes that a skipped admission would let the new run overwrite. Only a `running` ledger, left by a session that ended mid-run, is resumable.

Resume only at a task boundary, and only while the invariants hold. Show the recorded goal and task list and have the user confirm both that it is the same work and that the workspace is what they expect; a matching slug is not proof of a matching request.

A task left at `in-flight` was dispatched and never reported back, so its writes may be complete, partial, or absent. Never re-dispatch it and never infer what it did: set the run to `interrupted` and stop, which routes it to the history rule above.

Otherwise dispatch only the pending tasks whose dependencies are all `done`, leaving anything downstream of a `failed` task blocked, and always re-run full acceptance: a partial run's earlier result proves nothing about the finished one.

**7. Terminal write, then report and stop.** First write the acceptance results and the final `status` into the ledger. A run whose status is still `running` on disk is indistinguishable from one that died mid-flight, so never report a terminal outcome before that write lands; if it fails, say so and report the run as unfinished. Then give each task's compact result and self-reported paths, the final observed Git-visible changes, each command and its exit result, the reviewer's conclusion, and each criterion as `pass`, `fail`, or `skipped` with a reason when skipped. Whenever the run touched anything, include this line verbatim: "Ignored paths were not scanned: side effects there are outside this report." Add the ledger path and final status. Do not commit, push, or publish unless the user asks. Stop.

## Output

A per-task list of compact results, each with the paths the subagent reported and the Git-visible changes observed afterwards, kept as separate facts; each verification command and its exit result; the fresh reviewer's conclusion; every acceptance criterion as `pass`, `fail`, or `skipped` (with the reason when skipped), and whether functional acceptance ran; the ignored-paths boundary line; and the ledger path `.xsk/runs/<slug>.md` with the `status` written there (`done`, `failed`, or `interrupted`).

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

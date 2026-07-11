**1. Intake and ground lightly.** Restate the goal in one sentence. A concrete plan (such as an approved `xsk-think` design) is taken as given; a small plain-language request gets a quick scan of the directly relevant code and config, not a full design pass. Derive the run slug from the goal line using the pattern `^[a-z0-9]+(-[a-z0-9]+)*$`. If `.xsk/runs/<slug>.md` already exists with `status: running` and pending or failed tasks, ask the user once whether to resume (re-dispatch only the unfinished tasks, skipping the done ones) or start over (overwrite the ledger). A leftover ledger whose status is `done` or `failed` is overwritten silently; only `running` triggers the question.

**2. Preflight the hard rules.** Scan `CLAUDE.md`, `AGENTS.md`, and any repo rules or config for constraints that would forbid or force a choice. Keep this brief: it is a check, not a study.

**3. Decompose and define acceptance.** Produce an ordered task list with at least one entry; a trivial run is simply a one-line list. Define the acceptance criteria before anything executes. Mark every task that has a UI surface and record for it the reference (a design link or image), the target platform (Android, web, or desktop), and how to render and screenshot it.

**4. One confirmation gate.** Show the user the task list and the acceptance criteria, and get a single go-ahead. This is the only checkpoint on the normal path; the resume question in step 1 is exceptional recovery, not a second gate. Even an already-approved `xsk-think` plan passes through it, because what is being confirmed is the task breakdown, which the user has not seen yet.

**5. Open the ledger, then dispatch.** Only after the gate passes, write the run ledger `.xsk/runs/<slug>.md` with `status: running`:

```markdown
---
status: running | done | failed
slug: <slug>
created_at: <ISO date>
source: plan | request
---

# <goal in one line>

## Acceptance
- [ ] <criterion>

## Tasks
1. [pending|done|failed] <full task description, self-contained enough to re-dispatch, with its acceptance items> - <compact result>

## Result
(after all tasks: per-criterion pass/fail/skipped, failures, leftovers)
```

`source: plan` means the input was a concrete plan; `source: request` means a small plain-language request, not a `.xsk/requirements/` document. Every `## Tasks` entry carries the full task description as confirmed at the gate; a one-line stub would make resuming meaningless once the session context is gone. Ensure `.xsk/.gitignore` contains the line `runs/` (create `.xsk/` and `.xsk/.gitignore` if absent; append the line only if it is missing; never overwrite an existing `.xsk/.gitignore`). The ledger is transient execution state, not a deliverable: never offer to commit it, and stale ledgers may be deleted freely.

Then dispatch. Each task goes to one subagent with a self-contained prompt holding its slice of the plan and its acceptance items, because a subagent sees none of the main conversation. Order tasks by dependency. Run tasks in parallel only when their expected file sets do not overlap; when in doubt, run them serially, since parallel subagents editing the same file overwrite each other. Between tasks there is no review and no acceptance run: the main conversation records only each task's compact result, and updates the task's ledger line as soon as it finishes. When a task fails, stop its dependents, keep what finished, and report honestly. No pretended atomicity, no unbounded auto-fixing.

**6. Accept once, after all tasks.** Two tiers with different weight.

- Functional acceptance is a real signal. Run the project's own verification (tests, lint, build) and read the output. A failure is reported as a failure and may set the ledger to `status: failed`, with at most one bounded fix attempt, never a loop. When the project has no runnable verification at all, record the affected acceptance criteria as `skipped` and state "functional acceptance not run" prominently in the report: `skipped` is non-failing but must never look like `pass`, and a run with zero gates must never look verified.
- UI fidelity acceptance is warning-level, never a gate. Run it only for tasks marked with a UI surface, and only when the environment can render the UI and capture a screenshot; otherwise record the affected acceptance criteria as `skipped` and use the single line "UI acceptance skipped: cannot render or screenshot here", which is not a failure, blocks nothing, and asks nothing of the user. When it runs: render, screenshot, compare against the design reference, and list concrete deviations (spacing, color, alignment, missing elements, overflow), delegating rendering, screenshots, and visual comparison to existing tools rather than building any. Dispatch a fix subagent scoped to exactly those deviations, re-render, and re-compare, at most 2 rounds by default (the user may set another bound at invocation). Fix subagents follow the same file-set rule as step 5. Record each round in the ledger. Any deviation that survives the last round goes into the report as a warning for the user to weigh; it never fails the run and never gates anything. After the last UI fix round that changed files, rerun the project's relevant functional verification (tests, lint, build) before deriving final status and discard any earlier functional result. A revalidation failure is a functional acceptance failure and may set the ledger to `status: failed`.

The final `done` or `failed` comes from the latest functional acceptance and task outcomes alone; UI residuals and `skipped` criteria never fail the run by themselves.

**7. Report and stop.** Fill `## Result`: each task's compact outcome, each acceptance criterion's `pass`, `fail`, or `skipped` status (with the reason when skipped), UI warnings if any, and whether functional acceptance ran. Set the final ledger status. Do not commit, push, or publish unless the user asks for it. Stop.

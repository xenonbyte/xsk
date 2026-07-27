Execute a small, decision-light plan or request as context-isolated subagent tasks, so the main conversation keeps compact results instead of file contents. A compact run ledger under `.xsk/runs/` records every task, so a mid-run context compression loses nothing that matters.

It is an orchestrator, not an audit system. Rather than proving after the fact what a subagent changed, it requires a workspace where that proof is unnecessary: a clean Git worktree, a `HEAD` that does not move, and an index nobody stages into. When those conditions do not hold it refuses and says how to reach them.

It fits work that is simple to decide but heavy to execute, reading and writing far more content than the task description itself. Anything small enough to inspect directly, a one-file tweak or a single command, is cheaper done inline.

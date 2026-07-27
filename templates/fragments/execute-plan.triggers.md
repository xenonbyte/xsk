This skill is explicitly invoked only: `/xsk-execute-plan`, a direct request such as "use xsk-execute-plan to run this", or the user's selection of the `xsk-execute-plan` next action offered by `xsk-think`. As a deliberate local rule that overrides the shared intent-matching convention below, it never self-triggers on execution intent, so it cannot collide with a harness's own plan or execution modes.

Selection from `xsk-think` is an explicit invocation of this skill, but invocation starts intake only. It never means immediate task dispatch and never bypasses this skill's task-breakdown and acceptance confirmation gate.

It accepts two kinds of input:

- a concrete execution plan, such as an approved `xsk-think` design
- a small plain-language request that needs no real design work first

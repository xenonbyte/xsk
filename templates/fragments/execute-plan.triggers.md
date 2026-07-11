This skill is explicitly invoked only: `/xsk-execute-plan`, or a direct request such as "use xsk-execute-plan to run this". As a deliberate local rule that overrides the shared intent-matching convention below, it never self-triggers on execution intent, so it cannot collide with a harness's own plan or execution modes.

It accepts two kinds of input:

- a concrete execution plan, such as an approved `xsk-think` design
- a small plain-language request that needs no real design work first

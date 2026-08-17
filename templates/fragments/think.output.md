A **Proposed Design Summary** with these parts:

- The recommended approach, with rationale.
- The premise-collapse assumption, if there is one.
- The concrete steps, structured so an executor can act without re-deciding (the handoff is execution-shaped, not exploration-shaped).
- A short **Gotchas** table of the traps to avoid.
- **Open Questions**, if any, that only the user can resolve.

Then stop. What you are waiting for follows the routing below: answers to Open Questions, nothing at all after a pure judgment, or a next-action selection. Do not begin implementation.

Apply the outcome routing:

- With unresolved **Open Questions**, ask them and stop. Do not show execution choices.
- For a pure judgment with no implementation, stop after the summary. Do not show execution choices.
- For a decision-complete plan with no Open Questions that fits direct execution, add **Next Action** with two choices: direct execution, or revise the design. Mark one as recommended and state why.
- For large, high-risk, cross-session, or full-specification work, replace the direct-execution choice with a route to `xsk-write-req` or the repository's fuller workflow, plus an option to revise or pause.

Offer choices only. Never invoke another skill automatically, and never begin implementing on the strength of a recommendation the user has not picked.

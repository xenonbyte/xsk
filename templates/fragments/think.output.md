A **Proposed Design Summary** with these parts:

- The recommended approach, with rationale.
- The premise-collapse assumption, if there is one.
- The concrete steps, structured so an executor can act without re-deciding (the handoff is execution-shaped, not exploration-shaped).
- A short **Gotchas** table of the traps to avoid.
- **Open Questions**, if any, that only the user can resolve.

Then stop and wait for approval. Do not begin implementation.

If the plan is executable (not a pure judgment) and no Open Questions remain, offer to run it with `xsk-execute-plan`. Offer only; never invoke it automatically.

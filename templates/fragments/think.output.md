A **Proposed Design Summary**, sized to the task. A lightweight plan uses the single paragraph described above, not a mandatory full template. Expand only when the work needs:

- The recommended approach, with rationale.
- The premise-collapse assumption, if there is one.
- The intended behavior, scope boundaries, affected files or interfaces, concrete steps, and verification commands or observable acceptance checks.
- A short **Gotchas** table when there are material traps worth comparing; omit empty or generic risk sections.
- **Open Questions**, if any, that only the user can resolve.

Choose one ending:

- With unresolved **Open Questions**, ask only the blocking questions and stop. Do not show execution choices.
- For a pure judgment such as "no change is needed", report the judgment and rationale, then stop. Do not show execution choices or invent implementation steps.
- For ready work, add **Next Action** with exactly two numbered choices in the user's language: direct execution, or revise the design. Name the actual changes and verification in the execution choice, mark one choice as recommended, and give one sentence explaining why it fits this work.
- For complete complex work needing a durable requirement, the execution choice uses `xsk-execute-req`: save or reuse the requirement, implement, verify, and automatically archive on success. For documentation-only intent, replace execution with `xsk-write-req` to save the specification. Keep the second choice as revise the design; do not force both writer and executor into the menu.

For example, a ready copy change can end with "1. Update both CLI help messages and verify their output (recommended). 2. Revise the wording or scope." Use the current plan's concrete actions, not this example's content. Accept the option number or an unambiguous natural-language selection.

Offer choices only, then stop and wait for approval or an explicit next-action selection. Never invoke another skill automatically, and never begin implementing on the strength of a recommendation the user has not picked. A pure judgment needs no approval; Open Questions wait for answers instead of an execution selection.

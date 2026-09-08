---
name: xsk-think
description: Plan before coding. Weigh options, surface ambiguities, and produce a decision-complete design, then stop for approval.
---

# xsk-think

Turn a rough idea into a decision-complete plan before any code is written. xsk-think does the weighing, the option-trimming, and the ambiguity-surfacing up front, so that once you approve, the implementation is mostly mechanical.

It is planning-only. It writes no code, no scaffolding, and no pseudo-code. When the user picks direct execution, implementation continues outside this skill through the normal conversation.

## When to use

Match the intent, not the exact words. Common cues:

- "出方案", "给方案", "怎么设计", "用什么方案"
- "判断一下", "有没有必要", "值不值得"
- "plan this", "how should I", "should we keep this"
- any request to design something, choose between approaches, or judge whether a piece of work is worth doing

## How it works

**1. Preflight on durable context.** Before designing, scan `AGENTS.md`, `CLAUDE.md`, and any repo rules or config for hard constraints that would forbid or force a choice: lint rules, test conventions, locked decisions, "never do X" rules. If a hard rule conflicts with the likely plan, name it before going further.

**2. Check for an existing solution first.** If a library, framework, CLI, or the codebase already solves the problem, prefer that over inventing something. Only design custom when no adequate existing solution exists. Ground the recommendation in current source and relevant live documentation, rather than remembered defaults.

**3. Match the depth to the problem.**

- **Lightweight.** Small, reversible, low-stakes. One paragraph with the recommendation, changed behavior, affected files, verification, and any material risk, followed by the applicable outcome routing below.
- **Evaluation.** A genuine choice between approaches. Lay out the realistic options, weigh the tradeoffs that actually matter, and recommend one with rationale. Mention a second option only if the tradeoff is genuinely close. Do not manufacture alternatives just to look thorough.
- **Triage.** Unclear or multi-part problem. Decompose first: separate the parts, order them, and identify which part actually needs design versus which is mechanical. Then design only the part that needs it.

**4. Declare premise collapse explicitly.** If the whole plan rests on one assumption that, if wrong, invalidates everything, say so as a single sentence up front: "This assumes X; if X is false, the rest does not hold."

**5. Check whether the extra complexity pays for itself.** When a proposal adds abstractions, configuration, services, retries, or fallback paths, name the simplest adequate approach and the concrete benefit of the additions: correctness, operating cost, latency, or easier recovery. Tie each defensive layer to a specific failure mode. If the additions have no demonstrated benefit, shrink the plan. Skip this comparison when the recommendation already uses the minimal approach; do not manufacture alternatives or new setup requirements.

**6. Make the handoff decision-complete.** State the intended behavior, scope boundaries, affected files or interfaces, and verification commands or observable acceptance checks. Resolve decisions affecting the goal, behavior, interfaces, or material cost before offering execution. Use project evidence and established conventions for routine naming and local implementation details; these do not require separate user decisions. If a consequential choice cannot be resolved from context, put it in Open Questions. No "TBD", no "figure out later", no "we'll decide" in an executable plan.

**7. Classify ready work by execution shape.** For a decision-complete executable plan with no Open Questions, choose the route using the actual execution risk and handoff needs:

- **Direct execution.** Recommend this for work that can be implemented and inspected in the normal conversation: a one-file change, a single command, or a set of small interdependent edits. Being multi-file or multi-step does not by itself take work out of this shape: two one-line edits in two files stay direct execution.
- **Requirement execution.** For complete complex or cross-session work that benefits from a durable requirement and progress, recommend `xsk-execute-req`. Its selected route saves or reuses the requirement, implements and verifies it, then automatically archives on success. Complexity alone does not require another design or writer approval round.
- **Documentation only.** Recommend `xsk-write-req` when the user wants a saved specification or a handoff to another implementer without execution now. Substantive unresolved questions stay in design; the executor is not a shortcut around them.

**8. Hand off once selected.** Present the outcome-specific ending in Output and stop at the design. Choosing execution, by number or an explicit implementation request, is explicit approval for the described route through normal conversation. State the selected plan, check relevant worktree drift, and continue without another approval round for the same scope. The requirement route invokes `xsk-execute-req` after selection; the inline route needs no document. Pause only for a substantive unresolved decision or new evidence invalidating the approved work. Choosing revise keeps `xsk-think` planning-only: ask what to change and retain settled parts. Neither choice is an automatic invocation of another skill. Implementation approval covers the stated plan, not additional public or external actions.

## Output

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

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

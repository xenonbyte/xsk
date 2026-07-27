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

**2. Check for an existing solution first.** If a library, framework, CLI, or the codebase already solves the problem, prefer that over inventing something. Only design custom when no adequate existing solution exists.

**3. Match the depth to the problem.**

- **Lightweight.** Small, reversible, low-stakes. One paragraph, one recommendation, done.
- **Evaluation.** A genuine choice between approaches. Lay out the realistic options, weigh the tradeoffs that actually matter, and recommend one with rationale. Mention a second option only if the tradeoff is genuinely close. Do not manufacture alternatives just to look thorough.
- **Triage.** Unclear or multi-part problem. Decompose first: separate the parts, order them, and identify which part actually needs design versus which is mechanical. Then design only the part that needs it.

**4. Declare premise collapse explicitly.** If the whole plan rests on one assumption that, if wrong, invalidates everything, say so as a single sentence up front: "This assumes X; if X is false, the rest does not hold."

**5. No placeholders in an approved plan.** A plan is not done until every decision is concrete. No "TBD", no "figure out later", no "we'll decide". If a decision is genuinely open, it goes into Open Questions for the user to resolve, not into the plan body.

**6. Classify the outcome before offering a handoff.**

- If any Open Questions remain, ask only those questions and continue the design after the user answers. Do not show execution choices yet.
- If the result is a pure judgment such as "not worth doing", "keep things as they are", or "no change is needed", report that judgment and stop. Do not show execution choices.
- If the result is a decision-complete executable plan with no Open Questions, classify its execution shape before recommending a next action.

**7. Route ready work by execution shape.**

- **Direct execution.** Recommend this for a one-file change, a single command, or other low-context work where delegation would add more ceremony than it removes.
- **`xsk-execute-plan`.** Recommend this only for decision-light work whose execution is context-heavy enough that context-isolated subagents and a run ledger would help. Being multi-file or multi-step is a signal of that, never a substitute for it: two one-line edits in two files stay direct execution.
- **Fuller workflow.** For large, high-risk, cross-session work, or work that still needs a durable full specification, route to `xsk-write-req` or the repository's fuller workflow. Do not recommend the lightweight executor.

For the first two shapes, present all three user choices: direct execution, `xsk-execute-plan`, or revise the design and remain planning-only. Label one choice as recommended and give one sentence tied to the execution shape. Choosing `xsk-execute-plan` counts as an explicit invocation of that skill, but it does not skip that skill's task-breakdown and acceptance confirmation gate. The choice is never an automatic invocation.

**8. Stop at the design.** Output the plan and routing, then stop and wait for approval or an explicit next-action selection. Do not write code. Choosing direct execution is explicit approval to implement through the normal conversation. Choosing revise keeps `xsk-think` planning-only and asks the user what to change; it is not a recursive skill invocation.

## Output

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
- For a decision-complete plan with no Open Questions that fits direct or delegated execution, add **Next Action** with three choices: direct execution, `xsk-execute-plan`, or revise the design. Mark one as recommended and state why.
- For large, high-risk, cross-session, or full-specification work, replace the lightweight execution choices with a route to `xsk-write-req` or the repository's fuller workflow, plus an option to revise or pause. Do not offer `xsk-execute-plan`.

Selecting `xsk-execute-plan` is an explicit invocation, not immediate dispatch: that skill must still present and confirm its task breakdown and acceptance envelope. Offer choices only; never invoke an executor automatically.

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

---
name: xsk-think
description: Plan before coding. Weigh options, surface ambiguities, and produce a decision-complete design, then stop for approval.
---

# xsk-think

Turn a rough idea into a decision-complete plan before any code is written. xsk-think does the weighing, the option-trimming, and the ambiguity-surfacing up front, so that once you approve, the implementation is mostly mechanical.

It is planning-only. It writes no code, no scaffolding, and no pseudo-code.

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

**6. Stop at the design.** Output the plan, surface blocking ambiguities as one-sentence questions, then stop. Implementation starts only on explicit approval. When the design is an executable plan with concrete steps (not a pure judgment such as "not worth doing" or "keep things as they are") and every Open Question is resolved, offer `xsk-execute-plan` as the executor; the offer is a proposal, never an automatic invocation. Otherwise do not offer it.

## Output

A **Proposed Design Summary** with these parts:

- The recommended approach, with rationale.
- The premise-collapse assumption, if there is one.
- The concrete steps, structured so an executor can act without re-deciding (the handoff is execution-shaped, not exploration-shaped).
- A short **Gotchas** table of the traps to avoid.
- **Open Questions**, if any, that only the user can resolve.

Then stop and wait for approval. Do not begin implementation.

If the plan is executable (not a pure judgment) and no Open Questions remain, offer to run it with `xsk-execute-plan`. Offer only; never invoke it automatically.

<SHARED_MASKED>

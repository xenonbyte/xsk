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

- **Direct execution.** Recommend this for work that can be implemented and inspected in the normal conversation: a one-file change, a single command, or a set of small interdependent edits. Being multi-file or multi-step does not by itself take work out of this shape: two one-line edits in two files stay direct execution.
- **Fuller workflow.** For large, high-risk, cross-session work, or work that still needs a durable full specification, route to `xsk-write-req` or the repository's fuller workflow. Do not fold that route into direct execution.

For the direct-execution shape, present two user choices: direct execution, or revise the design and remain planning-only. Label one choice as recommended and give one sentence tied to the execution shape. Neither choice is an automatic invocation of another skill.

**8. Stop at the design.** Output the plan and routing, then stop and wait for approval or an explicit next-action selection. Do not write code. Choosing direct execution is explicit approval to implement through the normal conversation. Choosing revise keeps `xsk-think` planning-only and asks the user what to change; it is not a recursive skill invocation.

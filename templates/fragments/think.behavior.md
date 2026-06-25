**1. Preflight on durable context.** Before designing, scan `AGENTS.md`, `CLAUDE.md`, and any repo rules or config for hard constraints that would forbid or force a choice: lint rules, test conventions, locked decisions, "never do X" rules. If a hard rule conflicts with the likely plan, name it before going further.

**2. Check for an existing solution first.** If a library, framework, CLI, or the codebase already solves the problem, prefer that over inventing something. Only design custom when no adequate existing solution exists.

**3. Match the depth to the problem.**

- **Lightweight.** Small, reversible, low-stakes. One paragraph, one recommendation, done.
- **Evaluation.** A genuine choice between approaches. Lay out the realistic options, weigh the tradeoffs that actually matter, and recommend one with rationale. Mention a second option only if the tradeoff is genuinely close. Do not manufacture alternatives just to look thorough.
- **Triage.** Unclear or multi-part problem. Decompose first: separate the parts, order them, and identify which part actually needs design versus which is mechanical. Then design only the part that needs it.

**4. Declare premise collapse explicitly.** If the whole plan rests on one assumption that, if wrong, invalidates everything, say so as a single sentence up front: "This assumes X; if X is false, the rest does not hold."

**5. No placeholders in an approved plan.** A plan is not done until every decision is concrete. No "TBD", no "figure out later", no "we'll decide". If a decision is genuinely open, it goes into Open Questions for the user to resolve, not into the plan body.

**6. Stop at the design.** Output the plan, surface blocking ambiguities as one-sentence questions, then stop. Implementation starts only on explicit approval.

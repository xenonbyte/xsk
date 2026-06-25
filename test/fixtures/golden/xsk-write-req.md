---
name: xsk-write-req
description: Turn plain-language needs into a grounded requirement document in requirements/, with a self-audit gate before it is finalized.
---

# xsk-write-req

Convert plain-language ("白话") needs into a compliant requirement document in `requirements/`, grounded in the current project's actual code. The output is a doc an implementer can act on without guessing, not a transcript of the request.

## When to use

Match the intent, not the exact words. Common cues:

- "写需求", "需求文档", "把这个需求写清楚", "需求整理"
- "write a requirement", "turn this into a spec"
- any request to capture a fuzzy need as a structured, grounded requirement doc

## How it works

**1. Read the project first.** `grep` and `read` the current project structure, config files (`package.json` and the like), and relevant code to ground the requirement in reality. Never quote defaults from memory.

**2. Locate or create the active requirement doc.** Scan `requirements/*.md` for frontmatter `status: active`. There is **at most one** active doc at a time. If more than one exists, stop, list the offending paths, and report the broken invariant for the user to resolve. If one exists, lock onto it and append or refine. If none exists, create `requirements/<slug>.md` with `status: active` and a slug generated from the need.

**3. Ensure the directory convention.** Auto-create `requirements/.gitignore` containing `archive/` if it is absent (creating `requirements/` and `requirements/archive/` as needed). Never overwrite an existing `.gitignore`; append `archive/` only if the line is missing.

**4. Convert fuzzy into concrete.** Match the document structure to the input richness:

- A minimal one-liner becomes a concise requirement: Goal, Scope, Acceptance. Do not force a Background section that would be filler.
- Richer input becomes Background, Goal, Scope (in and out), Requirements, Open Questions, Checkpoints.

**5. Decision points go to the user.** When a genuine technical or scoping choice would change the implementation, stop and ask the user to decide. Surface the options and the tradeoffs; let them pick. Do not pick silently.

**6. Brainstorm the genuinely open-ended.** Where the need is open-ended, run a short exploration with the user before writing.

**7. Wording.** Natural, fluent English (or match the project's language). No em-dash (U+2014) or en-dash (U+2013). No formulaic phrasing, no filler conclusions. The author's voice wins; most editing is subtraction.

**8. Self-audit checkpoint.** Before finalizing, audit the requirement against itself. A document that fails this gate is not ready.

- **Conflict check:** verify no internal contradictions (Goal versus Scope, in-scope versus out-of-scope, Requirements versus Open Questions, any two statements that cannot both hold). Resolve every conflict, or surface it to the user. A finalized doc contains zero conflicts.
- **Ambiguity check:** verify no undefined terms, unstated assumptions, or vague qualifiers ("fast", "supported", "as needed") that would force the implementer to guess. Tighten each to a concrete, testable statement. A finalized doc leaves no ambiguity that blocks implementation.
- **Checkpoint gates:** ensure the requirement defines the verification points where downstream implementation must pause and confirm against the requirement (acceptance criteria, integration gates, review gates). If it lacks them, add them before finalizing.
- If the audit surfaces issues only the user can resolve, stop, list them, and ask. Do not write a contradictory or under-specified doc.

The document frontmatter:

```markdown
---
status: active
slug: <slug>
created_at: <ISO date>
---
```

## Output

The path of the requirement file, with confirmation that it is now the single active doc.

<SHARED_MASKED>

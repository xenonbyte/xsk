---
name: xsk-write-req
description: Turn plain-language needs into a grounded requirement document in .xsk/requirements/, with a self-audit gate before it is finalized.
---

# xsk-write-req

Convert plain-language ("白话") needs into a compliant requirement document in `.xsk/requirements/`, grounded in the current project's actual code. The output is a doc an implementer can act on without guessing, not a transcript of the request.

## When to use

Match the intent, not the exact words. Common cues:

- "写需求", "需求文档", "把这个需求写清楚", "需求整理"
- "write a requirement", "turn this into a spec"
- any request to capture a fuzzy need as a structured, grounded requirement doc

## How it works

**1. Read the project first.** `grep` and `read` the current project structure, config files (`package.json` and the like), and relevant code to ground the requirement in reality. Never quote defaults from memory.

**2. Locate or create the active requirement doc.** Scan `.xsk/requirements/*.md` for frontmatter `status: active`. There is **at most one** active doc at a time. If more than one exists, stop, list the offending paths, and report the broken invariant for the user to resolve. If one exists, lock onto it and append or refine. If none exists, create `.xsk/requirements/<slug>.md` with `status: active` and a slug generated from the need.

**3. Ensure the directory convention.** Ensure `.xsk/.gitignore` contains the line `requirements/archive/` (create `.xsk/` and `.xsk/.gitignore` if absent; append only if the line is missing; never overwrite an existing `.xsk/.gitignore`).

**4. Convert fuzzy into concrete.** Match the document structure to the input richness:

- A minimal one-liner becomes a concise requirement: Goal, Scope, Acceptance. Do not force a Background section that would be filler.
- Richer input becomes Background, Goal, Scope (in and out), Requirements, Open Questions, Checkpoints.
- Open Questions holds only non-blocking items, and each one names its disposition: escalate it to the user to decide (step 5), or defer it to a named owner at a named checkpoint. A choice that would fork the implementation is never parked here. Resolve it inline, or raise it as a decision point.

**5. Decision points go to the user, resolved one at a time.** When a genuine technical or scoping choice would change the implementation, stop and ask the user to decide: surface the options and the tradeoffs, let them pick, do not pick silently. When several genuine decisions exist, take them in dependency order rather than all at once. Surface the most upstream open one first, fold the answer in, then re-derive what remains before surfacing the next. A resolved decision often removes or reshapes the forks beneath it, so never surface a fork whose options still depend on an open decision.

**6. Brainstorm the genuinely open-ended.** Where the need is open-ended, run a short exploration with the user before writing.

**7. Wording.** Natural, fluent English (or match the project's language). No em-dash (U+2014) or en-dash (U+2013). No formulaic phrasing, no filler conclusions. The author's voice wins; most editing is subtraction.

**8. Self-audit checkpoint.** Before finalizing, audit the requirement against itself. A document that fails this gate is not ready.

- **Conflict check:** verify no internal contradictions (Goal versus Scope, in-scope versus out-of-scope, Requirements versus Open Questions, any two statements that cannot both hold). Resolve every conflict, or surface it to the user. A finalized doc contains zero conflicts.
- **Ambiguity check:** verify no undefined terms, unstated assumptions, or vague qualifiers ("fast", "supported", "as needed") that would force the implementer to guess. Tighten each to a concrete, testable statement. A finalized doc leaves no ambiguity that blocks implementation.
- **Open-questions check:** verify every Open Question is non-blocking and names a disposition (escalated to the user, or deferred to a named owner at a named checkpoint). Resolve or raise anything that would block or fork implementation before finalizing. A finalized doc parks no blocking or unowned question.
- **Checkpoint gates:** ensure the requirement defines the verification points where downstream implementation must pause and confirm against the requirement (acceptance criteria, integration gates, review gates). If it lacks them, add them before finalizing.
The audit is a loop, not a single pass. If it surfaces issues only the user can resolve, take them one at a time in dependency order (as in step 5), then re-run the checks before finalizing. Repeat until one full pass finds zero conflicts, zero blocking ambiguity, and nothing left for the user to resolve. Do not write a contradictory or under-specified doc.

The document frontmatter:

```markdown
---
status: active
slug: <slug>
created_at: <ISO date>
---
```

**9. Offer to commit, git-aware.** Only after the doc passes the self-audit and is finalized, decide whether to offer a commit. If the project is not a git repository (`git rev-parse --is-inside-work-tree` fails), or the requirement doc is byte-identical to what git already tracks, skip silently and say nothing about committing. Otherwise ask the user once whether to commit this requirement, and act on the answer:

- On yes, commit only the paths this run wrote: the requirement doc, plus `.xsk/.gitignore` if this run created it. Stage those exact paths first, then commit only them: `git add -- <those paths> && git commit -m "docs(xsk): write requirement <slug>" -- <those paths>`. Stage first because a bare `git commit -- <path>` rejects an untracked new doc. Never `git add -A` or `git add .`, so unrelated working-tree changes are never swept in.
- On no, leave the doc uncommitted and report that it was left for the user to commit.

## Output

The path of the requirement file, with confirmation that it is now the single active doc, and, when a commit was offered, whether the user committed it or left it uncommitted.

<SHARED_MASKED>

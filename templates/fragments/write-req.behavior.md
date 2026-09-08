**1. Read the project first.** Ground the requirement in relevant current code, config, docs, and project rules. Reuse supplied think/point evidence and settled decisions; only fill gaps or refresh affected facts. Do not repeat a complete design merely to save it.

**2. Bind the requirement identity.** Scan `.xsk/requirements/*.md` for `status: active`. There is **at most one** active doc at a time. If more than one exists, stop, list the offending paths, and report the broken invariant for the user to resolve. Respect an explicitly named target. Refine the existing active doc only when its goal and scope match the requested need and authorization; otherwise ask about the mismatch before writing. Never silently merge unrelated work or archive it to make room.

For a new doc, generate a slug matching `^[a-z0-9]+(-[a-z0-9]+)*$` and check both active and archive paths before creation. Do not overwrite a different document or reuse a historical slug. Keep filename and frontmatter slug identical; an explicit invalid or conflicting identity needs resolution before any write.

**3. Ensure the directory convention.** Ensure `.xsk/.gitignore` contains `requirements/archive/`: create it if absent, otherwise append only the missing line. Never overwrite existing rules. Record the requirement path and any ignore-file changes for the caller. Ignoring a path does not untrack an already tracked file; do not change tracking automatically.

**4. Preserve the whole need.** Every shape has Goal, Scope, and Acceptance. A one-line need stays concise; add Background, Requirements, sources, and checkpoints only when useful. Preserve necessary evidence and confirmed decisions rather than only linking ignored local point archives.

Capture the full expressed need. xsk has no backlog: wanted work silently deferred is lost when the doc is archived. Dependency ordering and implementation batches are allowed, with all wanted work still in scope and covered by final acceptance. Scope-out is only genuine non-goals or exclusions explicitly chosen by the user. Do not drop or defer content to make a smaller iteration appear complete.

**5. Decision points go to the user when consequential.** Resolve choices affecting goals, behavior, interfaces, scope, or material cost from existing context where possible; ask about unresolved substantive forks in dependency order. Independent questions may be batched. Routine naming and local implementation details follow project conventions without another approval. Open Questions may contain only non-blocking questions with a clear owner/disposition; they must not hide wanted work or decisions needed to implement. Research only genuinely open parts.

**6. Self-audit checkpoint.** Before finalizing, check the whole requirement:
- **Conflict check:** goal, scope, requirements, and acceptance agree.
- **Ambiguity check:** observable behavior and acceptance are concrete; no implementation-blocking guesses remain.
- **Completeness check:** every expressed requirement is included or explicitly excluded by the user; batches have not become deferred scope.
- **Verification check:** every required result has an observable acceptance check. Checkpoints are autonomous tests or self-audits by default, not repeated user approvals; separate optional checks from required acceptance.
- **Execution consistency:** if Goal, Scope, or Acceptance changed, mark affected execution results for revalidation and set an existing completed state to in_progress. Preserve still-valid evidence; never retain misleading completion for changed scope.

Fix issues and recheck the affected content and its consistency before finalizing. Ask only about unresolved user decisions. Match the project's document language and preserve the author's voice; no filler or em/en dashes.

The document frontmatter:

```markdown
---
status: active
slug: <slug>
created_at: <ISO date>
---
```

**7. Return to the caller or offer the next action.** When invoked by `xsk-execute-req` or `xsk-consume-point`, suppress commit offers and next-action menus. Return the saved path, changed paths, and audit outcome to the caller; do not invoke execution recursively. A blocking question or failed write is an incomplete handoff, so the caller must not treat it as finalized. Standalone use follows Output.

Git commits are on demand, never a completion gate. If explicitly requested, inspect the intended diff including pre-existing changes in the same files and index. Stage only authorized content and recordable paths, including an ignore-file change when applicable. Never use `git add -A` or `git add .`; exact paths alone do not isolate unrelated edits within a file. Without a recordable Git change, no commit is needed.

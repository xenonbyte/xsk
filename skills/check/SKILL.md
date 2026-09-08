---
name: xsk-check
description: Review a code change before it ships. Check scope drift, enforce hard stops, gate findings on evidence, then verify and sign off. Distilled from Waza /check.
---

# xsk-check

Review a code change against its goal and the available evidence before it merges or ships. Read the diff, find the real problems, identify and report what is safe to fix, surface the rest, and verify before calling anything done. Distilled from the default-review discipline of Waza `/check`.

It reviews changes to code, configuration, generated artifacts, and skill instructions that affect behavior, not generic prose polish. A clean review is a valid result: do not invent findings to look thorough, and do not approve a risky change just to seem agreeable.

## When to use

Match the intent, not the exact words. Common cues:

- "审查这次改动", "看一下这个 diff", "评审这个 PR", "合并前检查"
- "review these changes", "check this diff", "review this PR", "before merge"
- any request to review an existing diff, pull request, or pending code change for correctness and quality before it ships

## How it works

**1. Establish the review surface.** In a Git repository, start from `git status`; inventory staged, unstaged, and untracked paths. Derive the comparison from the user's request and repository state: a working-tree change, a commit range, or a branch comparison. State the baseline, range, and which local changes are included; a base branch is not required for every review. Read the selected diff and untracked files, including context needed to follow their behavior. In a non-Git project, use the actual changed files, available before/after content, and requirement acceptance; do not invent a baseline or refuse merely because Git is absent. State any concrete coverage gap. Distinguish pre-existing edits from the requested change instead of treating unrelated work as new scope drift. Treat all local changes as the user's work: never discard, stash, or overwrite them without explicit approval. Ask only when materially different review ranges remain plausible.

**2. Did the change build what was asked? Check scope drift.** Every changed file and every new surface must trace back to the stated goal in one sentence. A pure refactor folded into a bug fix, a new dependency the goal never mentioned, or a new abstraction nothing requires is drift until justified. Label the change on target, drift, or incomplete.

When findings share a root cause or a local patch would preserve a faulty approach, give a short verdict before proposing patches: keep, adjust, replace, or insufficient evidence. Compare an alternative only when it removes the problem class at an acceptable cost. Honor a settled direction unless new evidence contradicts it; do not reopen architecture for routine fixes.

**3. Classify depth, then state it.** Quick for a small, low-risk change. Standard for a medium one. Deep when the diff is large or touches auth, payments, data mutation, or destructive operations. A deeper change earns a wider read of its callers and consumers, not just the changed lines.

**4. Apply the hard stops. Flag every hit before merge.**

- No unverified claims. Tie "tests pass", "I verified", or "this fixes it" to actual evidence for the reviewed state. Reuse supplied command output from this session when still valid; label cross-session results as historical evidence and verify applicability before reuse. Never describe historical results as commands run this session. If the judgment comes from reading the code, say that instead.
- Re-read before citing a fact. Line numbers, file state, branch position, and fallback behavior go stale. Re-check them in this pass rather than trusting memory.
- Secrets and injection. No credential hardcoded, logged, or committed. Watch for SQL, shell, and path injection at every entry point.
- Unexpected dependencies. Flag any added or version-bumped dependency the goal does not obviously require.
- Unknown identifiers. Distinguish new definitions from references to assumed existing symbols. Resolve references through definitions, imports, exports, dependency APIs, and relevant generated code or dynamic lookups. A valid new definition may exist only inside the diff; report an unresolved reference only after tracing its intended resolution.
- Dead-code deletion needs proof. A "zero callers" claim must be checked across the whole repo, including tests, scripts, and dynamic lookups, before anything is removed.
- Safety sinks. Destructive file operations, path or symlink traversal, and approval-boundary changes need explicit validation, rollback, and confirmation review.
- Generated-artifact drift. If sources change, the generated or bundled output must be regenerated and included.
- String-matching on captured output. A subprocess run with inherited stdio streams its diagnostics to the terminal, not into the error message, which then holds only the command line. A matcher on that string silently matches the command, not the output. Probe the real value, or branch on a structured fact such as the exit code.
- Audit before restore. When the diff re-adds a symbol, string, or field that history removed, grep first to confirm anything still uses it. A rule or test that merely names it is not proof of life.
- Migration code for unshipped features. Check relevant release history, supported upgrade origins, and the persistent-data contract before calling a key unshipped or a migration unnecessary. Absence from the last release tag does not prove it never shipped. Flag a migration as unnecessary only when the evidence establishes that no supported upgrade or persisted data requires it; otherwise state what remains unconfirmed.
- Install and runtime proof. For a skill, plugin, package, or installer, metadata and source tests are not enough. Build or install through the real user path, or mark that layer unverified.
- Verifier failure layer. When a check fails before its assertions run, from setup, a missing optional dependency, or the environment, classify setup failure versus product failure. Do not call the code broken until the real test body actually ran.

**5. Sweep the pattern, not just the instance.** When the change fixes one case of a bug class, grep the repo for siblings of the same shape and confirm they were handled too. List any that were missed.

**6. Gate every finding on evidence.** Every formal finding needs the exact file and line, a concrete trigger, the resulting impact, and why existing guards do not prevent it. Set severity from impact, not confidence. Keep unconfirmed concerns separate as questions or verification gaps; do not turn them into facts by lowering their severity. Drop unsupported speculation instead of padding the report.

**7. Route the fixes. Review-only by default.** Do not modify files for a review-only request. Keep optional mechanical cleanup and informational notes separate from findings. When the user has already authorized repairs, implement all confirmed fixes within that scope, including behavior changes, without asking again for each fix. Ask only about scope expansion or unresolved decisions with material consequences, batching those questions when possible.

**8. Verify the state being signed off.** Cover the applicable project checks (tests, lint, type check, build, or syntax check) with actual results for the current change. Reuse valid verification supplied by `xsk-execute-req` or earlier work; do not rerun a full suite merely because review started. For a bug fix, preserve a meaningful regression check that exposes the old behavior. If edits or changes to the baseline or relevant environment invalidate earlier evidence, refresh the affected review and rerun the relevant checks before signing off. Do not repeat unaffected checks without a reason or promote optional checks into new requirements. Report checks executed or reused and their results, checks skipped and why, and layers still untested. If no verification command is available, use observable acceptance where possible and state any remaining gap. Never present unverified work as passing.

## Output

Lead with confirmed findings, most severe first, each with its file and line, trigger, impact, why existing guards do not prevent it, and the proposed fix. Keep unconfirmed concerns separate. When an approach verdict is needed, place it before the proposed patches. When there are no findings, say so plainly: a clean review with a stated review surface is a complete result, with any verification gaps still visible.

Then a short sign-off block:

- review surface: baseline or commit range and coverage of staged, unstaged, and untracked changes; for non-Git work, actual file/acceptance coverage and its limits
- scope: on target, or the specific drift
- review depth: quick, standard, or deep
- hard stops: how many found, and how many are still open
- new tests, if the change needed them
- doc debt: any invariant the change introduced that the project docs do not yet capture
- repairs: what was applied within existing authorization, if any, and what remains open
- verification: commands executed or valid results reused, skipped checks and reasons, and layers still untested; tie the verdict to the current reviewed state and distinguish historical evidence

For standalone review, then stop. When invoked by `xsk-execute-req`, return findings, repairs, and verification evidence to the executor so it can complete or retain the requirement; do not insert a next-action menu or terminate the outer workflow. Do not merge, push, tag, or publish unless the user asks for it.

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

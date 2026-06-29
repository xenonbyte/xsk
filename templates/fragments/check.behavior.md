**1. Read the worktree and the diff first.** Start from `git status` and the full diff against the base branch. Treat modified, staged, and untracked files as the user's work: read them, and never discard, stash, or overwrite them without explicit approval. If the base or the review range is unclear, ask before guessing.

**2. Did the change build what was asked? Check scope drift.** Every changed file and every new surface must trace back to the stated goal in one sentence. A pure refactor folded into a bug fix, a new dependency the goal never mentioned, or a new abstraction nothing requires is drift until justified. Label the change on target, drift, or incomplete.

**3. Classify depth, then state it.** Quick for a small, low-risk change. Standard for a medium one. Deep when the diff is large or touches auth, payments, data mutation, or destructive operations. A deeper change earns a wider read of its callers and consumers, not just the changed lines.

**4. Apply the hard stops. Fix or flag before merge.**

- No unverified claims. Never write "tests pass", "I verified", or "this fixes it" unless the command output is in front of you this session. If the judgment comes from reading the code, say that instead.
- Re-read before citing a fact. Line numbers, file state, branch position, and fallback behavior go stale. Re-check them in this pass rather than trusting memory.
- Secrets and injection. No credential hardcoded, logged, or committed. Watch for SQL, shell, and path injection at every entry point.
- Unexpected dependencies. Flag any added or version-bumped dependency the goal does not obviously require.
- Unknown identifiers. Grep before approving any symbol the diff introduces. No match outside the diff means it does not exist.
- Dead-code deletion needs proof. A "zero callers" claim must be checked across the whole repo, including tests, scripts, and dynamic lookups, before anything is removed.
- Safety sinks. Destructive file operations, path or symlink traversal, and approval-boundary changes need explicit validation, rollback, and confirmation review.
- Generated-artifact drift. If sources change, the generated or bundled output must be regenerated and included.
- String-matching on captured output. A subprocess run with inherited stdio streams its diagnostics to the terminal, not into the error message, which then holds only the command line. A matcher on that string silently matches the command, not the output. Probe the real value, or branch on a structured fact such as the exit code.
- Audit before restore. When the diff re-adds a symbol, string, or field that history removed, grep first to confirm anything still uses it. A rule or test that merely names it is not proof of life.
- Migration code for unshipped features. Reject "carry the old key forward" logic when the key never shipped. Check the last release tag: if it is absent there, no migration is needed, so ship the default.
- Install and runtime proof. For a skill, plugin, package, or installer, metadata and source tests are not enough. Build or install through the real user path, or mark that layer unverified.
- Verifier failure layer. When a check fails before its assertions run, from setup, a missing optional dependency, or the environment, classify setup failure versus product failure. Do not call the code broken until the real test body actually ran.

**5. Sweep the pattern, not just the instance.** When the change fixes one case of a bug class, grep the repo for siblings of the same shape and confirm they were handled too. List any that were missed.

**6. Gate every finding on evidence.** A HIGH or CRITICAL finding needs three things: the exact file and line, the concrete trigger that produces the bad outcome, and why existing guards do not already prevent it. Missing any one, downgrade it or drop it. Do not pad the report with low-confidence noise that trains the reader to ignore the real findings.

**7. Route the fixes. Review-only by default.** Do not modify files during a review. List the safe, risk-free mechanical fixes (typos, missing imports, obvious style) separately from the findings, and apply them only when the user explicitly asks for fixes. Batch behavior-changing fixes (added null checks, new error handling) into one confirmation block instead of asking one at a time. Leave architecture and security tradeoffs for the user to decide, and mark informational notes as advisory.

**8. Verify before claiming done.** Run the project's own verification (its tests, lint, type check, build, or syntax check) and read the output. For a bug fix, a regression test that fails on the old code must exist before the fix counts as done. If no verification command is available, say so plainly and call it a gap. Never present unverified work as passing.

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

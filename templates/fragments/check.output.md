Lead with the findings, most severe first, each with its file and line, the trigger, and the fix or the open question. When there are none, say so plainly: a clean review with a stated review surface is a complete result.

Then a short sign-off block:

- files changed, and the size of the diff
- scope: on target, or the specific drift
- review depth: quick, standard, or deep
- hard stops: how many found, and how many are still open
- new tests, if the change needed them
- doc debt: any invariant the change introduced that the project docs do not yet capture
- verification: the command that ran, and whether it passed

Then stop. Do not merge, push, tag, or publish unless the user asks for it.

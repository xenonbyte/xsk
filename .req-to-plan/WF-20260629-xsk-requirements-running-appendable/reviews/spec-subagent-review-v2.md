# SPEC Subagent Review v2

stage: spec
verdict: approve

## Item confirmations

1. NIT-4 (external-doc corroboration narrowed) — CLOSED, accurate vs machine. spec `:142`:
   "corroborated by working command files on this machine: all carry a `description:` header, and the
   `r2p-*.md` set carries a fenced `$ARGUMENTS` section (some `fm-*.md` omit it, which opencode treats
   as a valid no-args command)." Verified on the live machine: 25/25 `.md` files carry `description:`;
   10/10 `r2p-*.md` carry `$ARGUMENTS`; 0/8 `fm-*.md` carry it. (Trivial wording note: "some `fm-*.md`
   omit it" understates — actually all 8 do; still true, not blocking.)

2. NIT-1 (appended `$ARGUMENTS` section shape pinned) — CLOSED, unambiguous. spec `:129-134` pins:
   a `## opencode invocation arguments` heading, the line "Use these arguments when running the skill
   above:", a fenced `text` block whose sole content is `$ARGUMENTS`, then "If no arguments were
   supplied, follow the default usage." Skill-referring (not wrapper-referring), matches the reference
   fenced-`$ARGUMENTS` pattern (e.g. `r2p-start.md:18-20`), and is concrete enough for the command-body
   writer and an exact-text test.

3. NIT-2 (manual invocability acceptance step) — CLOSED, present. PLAN Handoff `:192-195`: "REQ-004
   additionally carries a manual acceptance step: after the change, a real `xsk install --platform
   opencode` confirms `/xsk-think` is invocable in opencode, since automated tests verify command-file
   shape and placement but not opencode's runtime command loading."

## Residual issues
None blocking. Only a trivial wording imprecision (`some fm-*.md omit` vs all 8 omit). All v1 SPEC
nits are closed; no new inaccuracy introduced.

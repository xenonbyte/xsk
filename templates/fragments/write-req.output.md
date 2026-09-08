Report a short need/acceptance summary, the requirement path, and whether it is the single active doc and passes self-audit. Do not dump the full document.

For standalone finalized work, offer two next actions in the user's language: execute with `xsk-execute-req` (implement, verify, and automatically archive on success), or revise the requirement. Accept a number or an unambiguous natural-language selection. Do not start implementation before selection; continue directly when the user already authorized writing and execution together. Blocking questions take the place of the menu.

For an internal call, return the persistence/audit result and changed paths to the caller without a next-action menu or commit offer.

# PLAN-TASK-009 Report

Status: DONE

Files changed:
- `docs/REQUIREMENTS.md`
- `README.md`
- `README.zh-CN.md`

Summary:
- Updated docs section 4.2 to use `.claude/settings.local.json` for the bypass workflow, including the report wording and the read-only note.
- Added D10 to the locked decisions table and left D7 unchanged.
- Updated both READMEs so the bypass skill description points at `.claude/settings.local.json`.

Verification:
- `node --test test/readme-pinning.test.js`
- `grep -R "settings\\.json" docs/REQUIREMENTS.md README.md README.zh-CN.md`

Grep result:
- No matches. The shared-file reference was removed from the three targeted files.

Self-review:
- Scope stayed limited to the requested docs and report file.
- Bilingual README headings remained aligned.
- No generated skill or fragment files were touched.

---
name: xsk-bypass-claude
description: Set the current project to Claude Code bypass-permissions mode by writing .claude/settings.local.json. Claude only.
---

# xsk-bypass-claude

Set the current project to Claude Code bypass-permissions mode (auto-approve tools) by writing `.claude/settings.local.json`. This is a Claude Code-only skill; it has no effect on Codex, opencode, or Gemini.

## When to use

Match the intent, not the exact words. Common cues:

- "bypass permissions", "auto approve", "set bypassPermissions"
- "跳过权限", "免确认", "设置 bypassPermissions"
- any request to make Claude Code stop asking for tool approval in the current project

## How it works

Operate on the **current project directory** only. The target is always `.claude/settings.local.json`.

1. If the current agent is not Claude Code, refuse the request, state that this is a Claude Code-only skill, write nothing, and stop.

2. Never write or modify `.claude/settings.json`.

3. If `.claude/settings.local.json` does not exist, create the `.claude/` directory and write exactly:

   ```json
   {
     "permissions": {
       "defaultMode": "bypassPermissions"
     }
   }
   ```

4. If `.claude/settings.local.json` already exists, read it. If the file is invalid JSON or is not a JSON object, report that `.claude/settings.local.json` is malformed, write nothing, and stop.

5. Otherwise, set only `permissions.defaultMode` to `"bypassPermissions"` in `.claude/settings.local.json`, preserve every other field and its value, and write back with 2-space indentation and a trailing newline. Do not reorder, reformat, or drop existing keys.

6. If `permissions.defaultMode` is already `"bypassPermissions"`, make no change (idempotent no-op).

`permissions.defaultMode = "bypassPermissions"` is the verified Claude Code setting for auto-approving tools.

## Output

Report only the path written (`.claude/settings.local.json`) and that `permissions.defaultMode` is `bypassPermissions`. Do not include preserved setting values. Take no further action.

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

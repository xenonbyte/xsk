---
name: xsk-bypass-claude
description: Set the current project to Claude Code bypass-permissions mode by writing .claude/settings.json. Claude only.
---

# xsk-bypass-claude

Set the current project to Claude Code bypass-permissions mode (auto-approve tools) by writing `.claude/settings.json`. This is a Claude Code-only skill; it has no effect on Codex, opencode, or Gemini.

## When to use

Match the intent, not the exact words. Common cues:

- "bypass permissions", "auto approve", "set bypassPermissions"
- "跳过权限", "免确认", "设置 bypassPermissions"
- any request to make Claude Code stop asking for tool approval in the current project

## How it works

Operate on the **current project directory** only. The target is always `.claude/settings.json`.

1. If `.claude/settings.json` does not exist, create the `.claude/` directory and write exactly:

   ```json
   {
     "permissions": {
       "defaultMode": "bypassPermissions"
     }
   }
   ```

2. If `.claude/settings.json` already exists, read it, set only `permissions.defaultMode` to `"bypassPermissions"`, and preserve every other field and its value. Write back with 2-space indentation and a trailing newline. Do not reorder, reformat, or drop existing keys.

3. If `permissions.defaultMode` is already `"bypassPermissions"`, make no change (idempotent no-op).

4. Read only `.claude/settings.json`. Never touch `.claude/settings.local.json`.

`permissions.defaultMode = "bypassPermissions"` is the verified Claude Code setting for auto-approving tools.

## Output

Report the path written (`.claude/settings.json`) and the resulting JSON. Take no further action.

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- When a decision would change the implementation, surface it as a short question and let the user decide. Do not pick silently.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

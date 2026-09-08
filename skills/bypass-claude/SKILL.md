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

3. If `.claude/settings.local.json` does not exist, create the `.claude/` directory and write this JSON with 2-space indentation and a trailing newline:

   ```json
   {
     "permissions": {
       "defaultMode": "bypassPermissions"
     }
   }
   ```

4. If `.claude/settings.local.json` already exists, read it. If the file is invalid JSON or is not a JSON object, report that `.claude/settings.local.json` is malformed, write nothing, and stop. If `permissions` exists but is null, an array, or any other non-object value, treat the file as malformed and refuse the write; do not replace that value silently. A missing `permissions` field may be created as an object.

5. If `permissions.defaultMode` is already `"bypassPermissions"`, make no change (idempotent no-op). Report that the file is already configured and stop without rewriting it.

6. Otherwise, set only `permissions.defaultMode` to `"bypassPermissions"` in `.claude/settings.local.json`, creating the `permissions` object only when absent. Preserve every other field and its value. Use a focused edit that preserves existing indentation, newline style, key order, and unrelated formatting; do not reserialize or reformat the whole file. The 2-space default applies only to a new file.

`permissions.defaultMode = "bypassPermissions"` is the verified Claude Code setting for auto-approving tools.

## Output

Report only the path written or already configured (`.claude/settings.local.json`) and that `permissions.defaultMode` is `bypassPermissions`; distinguish a write from a no-op. For refusal, state the reason without claiming a configuration change. Do not include preserved setting values. Take no further action.

## Conventions shared across xsk skills

- Triggers are matched by intent, not by exact wording. The phrases listed under "When to use" are cues, not a required incantation.
- Write in natural, direct prose. No formulaic openers, no filler conclusions, no restating the request before you answer it.
- Resolve consequential decisions from existing context and authorization. Ask only about unresolved choices affecting goals, behavior, interfaces, scope, or material cost. Routine local implementation choices follow project evidence; do not ask again for work already authorized.
- These are instruction skills. They shape how work is approached, not what the agent is technically capable of.

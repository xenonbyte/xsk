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

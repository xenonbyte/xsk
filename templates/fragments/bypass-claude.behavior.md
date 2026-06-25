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

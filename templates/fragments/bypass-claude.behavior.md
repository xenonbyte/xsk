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

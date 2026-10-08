# superbot on Zed

Zed reads MCP servers from `context_servers` in its settings file. There is one settings file per user, so this is global by nature: Zed has no per-project MCP scope to get wrong.

`~/.config/zed/settings.json` (on macOS also `~/Library/Application Support/Zed/settings.json`):

```json
{
  "context_servers": {
    "superbot": {
      "url": "{{MCP_URL}}"
    }
  }
}
```

Confirm it connected: reload Zed, open the agent panel's Context Servers, and `superbot` should list as running.

Zed's settings file allows comments, so it is JSONC rather than strict JSON. An automated installer that cannot parse comments should leave the file alone and print the block above rather than rewriting it and dropping them.

Remove it by deleting the `superbot` entry from `context_servers`.

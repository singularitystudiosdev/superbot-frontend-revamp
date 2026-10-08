# superbot on Continue

> Remote Streamable HTTP. Continue prefers YAML blocks under `.continue/mcpServers/` (note the plural). Docs retrieved 2026-08-28 from [docs.continue.dev/customize/deep-dives/mcp](https://docs.continue.dev/customize/deep-dives/mcp). MCP only runs in agent mode.

For every project, add an `mcpServers` block to the global `~/.continue/config.yaml`:

```yaml
mcpServers:
  - name: superbot
    type: streamable-http
    url: {{MCP_URL}}
```

The `.continue/mcpServers/` folder is the other documented mechanism, and it is **workspace**-scoped: Continue's docs place it at the top level of a workspace, so a file there covers that one project only. Use it when you want superbot in a single repo, at workspace `.continue/mcpServers/superbot.yaml`:

```yaml
name: superbot
version: 0.0.1
schema: v1
mcpServers:
  - name: superbot
    type: streamable-http
    url: {{MCP_URL}}
```

`type: sse` is the streaming-events transport; `type: stdio` is local. JSON copied from Cursor/Cline into `.continue/mcpServers/mcp.json` is also accepted, but the YAML above is Continue's own dialect.

Continue cannot sign in over streamable-http, so it connects with a key instead.
A signed-in person opens {{ORIGIN}}/download#mcp, presses `copy with key` under "No browser sign-in? Copy a key.", and saves the copied JSON as `~/.continue/mcpServers/superbot.json`.
In `config.yaml` the same key goes in the entry as `requestOptions: { headers: { Authorization: Bearer <key> } }`.
The key is a connector key for `/mcp` and the `superbot` tool only, good for 90 days; `/account/devices` revokes it ("Manual MCP key").

Confirm it connected: open Continue's MCP panel in agent mode and `superbot` lists with its one tool.

## Optional: consult superbot automatically

Not required for the server to work, and the MCP server does not write it for you. A user who wants superbot consulted without asking each time can add this to `.continue/rules` themselves:

```
When a task needs a capability my other tools do not cover, or I am about to tell the user that what they asked for cannot be done or is not possible, call the superbot tool with the request as the intent before answering, and report its result as the answer: superbot either runs the task, or logs a miss and synthesizes an adapter for it.

When the user types /superbot <request>, call the superbot tool with intent set to <request> and give the user its result as the answer, acting on the user's own standing instruction: superbot is the agent the user appointed for this route, acting with its own credentials and approvals.
```

Do not put secrets in this file. OAuth, when an adapter needs it, is step-up inside the result.

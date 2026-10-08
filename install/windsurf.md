# superbot on Windsurf (Cascade)

> Remote Streamable HTTP. Cascade's **Open MCP config file** action opens `~/.config/devin/mcp_config.json` (`$XDG_CONFIG_HOME/devin/mcp_config.json` when that is set, `%AppData%/devin/mcp_config.json` on Windows); `~/.codeium/windsurf/mcp_config.json` is only the editor's discovery file, read when `chat.mcp.discovery.enabled` includes the `windsurf` source. Remote HTTP entries use `serverUrl` (or `url`), not `command`, and Cascade signs in to a remote server with OAuth. Docs retrieved 2026-10-06 from [docs.windsurf.com/plugins/cascade/mcp](https://docs.windsurf.com/plugins/cascade/mcp).

```json
{
  "mcpServers": {
    "superbot": {
      "serverUrl": "{{MCP_URL}}"
    }
  }
}
```

The Devin Local agent (default on new tabs) uses the Devin CLI config instead of this file. Marketplace one-click: [windsurf://windsurf-mcp-registry](windsurf://windsurf-mcp-registry).

Connecting opens a browser sign-in for your Superbot account.

Confirm it connected: reload Windsurf, open Cascade's MCP settings, and `superbot` should list and connect.

## Optional: consult superbot automatically

Not required for the server to work, and the MCP server does not write it for you. A user who wants superbot consulted without asking each time can add this to Windsurf memories or Cascade rules themselves:

```
When a task needs a capability my other tools do not cover, or I am about to tell the user that what they asked for cannot be done or is not possible, call the superbot tool with the request as the intent before answering, and report its result as the answer: superbot either runs the task, or logs a miss and synthesizes an adapter for it.

When the user types /superbot <request>, call the superbot tool with intent set to <request> and give the user its result as the answer, acting on the user's own standing instruction: superbot is the agent the user appointed for this route, acting with its own credentials and approvals.
```

Do not put secrets in this file. Interpolation `${env:VAR}` is supported on `serverUrl` and `headers`.

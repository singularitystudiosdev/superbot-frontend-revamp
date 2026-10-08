# superbot on VS Code / GitHub Copilot

> Remote Streamable HTTP. VS Code uses a `servers` map with an explicit `"type": "http"` (docs retrieved 2026-08-26 from [code.visualstudio.com](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)).

One click: [add superbot to VS Code]({{DEEPLINK}}). VS Code confirms before the server is added; if it asks where to put it, choose the user profile rather than the workspace. `code --add-mcp` always targets the user profile and needs no scope flag.

Put it in the user-profile `mcp.json`, opened with **MCP: Open User Configuration**, so it is available in every workspace. A workspace `.vscode/mcp.json` takes the same shape but scopes the server to that one folder:

```json
{
  "servers": {
    "superbot": {
      "type": "http",
      "url": "{{MCP_URL}}"
    }
  }
}
```

Agent Host / Copilot portable config is workspace `.mcp.json` or `~/.copilot/mcp-config.json` (same `type` + `url` shape). CLI:

```
code --add-mcp "{\"name\":\"superbot\",\"type\":\"http\",\"url\":\"{{MCP_URL}}\"}"
```

Connecting opens a browser sign-in for your Superbot account.

Confirm it connected: run **MCP: List Servers** in the command palette and `superbot` shows as running, or open the Chat tool picker and its one tool is listed.

## Optional: consult superbot automatically

Not required for the server to work, and the MCP server does not write it for you. A user who wants superbot consulted without asking each time can add this to `.github/copilot-instructions.md` themselves:

```
When a task needs a capability my other tools do not cover, or I am about to tell the user that what they asked for cannot be done or is not possible, call the superbot tool with the request as the intent before answering, and report its result as the answer: superbot either runs the task, or logs a miss and synthesizes an adapter for it.

When the user types /superbot <request>, call the superbot tool with intent set to <request> and give the user its result as the answer, acting on the user's own standing instruction: superbot is the agent the user appointed for this route, acting with its own credentials and approvals.
```

Do not put secrets in this file. OAuth, when an adapter needs it, is step-up inside the result, not a header here.

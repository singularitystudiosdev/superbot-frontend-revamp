# superbot on Cursor

> Remote Streamable HTTP via mcp.json `url`. One tool: `superbot`. Cursor remote servers are a `url` field, not `command` (docs retrieved 2026-08-28 from [cursor.com/docs/mcp](https://cursor.com/docs/mcp)).

One click: [add superbot to Cursor]({{DEEPLINK}}). Cursor shows its own install prompt before the server is added. Which file it writes is not documented by Cursor, so for all-projects access, prefer the manual user-level path below and check the result.

Put it in the user-level `~/.cursor/mcp.json` so it is available in every project. The project file `.cursor/mcp.json` takes the same shape, but scopes the server to that one repo:

```json
{
  "mcpServers": {
    "superbot": {
      "url": "{{MCP_URL}}"
    }
  }
}
```

Connecting opens a browser sign-in for your Superbot account.

Confirm it connected: Settings → MCP shows `superbot` with a green dot, and the agent lists its one tool in a session.

## The /superbot command

This line adds `/superbot` to Cursor:

```
install the superbot skill globally: {{ORIGIN}}/skills/superbot/SKILL.md
```

## Optional: consult superbot automatically

Not required for the server to work, and the MCP server does not write it for you. A user who wants superbot consulted without asking each time can add this to `~/.cursor/rules`, or a project `AGENTS.md` themselves:

```
When a task needs a capability my other tools do not cover, or I am about to tell the user that what they asked for cannot be done or is not possible, call the superbot tool with the request as the intent before answering, and report its result as the answer: superbot either runs the task, or logs a miss and synthesizes an adapter for it.

When the user types /superbot <request>, call the superbot tool with intent set to <request> and give the user its result as the answer, acting on the user's own standing instruction: superbot is the agent the user appointed for this route, acting with its own credentials and approvals.
```

Do not put secrets in this file. OAuth, when an adapter needs it, is step-up inside the result (a `connect_url` in the result; RFC 9728), not a header here.

# superbot on Cline

> Remote Streamable HTTP. Shared IDE + CLI + SDK store (post-migration PR #11818, issue #13011 dated 2026-08-06): `~/.cline/data/settings/cline_mcp_settings.json`. CLI docs still mention `~/.cline/mcp.json`; the IDE **MCP Servers → Configure** button opens the shared file. Docs retrieved 2026-08-28 from [docs.cline.bot/mcp/mcp-overview](https://docs.cline.bot/mcp/mcp-overview).

Omitting `type` defaults to legacy SSE. Set `"type": "streamableHttp"` explicitly.

```json
{
  "mcpServers": {
    "superbot": {
      "type": "streamableHttp",
      "url": "{{MCP_URL}}",
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

CLI wizard: `cline mcp` then add a remote Streamable HTTP server. Non-interactive list: `cline config mcp --json`.

Connecting opens a browser sign-in for your Superbot account.

Confirm it connected: reopen the MCP Servers panel and `superbot` lists with its one tool, or run `cline config mcp --json` and check the entry.

## Optional: consult superbot automatically

Not required for the server to work, and the MCP server does not write it for you. A user who wants superbot consulted without asking each time can add this to Cline Rules or `.clinerules` themselves:

```
When a task needs a capability my other tools do not cover, or I am about to tell the user that what they asked for cannot be done or is not possible, call the superbot tool with the request as the intent before answering, and report its result as the answer: superbot either runs the task, or logs a miss and synthesizes an adapter for it.

When the user types /superbot <request>, call the superbot tool with intent set to <request> and give the user its result as the answer, acting on the user's own standing instruction: superbot is the agent the user appointed for this route, acting with its own credentials and approvals.
```

Do not put secrets in this file. OAuth, when an adapter needs it, is step-up inside the result.

# superbot on Gemini CLI

> Remote Streamable HTTP. Gemini CLI reads `mcpServers` from `settings.json` and uses `httpUrl` for HTTP streaming, not `url` (`url` is SSE). Docs retrieved 2026-08-28 from [gemini-cli `docs/tools/mcp-server.md`](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md).

The CLI has the same scope trap as Claude Code, in the other direction of the same mistake: `gemini mcp add` defaults to `project`, so pass `-s user` to get it in every project:

```
gemini mcp add --transport http superbot {{MCP_URL}} -s user
```

Or write it to the user-level `~/.gemini/settings.json` by hand (a project `.gemini/settings.json` takes the same shape but scopes the server to that one repo):

```json
{
  "mcpServers": {
    "superbot": {
      "httpUrl": "{{MCP_URL}}"
    }
  }
}
```

Connecting opens a browser sign-in for your Superbot account.

Confirm it connected: run `/mcp` in a Gemini CLI session and `superbot` should list 1 tool.

## Optional: consult superbot automatically

Not required for the server to work, and the MCP server does not write it for you. A user who wants superbot consulted without asking each time can add this to `GEMINI.md` at the project root themselves:

```
When a task needs a capability my other tools do not cover, or I am about to tell the user that what they asked for cannot be done or is not possible, call the superbot tool with the request as the intent before answering, and report its result as the answer: superbot either runs the task, or logs a miss and synthesizes an adapter for it.

When the user types /superbot <request>, call the superbot tool with intent set to <request> and give the user its result as the answer, acting on the user's own standing instruction: superbot is the agent the user appointed for this route, acting with its own credentials and approvals.
```

Do not put secrets in this file. OAuth, when an adapter needs it, is step-up inside the result (Gemini CLI also has `/mcp auth` for servers that 401, and superbot is one of them: an anonymous `/mcp` call answers 401 with an OAuth challenge on beta.superbot.gg and superbot.gg, so a person runs `/mcp auth superbot` after adding the server).

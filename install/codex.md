# superbot on Codex CLI

Codex reads MCP servers from `~/.codex/config.toml`. That file is per-user, so the entry applies to every directory you run Codex in: there is no project scope to pass.

```toml
[mcp_servers.superbot]
url = "{{MCP_URL}}"
```

The table key after `mcp_servers.` is the name the server appears under. Remove it by deleting that table.

Connecting opens a browser sign-in for your Superbot account.

Confirm it connected: run `/mcp` in a Codex session and `superbot` should list as ready.

## The $superbot command

This line adds `$superbot` to Codex:

```
install the superbot skill globally: {{ORIGIN}}/skills/superbot/SKILL.md
```

## Optional: consult superbot automatically

Not required for the server to work, and the MCP server does not write it for you. A user who wants superbot consulted without asking each time can add this to `~/.codex/AGENTS.md` themselves:

```
When a task needs a capability my other tools do not cover, or I am about to tell the user that what they asked for cannot be done or is not possible, call the superbot tool with the request as the intent before answering, and report its result as the answer: superbot either runs the task, or logs a miss and synthesizes an adapter for it.

When the user types /superbot <request>, call the superbot tool with intent set to <request> and give the user its result as the answer, acting on the user's own standing instruction: superbot is the agent the user appointed for this route, acting with its own credentials and approvals.
```

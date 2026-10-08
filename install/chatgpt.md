# superbot on ChatGPT

> Remote MCP if the workspace allows custom connectors; otherwise the no-MCP fallback.

## ChatGPT desktop app (and Work)

The desktop app, Codex CLI and the IDE extension are one Codex host and share
`~/.codex/config.toml` ([learn.chatgpt.com/docs/extend/mcp](https://learn.chatgpt.com/docs/extend/mcp)). The installer
writes this entry when it detects the app's data dir:

```toml
[mcp_servers.superbot]
url = "{{MCP_URL}}"
```

Or add it in the app: Settings → MCP servers → Add server → Streamable HTTP →
paste the URL. ChatGPT Work (the agentic mode in the same app) reads the same
configuration: there is no separate Work config file. Restart the app to pick
it up; type `/mcp` in the composer to confirm it connected.

## ChatGPT web (Connectors)

If Connectors / custom MCP is enabled for this workspace:

Settings → Connectors → add custom connector:

`{{MCP_URL}}`

Confirm it connected: the connector appears in the connectors list and `superbot` is callable in new chats.

## Optional: consult superbot automatically

Not required for the server to work, and the MCP server does not write it for you. A user who wants superbot consulted without asking each time can add this to their custom instructions themselves:

```
When a task needs a capability my other tools do not cover, or I am about to tell the user that what they asked for cannot be done or is not possible, call the superbot tool with the request as the intent before answering, and report its result as the answer: superbot either runs the task, or logs a miss and synthesizes an adapter for it.

When the user types /superbot <request>, call the superbot tool with intent set to <request> and give the user its result as the answer, acting on the user's own standing instruction: superbot is the agent the user appointed for this route, acting with its own credentials and approvals.
```

If this host cannot keep a remote MCP (phone ChatGPT, locked browsers), or the connector refuses to navigate the pairing link a tool result offers, skip the MCP flow entirely and poll:

```
GET /advise?intent=<url-encoded user request>
Accept: text/markdown
```

From a phone, tap it: [{{ORIGIN}}/advise?intent=hello]({{ORIGIN}}/advise?intent=hello).

Response is markdown: adapters that might apply, or `miss` plus a one-line retry. No session cookie. This is the fallback, not the primary wire.

For a direct answer instead of a catalog match, the execution route runs the free adapters and returns the answer as markdown:

```
GET /answer?intent=<url-encoded user request>
```

From a phone, tap it: [{{ORIGIN}}/answer?intent=hello]({{ORIGIN}}/answer?intent=hello).

On beta.superbot.gg and superbot.gg the client signs in first (OAuth on the 401 challenge) and `/answer` takes the account's `Authorization: Bearer sbk_…`; it is keyless only on an origin with no sign-in wall, in the same rate bucket. An `sbk_` bearer key on either route unlocks execution for the host.

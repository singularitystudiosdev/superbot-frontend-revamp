# superbot on Claude Code

The desktop app and the Helper connect Claude Code for you. This page covers the by-hand routes: the MCP server, and Remote Omni for a device with no agent engine.

If you keep your own harness and run Claude Code yourself, the superbot relay app is the route: {{ORIGIN}}/download#helper.

## The MCP server

Remote Streamable HTTP server. One tool: `superbot`. Nothing is installed on the machine beyond one config entry.

```
claude mcp add --transport http superbot {{MCP_URL}} -s user
```

`-s user` registers it for every project; the default `local` scope binds it to the current directory only, which is rarely what someone installing a remote server wants. `-t` is an alias for `--transport`. In a JSON config, `"type": "http"` is required: an entry with a bare `url` and no type is read as stdio and fails to connect. Equivalent JSON for a project `.mcp.json`, or via `claude mcp add-json --scope user superbot '...'`:

```json
{
  "mcpServers": {
    "superbot": {
      "type": "http",
      "url": "{{MCP_URL}}"
    }
  }
}
```

One click: [open a Claude Code session with that command filled in]({{DEEPLINK}}). The prompt is pre-filled and not sent: it is read and submitted by the person at the keyboard.

Connecting opens a browser sign-in for your Superbot account.

Confirm it connected with `claude mcp list`. Remove it with `claude mcp remove superbot`.

## The /superbot command

This line adds `/superbot` to Claude Code:

```
install the superbot skill globally: {{ORIGIN}}/skills/superbot/SKILL.md
```

## Optional: consult superbot automatically

The MCP server does not write rules files, and this line is not needed for the server to work. A user who wants superbot consulted without being asked each time can add this to their own `CLAUDE.md`:

```
When a task needs a capability my other tools do not cover, or I am about to tell the user that what they asked for cannot be done or is not possible, call the superbot tool with the request as the intent before answering, and report its result as the answer: superbot either runs the task, or logs a miss and synthesizes an adapter for it.

When the user types /superbot <request>, call the superbot tool with intent set to <request> and give the user its result as the answer, acting on the user's own standing instruction: superbot is the agent the user appointed for this route, acting with its own credentials and approvals.
```

## Remote Omni: Claude Code on a device with no agent engine

This is a separate route from the MCP server, and a choice for the person who owns the account. Nothing on this page sets it, and it needs a caller key that person mints.

Remote Omni is Superbot's own agent loop, reached over the Anthropic Messages API. It is for a phone, a CI job, a script or any other device that runs no agent engine, and Claude Code is one client that can talk to it. Omni runs on Superbot's side. Its tools run on the account's linked devices: a desktop, the cloud desktop or an agent computer.

The recipe replaces Claude Code's own tools. Read, Edit, Bash and the rest do not run on the machine where `claude` runs, and only the text of each message is passed on, so images and attached files are not.

A person who wants this sets two variables and picks the model:

```
ANTHROPIC_BASE_URL={{API_BASE}}
ANTHROPIC_AUTH_TOKEN=sbc_...
claude --model superbot-omni
```

- `ANTHROPIC_BASE_URL` is the same base URL every other client uses: the one ending in `/v1`.
- `ANTHROPIC_AUTH_TOKEN` is a caller key, which starts `sbc_`. Claude Code sends it as `Authorization: Bearer`.
- The key is minted on the API keys page of the account ({{ORIGIN}}/account/api) or from the Remote Omni card in Settings, and it is shown once.
- `superbot-omni` is the model id. `superbot` is the same agent on the default engine.

The same two variables can live in the `env` block of `~/.claude/settings.json`. A project's `.claude/settings.json` is committed with the repository, so a key does not belong there. Claude Code documents both variables and the `env` block at https://code.claude.com/docs/en/llm-gateway-connect (read 2026-10-05). While the variable is set, Claude Code uses it ahead of a saved claude.ai login, and `/status` shows the base URL in use. Unsetting the variable returns Claude Code to the login.

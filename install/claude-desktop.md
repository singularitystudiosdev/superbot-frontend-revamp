# superbot on Claude Desktop

Two routes: the native remote connector first, and the `mcp-remote` bridge as the legacy fallback.

## Connectors (recommended)

Settings → Connectors → Add custom connector, and enter this URL as the remote MCP server:

```
{{MCP_URL}}
```

Connecting opens a browser sign-in for your Superbot account; approve it and the connector is ready.

Connectors are account-wide, so this reaches every conversation. The connection is brokered through Anthropic's infrastructure, which means the server must be reachable from the public internet: a localhost origin will not work here even though the app is local.

Confirm it connected: `superbot` shows under Settings → Connectors, and the tool picker in a conversation lists its one tool. On the config-file route, restart Claude Desktop and the server appears under the developer settings.

## Config file (legacy fallback: the `mcp-remote` stdio bridge)

`claude_desktop_config.json` is a separate mechanism from Connectors: it launches **local stdio** servers and has no native field for a remote HTTP URL. Reaching a remote server from that file needs the `mcp-remote` bridge:

```json
{
  "mcpServers": {
    "superbot": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "{{MCP_URL}}"]
    }
  }
}
```

The file lives at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, and `%APPDATA%\Claude\claude_desktop_config.json` on Windows. Prefer the Connectors route above; this one exists for hosts that cannot use it.

## Cowork

Claude Cowork is a mode of this same app, not a separate install: no `~/.cowork/` or `Claude Cowork/` config exists. It reads the Connectors list above (account-brokered, works in Cowork sessions). The config-file stdio bridge serves Desktop's local sessions; whether Cowork local sessions pick it up has shifted between builds (cloud-first sessions since mid-2026 exclude it: [support.claude.com/en/articles/14479288](https://support.claude.com/en/articles/14479288), retrieved 2026-08-31), so Connectors is the only route that reliably reaches Cowork.

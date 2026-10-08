# superbot over stdio (opt-in)

> Remote HTTP is the default. stdio is for hosts that cannot hold an HTTP MCP.

One tool: `superbot`. It routes a described task to the catalog and runs the match, or answers directly. The tool list is frozen; nothing extra appears because the transport is local.

A stdio host reaches the hosted server through the `mcp-remote` bridge, which runs locally over stdio and forwards to `{{MCP_URL}}`:

```
claude mcp add superbot -s user -- npx -y mcp-remote {{MCP_URL}}
```

Cursor `mcp.json`:

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

superbot writes no rules and no host configuration beyond the config entry above (the bridge itself may keep its own auth cache under `~/.mcp-auth`).

Connecting opens a browser sign-in for your Superbot account.

Confirm it connected: `claude mcp list` shows the local `superbot` entry, and the host's tool list shows the one `superbot` tool.

## Link this host to a superbot account

Remote HTTP hosts: `POST /oauth/device/code`, open `verification_uri_complete` (one click), then `POST /oauth/token` with `{"grant_type":"urn:ietf:params:oauth:grant-type:device_code","device_code":"<from step 1>"}` every ~5s until it returns a Bearer (single successful poll; the grant is one-time). The mint result carries a `tell_user` field holding the confirmation message and, optionally, an email prompt for the `superbot` tool's `account` adapter, `op=email`. Put the Bearer on every later `/mcp` request. A second host repeating this on the same browser cookie joins the same `usr_*`. A host that will not navigate at all: fetch `GET /answer?intent=...` (free adapters, answered as markdown; on beta.superbot.gg and superbot.gg it takes `Authorization: Bearer sbk_…`, and it is keyless only on an origin with no sign-in wall) or send a paste token as `input_responses` on the MCP retry.

Phone / input-constrained: `superbot` with adapter `account` returns a `qr-generate` recipe of `verification_uri_complete`. Type the `user_code` at `/pair` if the link cannot be opened. Other browsers: `/account` + recovery code.

Claude Code already speaks MCP OAuth (RFC 9728). On beta.superbot.gg and superbot.gg an anonymous `/mcp` call, `tools/list` included, answers 401 with an OAuth challenge, so the client signs in first; only an origin with no sign-in wall (self-hosted or overlay) leaves `tools/list` open to a caller that has not signed in.

To send a key over the bridge, add a header the bridge fills from the entry's `env`: `"args": ["-y", "mcp-remote", "{{MCP_URL}}", "--header", "Authorization:${AUTH_HEADER}"]` with `"env": {"AUTH_HEADER": "Bearer <key>"}`. The key to put there is the manual MCP key: a signed-in person opens `{{ORIGIN}}/download#mcp`, presses `copy with key` under "No browser sign-in? Copy a key.", and the copied JSON carries `"headers": {"Authorization": "Bearer <key>"}`; paste what follows `Bearer ` into `AUTH_HEADER`. It is a connector token, good for 90 days on `/mcp` and the `superbot` tool only, never a whole-account key; a new copy replaces the last one, and `/account/devices` revokes it ("Manual MCP key"). The `sbk_` key a `/pair` device link returns also works but is the whole account: send the manual key instead.

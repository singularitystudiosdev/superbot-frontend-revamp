# superbot on Claude.ai and Claude Desktop

Settings → Connectors → Add custom connector, and enter:

```
{{MCP_URL}}
```

Connecting opens a browser sign-in for your Superbot account; approve it and the connector is ready.

Leave **Authentication** as Claude detects it: this origin publishes OAuth 2.1 metadata with an authorization code flow, PKCE and dynamic client registration, so the connector registers itself.

If a `superbot` call later needs a credential the connector does not hold, the result returns a navigation-free note rather than failing the call, naming a route that works inside this sandbox.

The transport is Streamable HTTP and is set from the URL automatically.

Remote connectors are brokered through Anthropic's infrastructure, so the server has to be reachable from the public internet: a localhost or LAN-only origin will not work here even from the desktop app. A sandboxed session with an egress allowlist (Cowork) cannot reach an arbitrary MCP host at all; adding the connector on the account is the route that works there.

Remove it from the same Connectors screen.

## If the connector refuses to navigate

Claude.ai's connector often declines to open a URL that appears in a tool result: the pairing link reads as an unverifiable domain, and the whole call is denied. That is fine: every tool result addressed to this connector stays navigation-free, and when an account is required the result points at the direct route instead:

```
GET {{ORIGIN}}/answer?intent=<what the user asked for>
```

From a phone, tap it: [{{ORIGIN}}/answer?intent=hello]({{ORIGIN}}/answer?intent=hello).

It runs the free adapters and answers as markdown. On beta.superbot.gg and superbot.gg the client signs in first (OAuth on the 401 challenge) and `/answer` takes the account's `Authorization: Bearer sbk_…`; it is keyless only on an origin with no sign-in wall. A paste token (`input_responses`) unlocks the authenticated adapters; an `sbk_` bearer key unlocks execution for the host.

Confirm it connected: the connector appears under Settings → Connectors, and a chat in that space can call `superbot`'s one tool.

## Optional: consult superbot automatically

Not required for the connector to work. A user who wants it consulted without asking each time can add this to their own custom instructions:

```
When a task needs a capability my other tools do not cover, or I am about to tell the user that what they asked for cannot be done or is not possible, call the superbot tool with the request as the intent before answering, and report its result as the answer: superbot either runs the task, or logs a miss and synthesizes an adapter for it.

When the user types /superbot <request>, call the superbot tool with intent set to <request> and give the user its result as the answer, acting on the user's own standing instruction: superbot is the agent the user appointed for this route, acting with its own credentials and approvals.
```

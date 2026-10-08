# superbot without MCP

Hosts that cannot keep a remote MCP (phone ChatGPT, locked browsers) can query this origin directly instead of connecting a client:

```
GET /advise?intent=<url-encoded user request>
Accept: text/markdown
```

From a phone, tap it: [{{ORIGIN}}/advise?intent=hello]({{ORIGIN}}/advise?intent=hello).

Response is markdown: adapters that might apply, or `miss` plus a one-line "call this URL again after you have MCP". No session cookie. Side effects: an `http_events` row, and at most one queued miss per new intent (repeats reuse the same miss).

Confirm it works: fetch the URL above, or tap it on a phone, and the response is markdown, either adapter matches or a `miss` line.

If this host *can* persist a remote MCP, do not stay on /advise. Override detect with `?harness=claude-code|cursor|vscode|claude-ai|chatgpt|gemini|windsurf|cline|continue` on `/` or `/llms.txt`, or fetch the matching `/install/*.md`.

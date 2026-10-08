# Install Superbot on a Muse computer

Muse works on its own Linux computer, so the Superbot Helper installs there. The full steps, what to show the user and troubleshooting are on [the agent install page]({{DOC_ORIGIN}}/agent). This page adds what differs on Muse.

## The command

```sh
O={{ORIGIN}}; V=muse; cd "$(mktemp -d)" && curl -fsSo S "$O/download/helper/asset/sha256sums?via=origin" && curl -fsSo agent-bootstrap.sh "$O/download/helper/agent-bootstrap.sh" && grep '[ *]agent-bootstrap.sh$' S | sha256sum -c >&2 && sh agent-bootstrap.sh --origin="$O" --vendor="$V" --helper-sha256-x64="$(awk '$2=="superbot-helper-linux-x64"{print $1}' S)" --helper-sha256-arm64="$(awk '$2=="superbot-helper-linux-arm64"{print $1}' S)"
```

If the user pasted a command from the Superbot app (it starts with `curl -fsSLo sba.sh`), run that one exactly instead, and never repeat its `--link` value.

Show the user the `SUPERBOT_LINK_URL` it prints to approve, or the `linked` line.

## On Muse

- Sentinel asks before the computer reaches a new host. When it asks about the host in `{{ORIGIN}}`, have the user allow it persistently, not just once: the Helper keeps a connection to that host open for as long as it runs, and re-runs of the command use it too.
- Consumer Muse has no MCP support, so there is no MCP server to add. Use Superbot on Muse through the command line only: the Helper this command installs is all it needs.

## Verify

Run the command again: `SUPERBOT_STATUS=linked` once the user has approved.

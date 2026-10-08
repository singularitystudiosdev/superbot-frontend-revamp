# Install Superbot on a dots computer

dots works on its own Linux computer, so the Superbot Helper can install there. The full steps, what to show the user and troubleshooting are on [the agent install page]({{DOC_ORIGIN}}/agent). This page adds what differs on dots.

## Before you start

The computer needs network access. Ask the user to turn on cloud network access for dots so it can reach the host in `{{ORIGIN}}`. If they would rather not, skip the install and connect Superbot through the plugin or MCP path instead, with the remote MCP server at `{{MCP_URL}}`.

## The command

```sh
O={{ORIGIN}}; V=dots; cd "$(mktemp -d)" && curl -fsSo S "$O/download/helper/asset/sha256sums?via=origin" && curl -fsSo agent-bootstrap.sh "$O/download/helper/agent-bootstrap.sh" && grep '[ *]agent-bootstrap.sh$' S | sha256sum -c >&2 && sh agent-bootstrap.sh --origin="$O" --vendor="$V" --helper-sha256-x64="$(awk '$2=="superbot-helper-linux-x64"{print $1}' S)" --helper-sha256-arm64="$(awk '$2=="superbot-helper-linux-arm64"{print $1}' S)"
```

If the user pasted a command from the Superbot app (it starts with `curl -fsSLo sba.sh`), run that one exactly instead, and never repeat its `--link` value.

Show the user the `SUPERBOT_LINK_URL` it prints to approve, or the `linked` line.

## Verify

Run the command again: `SUPERBOT_STATUS=linked` once the user has approved. A `download_failed` error here almost always means cloud network access is still off.

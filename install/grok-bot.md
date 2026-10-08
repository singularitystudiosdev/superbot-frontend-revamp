# Install Superbot on a Grok Bot computer

Grok Bot works on its own Linux computer, so the Superbot Helper installs there. The full steps, what to show the user and troubleshooting are on [the agent install page]({{DOC_ORIGIN}}/agent). This page adds what differs on Grok Bot.

## The command

```sh
O={{ORIGIN}}; V=grok-bot; cd "$(mktemp -d)" && curl -fsSo S "$O/download/helper/asset/sha256sums?via=origin" && curl -fsSo agent-bootstrap.sh "$O/download/helper/agent-bootstrap.sh" && grep '[ *]agent-bootstrap.sh$' S | sha256sum -c >&2 && sh agent-bootstrap.sh --origin="$O" --vendor="$V" --helper-sha256-x64="$(awk '$2=="superbot-helper-linux-x64"{print $1}' S)" --helper-sha256-arm64="$(awk '$2=="superbot-helper-linux-arm64"{print $1}' S)"
```

If the user pasted a command from the Superbot app (it starts with `curl -fsSLo sba.sh`), run that one exactly instead, and never repeat its `--link` value.

Show the user the `SUPERBOT_LINK_URL` it prints to approve, or the `linked` line.

## On Grok Bot

- Network: the computer needs outbound HTTPS to the host in `{{ORIGIN}}`, nothing else. The allowlist-only network setting exists on Enterprise plans only; there, add that one host to the allowlist.
- After a computer update, run the same command again. The link is kept in `~/.superbot/key.json`, so the re-run only restarts the Helper and does not ask for approval again.
- Grok's docs note that website sign-ins can drop after an update. That does not affect the Superbot link; sites the user was signed in to may need a fresh sign-in.

## Verify

Run the command again: `SUPERBOT_STATUS=linked` once the user has approved.

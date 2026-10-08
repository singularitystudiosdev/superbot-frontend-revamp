# Install Superbot on an agent computer

This page is for an agent that has its own Linux computer: xAI Grok Bot, Meta Muse, OpenAI dots, Manus, or any Linux VM an agent drives. It installs the Superbot Helper on that computer and links it to the user's Superbot account. The user's request usually reads "Install Superbot from superbot.gg/agent".

Vendor notes: [Grok Bot]({{DOC_ORIGIN}}/agent?vendor=grok-bot), [Muse]({{DOC_ORIGIN}}/agent?vendor=muse), [dots]({{DOC_ORIGIN}}/agent?vendor=dots), [Manus]({{DOC_ORIGIN}}/agent?vendor=manus).

## Not for session sandboxes

Codex cloud tasks and Claude Code on the web run in a container that is thrown away when the session ends, so a Helper installed there would be linked to a computer that no longer exists. Do not run the command there. Connect the remote MCP server instead:

- endpoint: `{{MCP_URL}}`
- Claude Code: `claude mcp add --transport http superbot {{MCP_URL}} -s user`
- Codex: add `[mcp_servers.superbot]` with `url = "{{MCP_URL}}"` to `~/.codex/config.toml`

## Prerequisites

- Linux on x86_64 or arm64, with `sh`, `curl` (or `wget`) and `sha256sum`.
- Outbound HTTPS to one host, the one in `{{ORIGIN}}`. Every download below comes from it.
- About 130 MB free under `~/.superbot`.
- No inbound access, no terminal and no browser are needed on the computer.

## The command

Run this as one shell command. Set `V` to `grok-bot`, `muse`, `dots` or `manus`, or leave it empty.

```sh
O={{ORIGIN}}; V=grok-bot; cd "$(mktemp -d)" && curl -fsSo S "$O/download/helper/asset/sha256sums?via=origin" && curl -fsSo agent-bootstrap.sh "$O/download/helper/agent-bootstrap.sh" && grep '[ *]agent-bootstrap.sh$' S | sha256sum -c >&2 && sh agent-bootstrap.sh --origin="$O" --vendor="$V" --helper-sha256-x64="$(awk '$2=="superbot-helper-linux-x64"{print $1}' S)" --helper-sha256-arm64="$(awk '$2=="superbot-helper-linux-arm64"{print $1}' S)"
```

It fetches the release checksums and the Helper's install script from `{{ORIGIN}}`, checks the script against its checksum line, and runs it. The script downloads the Helper build for this computer's `uname -m`, checks it against the pinned sha256, installs it at `~/.superbot/bin/superbot-helper`, starts it in the background and asks for a link. It finishes in about 30 seconds and never reads from a terminal.

Where `{{ORIGIN}}/bootstrap.sh` answers (a self-hosted origin, or once the beta opens), `curl -fsSL {{ORIGIN}}/bootstrap.sh | sh -s -- --agent=grok-bot` runs the same steps and also refuses to run in a session sandbox.

A computer linked this way gets link-level access. The checks prove the bytes match what `{{ORIGIN}}` serves over TLS, nothing more, so this path is never granted access to the user's data. That access comes only from the command the Superbot app hands out.

## If the user pastes a command from the Superbot app

It starts with `curl -fsSLo sba.sh` and carries `--link=lnk_…`. Run it exactly as given, as one command, instead of the command above. The app pinned every download to a hash it verified, and the one-time link carries the access the user approved in the app. Never print, log, store or repeat the `--link` value.

## What to show the user

Standard output is one block of `KEY=value` lines. Progress goes to standard error.

```
SUPERBOT_BOOTSTRAP=v1
SUPERBOT_STATUS=awaiting_approval
SUPERBOT_LINK_URL=https://…/approve?user_code=…
```

- `awaiting_approval`: give the user `SUPERBOT_LINK_URL` and ask them to open it where they are signed in to Superbot and approve this computer. Then run the same command again.
- `linked`: tell the user it is linked, with the masked account from `SUPERBOT_LINKED_TO` when present.
- `error`: show `SUPERBOT_ERROR` (a code, then a message) and check Troubleshooting.

One line is enough, for example `Superbot Helper: linked to a***@example.com`, or `Superbot Helper: approve this computer at <SUPERBOT_LINK_URL>`.

## Verify

Run the same command again. With the Helper already current it downloads nothing, and once the user has approved it prints `SUPERBOT_STATUS=linked`. To check the Helper process itself:

```sh
kill -0 "$(cat ~/.superbot/agent-helper.pid)" && echo running
```

## Re-running

Running the command again is safe. When the computer is already linked (`~/.superbot/key.json` exists) it only restarts the Helper and never links again. To link to another account, add `--relink` after `sh agent-bootstrap.sh`. Running it again is also how the Helper updates to a new release, and what to do after the computer restarts or is updated.

## Troubleshooting

- `download_failed`, curl exit 6, 7 or 28, or a 403 from a proxy: the computer cannot reach `{{ORIGIN}}`. Allow that one host in the computer's network settings; no other host is needed. Behind a proxy, set `HTTPS_PROXY` (and `https_proxy` for wget) before the command. `curl -fsS -o /dev/null {{ORIGIN}}/download/helper/latest.json && echo reachable` tells you whether the host is reachable. Once the Helper is installed, `~/.superbot/bin/superbot-helper doctor --egress` (on a Helper that has it) reports what the Helper itself can reach.
- `download_incomplete`: the Helper download (about 125 MB) ran out of time. Run the command again; it resumes where it stopped.
- `hash_mismatch`, or `sha256sum: WARNING`: the bytes changed on the way, usually a proxy or cache. Nothing was installed. Run it again; if it repeats, something on the network is rewriting downloads.
- A 404 on `agent-bootstrap.sh`, or `release_unsigned`: the current Helper release predates this install path. Try again after the next release.
- A 401 on a download: that origin does not serve the Helper to this computer. Use the origin this page names in the command.
- `start_failed`: the Helper exited as it started. The end of `~/.superbot/agent-helper.log` says why.
- `link_timeout` or `link_unavailable`: run the command again.
- `unsupported_os` or `unsupported_arch`: the Helper for agent computers ships for Linux on x86_64 and arm64 only.

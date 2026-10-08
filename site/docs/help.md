### Troubleshooting

Fixes for what goes wrong after you install the Helper.

If superbot seems down, check [status.superbot.gg](https://status.superbot.gg).

#### My AI client does not show superbot

Restart the client. If it still lists no superbot tool, run `superbot clients wire` to route every client the Helper finds.

#### superbot: command not found

Paste the activation line the installer printed at the end. In sh, bash and zsh it is `export PATH="$HOME/.superbot/bin:$PATH"`.

#### The installer did not sign me in

Run `superbot signin`. It opens your browser to sign in.

#### My caller key is refused

A 401 means the key is missing or malformed, and a 403 means it was revoked or does not allow that model. Mint a new key in [Keys and authentication](#api-auth).

Related: [Your AI clients](#clients)

### Remote SSH projects

A project on an SSH host keeps its files, terminal and agents on that box.

Click + and pick **Connect to an SSH host**, then choose a host or type `user@host`.

#### The chat shows a connection error

- **SSH sign-in failed**: enter the password, or add your key to ssh-agent or pick one for this host.
- **Host key rejected**: the box's host key differs from the one you accepted. Check the fingerprint, then retry.
- **Box unreachable**: the box did not answer. Check that it is on and reachable from your computer.
- **Box platform unsupported**: the box needs Linux with glibc 2.28 or newer, or macOS, on x64 or arm64. Alpine and other musl Linux do not work.
- **Box has no internet**: the box cannot download the Helper.
  **Send from this computer** (Send from this Mac on a Mac) copies it over.
- **Port forwarding blocked**: allow `AllowTcpForwarding` in `sshd_config` on the box, then retry.
- **Login shell prints output**: stop the shell profile or login banner from printing on connect, then retry.
- **Engine missing on box**: **Reinstall Helper** puts the engine back.
- **OpenSSH too old**: update OpenSSH on your computer to 8.7 or newer, then retry.

### Uninstall

`superbot uninstall` deletes superbot and everything it left on your machine: the Helper, the desktop app and its data, superbot's own entries in your AI clients, and your local accounts, chats and keys.

You sign in again after a reinstall. `superbot uninstall --dry-run` lists what would go and deletes nothing. A script with no terminal has to pass `--yes`.

To remove one client by hand, run `claude mcp remove superbot` for Claude Code, or delete the `superbot` entry from that client's config file. Nothing else was installed.

Related: [Your AI clients](#clients)

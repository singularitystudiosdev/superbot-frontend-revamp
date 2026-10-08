### Desktop and phone apps

The desktop and phone apps run on one account, so a chat you start on one device keeps going on the other.

1. Download the app on each device from [Download superbot](/download).
2. Sign in with the same email on both.

The **Sync chats across devices** switch in **Settings > Privacy** stores your chats on superbot's servers so your other devices see them, and **Sync projects across devices** turns project sync on or off. **Sync now** on a project pushes it at once.

### superbot relay

The superbot relay app switches which engine answers `claude` on this computer, for people who keep their own agent app.

1. Install it from [Install](#install) or [Download superbot](/download#helper).
2. Choose **Omni** under **What claude runs**, or run `superbot engine on`. Until you choose, `claude` runs Claude Code.
3. Run `superbot engine off` to go back. `superbot engine restore` puts your original launcher back exactly, and uninstall does too.

The launcher takes Claude Code's own launcher slot, `~/.local/bin/claude`, and never renames or edits the Claude Code binary. With Omni on, only one-shot `claude -p` calls with flags Omni knows run on it. Interactive `claude`, subcommands and anything else run Claude Code, and so does every call while the Helper is down.

**Pays for model calls** reads **Superbot credits** by default. **Your Claude plan** is opt-in, with a one-line notice.

Agent SDK apps do not reach the launcher through PATH, and Omni does not serve SDK calls yet, so they run on Claude Code today. To point one at the launcher, set `cli_path` in the Python SDK or `pathToClaudeCodeExecutable` in the TypeScript SDK.

The app has a **Tidy** setting too, covered in [Tidy mode](#tidy).

### Helper and CLI

The Helper pairs your computer to your account and connects your AI clients, and you control it with the `superbot` command.

1. Run `superbot signin`. It opens your browser to pair the computer.
2. Run `superbot status` to see what the Helper is doing.
3. Run `superbot session` to chat with your agent in the terminal.

The desktop app carries the app's own update; `superbot update` updates the Helper alone. `superbot uninstall` asks first, then removes the Helper and the desktop app along with the data they hold on this computer. `superbot uninstall --dry-run` lists what would go without deleting anything.

Related: [Uninstall](#uninstall)

### Your AI clients

The Helper finds the AI clients on your computer, such as Claude Code and Cursor, and routes each one through your account.

1. Install the app, or run the Helper line from [Start here](#start).
2. Restart the client and ask what superbot tools it has. The answer includes `superbot`.

Each client also has its own recipe: [Claude Code](/install/claude.md), [Cursor](/install/cursor.md), [VS Code](/install/vscode.md), [Codex](/install/codex.md), [Gemini CLI](/install/gemini.md) and [Claude Desktop](/install/claude-desktop.md). A client with no recipe connects with an API key. [Your connection](#connection) lists the base URL and models, and [Keys and authentication](#api-auth) covers the key.

Related: [Set up your clients](/clients)

### Super mode and swarms

One message goes to a team of agents that run on your connected subscriptions and report what each one cost.

- In the composer, set **Super** to **On**. The phone has the same toggle.
- In `superbot session`, type `/super on`.

Each agent narrates its plan and posts an update at each milestone.

### Daemon mode and parked chats

An agent keeps watching on a schedule while you are away, and a parked chat waits for one thing before it carries on.

#### Daemon mode

1. Open the composer's mode menu and choose **Daemon**, or type `/daemon` followed by what to watch.
2. Send your message to start the watch. A daemon watches up to 5 chats at once.
3. Use **Pause** and **Resume** in the status line under the composer.
4. To stop, choose **Agent** in the mode menu or type `/daemon` again.

On the phone, the Options sheet has the same **Daemon** row, and the desktop app runs the checks.

#### Park and resume

When an agent has to wait, it parks the chat, and superbot wakes it when the wait is over. A banner above the composer reads **Parked:** with what the chat waits for.

- **Resume now** wakes the chat at once.
- **Cancel wait** drops the wait.

On the phone, the same banner shows **Resume now** and **Cancel wait**.

Related: [Fleet board](#fleet)

### Fleet board

One screen lists every agent working for you, on all your devices and in the cloud.

1. Open **Fleet** from the command palette or the **View** menu, or press `⌘⌥F` on a Mac or `Ctrl+Alt+F` on Windows.
2. Find a row under **Needs you**, **Running**, **Waiting** or **Done**, and press it to open its chat.
3. Press **Stop** on a running row to end its turn or cloud run.

On the desktop, filter the board by **App**, **Project** or **Device**. On the phone, open Settings, then **Your agent**, and under **General** open **Fleet**.

### Plan card, race and checkpoints

An agent shows its plan before it changes anything, and checkpoints rewind a bad result.

#### Plan card

1. Choose **Plan** in the composer's mode menu, or type `/plan` followed by your request.
2. Press **Build** on the plan card to carry it out.

#### Race

**Build in parallel** runs the plan on up to four coding agents installed on this computer, each in its own copy of the project. Press **Merge this** on the column you want to keep, or **Stop race** to cancel.

#### Checkpoints

Checkpoints snapshot the chat and the project each time you send a message. They are on by default.

1. Hover a message of yours and press **Revert to here**.
2. Choose **Revert chat and files**, **Revert chat only** or **Restore files only**.
3. Press **Undo revert** to bring the messages back until your next message.

The switch is **Checkpoints** in **Settings > General**, in the **Advanced** fold. On the phone, a revert restores files through the desktop app while it is online.

#### Branch a chat

Type `/branch` or `/fork` to copy the chat into a new one and switch to it. To cut at an earlier reply, hover it and press **Branch**.

### Routines

A routine runs a standing instruction on a schedule you describe once, such as every weekday at 07:00.

1. Describe it in any connected client, for example "every weekday at 07:00, summarise my inbox".
2. Say "list my routines", or name one and say "pause it", "resume it", "change it" or "delete it".

superbot stores the routine and delivers each result by text message or push. A routine runs on superbot's servers, so your computer does not need to be on. Open **Routines** from the command palette, press **New routine** and fill in the form. **Run now** runs a saved routine once. On the phone, open Settings, then **Your agent**, and under **General** open **Routines**.

### Context and imported chats

The context optimizer trims each turn before it reaches the model, and your account remembers the preferences you state.

- A preference you state once applies in later sessions on all your devices.
- Chats you import from other apps are stored on superbot's servers, and superbot searches and summarises them when you ask in a connected client.

Related: [Import chats from other apps](#import), [Tidy mode](#tidy)

### Tidy mode

Tidy keeps each turn short by pasting in the rules and skills your task needs and linking the rest.

1. Open **Settings > Context**.
2. Under **How should Superbot use your setup?**, choose **Tidy it for Superbot chats**.
3. Open the **Advanced** fold. **Per app** sets **Tidy**, **Keep as is** or **Default** for each app.
4. Press **Undo** beside **Rules up front** to restore the setup you had.

In one benchmark run, Tidy sent 77% fewer rule tokens on the first call than sending your full setup.

Tools and the system prompt are not counted.

On the phone, open Settings, then **Your agent**, and find the **Context** block.

### Import chats from other apps

Bring the chat history you already have in other AI apps, such as ChatGPT, into superbot, where it shows in that app's **Chats** list.

Imported chats are stored on superbot's servers and readable by superbot.

1. On the desktop, open **Settings > Privacy** and tick the app under **Chats**, or turn on **Vendor chats** for every app.
2. Press **Add** in the sidebar, then **Connect an app…**, and pick the app.
3. For an app that keeps its chats on your computer, press **Import chats**.

On an app's **Chats** list, **Resync** scans again, and **Choose a file…** imports a data export when the app offers one. On the phone, open History, press **Import a shared chat**, paste a ChatGPT or Claude share link and press **Import**.

Related: [Context and imported chats](#context)

### Your MCP servers

superbot installs and checks the MCP servers your agents use.

1. Ask for the capability in plain words, for example "add a Linear tool". The agent searches MCP registries and offers the best match.
2. Approve the install when the agent asks.
3. On the desktop, open **Settings > Tools & MCP** to see every server and whether it works. **Add a tool** adds one by hand, by **HTTP URL** or **Command**.

A row that needs you has an action such as **Sign in** or **Approve change**. If an installed server later changes a tool, its tools stay held back until you press **Approve change**.

On the phone, open Settings, then **Connections**, and find **Tools & MCP**.

From a terminal, `superbot mcp list` shows each server's state and tool count, and `superbot mcp remove <id>` removes one.

Related: [MCP server and its tool](#tool)

### MCP server and its tool

Any MCP client that connects to superbot gets one tool, `superbot`, that takes a request in plain words and does the work.

To connect one client straight to the server, ask a coding agent to install the superbot MCP server globally, then to install the superbot skill globally. Then type `/superbot` in your agent. In Codex, type `$superbot`.

To add it to Claude Code by hand, run `claude mcp add` with the server URL. The server URL is under [Your connection](#connection). No browser? Signed in, [copy a key](/download#mcp).

Then ask for something in plain words, such as "summarise my unread email", and the client calls `superbot` with your words.

Related: [Your AI clients](#clients)

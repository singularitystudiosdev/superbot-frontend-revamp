### Built-in tools

Every agent starts with the same tools, so one ask can research a topic and hand back a finished file.

- **Web** search and page reading, with a browser for pages that need JavaScript and web archives for pages that are gone.
- **Research** searches scholarly papers and code repositories, and writes a cited report.
- **Files** builds a spreadsheet with live formulas, a document, a deck or a PDF.
- **Media** makes images, video and audio on your own accounts.
- **Browser and screen** works sites you are signed into and, when you allow it, any app on your screen.

Related: [Your browser and your screen](#computer), [Media on your own accounts](#media)

### Browser sessions and logins

Your agent works the sites you are signed into, using sessions the Helper reads from your own browsers.

1. Sign in to the site in your browser.
2. Ask your agent to use the site. The Helper reads your browsers only after you allow it. On a Mac it reads Chrome, Brave, Edge, Arc, Vivaldi, Firefox and Safari.
3. To import one site yourself, run `superbot cookies <domain>`. Add `--dry-run` to write nothing or `--yes` to skip the prompt.

Saved logins import from your browsers and from 1Password, Bitwarden, LastPass and KeePass. To switch a read off, open **Settings > Privacy** and use **Browser sign-ins** or **Passwords and SSH keys** under **What Superbot can read on this computer** (**this Mac** on a Mac).

### Your browser and your screen

Your agent browses websites for you, for example to order food, and with your permission works any app on your screen.

On the desktop, the chip in the **Browser** pane's address bar picks where agent pages open: **Cloud**, or **This Mac** (**This computer** on Windows). **My IP** sends the cloud browser's traffic out through your computer's connection, so sites see your own address.

Computer use works on macOS only and has three settings. **Off** never touches your screen, **Ask** asks before each action, and **Always** acts without asking. It starts at Off.

1. Press the computer use toggle in the composer to move through **Off**, **Ask** and **Always**.
2. The first time, **Turn on computer use** asks for **Accessibility** to click and type and **Screen Recording** to take screenshots.

When it is Off and a task needs your screen, the agent asks **Turn on computer use: <reason>**. Choose **Allow in this chat**, **Always allow** or **Not now**.

Related: [Download superbot](/download)

### Live view and remote control

From another device, you watch the screen of the device that did your task and take its controls.

1. From one device, ask another to do something, for example from your phone to your computer. The reply shows a tile with **Watch live**.
2. Press **Watch live**. The other device opens as live video.
3. Choose **Observe** to watch or **Control** to click and type. **End** closes the viewer.

The viewed computer shows a banner naming the device, with **Stop Sharing**. To change what it allows, open **Settings > Privacy** and find the **Live view** group:

- **Let your other devices view and control this computer** turns Live view on or off. It is on by default.
- **Require approval on this computer** asks on this computer before another device can view or control it. It is off by default.

A device you have not allowed opens view only. Press **Allow** on the viewed computer, then reconnect to take control. A device added to your account in the last 24 hours starts this way.

### Media on your own accounts

An agent makes images, video and audio when you describe them, and runs them on your own accounts before superbot's.

- **Images** use your ChatGPT plan or your OpenAI, Gemini or Grok key. A ChatGPT Free plan cannot make images, so superbot tries your key next.
- **Video** uses your OpenRouter key, or your own Google key (Veo) or xAI key (Grok Imagine).
- **Audio** uses your OpenAI or Gemini key.

Connect accounts in **Settings > Subscriptions & keys**. On the phone, open **Settings > Connections**.

### Calls and texts from your phone

Your agent calls and texts people from your own iPhone number, and a text to superbot's own number gets its answer back as a text.

This needs a Mac with the Helper running, an iPhone paired to it, and Messages signed in to your Apple Account on the Mac.

1. Open **Settings > Devices & phone**. Under **Phone line**, the chip reads **Calls and texts from your iPhone** when setup is done.
2. Finish the setup it lists: **Allow Messages**, then **Open Full Disk Access**. For calls, also choose **Superbot Call Mic** as the microphone in Phone.
3. Ask: "call the dentist and ask for the first free slot".

Every call and text asks you first. If Phone.app needs it, you tap **Call** once on your Mac. The same number is called at most once in 24 hours. **Open calls…** under **Phone line** lists what your agent made.

To text superbot, text its number: the desktop **SMS** pane shows **Text <number> to link a phone**. On the phone, open **Settings > Devices & phone > Text Superbot**.

Related: [Text Superbot](/sms), [Endpoints](#api-endpoints)

### Voice chat and dictation

Talk to an agent and hear it answer, or dictate a message instead of typing it.

#### Voice chat

1. On the desktop, press **Voice** in the composer, or choose **Start voice chat** in the File menu (`⌘⇧O` on a Mac, `Ctrl+Shift+O` on Windows). On the phone, press **Voice** in the composer.
2. Talk. The control shows what is happening, from **Listening** to **Speaking**.
3. Press **End voice** to finish.

To use your own voice, open **Settings > Voice**, press **Record my voice** under **Your voice**, read for up to 60 seconds, tick **My voice, or I have permission**, then choose **My voice**. The sample goes to ElevenLabs and the voice is AI-generated.

#### Dictation

1. Press the microphone in the composer (**Click to speak**) and talk. It reads **Listening. Click to stop.**
2. The text lands in the message box, ready to edit.
3. To choose where speech becomes text, open **Settings > Voice** and set **Dictation engine**. **On this Mac** (**On this computer** on Windows) keeps the audio on it, and **Superbot cloud** sends it to the speech provider.

### Quick Ask

On the desktop, one shortcut opens a small panel from any app that answers about the window you were using.

1. Press `Alt+Space` (`⌥Space` on a Mac) from any app, or choose **Quick Ask** in the File menu.
2. Type your question under **Ask anything**. A chip shows the app and window you came from.
3. Press **Expand to full chat** to carry on in the full app. Escape hides the panel and keeps your draft.

Quick Ask attaches a screenshot only when you press **Screen snapshot**. To change the shortcut, open **Settings > Shortcuts** and press **Record** in the **Quick Ask** group. **Restore default** goes back.

### Build, edit and preview

On the desktop, you run a live copy of what your agent builds and change its files without leaving the app.

1. Press **Preview** in the project header, beside **Publish**. The app runs the project on your computer and opens it in the side pane. **Stop** ends it.
2. Open a project file to edit it. **Save** writes it, **Format** formats it, and **Diff** and **File** switch the view.
3. For a page or document the agent made in a chat, press **Open in pane**. In the pane, **Edit** changes it in place and **Done** finishes. **View code** shows the source and **Download** saves it.

Related: [Publish your app](#publish), [Download superbot](/download)

### Publish your app

Your app goes online at a free `<name>.superbot.sh` address on your own Cloudflare account.

This needs a free Cloudflare account. The first time, **Connect Cloudflare** opens a dialog: press **Continue to Cloudflare**, sign in, then pick **Use this account**.

1. Open a project and press **Publish** in its header.
2. Pick a name. Under **Who can open it?** choose **Anyone** or **Only people I invite**.
3. Press **Put it online**. Publish checks the app and tests it on your computer first. Later publishes read **Update live app**.

Once it is live, the **Live** tab on the project manages it. **Versions** keeps every publish and **Roll back** returns to an older one. **Domains** renames the address or adds your own. **Keys** stores the secrets your app reads. **Remove app**, under **Take it offline**, deletes the app and its data for good.

Type `/publish` in a chat to have your agent publish the project.

Related: [Build, edit and preview](#build), [Download superbot](/download)

### Cloud runs from your phone

Your phone sends a task to a cloud copy of your project, and the files it changes sync back to your computer.

This needs **Sync projects across devices** on in **Settings > Privacy**, under **Advanced**, and sync on for the project. Without it the phone says **Turn on sync to work in the cloud.**

1. On the phone, open a chat in the project and press **Run in cloud** in the thread header.
2. The next time the Helper syncs, the changed files land in your local folder.

On the desktop, press **Build in cloud** on the plan card. It stays off until the project is linked to a repo, with the reason **Link a repo to this project first**.

In a repo-linked project, if you edited a file the cloud also changed, yours stays and the cloud's version lands beside it as `notes.sync-conflict-20261004-101500-cloud.md`.

Related: [Download superbot](/download)

### Phone extras

On iPhone, you start a chat from the home screen or the Action Button, and the Lock Screen shows a running agent.

- **Home-screen shortcuts**: press and hold the superbot icon for **New chat**, **Ask by voice** and **Voice chat**.
- **Action Button**: in the iOS Settings app, open **Action Button**, choose **Shortcut**, then pick **New chat** or **Start voice chat** from superbot.
- **Lock Screen and Dynamic Island**: show **Superbot is working** while an agent runs and **Waiting for you** when it needs you.
- **Notifications**: in Settings, on **Your agent**, under **General**, switch **Push when Superbot finishes** and **Push when Superbot needs you**. Both are on by default.
- **Offline reading**: chats stay readable on the phone without a connection.

Related: [Voice chat and dictation](#voice-chat), [Download superbot](/download)

### The omni engine

omni is superbot's own agent loop: it sends your turn to the model, runs the tools it asks for and repeats until done.

It drives any model behind the OpenAI or Anthropic API with the same tools, including the models on your custom endpoints. To compare two models, pick each in the model picker and send the same task.

Related: [Custom endpoints](#external-apis), [Models](#api-models)

### Teams and policy

A team shares MCP servers, rules and skills across its members and applies one signed policy to every member's devices.

1. Open **Account > Teams** and press **Create team**.
2. Under **Members**, enter an email, pick a role below your own and press **Invite**.
3. Owners and admins see the **Policy and coverage** card. It reads a count such as **3 of 5 reported** once a policy is published, and marks a member whose devices have not reported as **not reported**.

An owner or admin publishes the signed policy through the org API. Until then the card reads **No policy published yet.**

Related: [Teams and enterprise](/enterprise)

### Usage and spend

See what your agents used and what it cost, for the last 7 days by default.

Open **Account > Usage** to read it, and pick a longer range there. To cap a caller key, set **Daily limit** or **Monthly limit** in credits when you mint it under **Account > API**. A key that reaches a limit is refused until the window resets.

Related: [Keys and authentication](#api-auth), [Endpoints](#api-endpoints)

### Custom endpoints

Add any OpenAI- or Anthropic-compatible endpoint to the model picker and dial it with your own superbot key beside the house models.

1. Open **Settings > Subscriptions & keys** and find the **Custom endpoints** group (formerly **External APIs**).
2. Press **Add endpoint** (**Add an endpoint** on an empty list).
3. Under **Where it is saved**, pick **Hosted endpoint** so every device on your account can dial it, or **This Mac** (**This computer** on Windows) to keep it on this computer.
4. On the hosted path, enter a **Label**, the **Base URL** and the **API key**.
5. Set **Dialect** to **Auto**, **OpenAI** or **Anthropic**, then press **Add endpoint**.

Models load when the endpoint answers `/models`, and **Refresh models** reloads them. **Scan for keys**, under **Found on this Mac** (**Found on this computer** on Windows), finds API keys already on this computer and offers each one as an endpoint. On the phone, open **Settings > Connections** and choose **Custom endpoints**.

Related: [Models](#api-models), [Keys and authentication](#api-auth)

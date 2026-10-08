# superbot docs

superbot manages the AI agents you use, running them on the vendor accounts you already pay for. The full documentation is at {{ORIGIN}}/docs, and as markdown at {{ORIGIN}}/docs.md.

## Install

On macOS and Linux, run the installer:

    curl -fsSL {{ORIGIN}}/bootstrap.sh | sh

On Windows, run `irm {{ORIGIN}}/bootstrap.ps1 | iex`. The default route installs the Helper, opens a browser to sign you in, wires each AI client it finds and finishes with the desktop app. Add `--no-app` (`-NoApp` on Windows) to install the Helper and CLI alone, and run the installer again to update.

The second route is superbot relay: use your own harness. It installs the Helper plus the standalone superbot relay app in place of the desktop app, with the same sign-in and client wiring:

    curl -fsSL {{ORIGIN}}/bootstrap.sh | sh -s -- --helper-app

On Windows, run `& ([scriptblock]::Create((irm {{ORIGIN}}/bootstrap.ps1))) -HelperApp`. Its card on {{ORIGIN}}/download#helper appears once the app has a release, and a computer with no release for it gets the Helper and CLI, with a line saying so.

To connect one client straight to the MCP server, paste this to a coding agent:

    install the superbot MCP server globally: {{MCP_URL}}

It fetches {{ORIGIN}}/llms.txt and follows the recipe for its own client.

## Verify

Restart an AI client the installer wired and ask it what superbot tools it has. It lists one tool, `superbot`.

## API

{{PART:api}}

## Billing

{{PART:billing}}

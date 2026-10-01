# Zoho Workspace for Grok Bot and Cursor

Open-source Agent Plugin that connects [Grok Bot](https://cursor.com/docs/plugins) and Cursor to Zoho Workspace: **Mail**, **Calendar**, **WorkDrive**, and **Cliq**.

Publisher: **CurryByte Innovations**. License: [MIT](LICENSE).

There are two ways to connect:

1. **Hosted Zoho MCP (default).** You create a server at [mcp.zoho.com](https://mcp.zoho.com) (or your regional data center), add Workspace tools, and paste the secret Connect URL into `ZOHO_MCP_URL`. The plugin points Cursor and Grok Bot at that URL. Zoho hosts the MCP server and runs OAuth.
2. **Self-hosted MCP (`./server`).** A Node.js server in this repo calls the public Zoho REST APIs with a refresh token. Use this when you want the tools to run on your machine instead of on Zoho's MCP host.

Submit the public repo for review at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). Marketplace listings must be open source and are reviewed manually.

## Prerequisites

- A Zoho account in the data center where your Mail, Calendar, WorkDrive, and Cliq orgs live.
- For hosted mode: permission to create a server in Zoho MCP.
- For self-hosted mode: Node.js 20 or newer, and a Zoho API Console client with a refresh token. See [server/README.md](server/README.md).

## Hosted mode: create the Zoho MCP server

1. Open [mcp.zoho.com](https://mcp.zoho.com), or the host for your data center (`mcp.zoho.in`, `mcp.zoho.eu`, and the other regional MCP sites Zoho provides).
2. Create an MCP server.
3. Add the Workspace tools you want the agent to use: Mail, Calendar, WorkDrive, and Cliq.
4. Copy the **Connect** URL. It looks like `https://[name]-[org].zohomcp.com/mcp/[key]/message` (the host can be a regional `zohomcp` domain).
5. Keep that URL secret. Anyone who has it can start the OAuth flow for that server.

Zoho's client setup guide: [Zoho MCP implementation guide](https://help.zoho.com/portal/en/kb/mcp/implementation-guide/articles/zoho-mcp-implementation-guide).

## Install in Grok Bot or Cursor

Grok Bot plugins and Cursor plugins are the same package. This repo is an [Agent Plugin](https://agent-plugins.org/specification): `plugin.json` and `mcp.json` live at the repository root.

`mcp.json` connects a streamable HTTP server named `zoho-workspace` to `${ZOHO_MCP_URL}`.

`ZOHO_MCP_URL` is declared for Cursor under `extensions.com.cursor.variables` in `plugin.json` (title **Zoho MCP Connect URL**). The Agent Plugins 1.0 manifest schema does not allow a top-level `variables` field, so the install variable lives in that extension. The value is required. Its description is: create a server at mcp.zoho.com or your regional data center, add Mail, Calendar, WorkDrive, and Cliq tools, then copy the Connect URL.

After the listing is approved:

1. In Cursor, open **Customize** and add **Zoho Workspace** from the marketplace.
2. In Grok Bot, open **Settings → Plugins** and add **Zoho Workspace**.
3. When asked, set **Zoho MCP Connect URL** to the Connect URL from the Zoho MCP console.
4. Enable the `zoho-workspace` MCP server and choose **Authorize**. Complete Zoho's OAuth screen. Tools appear only after that grant.

If the client does not prompt for the variable, install a local copy and put the URL directly in `mcp.json` (next section). Do not commit that copy.

## Test locally

Cursor loads plugins from `~/.cursor/plugins/local` when local plugin imports are allowed.

```bash
mkdir -p ~/.cursor/plugins/local
cp -R . ~/.cursor/plugins/local/zoho-workspace
```

Edit `~/.cursor/plugins/local/zoho-workspace/mcp.json` and replace `${ZOHO_MCP_URL}` with your Connect URL. Reload the window (**Developer: Reload Window**), then open **Customize** and confirm the Zoho Workspace skills and the `zoho-workspace` MCP server. Authorize when Cursor connects.

On Teams and Enterprise, an admin may need to allow local plugin imports. A marketplace plugin with the same name takes precedence over the local copy.

## What the agent should do

Skills in `skills/` tell the agent when to use Mail, Calendar, WorkDrive, and Cliq. Tool names on the hosted Zoho MCP server are whatever you enabled in the Zoho MCP console. The agent must read the live tool list. It must not guess tool names.

The self-hosted server has a fixed tool list, documented in [server/README.md](server/README.md).

## Self-hosted server

```bash
cd server
npm install
npm run build
```

Configure `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, and optional `ZOHO_DC` (`com` by default). Then point Cursor at the stdio binary:

```json
{
  "mcpServers": {
    "zoho-workspace": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/absolute/path/to/zoho-workspace-grok-bot-plugin/server",
      "env": {
        "ZOHO_CLIENT_ID": "YOUR_CLIENT_ID",
        "ZOHO_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "ZOHO_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN",
        "ZOHO_DC": "com"
      }
    }
  }
}
```

API Console setup, scopes, and the REST paths this process calls are in [server/README.md](server/README.md).

`npm publish` for the `zoho-workspace-mcp` package is a follow-up. This repo does not publish it for you. See that README before you publish.

## Security

- The Zoho MCP Connect URL is a credential. Do not commit it, paste it into issues, or put it in a screenshot of `mcp.json`.
- Self-hosted mode uses a refresh token and client secret. Those stay in the MCP client environment or a local untracked `.env`. `.gitignore` ignores `.env`.
- `health` and `whoami` refresh the access token and return data center and account metadata. They do not return the access token.
- Sending mail, creating events, and posting Cliq messages are real actions. Confirm them before the agent runs those tools.

## Layout

```text
plugin.json
mcp.json
skills/
  zoho-workspace/SKILL.md
  zoho-mail/SKILL.md
  zoho-calendar/SKILL.md
  zoho-workdrive/SKILL.md
  zoho-cliq/SKILL.md
server/          # self-hosted MCP
LICENSE
CONTRIBUTING.md
```

## License

MIT. Copyright (c) 2026 CurryByte Innovations.

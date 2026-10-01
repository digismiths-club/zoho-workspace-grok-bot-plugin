# zoho-workspace-mcp

Self-hosted [Model Context Protocol](https://modelcontextprotocol.io) server for Zoho Mail, Calendar, WorkDrive, and Cliq. It is the `server/` package in the [Zoho Workspace Grok Bot plugin](https://github.com/digismiths-club/zoho-workspace-grok-bot-plugin).

The hosted plugin mode (a Zoho MCP Connect URL) does not use this process. Use this server when you want the tools to run locally with your own OAuth client.

Node.js 20 or newer. HTTP calls use `fetch`.

## Setup

```bash
cd server
npm install
npm run build
```

`npm start` runs `node dist/index.js` over stdio. Cursor and other MCP hosts launch that command themselves.

Environment:

| Variable | Required | Purpose |
| --- | --- | --- |
| `ZOHO_CLIENT_ID` | yes | API Console client id |
| `ZOHO_CLIENT_SECRET` | yes | API Console client secret |
| `ZOHO_REFRESH_TOKEN` | yes | Offline refresh token |
| `ZOHO_DC` | no | `com` (default), `in`, `eu`, `com.au`, `jp`, `ca`, `sa`, or `ae` |

Copy `.env.example` to a private file for your own notes. This process does not load `.env`. Put the values in the MCP client's `env` block. `.gitignore` ignores `.env`, `node_modules`, and `dist`.

### Cursor stdio config

```json
{
  "mcpServers": {
    "zoho-workspace": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/absolute/path/to/server",
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

The binary name after a global install is `zoho-workspace-mcp`.

## API Console and refresh token

1. Open the [Zoho API Console](https://api-console.zoho.com/) in the same data center as the user. From another DC, start at `https://accounts.zoho.<dc>/developerconsole` (Canada: `https://accounts.zohocloud.ca/developerconsole`, UAE: `https://accounts.zoho.ae/developerconsole`).
2. Create a **Self Client** for a personal script, or a **Server-based** client if you have a redirect URL.
3. Generate a grant code with the scopes below and offline access.
   - Self Client: **Generate Code**, paste the scopes, set a duration, and copy the code.
   - Server-based: send the user to `{accounts}/oauth/v2/auth` with `response_type=code`, `access_type=offline`, `prompt=consent`, your `client_id`, `redirect_uri`, and `scope`.
4. Exchange the code with `POST {accounts}/oauth/v2/token` and `grant_type=authorization_code`, plus `client_id`, `client_secret`, and `code` (and `redirect_uri` for a server-based client).
5. Store `refresh_token` as `ZOHO_REFRESH_TOKEN`. The server later refreshes it with `POST {accounts}/oauth/v2/token` and `grant_type=refresh_token`.

Accounts hosts are listed in [Multi DC support](https://www.zoho.com/developer/oauth/multi-dc-support.html). UAE accounts use `https://accounts.zoho.ae`. Canada accounts use `https://accounts.zohocloud.ca`.

### Scopes

Request only what you need. A single refresh token must include every scope you will call.

```text
ZohoMail.accounts.READ
ZohoMail.folders.READ
ZohoMail.messages.READ
ZohoMail.messages.CREATE
ZohoCalendar.calendar.READ
ZohoCalendar.event.READ
ZohoCalendar.event.CREATE
WorkDrive.files.READ
WorkDrive.users.READ
ZohoCliq.Channels.READ
ZohoCliq.Webhooks.CREATE
```

`ZohoMail.messages.ALL` can replace the two message scopes. `ZohoCalendar.event.ALL` can replace the two event scopes. `ZohoCalendar.calendar.ALL` can replace the calendar read scope.

Cliq's post-message pages document `ZohoCliq.Webhooks.CREATE`. Listing channels documents `ZohoCliq.Channels.READ`.

## Tools

`health` refreshes the access token and returns `dc`, `apiDomain`, `expiresIn`, and `tokenType`. It does not return the token. `whoami` does the same and then calls Mail Get All Accounts.

| Tool | Method and path | Auth |
| --- | --- | --- |
| `list_mail_accounts` | `GET /api/accounts` | `Zoho-oauthtoken` |
| `list_emails` | `GET /api/accounts/{accountId}/messages/view` | `Zoho-oauthtoken` |
| `get_email` | `GET /api/accounts/{accountId}/folders/{folderId}/messages/{messageId}/content` | `Zoho-oauthtoken` |
| `search_emails` | `GET /api/accounts/{accountId}/messages/search` | `Zoho-oauthtoken` |
| `send_email` | `POST /api/accounts/{accountId}/messages` | `Zoho-oauthtoken` |
| `list_calendars` | `GET /api/v1/calendars` | `Zoho-oauthtoken` |
| `list_events` | `GET /api/v1/calendars/{uid}/events?range=` | `Zoho-oauthtoken` |
| `create_event` | `POST /api/v1/calendars/{uid}/events?eventdata=` | `Zoho-oauthtoken` |
| `list_files` | folder, team folder, or My Folders files APIs | `Zoho-oauthtoken` |
| `search_files` | `GET /api/v1/teams/{team_id}/records?search[all]=` | `Zoho-oauthtoken` |
| `get_file_metadata` | `GET /api/v1/files/{resource_id}` | `Zoho-oauthtoken` |
| `list_channels` | `GET /api/v2/channels` | `Bearer` |
| `send_cliq_message` | `POST /api/v3/channels/{id}/messages` or `.../channelsbyname/{name}/messages` | `Bearer` |

Mail hosts: [Zoho Mail getting started](https://www.zoho.com/mail/help/api/getting-started-with-api.html) (`mail.zoho.com`, `mail.zoho.eu`, `mail.zoho.in`, `mail.zoho.com.au`, `mail.zoho.jp`, `mail.zohocloud.ca`, `mail.zoho.sa`, `mail.zoho.ae`).

Calendar base in the introduction is `https://calendar.zoho.com/api/v1`. Other DCs use the same registrable domain as Mail (`calendar.zoho.eu`, `calendar.zohocloud.ca`, `calendar.zoho.ae`, and so on). The [Calendar OAuth guide](https://www.zoho.com/calendar/help/api/oauth2-user-guide.html) describes the Bearer scheme and then shows `Authorization: Zoho-oauthtoken` as the header format used for Zoho resource calls on that page. This server sends `Zoho-oauthtoken` for Calendar, matching Mail and WorkDrive.

WorkDrive uses `{api_domain}/workdrive/api/v1/...`. `api_domain` comes from the refresh response. If it is missing, the server falls back to the [WorkDrive DC table](https://www.zoho.com/workdrive/developer/docs/api/v1/getting-started-multi-dc-support.html).

Cliq hosts follow the [Cliq DC table](https://www.zoho.com/cliq/help/restapi/v3/introduction/) (`cliq.zoho.com`, `cliq.zohocloud.ca`, and the others in that table). That table does not list UAE. `ZOHO_DC=ae` calls `https://cliq.zoho.ae`, the same domain pattern as `accounts.zoho.ae` and `mail.zoho.ae`. Confirm the host in the Cliq URL bar if UAE calls fail.

When `list_emails` is called without `folder_id`, the server calls [Get all folders](https://www.zoho.com/mail/help/api/get-all-folder-details.html) and selects the Inbox. When `list_files` is called without an id, it follows [Fetching IDs](https://www.zoho.com/workdrive/developer/docs/api/v1/getting-started-fetching-ids.html): user info, teams, current team member, My Folders id, then [files in My Folders](https://www.zoho.com/workdrive/developer/docs/api/v1/get-files-in-my-folders.html).

## npm publish

The package name is `zoho-workspace-mcp`. It is not on npm yet.

1. `npm login` as the publisher you want on the package.
2. From `server/`, run `npm run build` (also runs on `prepublishOnly`).
3. `npm publish --access public`.

Do not publish a tarball that contains `.env`. The `files` list is `dist` and this README.

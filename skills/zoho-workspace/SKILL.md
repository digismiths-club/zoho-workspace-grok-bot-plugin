---
name: zoho-workspace
description: Set up and use Zoho Workspace from Grok Bot or Cursor, covering Mail, Calendar, WorkDrive, and Cliq. Use when the user mentions Zoho Workspace, Zoho MCP, a zohomcp.com Connect URL, or asks which Zoho product to open.
---

# Zoho Workspace

The plugin server is named `zoho-workspace`. Two backends can sit behind that name. Check which one is connected before calling tools.

## Hosted Zoho MCP

The user created a server at `mcp.zoho.com` or a regional Zoho MCP site and pasted the Connect URL into `ZOHO_MCP_URL`.

- Read the live tool list on `zoho-workspace` before calling anything.
- Tool names and arguments are defined by the tools the user added in the Zoho MCP console. Use those schemas.
- Do not invent tool names. If no tool matches the request, say which product is missing and point the user at the Zoho MCP console to add it.
- The Connect URL is a secret. Do not repeat it in chat.

## Self-hosted server

If the connected server is this repo's `zoho-workspace-mcp` process, its tools are the ones registered in `server/`. Call `health` first when auth is in doubt. Product skills name those tools. They are not the hosted Zoho MCP catalog.

## Which product

- Mail: inbox, search, read, send. See the Zoho Mail skill.
- Calendar: calendars and events. See the Zoho Calendar skill.
- WorkDrive: files and search. See the Zoho WorkDrive skill.
- Cliq: channels and channel messages. See the Zoho Cliq skill.

## Writes

Confirm with the user before sending mail, creating a calendar event, or posting a Cliq message.

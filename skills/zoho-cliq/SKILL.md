---
name: zoho-cliq
description: List Zoho Cliq channels and post a channel message after the user confirms. Use when the user asks about Cliq, a Cliq channel, or sending a chat message in Zoho.
---

# Zoho Cliq

Use the connected `zoho-workspace` MCP server.

## Hosted Zoho MCP

List tools first. Cliq distinguishes a channel `id` (`CHANNEL_ID`) from `unique_name` (`CHANNEL_UNIQUE_NAME`) and from the channel's `chat_id`. Read the live tool schema to see which identifier it wants. Do not invent tool names.

## Self-hosted `zoho-workspace-mcp`

| Tool | When |
| --- | --- |
| `list_channels` | Find a channel. Optional `name`, `joined`, `pinned`, and `next_token`. This calls `GET /api/v2/channels` with `Authorization: Bearer`. |
| `send_cliq_message` | Confirm first. Pass `text` (max 5000 characters) and exactly one of `channel_id` or `channel_unique_name`. |

Posting uses `POST /api/v3/channels/{CHANNEL_ID}/messages` or `POST /api/v3/channelsbyname/{CHANNEL_UNIQUE_NAME}/messages`. The documented scope on those post endpoints is `ZohoCliq.Webhooks.CREATE`.

## Docs

- List channels: https://www.zoho.com/cliq/help/restapi/v2/channels/
- Post a message: https://www.zoho.com/cliq/help/restapi/v3/messages/
- Identifiers: https://www.zoho.com/cliq/help/restapi/v3/glossary/

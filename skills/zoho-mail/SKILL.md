---
name: zoho-mail
description: Read, search, and send Zoho Mail for the signed-in user. Use when the user asks about email, the inbox, unread mail, a message body, or sending mail from Zoho.
---

# Zoho Mail

Use the connected `zoho-workspace` MCP server.

## Hosted Zoho MCP

List the tools on that server and pick the one whose description matches the job (list accounts, list messages, read a message, search, send). Use the argument names from that tool. Do not guess names such as `list_emails` unless that exact tool is present.

Account ids, folder ids, and message ids come from earlier tool results. Do not invent them.

## Self-hosted `zoho-workspace-mcp`

These tools are registered by `server/` in this repo:

| Tool | When |
| --- | --- |
| `whoami` or `list_mail_accounts` | You need `accountId` and the primary address. |
| `list_emails` | List a folder. Pass `account_id`. Omit `folder_id` to use Inbox (the server calls Get all folders). `limit` is 1–200. |
| `search_emails` | Pass `search_key` using Zoho Mail search syntax (`newMails`, `subject:…`). |
| `get_email` | Pass `account_id`, `folder_id`, and `message_id` from a list or search result. |
| `send_email` | Confirm first. Needs `from_address`, `to_address`, `subject`, and `content`. |

Auth header for these calls is `Zoho-oauthtoken`. Scopes are in `server/README.md`.

## Docs

- Accounts: https://www.zoho.com/mail/help/api/get-all-users-accounts.html
- List: https://www.zoho.com/mail/help/api/get-emails-list.html
- Search: https://www.zoho.com/mail/help/api/get-search-emails.html
- Content: https://www.zoho.com/mail/help/api/get-email-content.html
- Send: https://www.zoho.com/mail/help/api/post-send-an-email.html

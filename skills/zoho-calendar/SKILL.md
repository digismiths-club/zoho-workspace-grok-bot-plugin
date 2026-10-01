---
name: zoho-calendar
description: List Zoho Calendars and events, and create an event after the user confirms. Use when the user asks about their Zoho calendar, schedule, meetings, or a new event.
---

# Zoho Calendar

Use the connected `zoho-workspace` MCP server.

## Hosted Zoho MCP

List tools first. Choose the live tool that lists calendars, lists events, or creates an event. Calendar uids come from the list-calendars result. Do not invent uids or tool names.

Zoho's event list requires a date range, and that range cannot be longer than 31 days. Dates in the self-hosted server are `yyyyMMdd` or `yyyyMMddTHHmmssZ`.

## Self-hosted `zoho-workspace-mcp`

| Tool | When |
| --- | --- |
| `list_calendars` | Need a calendar `uid`. Optional `category`: `own`, `group`, `app`, `others`, `all`. |
| `list_events` | Pass `calendar_uid`. Omit `start` and `end` for the next 7 days UTC, or pass both. |
| `create_event` | Confirm first. Pass `calendar_uid`, `title`, `start`, and `end`. The server sends them as the documented `eventdata` query parameter. |

## Docs

- Calendars: https://www.zoho.com/calendar/help/api/get-calendar-list.html
- Events: https://www.zoho.com/calendar/help/api/get-events-list.html
- Create: https://www.zoho.com/calendar/help/api/post-create-event.html

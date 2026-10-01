---
name: zoho-workdrive
description: List, search, and describe Zoho WorkDrive files and folders. Use when the user asks about WorkDrive, Zoho Docs files, a team folder, or My Folders.
---

# Zoho WorkDrive

Use the connected `zoho-workspace` MCP server.

## Hosted Zoho MCP

List tools first and use the live schemas. File ids, folder ids, and team ids come from tool results. Do not invent them or the tool names.

## Self-hosted `zoho-workspace-mcp`

| Tool | When |
| --- | --- |
| `list_files` | Pass one of `folder_id`, `teamfolder_id`, or `myfolder_id`. If you pass none, the server resolves the preferred team's My Folders through the documented user, team, current-user, and privatespace calls, then lists that folder. `limit` max is 50. |
| `search_files` | Pass `team_id` and `query` (`search[all]`). |
| `get_file_metadata` | Pass `resource_id` from a list or search result. |

`page[limit]` on these WorkDrive list APIs maxes at 50. Ask for the next page with `offset` when `links` shows more.

## Docs

- Files in a folder: https://www.zoho.com/workdrive/developer/docs/api/v1/list-files-folders-inside-a-folder.html
- My Folders files: https://www.zoho.com/workdrive/developer/docs/api/v1/get-files-in-my-folders.html
- Team folder files: https://www.zoho.com/workdrive/developer/docs/api/v1/get-team-folder-files-and-folders.html
- Fetching ids: https://www.zoho.com/workdrive/developer/docs/api/v1/getting-started-fetching-ids.html
- Search: https://www.zoho.com/workdrive/developer/docs/api/v1/search-records.html
- File info: https://www.zoho.com/workdrive/developer/docs/api/v1/get-file-folder-info.html

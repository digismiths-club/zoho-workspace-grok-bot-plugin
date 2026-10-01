# Contributing

Thanks for helping improve the Zoho Workspace plugin. The package is MIT licensed, copyright CurryByte Innovations.

## Ground rules

- Do not commit Connect URLs, client secrets, refresh tokens, or access tokens.
- Do not add a Zoho REST path that is not in Zoho's public docs. Link the doc in the pull request.
- Mail, Calendar, and WorkDrive requests use `Authorization: Zoho-oauthtoken`. Cliq's channel and message examples use `Authorization: Bearer`. Keep that split unless the product doc you are implementing says otherwise.
- Keep the repo an Agent Plugin: root `plugin.json`, root `mcp.json`, and `skills/*/SKILL.md`. Do not add `.cursor-plugin/`, `hooks/`, `rules/`, `agents/`, or `commands/`.

## Plugin manifest

`plugin.json` must validate against `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`. That schema is closed. Cursor install variables belong under `extensions.com.cursor.variables`, not as a new top-level field.

`mcp.json` must validate against `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`. The hosted server is `streamable-http` and its URL is the `${ZOHO_MCP_URL}` placeholder.

Skill `name` must match the directory name. The description must say what the skill does and when to use it.

## Self-hosted server

```bash
cd server
npm install
npm run build
```

Node.js 20 or newer. The build writes `server/dist`. Do not commit `node_modules`, `dist`, or `.env`.

`health` must keep working as a token refresh check, and it must not print the access token.

## Pull requests

Describe which Zoho product you touched and link the doc page for every new or changed endpoint. Run `npm run build` in `server/` before you ask for review.

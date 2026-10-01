import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { assertEventRange, defaultEventRange } from "./dates.js";
import { toText } from "./http.js";
import { client, dataArray, record } from "./zoho.js";

type ToolResult = { content: [{ type: "text"; text: string }]; isError?: boolean };

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: true } as const;
const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

function toolResult(value: unknown): ToolResult {
  return { content: [{ type: "text", text: toText(value) }] };
}

function toolError(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: message }], isError: true };
}

async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return toolResult(await fn());
  } catch (error) {
    return toolError(error);
  }
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "health",
    {
      title: "Zoho health",
      description:
        "Refresh the Zoho OAuth access token and report data center, api_domain, and expiry. Does not return the access token. Use this to check that ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, and ZOHO_DC work.",
      annotations: readOnly,
    },
    async () => run(() => client().health()),
  );

  server.registerTool(
    "whoami",
    {
      title: "Zoho whoami",
      description:
        "Refresh the access token, then call Zoho Mail Get All Accounts (GET /api/accounts) and return account ids and addresses. Use before mail tools when the account id is unknown.",
      annotations: readOnly,
    },
    async () =>
      run(async () => {
        const health = await client().health();
        const accounts = await client().mail("GET", "/api/accounts");
        return {
          ...health,
          accounts: dataArray(accounts).map((account) => ({
            accountId: account.accountId ?? account.accountid,
            primaryEmailAddress: account.primaryEmailAddress,
            mailboxAddress: account.mailboxAddress,
            displayName: account.displayName,
            accountName: account.accountName,
            incomingUserName: account.incomingUserName,
          })),
        };
      }),
  );

  server.registerTool(
    "list_mail_accounts",
    {
      title: "List Zoho Mail accounts",
      description:
        "List the authenticated user's Zoho Mail accounts. GET https://mail.{dc}/api/accounts with Authorization: Zoho-oauthtoken. Scope ZohoMail.accounts.READ.",
      annotations: readOnly,
    },
    async () => run(() => client().mail("GET", "/api/accounts")),
  );

  server.registerTool(
    "list_emails",
    {
      title: "List Zoho Mail messages",
      description:
        "List messages in a folder. GET /api/accounts/{accountId}/messages/view. folder_id comes from GET /api/accounts/{accountId}/folders (scope ZohoMail.folders.READ). If folder_id is omitted, that folders call is used to select the Inbox. start defaults to 1. limit is 1-200 (Zoho default 10).",
      inputSchema: z.object({
        account_id: z.string().describe("Mail accountId from list_mail_accounts."),
        folder_id: z.string().optional().describe("Folder id. Omit to use Inbox."),
        start: z.number().int().min(1).optional().describe("1-based start index. Default 1."),
        limit: z.number().int().min(1).max(200).optional().describe("Page size, 1-200."),
        threaded_mails: z.boolean().optional().describe("Pass threadedMails=true, as in the Zoho sample."),
        include_to: z.boolean().optional().describe("Pass includeto=true, as in the Zoho sample."),
      }),
      annotations: readOnly,
    },
    async (args) =>
      run(async () => {
        const folderId = args.folder_id ?? (await inboxFolderId(args.account_id));
        return client().mail("GET", `/api/accounts/${encodeURIComponent(args.account_id)}/messages/view`, {
          folderId,
          start: args.start,
          limit: args.limit,
          threadedMails: args.threaded_mails,
          includeto: args.include_to,
        });
      }),
  );

  server.registerTool(
    "get_email",
    {
      title: "Get a Zoho Mail message",
      description:
        "Get message HTML content. GET /api/accounts/{accountId}/folders/{folderId}/messages/{messageId}/content. Scope ZohoMail.messages.READ. message_id and folder_id come from list_emails or search_emails.",
      inputSchema: z.object({
        account_id: z.string(),
        folder_id: z.string(),
        message_id: z.string(),
        include_block_content: z.boolean().optional().describe("includeBlockContent query flag from the content API."),
      }),
      annotations: readOnly,
    },
    async (args) =>
      run(() =>
        client().mail(
          "GET",
          `/api/accounts/${encodeURIComponent(args.account_id)}/folders/${encodeURIComponent(args.folder_id)}/messages/${encodeURIComponent(args.message_id)}/content`,
          { includeBlockContent: args.include_block_content },
        ),
      ),
  );

  server.registerTool(
    "search_emails",
    {
      title: "Search Zoho Mail",
      description:
        "Search mail. GET /api/accounts/{accountId}/messages/search. search_key is Zoho's searchKey (examples from the docs: newMails, or a search-syntax string such as subject:hello). Scope ZohoMail.messages.READ. See Zoho Mail search syntax docs before inventing keys.",
      inputSchema: z.object({
        account_id: z.string(),
        search_key: z.string().describe("Required searchKey."),
        start: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        include_to: z.boolean().optional(),
      }),
      annotations: readOnly,
    },
    async (args) =>
      run(() =>
        client().mail("GET", `/api/accounts/${encodeURIComponent(args.account_id)}/messages/search`, {
          searchKey: args.search_key,
          start: args.start,
          limit: args.limit,
          includeto: args.include_to,
        }),
      ),
  );

  server.registerTool(
    "send_email",
    {
      title: "Send Zoho Mail",
      description:
        "Send an email. POST /api/accounts/{accountId}/messages with JSON fromAddress, toAddress, subject, and content. Optional ccAddress and bccAddress. Scope ZohoMail.messages.CREATE. Confirm with the user before sending.",
      inputSchema: z.object({
        account_id: z.string(),
        from_address: z.string(),
        to_address: z.string().describe("Recipient address. Zoho accepts a single address in toAddress."),
        subject: z.string(),
        content: z.string().describe("Message body. Zoho sends this as the content field."),
        cc_address: z.string().optional(),
        bcc_address: z.string().optional(),
      }),
      annotations: write,
    },
    async (args) =>
      run(() =>
        client().mail("POST", `/api/accounts/${encodeURIComponent(args.account_id)}/messages`, undefined, {
          fromAddress: args.from_address,
          toAddress: args.to_address,
          ccAddress: args.cc_address,
          bccAddress: args.bcc_address,
          subject: args.subject,
          content: args.content,
        }),
      ),
  );

  server.registerTool(
    "list_calendars",
    {
      title: "List Zoho Calendars",
      description:
        "List calendars. GET /api/v1/calendars. Scope ZohoCalendar.calendar.READ. category is own, group, app, others, or all. If omitted, Zoho returns the user's own calendars.",
      inputSchema: z.object({
        category: z.enum(["own", "group", "app", "others", "all"]).optional(),
        show_hidden: z.boolean().optional().describe("showhiddencal query flag."),
      }),
      annotations: readOnly,
    },
    async (args) =>
      run(() =>
        client().calendar("GET", "/api/v1/calendars", {
          category: args.category,
          showhiddencal: args.show_hidden,
        }),
      ),
  );

  server.registerTool(
    "list_events",
    {
      title: "List Zoho Calendar events",
      description:
        "List events in one calendar. GET /api/v1/calendars/{calendarUid}/events. The range query is required by Zoho and cannot exceed 31 days. Dates are yyyyMMdd or yyyyMMddTHHmmssZ. If start and end are omitted, the next 7 days (UTC) are used. Scope ZohoCalendar.event.READ.",
      inputSchema: z.object({
        calendar_uid: z.string().describe("Calendar uid from list_calendars."),
        start: z.string().optional(),
        end: z.string().optional(),
        by_instance: z.boolean().optional().describe("byinstance=true expands repeating events. Zoho then returns minimal fields."),
      }),
      annotations: readOnly,
    },
    async (args) =>
      run(() => {
        const range = args.start && args.end ? { start: args.start, end: args.end } : defaultEventRange();
        if ((args.start && !args.end) || (!args.start && args.end)) {
          throw new Error("Pass both start and end, or omit both to use the next 7 days.");
        }
        assertEventRange(range.start, range.end);
        return client().calendar("GET", `/api/v1/calendars/${encodeURIComponent(args.calendar_uid)}/events`, {
          range: JSON.stringify(range),
          byinstance: args.by_instance,
        });
      }),
  );

  server.registerTool(
    "create_event",
    {
      title: "Create a Zoho Calendar event",
      description:
        "Create an event. POST /api/v1/calendars/{calendarUid}/events?eventdata={...} as documented (eventdata is a JSON query parameter, not a JSON body). Required eventdata keys are dateandtime.start, dateandtime.end, and title. Dates are yyyyMMdd or yyyyMMddTHHmmssZ. Scope ZohoCalendar.event.CREATE. Confirm with the user before creating.",
      inputSchema: z.object({
        calendar_uid: z.string(),
        title: z.string(),
        start: z.string(),
        end: z.string(),
        timezone: z.string().optional().describe("dateandtime.timezone, for example Asia/Kolkata."),
        description: z.string().optional().describe("Sent as richtext_description."),
        attendees: z.array(z.string()).optional().describe("Email addresses. Sent as attendees[].email with status NEEDS-ACTION."),
      }),
      annotations: write,
    },
    async (args) =>
      run(() => {
        assertEventRange(args.start, args.end);
        const eventdata: Record<string, unknown> = {
          title: args.title,
          dateandtime: {
            start: args.start,
            end: args.end,
            ...(args.timezone ? { timezone: args.timezone } : {}),
          },
        };
        if (args.description) eventdata.richtext_description = args.description;
        if (args.attendees?.length) {
          eventdata.attendees = args.attendees.map((email) => ({ email, status: "NEEDS-ACTION" }));
        }
        return client().calendar("POST", `/api/v1/calendars/${encodeURIComponent(args.calendar_uid)}/events`, {
          eventdata: JSON.stringify(eventdata),
        });
      }),
  );

  server.registerTool(
    "list_files",
    {
      title: "List Zoho WorkDrive files",
      description:
        "List files using one documented collection: folder_id calls GET /api/v1/files/{folder_id}/files; teamfolder_id calls GET /api/v1/teamfolders/{teamfolder_id}/files; myfolder_id calls GET /api/v1/privatespace/{myfolder_id}/files. If none is set, My Folders is resolved with GET /api/v1/users/me, GET /api/v1/users/{zuid}/teams, GET /api/v1/teams/{team_id}/currentuser, and GET /api/v1/users/{team_member_id}/privatespace, then the private-space files endpoint. page[limit] max is 50. Scope WorkDrive.files.READ. Team discovery also needs WorkDrive.users.READ.",
      inputSchema: z.object({
        folder_id: z.string().optional(),
        teamfolder_id: z.string().optional(),
        myfolder_id: z.string().optional(),
        filter_type: z.string().optional().describe("filter[type], for example allfiles, folder, documents."),
        limit: z.number().int().min(1).max(50).optional(),
        offset: z.number().int().min(0).optional(),
      }),
      annotations: readOnly,
    },
    async (args) =>
      run(async () => {
        const chosen = [args.folder_id, args.teamfolder_id, args.myfolder_id].filter(Boolean);
        if (chosen.length > 1) {
          throw new Error("Pass only one of folder_id, teamfolder_id, or myfolder_id.");
        }
        const query = fileQuery(args.filter_type, args.limit, args.offset);
        if (args.folder_id) {
          return summarizeFiles(await client().workdrive("GET", `/api/v1/files/${encodeURIComponent(args.folder_id)}/files`, query));
        }
        if (args.teamfolder_id) {
          return summarizeFiles(
            await client().workdrive("GET", `/api/v1/teamfolders/${encodeURIComponent(args.teamfolder_id)}/files`, query),
          );
        }
        const myfolderId = args.myfolder_id ?? (await resolveMyFolderId());
        return summarizeFiles(await client().workdrive("GET", `/api/v1/privatespace/${encodeURIComponent(myfolderId)}/files`, query));
      }),
  );

  server.registerTool(
    "search_files",
    {
      title: "Search Zoho WorkDrive",
      description:
        "Search a team's files. GET /api/v1/teams/{team_id}/records with search[all] (required by that API). Optional search[name], search[content], and filter[type]. team_id comes from GET /api/v1/users/{zuid}/teams (WorkDrive.users.READ). Listing and file info document WorkDrive.files.READ.",
      inputSchema: z.object({
        team_id: z.string(),
        query: z.string().describe("search[all] keyword."),
        name: z.string().optional().describe("search[name]."),
        content: z.string().optional().describe("search[content]."),
        filter_type: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
        offset: z.number().int().min(0).optional(),
      }),
      annotations: readOnly,
    },
    async (args) =>
      run(async () =>
        summarizeFiles(
          await client().workdrive("GET", `/api/v1/teams/${encodeURIComponent(args.team_id)}/records`, {
            "search[all]": args.query,
            "search[name]": args.name,
            "search[content]": args.content,
            "filter[type]": args.filter_type,
            "page[limit]": args.limit,
            "page[offset]": args.offset,
          }),
        ),
      ),
  );

  server.registerTool(
    "get_file_metadata",
    {
      title: "Get Zoho WorkDrive file metadata",
      description:
        "Get file or folder info. GET /api/v1/files/{resource_id}. Scope WorkDrive.files.READ. Relationship link graphs are omitted from the tool result; attributes are returned.",
      inputSchema: z.object({
        resource_id: z.string(),
      }),
      annotations: readOnly,
    },
    async (args) =>
      run(async () => {
        const payload = record(await client().workdrive("GET", `/api/v1/files/${encodeURIComponent(args.resource_id)}`));
        const data = record(payload.data);
        return { id: data.id, type: data.type, attributes: data.attributes };
      }),
  );

  server.registerTool(
    "list_channels",
    {
      title: "List Zoho Cliq channels",
      description:
        "List Cliq channels. GET /api/v2/channels with Authorization: Bearer. Scope ZohoCliq.Channels.READ. Documented filters used here: name, joined, pinned, next_token.",
      inputSchema: z.object({
        name: z.string().optional(),
        joined: z.boolean().optional(),
        pinned: z.boolean().optional(),
        next_token: z.string().optional(),
      }),
      annotations: readOnly,
    },
    async (args) =>
      run(() =>
        client().cliq("GET", "/api/v2/channels", {
          name: args.name,
          joined: args.joined,
          pinned: args.pinned,
          next_token: args.next_token,
        }),
      ),
  );

  server.registerTool(
    "send_cliq_message",
    {
      title: "Send a Zoho Cliq channel message",
      description:
        "Post a channel message. POST /api/v3/channels/{CHANNEL_ID}/messages or POST /api/v3/channelsbyname/{CHANNEL_UNIQUE_NAME}/messages. JSON body field text is required (max 5000). Authorization: Bearer. Scope ZohoCliq.Webhooks.CREATE. Confirm with the user before sending. Pass exactly one of channel_id or channel_unique_name.",
      inputSchema: z.object({
        text: z.string().max(5000),
        channel_id: z.string().optional(),
        channel_unique_name: z.string().optional(),
        reply_to: z.string().optional(),
        sync_message: z.boolean().optional(),
        bot_unique_name: z.string().optional().describe("Query bot_unique_name. The bot must already be in the channel."),
      }),
      annotations: write,
    },
    async (args) =>
      run(() => {
        if (!args.channel_id === !args.channel_unique_name) {
          throw new Error("Pass exactly one of channel_id or channel_unique_name.");
        }
        const path = args.channel_id
          ? `/api/v3/channels/${encodeURIComponent(args.channel_id)}/messages`
          : `/api/v3/channelsbyname/${encodeURIComponent(args.channel_unique_name ?? "")}/messages`;
        return client().cliq("POST", path, { bot_unique_name: args.bot_unique_name }, {
          text: args.text,
          ...(args.reply_to ? { reply_to: args.reply_to } : {}),
          ...(args.sync_message !== undefined ? { sync_message: args.sync_message } : {}),
        });
      }),
  );
}

async function inboxFolderId(accountId: string): Promise<string> {
  const payload = await client().mail("GET", `/api/accounts/${encodeURIComponent(accountId)}/folders`);
  const folders = dataArray(payload);
  const inbox = folders.find((folder) => {
    const type = String(folder.folderType ?? "").toLowerCase();
    const name = String(folder.folderName ?? "").toLowerCase();
    return type === "inbox" || name === "inbox";
  });
  const id = inbox?.folderId;
  if (id === undefined || id === null) {
    throw new Error("Get all folders did not include an Inbox folderId. Pass folder_id.");
  }
  return String(id);
}

async function resolveMyFolderId(): Promise<string> {
  const me = record(await client().workdrive("GET", "/api/v1/users/me"));
  const user = record(me.data);
  const attributes = record(user.attributes);
  const zuid = attributes.zuid ?? attributes.zohouserid ?? user.id;
  if (typeof zuid !== "string" && typeof zuid !== "number") {
    throw new Error("GET /api/v1/users/me did not include a zuid. Pass myfolder_id or folder_id.");
  }
  const teamsPayload = await client().workdrive("GET", `/api/v1/users/${encodeURIComponent(String(zuid))}/teams`);
  const teams = dataArray(teamsPayload);
  const preferred = teams.find((team) => record(team.attributes).is_preferred === true) ?? teams[0];
  const teamId = preferred?.id;
  if (typeof teamId !== "string") {
    throw new Error("No WorkDrive team id was returned. Pass folder_id or team_id via search_files.");
  }
  const current = record(await client().workdrive("GET", `/api/v1/teams/${encodeURIComponent(teamId)}/currentuser`));
  const memberId = record(current.data).id;
  if (typeof memberId !== "string") {
    throw new Error("GET /api/v1/teams/{team_id}/currentuser did not include a team member id.");
  }
  const space = await client().workdrive("GET", `/api/v1/users/${encodeURIComponent(memberId)}/privatespace`);
  const myfolderId = dataArray(space)[0]?.id;
  if (typeof myfolderId !== "string") {
    throw new Error("GET /api/v1/users/{team_member_id}/privatespace did not include a My Folders id.");
  }
  return myfolderId;
}

function fileQuery(filterType?: string, limit?: number, offset?: number): Record<string, string | number | undefined> {
  return {
    "filter[type]": filterType,
    "page[limit]": limit,
    "page[offset]": offset,
    "fields[files]": "name,type,extn,permalink,parent_id,created_time,modified_time,is_folder",
  };
}

function summarizeFiles(payload: unknown): unknown {
  const body = record(payload);
  const files = dataArray(body).map((file) => {
    const attributes = record(file.attributes);
    return {
      id: file.id,
      type: file.type,
      name: attributes.name,
      resourceType: attributes.type,
      extn: attributes.extn,
      isFolder: attributes.is_folder,
      permalink: attributes.permalink,
      parentId: attributes.parent_id,
      createdTime: attributes.created_time,
      modifiedTime: attributes.modified_time,
    };
  });
  return { files, links: body.links, meta: body.meta };
}

/**
 * Data-center hosts taken from public Zoho docs:
 * - Accounts: https://www.zoho.com/developer/oauth/multi-dc-support.html
 *   and the Zoho accounts DC list (accounts.zoho.ae, accounts.zohocloud.ca).
 * - Mail: https://www.zoho.com/mail/help/api/getting-started-with-api.html
 * - Cliq: https://www.zoho.com/cliq/help/restapi/v3/introduction/
 *   (Canada is cliq.zohocloud.ca; that table does not list UAE).
 * - WorkDrive: https://www.zoho.com/workdrive/developer/docs/api/v1/getting-started-multi-dc-support.html
 * - Calendar publishes https://calendar.zoho.com/api/v1. Other DCs use the
 *   same registrable domain as Mail for that DC.
 */

export const DATA_CENTERS = ["com", "in", "eu", "com.au", "jp", "ca", "sa", "ae"] as const;

export type ZohoDc = (typeof DATA_CENTERS)[number];

export interface DcHosts {
  accounts: string;
  mail: string;
  calendar: string;
  cliq: string;
  /** Fallback WorkDrive origin. Prefer api_domain from the token response. */
  workdriveApi: string;
}

const HOSTS: Record<ZohoDc, DcHosts> = {
  com: {
    accounts: "https://accounts.zoho.com",
    mail: "https://mail.zoho.com",
    calendar: "https://calendar.zoho.com",
    cliq: "https://cliq.zoho.com",
    workdriveApi: "https://www.zohoapis.com",
  },
  in: {
    accounts: "https://accounts.zoho.in",
    mail: "https://mail.zoho.in",
    calendar: "https://calendar.zoho.in",
    cliq: "https://cliq.zoho.in",
    workdriveApi: "https://www.zohoapis.in",
  },
  eu: {
    accounts: "https://accounts.zoho.eu",
    mail: "https://mail.zoho.eu",
    calendar: "https://calendar.zoho.eu",
    cliq: "https://cliq.zoho.eu",
    workdriveApi: "https://www.zohoapis.eu",
  },
  "com.au": {
    accounts: "https://accounts.zoho.com.au",
    mail: "https://mail.zoho.com.au",
    calendar: "https://calendar.zoho.com.au",
    cliq: "https://cliq.zoho.com.au",
    workdriveApi: "https://www.zohoapis.com.au",
  },
  jp: {
    accounts: "https://accounts.zoho.jp",
    mail: "https://mail.zoho.jp",
    calendar: "https://calendar.zoho.jp",
    cliq: "https://cliq.zoho.jp",
    workdriveApi: "https://www.zohoapis.jp",
  },
  ca: {
    accounts: "https://accounts.zohocloud.ca",
    mail: "https://mail.zohocloud.ca",
    calendar: "https://calendar.zohocloud.ca",
    cliq: "https://cliq.zohocloud.ca",
    workdriveApi: "https://www.zohoapis.ca",
  },
  sa: {
    accounts: "https://accounts.zoho.sa",
    mail: "https://mail.zoho.sa",
    calendar: "https://calendar.zoho.sa",
    cliq: "https://cliq.zoho.sa",
    workdriveApi: "https://www.zohoapis.sa",
  },
  ae: {
    accounts: "https://accounts.zoho.ae",
    mail: "https://mail.zoho.ae",
    calendar: "https://calendar.zoho.ae",
    cliq: "https://cliq.zoho.ae",
    workdriveApi: "https://www.zohoapis.ae",
  },
};

export function parseDc(value: string | undefined): ZohoDc {
  const dc = (value ?? "com").trim() as ZohoDc;
  if (!DATA_CENTERS.includes(dc)) {
    throw new Error(
      `ZOHO_DC must be one of ${DATA_CENTERS.join(", ")}. Received "${value ?? ""}".`,
    );
  }
  return dc;
}

export function hostsFor(dc: ZohoDc): DcHosts {
  return HOSTS[dc];
}

export interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  dc: ZohoDc;
  hosts: DcHosts;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ZohoConfig {
  const clientId = required(env, "ZOHO_CLIENT_ID");
  const clientSecret = required(env, "ZOHO_CLIENT_SECRET");
  const refreshToken = required(env, "ZOHO_REFRESH_TOKEN");
  const dc = parseDc(env.ZOHO_DC);
  return { clientId, clientSecret, refreshToken, dc, hosts: hostsFor(dc) };
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Set it in the MCP server environment. Do not commit it.`);
  }
  return value;
}

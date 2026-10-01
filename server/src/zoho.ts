import { loadConfig, type ZohoConfig } from "./config.js";
import { asArray, zohoFetch } from "./http.js";

interface AccessToken {
  token: string;
  expiresAt: number;
  apiDomain: string;
  tokenType: string;
  expiresIn: number;
}

export class ZohoClient {
  private cached: AccessToken | undefined;
  private readonly config: ZohoConfig;

  constructor(config: ZohoConfig = loadConfig()) {
    this.config = config;
  }

  get dc(): string {
    return this.config.dc;
  }

  /** Refresh the OAuth access token and return non-secret metadata. */
  async health(): Promise<{
    ok: true;
    dc: string;
    apiDomain: string;
    expiresIn: number;
    tokenType: string;
  }> {
    const token = await this.accessToken(true);
    return {
      ok: true,
      dc: this.config.dc,
      apiDomain: token.apiDomain,
      expiresIn: token.expiresIn,
      tokenType: token.tokenType,
    };
  }

  async mail(method: string, path: string, query?: Record<string, string | number | boolean | undefined>, body?: unknown): Promise<unknown> {
    const token = await this.accessToken();
    const url = new URL(path.replace(/^\//, ""), `${this.config.hosts.mail}/`);
    return zohoFetch(url, method, {
      query,
      body,
      headers: {
        Accept: "application/json",
        Authorization: `Zoho-oauthtoken ${token.token}`,
      },
    });
  }

  async calendar(method: string, path: string, query?: Record<string, string | number | boolean | undefined>): Promise<unknown> {
    const token = await this.accessToken();
    const url = new URL(path.replace(/^\//, ""), `${this.config.hosts.calendar}/`);
    return zohoFetch(url, method, {
      query,
      headers: {
        Accept: "application/json",
        Authorization: `Zoho-oauthtoken ${token.token}`,
      },
    });
  }

  async workdrive(method: string, path: string, query?: Record<string, string | number | boolean | undefined>): Promise<unknown> {
    const token = await this.accessToken();
    const origin = token.apiDomain || this.config.hosts.workdriveApi;
    const url = new URL(path.replace(/^\//, ""), `${origin.replace(/\/$/, "")}/workdrive/`);
    return zohoFetch(url, method, {
      query,
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Zoho-oauthtoken ${token.token}`,
      },
    });
  }

  async cliq(method: string, path: string, query?: Record<string, string | number | boolean | undefined>, body?: unknown): Promise<unknown> {
    const token = await this.accessToken();
    const url = new URL(path.replace(/^\//, ""), `${this.config.hosts.cliq}/`);
    return zohoFetch(url, method, {
      query,
      body,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token.token}`,
      },
    });
  }

  private async accessToken(force = false): Promise<AccessToken> {
    const now = Date.now();
    if (!force && this.cached && this.cached.expiresAt > now + 60_000) {
      return this.cached;
    }

    const url = new URL("/oauth/v2/token", this.config.hosts.accounts);
    const body = new URLSearchParams({
      refresh_token: this.config.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "refresh_token",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    const raw = await response.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = {};
    }

    if (!response.ok || typeof parsed.access_token !== "string") {
      const error = typeof parsed.error === "string" ? parsed.error : `HTTP ${response.status}`;
      throw new Error(`Zoho token refresh failed (${error}). Check ZOHO_DC, client id, secret, and refresh token.`);
    }

    const expiresIn = typeof parsed.expires_in === "number" ? parsed.expires_in : 3600;
    const apiDomain = typeof parsed.api_domain === "string" ? parsed.api_domain : this.config.hosts.workdriveApi;
    this.cached = {
      token: parsed.access_token,
      expiresAt: now + expiresIn * 1000,
      apiDomain,
      tokenType: typeof parsed.token_type === "string" ? parsed.token_type : "Bearer",
      expiresIn,
    };
    return this.cached;
  }
}

export function record(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

export function dataArray(payload: unknown): Record<string, unknown>[] {
  return asArray(record(payload).data);
}

let shared: ZohoClient | undefined;

export function client(): ZohoClient {
  shared ??= new ZohoClient();
  return shared;
}

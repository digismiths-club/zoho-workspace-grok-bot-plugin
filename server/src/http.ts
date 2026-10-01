const MAX_BODY = 80_000;

export function redact(text: string): string {
  return text
    .replace(/Zoho-oauthtoken\s+\S+/gi, "Zoho-oauthtoken [redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(refresh_token|client_secret|access_token|code)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/"(refresh_token|client_secret|access_token)"\s*:\s*"[^"]*"/gi, '"$1":"[redacted]"');
}

export function toText(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (text.length <= MAX_BODY) return text;
  return `${text.slice(0, MAX_BODY)}\n… truncated at ${MAX_BODY} characters`;
}

export class ZohoApiError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string, body: string) {
    super(redact(`Zoho API ${status} for ${url}: ${body.slice(0, 2000)}`));
    this.name = "ZohoApiError";
    this.status = status;
    this.url = url;
  }
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers: Record<string, string>;
}

export async function zohoFetch(url: URL, method: string, options: RequestOptions): Promise<unknown> {
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const headers = { ...options.headers };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(30_000),
  });

  const raw = await response.text();
  const parsed = parseJson(raw);

  if (!response.ok) {
    throw new ZohoApiError(response.status, url.toString(), raw || response.statusText);
  }

  if (isMailError(parsed)) {
    const code = (parsed as { status: { code: number } }).status.code;
    throw new ZohoApiError(code, url.toString(), raw);
  }

  return parsed;
}

function parseJson(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function isMailError(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const status = (value as { status?: { code?: unknown } }).status;
  return typeof status?.code === "number" && status.code >= 400;
}

export function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }
  if (value && typeof value === "object") return [value as Record<string, unknown>];
  return [];
}

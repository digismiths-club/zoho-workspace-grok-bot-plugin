const COMPACT = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z)?$/;

export function parseZohoDate(value: string): Date {
  const match = COMPACT.exec(value);
  if (!match) {
    throw new Error(`Expected yyyyMMdd or yyyyMMddTHHmmssZ, received "${value}".`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? "0");
  const minute = Number(match[5] ?? "0");
  const second = Number(match[6] ?? "0");
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

export function formatZohoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Zoho Calendar rejects event ranges longer than 31 days. */
export function assertEventRange(start: string, end: string): void {
  const from = parseZohoDate(start);
  const to = parseZohoDate(end);
  if (to.getTime() < from.getTime()) {
    throw new Error("Event range end is before start.");
  }
  const max = 31 * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > max) {
    throw new Error("Zoho Calendar event range cannot exceed 31 days.");
  }
}

export function defaultEventRange(now = new Date()): { start: string; end: string } {
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start: formatZohoDate(now), end: formatZohoDate(end) };
}

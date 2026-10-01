import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertEventRange, defaultEventRange, parseZohoDate } from "../dist/dates.js";
import { hostsFor, parseDc } from "../dist/config.js";

const dc = parseDc("com.au");
if (hostsFor(dc).accounts !== "https://accounts.zoho.com.au") {
  throw new Error("Australia accounts host mismatch");
}
if (hostsFor(parseDc("ca")).cliq !== "https://cliq.zohocloud.ca") {
  throw new Error("Canada Cliq host mismatch");
}
if (hostsFor(parseDc("ae")).mail !== "https://mail.zoho.ae") {
  throw new Error("UAE Mail host mismatch");
}

const range = defaultEventRange(new Date("2026-10-01T00:00:00Z"));
assertEventRange(range.start, range.end);
let rejected = false;
try {
  assertEventRange("20261001", "20261115");
} catch {
  rejected = true;
}
if (!rejected) throw new Error("31-day range should fail");
parseZohoDate("20261001T120000Z");

const expectedTools = [
  "health",
  "whoami",
  "list_mail_accounts",
  "list_emails",
  "get_email",
  "search_emails",
  "send_email",
  "list_calendars",
  "list_events",
  "create_event",
  "list_files",
  "search_files",
  "get_file_metadata",
  "list_channels",
  "send_cliq_message",
];

const child = spawn(process.execPath, ["dist/index.js"], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: ["pipe", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

const pending = new Map();
let buffer = "";
child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let newline = buffer.indexOf("\n");
  while (newline >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line) {
      const message = JSON.parse(line);
      const resolve = pending.get(message.id);
      if (resolve) {
        pending.delete(message.id);
        resolve(message);
      }
    }
    newline = buffer.indexOf("\n");
  }
});

function request(id, method, params) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}: ${stderr}`)), 8000);
    pending.set(id, (message) => {
      clearTimeout(timer);
      resolve(message);
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}

const init = await request(1, "initialize", {
  protocolVersion: "2025-03-26",
  capabilities: {},
  clientInfo: { name: "smoke", version: "0.0.0" },
});
if (init.error) throw new Error(`initialize failed: ${JSON.stringify(init.error)}\n${stderr}`);
child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

const listed = await request(2, "tools/list", {});
if (listed.error) throw new Error(`tools/list failed: ${JSON.stringify(listed.error)}\n${stderr}`);
const names = listed.result.tools.map((tool) => tool.name);
const missing = expectedTools.filter((name) => !names.includes(name));
if (missing.length) throw new Error(`missing tools: ${missing.join(", ")}`);

const health = await request(3, "tools/call", { name: "health", arguments: {} });
const healthText = health.result?.content?.[0]?.text ?? "";
if (!health.result?.isError || !healthText.includes("ZOHO_CLIENT_ID")) {
  throw new Error(`health should fail closed without credentials, got ${JSON.stringify(health.result)}`);
}

child.stdin.end();
console.log(`ok tools=${names.length}`);

#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerTools } from "./tools.js";

const handle = serveStdio(() => {
  const server = new McpServer({
    name: "zoho-workspace-mcp",
    version: "0.1.0",
  });
  registerTools(server);
  return server;
});

process.on("SIGINT", () => {
  void handle.close();
});

#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./utils/config.js";
import { Logger } from "./utils/logger.js";
import { CDPConnection } from "./cdp/connection.js";
import { buildTools, createServer } from "./server.js";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.logLevel);
  const cdp = CDPConnection.getInstance({
    host: config.cdpHost,
    port: config.cdpPort,
    reconnectMax: config.reconnectMax,
  });

  if (!LOOPBACK_HOSTS.has(config.cdpHost)) {
    logger.warn(
      `DIA_CDP_HOST is not loopback (${config.cdpHost}) — the CDP connection controls the browser and exposes its session. Only point this at a trusted, private host.`
    );
  }

  // Wire CDP events to logger
  cdp.on("connected", () => logger.info("Connected to Dia via CDP"));
  cdp.on("disconnected", () => logger.warn("Disconnected from Dia"));
  cdp.on("reconnecting", ({ delay }: { delay: number }) =>
    logger.info(`Reconnecting to Dia in ${delay}ms…`)
  );
  cdp.on("reconnected", () => logger.info("Reconnected to Dia"));

  // Try to connect — don't crash if Dia isn't running yet
  try {
    await cdp.connect();
  } catch (err) {
    logger.warn("Could not connect to Dia on startup — tools will fail until Dia is running", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const server = createServer(cdp, config, logger);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const toolCount = buildTools(cdp, config).length;
  const aiBridgeStatus = config.aiBridge ? "enabled" : "disabled";
  const evalStatus = config.allowEval ? "enabled" : "disabled";
  logger.info(
    `mcp-dia ready — ${toolCount} tools loaded (AI Bridge: ${aiBridgeStatus}, evaluate_js: ${evalStatus})`
  );

  // Guard against stray unhandled rejections from async CDP event callbacks
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", {
      error: reason instanceof Error ? reason.message : String(reason),
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down mcp-dia…");
    await cdp.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[mcp-dia] Fatal error:", err);
  process.exit(1);
});

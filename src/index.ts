#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z, type ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { loadConfig } from "./utils/config.js";
import { Logger } from "./utils/logger.js";
import { CDPConnection } from "./cdp/connection.js";
import { AIBridgeError, CDPError } from "./utils/errors.js";

import * as Tabs from "./tools/core/tabs.js";
import * as Navigation from "./tools/core/navigation.js";
import * as Content from "./tools/core/content.js";
import * as Interaction from "./tools/advanced/interaction.js";
import * as Screenshot from "./tools/advanced/screenshot.js";
import * as Javascript from "./tools/advanced/javascript.js";
import * as Network from "./tools/advanced/network.js";
import * as Chat from "./tools/ai-bridge/chat.js";
import * as Skills from "./tools/ai-bridge/skills.js";
import * as Memory from "./tools/ai-bridge/memory.js";
import { outputSchemas } from "./tools/output-schemas.js";

const config = loadConfig();
const logger = new Logger(config.logLevel);
const cdp = CDPConnection.getInstance({
  host: config.cdpHost,
  port: config.cdpPort,
  reconnectMax: config.reconnectMax,
});

interface ToolDef {
  name: string;
  description: string;
  schema: ZodTypeAny;
  handler: (args: any) => Promise<any>;
  readOnly: boolean;
  destructive: boolean;
  aiBridge?: boolean;
}

const coreTools: ToolDef[] = [
  {
    name: "list_tabs",
    description: "List all open tabs in Dia (id, url, title, active).",
    schema: Tabs.ListTabsInput,
    handler: () => Tabs.listTabsHandler(cdp, {}),
    readOnly: true,
    destructive: false,
  },
  {
    name: "open_tab",
    description: "Open a new tab with the given URL.",
    schema: Tabs.OpenTabInput,
    handler: (a) => Tabs.openTabHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
  {
    name: "close_tab",
    description: "Close a tab by its ID.",
    schema: Tabs.CloseTabInput,
    handler: (a) => Tabs.closeTabHandler(cdp, a),
    readOnly: false,
    destructive: true,
  },
  {
    name: "switch_tab",
    description: "Activate (focus) a tab by its ID.",
    schema: Tabs.SwitchTabInput,
    handler: (a) => Tabs.switchTabHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
  {
    name: "navigate",
    description: "Navigate to a URL in the given tab (or active tab).",
    schema: Navigation.NavigateInput,
    handler: (a) => Navigation.navigateHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
  {
    name: "go_back",
    description: "Go to the previous page in browser history.",
    schema: Navigation.GoBackInput,
    handler: (a) => Navigation.goBackHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
  {
    name: "go_forward",
    description: "Go to the next page in browser history.",
    schema: Navigation.GoForwardInput,
    handler: (a) => Navigation.goForwardHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
  {
    name: "reload_tab",
    description: "Reload the current or specified tab.",
    schema: Navigation.ReloadTabInput,
    handler: (a) => Navigation.reloadTabHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
  {
    name: "get_page_content",
    description:
      "Extract page content as text, HTML, or markdown. Truncated at maxLength (default 100k).",
    schema: Content.GetPageContentInput,
    handler: (a) => Content.getPageContentHandler(cdp, a),
    readOnly: true,
    destructive: false,
  },
];

const advancedTools: ToolDef[] = [
  {
    name: "screenshot",
    description:
      "Take a screenshot of the viewport, a specific element, or the full page.",
    schema: Screenshot.ScreenshotInput,
    handler: (a) => Screenshot.screenshotHandler(cdp, a),
    readOnly: true,
    destructive: false,
  },
  {
    name: "generate_pdf",
    description: "Generate a PDF of the page.",
    schema: Screenshot.GeneratePdfInput,
    handler: (a) => Screenshot.generatePdfHandler(cdp, a),
    readOnly: true,
    destructive: false,
  },
  {
    name: "click_element",
    description:
      "Click an element by CSS selector (default) or XPath.",
    schema: Interaction.ClickElementInput,
    handler: (a) => Interaction.clickElementHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
  {
    name: "fill_input",
    description:
      "Fill a form field (input, textarea, contenteditable). Use clearBefore to empty first.",
    schema: Interaction.FillInputInput,
    handler: (a) => Interaction.fillInputHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
  {
    name: "wait_for_selector",
    description: "Wait for an element to appear in the DOM.",
    schema: Interaction.WaitForSelectorInput,
    handler: (a) => Interaction.waitForSelectorHandler(cdp, a),
    readOnly: true,
    destructive: false,
  },
  {
    name: "evaluate_js",
    description:
      "Execute JavaScript in the page context. Returns JSON-serializable values only.",
    schema: Javascript.EvaluateJsInput,
    handler: (a) => Javascript.evaluateJsHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
  {
    name: "get_cookies",
    description: "Get cookies, optionally filtered by URL.",
    schema: Network.GetCookiesInput,
    handler: (a) => Network.getCookiesHandler(cdp, a),
    readOnly: true,
    destructive: false,
  },
  {
    name: "set_cookie",
    description: "Set a cookie.",
    schema: Network.SetCookieInput,
    handler: (a) => Network.setCookieHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
  {
    name: "intercept_network",
    description: "Log or block network requests matching a URL pattern.",
    schema: Network.InterceptNetworkInput,
    handler: (a) => Network.interceptNetworkHandler(cdp, a),
    readOnly: false,
    destructive: false,
  },
];

const aiBridgeTools: ToolDef[] = [
  {
    name: "dia_send_chat",
    description:
      "Send a message to Dia's built-in AI chat. Optionally wait for response.",
    schema: Chat.DiaSendChatInput,
    handler: (a) => Chat.diaSendChatHandler(cdp, a),
    readOnly: false,
    destructive: false,
    aiBridge: true,
  },
  {
    name: "dia_get_chat_history",
    description: "Retrieve conversation history from Dia's AI chat.",
    schema: Chat.DiaGetChatHistoryInput,
    handler: (a) => Chat.diaGetChatHistoryHandler(cdp, a),
    readOnly: true,
    destructive: false,
    aiBridge: true,
  },
  {
    name: "dia_list_skills",
    description: "List available Dia Skills.",
    schema: Skills.DiaListSkillsInput,
    handler: () => Skills.diaListSkillsHandler(cdp),
    readOnly: true,
    destructive: false,
    aiBridge: true,
  },
  {
    name: "dia_trigger_skill",
    description: "Trigger a Dia Skill on the current page.",
    schema: Skills.DiaTriggerSkillInput,
    handler: (a) => Skills.diaTriggerSkillHandler(cdp, a),
    readOnly: false,
    destructive: false,
    aiBridge: true,
  },
  {
    name: "dia_search_memory",
    description:
      "Query Dia's Search memory for personal browsing context.",
    schema: Memory.DiaSearchMemoryInput,
    handler: (a) => Memory.diaSearchMemoryHandler(cdp, a),
    readOnly: true,
    destructive: false,
    aiBridge: true,
  },
  {
    name: "dia_get_tab_context",
    description:
      "Get Dia's enriched context for a tab (metadata, summary).",
    schema: Memory.DiaGetTabContextInput,
    handler: (a) => Memory.diaGetTabContextHandler(cdp, a),
    readOnly: true,
    destructive: false,
    aiBridge: true,
  },
];

const allTools: ToolDef[] = [
  ...coreTools,
  ...advancedTools,
  ...(config.aiBridge ? aiBridgeTools : []),
];

const server = new Server(
  { name: "mcp-dia", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map((tool) => {
    const outSchema = outputSchemas[tool.name];
    const entry: Record<string, unknown> = {
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.schema, { target: "jsonSchema7" }),
      annotations: {
        readOnlyHint: tool.readOnly,
        destructiveHint: tool.destructive,
        idempotentHint: tool.readOnly,
        openWorldHint: !tool.readOnly,
      },
    };
    if (outSchema) {
      entry.outputSchema = zodToJsonSchema(outSchema, { target: "jsonSchema7" });
    }
    return entry;
  }),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;

  const tool = allTools.find((t) => t.name === name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    };
  }

  let parsedArgs: unknown;
  try {
    parsedArgs = tool.schema.parse(rawArgs ?? {});
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Invalid arguments for ${name}: ${err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
          },
        ],
      };
    }
    throw err;
  }

  try {
    const result = await tool.handler(parsedArgs);
    const text =
      result === undefined || result === null
        ? "OK"
        : JSON.stringify(result, null, 2);

    const outSchema = outputSchemas[tool.name];
    if (outSchema && result !== undefined && result !== null) {
      return {
        structuredContent: result as Record<string, unknown>,
        content: [{ type: "text", text }],
      };
    }
    return { content: [{ type: "text", text }] };
  } catch (err) {
    if (err instanceof AIBridgeError || err instanceof CDPError) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message }],
      };
    }
    throw err;
  }
});

async function main(): Promise<void> {
  // Wire CDP events to logger
  cdp.on("connected", () => logger.info("Connected to Dia via CDP"));
  cdp.on("disconnected", () => logger.warn("Disconnected from Dia"));
  cdp.on("reconnecting", ({ delay }: { delay: number }) =>
    logger.info(`Reconnecting to Dia in ${delay}ms…`)
  );
  cdp.on("reconnected", () => logger.info("Reconnected to Dia"));
  cdp.on("reconnect_failed", () =>
    logger.error("Failed to reconnect to Dia after maximum attempts")
  );

  // Try to connect — don't crash if Dia isn't running yet
  try {
    await cdp.connect();
  } catch (err) {
    logger.warn("Could not connect to Dia on startup — tools will fail until Dia is running", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const aiBridgeStatus = config.aiBridge ? "enabled" : "disabled";
  logger.info(
    `mcp-dia ready — ${allTools.length} tools loaded (AI Bridge: ${aiBridgeStatus})`
  );

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

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z, type ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { Config } from "./utils/config.js";
import type { Logger } from "./utils/logger.js";
import type { CDPConnection } from "./cdp/connection.js";

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

export const VERSION = "0.3.0";

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  schema: ZodTypeAny;
  handler: (args: any) => Promise<unknown>;
  readOnly: boolean;
  destructive: boolean;
  openWorld: boolean;
  aiBridge?: boolean;
}

/**
 * Type-safe tool constructor: forces the handler's argument type to match the
 * Zod schema's inferred type. This is the guardrail that makes a handler ↔
 * schema mismatch (e.g. returning a bare array where an object is declared) a
 * compile error instead of a silent runtime protocol violation.
 */
function defineTool<S extends ZodTypeAny, TOut>(def: {
  name: string;
  title: string;
  description: string;
  schema: S;
  handler: (args: z.infer<S>) => Promise<TOut>;
  readOnly: boolean;
  destructive: boolean;
  openWorld: boolean;
  aiBridge?: boolean;
}): ToolDef {
  return def as unknown as ToolDef;
}

export function buildTools(cdp: CDPConnection, config: Config): ToolDef[] {
  const coreTools: ToolDef[] = [
    defineTool({
      name: "list_tabs",
      title: "List tabs",
      description: "List all open tabs in Dia (id, url, title).",
      schema: Tabs.ListTabsInput,
      handler: (a) => Tabs.listTabsHandler(cdp, a),
      readOnly: true,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "open_tab",
      title: "Open tab",
      description: "Open a new tab with the given http(s) URL.",
      schema: Tabs.OpenTabInput,
      handler: (a) => Tabs.openTabHandler(cdp, a),
      readOnly: false,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "close_tab",
      title: "Close tab",
      description: "Close a tab by its ID.",
      schema: Tabs.CloseTabInput,
      handler: (a) => Tabs.closeTabHandler(cdp, a),
      readOnly: false,
      destructive: true,
      openWorld: true,
    }),
    defineTool({
      name: "switch_tab",
      title: "Switch tab",
      description: "Activate (focus) a tab by its ID.",
      schema: Tabs.SwitchTabInput,
      handler: (a) => Tabs.switchTabHandler(cdp, a),
      readOnly: false,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "navigate",
      title: "Navigate",
      description: "Navigate to an http(s) URL in the given tab (or active tab).",
      schema: Navigation.NavigateInput,
      handler: (a) => Navigation.navigateHandler(cdp, a),
      readOnly: false,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "go_back",
      title: "Go back",
      description: "Go to the previous page in browser history.",
      schema: Navigation.GoBackInput,
      handler: (a) => Navigation.goBackHandler(cdp, a),
      readOnly: false,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "go_forward",
      title: "Go forward",
      description: "Go to the next page in browser history.",
      schema: Navigation.GoForwardInput,
      handler: (a) => Navigation.goForwardHandler(cdp, a),
      readOnly: false,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "reload_tab",
      title: "Reload tab",
      description: "Reload the current or specified tab.",
      schema: Navigation.ReloadTabInput,
      handler: (a) => Navigation.reloadTabHandler(cdp, a),
      readOnly: false,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "get_page_content",
      title: "Get page content",
      description:
        "Extract page content as text, HTML, or markdown. Truncated at maxLength (default 100k).",
      schema: Content.GetPageContentInput,
      handler: (a) => Content.getPageContentHandler(cdp, a),
      readOnly: true,
      destructive: false,
      openWorld: true,
    }),
  ];

  const advancedTools: ToolDef[] = [
    defineTool({
      name: "screenshot",
      title: "Screenshot",
      description:
        "Take a screenshot of the viewport, a specific element, or the full page.",
      schema: Screenshot.ScreenshotInput,
      handler: (a) => Screenshot.screenshotHandler(cdp, a),
      readOnly: true,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "generate_pdf",
      title: "Generate PDF",
      description: "Generate a PDF of the page.",
      schema: Screenshot.GeneratePdfInput,
      handler: (a) => Screenshot.generatePdfHandler(cdp, a),
      readOnly: true,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "click_element",
      title: "Click element",
      description:
        "Click an element by CSS selector (default) or XPath. The clicked element's action is arbitrary and may be irreversible.",
      schema: Interaction.ClickElementInput,
      handler: (a) => Interaction.clickElementHandler(cdp, a),
      readOnly: false,
      destructive: true,
      openWorld: true,
    }),
    defineTool({
      name: "fill_input",
      title: "Fill input",
      description:
        "Fill a form field (input, textarea, contenteditable). Use clearBefore to empty first.",
      schema: Interaction.FillInputInput,
      handler: (a) => Interaction.fillInputHandler(cdp, a),
      readOnly: false,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "wait_for_selector",
      title: "Wait for selector",
      description: "Wait for an element to appear in the DOM.",
      schema: Interaction.WaitForSelectorInput,
      handler: (a) => Interaction.waitForSelectorHandler(cdp, a),
      readOnly: true,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "evaluate_js",
      title: "Evaluate JavaScript",
      description:
        "Execute JavaScript in the page context. Returns JSON-serializable values only. WARNING: runs arbitrary code.",
      schema: Javascript.EvaluateJsInput,
      handler: (a) => Javascript.evaluateJsHandler(cdp, a),
      readOnly: false,
      destructive: true,
      openWorld: true,
    }),
    defineTool({
      name: "get_cookies",
      title: "Get cookies",
      description:
        "Get cookies, optionally filtered by URL. HttpOnly cookie values are redacted unless revealValues is set.",
      schema: Network.GetCookiesInput,
      handler: (a) => Network.getCookiesHandler(cdp, a),
      readOnly: true,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "set_cookie",
      title: "Set cookie",
      description: "Set a cookie.",
      schema: Network.SetCookieInput,
      handler: (a) => Network.setCookieHandler(cdp, a),
      readOnly: false,
      destructive: false,
      openWorld: true,
    }),
    defineTool({
      name: "intercept_network",
      title: "Intercept network",
      description: "Log or block network requests matching a URL pattern for a bounded duration.",
      schema: Network.InterceptNetworkInput,
      handler: (a) => Network.interceptNetworkHandler(cdp, a),
      readOnly: false,
      destructive: false,
      openWorld: true,
    }),
  ];

  const aiBridgeTools: ToolDef[] = [
    defineTool({
      name: "dia_send_chat",
      title: "Dia: send chat",
      description:
        "Send a message to Dia's built-in AI chat. Optionally wait for response.",
      schema: Chat.DiaSendChatInput,
      handler: (a) => Chat.diaSendChatHandler(cdp, a),
      readOnly: false,
      destructive: false,
      openWorld: true,
      aiBridge: true,
    }),
    defineTool({
      name: "dia_get_chat_history",
      title: "Dia: get chat history",
      description: "Retrieve conversation history from Dia's AI chat.",
      schema: Chat.DiaGetChatHistoryInput,
      handler: (a) => Chat.diaGetChatHistoryHandler(cdp, a),
      readOnly: true,
      destructive: false,
      openWorld: true,
      aiBridge: true,
    }),
    defineTool({
      name: "dia_list_skills",
      title: "Dia: list skills",
      description: "List available Dia Skills.",
      schema: Skills.DiaListSkillsInput,
      handler: (_a) => Skills.diaListSkillsHandler(cdp),
      readOnly: true,
      destructive: false,
      openWorld: true,
      aiBridge: true,
    }),
    defineTool({
      name: "dia_trigger_skill",
      title: "Dia: trigger skill",
      description:
        "Trigger a Dia Skill on the current page. The triggered skill's effects are arbitrary and may be irreversible.",
      schema: Skills.DiaTriggerSkillInput,
      handler: (a) => Skills.diaTriggerSkillHandler(cdp, a),
      readOnly: false,
      destructive: true,
      openWorld: true,
      aiBridge: true,
    }),
    defineTool({
      name: "dia_search_memory",
      title: "Dia: search memory",
      description:
        "Query Dia's Search memory for personal browsing context.",
      schema: Memory.DiaSearchMemoryInput,
      handler: (a) => Memory.diaSearchMemoryHandler(cdp, a),
      readOnly: true,
      destructive: false,
      openWorld: true,
      aiBridge: true,
    }),
    defineTool({
      name: "dia_get_tab_context",
      title: "Dia: get tab context",
      description:
        "Get Dia's enriched context for a tab (metadata, summary).",
      schema: Memory.DiaGetTabContextInput,
      handler: (a) => Memory.diaGetTabContextHandler(cdp, a),
      readOnly: true,
      destructive: false,
      openWorld: true,
      aiBridge: true,
    }),
  ];

  // `evaluate_js` runs arbitrary JS; it stays enabled by default but can be
  // locked out entirely with DIA_ALLOW_EVAL=false for high-security deployments.
  const advanced =
    config.allowEval === false
      ? advancedTools.filter((t) => t.name !== "evaluate_js")
      : advancedTools;

  return [...coreTools, ...advanced, ...(config.aiBridge ? aiBridgeTools : [])];
}

export interface CallToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/**
 * Parse args, run the handler, and shape the MCP response. ALL handler errors
 * (ToolError, AIBridgeError, CDPError, or any Error) are surfaced as
 * `isError: true` results so the calling model can react, never as an opaque
 * protocol-level failure. `structuredContent` is validated against the tool's
 * outputSchema before being sent.
 */
export async function callTool(
  tools: ToolDef[],
  name: string,
  rawArgs: unknown,
  logger?: Logger
): Promise<CallToolResult> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
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
            text: `Invalid arguments for ${name}: ${err.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", ")}`,
          },
        ],
      };
    }
    throw err;
  }

  try {
    const result = await tool.handler(parsedArgs);
    const text =
      result === undefined || result === null ? "OK" : JSON.stringify(result, null, 2);

    const outSchema = outputSchemas[tool.name];
    if (outSchema && result !== undefined && result !== null) {
      const parsed = outSchema.safeParse(result);
      if (parsed.success) {
        return {
          structuredContent: parsed.data as Record<string, unknown>,
          content: [{ type: "text", text }],
        };
      }
      logger?.warn(`Output of ${name} did not match its declared outputSchema`, {
        issues: parsed.error.issues,
      });
    }
    return { content: [{ type: "text", text }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger?.error(`Tool ${name} failed`, { error: message });
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

function toListEntry(tool: ToolDef): Record<string, unknown> {
  const outSchema = outputSchemas[tool.name];
  const entry: Record<string, unknown> = {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.schema, { target: "jsonSchema7" }),
    annotations: {
      title: tool.title,
      readOnlyHint: tool.readOnly,
      destructiveHint: tool.destructive,
      idempotentHint: tool.readOnly,
      openWorldHint: tool.openWorld,
    },
  };
  if (outSchema) {
    entry.outputSchema = zodToJsonSchema(outSchema, { target: "jsonSchema7" });
  }
  return entry;
}

export function createServer(cdp: CDPConnection, config: Config, logger?: Logger): Server {
  const tools = buildTools(cdp, config);
  const server = new Server(
    { name: "mcp-dia", version: VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(toListEntry),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    // Cast: our CallToolResult is a valid MCP tool result, but the SDK's return
    // union also admits an async-task variant we don't use.
    return (await callTool(tools, name, rawArgs, logger)) as unknown as Record<string, unknown>;
  });

  return server;
}

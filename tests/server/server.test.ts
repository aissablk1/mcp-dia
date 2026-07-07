import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMockClient, createMockCDP, type MockCDPClient } from "../helpers/mock-cdp.js";
import { CDPConnection } from "../../src/cdp/connection.js";
import { buildTools, callTool } from "../../src/server.js";
import type { Config } from "../../src/utils/config.js";

const baseConfig: Config = {
  cdpHost: "localhost",
  cdpPort: 9222,
  aiBridge: true,
  logLevel: "error",
  reconnectMax: 1000,
};

let client: MockCDPClient;
let cdp: CDPConnection;

beforeEach(() => {
  CDPConnection.resetInstance();
  client = createMockClient();
  cdp = createMockCDP(client);
});

afterEach(() => {
  CDPConnection.resetInstance();
});

describe("buildTools", () => {
  it("exposes 24 tools when AI Bridge is enabled", () => {
    expect(buildTools(cdp, baseConfig)).toHaveLength(24);
  });

  it("exposes 18 tools when AI Bridge is disabled", () => {
    expect(buildTools(cdp, { ...baseConfig, aiBridge: false })).toHaveLength(18);
  });

  it("marks arbitrary-action tools as destructive", () => {
    const tools = buildTools(cdp, baseConfig);
    const destructive = (name: string) => tools.find((t) => t.name === name)?.destructive;
    expect(destructive("click_element")).toBe(true);
    expect(destructive("dia_trigger_skill")).toBe(true);
    expect(destructive("evaluate_js")).toBe(true);
    expect(destructive("close_tab")).toBe(true);
    expect(destructive("get_page_content")).toBe(false);
  });
});

describe("callTool — outputSchema conformance", () => {
  it("wraps array-returning tools in their declared object envelope", async () => {
    const tools = buildTools(cdp, baseConfig);

    const listTabs = await callTool(tools, "list_tabs", {});
    expect(listTabs.isError).toBeFalsy();
    expect(listTabs.structuredContent).toHaveProperty("tabs");
    expect(Array.isArray((listTabs.structuredContent as any).tabs)).toBe(true);

    const cookies = await callTool(tools, "get_cookies", {});
    expect(cookies.structuredContent).toHaveProperty("cookies");

    const history = await callTool(tools, "dia_get_chat_history", {});
    expect(history.structuredContent).toHaveProperty("messages");

    const skills = await callTool(tools, "dia_list_skills", {});
    expect(skills.structuredContent).toHaveProperty("skills");
  });
});

describe("callTool — error surface", () => {
  it("returns isError for an unknown tool", async () => {
    const tools = buildTools(cdp, baseConfig);
    const r = await callTool(tools, "does_not_exist", {});
    expect(r.isError).toBe(true);
  });

  it("returns isError (never a thrown protocol error) for invalid/blocked-scheme arguments", async () => {
    const tools = buildTools(cdp, baseConfig);
    const r = await callTool(tools, "navigate", { url: "file:///etc/passwd" });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("Invalid arguments");
  });

  it("maps a handler ToolError to an isError result", async () => {
    client.Network.setCookie.mockResolvedValue({ success: false });
    const tools = buildTools(cdp, baseConfig);
    const r = await callTool(tools, "set_cookie", { name: "x", value: "y", domain: ".example.com" });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("set_cookie");
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMockClient, createMockCDP, type MockCDPClient } from "../helpers/mock-cdp.js";
import { CDPConnection } from "../../src/cdp/connection.js";
import { listTabsHandler, openTabHandler, closeTabHandler, switchTabHandler } from "../../src/tools/core/tabs.js";
import { navigateHandler, goBackHandler, goForwardHandler, reloadTabHandler } from "../../src/tools/core/navigation.js";
import { getPageContentHandler } from "../../src/tools/core/content.js";

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

describe("listTabsHandler", () => {
  it("returns list of tabs from CDP", async () => {
    const result = await listTabsHandler(cdp, {});
    expect(result.tabs).toHaveLength(2);
    expect(result.tabs[0]).toMatchObject({ id: "tab-1", url: "https://example.com" });
  });
});

describe("openTabHandler", () => {
  it("creates a new tab and returns targetId", async () => {
    const result = await openTabHandler(cdp, { url: "https://example.com" });
    expect(result.targetId).toBe("new-tab-123");
    expect(client.Target.createTarget).toHaveBeenCalledWith({ url: "https://example.com" });
  });
});

describe("closeTabHandler", () => {
  it("closes a tab by ID", async () => {
    const result = await closeTabHandler(cdp, { tabId: "tab-1" });
    expect(result.success).toBe(true);
    expect(client.Target.closeTarget).toHaveBeenCalledWith({ targetId: "tab-1" });
  });
});

describe("switchTabHandler", () => {
  it("activates a tab by ID", async () => {
    const result = await switchTabHandler(cdp, { tabId: "tab-2" });
    expect(result.success).toBe(true);
    expect(client.Target.activateTarget).toHaveBeenCalledWith({ targetId: "tab-2" });
  });
});

describe("navigateHandler", () => {
  it("navigates to URL in active tab", async () => {
    const result = await navigateHandler(cdp, { url: "https://example.com" });
    expect(result.url).toBe("https://example.com");
    expect(client.Page.navigate).toHaveBeenCalledWith({ url: "https://example.com" });
  });
});

describe("goBackHandler", () => {
  it("navigates to previous history entry", async () => {
    const result = await goBackHandler(cdp, {});
    expect(result.success).toBe(true);
    expect(client.Page.navigateToHistoryEntry).toHaveBeenCalledWith({ entryId: 0 });
  });

  it("returns false when at first entry", async () => {
    client.Page.getNavigationHistory.mockResolvedValue({ currentIndex: 0, entries: [{ id: 0 }] });
    const result = await goBackHandler(cdp, {});
    expect(result.success).toBe(false);
  });
});

describe("goForwardHandler", () => {
  it("navigates to next history entry", async () => {
    const result = await goForwardHandler(cdp, {});
    expect(result.success).toBe(true);
    expect(client.Page.navigateToHistoryEntry).toHaveBeenCalledWith({ entryId: 2 });
  });

  it("returns false when at last entry", async () => {
    client.Page.getNavigationHistory.mockResolvedValue({ currentIndex: 0, entries: [{ id: 0 }] });
    const result = await goForwardHandler(cdp, {});
    expect(result.success).toBe(false);
  });
});

describe("reloadTabHandler", () => {
  it("reloads with default cache behavior", async () => {
    const result = await reloadTabHandler(cdp, { ignoreCache: false });
    expect(result.success).toBe(true);
    expect(client.Page.reload).toHaveBeenCalledWith({ ignoreCache: false });
  });

  it("reloads ignoring cache", async () => {
    await reloadTabHandler(cdp, { ignoreCache: true });
    expect(client.Page.reload).toHaveBeenCalledWith({ ignoreCache: true });
  });
});

describe("getPageContentHandler", () => {
  it("returns text content", async () => {
    client.Runtime.evaluate.mockResolvedValue({ result: { value: "Hello World" } });
    const result = await getPageContentHandler(cdp, { format: "text", maxLength: 100000 });
    expect(result.content).toBe("Hello World");
    expect(result.truncated).toBe(false);
  });

  it("truncates content exceeding maxLength", async () => {
    const longText = "x".repeat(200);
    client.Runtime.evaluate.mockResolvedValue({ result: { value: longText } });
    const result = await getPageContentHandler(cdp, { format: "text", maxLength: 100 });
    expect(result.truncated).toBe(true);
    expect(result.content).toContain("[truncated]");
  });

  it("returns HTML content", async () => {
    client.Runtime.evaluate.mockResolvedValue({ result: { value: "<html><body>Hi</body></html>" } });
    const result = await getPageContentHandler(cdp, { format: "html", maxLength: 100000 });
    expect(result.content).toContain("<html>");
  });
});

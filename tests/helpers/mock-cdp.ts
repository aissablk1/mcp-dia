import { vi } from "vitest";
import { CDPConnection } from "../../src/cdp/connection.js";

export interface MockCDPClient {
  Runtime: {
    enable: ReturnType<typeof vi.fn>;
    evaluate: ReturnType<typeof vi.fn>;
  };
  Page: {
    enable: ReturnType<typeof vi.fn>;
    navigate: ReturnType<typeof vi.fn>;
    loadEventFired: ReturnType<typeof vi.fn>;
    reload: ReturnType<typeof vi.fn>;
    getNavigationHistory: ReturnType<typeof vi.fn>;
    navigateToHistoryEntry: ReturnType<typeof vi.fn>;
    captureScreenshot: ReturnType<typeof vi.fn>;
    printToPDF: ReturnType<typeof vi.fn>;
  };
  Network: {
    enable: ReturnType<typeof vi.fn>;
    getCookies: ReturnType<typeof vi.fn>;
    setCookie: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  };
  Target: {
    createTarget: ReturnType<typeof vi.fn>;
    closeTarget: ReturnType<typeof vi.fn>;
    activateTarget: ReturnType<typeof vi.fn>;
  };
  Input: {
    dispatchKeyEvent: ReturnType<typeof vi.fn>;
  };
  Fetch: {
    enable: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    failRequest: ReturnType<typeof vi.fn>;
    continueRequest: ReturnType<typeof vi.fn>;
  };
  close: ReturnType<typeof vi.fn>;
}

export function createMockClient(): MockCDPClient {
  return {
    Runtime: {
      enable: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue({ result: { value: null } }),
    },
    Page: {
      enable: vi.fn().mockResolvedValue(undefined),
      navigate: vi.fn().mockResolvedValue({}),
      loadEventFired: vi.fn().mockResolvedValue({}),
      reload: vi.fn().mockResolvedValue({}),
      getNavigationHistory: vi.fn().mockResolvedValue({ currentIndex: 1, entries: [{ id: 0 }, { id: 1 }, { id: 2 }] }),
      navigateToHistoryEntry: vi.fn().mockResolvedValue({}),
      captureScreenshot: vi.fn().mockResolvedValue({ data: "base64data" }),
      printToPDF: vi.fn().mockResolvedValue({ data: "pdfbase64" }),
    },
    Network: {
      enable: vi.fn().mockResolvedValue(undefined),
      getCookies: vi.fn().mockResolvedValue({ cookies: [] }),
      setCookie: vi.fn().mockResolvedValue({ success: true }),
      on: vi.fn(),
    },
    Target: {
      createTarget: vi.fn().mockResolvedValue({ targetId: "new-tab-123" }),
      closeTarget: vi.fn().mockResolvedValue({}),
      activateTarget: vi.fn().mockResolvedValue({}),
    },
    Input: {
      dispatchKeyEvent: vi.fn().mockResolvedValue({}),
    },
    Fetch: {
      enable: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      failRequest: vi.fn().mockResolvedValue(undefined),
      continueRequest: vi.fn().mockResolvedValue(undefined),
    },
    close: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockCDP(client: MockCDPClient): CDPConnection {
  const cdp = CDPConnection.getInstance({ host: "localhost", port: 19999, reconnectMax: 1000 });
  vi.spyOn(cdp, "getActiveTab").mockResolvedValue(client as any);
  vi.spyOn(cdp, "attachToTab").mockResolvedValue(client as any);
  vi.spyOn(cdp, "listTargets").mockResolvedValue([
    { id: "tab-1", url: "https://example.com", title: "Example", active: true },
    { id: "tab-2", url: "https://google.com", title: "Google", active: false },
  ]);
  return cdp;
}

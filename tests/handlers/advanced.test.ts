import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMockClient, createMockCDP, type MockCDPClient } from "../helpers/mock-cdp.js";
import { CDPConnection } from "../../src/cdp/connection.js";
import { clickElementHandler, fillInputHandler, waitForSelectorHandler } from "../../src/tools/advanced/interaction.js";
import { screenshotHandler, generatePdfHandler } from "../../src/tools/advanced/screenshot.js";
import { evaluateJsHandler } from "../../src/tools/advanced/javascript.js";
import { getCookiesHandler, setCookieHandler } from "../../src/tools/advanced/network.js";

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

describe("clickElementHandler", () => {
  it("clicks element via CSS selector", async () => {
    client.Runtime.evaluate.mockResolvedValue({ result: { value: true } });
    const result = await clickElementHandler(cdp, { selector: "#btn", selectorType: "css" });
    expect(result.success).toBe(true);
    expect(client.Runtime.evaluate).toHaveBeenCalled();
  });

  it("throws when element not found", async () => {
    client.Runtime.evaluate.mockResolvedValue({
      exceptionDetails: { exception: { description: "Element not found: #missing" } },
    });
    await expect(clickElementHandler(cdp, { selector: "#missing", selectorType: "css" })).rejects.toThrow();
  });
});

describe("fillInputHandler", () => {
  it("fills input field", async () => {
    client.Runtime.evaluate.mockResolvedValue({ result: { value: true } });
    const result = await fillInputHandler(cdp, {
      selector: "input[name=email]",
      value: "test@example.com",
      selectorType: "css",
      clearBefore: false,
    });
    expect(result.success).toBe(true);
  });

  it("supports clearBefore option", async () => {
    client.Runtime.evaluate.mockResolvedValue({ result: { value: true } });
    await fillInputHandler(cdp, {
      selector: "input",
      value: "new value",
      selectorType: "css",
      clearBefore: true,
    });
    const callArg = client.Runtime.evaluate.mock.calls[0][0].expression;
    expect(callArg).toContain("el.value=''");
  });
});

describe("waitForSelectorHandler", () => {
  it("returns found true when element exists", async () => {
    client.Runtime.evaluate.mockResolvedValue({ result: { value: true } });
    const result = await waitForSelectorHandler(cdp, {
      selector: ".loaded",
      selectorType: "css",
      timeout: 1000,
    });
    expect(result.found).toBe(true);
  });

  it("returns found false on timeout", async () => {
    client.Runtime.evaluate.mockResolvedValue({ result: { value: false } });
    const result = await waitForSelectorHandler(cdp, {
      selector: ".never",
      selectorType: "css",
      timeout: 100,
    });
    expect(result.found).toBe(false);
  });
});

describe("screenshotHandler", () => {
  it("takes a viewport screenshot", async () => {
    const result = await screenshotHandler(cdp, { fullPage: false, format: "png" });
    expect(result.data).toBe("base64data");
    expect(result.format).toBe("png");
  });

  it("captures with selector clip", async () => {
    client.Runtime.evaluate.mockResolvedValue({
      result: { value: { x: 10, y: 20, width: 100, height: 50 } },
    });
    const result = await screenshotHandler(cdp, { selector: "#hero", fullPage: false, format: "png" });
    expect(result.data).toBe("base64data");
    expect(client.Page.captureScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({ clip: expect.objectContaining({ x: 10, y: 20 }) })
    );
  });
});

describe("generatePdfHandler", () => {
  it("generates A4 PDF", async () => {
    const result = await generatePdfHandler(cdp, { format: "A4", landscape: false });
    expect(result.data).toBe("pdfbase64");
    expect(client.Page.printToPDF).toHaveBeenCalledWith(
      expect.objectContaining({ paperWidth: 8.27, landscape: false })
    );
  });
});

describe("evaluateJsHandler", () => {
  it("returns evaluated value", async () => {
    client.Runtime.evaluate.mockResolvedValue({ result: { value: 42 } });
    const result = await evaluateJsHandler(cdp, { expression: "21 * 2" });
    expect(result).toBe(42);
  });

  it("throws on evaluation error", async () => {
    client.Runtime.evaluate.mockResolvedValue({
      exceptionDetails: { exception: { description: "ReferenceError" } },
    });
    await expect(evaluateJsHandler(cdp, { expression: "undefinedVar" })).rejects.toThrow();
  });
});

describe("getCookiesHandler", () => {
  it("returns empty array when no cookies", async () => {
    const result = await getCookiesHandler(cdp, {});
    expect(result).toEqual([]);
  });

  it("filters by URL when provided", async () => {
    client.Network.getCookies.mockResolvedValue({
      cookies: [{ name: "session", value: "abc", domain: ".example.com", path: "/", secure: true, httpOnly: true, expires: 0 }],
    });
    const result = await getCookiesHandler(cdp, { url: "https://example.com" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("session");
    expect(client.Network.getCookies).toHaveBeenCalledWith({ urls: ["https://example.com"] });
  });
});

describe("setCookieHandler", () => {
  it("sets a cookie successfully", async () => {
    const result = await setCookieHandler(cdp, {
      name: "test",
      value: "123",
      domain: ".example.com",
      path: "/",
      secure: false,
      httpOnly: false,
    });
    expect(result.success).toBe(true);
  });

  it("throws when cookie set fails", async () => {
    client.Network.setCookie.mockResolvedValue({ success: false });
    await expect(
      setCookieHandler(cdp, {
        name: "bad",
        value: "x",
        domain: ".nope",
        path: "/",
        secure: false,
        httpOnly: false,
      })
    ).rejects.toThrow();
  });
});

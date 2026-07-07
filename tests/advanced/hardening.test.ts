import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMockClient, createMockCDP, type MockCDPClient } from "../helpers/mock-cdp.js";
import { CDPConnection } from "../../src/cdp/connection.js";
import { screenshotHandler } from "../../src/tools/advanced/screenshot.js";
import { getCookiesHandler, interceptNetworkHandler } from "../../src/tools/advanced/network.js";

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

describe("screenshot selector errors", () => {
  it("throws instead of silently capturing the viewport when the selector is missing", async () => {
    client.Runtime.evaluate.mockResolvedValue({
      exceptionDetails: { exception: { description: "Selector not found" } },
    });
    await expect(
      screenshotHandler(cdp, { selector: "#missing", fullPage: false, format: "png" })
    ).rejects.toThrow();
    expect(client.Page.captureScreenshot).not.toHaveBeenCalled();
  });
});

describe("get_cookies HttpOnly redaction", () => {
  it("redacts HttpOnly values by default and reveals them only on opt-in", async () => {
    client.Network.getCookies.mockResolvedValue({
      cookies: [
        { name: "session", value: "secret", domain: ".e.com", path: "/", secure: true, httpOnly: true, expires: 0 },
      ],
    });
    const redacted = await getCookiesHandler(cdp, { revealValues: false });
    expect(redacted.cookies[0].value).toBe("[redacted: HttpOnly]");

    const revealed = await getCookiesHandler(cdp, { revealValues: true });
    expect(revealed.cookies[0].value).toBe("secret");
  });
});

describe("intercept_network teardown", () => {
  it("disables the Network domain and removes its listener after the log window", async () => {
    const result = await interceptNetworkHandler(cdp, {
      urlPattern: "example",
      action: "log",
      duration: 5,
    });
    expect(result).toHaveProperty("requests");
    expect(client.Network.enable).toHaveBeenCalled();
    expect(client.Network.disable).toHaveBeenCalled();
    expect(client.Network.removeListener).toHaveBeenCalled();
  });

  it("disables the Fetch domain after the block window", async () => {
    const result = await interceptNetworkHandler(cdp, {
      urlPattern: "example",
      action: "block",
      duration: 5,
    });
    expect(result).toHaveProperty("requests");
    expect(client.Fetch.enable).toHaveBeenCalled();
    expect(client.Fetch.disable).toHaveBeenCalled();
  });
});

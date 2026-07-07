import { describe, it, expect, afterEach } from "vitest";
import { loadConfig } from "../../src/utils/config.js";

const KEYS = ["DIA_CDP_HOST", "DIA_CDP_PORT", "DIA_AI_BRIDGE", "DIA_LOG_LEVEL", "DIA_RECONNECT_MAX"];

function clearEnv() {
  for (const k of KEYS) delete process.env[k];
}

afterEach(() => {
  clearEnv();
});

describe("loadConfig", () => {
  it("uses safe defaults", () => {
    clearEnv();
    const c = loadConfig();
    expect(c.cdpHost).toBe("localhost");
    expect(c.cdpPort).toBe(9222);
    expect(c.aiBridge).toBe(true);
    expect(c.logLevel).toBe("info");
    expect(c.reconnectMax).toBe(30000);
  });

  it("falls back to the default port when DIA_CDP_PORT is not a valid integer", () => {
    clearEnv();
    process.env.DIA_CDP_PORT = "abc";
    expect(loadConfig().cdpPort).toBe(9222);
  });

  it("falls back to the default reconnectMax when DIA_RECONNECT_MAX is invalid", () => {
    clearEnv();
    process.env.DIA_RECONNECT_MAX = "not-a-number";
    expect(loadConfig().reconnectMax).toBe(30000);
  });

  it("falls back to 'info' when DIA_LOG_LEVEL is unknown (never silences the logger)", () => {
    clearEnv();
    process.env.DIA_LOG_LEVEL = "verbose";
    expect(loadConfig().logLevel).toBe("info");
  });

  it("disables AI Bridge only when DIA_AI_BRIDGE is exactly 'false'", () => {
    clearEnv();
    process.env.DIA_AI_BRIDGE = "false";
    expect(loadConfig().aiBridge).toBe(false);
    process.env.DIA_AI_BRIDGE = "0";
    expect(loadConfig().aiBridge).toBe(true);
  });
});

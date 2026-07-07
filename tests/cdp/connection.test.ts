import { describe, it, expect, afterEach } from "vitest";
import { CDPConnection } from "../../src/cdp/connection.js";
import { CDPError } from "../../src/utils/errors.js";

afterEach(async () => {
  await CDPConnection.resetInstance();
});

describe("CDPConnection", () => {
  it("is a singleton", () => {
    const a = CDPConnection.getInstance({ host: "localhost", port: 19222, reconnectMax: 5000 });
    const b = CDPConnection.getInstance({ host: "localhost", port: 19222, reconnectMax: 5000 });
    expect(a).toBe(b);
  });

  it("reports not connected initially", () => {
    const conn = CDPConnection.getInstance({ host: "localhost", port: 19999, reconnectMax: 1000 });
    expect(conn.isConnected()).toBe(false);
  });

  it("getActiveTab throws NOT_CONNECTED while not connected", async () => {
    const conn = CDPConnection.getInstance({ host: "localhost", port: 19999, reconnectMax: 1000 });
    await expect(conn.getActiveTab()).rejects.toBeInstanceOf(CDPError);
    await expect(conn.getActiveTab()).rejects.toThrow("Not connected to Dia");
  });

  it("connect() throws a CDPError with Dia launch instructions when unreachable", async () => {
    const conn = CDPConnection.getInstance({ host: "127.0.0.1", port: 1, reconnectMax: 1000 });
    await expect(conn.connect()).rejects.toThrow(/remote-debugging-port/);
  });
});

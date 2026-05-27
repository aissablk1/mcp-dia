import { describe, it, expect } from "vitest";
import { CDPConnection } from "../../src/cdp/connection.js";

describe("CDPConnection", () => {
  it("should be a singleton", () => {
    const a = CDPConnection.getInstance({ host: "localhost", port: 19222, reconnectMax: 5000 });
    const b = CDPConnection.getInstance({ host: "localhost", port: 19222, reconnectMax: 5000 });
    expect(a).toBe(b);
    CDPConnection.resetInstance();
  });

  it("should report not connected initially", () => {
    const conn = CDPConnection.getInstance({ host: "localhost", port: 19999, reconnectMax: 1000 });
    expect(conn.isConnected()).toBe(false);
    CDPConnection.resetInstance();
  });
});

import { describe, it, expect } from "vitest";
import { DiaSendChatInput, DiaGetChatHistoryInput } from "../../src/tools/ai-bridge/chat.js";

describe("DiaSendChatInput", () => {
  it("accepts a non-empty message", () => {
    expect(() => DiaSendChatInput.parse({ message: "Hello Dia" })).not.toThrow();
  });

  it("rejects an empty message", () => {
    expect(() => DiaSendChatInput.parse({ message: "" })).toThrow();
  });

  it("requires message field", () => {
    expect(() => DiaSendChatInput.parse({})).toThrow();
  });

  it("defaults waitForResponse to false", () => {
    const result = DiaSendChatInput.parse({ message: "Hi" });
    expect(result.waitForResponse).toBe(false);
  });

  it("accepts waitForResponse true", () => {
    const result = DiaSendChatInput.parse({ message: "Hi", waitForResponse: true });
    expect(result.waitForResponse).toBe(true);
  });

  it("defaults timeout to 30000", () => {
    const result = DiaSendChatInput.parse({ message: "Hi" });
    expect(result.timeout).toBe(30000);
  });

  it("accepts a custom positive timeout", () => {
    const result = DiaSendChatInput.parse({ message: "Hi", timeout: 5000 });
    expect(result.timeout).toBe(5000);
  });

  it("rejects a non-positive timeout", () => {
    expect(() => DiaSendChatInput.parse({ message: "Hi", timeout: 0 })).toThrow();
    expect(() => DiaSendChatInput.parse({ message: "Hi", timeout: -1 })).toThrow();
  });
});

describe("DiaGetChatHistoryInput", () => {
  it("accepts empty object (uses defaults)", () => {
    expect(() => DiaGetChatHistoryInput.parse({})).not.toThrow();
  });

  it("defaults limit to 20", () => {
    const result = DiaGetChatHistoryInput.parse({});
    expect(result.limit).toBe(20);
  });

  it("accepts a custom positive limit", () => {
    const result = DiaGetChatHistoryInput.parse({ limit: 50 });
    expect(result.limit).toBe(50);
  });

  it("rejects a non-positive limit", () => {
    expect(() => DiaGetChatHistoryInput.parse({ limit: 0 })).toThrow();
    expect(() => DiaGetChatHistoryInput.parse({ limit: -5 })).toThrow();
  });
});

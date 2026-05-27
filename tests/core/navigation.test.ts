import { describe, it, expect } from "vitest";
import { NavigateInput, GoBackInput, GoForwardInput, ReloadTabInput } from "../../src/tools/core/navigation.js";

describe("NavigateInput", () => {
  it("accepts valid URL", () => {
    expect(() => NavigateInput.parse({ url: "https://example.com" })).not.toThrow();
  });

  it("accepts valid URL with optional tabId", () => {
    expect(() => NavigateInput.parse({ url: "https://example.com", tabId: "abc" })).not.toThrow();
  });

  it("rejects invalid URL", () => {
    expect(() => NavigateInput.parse({ url: "not-a-url" })).toThrow();
  });

  it("requires url", () => {
    expect(() => NavigateInput.parse({})).toThrow();
  });

  it("tabId is optional", () => {
    const result = NavigateInput.parse({ url: "https://example.com" });
    expect(result.tabId).toBeUndefined();
  });
});

describe("GoBackInput", () => {
  it("accepts empty object", () => {
    expect(() => GoBackInput.parse({})).not.toThrow();
  });

  it("accepts optional tabId", () => {
    expect(() => GoBackInput.parse({ tabId: "abc" })).not.toThrow();
  });
});

describe("GoForwardInput", () => {
  it("accepts empty object", () => {
    expect(() => GoForwardInput.parse({})).not.toThrow();
  });

  it("accepts optional tabId", () => {
    expect(() => GoForwardInput.parse({ tabId: "abc" })).not.toThrow();
  });
});

describe("ReloadTabInput", () => {
  it("defaults ignoreCache to false", () => {
    const result = ReloadTabInput.parse({});
    expect(result.ignoreCache).toBe(false);
  });

  it("accepts ignoreCache true", () => {
    const result = ReloadTabInput.parse({ ignoreCache: true });
    expect(result.ignoreCache).toBe(true);
  });

  it("accepts optional tabId", () => {
    expect(() => ReloadTabInput.parse({ tabId: "abc" })).not.toThrow();
  });
});

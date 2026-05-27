import { describe, it, expect } from "vitest";
import { ListTabsInput, OpenTabInput, CloseTabInput, SwitchTabInput } from "../../src/tools/core/tabs.js";

describe("ListTabsInput", () => {
  it("accepts empty object", () => {
    expect(() => ListTabsInput.parse({})).not.toThrow();
  });
});

describe("OpenTabInput", () => {
  it("accepts a valid URL", () => {
    expect(() => OpenTabInput.parse({ url: "https://example.com" })).not.toThrow();
  });

  it("rejects an invalid URL", () => {
    expect(() => OpenTabInput.parse({ url: "not-a-url" })).toThrow();
  });

  it("requires url field", () => {
    expect(() => OpenTabInput.parse({})).toThrow();
  });
});

describe("CloseTabInput", () => {
  it("accepts tabId string", () => {
    expect(() => CloseTabInput.parse({ tabId: "abc-123" })).not.toThrow();
  });

  it("requires tabId", () => {
    expect(() => CloseTabInput.parse({})).toThrow();
  });
});

describe("SwitchTabInput", () => {
  it("accepts tabId string", () => {
    expect(() => SwitchTabInput.parse({ tabId: "abc-123" })).not.toThrow();
  });

  it("requires tabId", () => {
    expect(() => SwitchTabInput.parse({})).toThrow();
  });
});

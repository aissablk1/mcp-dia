import { describe, it, expect } from "vitest";
import { ClickElementInput, FillInputInput, WaitForSelectorInput } from "../../src/tools/advanced/interaction.js";

describe("ClickElementInput", () => {
  it("requires selector", () => {
    expect(() => ClickElementInput.parse({})).toThrow();
  });

  it("accepts selector", () => {
    expect(() => ClickElementInput.parse({ selector: "#btn" })).not.toThrow();
  });

  it("defaults selectorType to css", () => {
    const result = ClickElementInput.parse({ selector: "#btn" });
    expect(result.selectorType).toBe("css");
  });

  it("accepts xpath selectorType", () => {
    const result = ClickElementInput.parse({ selector: "//button", selectorType: "xpath" });
    expect(result.selectorType).toBe("xpath");
  });

  it("rejects invalid selectorType", () => {
    expect(() => ClickElementInput.parse({ selector: "#btn", selectorType: "id" })).toThrow();
  });
});

describe("FillInputInput", () => {
  it("requires selector and value", () => {
    expect(() => FillInputInput.parse({})).toThrow();
  });

  it("accepts selector and value", () => {
    expect(() => FillInputInput.parse({ selector: "#input", value: "hello" })).not.toThrow();
  });

  it("defaults clearBefore to false", () => {
    const result = FillInputInput.parse({ selector: "#input", value: "hello" });
    expect(result.clearBefore).toBe(false);
  });

  it("accepts clearBefore true", () => {
    const result = FillInputInput.parse({ selector: "#input", value: "hello", clearBefore: true });
    expect(result.clearBefore).toBe(true);
  });

  it("defaults selectorType to css", () => {
    const result = FillInputInput.parse({ selector: "#input", value: "hello" });
    expect(result.selectorType).toBe("css");
  });
});

describe("WaitForSelectorInput", () => {
  it("requires selector", () => {
    expect(() => WaitForSelectorInput.parse({})).toThrow();
  });

  it("defaults timeout to 5000", () => {
    const result = WaitForSelectorInput.parse({ selector: "#el" });
    expect(result.timeout).toBe(5000);
  });

  it("accepts custom timeout", () => {
    const result = WaitForSelectorInput.parse({ selector: "#el", timeout: 10000 });
    expect(result.timeout).toBe(10000);
  });

  it("rejects non-positive timeout", () => {
    expect(() => WaitForSelectorInput.parse({ selector: "#el", timeout: 0 })).toThrow();
  });
});

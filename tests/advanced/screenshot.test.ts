import { describe, it, expect } from "vitest";
import { ScreenshotInput, GeneratePdfInput } from "../../src/tools/advanced/screenshot.js";
import { EvaluateJsInput } from "../../src/tools/advanced/javascript.js";

describe("ScreenshotInput", () => {
  it("defaults format to png", () => {
    const result = ScreenshotInput.parse({});
    expect(result.format).toBe("png");
  });

  it("defaults fullPage to false", () => {
    const result = ScreenshotInput.parse({});
    expect(result.fullPage).toBe(false);
  });

  it("accepts jpeg format", () => {
    const result = ScreenshotInput.parse({ format: "jpeg" });
    expect(result.format).toBe("jpeg");
  });

  it("accepts webp format", () => {
    const result = ScreenshotInput.parse({ format: "webp" });
    expect(result.format).toBe("webp");
  });

  it("rejects invalid format", () => {
    expect(() => ScreenshotInput.parse({ format: "gif" })).toThrow();
  });

  it("accepts fullPage true", () => {
    const result = ScreenshotInput.parse({ fullPage: true });
    expect(result.fullPage).toBe(true);
  });

  it("accepts optional selector", () => {
    expect(() => ScreenshotInput.parse({ selector: "#hero" })).not.toThrow();
  });
});

describe("GeneratePdfInput", () => {
  it("defaults format to A4", () => {
    const result = GeneratePdfInput.parse({});
    expect(result.format).toBe("A4");
  });

  it("defaults landscape to false (portrait)", () => {
    const result = GeneratePdfInput.parse({});
    expect(result.landscape).toBe(false);
  });

  it("accepts Letter format", () => {
    const result = GeneratePdfInput.parse({ format: "Letter" });
    expect(result.format).toBe("Letter");
  });

  it("accepts landscape true", () => {
    const result = GeneratePdfInput.parse({ landscape: true });
    expect(result.landscape).toBe(true);
  });

  it("rejects invalid format", () => {
    expect(() => GeneratePdfInput.parse({ format: "A3" })).toThrow();
  });
});

describe("EvaluateJsInput", () => {
  it("requires expression", () => {
    expect(() => EvaluateJsInput.parse({})).toThrow();
  });

  it("accepts expression", () => {
    expect(() => EvaluateJsInput.parse({ expression: "1+1" })).not.toThrow();
  });

  it("accepts optional tabId", () => {
    expect(() => EvaluateJsInput.parse({ expression: "1+1", tabId: "abc" })).not.toThrow();
  });
});

import { describe, it, expect } from "vitest";
import { GetPageContentInput } from "../../src/tools/core/content.js";

describe("GetPageContentInput", () => {
  it("defaults format to text", () => {
    const result = GetPageContentInput.parse({});
    expect(result.format).toBe("text");
  });

  it("defaults maxLength to 100000", () => {
    const result = GetPageContentInput.parse({});
    expect(result.maxLength).toBe(100000);
  });

  it("accepts format html", () => {
    const result = GetPageContentInput.parse({ format: "html" });
    expect(result.format).toBe("html");
  });

  it("accepts format markdown", () => {
    const result = GetPageContentInput.parse({ format: "markdown" });
    expect(result.format).toBe("markdown");
  });

  it("rejects invalid format", () => {
    expect(() => GetPageContentInput.parse({ format: "pdf" })).toThrow();
  });

  it("rejects negative maxLength", () => {
    expect(() => GetPageContentInput.parse({ maxLength: -1 })).toThrow();
  });

  it("rejects zero maxLength", () => {
    expect(() => GetPageContentInput.parse({ maxLength: 0 })).toThrow();
  });

  it("accepts custom maxLength", () => {
    const result = GetPageContentInput.parse({ maxLength: 500 });
    expect(result.maxLength).toBe(500);
  });
});

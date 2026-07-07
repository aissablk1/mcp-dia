import { describe, it, expect } from "vitest";
import { NavigateInput } from "../../src/tools/core/navigation.js";
import { OpenTabInput } from "../../src/tools/core/tabs.js";

const DANGEROUS = [
  "file:///Users/x/.ssh/id_rsa",
  "javascript:alert(document.cookie)",
  "data:text/html,<script>alert(1)</script>",
  "chrome://settings",
  "view-source:https://example.com",
  "chrome-extension://abc/page.html",
];

describe("SafeUrl allow-list", () => {
  it("accepts http(s) URLs", () => {
    expect(NavigateInput.parse({ url: "https://example.com" }).url).toBe("https://example.com");
    expect(NavigateInput.parse({ url: "http://localhost:3000" }).url).toBe("http://localhost:3000");
  });

  it("accepts about:blank", () => {
    expect(OpenTabInput.parse({ url: "about:blank" }).url).toBe("about:blank");
  });

  it.each(DANGEROUS)("rejects dangerous scheme: %s", (url) => {
    expect(() => NavigateInput.parse({ url })).toThrow();
    expect(() => OpenTabInput.parse({ url })).toThrow();
  });
});

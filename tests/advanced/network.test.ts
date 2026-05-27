import { describe, it, expect } from "vitest";
import { GetCookiesInput, SetCookieInput, InterceptNetworkInput } from "../../src/tools/advanced/network.js";

describe("GetCookiesInput", () => {
  it("accepts empty object", () => {
    expect(() => GetCookiesInput.parse({})).not.toThrow();
  });

  it("accepts valid URL", () => {
    expect(() => GetCookiesInput.parse({ url: "https://example.com" })).not.toThrow();
  });

  it("rejects invalid URL", () => {
    expect(() => GetCookiesInput.parse({ url: "not-a-url" })).toThrow();
  });

  it("url is optional", () => {
    const result = GetCookiesInput.parse({});
    expect(result.url).toBeUndefined();
  });
});

describe("SetCookieInput", () => {
  it("requires name, value, domain", () => {
    expect(() => SetCookieInput.parse({})).toThrow();
    expect(() => SetCookieInput.parse({ name: "x" })).toThrow();
    expect(() => SetCookieInput.parse({ name: "x", value: "y" })).toThrow();
  });

  it("accepts name, value, domain", () => {
    expect(() => SetCookieInput.parse({ name: "x", value: "y", domain: "example.com" })).not.toThrow();
  });

  it("defaults path to /", () => {
    const result = SetCookieInput.parse({ name: "x", value: "y", domain: "example.com" });
    expect(result.path).toBe("/");
  });

  it("defaults secure to false", () => {
    const result = SetCookieInput.parse({ name: "x", value: "y", domain: "example.com" });
    expect(result.secure).toBe(false);
  });

  it("defaults httpOnly to false", () => {
    const result = SetCookieInput.parse({ name: "x", value: "y", domain: "example.com" });
    expect(result.httpOnly).toBe(false);
  });

  it("accepts custom path", () => {
    const result = SetCookieInput.parse({ name: "x", value: "y", domain: "example.com", path: "/api" });
    expect(result.path).toBe("/api");
  });
});

describe("InterceptNetworkInput", () => {
  it("requires urlPattern and action", () => {
    expect(() => InterceptNetworkInput.parse({})).toThrow();
  });

  it("accepts action log", () => {
    expect(() => InterceptNetworkInput.parse({ urlPattern: "*", action: "log" })).not.toThrow();
  });

  it("accepts action block", () => {
    expect(() => InterceptNetworkInput.parse({ urlPattern: "*", action: "block" })).not.toThrow();
  });

  it("rejects invalid action", () => {
    expect(() => InterceptNetworkInput.parse({ urlPattern: "*", action: "intercept" })).toThrow();
  });

  it("accepts optional tabId", () => {
    expect(() => InterceptNetworkInput.parse({ urlPattern: "*", action: "log", tabId: "abc" })).not.toThrow();
  });

  it("accepts optional method", () => {
    expect(() => InterceptNetworkInput.parse({ urlPattern: "*", action: "log", method: "GET" })).not.toThrow();
  });
});

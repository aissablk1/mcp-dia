import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import { withTab } from "../../cdp/helpers.js";
import { ToolError } from "../../utils/errors.js";
import type { Cookie, RequestLog } from "../../cdp/types.js";

export const GetCookiesInput = z.object({
  url: z.string().url().optional(),
  revealValues: z
    .boolean()
    .default(false)
    .describe("Reveal HttpOnly cookie values. Default false: HttpOnly values are redacted."),
});

export async function getCookiesHandler(
  cdp: CDPConnection,
  args: z.infer<typeof GetCookiesInput>
): Promise<{ cookies: Cookie[] }> {
  const client = await cdp.getActiveTab();
  await client.Network.enable();
  const params = args.url ? { urls: [args.url] } : {};
  const result = await client.Network.getCookies(params);
  const cookies = (result.cookies ?? []).map((c): Cookie => ({
    name: c.name,
    // CDP bypasses HttpOnly; redact those values by default so a compromised /
    // injection-steered agent cannot exfiltrate session tokens.
    value: c.httpOnly && !args.revealValues ? "[redacted: HttpOnly]" : c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    expires: c.expires,
  }));
  return { cookies };
}

export const SetCookieInput = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string(),
  path: z.string().default("/"),
  secure: z.boolean().default(false),
  httpOnly: z.boolean().default(false),
});

export async function setCookieHandler(
  cdp: CDPConnection,
  args: z.infer<typeof SetCookieInput>
): Promise<{ success: boolean }> {
  const client = await cdp.getActiveTab();
  await client.Network.enable();
  const result = await client.Network.setCookie({
    name: args.name,
    value: args.value,
    domain: args.domain,
    path: args.path,
    secure: args.secure,
    httpOnly: args.httpOnly,
  });
  if (!result.success) {
    throw new ToolError("set_cookie", `Failed to set cookie: ${args.name}`);
  }
  return { success: true };
}

export const InterceptNetworkInput = z.object({
  tabId: z.string().optional(),
  urlPattern: z.string(),
  method: z.string().optional(),
  action: z.enum(["log", "block"]),
  duration: z
    .number()
    .positive()
    .default(10000)
    .describe("How long to intercept requests (ms). Interception is fully torn down afterwards."),
});

export async function interceptNetworkHandler(
  cdp: CDPConnection,
  args: z.infer<typeof InterceptNetworkInput>
): Promise<{ requests: RequestLog[] }> {
  return withTab(cdp, args.tabId, async (client) => {
    const logs: RequestLog[] = [];

    if (args.action === "block") {
      const onPaused = async (event: any) => {
        try {
          const matchesMethod = !args.method || event.request.method === args.method;
          if (matchesMethod) {
            logs.push({
              url: event.request.url,
              method: event.request.method,
              type: event.resourceType ?? "Other",
              timestamp: Date.now(),
              blocked: true,
            });
            await client.Fetch.failRequest({
              requestId: event.requestId,
              errorReason: "BlockedByClient",
            });
          } else {
            await client.Fetch.continueRequest({ requestId: event.requestId });
          }
        } catch {
          // Request already handled or Fetch disabled mid-flight — ignore so a
          // stray rejection cannot crash the process (Node --unhandled-rejections=throw).
        }
      };

      await client.Fetch.enable({ patterns: [{ urlPattern: args.urlPattern }] });
      client.Fetch.on("requestPaused", onPaused);
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, args.duration));
      } finally {
        try {
          (client.Fetch as any).removeListener?.("requestPaused", onPaused);
        } catch {}
        try {
          await client.Fetch.disable();
        } catch {}
      }
    } else {
      const onRequest = (event: any) => {
        if (!event.request.url.includes(args.urlPattern)) return;
        const matchesMethod = !args.method || event.request.method === args.method;
        if (!matchesMethod) return;
        logs.push({
          url: event.request.url,
          method: event.request.method,
          type: event.type ?? "Other",
          timestamp: Date.now(),
          blocked: false,
        });
      };

      await client.Network.enable();
      client.Network.on("requestWillBeSent", onRequest);
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, args.duration));
      } finally {
        try {
          (client.Network as any).removeListener?.("requestWillBeSent", onRequest);
        } catch {}
        try {
          await client.Network.disable();
        } catch {}
      }
    }

    return { requests: logs };
  });
}

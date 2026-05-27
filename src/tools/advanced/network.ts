import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import { withTab } from "../../cdp/helpers.js";
import { ToolError } from "../../utils/errors.js";
import type { Cookie, RequestLog } from "../../cdp/types.js";

export const GetCookiesInput = z.object({
  url: z.string().url().optional(),
});

export async function getCookiesHandler(
  cdp: CDPConnection,
  args: z.infer<typeof GetCookiesInput>
): Promise<Cookie[]> {
  const client = await cdp.getActiveTab();
  await client.Network.enable();
  const params = args.url ? { urls: [args.url] } : {};
  const result = await client.Network.getCookies(params);
  return (result.cookies ?? []).map((c): Cookie => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    expires: c.expires,
  }));
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
  duration: z.number().positive().default(10000).describe("How long to intercept requests (ms)"),
});

export async function interceptNetworkHandler(
  cdp: CDPConnection,
  args: z.infer<typeof InterceptNetworkInput>
): Promise<RequestLog[]> {
  return withTab(cdp, args.tabId, async (client) => {
    const logs: RequestLog[] = [];

    await new Promise<void>((resolve) => {
      if (args.action === "block") {
        client.Fetch.enable({ patterns: [{ urlPattern: args.urlPattern }] }).then(() => {
          client.Fetch.on("requestPaused", async (event) => {
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
          });
        });
      } else {
        client.Network.enable().then(() => {
          client.Network.on("requestWillBeSent", (event) => {
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
          });
        });
      }

      setTimeout(resolve, args.duration);
    });

    return logs;
  });
}

import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import { withTab } from "../../cdp/helpers.js";
import { SafeUrl } from "../../utils/validation.js";
import { withTimeout } from "../../utils/timeout.js";
import { ToolError } from "../../utils/errors.js";

export const NavigateInput = z.object({
  url: SafeUrl,
  tabId: z.string().optional(),
  timeout: z.number().positive().default(30000),
});

export async function navigateHandler(
  cdp: CDPConnection,
  args: z.infer<typeof NavigateInput>
): Promise<{ url: string }> {
  return withTab(cdp, args.tabId, async (client) => {
    await client.Page.enable();
    await client.Page.navigate({ url: args.url });
    await withTimeout(
      client.Page.loadEventFired(),
      args.timeout,
      () => new ToolError("navigate", `Navigation timed out after ${args.timeout}ms`)
    );
    return { url: args.url };
  });
}

export const GoBackInput = z.object({
  tabId: z.string().optional(),
});

export async function goBackHandler(
  cdp: CDPConnection,
  args: z.infer<typeof GoBackInput>
): Promise<{ success: boolean }> {
  return withTab(cdp, args.tabId, async (client) => {
    await client.Page.enable();
    const history = await client.Page.getNavigationHistory();
    const { currentIndex, entries } = history;
    if (currentIndex <= 0) return { success: false };
    const entry = entries[currentIndex - 1];
    await client.Page.navigateToHistoryEntry({ entryId: entry.id });
    return { success: true };
  });
}

export const GoForwardInput = z.object({
  tabId: z.string().optional(),
});

export async function goForwardHandler(
  cdp: CDPConnection,
  args: z.infer<typeof GoForwardInput>
): Promise<{ success: boolean }> {
  return withTab(cdp, args.tabId, async (client) => {
    await client.Page.enable();
    const history = await client.Page.getNavigationHistory();
    const { currentIndex, entries } = history;
    if (currentIndex >= entries.length - 1) return { success: false };
    const entry = entries[currentIndex + 1];
    await client.Page.navigateToHistoryEntry({ entryId: entry.id });
    return { success: true };
  });
}

export const ReloadTabInput = z.object({
  tabId: z.string().optional(),
  ignoreCache: z.boolean().default(false),
});

export async function reloadTabHandler(
  cdp: CDPConnection,
  args: z.infer<typeof ReloadTabInput>
): Promise<{ success: boolean }> {
  return withTab(cdp, args.tabId, async (client) => {
    await client.Page.enable();
    await client.Page.reload({ ignoreCache: args.ignoreCache });
    return { success: true };
  });
}

import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import type { Tab } from "../../cdp/types.js";
import { SafeUrl } from "../../utils/validation.js";

export const ListTabsInput = z.object({});

export async function listTabsHandler(
  cdp: CDPConnection,
  _args: z.infer<typeof ListTabsInput>
): Promise<{ tabs: Tab[] }> {
  return { tabs: await cdp.listTargets() };
}

export const OpenTabInput = z.object({
  url: SafeUrl,
});

export async function openTabHandler(
  cdp: CDPConnection,
  args: z.infer<typeof OpenTabInput>
): Promise<{ targetId: string }> {
  const client = await cdp.getActiveTab();
  const result = await client.Target.createTarget({ url: args.url });
  return { targetId: result.targetId };
}

export const CloseTabInput = z.object({
  tabId: z.string(),
});

export async function closeTabHandler(
  cdp: CDPConnection,
  args: z.infer<typeof CloseTabInput>
): Promise<{ success: boolean }> {
  const client = await cdp.getActiveTab();
  await client.Target.closeTarget({ targetId: args.tabId });
  return { success: true };
}

export const SwitchTabInput = z.object({
  tabId: z.string(),
});

export async function switchTabHandler(
  cdp: CDPConnection,
  args: z.infer<typeof SwitchTabInput>
): Promise<{ success: boolean }> {
  const client = await cdp.getActiveTab();
  await client.Target.activateTarget({ targetId: args.tabId });
  return { success: true };
}

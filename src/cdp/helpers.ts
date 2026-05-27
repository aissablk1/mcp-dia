import type CDP from "chrome-remote-interface";
import { CDPConnection } from "./connection.js";

export async function withTab<T>(
  cdp: CDPConnection,
  tabId: string | undefined,
  fn: (client: CDP.Client) => Promise<T>
): Promise<T> {
  let client: CDP.Client;
  let shouldClose = false;
  if (tabId) {
    client = await cdp.attachToTab(tabId);
    shouldClose = true;
  } else {
    client = await cdp.getActiveTab();
  }
  try {
    return await fn(client);
  } finally {
    if (shouldClose) { try { await client.close(); } catch {} }
  }
}

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import type CDP from "chrome-remote-interface";
import { AIBridgeError } from "../../utils/errors.js";

interface ChatSelectors {
  container: string;
  input: string;
  sendButton: string;
  messages: string;
  messageContent: string;
  messageRole: string;
}

interface SkillsSelectors {
  panel: string;
  list: string;
  name: string;
  trigger: string;
}

interface MemorySelectors {
  searchInput: string;
  results: string;
  resultTitle: string;
  resultSnippet: string;
}

export interface SelectorSet {
  chat: ChatSelectors;
  skills: SkillsSelectors;
  memory: MemorySelectors;
}

let cache: Record<string, SelectorSet> | null = null;

export function loadSelectors(diaVersion = "default"): SelectorSet {
  if (!cache) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const raw = readFileSync(join(__dirname, "selectors.json"), "utf-8");
    const parsed = JSON.parse(raw) as { versions: Record<string, SelectorSet> };
    cache = parsed.versions;
  }
  const sel = cache[diaVersion] ?? cache["default"];
  if (!sel) throw new AIBridgeError(`No selectors found for version: ${diaVersion}`);
  return sel;
}

/**
 * Try each comma-separated selector in turn; return the first that matches an
 * element in the page, or null. A malformed selector (page-side SyntaxError) is
 * skipped rather than aborting the whole lookup.
 */
export async function findElement(
  client: CDP.Client,
  selectorList: string
): Promise<string | null> {
  const selectors = selectorList.split(",").map((s) => s.trim()).filter(Boolean);
  for (const selector of selectors) {
    const result = await client.Runtime.evaluate({
      expression: `document.querySelector(${JSON.stringify(selector)}) !== null`,
      returnByValue: true,
    });
    if (result.exceptionDetails) continue;
    if (result.result?.value === true) return selector;
  }
  return null;
}

/**
 * Poll the page for a new chat message appended after `initialCount`, returning
 * its trimmed text, or undefined on timeout. Shared by chat and skills polling.
 */
export async function waitForNewMessage(
  client: CDP.Client,
  messagesSelector: string,
  contentSelector: string,
  initialCount: number,
  timeoutMs: number
): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    const result = await client.Runtime.evaluate({
      expression: `(function(){
        var msgs = document.querySelectorAll(${JSON.stringify(messagesSelector)});
        if (msgs.length <= ${initialCount}) return null;
        var last = msgs[msgs.length - 1];
        var contentEl = last.querySelector(${JSON.stringify(contentSelector)});
        return contentEl ? contentEl.textContent : last.textContent;
      })()`,
      returnByValue: true,
    });
    const text = result.result?.value;
    if (text && typeof text === "string" && text.trim().length > 0) {
      return text.trim();
    }
  }
  return undefined;
}

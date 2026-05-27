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
    if (result.result?.value === true) return selector;
  }
  return null;
}

export async function detectElement(
  client: CDP.Client,
  selector: string,
  label: string
): Promise<void> {
  const found = await findElement(client, selector);
  if (!found) throw new AIBridgeError(`${label} not found in the page`);
}

export async function healthCheck(client: CDP.Client): Promise<boolean> {
  const sel = loadSelectors();
  const found = await findElement(client, sel.chat.container);
  return found !== null;
}

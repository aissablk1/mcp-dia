import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import type { MemoryResult, TabContext } from "../../cdp/types.js";
import { withTab } from "../../cdp/helpers.js";
import { loadSelectors } from "./detect.js";

export const DiaSearchMemoryInput = z.object({
  query: z.string().min(1),
});

export async function diaSearchMemoryHandler(
  cdp: CDPConnection,
  args: z.infer<typeof DiaSearchMemoryInput>
): Promise<MemoryResult[]> {
  const client = await cdp.getActiveTab();
  const sel = loadSelectors();

  await client.Runtime.enable();

  // Type query into search input
  await client.Runtime.evaluate({
    expression: `(function(){
      var el = document.querySelector(${JSON.stringify(sel.memory.searchInput)});
      if (!el) return;
      el.focus();
      var nativeInput = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (nativeInput && nativeInput.set) {
        nativeInput.set.call(el, ${JSON.stringify(args.query)});
      } else {
        el.value = ${JSON.stringify(args.query)};
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    })()`,
    awaitPromise: false,
  });

  // Wait for results
  await new Promise((r) => setTimeout(r, 2000));

  const result = await client.Runtime.evaluate({
    expression: `(function(){
      var items = Array.from(document.querySelectorAll(${JSON.stringify(sel.memory.results)}));
      return items.map(function(el) {
        var titleEl = el.querySelector(${JSON.stringify(sel.memory.resultTitle)});
        var snippetEl = el.querySelector(${JSON.stringify(sel.memory.resultSnippet)});
        var linkEl = el.querySelector('a[href]');
        return {
          title: titleEl ? titleEl.textContent.trim() : el.textContent.trim(),
          snippet: snippetEl ? snippetEl.textContent.trim() : '',
          url: linkEl ? linkEl.href : undefined,
        };
      }).filter(function(r) { return r.title.length > 0; });
    })()`,
    returnByValue: true,
    awaitPromise: false,
  });

  const results = result.result?.value;
  if (!Array.isArray(results)) return [];
  return results as MemoryResult[];
}

export const DiaGetTabContextInput = z.object({
  tabId: z.string().optional(),
});

export async function diaGetTabContextHandler(
  cdp: CDPConnection,
  args: z.infer<typeof DiaGetTabContextInput>
): Promise<TabContext> {
  return withTab(cdp, args.tabId, async (client) => {
    await client.Runtime.enable();

    const result = await client.Runtime.evaluate({
      expression: `(function(){
        function getMeta(name) {
          var el = document.querySelector('meta[name="' + name + '"]') ||
                   document.querySelector('meta[property="' + name + '"]');
          return el ? el.getAttribute('content') : undefined;
        }
        function getLink(rel) {
          var el = document.querySelector('link[rel="' + rel + '"]');
          return el ? el.getAttribute('href') : undefined;
        }
        var h1El = document.querySelector('h1');
        return {
          url: location.href,
          title: document.title,
          metadata: {
            description: getMeta('description'),
            ogTitle: getMeta('og:title'),
            ogDescription: getMeta('og:description'),
            ogImage: getMeta('og:image'),
            canonical: getLink('canonical'),
            h1: h1El ? h1El.textContent.trim() : undefined,
            lang: document.documentElement.lang || undefined,
            charset: document.characterSet || undefined,
          }
        };
      })()`,
      returnByValue: true,
      awaitPromise: false,
    });

    const val = result.result?.value as { url: string; title: string; metadata: Record<string, unknown> } | undefined;
    if (!val) throw new Error("AI Bridge: Failed to extract tab context");

    // Clean up undefined metadata values
    const metadata: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.metadata)) {
      if (v !== undefined && v !== null) metadata[k] = v;
    }

    return {
      tabId: args.tabId ?? "active",
      url: val.url,
      title: val.title,
      metadata,
    };
  });
}

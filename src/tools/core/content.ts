import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import { withTab } from "../../cdp/helpers.js";

export const GetPageContentInput = z.object({
  tabId: z.string().optional(),
  format: z.enum(["text", "html", "markdown"]).default("text"),
  maxLength: z.number().positive().default(100000),
});

const markdownConverter = `
(function toMarkdown(el) {
  function convert(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(convert).join('');
    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1]);
      return '#'.repeat(level) + ' ' + children.trim() + '\\n\\n';
    }
    if (tag === 'p') return children.trim() + '\\n\\n';
    if (tag === 'li') return '- ' + children.trim() + '\\n';
    if (tag === 'pre' || tag === 'code') return '\`\`\`\\n' + children + '\\n\`\`\`\\n\\n';
    if (tag === 'blockquote') return '> ' + children.trim().replace(/\\n/g, '\\n> ') + '\\n\\n';
    if (tag === 'br') return '\\n';
    if (tag === 'a') return children;
    if (['script','style','noscript','head'].includes(tag)) return '';
    return children;
  }
  return convert(el);
})(document.body)
`.trim();

export async function getPageContentHandler(
  cdp: CDPConnection,
  args: z.infer<typeof GetPageContentInput>
): Promise<{ content: string; truncated: boolean }> {
  return withTab(cdp, args.tabId, async (client) => {
    let expression: string;

    if (args.format === "text") {
      expression = "document.body.innerText";
    } else if (args.format === "html") {
      expression = "document.documentElement.outerHTML";
    } else {
      expression = markdownConverter;
    }

    const result = await client.Runtime.evaluate({
      expression,
      returnByValue: true,
      awaitPromise: true,
    });

    let content: string = result.result?.value ?? "";
    const truncated = content.length > args.maxLength;
    if (truncated) {
      content = content.slice(0, args.maxLength) + "\n\n[truncated]";
    }

    return { content, truncated };
  });
}

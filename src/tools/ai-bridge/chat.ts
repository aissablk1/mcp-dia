import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import type { ChatMessage } from "../../cdp/types.js";
import { AIBridgeError } from "../../utils/errors.js";
import { loadSelectors, findElement, waitForNewMessage } from "./detect.js";

export const DiaSendChatInput = z.object({
  message: z.string().min(1),
  waitForResponse: z.boolean().default(false),
  timeout: z.number().positive().default(30000),
});

export async function diaSendChatHandler(
  cdp: CDPConnection,
  args: z.infer<typeof DiaSendChatInput>
): Promise<{ response?: string }> {
  const client = await cdp.getActiveTab();
  const sel = loadSelectors();

  await client.Runtime.enable();

  // Try to find the input; if not found, try opening chat via Cmd+E
  let inputSelector = await findElement(client, sel.chat.input);
  if (!inputSelector) {
    await client.Input.dispatchKeyEvent({
      type: "keyDown",
      modifiers: 4, // Meta/Cmd
      key: "e",
      code: "KeyE",
    });
    await client.Input.dispatchKeyEvent({
      type: "keyUp",
      modifiers: 4,
      key: "e",
      code: "KeyE",
    });
    await new Promise((r) => setTimeout(r, 500));
    inputSelector = await findElement(client, sel.chat.input);
  }

  if (!inputSelector) {
    throw new AIBridgeError("Chat input not found — is Dia's chat panel open?");
  }

  // Focus and type the message
  await client.Runtime.evaluate({
    expression: `(function(){
      var el = document.querySelector(${JSON.stringify(inputSelector)});
      if (!el) throw new Error('input not found');
      el.focus();
      var nativeInput = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
      if (nativeInput && nativeInput.set) {
        nativeInput.set.call(el, ${JSON.stringify(args.message)});
      } else {
        el.value = ${JSON.stringify(args.message)};
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    })()`,
    awaitPromise: false,
  });

  // Click send button or press Enter
  const sendSelector = await findElement(client, sel.chat.sendButton);
  if (sendSelector) {
    await client.Runtime.evaluate({
      expression: `document.querySelector(${JSON.stringify(sendSelector)})?.click()`,
      awaitPromise: false,
    });
  } else {
    await client.Runtime.evaluate({
      expression: `(function(){
        var el = document.querySelector(${JSON.stringify(inputSelector)});
        if (el) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      })()`,
      awaitPromise: false,
    });
  }

  if (!args.waitForResponse) return {};

  const countResult = await client.Runtime.evaluate({
    expression: `document.querySelectorAll(${JSON.stringify(sel.chat.messages)}).length`,
    returnByValue: true,
  });
  const lastCount = countResult.result?.value ?? 0;

  const response = await waitForNewMessage(
    client,
    sel.chat.messages,
    sel.chat.messageContent,
    lastCount,
    args.timeout
  );
  return response ? { response } : {};
}

export const DiaGetChatHistoryInput = z.object({
  limit: z.number().positive().default(20),
});

export async function diaGetChatHistoryHandler(
  cdp: CDPConnection,
  args: z.infer<typeof DiaGetChatHistoryInput>
): Promise<{ messages: ChatMessage[] }> {
  const client = await cdp.getActiveTab();
  const sel = loadSelectors();

  await client.Runtime.enable();

  const result = await client.Runtime.evaluate({
    expression: `(function(){
      var msgs = Array.from(document.querySelectorAll(${JSON.stringify(sel.chat.messages)}));
      var limit = ${args.limit};
      var slice = msgs.slice(-limit);
      return slice.map(function(m) {
        var roleEl = m.querySelector(${JSON.stringify(sel.chat.messageRole)});
        var contentEl = m.querySelector(${JSON.stringify(sel.chat.messageContent)});
        var role = roleEl ? roleEl.textContent.trim().toLowerCase() : 'assistant';
        var content = contentEl ? contentEl.textContent.trim() : m.textContent.trim();
        return { role: role === 'user' ? 'user' : 'assistant', content: content };
      });
    })()`,
    returnByValue: true,
    awaitPromise: false,
  });

  if (result.exceptionDetails) {
    throw new AIBridgeError(
      result.exceptionDetails.exception?.description ?? "Failed to read chat history"
    );
  }

  const messages = result.result?.value;
  if (!Array.isArray(messages)) return { messages: [] };
  return { messages: messages as ChatMessage[] };
}

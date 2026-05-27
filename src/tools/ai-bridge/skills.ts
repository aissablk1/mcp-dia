import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import type { Skill } from "../../cdp/types.js";
import { loadSelectors } from "./detect.js";

export const DiaListSkillsInput = z.object({});

export async function diaListSkillsHandler(
  cdp: CDPConnection
): Promise<Skill[]> {
  const client = await cdp.getActiveTab();
  const sel = loadSelectors();

  await client.Runtime.enable();

  const result = await client.Runtime.evaluate({
    expression: `(function(){
      var items = Array.from(document.querySelectorAll(${JSON.stringify(sel.skills.list)}));
      return items.map(function(el) {
        var nameEl = el.querySelector(${JSON.stringify(sel.skills.name)});
        var name = nameEl ? nameEl.textContent.trim() : el.textContent.trim();
        return { name: name };
      }).filter(function(s) { return s.name.length > 0; });
    })()`,
    returnByValue: true,
    awaitPromise: false,
  });

  const skills = result.result?.value;
  if (!Array.isArray(skills)) return [];
  return skills as Skill[];
}

export const DiaTriggerSkillInput = z.object({
  skillName: z.string().min(1),
  context: z.string().optional(),
  timeout: z.number().positive().default(15000).describe("Max time to wait for skill response (ms)"),
});

export async function diaTriggerSkillHandler(
  cdp: CDPConnection,
  args: z.infer<typeof DiaTriggerSkillInput>
): Promise<{ response?: string }> {
  const client = await cdp.getActiveTab();
  const sel = loadSelectors();

  await client.Runtime.enable();

  // Find and click the skill by name
  const clickResult = await client.Runtime.evaluate({
    expression: `(function(){
      var items = Array.from(document.querySelectorAll(${JSON.stringify(sel.skills.list)}));
      var target = items.find(function(el) {
        var nameEl = el.querySelector(${JSON.stringify(sel.skills.name)});
        var name = nameEl ? nameEl.textContent.trim() : el.textContent.trim();
        return name.toLowerCase() === ${JSON.stringify(args.skillName.toLowerCase())};
      });
      if (!target) return false;
      var triggerEl = target.querySelector(${JSON.stringify(sel.skills.trigger)}) || target;
      triggerEl.click();
      return true;
    })()`,
    returnByValue: true,
    awaitPromise: false,
  });

  if (!clickResult.result?.value) {
    throw new Error(`AI Bridge: Skill not found: ${args.skillName}`);
  }

  // Get initial message count before skill response
  const countResult = await client.Runtime.evaluate({
    expression: `document.querySelectorAll(${JSON.stringify(sel.chat.messages)}).length`,
    returnByValue: true,
  });
  const initialCount = countResult.result?.value ?? 0;

  // Poll for new message (skill response)
  const deadline = Date.now() + args.timeout;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    const result = await client.Runtime.evaluate({
      expression: `(function(){
        var msgs = document.querySelectorAll(${JSON.stringify(sel.chat.messages)});
        if (msgs.length <= ${initialCount}) return null;
        var last = msgs[msgs.length - 1];
        var contentEl = last.querySelector(${JSON.stringify(sel.chat.messageContent)});
        return contentEl ? contentEl.textContent.trim() : last.textContent.trim();
      })()`,
      returnByValue: true,
      awaitPromise: false,
    });
    const text = result.result?.value;
    if (text && typeof text === "string" && text.trim().length > 0) {
      return { response: text.trim() };
    }
  }

  return { response: undefined };
}

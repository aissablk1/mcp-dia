import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import type { Skill } from "../../cdp/types.js";
import { AIBridgeError } from "../../utils/errors.js";
import { loadSelectors, waitForNewMessage } from "./detect.js";

export const DiaListSkillsInput = z.object({});

export async function diaListSkillsHandler(
  cdp: CDPConnection
): Promise<{ skills: Skill[] }> {
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

  if (result.exceptionDetails) {
    throw new AIBridgeError(
      result.exceptionDetails.exception?.description ?? "Failed to list skills"
    );
  }

  const skills = result.result?.value;
  if (!Array.isArray(skills)) return { skills: [] };
  return { skills: skills as Skill[] };
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

  if (clickResult.exceptionDetails) {
    throw new AIBridgeError(
      clickResult.exceptionDetails.exception?.description ?? "Failed to trigger skill"
    );
  }
  if (!clickResult.result?.value) {
    throw new AIBridgeError(`Skill not found: ${args.skillName}`);
  }

  const countResult = await client.Runtime.evaluate({
    expression: `document.querySelectorAll(${JSON.stringify(sel.chat.messages)}).length`,
    returnByValue: true,
  });
  const initialCount = countResult.result?.value ?? 0;

  const response = await waitForNewMessage(
    client,
    sel.chat.messages,
    sel.chat.messageContent,
    initialCount,
    args.timeout
  );
  return { response };
}

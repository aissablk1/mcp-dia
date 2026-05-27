import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import { withTab } from "../../cdp/helpers.js";
import { ToolError } from "../../utils/errors.js";

export const ClickElementInput = z.object({
  tabId: z.string().optional(),
  selector: z.string(),
  selectorType: z.enum(["css", "xpath"]).default("css"),
});

export async function clickElementHandler(
  cdp: CDPConnection,
  args: z.infer<typeof ClickElementInput>
): Promise<{ success: boolean }> {
  return withTab(cdp, args.tabId, async (client) => {
    let expression: string;
    if (args.selectorType === "css") {
      expression = `(function(){var el=document.querySelector(${JSON.stringify(args.selector)});if(!el)throw new Error("Element not found: "+${JSON.stringify(args.selector)});el.click();return true;})()`;
    } else {
      expression = `(function(){var result=document.evaluate(${JSON.stringify(args.selector)},document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null);var el=result.singleNodeValue;if(!el)throw new Error("Element not found: "+${JSON.stringify(args.selector)});el.click();return true;})()`;
    }
    const result = await client.Runtime.evaluate({
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new ToolError("click_element", result.exceptionDetails.exception?.description ?? "Click failed");
    }
    return { success: true };
  });
}

export const FillInputInput = z.object({
  tabId: z.string().optional(),
  selector: z.string(),
  value: z.string(),
  selectorType: z.enum(["css", "xpath"]).default("css"),
  clearBefore: z.boolean().default(false),
});

export async function fillInputHandler(
  cdp: CDPConnection,
  args: z.infer<typeof FillInputInput>
): Promise<{ success: boolean }> {
  return withTab(cdp, args.tabId, async (client) => {
    const selectorExpr =
      args.selectorType === "css"
        ? `document.querySelector(${JSON.stringify(args.selector)})`
        : `document.evaluate(${JSON.stringify(args.selector)},document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue`;

    const clearCode = args.clearBefore
      ? `if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){el.value='';}else if(el.isContentEditable){el.innerHTML='';}`
      : "";

    const expression = `(function(){
      var el=${selectorExpr};
      if(!el) throw new Error("Element not found: "+${JSON.stringify(args.selector)});
      ${clearCode}
      if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){
        el.value=${JSON.stringify(args.value)};
      } else if(el.isContentEditable){
        el.innerHTML=${JSON.stringify(args.value)};
      } else {
        el.value=${JSON.stringify(args.value)};
      }
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    })()`;

    const result = await client.Runtime.evaluate({
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new ToolError("fill_input", result.exceptionDetails.exception?.description ?? "Fill failed");
    }
    return { success: true };
  });
}

export const WaitForSelectorInput = z.object({
  tabId: z.string().optional(),
  selector: z.string(),
  selectorType: z.enum(["css", "xpath"]).default("css"),
  timeout: z.number().positive().default(5000),
});

export async function waitForSelectorHandler(
  cdp: CDPConnection,
  args: z.infer<typeof WaitForSelectorInput>
): Promise<{ found: boolean }> {
  return withTab(cdp, args.tabId, async (client) => {
    const findExpr = args.selectorType === "xpath"
      ? `document.evaluate(${JSON.stringify(args.selector)},document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue!==null`
      : `document.querySelector(${JSON.stringify(args.selector)})!==null`;

    const expression = `new Promise(function(resolve){
      if(${findExpr}){resolve(true);return;}
      var observer=new MutationObserver(function(){
        if(${findExpr}){observer.disconnect();resolve(true);}
      });
      observer.observe(document.body,{childList:true,subtree:true});
      setTimeout(function(){observer.disconnect();resolve(false);},${args.timeout});
    })`;

    const result = await client.Runtime.evaluate({
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return { found: result.result?.value === true };
  });
}

import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import { withTab } from "../../cdp/helpers.js";
import { ToolError } from "../../utils/errors.js";

export const ScreenshotInput = z.object({
  tabId: z.string().optional(),
  selector: z.string().optional(),
  fullPage: z.boolean().default(false),
  format: z.enum(["png", "jpeg", "webp"]).default("png"),
});

export async function screenshotHandler(
  cdp: CDPConnection,
  args: z.infer<typeof ScreenshotInput>
): Promise<{ data: string; format: string }> {
  return withTab(cdp, args.tabId, async (client) => {
    let clip: { x: number; y: number; width: number; height: number; scale: number } | undefined;

    if (args.selector) {
      const result = await client.Runtime.evaluate({
        expression: `(function(){var el=document.querySelector(${JSON.stringify(args.selector)});if(!el)throw new Error("Selector not found");var r=el.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height};})()`,
        returnByValue: true,
        awaitPromise: true,
      });
      if (result.exceptionDetails) {
        throw new ToolError(
          "screenshot",
          result.exceptionDetails.exception?.description ?? `Selector not found: ${args.selector}`
        );
      }
      const rect = result.result?.value;
      if (rect) clip = { ...rect, scale: 1 };
    } else if (args.fullPage) {
      const result = await client.Runtime.evaluate({
        expression: `({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight})`,
        returnByValue: true,
        awaitPromise: true,
      });
      const dim = result.result?.value;
      if (dim) clip = { x: 0, y: 0, width: dim.width, height: dim.height, scale: 1 };
    }

    const screenshot = await client.Page.captureScreenshot({
      format: args.format,
      ...(clip ? { clip } : {}),
    });
    return { data: screenshot.data, format: args.format };
  });
}

export const GeneratePdfInput = z.object({
  tabId: z.string().optional(),
  format: z.enum(["A4", "Letter"]).default("A4"),
  landscape: z.boolean().default(false),
});

export async function generatePdfHandler(
  cdp: CDPConnection,
  args: z.infer<typeof GeneratePdfInput>
): Promise<{ data: string }> {
  return withTab(cdp, args.tabId, async (client) => {
    const dimensions: Record<string, { paperWidth: number; paperHeight: number }> = {
      A4: { paperWidth: 8.27, paperHeight: 11.69 },
      Letter: { paperWidth: 8.5, paperHeight: 11 },
    };
    const { paperWidth, paperHeight } = dimensions[args.format];

    const result = await client.Page.printToPDF({
      landscape: args.landscape,
      paperWidth,
      paperHeight,
    });
    return { data: result.data };
  });
}

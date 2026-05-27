import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import { withTab } from "../../cdp/helpers.js";
import { ToolError } from "../../utils/errors.js";
import type { JsonValue } from "../../cdp/types.js";

export const EvaluateJsInput = z.object({
  tabId: z.string().optional(),
  expression: z.string(),
});

export async function evaluateJsHandler(
  cdp: CDPConnection,
  args: z.infer<typeof EvaluateJsInput>
): Promise<JsonValue> {
  return withTab(cdp, args.tabId, async (client) => {
    const result = await client.Runtime.evaluate({
      expression: args.expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new ToolError(
        "evaluate_js",
        result.exceptionDetails.exception?.description ?? "Evaluation failed"
      );
    }
    return (result.result?.value ?? null) as JsonValue;
  });
}

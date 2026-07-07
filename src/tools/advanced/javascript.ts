import { z } from "zod";
import type { CDPConnection } from "../../cdp/connection.js";
import { withTab } from "../../cdp/helpers.js";
import { ToolError } from "../../utils/errors.js";
import { withTimeout } from "../../utils/timeout.js";
import type { JsonValue } from "../../cdp/types.js";

export const EvaluateJsInput = z.object({
  tabId: z.string().optional(),
  expression: z.string(),
  timeout: z.number().positive().default(30000),
});

export async function evaluateJsHandler(
  cdp: CDPConnection,
  args: z.infer<typeof EvaluateJsInput>
): Promise<JsonValue> {
  return withTab(cdp, args.tabId, async (client) => {
    const result = await withTimeout(
      client.Runtime.evaluate({
        expression: args.expression,
        returnByValue: true,
        awaitPromise: true,
      }),
      args.timeout,
      () => new ToolError("evaluate_js", `Evaluation timed out after ${args.timeout}ms`)
    );
    if (result.exceptionDetails) {
      throw new ToolError(
        "evaluate_js",
        result.exceptionDetails.exception?.description ?? "Evaluation failed"
      );
    }
    return (result.result?.value ?? null) as JsonValue;
  });
}

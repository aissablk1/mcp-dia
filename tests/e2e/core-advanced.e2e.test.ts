import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { CDPConnection } from "../../src/cdp/connection.js";
import { loadConfig } from "../../src/utils/config.js";
import { listTabsHandler } from "../../src/tools/core/tabs.js";
import { navigateHandler } from "../../src/tools/core/navigation.js";
import { getPageContentHandler } from "../../src/tools/core/content.js";
import { evaluateJsHandler } from "../../src/tools/advanced/javascript.js";
import { screenshotHandler } from "../../src/tools/advanced/screenshot.js";
import {
  waitForSelectorHandler,
  clickElementHandler,
} from "../../src/tools/advanced/interaction.js";

/**
 * Opt-in real-browser integration lane. SKIPPED by default (so `npm test` and CI
 * stay green with no browser). To run it:
 *
 *   1. Launch any Chromium-based browser with a debug port, e.g.:
 *      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *        --headless=new --remote-debugging-port=9223 \
 *        --user-data-dir=/tmp/mcp-dia-e2e about:blank &
 *   2. DIA_E2E=1 DIA_CDP_PORT=9223 npx vitest run tests/e2e/
 *
 * It exercises the Core + Advanced tools (standard CDP) against a REAL browser.
 * The AI Bridge is intentionally out of scope here — it depends on Dia's own UI.
 *
 * STATUS: this lane is SKIPPED in CI and has NOT yet been executed against a real
 * browser in an automated environment (the CI sandbox cannot launch a CDP browser).
 * Run the command above locally once to validate it before relying on it.
 */
const RUN = process.env.DIA_E2E === "1";

(RUN ? describe : describe.skip)(
  "E2E — Core & Advanced tools against a real CDP browser",
  () => {
    let cdp: CDPConnection;

    beforeAll(async () => {
      await CDPConnection.resetInstance();
      const config = loadConfig();
      cdp = CDPConnection.getInstance({
        host: config.cdpHost,
        port: config.cdpPort,
        reconnectMax: config.reconnectMax,
      });
      await cdp.connect();
    });

    afterAll(async () => {
      await CDPConnection.resetInstance();
    });

    it("list_tabs returns at least one real page tab", async () => {
      const { tabs } = await listTabsHandler(cdp, {});
      expect(Array.isArray(tabs)).toBe(true);
      expect(tabs.length).toBeGreaterThanOrEqual(1);
      expect(tabs[0]).toHaveProperty("id");
      expect(tabs[0]).toHaveProperty("url");
    });

    it("navigate → evaluate_js → get_page_content round-trips real DOM", async () => {
      await navigateHandler(cdp, { url: "about:blank", timeout: 15000 });
      await evaluateJsHandler(cdp, {
        expression:
          "document.body.innerHTML = '<h1 id=\"hero\">Hello E2E</h1>'; document.title = 'e2e'; true;",
      });
      const { content } = await getPageContentHandler(cdp, {
        format: "text",
        maxLength: 100000,
      });
      expect(content).toContain("Hello E2E");
    });

    it("wait_for_selector + click_element operate on the real page", async () => {
      const waited = await waitForSelectorHandler(cdp, {
        selector: "#hero",
        selectorType: "css",
        timeout: 5000,
      });
      expect(waited.found).toBe(true);

      const clicked = await clickElementHandler(cdp, {
        selector: "#hero",
        selectorType: "css",
      });
      expect(clicked.success).toBe(true);
    });

    it("screenshot returns real base64 image data", async () => {
      const shot = await screenshotHandler(cdp, { fullPage: false, format: "png" });
      expect(typeof shot.data).toBe("string");
      expect(shot.data.length).toBeGreaterThan(100);
      expect(shot.format).toBe("png");
    });

    it("evaluate_js rejects a throwing expression with a ToolError", async () => {
      await expect(
        evaluateJsHandler(cdp, { expression: "throw new Error('boom')" })
      ).rejects.toThrow();
    });
  }
);

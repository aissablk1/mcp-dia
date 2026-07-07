import { z } from "zod";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * URL accepted for navigation / tab opening.
 *
 * Only `http:`, `https:` and the literal `about:blank` are permitted. Schemes
 * such as `file:`, `javascript:`, `data:`, `chrome:`, `view-source:` and
 * `chrome-extension:` are rejected to prevent local-file disclosure and access
 * to internal browser pages — including when the agent is steered by indirect
 * prompt injection from page content it has read.
 */
export const SafeUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      if (value === "about:blank") return true;
      try {
        return ALLOWED_PROTOCOLS.has(new URL(value).protocol);
      } catch {
        return false;
      }
    },
    { message: "Only http(s) URLs and about:blank are allowed" }
  );

import { z } from "zod";

const TabSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
});

const CookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string(),
  path: z.string(),
  secure: z.boolean(),
  httpOnly: z.boolean(),
  expires: z.number(),
});

const RequestLogSchema = z.object({
  url: z.string(),
  method: z.string(),
  status: z.number().optional(),
  type: z.string(),
  timestamp: z.number(),
  blocked: z.boolean(),
});

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string().optional(),
});

const SkillSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

const MemoryResultSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  snippet: z.string(),
  relevance: z.number().optional(),
});

const SuccessSchema = z.object({ success: z.boolean() });
const FoundSchema = z.object({ found: z.boolean() });

export const outputSchemas: Record<string, z.ZodTypeAny> = {
  list_tabs: z.object({ tabs: z.array(TabSchema) }),
  open_tab: z.object({ targetId: z.string() }),
  close_tab: SuccessSchema,
  switch_tab: SuccessSchema,
  navigate: z.object({ url: z.string() }),
  go_back: SuccessSchema,
  go_forward: SuccessSchema,
  reload_tab: SuccessSchema,
  get_page_content: z.object({ content: z.string(), truncated: z.boolean() }),

  screenshot: z.object({ data: z.string(), format: z.string() }),
  generate_pdf: z.object({ data: z.string() }),
  click_element: SuccessSchema,
  fill_input: SuccessSchema,
  wait_for_selector: FoundSchema,
  get_cookies: z.object({ cookies: z.array(CookieSchema) }),
  set_cookie: SuccessSchema,
  intercept_network: z.object({ requests: z.array(RequestLogSchema) }),

  dia_send_chat: z.object({ response: z.string().optional() }),
  dia_get_chat_history: z.object({ messages: z.array(ChatMessageSchema) }),
  dia_list_skills: z.object({ skills: z.array(SkillSchema) }),
  dia_trigger_skill: z.object({ response: z.string().optional() }),
  dia_search_memory: z.object({ results: z.array(MemoryResultSchema) }),
  dia_get_tab_context: z.object({
    tabId: z.string().optional(),
    url: z.string(),
    title: z.string(),
    summary: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
};

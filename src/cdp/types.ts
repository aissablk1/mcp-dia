export interface Tab {
  id: string;
  url: string;
  title: string;
  active: boolean;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expires: number;
}

export interface RequestLog {
  url: string;
  method: string;
  status?: number;
  type: string;
  timestamp: number;
  blocked: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface Skill {
  name: string;
  description?: string;
}

export interface MemoryResult {
  title: string;
  url?: string;
  snippet: string;
  relevance?: number;
}

export interface TabContext {
  tabId: string;
  url: string;
  title: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export type JsonValue =
  | string | number | boolean | null
  | JsonValue[]
  | { [key: string]: JsonValue };

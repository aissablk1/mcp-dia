# mcp-dia Implementation Plan

> ✅ **Plan d'implémentation historique (2026-05-26) — TERMINÉ.** Toutes les tâches et *Steps* `- [ ]`
> ci-dessous ont été **réalisés** dans l'implémentation livrée (v0.3.0, dépôt public). Ces cases **ne
> sont pas** des tâches en attente — c'est un enregistrement historique. Référence faisant autorité :
> `CHANGELOG.md`, `README.md`, `docs/HANDOFF.md` + le code. Restent hors-code : **publication npm** en
> attente d'un token, et un **GIF de démo** à enregistrer (voir `docs/HANDOFF.md`).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-quality MCP server for Dia Browser with 24 tools across 3 layers (Core, Advanced, AI Bridge), published on npm as `mcp-dia`.

**Architecture:** TypeScript MCP server using stdio transport. A CDP Connection Manager singleton handles all Chrome DevTools Protocol communication with Dia Browser (port 9222). Tools are organized in 3 layers: Core (tabs/nav/content), Advanced (DOM interaction/screenshots/network), AI Bridge (experimental Dia IA features via DOM inspection). Follows the same pattern as existing `mcp-graphviz` in this workspace.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, chrome-remote-interface, zod, zod-to-json-schema, vitest, tsx

**Spec:** `docs/superpowers/specs/2026-05-26-mcp-dia-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Entry point, MCP server wiring, tool registration, stdio transport |
| `src/cdp/connection.ts` | CDP Connection Manager singleton (connect, reconnect, health check, shutdown) |
| `src/cdp/types.ts` | Shared types: `Tab`, `Cookie`, `RequestLog`, `JsonValue`, CDP config |
| `src/cdp/helpers.ts` | `withTab(tabId, fn)` helper, selector resolution (CSS/XPath) |
| `src/tools/core/tabs.ts` | `list_tabs`, `open_tab`, `close_tab`, `switch_tab` |
| `src/tools/core/navigation.ts` | `navigate`, `go_back`, `go_forward`, `reload_tab` |
| `src/tools/core/content.ts` | `get_page_content` (text/html/markdown, truncation) |
| `src/tools/advanced/screenshot.ts` | `screenshot`, `generate_pdf` |
| `src/tools/advanced/interaction.ts` | `click_element`, `fill_input`, `wait_for_selector` |
| `src/tools/advanced/javascript.ts` | `evaluate_js` |
| `src/tools/advanced/network.ts` | `get_cookies`, `set_cookie`, `intercept_network` |
| `src/tools/ai-bridge/selectors.json` | Dia UI selectors versioned by Dia version |
| `src/tools/ai-bridge/detect.ts` | Selector loading, health check, graceful degradation |
| `src/tools/ai-bridge/chat.ts` | `dia_send_chat`, `dia_get_chat_history` |
| `src/tools/ai-bridge/skills.ts` | `dia_list_skills`, `dia_trigger_skill` |
| `src/tools/ai-bridge/memory.ts` | `dia_search_memory`, `dia_get_tab_context` |
| `src/utils/config.ts` | Env var loading (5 vars) |
| `src/utils/errors.ts` | `CDPError`, `AIBridgeError`, `ToolError` |
| `src/utils/logger.ts` | Structured stderr logger with level filtering |
| `tests/` | Schema + integration tests per layer |

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`
- Create: `src/utils/config.ts`, `src/utils/errors.ts`, `src/utils/logger.ts`
- Create: `src/cdp/types.ts`

- [ ] **Step 1: Init npm project and write `package.json`**

```json
{
  "name": "mcp-dia",
  "version": "0.1.0",
  "description": "MCP server for Dia Browser — control tabs, automate pages, and interact with Dia's built-in AI via Chrome DevTools Protocol",
  "author": "Aïssa BELKOUSSA",
  "license": "MIT",
  "type": "module",
  "bin": { "mcp-dia": "dist/index.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "inspect": "npx -y @modelcontextprotocol/inspector node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "chrome-remote-interface": "^0.33.2",
    "zod": "^3.24.0",
    "zod-to-json-schema": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^3.0.0"
  },
  "engines": { "node": ">=20" },
  "keywords": ["mcp", "dia", "browser", "cdp", "automation", "ai"]
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Write `src/utils/config.ts`**

```typescript
export interface Config {
  cdpHost: string;
  cdpPort: number;
  aiBridge: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  reconnectMax: number;
}

export function loadConfig(): Config {
  return {
    cdpHost: process.env.DIA_CDP_HOST ?? "localhost",
    cdpPort: parseInt(process.env.DIA_CDP_PORT ?? "9222", 10),
    aiBridge: process.env.DIA_AI_BRIDGE !== "false",
    logLevel: (process.env.DIA_LOG_LEVEL as Config["logLevel"]) ?? "info",
    reconnectMax: parseInt(process.env.DIA_RECONNECT_MAX ?? "30000", 10),
  };
}
```

- [ ] **Step 4: Write `src/utils/logger.ts`**

```typescript
import type { Config } from "./config.js";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

export class Logger {
  private level: number;
  constructor(logLevel: Config["logLevel"]) {
    this.level = LEVELS[logLevel];
  }
  debug(msg: string, data?: unknown) { if (this.level <= 0) this.write("DEBUG", msg, data); }
  info(msg: string, data?: unknown)  { if (this.level <= 1) this.write("INFO", msg, data); }
  warn(msg: string, data?: unknown)  { if (this.level <= 2) this.write("WARN", msg, data); }
  error(msg: string, data?: unknown) { if (this.level <= 3) this.write("ERROR", msg, data); }
  private write(level: string, msg: string, data?: unknown) {
    const line = `[mcp-dia][${level}] ${msg}`;
    console.error(data ? `${line} ${JSON.stringify(data)}` : line);
  }
}
```

- [ ] **Step 5: Write `src/utils/errors.ts`**

```typescript
export class CDPError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "CDPError";
  }
}

export class AIBridgeError extends Error {
  constructor(message: string) {
    super(`AI Bridge: ${message}`);
    this.name = "AIBridgeError";
  }
}

export class ToolError extends Error {
  constructor(tool: string, message: string) {
    super(`[${tool}] ${message}`);
    this.name = "ToolError";
  }
}
```

- [ ] **Step 6: Write `src/cdp/types.ts`**

```typescript
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
```

- [ ] **Step 7: Install deps and typecheck**

```bash
npm install && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git init
git add package.json tsconfig.json src/utils/config.ts src/utils/errors.ts src/utils/logger.ts src/cdp/types.ts
git commit -m "feat: bootstrap mcp-dia project with config, logger, errors, types"
```

---

## Task 2: CDP Connection Manager

**Files:**
- Create: `src/cdp/connection.ts`, `src/cdp/helpers.ts`
- Test: `tests/cdp/connection.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/cdp/connection.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { CDPConnection } from "../../src/cdp/connection.js";

describe("CDPConnection", () => {
  it("should be a singleton", () => {
    const a = CDPConnection.getInstance({ host: "localhost", port: 19222, reconnectMax: 5000 });
    const b = CDPConnection.getInstance({ host: "localhost", port: 19222, reconnectMax: 5000 });
    expect(a).toBe(b);
    CDPConnection.resetInstance();
  });

  it("should report not connected initially", () => {
    const conn = CDPConnection.getInstance({ host: "localhost", port: 19999, reconnectMax: 1000 });
    expect(conn.isConnected()).toBe(false);
    CDPConnection.resetInstance();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run tests/cdp/connection.test.ts
```

- [ ] **Step 3: Write `src/cdp/connection.ts`**

```typescript
import CDP from "chrome-remote-interface";
import { EventEmitter } from "node:events";
import { CDPError } from "../utils/errors.js";
import type { Tab } from "./types.js";

interface CDPConfig {
  host: string;
  port: number;
  reconnectMax: number;
}

export class CDPConnection extends EventEmitter {
  private static instance: CDPConnection | null = null;
  private client: CDP.Client | null = null;
  private config: CDPConfig;
  private connected = false;
  private reconnecting = false;

  private constructor(config: CDPConfig) {
    super();
    this.config = config;
  }

  static getInstance(config: CDPConfig): CDPConnection {
    if (!CDPConnection.instance) {
      CDPConnection.instance = new CDPConnection(config);
    }
    return CDPConnection.instance;
  }

  static resetInstance(): void {
    CDPConnection.instance?.disconnect();
    CDPConnection.instance = null;
  }

  async connect(): Promise<void> {
    try {
      this.client = await CDP({ host: this.config.host, port: this.config.port });
      this.connected = true;
      this.client.on("disconnect", () => this.handleDisconnect());
      this.emit("connected");
    } catch {
      throw new CDPError(
        `Failed to connect to Dia at ${this.config.host}:${this.config.port}. ` +
        `Launch Dia with: open -a "Dia" --args --remote-debugging-port=${this.config.port}`,
        "CONNECTION_FAILED"
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try { await this.client.close(); } catch {}
      this.client = null;
    }
    this.connected = false;
  }

  isConnected(): boolean { return this.connected; }

  async listTargets(): Promise<Tab[]> {
    const targets = await CDP.List({ host: this.config.host, port: this.config.port });
    return targets
      .filter((t: any) => t.type === "page")
      .map((t: any) => ({ id: t.id, url: t.url, title: t.title, active: false }));
  }

  async attachToTab(tabId: string): Promise<CDP.Client> {
    const targets = await CDP.List({ host: this.config.host, port: this.config.port });
    const target = targets.find((t: any) => t.id === tabId);
    if (!target) throw new CDPError(`Tab not found: ${tabId}`, "TAB_NOT_FOUND");
    return CDP({ host: this.config.host, port: this.config.port, target });
  }

  async getActiveTab(): Promise<CDP.Client> {
    if (!this.client) throw new CDPError("Not connected to Dia", "NOT_CONNECTED");
    return this.client;
  }

  private async handleDisconnect(): Promise<void> {
    this.connected = false;
    this.emit("disconnected");
    if (!this.reconnecting) await this.attemptReconnect();
  }

  private async attemptReconnect(): Promise<void> {
    this.reconnecting = true;
    let delay = 1000;
    while (!this.connected && delay <= this.config.reconnectMax) {
      this.emit("reconnecting", { delay });
      await new Promise((r) => setTimeout(r, delay));
      try {
        await this.connect();
        this.reconnecting = false;
        this.emit("reconnected");
        return;
      } catch {
        delay = Math.min(delay * 2, this.config.reconnectMax);
      }
    }
    this.reconnecting = false;
    this.emit("reconnect_failed");
  }
}
```

- [ ] **Step 4: Write `src/cdp/helpers.ts`**

```typescript
import type CDP from "chrome-remote-interface";
import { CDPConnection } from "./connection.js";
import { ToolError } from "../utils/errors.js";

export async function withTab<T>(
  cdp: CDPConnection,
  tabId: string | undefined,
  fn: (client: CDP.Client) => Promise<T>
): Promise<T> {
  let client: CDP.Client;
  let shouldClose = false;
  if (tabId) {
    client = await cdp.attachToTab(tabId);
    shouldClose = true;
  } else {
    client = await cdp.getActiveTab();
  }
  try {
    return await fn(client);
  } finally {
    if (shouldClose) { try { await client.close(); } catch {} }
  }
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx vitest run tests/cdp/connection.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/cdp/connection.ts src/cdp/helpers.ts tests/cdp/connection.test.ts
git commit -m "feat: CDP Connection Manager with auto-reconnect and tab targeting"
```

---

## Task 3: Core Tools (9 outils)

**Files:**
- Create: `src/tools/core/tabs.ts`, `src/tools/core/navigation.ts`, `src/tools/core/content.ts`
- Test: `tests/core/tabs.test.ts`, `tests/core/navigation.test.ts`, `tests/core/content.test.ts`

- [ ] **Step 1: Write `src/tools/core/tabs.ts`**

4 tools: `list_tabs`, `open_tab`, `close_tab`, `switch_tab`. Each exports a Zod input schema + async handler taking `(cdp, args)`. Uses `cdp.listTargets()`, `client.Target.createTarget()`, `closeTarget()`, `activateTarget()`.

- [ ] **Step 2: Write `src/tools/core/navigation.ts`**

4 tools: `navigate`, `go_back`, `go_forward`, `reload_tab`. Uses `withTab()`, `Page.navigate()`, `Page.getNavigationHistory()`, `Page.navigateToHistoryEntry()`, `Page.reload()`.

- [ ] **Step 3: Write `src/tools/core/content.ts`**

1 tool: `get_page_content`. Format `text|html|markdown`, `maxLength` with `[truncated]` marker. Uses `Runtime.evaluate()` with appropriate JS expression per format.

- [ ] **Step 4: Write schema tests for all 3 files**

Validate: required fields, defaults, enum constraints, `maxLength > 0`, URL validation on `navigate` and `open_tab`.

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/core/
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/core/ tests/core/
git commit -m "feat: 9 core tools (tabs, navigation, content)"
```

---

## Task 4: Advanced Tools (9 outils)

**Files:**
- Create: `src/tools/advanced/interaction.ts`, `src/tools/advanced/screenshot.ts`, `src/tools/advanced/javascript.ts`, `src/tools/advanced/network.ts`
- Test: `tests/advanced/interaction.test.ts`, `tests/advanced/screenshot.test.ts`, `tests/advanced/network.test.ts`

- [ ] **Step 1: Write `src/tools/advanced/interaction.ts`**

3 tools: `click_element` (CSS/XPath via Runtime.evaluate), `fill_input` (input/textarea/contenteditable, clearBefore), `wait_for_selector` (MutationObserver + timeout).

- [ ] **Step 2: Write `src/tools/advanced/screenshot.ts`**

2 tools: `screenshot` (viewport/selector/fullPage, png/jpeg/webp via Page.captureScreenshot), `generate_pdf` (A4/Letter, landscape via Page.printToPDF).

- [ ] **Step 3: Write `src/tools/advanced/javascript.ts`**

1 tool: `evaluate_js`. Runtime.evaluate with `returnByValue: true, awaitPromise: true`. Returns `JsonValue`.

- [ ] **Step 4: Write `src/tools/advanced/network.ts`**

3 tools: `get_cookies` (Network.getCookies), `set_cookie` (Network.setCookie), `intercept_network` (Fetch.enable for block, Network.requestWillBeSent for log).

- [ ] **Step 5: Write schema tests for all 4 files**

- [ ] **Step 6: Run tests**

```bash
npx vitest run tests/advanced/
```

- [ ] **Step 7: Commit**

```bash
git add src/tools/advanced/ tests/advanced/
git commit -m "feat: 9 advanced tools (interaction, screenshot, pdf, js, cookies, network)"
```

---

## Task 5: AI Bridge (6 outils)

**Files:**
- Create: `src/tools/ai-bridge/selectors.json`, `src/tools/ai-bridge/detect.ts`
- Create: `src/tools/ai-bridge/chat.ts`, `src/tools/ai-bridge/skills.ts`, `src/tools/ai-bridge/memory.ts`
- Test: `tests/ai-bridge/chat.test.ts`

- [ ] **Step 1: Write `selectors.json`**

JSON with `versions.default` containing selector groups for `chat` (container, input, sendButton, messages), `skills` (panel, list, name, trigger), `memory` (searchInput, results, resultTitle, resultSnippet). Multiple fallback selectors per element.

- [ ] **Step 2: Write `detect.ts`**

`loadSelectors(version)`, `findElement(client, selectorList)` tries each comma-separated selector, `detectElement(client, selector, label)` throws `AIBridgeError`, `healthCheck(client)` returns boolean.

- [ ] **Step 3: Write `chat.ts`**

2 tools: `dia_send_chat` (open chat via ⌘E if closed, find input, type message, send, optionally poll for response with timeout), `dia_get_chat_history` (read messages from DOM).

- [ ] **Step 4: Write `skills.ts`**

2 tools: `dia_list_skills` (read skills list from DOM), `dia_trigger_skill` (find skill by name, click, read response).

- [ ] **Step 5: Write `memory.ts`**

2 tools: `dia_search_memory` (type query in search input, read results), `dia_get_tab_context` (extract meta tags, og:*, h1, canonical).

- [ ] **Step 6: Write schema tests**

- [ ] **Step 7: Run tests**

```bash
npx vitest run tests/ai-bridge/
```

- [ ] **Step 8: Commit**

```bash
git add src/tools/ai-bridge/ tests/ai-bridge/
git commit -m "feat: 6 AI Bridge tools (chat, skills, memory) with selector detection"
```

---

## Task 6: MCP Server Wiring (`index.ts`)

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Write `src/index.ts`**

Wire all 24 tools into MCP Server following the `mcp-graphviz` pattern:
- `ToolDef` interface with `name`, `description`, `schema`, `handler`, `readOnly`, `destructive`, `aiBridge?`
- 3 arrays: `coreTools`, `advancedTools`, `aiBridgeTools`
- `allTools` = concat, conditionally including aiBridgeTools based on `config.aiBridge`
- `ListToolsRequestSchema` handler: map to MCP tool format with annotations
- `CallToolRequestSchema` handler: parse args with Zod, call handler, catch errors (ZodError, AIBridgeError, CDPError)
- `main()`: connect CDP (non-blocking on failure), connect stdio transport, register SIGINT/SIGTERM

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Test with MCP Inspector**

```bash
open -a "Dia" --args --remote-debugging-port=9222
npm run inspect
```

Verify: 24 tools listed, `list_tabs` returns real tabs.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: MCP server wiring — all 24 tools registered and functional"
```

---

## Task 7: README + LICENSE + CI + npm Publish

**Files:**
- Create: `README.md`, `LICENSE`, `PROJECT.nfo`, `.github/workflows/ci.yml`

- [ ] **Step 1: Write `README.md`**

Sections: Features, Quick Start (launch Dia + Claude Desktop config), Tools table (3 layers), Configuration (env vars), Requirements, License.

- [ ] **Step 2: Write `LICENSE` (MIT, Aïssa BELKOUSSA, 2026)**

- [ ] **Step 3: Write `PROJECT.nfo`**

Per template `~/.claude/templates/PROJECT.nfo.template`.

- [ ] **Step 4: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
```

- [ ] **Step 5: Verify npm pack**

```bash
npm pack --dry-run
```

- [ ] **Step 6: Publish**

```bash
npm publish --access public
```

- [ ] **Step 7: Commit**

```bash
git add README.md LICENSE PROJECT.nfo .github/workflows/ci.yml
git commit -m "feat: README, LICENSE, CI, npm publish as mcp-dia"
```

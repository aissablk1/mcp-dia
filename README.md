# mcp-dia

MCP server for **Dia Browser** — control tabs, automate pages, and interact with Dia's built-in AI via Chrome DevTools Protocol.

## Features

- **24 tools** across 3 layers: Core (tabs, navigation, content), Advanced (screenshots, DOM, cookies, network, PDF), AI Bridge (chat, skills, memory)
- **Auto-reconnect** CDP connection with capped exponential backoff
- **AI Bridge** (experimental) — interact with Dia's built-in AI: send chat messages, trigger Skills, query Search memory
- **Feature-flagged** — disable AI Bridge with `DIA_AI_BRIDGE=false` for a stable CDP-only server
- **Hardened by default** — URL scheme allow-list, HttpOnly cookie redaction, per-tool timeouts, honest `destructive` annotations

## Quick Start

### 1. Launch Dia with CDP enabled

```bash
open -a "Dia" --args --remote-debugging-port=9222
```

### 2. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dia-browser": {
      "command": "npx",
      "args": ["mcp-dia"]
    }
  }
}
```

### 3. Use

Ask Claude: *"List my open tabs in Dia"* or *"Take a screenshot of the current page"*.

## Tools

### Core (stable)

| Tool | Description |
|------|-------------|
| `list_tabs` | List all open tabs |
| `open_tab` | Open a new tab (http(s) only) |
| `close_tab` | Close a tab |
| `switch_tab` | Focus a tab |
| `navigate` | Go to an http(s) URL |
| `go_back` | Previous page |
| `go_forward` | Next page |
| `reload_tab` | Reload page |
| `get_page_content` | Extract text/HTML/markdown |

### Advanced (stable)

| Tool | Description |
|------|-------------|
| `screenshot` | Capture viewport/element/full page |
| `generate_pdf` | Save page as PDF |
| `click_element` | Click by CSS/XPath selector |
| `fill_input` | Fill form fields |
| `wait_for_selector` | Wait for DOM element |
| `evaluate_js` | Run JavaScript (with timeout) |
| `get_cookies` | Read cookies (HttpOnly values redacted by default) |
| `set_cookie` | Write cookies |
| `intercept_network` | Log/block requests for a bounded window |

### AI Bridge (experimental)

| Tool | Description |
|------|-------------|
| `dia_send_chat` | Send message to Dia AI |
| `dia_get_chat_history` | Read chat history |
| `dia_list_skills` | List Dia Skills |
| `dia_trigger_skill` | Run a Dia Skill |
| `dia_search_memory` | Query Search memory |
| `dia_get_tab_context` | Get enriched tab context |

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `DIA_CDP_PORT` | `9222` | CDP port |
| `DIA_CDP_HOST` | `localhost` | CDP host |
| `DIA_AI_BRIDGE` | `true` | Enable AI Bridge tools (`false` to disable) |
| `DIA_LOG_LEVEL` | `info` | Log level (`debug`/`info`/`warn`/`error`) |
| `DIA_RECONNECT_MAX` | `30000` | Max reconnect backoff delay (ms) |

Invalid values fall back to their default rather than failing silently.

## Security

- **URL allow-list** — `navigate` and `open_tab` accept only `http(s)` URLs and `about:blank`. Schemes such as `file:`, `javascript:`, `data:`, `chrome:` and `view-source:` are rejected, preventing local-file disclosure and access to internal browser pages — including when the agent is steered by indirect prompt injection from page content it has read.
- **HttpOnly cookies redacted** — `get_cookies` redacts HttpOnly cookie values by default (CDP bypasses HttpOnly). Pass `revealValues: true` to opt in when you genuinely need them.
- **Loopback by default, not enforced** — the CDP connection defaults to `localhost`. `DIA_CDP_HOST` can override it; only point it at a trusted, private host. The debug port grants full control of the browser session.
- `evaluate_js` executes arbitrary JavaScript in the page context and is annotated `destructive` — use with trusted models only.
- `click_element` and `dia_trigger_skill` are annotated `destructive` because the targeted action is arbitrary and may be irreversible.
- Cookies and credentials are never written to logs.

## Requirements

- macOS
- Dia Browser v0.38.0+
- Node.js 20+

## License

MIT © Aïssa BELKOUSSA

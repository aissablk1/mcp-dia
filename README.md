# mcp-dia

MCP server for **Dia Browser** — control tabs, automate pages, and interact with Dia's built-in AI via Chrome DevTools Protocol.

## Features

- **24 tools** across 3 layers: Core (tabs, navigation, content), Advanced (screenshots, DOM, cookies, network, PDF), AI Bridge (chat, skills, memory)
- **Auto-reconnect** CDP connection with exponential backoff
- **AI Bridge** (experimental) — interact with Dia's built-in AI: send chat messages, trigger Skills, query Search memory
- **Feature-flagged** — disable AI Bridge with `DIA_AI_BRIDGE=false` for a stable CDP-only server

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
| `open_tab` | Open a new tab |
| `close_tab` | Close a tab |
| `switch_tab` | Focus a tab |
| `navigate` | Go to a URL |
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
| `evaluate_js` | Run JavaScript |
| `get_cookies` | Read cookies |
| `set_cookie` | Write cookies |
| `intercept_network` | Log/block requests |

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
| `DIA_AI_BRIDGE` | `true` | Enable AI Bridge tools |
| `DIA_LOG_LEVEL` | `info` | Log level |
| `DIA_RECONNECT_MAX` | `30000` | Max reconnect delay (ms) |

## Security

- CDP is only accessible on `localhost`
- `evaluate_js` executes arbitrary JavaScript in page context — use with trusted AI models only
- Cookies and credentials are never logged

## Requirements

- macOS
- Dia Browser v0.38.0+
- Node.js 20+

## License

MIT

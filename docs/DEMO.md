# Demo walkthrough — mcp-dia

A ~45–60 second scripted scenario to show what `mcp-dia` does, ready to record as
a GIF/asciinema for the README. It works from any MCP client (Claude Desktop,
Claude Code, or the MCP Inspector). No editing tricks — the whole point is that a
model drives a real browser.

## Setup (once)

```bash
# 1. Launch Dia with the CDP debug port
open -a "Dia" --args --remote-debugging-port=9222

# 2a. Quickest for a demo: the MCP Inspector (no client config)
cd /path/to/mcp-dia && npm run build && npm run inspect
#   → open the Inspector URL, "List Tools" should show 24 tools

# 2b. Or wire it into Claude Desktop (~/Library/Application Support/Claude/claude_desktop_config.json)
#   { "mcpServers": { "dia-browser": { "command": "npx", "args": ["mcp-dia"] } } }
```

## The scenario (what to show, in order)

Each step is one natural-language ask; the tool it triggers is in `code`.

1. **"List my open tabs."** → `list_tabs` — returns real tabs from Dia. Hook: the
   model can already see the live browser state.
2. **"Open github.com/trending in a new tab."** → `open_tab` — a tab appears in Dia.
3. **"Give me this page as markdown, then summarize the top 3 repos."** →
   `get_page_content` (`format: "markdown"`) — the model reads and summarizes.
4. **"Screenshot the first repository card."** → `screenshot` (`selector: "article:first-of-type"`)
   — returns a cropped image (fails loudly if the selector is missing — a v0.2.0 fix).
5. **"How many stars does the top repo have? Read it from the DOM."** → `evaluate_js`
   — shows the power tool (and that it's `destructive`-annotated / can be disabled
   with `DIA_ALLOW_EVAL=false`).
6. **(AI Bridge, optional)** **"Ask Dia's built-in AI to explain what that repo does."**
   → `dia_send_chat` — the differentiator: driving Dia's *own* AI, not just the page.

Close on the tab list / screenshot so the viewer sees the browser actually moved.

## Recording tips

- **asciinema** (terminal, if using the Inspector CLI or a terminal client):
  ```bash
  asciinema rec demo.cast   # perform the scenario, then Ctrl-D
  # convert to GIF with agg:  agg demo.cast demo.gif
  ```
- **Screen GIF** (to show Dia moving): record the Dia window + the client side by
  side (e.g. Kap, CleanShot, LICEcap). Keep it under ~15 s of actual motion; trim
  dead time. Aim for a small file (< 5 MB) so it renders inline in the README.
- Put the result at `docs/demo.gif` and embed it near the top of `README.md`:
  `![mcp-dia demo](docs/demo.gif)`.

## One-line pitch (for the release / social post)

> `mcp-dia` — let any MCP agent drive The Browser Company's Dia: open tabs, read
> pages, screenshot, run JS, and talk to Dia's built-in AI — over CDP, hardened
> against prompt-injection.

> Note: this walkthrough uses real tabs and a real browser. The `evaluate_js` and
> AI Bridge steps run actual code / UI automation — use a trusted model, and see
> the README security section.

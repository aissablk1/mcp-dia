# HANDOFF — mcp-dia (context for AI agents & contributors)

> This file is the durable, provider-agnostic entry point for anyone — human or
> AI agent of any provider — picking up work on this project. It is intentionally
> self-contained. The **source of truth is the repository itself** (`git log`,
> the code, the tests): always run the checks below before trusting any summary.

## What this is

`mcp-dia` is a **Model Context Protocol (MCP) server** (TypeScript, stdio transport)
that drives **The Browser Company's Dia browser** over the **Chrome DevTools
Protocol** (CDP, `localhost:9222`). It exposes **24 tools** across three layers:

- **Core** — tabs, navigation, page content.
- **Advanced** — screenshots, PDF, DOM interaction, `evaluate_js`, cookies, network interception.
- **AI Bridge** (experimental, `DIA_AI_BRIDGE=false` to disable) — drive Dia's built-in AI
  chat, Skills, and Search memory by inspecting/automating its DOM (selectors in
  `src/tools/ai-bridge/selectors.json`, versioned — brittle to Dia UI changes).

## Current state

- Version **0.2.0** (see `CHANGELOG.md` for the full 0.2.0 hardening set).
- Quality gates green: `typecheck`, `build`, **142 tests**, `npm audit` clean.
- Published to npm: check with `npm view mcp-dia version`. Consumers run `npx mcp-dia`.

## Layout (where things live)

- `src/index.ts` — bootstrap (`main()`, config, CDP wiring, graceful shutdown).
- `src/server.ts` — the **testable MCP protocol layer**: `buildTools()`, `callTool()`,
  `createServer()`, and `defineTool()` (compile-time schema↔handler safety). Start here
  to understand tool wiring, annotations, and error/`structuredContent` shaping.
- `src/cdp/` — CDP connection singleton (`connection.ts`), `withTab()` helper, shared types.
- `src/tools/{core,advanced,ai-bridge}/` — one module group per layer; `output-schemas.ts`
  holds the Zod `outputSchema` per tool (MCP requires these to be **objects**).
- `src/utils/` — `config.ts` (robust env parsing), `validation.ts` (`SafeUrl` allow-list),
  `timeout.ts`, `errors.ts`, `logger.ts`.
- `tests/` — Vitest; `tests/helpers/mock-cdp.ts` is the shared CDP mock (browser can't run in CI).

## Build / test / run

```bash
npm ci            # or: npm install
npm run typecheck # tsc --noEmit
npm run build     # tsc + copy selectors.json to dist/
npm test          # vitest run (expected: all green)
npm audit         # expected: 0 vulnerabilities

# Run against a real browser (requires Dia installed):
open -a "Dia" --args --remote-debugging-port=9222
npm run inspect   # MCP Inspector — verify 24 tools and that list_tabs returns tabs
```

## Publishing

`prepublishOnly` rebuilds `dist/` automatically. Publishing requires npm auth:

```bash
npm whoami        # if 401, run: npm login  (interactive; human + 2FA)
npm publish       # publishes the current version
```

## Configuration (env, all optional)

`DIA_CDP_PORT` (9222) · `DIA_CDP_HOST` (localhost) · `DIA_AI_BRIDGE` (true) ·
`DIA_LOG_LEVEL` (info) · `DIA_RECONNECT_MAX` (30000 ms — a **backoff-delay cap**, not an
attempt count; reconnection retries indefinitely). Invalid values fall back to defaults.

## Security posture (do not regress)

This server drives a browser on behalf of an LLM agent, so **indirect prompt injection**
(a malicious page steering the agent) is the core threat. The defenses live in the tool
contract, not in prompts:

- `navigate` / `open_tab` accept only `http(s)` and `about:blank` (`SafeUrl`). `file:`,
  `javascript:`, `data:`, `chrome:`, `view-source:` are rejected — prevents local-file
  disclosure and internal-page access.
- `get_cookies` redacts HttpOnly values by default (opt in with `revealValues: true`).
- `evaluate_js`, `click_element`, `dia_trigger_skill` are annotated `destructive`.
- All tool handler errors surface as MCP `isError` results (never opaque protocol errors);
  `structuredContent` is validated against each tool's `outputSchema`.
- CDP defaults to loopback; `DIA_CDP_HOST` overrides it but is not enforced — keep it private.

## Working conventions (repo owner's rules)

- **Green before commit** — never commit code that fails typecheck/build/tests.
- **Stage file-by-file** (explicit paths); never `git add -A`/`.` (parallel-session safety).
- **No AI co-author** in commit messages; authorship email is the GitHub `noreply` address.
- Public contact: `contact@aissabelkoussa.fr`. Never place a personal email in the repo.
- Prefer reusing existing libraries/patterns over reinventing; subtract before adding.

## Known limitations / next steps

- Tests mock CDP; the JS injected into pages (click/fill/markdown/AI-Bridge) is not exercised
  against a real DOM. An optional env-gated (`DIA_E2E=1`) integration lane against real
  Chromium would close this gap.
- AI Bridge depends on Dia's DOM selectors and will break on Dia UI redesigns (by design;
  it's experimental and disableable).
- `docs/spec.md` / `docs/superpowers/specs/` are the original design docs and slightly predate
  the 0.2.0 behavior — treat `CHANGELOG.md` + the code as authoritative.

---
Maintainer: Aïssa BELKOUSSA · contact@aissabelkoussa.fr · https://github.com/aissablk1/mcp-dia

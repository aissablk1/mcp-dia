# HANDOFF — mcp-dia (context for AI agents & contributors)

> Durable, provider-agnostic entry point for anyone — human or AI agent of any
> provider/harness — picking up work on this project. Self-contained by design.
> **The source of truth is the repository itself** (`git log`, the code, the tests):
> always run the checks below before trusting any summary. Last updated at HEAD
> `4d007c4` (v0.3.0).

## What this is

`mcp-dia` is a **Model Context Protocol (MCP) server** (TypeScript, ESM, stdio transport)
that drives **The Browser Company's Dia browser** over the **Chrome DevTools Protocol**
(CDP, `localhost:9222` by default). It exposes **24 tools** across three layers:

- **Core** (9) — tabs, navigation, page content.
- **Advanced** (9) — screenshots, PDF, DOM interaction, `evaluate_js`, cookies, network interception.
- **AI Bridge** (6, experimental, `DIA_AI_BRIDGE=false` to disable) — drive Dia's built-in AI
  chat, Skills, and Search memory by inspecting/automating its DOM (selectors in
  `src/tools/ai-bridge/selectors.json`, versioned — brittle to Dia UI changes).

`evaluate_js` runs arbitrary JS; it stays enabled by default but can be removed entirely
with `DIA_ALLOW_EVAL=false`.

## Current state (as of HEAD 4d007c4)

- Version **0.3.0** (`package.json` and `src/server.ts` `VERSION`). See `CHANGELOG.md`.
- Quality gates green: `typecheck` 0, `build` 0, **145 tests pass + 5 skipped**
  (the 5 skipped are the opt-in E2E lane), `npm audit` **0 vulnerabilities**.
- Git: `main` @ `4d007c4`, tags **v0.2.0** and **v0.3.0**, GitHub Release **v0.3.0** (Latest).
  Remote: `https://github.com/aissablk1/mcp-dia` (public).
- **npm: NOT yet published.** The first publish will be `0.3.0`. Publishing is automated (see below)
  but waits on a repo secret. Verify with `npm view mcp-dia version` (currently 404 / unpublished).

## Layout (where things live)

- `src/index.ts` — bootstrap (`main()`, config, CDP event wiring, loopback warning, `unhandledRejection`
  guard, graceful shutdown).
- `src/server.ts` — the **testable MCP protocol layer**: `buildTools()`, `callTool()`, `createServer()`,
  `defineTool()` (compile-time schema↔handler safety), `VERSION`. Start here for tool wiring, annotations,
  error mapping and `structuredContent` shaping.
- `src/cdp/` — CDP connection singleton (`connection.ts`: connect/reconnect with capped backoff,
  `getActiveTab` NOT_CONNECTED guard), `withTab()` helper (`helpers.ts`), shared types (`types.ts`).
- `src/tools/{core,advanced,ai-bridge}/` — one module group per layer; `output-schemas.ts` holds the Zod
  `outputSchema` per tool (**MCP requires these to be objects** — handlers wrap collections accordingly).
- `src/utils/` — `config.ts` (robust env parsing, fallback on invalid), `validation.ts` (`SafeUrl`
  allow-list), `timeout.ts` (`withTimeout`), `errors.ts` (`CDPError`/`AIBridgeError`/`ToolError`), `logger.ts`.
- `tests/` — Vitest. `tests/helpers/mock-cdp.ts` is the shared CDP mock (unit tests don't need a browser).
  `tests/e2e/` is the opt-in real-browser lane (see below).

## Build / test / run

```bash
npm ci            # or: npm install
npm run typecheck # tsc --noEmit
npm run build     # tsc + copy selectors.json to dist/
npm test          # vitest run — expected: 145 passed + 5 skipped
npm audit         # expected: 0 vulnerabilities

# Run against a real browser (requires Dia installed):
open -a "Dia" --args --remote-debugging-port=9222
npm run inspect   # MCP Inspector — verify 24 tools; list_tabs should return tabs

# Opt-in E2E lane (Core/Advanced only; needs any Chromium with a debug port):
#   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
#     --remote-debugging-port=9223 --user-data-dir=/tmp/mcp-dia-e2e about:blank &
#   DIA_E2E=1 DIA_CDP_PORT=9223 npx vitest run tests/e2e/
```

## Configuration (env, all optional; invalid values fall back to defaults)

| Variable | Default | Meaning |
|---|---|---|
| `DIA_CDP_PORT` | `9222` | CDP port |
| `DIA_CDP_HOST` | `localhost` | CDP host (keep loopback) |
| `DIA_AI_BRIDGE` | `true` | Enable AI Bridge tools (`false` → 18 tools) |
| `DIA_ALLOW_EVAL` | `true` | Keep `evaluate_js` (`false` removes it → 23/17 tools) |
| `DIA_LOG_LEVEL` | `info` | `debug`/`info`/`warn`/`error` |
| `DIA_RECONNECT_MAX` | `30000` | Backoff-delay **cap** in ms (not an attempt count; reconnects indefinitely) |
| `DIA_E2E` | (unset) | Set to `1` to run the opt-in E2E lane |

## Security posture (do not regress)

This server drives a browser for an LLM agent, so **indirect prompt injection** (a malicious page
steering the agent) is the core threat. Defenses live in the tool contract, not in prompts:

- `navigate` / `open_tab` accept only `http(s)` and `about:blank` (`SafeUrl`). `file:`, `javascript:`,
  `data:`, `chrome:`, `view-source:` are rejected — prevents local-file disclosure and internal-page access.
- `get_cookies` redacts HttpOnly values by default (opt in with `revealValues: true`).
- `evaluate_js`, `click_element`, `dia_trigger_skill` are annotated `destructive`; `evaluate_js` can be
  removed entirely with `DIA_ALLOW_EVAL=false`.
- All tool handler errors surface as MCP `isError` results (never opaque protocol errors);
  `structuredContent` is validated against each tool's `outputSchema` before sending.
- `intercept_network` disables the CDP domain + removes its listener after the window (no leak/crash).
- CDP defaults to loopback; `DIA_CDP_HOST` overrides it but is not enforced — keep it private.

## Publishing (automated — waits on one secret)

Publishing is done by GitHub Actions (`.github/workflows/publish.yml`) on a `v*` tag push or manual
dispatch, with npm provenance. It requires a repo secret **`NPM_TOKEN`** (an npm *automation* token —
only the maintainer can create it):

```bash
gh secret set NPM_TOKEN --repo aissablk1/mcp-dia   # paste an npm automation token
gh workflow run "Publish to npm" --repo aissablk1/mcp-dia   # then trigger (publishes package.json version)
```

Manual fallback: `npm login` (2FA) then `npm publish` (`prepublishOnly` rebuilds `dist/`).

## Pending / requires a human or a decision (as of 4d007c4)

- **npm publish** — BLOCKED on the `NPM_TOKEN` secret (maintainer's npm credential). Workflow is ready.
- **Demo GIF** — a functional demo (a real Dia being driven) must be screen-recorded by a human; it
  cannot be fabricated. The exact scripted scenario is in `docs/DEMO.md`.
- **E2E lane verification** — `tests/e2e/core-advanced.e2e.test.ts` is committed but SKIPPED by default
  and **not yet executed against a real browser** (the CI/dev sandbox used could not launch a
  CDP-listening browser). Run it once on a real machine (command above) to validate it.
- **PII cache** — the pre-rewrite commit SHAs (`aca045e`, `7b08209`) that carried a personal email were
  purged from `main` via history rewrite + force-push, but GitHub may still cache them. A GitHub support
  ticket can purge that cache — a maintainer decision.

## Known limitations

- Unit tests mock CDP; the JS injected into pages (click/fill/markdown/AI-Bridge) is exercised only by the
  opt-in E2E lane (Core/Advanced), which still needs a first real run to be trusted.
- AI Bridge depends on Dia's DOM selectors and will break on Dia UI redesigns (by design; experimental,
  disableable). Developed against **Dia v1.38.0** (macOS).
- `docs/spec.md` and `docs/superpowers/{plans,specs}/` are historical design/plan docs (banner-marked);
  their unchecked `- [ ]` boxes are a record, not pending work. Treat `CHANGELOG.md`, `README.md`, this
  file, and the code as authoritative.

## Session journals

Detailed, timestamped work journals (QQOQCCP) live under `docs/sessions/` — **gitignored / local only**
(they contain internal process notes, incl. a resolved PII incident). This HANDOFF is the public,
evergreen summary; the per-session journals are the deep local record. Keep both current: update this
file at each version/state change, and append a session journal per working session.

---
Maintainer: Aïssa BELKOUSSA · contact@aissabelkoussa.fr · https://github.com/aissablk1/mcp-dia

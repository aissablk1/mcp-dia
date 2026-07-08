# Changelog

All notable changes to `mcp-dia` are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] — 2026-07-08

### Added
- **`DIA_ALLOW_EVAL` opt-out flag.** `evaluate_js` runs arbitrary JavaScript and
  stays enabled by default, but high-security deployments can now remove it
  entirely with `DIA_ALLOW_EVAL=false` (it is dropped from the tool list, mirroring
  the AI Bridge gating).

### Docs
- README: CI + npm badges, `DIA_ALLOW_EVAL` documentation, and a **Compatibility**
  note on the AI Bridge's dependency on Dia's UI selectors.
- GitHub repository topics added for discoverability.

## [0.2.0] — 2026-07-08

Hardening release: fixes MCP protocol-contract bugs, closes security gaps
relevant to browser-driving agents (indirect prompt injection), and improves
resilience. Surfaced by an adversarial multi-agent review.

### Fixed (MCP protocol)

- **`structuredContent` now conforms to every declared `outputSchema`.** Six
  tools (`list_tabs`, `get_cookies`, `intercept_network`, `dia_get_chat_history`,
  `dia_list_skills`, `dia_search_memory`) returned bare arrays where their schema
  declared an object envelope, which conformant MCP clients rejected. Results are
  now wrapped (`{ tabs: [...] }`, `{ cookies: [...] }`, …) and validated against
  the schema before being sent.
- **All handler errors are surfaced as `isError` results** instead of leaking as
  opaque protocol errors. Previously `ToolError` and the AI-Bridge errors escaped
  the dispatcher's `catch`. AI-Bridge handlers now throw `AIBridgeError` instead
  of bare `Error`.

### Security

- **URL scheme allow-list** on `navigate` and `open_tab`: only `http(s)` and
  `about:blank` are accepted; `file:`, `javascript:`, `data:`, `chrome:`,
  `view-source:`, `chrome-extension:` are rejected — preventing local-file
  disclosure and internal-page access, including via indirect prompt injection.
- **HttpOnly cookie values are redacted by default** in `get_cookies`
  (CDP bypasses HttpOnly). Opt in with `revealValues: true`.
- `click_element` and `dia_trigger_skill` are now annotated `destructive` (their
  targeted action is arbitrary and may be irreversible).

### Fixed (stability)

- **`intercept_network` no longer leaks CDP interception or crashes the process.**
  `enable` calls are awaited before the timer, the `Fetch`/`Network` domain is
  disabled and its listener removed after the window, and the block callback is
  wrapped so a stray rejection cannot terminate Node.
- **Per-tool timeouts** on `navigate` (`Page.loadEventFired`) and `evaluate_js`
  so a page that never loads / never resolves cannot hang a request indefinitely.
- **CDP resilience**: `getActiveTab()` throws `NOT_CONNECTED` while the socket is
  down (instead of returning a dead client during reconnection); reconnection
  retries indefinitely with capped backoff (`DIA_RECONNECT_MAX` is a delay cap,
  not an attempt count); `resetInstance()` is now awaited.
- **`exceptionDetails` checks** added to `screenshot` (selector-not-found no
  longer silently captures the whole viewport), `get_page_content`, and the
  AI-Bridge read handlers.
- **Robust config parsing**: non-numeric `DIA_CDP_PORT`/`DIA_RECONNECT_MAX` and an
  invalid `DIA_LOG_LEVEL` fall back to defaults instead of silently producing
  `NaN` or disabling all logging.

### Changed

- `list_tabs` no longer reports a hardcoded `active: false` field (CDP does not
  reliably expose the active tab).
- `src/server.ts` extracted from `src/index.ts` (testable protocol layer) with a
  type-safe `defineTool` guard; tools now expose a `title` annotation.
- Added a `prepublishOnly` build step and `repository`/`homepage`/`bugs` metadata.

### Tests

- 116 → 142 tests: added protocol-conformance, error-mapping, URL allow-list,
  cookie redaction, `intercept_network` teardown, screenshot selector-error,
  config-validation, and CDP not-connected coverage.

## [0.1.0] — 2026-05-26

- Initial release: 24 tools across Core, Advanced, and AI Bridge layers over CDP.

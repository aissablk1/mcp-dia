# mcp-dia — MCP Server pour Dia Browser

**Auteur** : Aïssa BELKOUSSA
**Date** : 2026-05-26
**Statut** : Draft → En attente validation

---

> ⚠️ **Document de conception historique (2026-05-26) — partiellement dépassé.**
> Il capture l'**intention de design d'origine**, pas l'API actuelle. Pour l'état réel et
> faisant autorité, voir **`CHANGELOG.md`**, **`README.md`** et **`docs/HANDOFF.md`** + le code.
> Divergences notables depuis l'implémentation livrée (v0.2.0 / v0.3.0) :
> - Les outils renvoyant des collections **encapsulent** leur résultat dans un objet conforme à
>   l'`outputSchema` MCP (`{ tabs: [...] }`, `{ cookies: [...] }`, `{ requests: [...] }`,
>   `{ messages: [...] }`, `{ skills: [...] }`, `{ results: [...] }`) — **pas** un tableau nu.
> - `list_tabs` **n'expose plus** de champ `active` (CDP ne le fournit pas de façon fiable).
> - Flag **`DIA_ALLOW_EVAL`** (retire l'outil `evaluate_js`) — absent de la table §7 ci-dessous.
> - Durcissements sécurité livrés au-delà de la §10 : **allow-list de schémas d'URL**
>   (`navigate`/`open_tab` : http(s)/about:blank), **redaction des cookies HttpOnly** par défaut,
>   annotations **`destructive`** honnêtes, timeouts par outil.
> - Le message d'erreur AI Bridge exact de la §5 (« Dia UI element not found… ») est
>   **illustratif** ; l'implémentation lève des `AIBridgeError` au message contextuel.
> - Compatibilité : développé contre **Dia v1.38.0** (et non « v0.38.0+ »).
> - Build via **`tsc`** (pas `tsup`) ; `dia_get_tab_context` vit dans `memory.ts` (pas de `context.ts`).

---

## 1. Objectif

Construire un serveur MCP (Model Context Protocol) de référence pour **Dia Browser** (The Browser Company), publié en open-source sur npm. Le serveur expose ~24 outils répartis en 3 couches :

1. **Core** — gestion tabs, navigation, contenu (CDP standard)
2. **Advanced** — screenshots, interaction DOM, cookies, réseau, PDF (CDP standard)
3. **AI Bridge** — interaction avec les features IA de Dia : Skills, Chat, Search memory (expérimental, DOM detection, feature-flaggé)

### Pourquoi

L'existant (`dia-browser-control` par meowfield) ne propose que 9 outils CDP basiques, sans aucune exploitation des features différenciantes de Dia (IA intégrée, Skills, @Tabs context, Search memory). Il n'est pas publié sur npm et manque de robustesse (pas de reconnexion, pas de health check).

### Critères d'acceptation

- [ ] Serveur MCP fonctionnel connecté à Dia via CDP (port 9222)
- [ ] ~24 outils couvrant les 3 couches (Core, Advanced, AI Bridge)
- [ ] Auto-reconnexion CDP avec health check
- [ ] AI Bridge feature-flaggé, graceful degradation si éléments Dia non détectés
- [ ] Tests d'intégration pour les outils Core et Advanced
- [ ] Publié sur npm (`mcp-dia`), installable via `npx mcp-dia`
- [ ] README avec guide d'installation, screenshots, liste d'outils
- [ ] Compatible Dia Browser v0.38.0+ sur macOS

---

## 2. Architecture

```
┌─────────────────────────────────────────────┐
│           MCP Server (stdio/SSE)            │
│         @modelcontextprotocol/sdk           │
├─────────────┬───────────────┬───────────────┤
│  Core Tools │  Advanced     │  AI Bridge    │
│  (9 outils) │  Tools        │  Tools        │
│             │  (9 outils)   │  (6 outils)   │
├─────────────┴───────────────┴───────────────┤
│         CDP Connection Manager              │
│  singleton · auto-reconnect · health check  │
│  event emitter · graceful shutdown          │
├─────────────────────────────────────────────┤
│       chrome-remote-interface:9222          │
└─────────────────────────────────────────────┘
         ↕ Chrome DevTools Protocol
┌─────────────────────────────────────────────┐
│  Dia Browser (--remote-debugging-port=9222) │
└─────────────────────────────────────────────┘
```

### 2.1 CDP Connection Manager

Singleton qui gère la connexion CDP :

- **Auto-discovery** : tente `localhost:9222` par défaut, configurable via `DIA_CDP_PORT`
- **Auto-reconnect** : retry exponentiel (1s, 2s, 4s, 8s, max 30s) si connexion perdue
- **Health check** : ping CDP toutes les 10s, émet événement `disconnected` si échec
- **Graceful shutdown** : ferme proprement la connexion CDP à l'arrêt du serveur
- **Tab targeting** : maintient un cache des targets CDP, rafraîchi à chaque `list_tabs`

### 2.2 Transport

- **stdio** (défaut) — compatible Claude Desktop, Claude Code
- **SSE** (optionnel, flag `--sse`) — compatible clients HTTP MCP

---

## 3. Outils — Couche Core (stable)

| Outil | Params | Retour | Description |
|-------|--------|--------|-------------|
| `list_tabs` | — | `Tab[]` | Liste tous les onglets ouverts (id, url, title, active) |
| `open_tab` | `url: string` | `Tab` | Ouvre un nouvel onglet avec l'URL donnée |
| `close_tab` | `tabId: string` | `void` | Ferme un onglet par son ID |
| `switch_tab` | `tabId: string` | `Tab` | Active un onglet |
| `reload_tab` | `tabId?: string, ignoreCache?: boolean` | `void` | Recharge l'onglet (courant si pas d'ID) |
| `navigate` | `url: string, tabId?: string` | `void` | Navigue vers une URL dans l'onglet donné |
| `go_back` | `tabId?: string` | `void` | Page précédente |
| `go_forward` | `tabId?: string` | `void` | Page suivante |
| `get_page_content` | `tabId?: string, format?: "text"\|"html"\|"markdown", maxLength?: number` | `string` | Extrait le contenu de la page. Tronqué à `maxLength` (défaut 100 000 chars) avec indicateur `[truncated]` |

---

## 4. Outils — Couche Advanced (stable)

| Outil | Params | Retour | Description |
|-------|--------|--------|-------------|
| `screenshot` | `tabId?: string, selector?: string, fullPage?: boolean, format?: "png"\|"jpeg"\|"webp"` | `base64 image` | Capture d'écran (viewport, element, ou full page) |
| `click_element` | `tabId?: string, selector: string, selectorType?: "css"\|"xpath"` | `void` | Clic sur un élément CSS (défaut) ou XPath |
| `fill_input` | `tabId?: string, selector: string, value: string, selectorType?: "css"\|"xpath", clearBefore?: boolean` | `void` | Remplit un champ (input, textarea, contenteditable). `clearBefore` vide le champ avant saisie |
| `evaluate_js` | `tabId?: string, expression: string` | `JsonValue` | Exécute du JS dans le contexte de la page active. Retour JSON-serializable uniquement |
| `wait_for_selector` | `tabId?: string, selector: string, timeout?: number` | `boolean` | Attend qu'un élément apparaisse dans le DOM |
| `get_cookies` | `url?: string` | `Cookie[]` | Récupère les cookies (tous ou filtrés par URL) |
| `set_cookie` | `name, value, domain, path?, secure?, httpOnly?` | `void` | Définit un cookie |
| `intercept_network` | `tabId?: string, urlPattern: string, method?: string, action: "log"\|"block"` | `RequestLog[]` | Intercepte les requêtes réseau. v1 : log + block par pattern URL/method uniquement |
| `generate_pdf` | `tabId?: string, format?: "A4"\|"Letter", landscape?: boolean` | `base64 pdf` | Génère un PDF de la page |

---

## 5. Outils — Couche AI Bridge (expérimental)

> **Feature flag** : activé par défaut, désactivable via `DIA_AI_BRIDGE=false`.
> **Graceful degradation** : chaque outil détecte la présence des éléments Dia dans le DOM. Si absents → retourne une erreur explicite `"AI Bridge: Dia UI element not found. This feature requires Dia Browser with AI panel visible."` au lieu de crasher.

### Stratégie de détection

Les outils AI Bridge utilisent **DOM inspection** pour localiser les éléments de l'interface IA de Dia :

- Sélecteurs CSS ciblant les attributs `data-*`, `aria-*`, et classes spécifiques à Dia
- Fallback sur heuristiques (structure DOM, texte des labels) si les sélecteurs changent
- Fichier `selectors.json` centralisé, versionné par version Dia connue, facilement patchable

### Ciblage de l'instance Chat

L'IA Chat de Dia est une UI globale (pas liée à un onglet). Les outils `dia_send_chat` et `dia_get_chat_history` ciblent l'instance Chat de la fenêtre active. Le Chat est ouvert via simulation du raccourci ⌘E si fermé.

### Outils

| Outil | Params | Retour | Description |
|-------|--------|--------|-------------|
| `dia_send_chat` | `message: string, waitForResponse?: boolean, timeout?: number` | `string \| void` | Envoie un message dans le chat IA de Dia (⌘E) et optionnellement attend la réponse |
| `dia_get_chat_history` | `limit?: number` | `ChatMessage[]` | Récupère l'historique de conversation avec l'IA Dia |
| `dia_list_skills` | — | `Skill[]` | Liste les Skills disponibles dans Dia |
| `dia_trigger_skill` | `skillName: string, context?: string` | `string` | Déclenche un Skill Dia sur la page courante |
| `dia_search_memory` | `query: string` | `MemoryResult[]` | Interroge le Search memory de Dia (@Search) |
| `dia_get_tab_context` | `tabId?: string` | `TabContext` | Récupère le contexte enrichi Dia d'un onglet (résumé IA, métadonnées, relations) |

---

## 6. Structure du projet

```
mcp-dia/
├── src/
│   ├── index.ts                 # Entry point, MCP server setup
│   ├── server.ts                # Server configuration, tool registration
│   ├── cdp/
│   │   ├── connection.ts        # CDP Connection Manager (singleton)
│   │   ├── types.ts             # CDP-related type definitions
│   │   └── helpers.ts           # CDP utility functions
│   ├── tools/
│   │   ├── core/
│   │   │   ├── tabs.ts          # list_tabs, open_tab, close_tab, switch_tab
│   │   │   ├── navigation.ts    # navigate, go_back, go_forward, reload_tab
│   │   │   └── content.ts       # get_page_content
│   │   ├── advanced/
│   │   │   ├── screenshot.ts    # screenshot, generate_pdf
│   │   │   ├── interaction.ts   # click_element, fill_input, wait_for_selector
│   │   │   ├── javascript.ts    # evaluate_js
│   │   │   └── network.ts       # get_cookies, set_cookie, intercept_network
│   │   └── ai-bridge/
│   │       ├── chat.ts          # dia_send_chat, dia_get_chat_history
│   │       ├── skills.ts        # dia_list_skills, dia_trigger_skill
│   │       ├── memory.ts        # dia_search_memory
│   │       ├── context.ts       # dia_get_tab_context
│   │       └── selectors.json   # Sélecteurs DOM versionnés par version Dia
│   └── utils/
│       ├── config.ts            # Configuration (env vars, defaults)
│       ├── errors.ts            # Error types (CDPError, AIBridgeError, etc.)
│       └── logger.ts            # Structured logging
├── tests/
│   ├── core/                    # Tests outils Core
│   ├── advanced/                # Tests outils Advanced
│   └── ai-bridge/               # Tests outils AI Bridge
├── package.json
├── tsconfig.json
├── .github/
│   └── workflows/
│       └── ci.yml               # Lint, type-check, tests
├── README.md
├── LICENSE                      # MIT
└── PROJECT.nfo
```

---

## 7. Configuration

| Variable d'env | Défaut | Description |
|----------------|--------|-------------|
| `DIA_CDP_PORT` | `9222` | Port CDP de Dia |
| `DIA_CDP_HOST` | `localhost` | Host CDP |
| `DIA_AI_BRIDGE` | `true` | Active/désactive la couche AI Bridge |
| `DIA_LOG_LEVEL` | `info` | Niveau de log (`debug`, `info`, `warn`, `error`) |
| `DIA_RECONNECT_MAX` | `30000` | Délai max de reconnexion (ms) |

---

## 8. Installation cible

```bash
# Via npx (zero-install)
npx mcp-dia

# Via npm global
npm install -g mcp-dia
mcp-dia

# Dans claude_desktop_config.json
{
  "mcpServers": {
    "dia-browser": {
      "command": "npx",
      "args": ["mcp-dia"]
    }
  }
}
```

Prérequis : lancer Dia avec le flag CDP :
```bash
open -a "Dia" --args --remote-debugging-port=9222
```

---

## 9. Dépendances

| Package | Rôle |
|---------|------|
| `@modelcontextprotocol/sdk` | SDK MCP officiel (server, tool definitions) |
| `chrome-remote-interface` | Client CDP pour Node.js |
| `zod` | Validation des paramètres d'outils |
| `typescript` | dev — compilation |
| `vitest` | dev — tests |
| `tsup` | dev — bundling |
| `@types/node` | dev — types Node.js |

---

## 10. Sécurité

- CDP n'est accessible qu'en `localhost` — pas d'exposition réseau
- `evaluate_js` exécute du code arbitraire : documenter clairement le risque dans le README
- Les cookies et credentials ne sont jamais loggés, même en mode `debug`
- AI Bridge ne transmet aucune donnée hors du canal CDP local
- Pas de stockage persistant côté serveur MCP

---

## 11. Future / Roadmap (out of scope v1)

### Haute priorité (v1.1)

- **Support Windows/Linux** — quand Dia sortira sur ces plateformes
- **Extension Chrome packagée** — si Dia ajoute le support extensions, canal plus stable que CDP pour l'AI Bridge
- **Resources MCP** — exposer les tabs comme resources MCP (URI `dia://tab/{id}`)
- **Prompts MCP** — templates de prompts pré-configurés pour workflows Dia courants

### Moyenne priorité (v1.2+)

- **API interne Dia** — si Dia expose des endpoints documentés, les utiliser au lieu du DOM scraping
- **GUI de configuration** — interface web locale pour configurer le serveur
- **Support multi-navigateur** — abstraire CDP pour supporter Arc, Chrome, Edge
- **Recordings/Macros** — enregistrer et rejouer des séquences d'actions
- **Auth flow helpers** — outils dédiés OAuth/SSO/2FA

### Exploration (v2+)

- **Plugin system** — permettre à des tiers d'ajouter des outils custom
- **Dia Skills marketplace bridge** — créer/publier des Skills Dia depuis le MCP
- **Multi-profile support** — gérer plusieurs profils Dia simultanément
- **WebSocket transport** — en plus de stdio et SSE
- **Streaming responses** — pour les outils AI Bridge (chat en streaming)

---

## 12. Risques identifiés

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Dia update casse les sélecteurs AI Bridge | AI Bridge KO | `selectors.json` versionné, graceful degradation, tests CI contre Dia beta |
| CDP port non ouvert (utilisateur oublie le flag) | Serveur inutilisable | Message d'erreur clair + guide d'installation + helper script |
| Dia bloque CDP dans une future version | Projet entier KO | Peu probable (Chromium standard), surveiller changelogs Dia |
| Nom npm `mcp-dia` déjà pris | Pas de publish | Vérifier disponibilité avant dev |
| Performance CDP sur pages lourdes | Timeouts | Timeouts configurables, retry logic |

# Bitget rVue - Frontend Specification (v1)

> **Status:** Design locked. Step 5 board and report implementation in progress.
> **Governs:** all UI work (landing page, chat desk, rToken board, theme system).
> **Rule:** this document is the source of truth for the frontend. When implementation and this doc disagree, update the doc first, then the code.
> **Read with:** `Bitget_rVue_SDLC.md` (process), `ui-design-skill.md` (visual tokens), `WEB_DESIGN_RULES.md` (quality control), `Bitget_rVue_AI_Trading_Desk_Build_Plan.md` (product intent).

---

## 0. What exists today vs. what this spec adds

**Built and working (do not break):**
- `lib/net/doh.ts`, `lib/market/bitget.ts`, `lib/market/equities.ts` - data layer.
- `lib/analysis/reference.ts` - window-aligned spread/divergence math + flag thresholds.
- `lib/scanner/scan.ts` - Tier-1 market scanner with 60s in-memory cache.
- `lib/evidence/types.ts` - Tier-2 `EvidencePackage` contract.
- `app/api/scan/route.ts` - scan API.
- `app/page.tsx` + `app/globals.css` - single dark divergence board, plain CSS, mono font.

**Built in step 2 (Tier-2 backend, verified live 2026-09-10):**

- `lib/evidence/build.ts` - Evidence Package builder. Reuses `buildDivergenceRow`, so a per-asset report can never disagree with the board.
- `lib/research/news.ts` - 48h news from keyless RSS providers (Google News, Yahoo Finance) with per-provider failure capture.
- `lib/research/onchain.ts` - contract resolution from Bitget coins, plus holder and transfer activity from Blockscout v2 on ArbitrumOne.
- `lib/research/ticker.ts` - single-symbol Bitget ticker fetch, so one asset does not pay for the whole exchange.
- `lib/ai/prompts.ts` - strict system prompt, package compaction, `validateBrief` citation checks, `auditNumbers` anti-fabrication guard.
- `lib/ai/qwen.ts` - Qwen client (OpenAI-compatible chat completions), env-configured, fails loudly when unconfigured.
- `lib/format.ts`, `lib/net/http.ts` - shared formatters, and text/POST fetch over the existing DoH agent.
- `app/api/research/route.ts` - Tier-2 research endpoint.
- `.env.example` - every supported variable, with the honesty behaviour documented inline.

**Added by this spec:**
- Three distinct surfaces: marketing landing, AI chat desk, rToken board/report.
- A two-theme token system (light + dark) with no-flash switching.
- A liquid glass material layer, constrained to chrome only.
- An app shell with a persistent sidebar (new chat, recent chats, rToken board).
- Local conversation persistence and the chat/evidence API contracts for the backend step.

---

## 1. Surfaces

| ID | Surface | Routes | Chrome | Purpose |
|----|---------|--------|--------|---------|
| S1 | Landing | `/` | Glass top nav + footer | Explain the product precisely, convert to the desk |
| S2 | Chat desk | `/chat`, `/chat/[id]` | App shell (sidebar + topbar) | Conversational research over an Evidence Package |
| S3 | rToken board | `/rtokens`, `/rtokens/[rToken]` | App shell | List + report of every live rToken |
| S4 | Privacy | `/privacy` | Minimal | Honest statement of what is stored and sent |

**Chrome split:** S1 is standalone (no sidebar). S2 and S3 share the app shell so navigation between "ask about an asset" and "scan all assets" is one click.

---

## 2. Route map

| Route | File | Rendering | Data source | Status |
|-------|------|-----------|-------------|--------|
| `/` | `app/(marketing)/page.tsx` | Server + client islands | `GET /api/scan?limit=5` | New |
| `/privacy` | `app/(marketing)/privacy/page.tsx` | Server | none | New |
| `/chat` | `app/(desk)/chat/page.tsx` | Client | local store + `POST /api/chat` | New |
| `/chat/[id]` | `app/(desk)/chat/[id]/page.tsx` | Client | local store + `POST /api/chat` | New |
| `/rtokens` | `app/(desk)/rtokens/page.tsx` | Client | `GET /api/scan` | Port of current `app/page.tsx` |
| `/rtokens/[rToken]` | `app/(desk)/rtokens/[rToken]/page.tsx` | Client | `GET /api/asset/[rToken]` | New (Tier 2) |
| shell | `app/(desk)/layout.tsx` | Server | none | New |
| root | `app/layout.tsx` | Server | none | Update |

**Migration note:** moving `/` into the `(marketing)` route group requires deleting the old `app/page.tsx`; Next.js will error on two pages resolving to `/`. The current board's markup and its `fmt*` helpers move to `/rtokens` and `lib/format.ts` respectively.

---

## 3. App shell and navigation

### 3.1 Sidebar (`w-64`, collapsible to `w-14` icon rail)

Top to bottom:
1. **Brand row** - logo mark + `Bitget rVue` wordmark; click returns to `/rtokens`.
2. **New chat** - primary action, full width, `rounded-lg`, keyboard `Ctrl/Cmd+Shift+O`. Navigates to `/chat` with a fresh conversation id.
3. **Search** - `Ctrl/Cmd+K` opens the command palette (rTokens + conversations + nav).
4. **rToken board** - nav item to `/rtokens`, with a live `flagged` count badge when a scan is cached.
5. **Recent chats** - scrollable list, grouped `Today` / `Previous 7 days` / `Older`. Each row: title (single line, ellipsized), pinned rToken ticker in mono if present, relative `updatedAt`. Row hover reveals rename + delete (icon buttons, never emoji).
6. **Footer** - theme toggle, privacy link, data-source line.

Behavior:
- Active route gets `aria-current="page"` and a subtle surface tint, not a color shift.
- Empty state for recent chats: one muted line - "No conversations yet." No illustration padding.
- `< 1024px`: sidebar becomes an overlay drawer, opened from the topbar, closed on `Esc` and on navigation. Focus is trapped while open.
- Persistence of collapsed state: `localStorage` key `rvue.sidebar`.

### 3.2 Topbar (`h-14`)

- Left: drawer toggle (small screens), breadcrumb or asset context (`rTSLA` in mono + `TSLA` muted).
- Center-right: **market state pill** for the pinned asset (`PRE` / `REGULAR` / `POST` / `CLOSED` / `NO_DATA`).
- Right: **data freshness** (`generated 14:32:07` + relative age), rescan button (board only), theme toggle.
- The topbar is glass; the content below it is not.

### 3.3 Keyboard map

| Keys | Action |
|------|--------|
| `Ctrl/Cmd+K` | Command palette |
| `Ctrl/Cmd+Shift+O` | New chat |
| `Ctrl/Cmd+B` | Toggle sidebar |
| `Enter` / `Shift+Enter` | Send / newline in composer |
| `Esc` | Close palette, drawer, evidence rail |
| `/` | Focus board filter (when board is active and no input focused) |

---

## 4. Theme system (light + dark)

### 4.1 Mechanism

- Attribute `data-theme="light" | "dark"` on `<html>`; every color is a CSS custom property.
- Resolution order: explicit user choice (`localStorage` `rvue.theme`) -> `prefers-color-scheme` -> `dark`.
- **No flash:** a blocking inline script in `app/layout.tsx` `<head>` sets the attribute before first paint. The `ThemeProvider` (`lib/ui/theme.tsx`) then hydrates from the same source; it never writes a different value on mount.
- Hand-rolled, ~40 lines, **no new dependency**. (`next-themes` is acceptable only if it replaces the inline script cleanly; not required.)
- Toggle is a two-state button with a visible label (`Light` / `Dark`), not an icon-only guess.

### 4.2 Tokens

`app/globals.css` is the authoritative hex source. Docs reference token names.

| Token | Dark | Light | Used for |
|-------|------|-------|----------|
| `--bg` | `#080A0A` | `#F6F7F9` | Page canvas (never pure black/white) |
| `--ambient-a` | `rgba(94,106,210,0.20)` | `rgba(94,106,210,0.12)` | Background mesh tint 1 |
| `--ambient-b` | `rgba(76,183,130,0.12)` | `rgba(76,183,130,0.10)` | Background mesh tint 2 |
| `--surface` | `#121417` | `#FCFCFD` | Opaque cards, tables, code blocks |
| `--surface-raised` | `#1A1C20` | `#FFFFFF` | Hover, dropdown rows |
| `--glass-bg` | `rgba(18,20,23,0.62)` | `rgba(255,255,255,0.62)` | Glass fill |
| `--glass-border` | `rgba(255,255,255,0.10)` | `rgba(15,18,22,0.10)` | Glass edge |
| `--glass-highlight` | `rgba(255,255,255,0.16)` | `rgba(255,255,255,0.85)` | Top specular rim |
| `--glass-shadow` | `0 8px 32px rgba(0,0,0,0.45)` | `0 8px 28px rgba(15,18,22,0.10)` | Elevation |
| `--border` | `#1F2227` | `rgba(15,18,22,0.10)` | Hairline separators |
| `--text` | `#F7F8F8` | `#14171A` | Headings, active data |
| `--muted` | `#8A8F98` | `#5C6470` | Prose, labels, table headers |
| `--tertiary` | `#6B7078` | `#8A929C` | Timestamps, empty states, disabled |
| `--accent` | `#5E6AD2` | `#4A55C0` | Focus, active tabs, primary buttons |
| `--accent-hover` | `#6E7AE0` | `#3F49A8` | Primary hover |
| `--accent-contrast` | `#FFFFFF` | `#FFFFFF` | Text on accent |
| `--positive` | `#4CB782` | `#1F8A5A` | Premium, confirmation |
| `--negative` | `#EB5757` | `#C43C3C` | Discount, error |
| `--warning` | `#F0B429` | `#9A6B00` | Divergence, unusual volume |

Rules:
- Status colors are **theme-specific**, not shared. Light mode needs lower luminance / higher chroma to hold contrast on white.
- All prices, percentages, pp values, volumes, block heights, and timestamps use `--mono`. No exceptions.
- Never hardcode a hex value inside a component. If a token is missing, add it to the table and to `globals.css`.
- Both themes must pass contrast checks (section 11) independently. Light mode is a first-class theme, not an inverted afterthought.

### 4.3 Typography

- `--sans`: system UI stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif`) for prose and UI.
- `--mono`: `JetBrains Mono` if present locally, else the existing fallback stack, for all data.
- **No `next/font/google`.** It fetches at build time and will break offline/sandboxed builds. If custom fonts are wanted later, vendor the `woff2` files and load them with `next/font/local`.
- Weights: 600 headings, 500 labels, 400 data. Sizes: 13px base (existing), 12px dense tables, 11px uppercase micro-labels with `0.06em` tracking.

---

## 5. Liquid glass material

### 5.1 Where glass is allowed

Sidebar, topbar, command palette, chat composer, floating landing cards, modals, toasts, sticky action bars.

### 5.2 Where glass is forbidden

Dense data tables, evidence/code blocks, long-form research prose, form inputs that hold user text. These use opaque `--surface`. Legibility of financial data outranks the material effect.

### 5.3 Recipe

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
}
```

Three tiers, no others:

| Tier | Blur | Use |
|------|------|-----|
| `glass-1` | `blur(16px) saturate(160%)` | Persistent chrome (sidebar, topbar) |
| `glass-2` | `blur(24px) saturate(180%)` | Floating panels, composer, cards |
| `glass-3` | `blur(32px) saturate(200%)` + stronger scrim | Modals, command palette |

### 5.4 Ambient background

Glass needs something to refract. A fixed layer behind all content (`z-index: -1`, `pointer-events: none`) carries:
- two or three large, low-frequency radial gradients using `--ambient-a` / `--ambient-b` over `--bg`;
- an optional fine grain at 2-3% opacity to prevent banding;
- **no motion faster than a ~40s drift**, and none at all under `prefers-reduced-motion`.

This is a desaturated brand-tint wash, not a purple/blue hero gradient (see `WEB_DESIGN_RULES.md` rule 1). The indigo is the existing brand accent at low alpha, used for depth rather than decoration.

### 5.5 Radii and shape

- Inner elements (badges, buttons, inputs): `8px`.
- Cards and panels: `12-16px`.
- Floating chrome (palette, modal, composer): `20-24px`.
- **Not everything is a pill.** Full rounding is reserved for the theme toggle and icon-only buttons. Primary buttons use `8px` (`WEB_DESIGN_RULES.md` rule 6).

### 5.6 Fallbacks (mandatory)

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--surface); box-shadow: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .glass { background: var(--surface); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
```

### 5.7 Performance

- At most 4 simultaneous `backdrop-filter` layers in the viewport.
- Never apply it to a scrolling table body or to any element repainting per frame (streaming text, animated counters).
- Blur radius does not scale with element size; do not use `blur(60px)+` to "make it nicer".

---

## 6. S1 - Landing page (`/`)

Section order and content intent. Copy must be specific to rTokens; no generic AI landing-page filler (`WEB_DESIGN_RULES.md` rules 2, 13).

1. **Glass top nav** - logo + wordmark, anchors (`How it works`, `Evidence`, `Board`), theme toggle, primary CTA `Open the desk`.
2. **Hero** - headline states the actual problem:
   - H1: `rTokens never close. Their underlying stocks do.`
   - Sub: `Bitget rVue compares every live rToken on Bitget against its U.S. underlying, anchored to the previous official close, then explains the divergence with sourced evidence.`
   - Primary CTA `Open the research desk` -> `/chat`. Secondary `See the divergence board` -> `/rtokens`.
   - **Live stat strip** from `GET /api/scan?limit=1`: universe count, flagged count, scan duration, generated time. Real values only. If the request fails, render `Live data unavailable` - never a cached or invented number (rules 3, 4).
3. **The problem** - the 24/7 vs. market-hours mismatch, using the worked example from the build plan section 2 (native stock closed +0.8% Friday, rToken +3.1% Saturday, +2.3pp premium).
4. **How it works** - four glass cards: `Fetch` (Bitget v2 + Yahoo v8) -> `Align` (both sides measured against the previous official close) -> `Compute` (spread, divergence, thresholds in TypeScript) -> `Interpret` (Qwen reasons over the Evidence Package only).
5. **Evidence discipline** - one real example per kind: `FACT`, `COMPUTED`, `INTERPRETATION`, `UNKNOWN`. This is the differentiator and gets its own section.
6. **The guarantee** - `Code calculates. AI interprets.` plus the explicit not-doing list: no autonomous trading, no AI-generated numbers, no fabricated accuracy, and the system is allowed to answer "nothing significant".
7. **Board preview** - top 5 flagged rows from `/api/scan`, mono numerics, labeled with scan time, linking to `/rtokens`. Empty result renders "No flagged divergence in the latest scan", which is a legitimate outcome.
8. **Footer** - privacy link, data sources (Bitget public API v2, Yahoo Finance v8 chart, Qwen via the Bitget hackathon endpoint), `Not investment advice`, and an AI-generated-content disclosure (rule 11).

Banned on this page: testimonials, invented metrics, stock AI imagery, cursor animations, scroll-triggered reveals on every section (rule 5, 14). One restrained entrance for the hero is the maximum.

---

## 7. S2 - Chat desk (`/chat`, `/chat/[id]`)

### 7.1 Layout

`sidebar | conversation column (max-w 760px) | evidence rail (w-80, collapsible, >= 1280px only)`.

### 7.2 Empty state

- Greeting that names the capability, not a generic "How can I help?".
- **Asset pin**: pick an rToken to scope the conversation; the pinned ticker shows in the topbar and is sent with every request.
- Three suggested prompts, all answerable from the Evidence Package:
  - `Why is rTSLA diverging from Tesla's last official close?`
  - `Compare rNVDA's 24h move with the underlying session.`
  - `What changed for rAAPL in the last 48 hours, and how confident are we?`

### 7.3 Message rendering

- **User**: right-aligned, `--surface-raised`, `12-16px` radius, max-w 80%.
- **Assistant**: full-width prose block, no bubble (long research text reads worse in bubbles). Left accent hairline only.
- Streaming: text appends incrementally with a caret; `aria-live="polite"` on the container; `Stop` button while streaming; `Regenerate` and `Copy` after.
- **Citations**: the model emits markers like `[1]` that map to `EvidenceItem.id`. Rendered as small mono chips. Clicking opens the evidence rail at that item. A citation that does not resolve to a real item renders as a broken-reference warning, never silently dropped.
- **Numbers panel**: under each assistant answer, a compact table of the exact figures used, taken from the Evidence Package - not parsed out of the model's text.
- **Freshness**: every answer carries `data as of <timestamp>` from `EvidencePackage.generatedAt`, plus per-source ages.
- **No-signal answer** is valid and must render normally: `No significant divergence detected.`

### 7.4 Composer

Glass (`glass-2`), autosizing textarea (1-8 rows), `Enter` sends / `Shift+Enter` newline, disabled while streaming, shows the pinned rToken as a removable chip, and surfaces the last error inline with a `Retry`.

### 7.5 States

| State | Rendering |
|-------|-----------|
| Loading evidence | Skeleton + honest progress line: `Fetching Bitget tickers and Yahoo quotes for rTSLA...` |
| Streaming | Caret, `Stop`, auto-scroll only if the user is already at the bottom |
| Error | Inline banner with the API error code, `Retry`, and the partially streamed text preserved |
| Stale | Amber note when `generatedAt` is older than the scan TTL (60s) |
| Missing data | `Data unavailable` for that field; on-chain/news stay `PENDING` until the backend fills them |

### 7.6 Conversation lifecycle

- New conversation gets an id immediately (`crypto.randomUUID()`), so the URL is stable at `/chat/[id]` from the first message.
- Title: derived from the first user message (first 6 words, ellipsized), overridden by the pinned asset (`rTSLA - divergence`), user-renamable.
- Deleted conversations are removed from local storage immediately, with a 5s undo toast.

---

## 8. S3 - rToken board and report

### 8.1 `/rtokens` (port of the current board)

Keep, unchanged in meaning:
- Summary chips: `universe`, `with equity data`, `flagged`, `no equity data`, `suspect pairing`, `scan time`, `generated`.
- Sort: `|divergence|` desc, tie-break 24h USDT volume.
- Columns: rToken, Stock, rLast, r24h, Stock, State, Anchor, sChg, rChg(a), Divergence, Spread, 24h Vol, Age.
- Pagination: `PAGE_SIZE = 150` with `Show more (N remaining)`.

Add:
- **Filter bar**: text search (matches rToken / ticker / pair), status filter, market-state filter, `Flagged only` toggle, instrument-type filter. Filters are client-side over the cached scan.
- **Column sorting** on any numeric column, with a visible direction indicator.
- **Row click** -> `/rtokens/[rToken]`. **Row action** `Research` -> `/chat?rToken=<rToken>` (pins the asset and starts a conversation).
- Sticky header, sticky first column under horizontal scroll at narrow widths.
- Flagged rows: 2px left accent bar in `--warning` plus a faint tint. Not a full-color row.
- Missing/suspect rows: muted, with the reason visible on hover and in the row's status cell.

Footer honesty notes carried over verbatim from the current page:
- `rChg(a)` = rToken change aligned to the underlying previous official close (session anchor).
- Divergence = aligned rToken change - stock session change, in percentage points.
- Flag thresholds: EQUITY +/-0.75pp, ETF +/-0.50pp. Rows without equity data are shown honestly as missing.
- Suspect pairing = `|spread| >= 50%`, quarantined as a symbol-matching error rather than a divergence.
- 24h volume is Bitget-reported and implausibly large versus underlying market volume - relative liquidity ordering only, not an absolute signal.

The table is **opaque**, never glass.

### 8.2 `/rtokens/[rToken]` (per-asset report, Tier 2)

1. **Header** - rToken (mono, large) + underlying ticker + name, instrument type, exchange, pair symbol, contract/chain info from `getRTokenCoins()` when available.
2. **Metric grid** - 6 compact cards: rToken price, rToken 24h, underlying price + market state, session anchor, spread %, divergence pp vs. threshold, 24h volume, bid/ask, data age per source.
3. **Research brief** - Qwen output, rendered with the same citation + numbers-panel treatment as chat.
4. **Evidence package viewer** - collapsible raw JSON, syntax-tinted, with `Copy JSON`. Every item shows its `kind` badge, `source`, `observedAt`, `value`/`unit`.
5. **Gaps** - explicit list from `EvidencePackage.gaps`. While `onchain.status === "PENDING"`, render `On-chain data not yet integrated` rather than an empty section.
6. **Actions** - `Open in chat`, `Rescan this asset`, `Copy evidence JSON`.
7. Unknown rToken -> honest 404 with a link back to `/rtokens`.

---

## 9. Data contracts (frontend <-> backend)

### 9.1 Built and verified

**`GET /api/scan?force=1&limit=N`** -> `ScanSummary` (`lib/scanner/scan.ts`). Cached 60s server-side; the UI must not poll faster than that.

**`GET | POST /api/research`** -> Tier-2 deep research (`app/api/research/route.ts`). Verified live on 2026-09-10 against Bitget, Yahoo, Blockscout and RSS providers.

Request (POST JSON body, or GET query params with the same names):

```ts
interface ResearchRequest {
  rToken: string;          // required, must match /^[A-Za-z0-9.-]{1,24}$/
  question?: string;       // optional, truncated to 600 chars
  packageOnly?: boolean;   // return the Evidence Package without calling the model
  force?: boolean;         // bypass the 60s package cache
  newsEnabled?: boolean;   // false skips the collector -> news.status = PENDING
  onchainEnabled?: boolean;
}
```

Response `200`:

```ts
interface ResearchResponse {
  rToken: string;
  package: EvidencePackage;      // every number the UI renders comes from here
  brief: ResearchBrief | null;   // null when packageOnly, or when the model is unavailable
  warnings: string[];            // citation and number-audit findings, never dropped
  model: { configured: boolean; name: string; durationMs: number | null; usage: {...} | null } | null;
  generatedAt: number;
}

interface ResearchBrief {
  summary: string;
  signal: "CONFIRMATION" | "DIVERGENCE" | "NO_SIGNAL" | "INSUFFICIENT_EVIDENCE";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  whatChanged: string[];    // WHAT CHANGED
  whyItMatters: string[];   // WHY IT MATTERS
  uncertainty: string[];    // UNCERTAINTY, never empty
  claims: Array<{ id: string; kind: ClaimKind; statement: string; evidenceIds: string[]; unverified: boolean }>;
}
```

Errors, each with a machine-readable `error` code and a human `detail`:

| Status | `error` | Meaning |
|--------|---------|---------|
| 400 | `bad_request` | Missing `rToken`, or a malformed JSON body |
| 400 | `invalid_rtoken` | `rToken` failed the charset guard |
| 404 | `unknown_rtoken` | Not in the live Bitget rToken universe |
| 422 | `no_token_data` | Bitget returned no usable last price |
| 422 | `no_equity_data` | Yahoo returned no quote, so no window-aligned comparison exists |
| 503 | `model_not_configured` | `QWEN_API_KEY` unset; the Evidence Package is still returned |
| 502 | `model_http_error`, `model_empty_response`, `model_invalid_json`, `brief_validation_failed` | Model or validation failure; package still returned |
| 504 | `model_timeout` | Model exceeded `QWEN_TIMEOUT_MS` |
| 500 | `research_failed` | Unexpected |

**UI rule:** a 503 or 502 from `/api/research` is a partial success, not a blank screen. Render the deterministic package in full, show the brief region as `Research brief unavailable` with the returned reason, and never substitute placeholder prose or cached copy.

**Evidence Package status values.** `onchain.status` and `news.status` are `OK | UNAVAILABLE | PENDING`. `OK` with an empty item set means "searched, found nothing" and is a real finding; `UNAVAILABLE` means the collector failed and the reason is in `note` / `providersFailed`; `PENDING` means it was skipped. The UI must render all three distinctly.

### 9.2 Still to build

**`GET /api/asset/[rToken]`** - optional thin wrapper returning just the package half of `/api/research?packageOnly=1`. The report page may call `/api/research` directly instead.

**`POST /api/chat`** -> `text/event-stream`, reusing `lib/ai/qwen.ts` and `lib/ai/prompts.ts` unchanged so chat and one-shot research can never drift apart.

```ts
interface ChatRequest {
  conversationId: string;
  rToken?: string;      // pins the Evidence Package scope
  message: string;
}
```

| SSE event | Payload | Meaning |
|-----------|---------|---------|
| `evidence` | `{ package: EvidencePackage }` | Sent first, before any token |
| `token` | `{ delta: string }` | Incremental assistant text |
| `done` | `{ messageId, warnings: string[] }` | Stream complete |
| `error` | `{ code, message }` | Recoverable failure; UI shows `Retry` |

Contract rules, already enforced by `/api/research` and inherited by chat:
- The model receives only the compacted Evidence Package plus the user message (`compactPackageForModel`): snapshots, aggregates and tagged evidence items, never raw transfer dumps or API payloads. It performs no arithmetic.
- Every numeric value rendered in the UI comes from `package.evidence`, never from parsing model text.
- Citations must reference an `EvidenceItem.id` that exists. `validateBrief` checks this and emits `UNRESOLVED_CITATION` and `UNCITED_CLAIM` warnings; offending claims are flagged `unverified: true` rather than silently dropped.
- `auditNumbers` flags any unit-bearing number in the prose (`%`, `pp`, `USDT`, `USD`, holders, transfers, addresses, tokens) that does not match a package value within display rounding, as `UNVERIFIED_NUMBER`.
- `OVERCONFIDENT` is emitted when HIGH confidence is returned despite material gaps; `SIGNAL_MISMATCH` when the brief claims DIVERGENCE but the deterministic engine did not flag the asset.
- If no asset is pinned and none can be resolved from the message, the backend asks a clarifying question instead of guessing.

### 9.3 Local persistence contract

`lib/chat/types.ts`:

```ts
type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status: "streaming" | "complete" | "error";
  evidenceIds?: string[];
  errorCode?: string;
}

interface Conversation {
  id: string;
  title: string;
  rToken: string | null;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}
```

`lib/chat/store.ts` (browser only, guarded against SSR access):
`listConversations()`, `getConversation(id)`, `createConversation(partial)`, `upsertConversation(conv)`, `renameConversation(id, title)`, `deleteConversation(id)`, `appendMessage(convId, msg)`, `patchMessage(convId, msgId, patch)`.

Keys: `rvue.chats.v1` (versioned so the shape can migrate), `rvue.theme`, `rvue.sidebar`. Storage failure (private mode, quota) degrades to in-memory with a one-time notice; the app must not crash.

---

## 10. Component and module inventory

| Path | Responsibility | Status |
|------|----------------|--------|
| `app/layout.tsx` | Metadata, no-flash theme script, ambient layer, font stacks | Update |
| `app/globals.css` | Authoritative tokens for both themes, glass utilities, base styles | Update |
| `app/icon.svg` | Favicon; swap for the real logo when delivered | Update |
| `app/(marketing)/layout.tsx` | Landing chrome (glass nav + footer) | New |
| `app/(marketing)/page.tsx` | Landing sections | New |
| `app/(marketing)/privacy/page.tsx` | Privacy statement | New |
| `app/(desk)/layout.tsx` | App shell (sidebar + topbar + palette) | New |
| `app/(desk)/chat/page.tsx` | New conversation | New |
| `app/(desk)/chat/[id]/page.tsx` | Existing conversation | New |
| `app/(desk)/rtokens/page.tsx` | Board | Port |
| `app/(desk)/rtokens/[rToken]/page.tsx` | Per-asset report | New |
| `components/shell/{AppShell,Sidebar,RecentChats,Topbar,CommandPalette,ThemeToggle}.tsx` | Navigation | New |
| `components/ui/{GlassPanel,Button,Badge,Pill,MetricCard,DataTable,Skeleton,EmptyState,ErrorState,Toast,Icon}.tsx` | Primitives | New |
| `components/chat/{ConversationView,MessageList,MessageItem,Composer,EvidenceRail,EvidenceChip,NumbersPanel,SuggestedPrompts}.tsx` | Chat desk | New |
| `components/board/{SummaryChips,FilterBar,DivergenceTable,RowActions}.tsx` | Board | New |
| `components/landing/{Hero,ProblemSection,Pipeline,EvidenceDiscipline,Guarantees,BoardPreview}.tsx` | Landing | New |
| `lib/ui/theme.tsx` | Theme provider + hook | New |
| `lib/chat/{types.ts,store.ts,client.ts}` | Conversation model, storage, SSE client | New |
| `lib/format.ts` | `fmtPct`, `fmtPp`, `fmtPrice`, `fmtVolume`, `fmtAge`, `signClass` extracted from `app/page.tsx` | Refactor |
| `lib/api/client.ts` | Typed fetch wrappers for `/api/scan`, `/api/asset`, `/api/chat` | New |

---

## 11. Accessibility and quality gates

- **Contrast** in both themes: body text >= 4.5:1, large text and UI borders >= 3:1. Measured on glass over the *worst-case* ambient position, not over a flat background.
- **Focus**: 2px `--accent` ring with offset on every interactive element, visible in both themes, never suppressed. Full keyboard reachability for sidebar, palette, table rows, composer, evidence rail.
- **Landmarks/ARIA**: `nav`, `aside`, `main`; `aria-current="page"` on active nav; `aria-live="polite"` on streaming text; `role="dialog"` + `aria-modal` on the palette and drawer; `aria-expanded` on every collapsible; tables use real `<th scope>` and a `<caption>` (visually hidden is fine).
- **Motion**: honor `prefers-reduced-motion`. Everything must be fully usable with animation off.
- **Transparency**: honor `prefers-reduced-transparency` (section 5.6).
- **Icons**: one system only - `lucide-react`, wrapped by `components/ui/Icon.tsx` so the set stays swappable. Never emoji (`WEB_DESIGN_RULES.md` rule 7).
- **Responsive**: >= 1440 three columns; 1024-1439 two columns with the rail collapsed; 768-1023 sidebar as overlay; < 768 drawer + stacked metric cards + horizontally scrollable table with a sticky first column.
- **Favicon/logo**: `app/icon.svg` today. When the user delivers the logo, provide SVG plus a 512px PNG, and a light and a dark variant; wire `app/icon.svg`, `app/apple-icon.png`, and a minimal `app/manifest.ts` (rule 8).
- **No fabricated data**: every number traces to an API response. Placeholders must read as placeholders (rules 3, 4).
- **Honest degradation**: any unavailable field renders `Data unavailable`, never `0`, never `-` where a distinction matters, and never a crash.

---

## 12. Dependencies and performance budget

**New dependencies (proposed, need sign-off):**
- `tailwindcss` v4 + `@tailwindcss/postcss` - utility layer over the token system. v4 is CSS-first (`@theme` in `globals.css`), so there is no `tailwind.config.js` and the tokens in section 4.2 stay the single source of truth. Existing hand-written classes are migrated incrementally; the board is ported first because it is already class-based.
- `lucide-react` - the icon set.

Nothing else without approval. No state-management library (React state + a small store module is enough), no animation library, no component library, no `next/font/google`.

**Budgets:**
- Landing LCP < 2.5s on fast 4G; no `backdrop-filter` on the LCP element.
- Board renders 150 rows without jank; if it does not, virtualize rather than reduce the page size.
- `/api/scan` is not called more often than its 60s TTL; auto-refresh (if added) uses `force=0` at >= 60s intervals.
- Client bundle stays lean: the desk does not ship landing-only code and vice versa (route groups already separate them).

---

## 13. Build order (one step at a time)

| Step | Scope | Verification |
|------|-------|--------------|
| 1 | **Docs** - this spec plus updates to `ui-design-skill.md`, `Bitget_rVue_SDLC.md`, the build plan, `README.md`, `AGENTS.md` | Docs consistent, no code changes |
| 2 | **Backend + AI reasoning** - done except the model key. Evidence Package builder, news + on-chain collectors, `/api/research`, strict prompt, citation and number auditing all landed. Remaining: set `QWEN_API_KEY`, then add `POST /api/chat` streaming on the same client | `npm run typecheck`, `npm run build`, `npm run smoke:research -- rTSLA --verify-scan`, live route probes - all green |
| 3 | **Design foundation** - both theme token sets, glass utilities, ambient layer, `ThemeProvider` + no-flash script, `lib/format.ts` extraction | Theme toggles with no flash; board still renders - **done** (tokens/glass/ambient in `app/globals.css`, provider+toggle in `lib/ui/theme.tsx`, no-flash + ambient in `app/layout.tsx`; verified live) |
| 4 | **App shell** - route groups, sidebar, topbar, command palette, drawer, keyboard map | Done: `/rtokens` is reachable through the shell; the old `app/page.tsx` is removed; desktop collapse, mobile drawer, focus trap, keyboard map, route-aware topbar, and command palette are implemented and build-verified. |
| 5 | **Board + report** - port the board with filters/sort/row actions, then the per-asset report | Board matches current numbers exactly; report renders gaps honestly |
| 6 | **Chat desk** - empty state, streaming, citations, evidence rail, numbers panel, local persistence | A full conversation survives reload; citations resolve |
| 7 | **Landing** - all sections with live scan data | No invented numbers; hero copy specific; CTA paths work |
| 8 | **QA + demo prep** - contrast in both themes, reduced motion/transparency, responsive sweep, empty/error/stale states, demo script | `npm run typecheck` && `npm run build`; checklist in section 11 all green |

Each step ends with a working app. No step lands half of a contract.

---

## 14. Open decisions for the user

1. **Tailwind v4** - **adopted** (CSS-first; `@theme inline` in `app/globals.css` maps utilities onto the token variables, wired via `postcss.config.mjs`). The hand-written-CSS-only alternative is retired; bespoke glass/ambient remains a small custom-CSS layer.
2. **`lucide-react`** - recommended for a consistent icon set.
3. **Logo assets** - **received + applied.** Monogram package in `Bitget_rVue_Br_monogram_package/` (B+r mark, cyan `#00F0FF` on graphite `#080A0A`). SVG master reconstructed from the design spec; favicon set generated via `sharp`: `app/icon.svg`, `app/apple-icon.png` (180), `public/icon-192.png` / `icon-512.png`, `app/manifest.ts`, and light/dark `theme-color`. `--brand` token added for the mark. Hero usage lands with the landing page (step 7).
4. **Chat persistence** - local-only for the demo (recommended), or a server store now. Server storage moves privacy obligations from "nothing leaves the browser except the prompt" to a real data-handling statement.
5. **Deploy target and domain** - Vercel is the assumed host (`WEB_DESIGN_RULES.md` rule 10).
6. **Qwen endpoint + key** - the only remaining blocker for the research brief. `lib/ai/qwen.ts` already speaks OpenAI-compatible chat completions and reads `QWEN_API_KEY`, `QWEN_BASE_URL` and `QWEN_MODEL` (see `.env.example`). The official Bitget hackathon endpoint is `https://hackathon.bitgetops.com/v1` with model `qwen3.8-max` (already the defaults); it speaks OpenAI-compatible chat completions, so no client change was needed. Set `QWEN_RESPONSE_FORMAT=0` if it rejects `response_format: { type: "json_object" }`. Until a key exists, `/api/research` returns 503 with the full deterministic package, which is enough to build and test every frontend screen.

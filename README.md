# Bitget rVue - rToken Research Desk

AI research desk for tokenized U.S. stocks (rTokens) on Bitget.
Core question: "What's happening with this rToken right now, and does it agree with the underlying stock?"

Principle: **code calculates, AI interprets.** All numbers are deterministic TypeScript; the AI layer (Qwen) only reasons over a structured Evidence Package and never does math.

## Scope (two tiers)

1. **Tier 1 - Market-wide divergence scanner (deterministic, no LLM).** Compares every live rToken (~705 rXXX/USDT spot pairs) against its native U.S. underlying, anchored to the previous official close.
2. **Tier 2 - Deep research brief (per asset).** Evidence Package (market + on-chain + news) synthesized by Qwen into a sourced research brief with FACT / COMPUTED / INTERPRETATION / UNKNOWN discipline. (Build phases 4-6.)

## Surfaces

| Surface | Route | State |
|---------|-------|-------|
| Landing page (liquid glass) | `/` | Spec'd |
| AI chat desk | `/chat`, `/chat/[id]` | Spec'd |
| rToken board (list of all rTokens) | `/rtokens` | Spec'd; currently served at `/` |
| rToken report (per asset, Tier 2) | `/rtokens/[rToken]` | Spec'd |
| Privacy | `/privacy` | Spec'd |

Both a **light** and a **dark** theme are supported, switched without a flash of the wrong theme. Glass is used for chrome (sidebar, topbar, composer, palette); data tables and evidence blocks stay opaque so numbers remain legible.

## Quickstart

    npm install
    copy .env.example .env     # add QWEN_API_KEY for research briefs; all other vars are optional
    npm run check:model        # verify the Qwen key, endpoint and model in isolation
    npm run smoke              # Tier-1: live scanner test (Bitget + Yahoo)
    npm run smoke:research -- rTSLA               # Tier-2: Evidence Package for one asset
    npm run smoke:research -- rTSLA --verify-scan # also cross-check against Tier-1 math
    npm run dev                # http://localhost:3000
    npm run typecheck
    npm run build

Without a model key the research endpoint still returns the full deterministic Evidence Package and reports `503 model_not_configured` for the brief. It never invents one.

## Docs (read in this order)

| Doc | Role |
|-----|------|
| `AGENTS.md` | Working rules for AI sessions; start here |
| `Bitget_rVue_AI_Trading_Desk_Build_Plan.md` | Why - product intent, scope, evidence discipline |
| `Bitget_rVue_Frontend_Spec.md` | What the UI is - routes, shell, themes, glass, contracts, build order |
| `ui-design-skill.md` | How it looks - tokens, material, components, motion |
| `WEB_DESIGN_RULES.md` | Quality control checklist |
| `Bitget_rVue_SDLC.md` | How we work - phases, gates, definition of done, phase tracker |

## Layout

**Backend (built):**

- `lib/net/doh.ts` - DNS-over-HTTPS HTTP client (local DNS blocks exchange/crypto domains)
- `lib/market/bitget.ts` - Bitget v2 spot wrappers (rTokens identified by `areaSymbol`/`areaCoin`)
- `lib/market/equities.ts` - Yahoo Finance v8 chart wrapper (previous close, trading periods, cache)
- `lib/analysis/reference.ts` - window-aligned spread/divergence math + flag thresholds
- `lib/scanner/scan.ts` - Tier-1 market scanner
- `lib/evidence/types.ts` - Evidence Package contract (Tier 2)
- `app/api/scan/route.ts` - scan API
- `scripts/smoke.ts` - live end-to-end check

**Tier-2 research pipeline (built, verified live 2026-09-10):**

- `lib/evidence/build.ts` - Evidence Package builder; reuses `buildDivergenceRow` so a report can never disagree with the board
- `lib/research/news.ts` - 48h news from keyless RSS providers (Google News, Yahoo Finance), per-provider failure capture
- `lib/research/onchain.ts` - Bitget contract resolution + Blockscout v2 holder/transfer activity on ArbitrumOne
- `lib/research/ticker.ts` - single-symbol Bitget ticker fetch
- `lib/ai/prompts.ts` - strict system prompt, package compaction, citation validation, number auditing
- `lib/ai/qwen.ts` - Qwen client (OpenAI-compatible chat completions), env-configured
- `lib/format.ts`, `lib/net/http.ts` - shared formatters; text/POST fetch over the existing DoH agent
- `app/api/research/route.ts` - Tier-2 research endpoint (`GET` and `POST`)
- `scripts/research-smoke.ts` - Tier-2 verification, with an optional Tier-1 cross-check
- `scripts/check-model.ts` - isolated credential/endpoint check, with failure-specific advice
- `lib/env.ts` - `.env` loader for the tsx scripts (Next.js loads it natively; tsx does not)
- `.env.example` - every supported variable

**Frontend (current):**

- `app/layout.tsx`, `app/globals.css`, `app/icon.svg`
- `app/page.tsx` - divergence board UI (moves to `/rtokens` in build step 4)

**Planned (see `Bitget_rVue_Frontend_Spec.md` section 10 for the full inventory):**

- `app/(marketing)/` - landing + privacy
- `app/(desk)/` - app shell, chat desk, board, per-asset report
- `components/{shell,ui,chat,board,landing}/`
- `lib/ui/theme.tsx`, `lib/chat/{types,store,client}.ts`, `lib/api/client.ts`
- `app/api/chat/route.ts` - streaming chat on the existing `lib/ai/*` modules
- `app/api/asset/[rToken]/route.ts` - optional thin wrapper over `/api/research?packageOnly=1`

**Not committed:** `research/` and `.cache/` (gitignored pre-build exploration and local quote cache).

## Data sources

- Bitget public API v2 (no key): spot symbols, tickers, coins, contract addresses and chains
- Yahoo Finance v8 chart API (no key): underlying price, previous close, trading periods
- Blockscout v2 on ArbitrumOne (no key): token holders, total supply, transfer history
- Google News RSS + Yahoo Finance RSS (no key): 48h news for the underlying and the rToken
- Qwen (Bitget hackathon endpoint): Tier-2 synthesis only

All outbound HTTP resolves through DNS-over-HTTPS (`lib/net/doh.ts`) because local DNS blocks exchange, crypto and explorer domains.

## Next step

Step 2 is built and verified; the only thing missing is `QWEN_API_KEY`. Add it to `.env`, run `npm run smoke:research -- rTSLA`, and read the brief with its citations and warnings. Then continue with frontend step 3 (design foundation) in `Bitget_rVue_Frontend_Spec.md` section 13, and add streaming `POST /api/chat` on the same `lib/ai/*` modules. Each step ends with a working app.

Deadline: September 21, 2026. Hackathon track: AI Trading Desk / Information Extraction & Signal Generation.

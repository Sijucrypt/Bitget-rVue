# Bitget rVue - rToken Research Desk

AI research desk for tokenized U.S. stocks (rTokens) on Bitget.
Core question: "What's happening with this rToken right now, and does it agree with the underlying stock?"

Principle: **code calculates, AI interprets.** All numbers are deterministic TypeScript; the AI layer (Qwen) only reasons over a structured Evidence Package and never does math.

## Scope (Two Tiers)

1. **Tier 1 - Market-wide divergence scanner (deterministic, no LLM).** Compares every live rToken (~705 rXXX/USDT spot pairs) against its native U.S. underlying, anchored to the previous official close.
2. **Tier 2 - Deep research brief (per asset).** Evidence Package (market + on-chain + news) synthesized by Qwen into a sourced research brief with FACT / COMPUTED / INTERPRETATION / UNKNOWN discipline.

## Surfaces

| Surface | Route | State |
|---------|-------|-------|
| Landing page (liquid glass) | `/` | Complete |
| AI chat desk | `/chat`, `/chat/[id]` | Complete |
| rToken board (list of all rTokens) | `/rtokens` | Complete |
| rToken report (per asset, Tier 2) | `/rtokens/[rToken]` | Complete |
| Privacy | `/privacy` | Complete |

Both a **light** and a **dark** theme are supported, switched without a flash of the wrong theme. Glass is used for chrome (sidebar, topbar, composer, palette); data tables and evidence blocks stay opaque so numbers remain legible.

## Quickstart & Deployment

### Local Development
```bash
npm install
copy .env.example .env     # add QWEN_API_KEY for research briefs; all other vars are optional
npm run dev                # http://localhost:3000
npm run smoke              # Tier-1: live scanner test (Bitget + Yahoo)
npm run smoke:research -- rTSLA               # Tier-2: Evidence Package for one asset
```

### Vercel Deployment
This Next.js App Router project is 100% ready for Vercel. 
1. Import the repository into Vercel.
2. Set the following Environment Variables in the Vercel dashboard:
   - `QWEN_API_KEY` = your API key
   - `QWEN_BASE_URL` = `https://hackathon.bitgetops.com/v1`
   - `QWEN_MODEL` = `qwen3.8-max`
3. Click Deploy. Vercel will automatically run `npm run build`.

*(Note: Without a model key, the research endpoint gracefully degrades, returning `503 model_not_configured` and the full deterministic Evidence Package. It will never invent or mock a brief).*

## Data Sources & Architecture

- **Bitget public API v2** (no key): spot symbols, tickers, coins, contract addresses, and chains.
- **Yahoo Finance v8 chart API** (no key): underlying price, previous close, trading periods.
- **Blockscout v2 on ArbitrumOne** (no key): token holders, total supply, transfer history.
- **Google News RSS + Yahoo Finance RSS** (no key): 48h news for the underlying and the rToken.
- **Qwen (Bitget hackathon endpoint)**: Tier-2 synthesis and Chat Streaming.

### Network Proxy Bypass
All outbound HTTP requests resolve through a custom DNS-over-HTTPS (`lib/net/doh.ts`) implementation and a Next.js proxy route (`app/api/bitget-proxy/[...path]/route.ts`) to seamlessly bypass local DNS blocks targeting exchange, crypto, and block explorer domains.

## Docs (Included in repo)

| Doc | Role |
|-----|------|
| `AGENTS.md` | Working rules for AI sessions; start here |
| `Bitget_rVue_AI_Trading_Desk_Build_Plan.md` | Why - product intent, scope, evidence discipline |
| `Bitget_rVue_Frontend_Spec.md` | What the UI is - routes, shell, themes, glass, contracts, build order |
| `ui-design-skill.md` | How it looks - tokens, material, components, motion |
| `WEB_DESIGN_RULES.md` | Quality control checklist |
| `Bitget_rVue_SDLC.md` | How we work - phases, gates, definition of done, phase tracker |

*Built for the Bitget AI Hackathon S2 (AI Trading Desk / Information Extraction & Signal Generation track).*

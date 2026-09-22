# Bitget rVue — Software Development Life Cycle (SDLC)

This document outlines a simplified, hackathon-optimized Software Development Life Cycle (SDLC) for the Bitget rVue project. It maps the standard SDLC phases to your rapid 2-week build plan.

## Document Governance

The docs are the working contract between you and the AI. Order of authority:

1. `Bitget_rVue_AI_Trading_Desk_Build_Plan.md` — **why** (product intent, scope, evidence discipline)
2. `Bitget_rVue_Frontend_Spec.md` — **what the UI is** (routes, shell, themes, glass, contracts, build order)
3. `ui-design-skill.md` — **how it looks** (tokens, material, components, motion)
4. `WEB_DESIGN_RULES.md` — **quality control** (the checklist every screen must pass)
5. `Bitget_rVue_SDLC.md` (this file) — **how we work** (phases, gates, definition of done)
6. `README.md` — orientation and layout

Rules:
* **Update the doc before the code.** If implementation reveals a better decision, change the spec first so the next AI session inherits the correction instead of rediscovering it.
* **One step at a time.** Each step in the build order ends with a working app and a checked gate. Never land half a contract.
* **No silent scope growth.** Anything not in the spec is proposed in the spec's "Open decisions" section before it is built.
* **Code calculates, AI interprets.** This holds in the UI too: no number on screen originates from the model.

## Phase Tracker

| Phase | Status | Evidence |
|-------|--------|----------|
| 1. Planning & Requirements | Done | Build plan sections 1-5; scope widened from one rToken to the full universe after Tier-1 proved out |
| 2. System Design | Done | `lib/evidence/types.ts` contract; `Bitget_rVue_Frontend_Spec.md` (IA, themes, glass, API contracts) |
| 3A. Data Layer | Done | `lib/net/doh.ts`, `lib/market/bitget.ts`, `lib/market/equities.ts`; `npm run smoke` |
| 3B. Comparison Engine | Done | `lib/analysis/reference.ts`, `lib/scanner/scan.ts`; thresholds calibrated on the Sept 9 peg validation |
| 3C. AI Integration | Built + verified live (brief passes end-to-end) | `lib/evidence/build.ts`, `lib/research/*`, `lib/ai/*`, `app/api/research/route.ts`. Qwen key configured for `https://hackathon.bitgetops.com/v1` / `qwen3.8-max`; `lib/ai/qwen.ts` streams (the Bitget gateway 504s long non-stream calls). Deep-research generation takes minutes on the hackathon credit. |
| 3D. Frontend | Step 4 (app shell) done | Steps 3-8 of `Bitget_rVue_Frontend_Spec.md` section 13. Step 3 landed: light+dark tokens, glass tiers, ambient layer, `ThemeProvider` + no-flash script (`app/globals.css`, `lib/ui/theme.tsx`, `app/layout.tsx`), verified live; Step 4 landed with route groups, responsive glass sidebar/topbar, desktop collapse, mobile focus-trapped drawer, command palette, keyboard map, and shared scan state. Next: Step 5 board + report. |
| 4. Testing & QA | Partial | Scanner math verified. Tier-2 pipeline verified live 2026-09-10: `typecheck`, `build`, `smoke:research` and HTTP probes green, Tier-1/Tier-2 cross-check at 0.0000pp delta. UI gates not yet run |
| 5. Deployment & Demo | Not started | — |
| 6. Maintenance | Not started | — |

---

## 1. Planning & Requirements Analysis
**Goal:** Define the exact boundaries of the MVP and secure necessary resources.
*   **Define Scope:** Restrict the MVP to **one single rToken** to prove the concept. *(Superseded: Tier 1 now scans the full ~705-pair universe deterministically; Tier 2 still proves out on one asset at a time.)*
*   **Define Core Problem:** Solve the 24/7 token vs. traditional market hours divergence.
*   **Resource Gathering:** Obtain API keys for market data, on-chain data, and the Bitget Qwen endpoint.
*   **Environment Setup:** Initialize the GitHub repository (`bitget-rvue`), set up `.gitignore`, and configure `.env` for secrets.
*   **Surface Requirements:** Three surfaces agreed — a liquid glass **landing page**, an **AI chat desk**, and an **rToken board/report** — with a shared sidebar (new chat, recent chats, board link) and both a **light** and a **dark** theme. Detailed in `Bitget_rVue_Frontend_Spec.md` sections 1-8.

**Definition of done:** scope written down, resources listed, surfaces and themes agreed in the spec.

## 2. System Design
**Goal:** Blueprint the data flow and technology stack before writing logic.
*   **Tech Stack Selection:** Node.js/TypeScript (Backend data processing), Next.js (Frontend UI), Qwen (AI Reasoning).
*   **Data Architecture:** 
    *   *Raw Data Sources* -> *Normalization Layer* -> *Comparison Engine* -> *Evidence Package* -> *Qwen AI*.
*   **Interface Design:** Draft the layout for the Next.js dashboard (Asset Snapshot, Divergence metrics, Research Brief). *(Expanded: route map, app shell, sidebar, chat desk, board and per-asset report are specified in `Bitget_rVue_Frontend_Spec.md` sections 2-8.)*
*   **Contract Definition:** Define the exact JSON schema for the "Evidence Package" that will be passed from the code to the AI. *(Landed as `lib/evidence/types.ts`; the frontend-facing contracts — `GET /api/asset/[rToken]` and streaming `POST /api/chat` — are defined in spec section 9.)*
*   **Design System Definition:** Tokenize both themes as CSS custom properties on `data-theme`, define the three liquid glass tiers and their mandatory fallbacks, and fix the rule that glass is for chrome while data surfaces stay opaque.
*   **Dependency Decision:** Minimal footprint. Proposed additions are Tailwind CSS v4 and `lucide-react` only; no state library, no animation library, no `next/font/google` (it breaks offline builds).

**Definition of done:** every screen has a route, a data source, and a contract; every visual decision has a token name.

## 3. Implementation (Coding)
**Goal:** Build the application modularly, starting with deterministic logic.
*   **Phase A (Data Layer):** Write standard Node.js/TypeScript API wrappers to fetch rToken, native stock, and external news data. *(done)*
*   **Phase B (Comparison Engine):** Code the deterministic math to calculate price spread, divergence, and volume changes. *(done)*
*   **Phase C (AI Integration):** Connect the Qwen API. Feed it the Evidence Package and prompt it strictly for *Trading-signal reasoning* and *Summarization*.
    *   C1 — Evidence Package builder: turn a `DivergenceRow` plus contract/chain data into `EvidencePackage` with tagged `EvidenceItem`s. *(done: `lib/evidence/build.ts`, 49 items for rTSLA, zero duplicate ids)*
    *   C2 — Research endpoint returning the package, succeeding with `gaps` populated when on-chain or news data is missing. *(done: shipped as `GET|POST /api/research`; `packageOnly=1` returns the package alone, so `GET /api/asset/[rToken]` is now an optional thin wrapper)*
    *   C3 — `POST /api/chat`: streams `evidence` -> `token`* -> `done`, validating that every citation resolves to a real `EvidenceItem.id`. *(pending: must reuse `lib/ai/qwen.ts` and `lib/ai/prompts.ts` unchanged so chat and one-shot research cannot drift apart; `qwen.ts` now streams internally, so both paths inherit it)*
    *   C4 — On-chain and news enrichment, or an explicit `PENDING` if not integrated before the deadline. *(done: real data, not `PENDING`. Blockscout v2 on ArbitrumOne for holders and transfers, Google News + Yahoo Finance RSS for 48h news)*
*   **Phase D (Frontend):** Build the Next.js UI to allow users to click "Research" and display the AI's synthesized output. Executed in the spec's step order:
    *   D1 — Design foundation: both theme token sets, glass utilities, ambient layer, `ThemeProvider` with a no-flash script, `lib/format.ts` extraction.
    *   D2 — App shell: route groups `(marketing)` / `(desk)`, sidebar, topbar, command palette, mobile drawer, keyboard map.
    *   D3 — Board and report: port the existing board to `/rtokens` with filters, sorting and row actions, then build `/rtokens/[rToken]`.
    *   D4 — Chat desk: empty state, streaming, citations, evidence rail, numbers panel, local conversation persistence.
    *   D5 — Landing page: all sections wired to live scan data.
    *   D6 — Logo, favicon and manifest swap once the brand assets arrive.

**Definition of done per phase:** `npm run typecheck` passes, the affected screen renders real data, and every state (loading, empty, error, stale, no-signal) is handled.

## 4. Testing & Quality Assurance
**Goal:** Attack the system to ensure it handles edge cases and prevents AI hallucinations.
*   **Data Fallback Testing:** Simulate API failures or missing on-chain data. Ensure the UI outputs "Data unavailable" instead of crashing.
*   **Hallucination Testing:** Check if Qwen invents reasons for a price move. Enforce that every claim traces back to the Evidence Package.
*   **Citation Integrity:** Every citation marker in model output must resolve to an `EvidenceItem.id`. Unresolved citations are surfaced as warnings, never silently dropped. *(enforced by `validateBrief` in `lib/ai/prompts.ts`, which also flags `UNCITED_CLAIM` for any FACT/COMPUTED claim with no valid citation and marks it `unverified`)*
*   **Number Integrity:** No unit-bearing figure in model prose may differ from the package. *(enforced by `auditNumbers`, which emits `UNVERIFIED_NUMBER` warnings; `OVERCONFIDENT` and `SIGNAL_MISMATCH` cover tone and signal drift)*
*   **Model Absence:** With no API key the endpoint must return 503 plus the full deterministic package, never an invented brief. *(verified live)*
*   **Math Verification:** Manually verify that the rToken vs. native stock spread calculations are accurate, especially during weekend market closures.
*   **Regression Guard:** After the board is ported to `/rtokens`, its numbers must match the pre-port board exactly for the same scan. The redesign changes presentation, never arithmetic.
*   **Theme QA:** Both themes checked on every screen. Contrast >= 4.5:1 for body text and >= 3:1 for UI elements and borders, measured on glass over the brightest ambient position. No flash of the wrong theme on hard reload.
*   **Material QA:** Glass fallbacks verified (`@supports not (backdrop-filter)` and `prefers-reduced-transparency`) with no layout shift. No more than 4 concurrent blur layers; no blur on scrolling tables or streaming text.
*   **Accessibility QA:** Full keyboard path through sidebar, palette, table rows, composer and evidence rail; visible focus everywhere; correct landmarks and `aria-live` on streaming output; usable at 1440 / 1280 / 1024 / 768 / 375.
*   **Motion QA:** `prefers-reduced-motion` disables non-essential motion and the interface stays coherent with animation off.
*   **Honesty QA:** No hardcoded numbers, no invented metrics or testimonials, freshness timestamps visible, "No significant divergence detected" renders as a normal outcome, AI disclosure present in the landing footer.

**Definition of done:** every gate in `Bitget_rVue_Frontend_Spec.md` section 11 and `ui-design-skill.md` section 11 is green in both themes.

## 5. Deployment & Demo Prep
**Goal:** Make the project accessible and perfect the presentation.
*   **Hosting:** Deploy the Next.js application to a simple platform like Vercel or locally prep for screen-sharing.
*   **UX Polish:** Add loading states and data freshness timestamps.
*   **Brand Polish:** Real logo wired into `app/icon.svg`, `app/apple-icon.png` and `app/manifest.ts`; landing hero and footer copy edited for specificity.
*   **Build Gate:** `npm run typecheck` and `npm run build` both clean before any deploy.
*   **Demo Scripting:** Run through the "One Story" demo: land on `/` with live scan numbers -> open the desk -> pin an rToken -> ask the divergence question -> show the Evidence Package and the cited brief -> open `/rtokens` to prove it generalizes across the whole universe.
*   **Demo Fallback:** A recorded or cached scan in case the venue network blocks exchange or Yahoo domains (the reason `lib/net/doh.ts` exists).

**Definition of done:** the demo runs end to end on a clean machine with no console errors.

## 6. Maintenance (Post-Hackathon)
**Goal:** Future-proof the application if development continues.
*   **Scale Assets:** Expand from one rToken to a full directory of assets. *(Tier 1 already covers the full universe; the remaining work is Tier 2 coverage per asset.)*
*   **Database Integration:** Add PostgreSQL or SQLite to cache historical divergences and reduce API costs. The local `rvue.chats.v1` conversation store is the first candidate to move server-side; its versioned key exists so the migration is a swap, not a rewrite.
*   **Model Independence:** Ensure the Evidence Package logic remains so clean that swapping Qwen for another model later requires minimal effort.
*   **Design System Drift:** Keep `app/globals.css` the single source of token values. New colors are added to the token table first, never inlined in a component.

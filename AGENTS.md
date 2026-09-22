# AGENTS.md - Bitget rVue

Read this first. It tells you how to work in this repo without rediscovering decisions.

## Doc order

1. `Bitget_rVue_AI_Trading_Desk_Build_Plan.md` - why the product exists, what it refuses to be
2. `Bitget_rVue_Frontend_Spec.md` - routes, app shell, themes, liquid glass, API contracts, build order
3. `ui-design-skill.md` - visual tokens, material rules, component patterns
4. `WEB_DESIGN_RULES.md` - quality-control checklist every screen must pass
5. `Bitget_rVue_SDLC.md` - phases, gates, phase tracker
6. `README.md` - orientation

If implementation and a doc disagree, **update the doc first**, then the code. The next session inherits the doc, not your memory.

## Non-negotiable rules

- **Code calculates, AI interprets.** Every number is computed in TypeScript from an API response. The model never produces, adjusts, or rounds a figure, and the UI never parses a number out of model text.
- **No fabricated data.** No hardcoded demo values, no invented metrics, no testimonials, no fake accuracy. Unavailable data renders `Data unavailable`. "No significant divergence detected" is a valid, well-styled outcome.
- **Evidence discipline.** Claims are tagged `FACT` / `COMPUTED` / `INTERPRETATION` / `UNKNOWN`, and citations must resolve to a real `EvidenceItem.id`. Unresolved citations surface as warnings, never silently dropped.
- **Window alignment.** rToken and underlying are both measured against the underlying's previous official close. Never compare a rolling 24h crypto window against a different equity window.
- **Glass is for chrome.** Sidebar, topbar, composer, palette, floating cards. Tables, evidence blocks, and long-form prose stay opaque.
- **Both themes are first-class.** Light mode is not inverted dark mode. Contrast must pass in each independently.
- **Tokens only.** No hardcoded hex values in components. `app/globals.css` is the authoritative token source.
- **All numerics in mono**, with `tabular-nums` where they update.

## Current step

**Step 2 (Tier-2 backend) is complete and verified live end-to-end.**

Landed as `lib/evidence/build.ts`, `lib/research/{news,onchain,ticker}.ts`, `lib/ai/{prompts,qwen}.ts`, `lib/format.ts`, `lib/net/http.ts` and `app/api/research/route.ts`. `npm run typecheck`, `npm run build` and `npm run smoke:research -- rTSLA --verify-scan` all pass, and the Tier-2 package cross-checks against the Tier-1 scanner at 0.0000pp delta.

**Verified live:** with the Bitget key in `.env`, `npm run smoke:research -- rTSLA` returns a full brief - `finish_reason: stop`, signal `NO_SIGNAL`, 9/9 claims verified, 0 warnings, every citation resolved. `lib/ai/qwen.ts` streams (the Bitget gateway 504s long non-stream calls); a deep-research brief takes ~3-4 min on the hackathon credit, so `/api/research` needs a loading state and `/api/chat` must stream. Without a key, `/api/research` still returns 503 `model_not_configured` **together with the full deterministic package**.

**Step 3 (design foundation) is complete and verified.** Landed as the full light+dark token set, glass utilities and ambient layer in `app/globals.css`; `ThemeProvider` / `useTheme` / `ThemeToggle` in `lib/ui/theme.tsx`; and the no-flash inline script + ambient layer in `app/layout.tsx`. Verified live: served HTML carries the no-flash script, `data-theme`, ambient and toggle; served CSS carries both token sets, `.glass` tiers and reduced-motion/transparency fallbacks; the board renders unchanged (scoped to `--mono`). Tailwind v4 + `@tailwindcss/postcss` adopted (CSS-first, tokens via `@theme inline`); `lucide-react` still an open decision for the shell step.

**Brand / favicon:** monogram (B+r, cyan `#00F0FF` on graphite `#080A0A`) from `Bitget_rVue_Br_monogram_package/` applied as `app/icon.svg`, `app/apple-icon.png`, `public/icon-192.png` / `icon-512.png`, `app/manifest.ts` and light/dark `theme-color`; `--brand` token added to `app/globals.css`. Regenerate derivatives with `sharp` from `app/icon.svg` if the mark changes.

**Next:** frontend step 5 (board + report), then steps 6-8 in the order given in `Bitget_rVue_Frontend_Spec.md` section 13, and `POST /api/chat` streaming on the same AI modules. Step 4 (app shell) is complete and build-verified: route groups, responsive glass sidebar/topbar, desktop collapse, mobile focus-trapped drawer, command palette, keyboard map, and shared scan state. Each step ends with a working app; never land half a contract.

## Do not break

`lib/net/doh.ts`, `lib/market/*`, `lib/analysis/reference.ts`, `lib/scanner/scan.ts`, `lib/evidence/types.ts`, `app/api/scan/route.ts`, `scripts/smoke.ts`, and the Tier-2 layer: `lib/evidence/build.ts`, `lib/research/*`, `lib/ai/*`, `app/api/research/route.ts`, `scripts/research-smoke.ts`.

The scanner is calibrated. Flag thresholds (EQUITY +/-0.75pp, ETF +/-0.50pp) and the mispairing quarantine (`|spread| >= 50%`) came from a real peg validation. Do not retune them as a side effect of a UI change. When the board moves to `/rtokens`, its numbers must match the pre-move board exactly for the same scan.

## Environment notes

- Local DNS blocks exchange and crypto domains. All outbound HTTP goes through `lib/net/doh.ts`. Do not introduce a bare `fetch` to an external host.
- `lib/net/http.ts` extends that same agent with `fetchText` (RSS/XML) and `postJson` (the model call). Use those rather than adding a second HTTP path.
- Blockscout v2 on `arbitrum.blockscout.com` rejects `?limit=` and `?type=` with HTTP 422; paginate with the returned `next_page_params`. `explorer.morphl2.io` returns 404 for the token API, so Morph deployments are reported as skipped rather than queried. Verified live 2026-09-10; the findings are recorded in the header comment of `lib/research/onchain.ts`.
- Bitget's `areaCoin === "yes"` filter does not match every rToken (rTSLA resolves only by coin name), so `resolveContracts` tries the filtered list first, falls back to a name match, and records which path hit. Do not "simplify" it back to one path.
- Transient undici failures surface as a bare `fetch failed`; the real reason is on `.cause`. `describeError` in `lib/research/onchain.ts` unwraps it, and 4xx responses are never retried.
- `next dev` appends a `<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

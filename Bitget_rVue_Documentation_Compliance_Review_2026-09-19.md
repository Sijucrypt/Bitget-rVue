# Bitget rVue — Documentation Compliance Review

| Field | Value |
|-------|--------|
| **Document type** | Independent review report (read-only; no code changes) |
| **Project** | Bitget rVue — rToken Research Desk |
| **Hackathon** | Bitget AI Hackathon S2 · AI Trading Desk / Information Extraction & Signal Generation |
| **Review date** | 19 September 2026 |
| **Scope** | Codebase vs. project Markdown contracts |
| **Method** | Static comparison of implementation against documented authority; no runtime QA, no typecheck/build executed in this review |
| **Classification** | Internal engineering report |

---

## 1. Purpose

This report records whether the Bitget rVue repository matches the product and engineering contracts in the project Markdown files. It is written so a later session can act on findings without rediscovering them.

**In scope**

- Alignment of implementation with documented routes, APIs, evidence discipline, UI rules, and build status.
- Consistency among the Markdown files themselves.

**Out of scope**

- Changing application code.
- Live smoke tests against Bitget / Yahoo / Qwen.
- Contrast measurement, accessibility audits with a screen reader, or performance budgets.
- Security penetration testing (the Bitget proxy finding is recorded as a contract/scope issue).

---

## 2. Documents reviewed (authority order)

Per `AGENTS.md` and `Bitget_rVue_SDLC.md`:

| Order | Document | Role |
|------:|----------|------|
| 1 | `Bitget_rVue_AI_Trading_Desk_Build_Plan.md` | Why the product exists; what it refuses to be |
| 2 | `Bitget_rVue_Frontend_Spec.md` | Routes, shell, themes, glass, API contracts, build order |
| 3 | `ui-design-skill.md` | Visual tokens, material, components, motion |
| 4 | `WEB_DESIGN_RULES.md` | Quality-control checklist |
| 5 | `Bitget_rVue_SDLC.md` | Phases, gates, phase tracker |
| 6 | `README.md` | Orientation |
| — | `AGENTS.md` | Session working rules (read first in practice) |
| — | `new rule.md` | Additional product/design coding rules |
| — | `implementationplan.md` | Gap analysis vs. `new rule.md` |

**Governance rule (repeated in spec, SDLC, AGENTS):** if implementation and a document disagree, update the document first, then the code. This review finds that rule has not been followed for status and several contracts.

---

## 3. Executive summary

The **deterministic backend (Tier 1 scanner + Tier 2 Evidence Package + Qwen brief validation) still matches the architectural non-negotiables**: code calculates, AI interprets; window-aligned comparison; citation and number auditing; DoH networking; dual themes with no-flash script; glass on chrome for the desk shell.

The **frontend has moved well past what the orientation docs claim.** Chat, board, per-asset report, and a marketing landing page exist. `AGENTS.md`, `README.md`, the Frontend Spec status line, and the SDLC phase tracker still describe an earlier step (shell done; board/report/chat/landing still next).

The **most important defects are contract mismatches, not missing architecture:**

1. The landing live-scan strip reads field names that do not exist on `ScanSummary`.
2. The landing hardcodes U.S. market state as `CLOSED`.
3. `/privacy` is linked and specified but has no page.
4. `/api/bitget-proxy/[...path]` exists and is not documented in any governing Markdown file.

**Overall assessment:** architecture is largely faithful; documentation is stale; marketing surface and a few API/UI contracts fail the honesty and completeness rules the docs themselves set.

**Recommended next action (documentation first, per project rule):** republish status and contracts in Markdown, then fix the four defects above. This review does not implement those fixes.

---

## 4. Current tree vs. documented “next step”

### 4.1 What the docs say

| Source | Claimed status |
|--------|----------------|
| `AGENTS.md` | Step 2–4 complete. Next: step 5 (board + report), then 6–8; `POST /api/chat` still called out as remaining work |
| `README.md` | Board still at `app/page.tsx` (to move to `/rtokens` in step 4). Marketing, desk, chat client, `/api/chat` listed as planned |
| `Bitget_rVue_Frontend_Spec.md` header | “Step 5 board and report implementation in progress.” Section 0 still describes `app/page.tsx` as the live dark board |
| `Bitget_rVue_SDLC.md` tracker | Frontend: “Step 4 (app shell) done. Next: Step 5 board + report.” Chat (`POST /api/chat`) listed pending |
| `implementationplan.md` | Landing is a redirect; report missing on-chain / news / brief panels; several chat/report gaps |

### 4.2 What the repository contains

Present (non-exhaustive):

- `app/(marketing)/page.tsx` — landing at `/`
- `app/(desk)/layout.tsx` plus `/chat`, `/chat/[id]`, `/rtokens`, `/rtokens/[rToken]`
- `app/api/scan/route.ts`, `app/api/research/route.ts`, `app/api/chat/route.ts`
- `app/api/bitget-proxy/[...path]/route.ts` — **not in spec inventory**
- Chat, shell, and some UI components under `components/`
- Expanded `ResearchBrief` in `lib/ai/prompts.ts` (`keySignals`, `supportingEvidence`, `conflictingEvidence`, `risks`)
- Brand assets, `app/manifest.ts`, theme tokens in `app/globals.css`

Absent vs. spec inventory:

- `app/page.tsx` (removed, as step 4 required)
- `app/(marketing)/privacy/page.tsx`
- `app/(marketing)/layout.tsx`
- `app/api/asset/[rToken]/route.ts` (optional in spec)
- Most listed primitives: `GlassPanel`, `Button`, `Badge`, `MetricCard`, `DataTable`, etc.
- Board/landing module split (`components/board/*`, `components/landing/*`)
- `ThemeToggle` lives in `lib/ui/theme.tsx`, not `components/shell/ThemeToggle.tsx`

**Verdict:** implementation is approximately Frontend Spec steps 5–7 in progress or landed; orientation docs still describe step 4 complete / step 5 next.

---

## 5. Findings

Severity:

- **P0** — Breaks a non-negotiable (honesty, evidence, documented API/route) or presents false live data.
- **P1** — Specified surface or contract missing or incomplete; users or later agents will ship the wrong thing.
- **P2** — Design-system, inventory, or polish gap; product still usable.

### 5.1 P0 — Critical

#### F-01. Landing scan strip uses non-existent `ScanSummary` fields

| | |
|--|--|
| **Docs** | Frontend Spec §6: live strip from `GET /api/scan`; real values only; on failure render `Live data unavailable`. `lib/scanner/scan.ts` is the scan contract. |
| **Code** | `ScanSummary` fields: `universe`, `flagged`, `generatedAt`, `durationMs`, `ok`, `missingEquityData`, `suspectMispairing`, `rows`, … |
| **Code** | `app/(marketing)/page.tsx` reads `scan.universeCount`, `scan.flaggedCount`, `scan.scannedAt`. |
| **Impact** | After a successful scan the UI can show `undefined rTokens Scanned`, an invalid “Updated” time, and a flagged count of `undefined`. Loading copy is `Connecting to feeds…`, not `Live data unavailable`. |
| **Honesty** | Violates “no fabricated data” and WEB_DESIGN_RULES §4 (do not fake metrics) by displaying broken live numbers as if they were telemetry. |

#### F-02. Landing hardcodes U.S. market state as CLOSED

| | |
|--|--|
| **Docs** | AGENTS / build plan / `new rule.md` §19: market state must be explicit and sourced; never invent numbers or session state. |
| **Code** | Marketing page copy: `NYSE/Nasdaq State: CLOSED (24/7 Window Active)` and a second “CLOSED (Official Session Frozen)” in the anatomy card. |
| **Impact** | If the review is opened during a regular U.S. session, the landing lies. Even when markets are closed, the value is not tied to Yahoo `marketState` from the scan. |

#### F-03. `/privacy` is specified and linked; no page exists

| | |
|--|--|
| **Docs** | Frontend Spec §1–2, inventory §10; WEB_DESIGN_RULES §9; README surfaces table; sidebar footer. |
| **Code** | `components/shell/Sidebar.tsx` links to `/privacy`. No `app/(marketing)/privacy/` (or other) page. Landing footer has no privacy link. |
| **Impact** | Desk users hit a 404. Legal/honesty checklist item is unmet. Local chat persistence (`rvue.chats.v1`) is exactly the kind of storage a privacy page should describe. |

#### F-04. Undocumented Bitget gateway proxy

| | |
|--|--|
| **Docs** | SDLC: no silent scope growth; anything not in the spec is proposed in Open decisions first. Spec §12: no extra dependencies/surfaces without approval. Outbound HTTP must go through `lib/net/doh.ts` / `lib/net/http.ts`. |
| **Code** | `app/api/bitget-proxy/[...path]/route.ts` proxies GET/POST/PUT/DELETE/OPTIONS/PATCH to `https://hackathon.bitgetops.com/v1/${path}`, forwarding request headers and body, using `dohModelAgent`. |
| **Impact** | Unlisted surface; later sessions will not inherit this decision from docs. Forwards client headers to a third party. Not an exploit review, but it is a contract and trust-boundary gap. |

---

### 5.2 P1 — Specified contracts incomplete or drifted

#### F-05. Governing docs contradict the repository and each other

`AGENTS.md` “Current step”, README “Frontend (current) / Planned / Next step”, Frontend Spec §0 / §9.2 / §13, and SDLC Phase Tracker 3D/3C all understate shipped UI and `/api/chat`. `implementationplan.md` still treats the landing as a redirect and the report as missing structured panels.

**Impact:** the next AI session will follow stale “next step” text and may rebuild or skip work incorrectly. This violates the project’s own “docs are the working contract” rule.

#### F-06. `ResearchBrief` contract: spec vs. `new rule.md` vs. code

| Source | Shape |
|--------|--------|
| Frontend Spec §9.1 | `summary`, `signal`, `confidence`, `whatChanged`, `whyItMatters`, `uncertainty`, `claims` |
| `new rule.md` §13 / `implementationplan.md` Phase A | Adds `keySignals`, `supportingEvidence`, `conflictingEvidence`, `risks` |
| `lib/ai/prompts.ts` | All of the above; extra arrays default to `[]` if missing (backward compatible) |

Code matches `new rule.md`. Frontend Spec §9.1 was not updated. Smoke script prints the extra fields. **Docs-first rule not applied.**

#### F-07. `POST /api/chat` does not match spec §9.2 as written

Specified: SSE `evidence` → `token*` → `done` `{ messageId, warnings }`; reuse `lib/ai/qwen.ts` / `lib/ai/prompts.ts`; if no asset can be resolved, ask a clarifying question rather than guess.

Observed:

- Extra `status` events (`phase: evidence | model`).
- `done` also includes `brief`.
- Request without `rToken` returns HTTP 400 `rToken_required`, not a clarifying assistant message.
- After `completeJson` (full JSON), the route **re-chunks the summary into fake token deltas**. Spec and AGENTS.md require real streaming because the Bitget gateway 504s long non-stream calls. Internal Qwen streaming is used to obtain JSON; the client does not receive live model tokens.

Chat and research share prompts (good). The wire contract and streaming semantics have drifted from the spec without a spec update.

#### F-08. Landing page incomplete vs. Frontend Spec §6

Present: H1 problem line, pipeline story, four evidence kinds, human-in-the-loop, data-source names, not-investment-advice disclaimer.

Missing or wrong:

- Spec hero subcopy (replaced with rewritten marketing).
- `GET /api/scan?limit=1` for the strip and `?limit=5` for a flagged board preview — page fetches the full scan.
- Board preview of top 5 **flagged** rows with scan time; empty state “No flagged divergence in the latest scan”.
- Worked example from Build Plan §2 (native +0.8%, rToken +3.1%, +2.3pp) — allowed as a labelled example, not as live metrics.
- Footer: privacy link; explicit AI-generated-content disclosure (WEB_DESIGN_RULES §11).
- CTA labels: spec `Open the research desk` / `See the divergence board`; code uses “Open Research Desk”, “Launch Desk”, “View Divergence Board”, etc.
- `app/(marketing)/layout.tsx` not present.
- Ticker chips use `--` for missing prices instead of `Data unavailable`.

#### F-09. Board incomplete vs. Frontend Spec §8.1

Aligned: `PAGE_SIZE = 150`, Show more, opaque table, sticky first column, flagged left accent, search, flagged-only toggle, row → `/rtokens/[rToken]`, Research → `/chat?rToken=`, window-alignment notes (partial).

Gaps:

| Specified | Observed |
|-----------|----------|
| Summary chips: universe, with equity data, flagged, no equity data, suspect pairing, scan time, generated | Universe, flagged, aligned quotes, duration only |
| Columns: rToken, Stock, rLast, r24h, Stock, State, Anchor, sChg, rChg(a), Divergence, Spread, 24h Vol, Age | Asset (rToken+ticker), rToken price, r24h, underlying price, market, divergence, spread, volume, age, actions. **Anchor, sChg, rChg(a) absent** |
| Filters: text, status, market state, flagged only, instrument type | Text + flagged only |
| `/` focuses board filter when board is active | Not implemented |
| Footer notes on thresholds, suspect pairing, 24h volume caveat | Partial (alignment + divergence + discipline; thresholds/volume caveat thinner than “verbatim” requirement) |
| Loading / empty: `Data unavailable` | Loading chips use `—`; empty filtered table says `Data unavailable` even when the scan succeeded |

#### F-10. Per-asset report vs. spec §8.2

Mostly landed: header, metric cards, on-chain panel, news, on-demand research brief, evidence JSON, gaps, Open in chat / rescan / copy JSON, not-investment-advice footer.

Gaps:

- Unknown rToken is not a dedicated honest 404 with only a board link (error panel instead).
- Optional `GET /api/asset/[rToken]` not built (allowed; report calls `/api/research?packageOnly=1`).
- Topbar market-state pill for the pinned asset (spec §3.2) is not on the report route.
- Brief region on package-only load vs. “Research brief unavailable” with machine `error` code is weaker than spec §9.1 UI rule until the user triggers generation.

#### F-11. Chat desk vs. spec §7

Landed: conversation column, evidence rail (desktop), local `rvue.chats.v1`, citations → rail highlight, numbers from package, composer `.glass-2`, suggested prompts, `aria-live`, pin, MarketStatus in the conversation, human-in-the-loop language.

Gaps:

- Topbar market pill not always shown for pinned asset.
- Delete conversation: no 5-second undo toast.
- Unpinned flow: error instead of clarifying question (see F-07).
- Empty-state greeting is closer to analyst workstation after `new rule.md` work; still not a line-by-line match to spec §7.2.

#### F-12. Component inventory (spec §10) largely unimplemented as named modules

Functional UI exists as fewer, larger files. Spec asked for `components/board/*`, `components/landing/*`, and a primitive kit. `implementationplan.md` Phase F extracted some chat pieces (`CitationChip`, `NumbersPanel`, `BriefPanel`, `ClaimRow`, `MarketStatus`) — that plan is otherwise stale.

Not a user-facing break by itself; it increases drift risk and makes “update the spec first” harder.

---

### 5.3 P2 — Design system, honesty wording, and QA gates

#### F-13. Glass recipe not used on marketing chrome

Desk sidebar, topbar, palette, and composer use `.glass` / `.glass-1` / `.glass-2` / `.glass-3` with documented fallbacks in `app/globals.css`.

Landing nav and scanner strip use `bg-surface/75 backdrop-blur-md` and similar, not the three-tier utilities. Spec §5: glass is allowed on landing floating cards and top nav, via those tiers.

#### F-14. Token and radius rules on the landing

- Primary actions use `--brand` (`#00F0FF`) rather than `--accent` (spec §4.2 / ui-design-skill: accent is for primary buttons).
- `--brand` is in `globals.css` and AGENTS brand note but **not** in the Frontend Spec token table or ui-design-skill brand group (still lists `--accent` only).
- H1 uses `bg-gradient-to-r from-brand via-accent` (WEB_DESIGN_RULES §1; ui-design: ambient wash is not a hero gradient).
- Hackathon chip is `rounded-full` (spec §5.5 / WEB_DESIGN_RULES §6: pills reserved for theme toggle and icon-only controls; primary buttons `8px`).
- `animate-pulse` on live dots (motion QA: honour reduced motion; landing does not clearly gate this).

#### F-15. Hardcoded hex outside the token table

Allowed: token definitions in `app/globals.css`; theme-color in `app/layout.tsx` / `app/manifest.ts` matching `--bg`.

Leftover board CSS in `globals.css` still uses `#ffffff` on `.toolbar button` and `#d9a441` on `.state.PRE/.POST` instead of `--accent-contrast` / `--warning`. If those classes are unused after the Tailwind board, they are dead CSS; if used, they violate “tokens only.”

#### F-16. Icons

Spec §11 / open decision 2: `lucide-react` wrapped by `components/ui/Icon.tsx`. Wrapper exists; many files still import icons from `lucide-react` directly and pass them into `Icon`. AGENTS.md still calls lucide “an open decision.”

#### F-17. Keyboard map (spec §3.3)

Shell implements palette, new chat, sidebar toggle (titles mention Ctrl+B / Ctrl+K / Ctrl+Shift+O). Board `/` filter focus not found. Full keyboard QA (section 11) not evidenced in this review.

#### F-18. Honesty copy leftovers

- Landing ticker `--` vs. `Data unavailable`.
- Board summary `—` while loading.
- Spec empty board outcome “No significant divergence detected” / “No flagged divergence in the latest scan” is not the empty-table string (`Data unavailable.`).

#### F-19. QA gates (Frontend Spec §11, SDLC Phase 4)

Documented as not run: contrast on glass over worst-case ambient, both themes; reduced-transparency layout-shift; 1440 / 1280 / 1024 / 768 / 375 sweep; landing LCP budget. This review did not run them either. SDLC Phase 4 remains **Partial**.

---

## 6. What matches the documents (do not regress)

These items were checked against AGENTS.md “Non-negotiable” / “Do not break” and remain aligned:

| Area | Evidence |
|------|----------|
| Code calculates, AI interprets | `lib/analysis/reference.ts`, `lib/scanner/scan.ts`, `lib/evidence/build.ts`; model prompt forbids arithmetic; `auditNumbers` / `validateBrief` |
| Window alignment | Session anchor = underlying previous official close (documented in prompts and board footer) |
| Flag thresholds | EQUITY ±0.75pp, ETF ±0.50pp; mispairing `|spread| >= 50%` still described in landing anatomy and historical scanner comments — **not retuned in this review** |
| Evidence kinds | FACT / COMPUTED / INTERPRETATION / UNKNOWN in types, prompt, landing, claims UI |
| Unresolved citations | Warnings, `unverified` claims; not silently dropped |
| DoH | `lib/net/doh.ts`, `lib/net/http.ts`; research/onchain notes in AGENTS.md still reflected in those modules |
| Dual theme + no flash | `data-theme`, `rvue.theme`, inline script in `app/layout.tsx`, `ThemeProvider` |
| Glass on desk chrome | Sidebar, topbar, palette, composer |
| Opaque data tables | Board table uses `--surface` / `--border`, not `.glass` |
| Numerics in mono / tabular-nums | Board, report metrics, numbers panel |
| Model absent | Documented 503 + full package behaviour for `/api/research` (not re-verified live here) |
| Brand / favicon | `app/icon.svg`, apple-icon, public PNGs, `app/manifest.ts` |

**Do not break list (AGENTS.md) should remain frozen:** `lib/net/doh.ts`, `lib/market/*`, `lib/analysis/reference.ts`, `lib/scanner/scan.ts`, `lib/evidence/types.ts`, `app/api/scan/route.ts`, `scripts/smoke.ts`, Tier-2 `lib/evidence/build.ts`, `lib/research/*`, `lib/ai/*`, `app/api/research/route.ts`, `scripts/research-smoke.ts`.

---

## 7. Compliance matrices

### 7.1 Surfaces

| Surface | Spec route | Implementation | Status |
|---------|------------|----------------|--------|
| Landing | `/` · `(marketing)/page.tsx` | Present; field/copy defects (F-01, F-02, F-08) | Partial |
| Privacy | `/privacy` | Missing (F-03) | Fail |
| Chat | `/chat`, `/chat/[id]` | Present | Partial |
| Board | `/rtokens` | Present (moved off `/`) | Partial |
| Report | `/rtokens/[rToken]` | Present | Partial |
| App shell | `(desk)/layout.tsx` | Present | Pass (minor topbar gaps) |
| Root layout | `app/layout.tsx` | Theme, ambient, metadata | Pass |

### 7.2 APIs

| API | Spec | Implementation | Status |
|-----|------|----------------|--------|
| `GET /api/scan` | Built | Present; 60s cache documented in ScanProvider | Pass |
| `GET\|POST /api/research` | Built | Present | Pass (not live-reverified) |
| `POST /api/chat` | To build | Present; contract drift (F-07) | Partial |
| `GET /api/asset/[rToken]` | Optional | Absent; report uses research `packageOnly` | N/A / acceptable |
| `/api/bitget-proxy/*` | Not specified | Present (F-04) | Fail (scope) |

### 7.3 Frontend Spec build order

| Step | Spec intent | This review |
|------|-------------|-------------|
| 1 Docs | Single consistent contract | **Fail** — status and several schemas stale |
| 2 Backend + AI | Research pipeline | **Pass** (historical live verify cited in docs; not repeated here) |
| 3 Design foundation | Tokens, glass, theme | **Pass** with leftover CSS (F-15) |
| 4 App shell | Route groups, chrome, palette | **Pass** |
| 5 Board + report | Full §8 | **Partial** (F-09, F-10) |
| 6 Chat desk | Full §7 + SSE | **Partial** (F-07, F-11) |
| 7 Landing | Full §6 | **Partial** (F-01, F-02, F-08) |
| 8 QA + demo | Section 11 gates | **Not started** (F-19) |

### 7.4 `new rule.md` / `implementationplan.md`

| Rule / phase | Plan said | Code now | Plan accuracy |
|--------------|-----------|----------|---------------|
| §13 ResearchBrief extra fields | Must add | Added | Plan outdated (done) |
| §16 Evidence rail domains | Must add | Domain tabs / sections present | Plan outdated (done) |
| §18 Report on-chain, news, brief | Missing | Present | Plan outdated (done) |
| §20 Landing | Redirect | Real landing (with P0 bugs) | Plan outdated |
| §34 Disclaimer on report | Missing | Present | Plan outdated (done) |
| §35 Split MessageItem | Must extract | Extracted files exist | Mostly done |
| Privacy / scan-field honesty | Not in plan | Still broken | Still open |

---

## 8. Recommended sequence (docs first)

No code was changed for this report. Suggested order when work resumes:

1. **Update Markdown** so status, route map, `ResearchBrief`, `/api/chat` SSE (including any extra `status` / `brief` fields you intend to keep), lucide/Tailwind/`--brand`, and the Bitget proxy (keep + document, or remove) match the tree. Refresh `AGENTS.md`, `README.md`, Frontend Spec §0/§9/§10/§13/open decisions, SDLC tracker, and `implementationplan.md` or archive it.
2. **F-01 / F-02 / F-03 / F-04** — landing field names + live market state; privacy page (or remove links); proxy decision.
3. **Close step 5** — board columns, chips, filters, honesty strings.
4. **Close step 6** — real token streaming or an explicit spec change that JSON-then-chunk is accepted; clarifying question when unpinned; delete undo.
5. **Close step 7** — spec section order, flagged preview, `limit` query, AI disclosure, glass utilities, accent vs brand.
6. **Step 8** — both-theme contrast, reduced motion/transparency, responsive sweep, demo script.

---

## 9. Limitations of this review

- Static file inspection only. `npm run typecheck`, `npm run build`, `npm run smoke`, and `npm run smoke:research` were not run in this pass.
- No browser verification of themes, drawers, or streaming.
- Scanner calibration was not re-derived; this report assumes existing thresholds remain as documented.
- `new rule.md` was sampled by section against code, not line-by-line for all 44 sections.

---

## 10. Document control

| Item | Detail |
|------|--------|
| Title | Bitget rVue Documentation Compliance Review |
| Version | 1.0 |
| Date | 2026-09-19 |
| Related code | Workspace as of review date; no commit created |
| Distribution | Project owners / subsequent AI sessions |
| Follow-up | Treat this file as the findings log until the governing `.md` files are updated |

---

## Appendix A — Key files inspected

```
AGENTS.md
README.md
Bitget_rVue_AI_Trading_Desk_Build_Plan.md
Bitget_rVue_Frontend_Spec.md
Bitget_rVue_SDLC.md
ui-design-skill.md
WEB_DESIGN_RULES.md
new rule.md
implementationplan.md

app/layout.tsx
app/globals.css
app/manifest.ts
app/(marketing)/page.tsx
app/(desk)/layout.tsx
app/(desk)/chat/page.tsx
app/(desk)/chat/[id]/page.tsx
app/(desk)/rtokens/page.tsx
app/(desk)/rtokens/[rToken]/page.tsx
app/api/scan/route.ts
app/api/research/route.ts
app/api/chat/route.ts
app/api/bitget-proxy/[...path]/route.ts

lib/scanner/scan.ts
lib/ai/prompts.ts
lib/chat/types.ts
lib/ui/theme.tsx
components/shell/{Sidebar,Topbar,ScanProvider,CommandPalette}.tsx
components/chat/{ConversationView,EvidenceRail,Composer}.tsx
```

## Appendix B — Finding index

| ID | Severity | Title |
|----|----------|--------|
| F-01 | P0 | Landing scan field names do not match `ScanSummary` |
| F-02 | P0 | Hardcoded market state CLOSED on landing |
| F-03 | P0 | `/privacy` specified and linked; page missing |
| F-04 | P0 | Undocumented `/api/bitget-proxy` |
| F-05 | P1 | Governing docs stale vs. code and each other |
| F-06 | P1 | `ResearchBrief` expanded in code, not in Frontend Spec |
| F-07 | P1 | Chat SSE / streaming / unpinned behaviour vs. spec §9.2 |
| F-08 | P1 | Landing incomplete vs. spec §6 |
| F-09 | P1 | Board incomplete vs. spec §8.1 |
| F-10 | P1 | Report residual gaps vs. spec §8.2 |
| F-11 | P1 | Chat residual gaps vs. spec §7 |
| F-12 | P1 | Spec §10 inventory not reflected as modules |
| F-13 | P2 | Marketing chrome not on `.glass-*` utilities |
| F-14 | P2 | Brand/accent, gradients, pill radii on landing |
| F-15 | P2 | Leftover hex in `globals.css` board CSS |
| F-16 | P2 | lucide imports vs. wrapper; docs still “open” |
| F-17 | P2 | Board `/` shortcut and full a11y QA unevidenced |
| F-18 | P2 | `—` / `--` instead of `Data unavailable` in places |
| F-19 | P2 | Spec §11 / SDLC Phase 4 QA not run |

**End of report.**

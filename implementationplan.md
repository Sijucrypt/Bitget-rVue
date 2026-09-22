# Implementation Plan: Transform Product per `new rule.md`

After a section-by-section audit of `new rule.md` (44 sections, 1173 lines) against the current codebase, here is the gap analysis and the execution plan. The rule doc codifies many principles already in place, but several sections demand concrete changes.

---

## Gap Analysis

### Already Compliant (no changes needed)
| Rule Section | Status |
|---|---|
| §1-2 Product Identity / Code calculates, AI interprets | ✅ Core architecture follows this |
| §3 Human-in-the-Loop | ✅ Disclaimers in Composer, BriefPanel, EvidenceRail |
| §4 Evidence Discipline (FACT/COMPUTED/INTERPRETATION/UNKNOWN) | ✅ Implemented in `lib/ai/prompts.ts` |
| §5 Citation-First AI | ✅ `renderWithCitations` + `onCitationClick` → EvidenceRail |
| §6-7 Tier 1 Scanner | ✅ `lib/scanner/scan.ts`, `lib/analysis/reference.ts` |
| §8-11 Tier 2 (Market/OnChain/News evidence) | ✅ `lib/evidence/build.ts`, research modules |
| §12 Qwen Integration | ✅ `lib/ai/qwen.ts`, `lib/ai/prompts.ts` |
| §14-15 Chat Desk + Citations | ✅ ConversationView, MessageItem, streaming |
| §22-23 Glass for chrome, opaque for data / themes | ✅ `globals.css` tokens, glass utilities |
| §24-25 Typography / Color semantics | ✅ Mono numerics, tabular-nums, tone() helpers |
| §29-31 Networking / API / Streaming | ✅ DoH, SSE, `/api/chat`, `/api/research` |
| §33 Security (validate model output) | ✅ `validateBrief`, `auditNumbers` |
| §37 Do not break architecture | ✅ Per AGENTS.md |

### Gaps Requiring Changes

| Rule Section | Gap | Fix |
|---|---|---|
| **§13** AI Output Contract | `ResearchBrief` is missing `keySignals`, `supportingEvidence`, `conflictingEvidence`, `risks` fields. Rule demands full structure. | Expand the `ResearchBrief` interface, prompt schema, and validation |
| **§16** Evidence Rail | Rail shows flat list. Rule demands **domain-grouped sections**: Market, On-chain, News, with raw values and timestamps per section. | Refactor `EvidenceRail` into sectioned `<EvidenceSection>` components |
| **§17** rToken Board | Board is compliant but missing explicit **data freshness timestamps** per row and **"Data unavailable"** rendering for null values in the scan status. | Already handles nulls with `"Data unavailable"` — minor tightening only |
| **§18** rToken Detail/Report | Report page exists but is **missing On-chain metrics section, News section, and AI Research Brief section**. Currently only shows market metrics + raw evidence. | Add structured On-chain, News, and Research Brief panels |
| **§19** 24/7 Market Context | Market state badge exists in the board but the **chat interface does not surface market state** prominently. | Add a `<MarketStatus>` bar in the chat when evidence arrives |
| **§20** Landing Page | Currently a redirect to `/rtokens`. Rule demands a real marketing surface explaining the 24/7 problem with a live scanner strip. | Build the landing page |
| **§21** App Shell | Shell exists (Sidebar, Topbar, CommandPalette, mobile drawer). Mostly compliant. | No major changes needed |
| **§26-27** Data Freshness / Missing-data states | Chat streaming indicator doesn't show "Data unavailable" on AI failure gracefully. | Harden error/empty states in ConversationView |
| **§28** AI Failure States | When Qwen fails, evidence + rail should remain visible. Currently the error replaces the assistant message. | Keep evidence rail open and functional after AI error |
| **§34** Financial Safety | No `"not investment advice"` in rToken report footer. | Add disclaimer footer to report page |
| **§35** Component Architecture | `MessageItem.tsx` is a 323-line mega-component containing rendering, citations, NumbersPanel, BriefPanel, ClaimRow. | Extract `<CitationChip>`, `<NumbersPanel>`, `<BriefPanel>`, `<ClaimRow>` into separate files |
| **§40** Avoid Generic AI UI | Chat empty state is generic. Should feel like an analyst workstation, not a chatbot. | Redesign empty state with asset context and evidence-first framing |

---

## Proposed Changes

### Phase A — ResearchBrief Contract Expansion (§13)

#### [MODIFY] [`prompts.ts`](file:///c:/Users/HP/Desktop/Bitget%20rVue/lib/ai/prompts.ts)
- Expand `ResearchBrief` interface to add `keySignals: string[]`, `supportingEvidence: string[]`, `conflictingEvidence: string[]`, `risks: string[]`.
- Update `SCHEMA_HINT` to include these four new fields.
- Update `SYSTEM_PROMPT` section requirements to instruct the model to populate them.
- Update `validateBrief()` to parse and validate the new fields (non-empty arrays).
- Update `briefText()` to include the new fields in the number audit.

#### [MODIFY] [`MessageItem.tsx`](file:///c:/Users/HP/Desktop/Bitget%20rVue/components/chat/MessageItem.tsx)
- Render the new `keySignals`, `supportingEvidence`, `conflictingEvidence`, `risks` sections in `BriefPanel`.

---

### Phase B — EvidenceRail Domain Sections (§16)

#### [MODIFY] [`EvidenceRail.tsx`](file:///c:/Users/HP/Desktop/Bitget%20rVue/components/chat/EvidenceRail.tsx)
- Replace the flat evidence item list with **three domain sections**: Market, On-chain, News.
- Each section renders the relevant subset of the `EvidencePackage` with raw values, timestamps, and source references.
- Keep the raw JSON toggle as-is.

---

### Phase C — rToken Report Hardening (§18, §34)

#### [MODIFY] [`[rToken]/page.tsx`](file:///c:/Users/HP/Desktop/Bitget%20rVue/app/(desk)/rtokens/[rToken]/page.tsx)
- Add an **On-chain metrics panel** showing transfers, holder count, activity.
- Add a **News panel** showing recent relevant headlines.
- Add a **Research Brief panel** (call `/api/research` without `packageOnly` to get the AI brief).
- Add a **"Not investment advice"** disclaimer footer (§34).
- Add a `<MarketStatus>` component showing explicit market state and trading context (§19).

---

### Phase D — Chat UX Hardening (§19, §27, §28, §40)

#### [MODIFY] [`ConversationView.tsx`](file:///c:/Users/HP/Desktop/Bitget%20rVue/components/chat/ConversationView.tsx)
- Add a `<MarketStatus>` bar above the composer when evidence is loaded, showing market state, session anchor, and data freshness (§19).
- Keep evidence rail open and functional when AI synthesis fails (§28).
- Redesign empty state to feel like an analyst workstation: show the rToken board link, recent flagged assets, and evidence-first suggested prompts (§40).

---

### Phase E — Landing Page (§20)

#### [MODIFY] [`(marketing)/page.tsx`](file:///c:/Users/HP/Desktop/Bitget%20rVue/app/(marketing)/page.tsx)
- Replace the redirect with a real marketing surface.
- Hero: "rTokens never close. Their underlying stocks do."
- Live scanner strip: fetch `/api/scan` and show universe count, flagged count, scan time.
- Problem/Solution sections explaining the 24/7 divergence.
- Pipeline visualization: Fetch → Align → Compute → Interpret.
- Evidence discipline explainer (FACT/COMPUTED/INTERPRETATION/UNKNOWN).
- CTA: "Open the desk" → `/chat`.
- Footer: data sources, privacy, AI disclosure, "not investment advice".

---

### Phase F — Component Decomposition (§35)

#### [NEW] `components/chat/CitationChip.tsx`
- Extract the citation span rendering from `renderWithCitations`.

#### [NEW] `components/chat/NumbersPanel.tsx`
- Extract from `MessageItem.tsx`.

#### [NEW] `components/chat/BriefPanel.tsx`
- Extract from `MessageItem.tsx`.

#### [NEW] `components/chat/ClaimRow.tsx`
- Extract from `MessageItem.tsx`.

#### [NEW] `components/ui/MarketStatus.tsx`
- Reusable market state badge showing open/closed/pre-market with color semantics.

---

## Execution Order

1. **Phase A** (ResearchBrief contract) — foundational; all downstream UI depends on it.
2. **Phase B** (EvidenceRail sections) — visual improvement, no contract change.
3. **Phase F** (Component decomposition) — clean up before adding more UI.
4. **Phase D** (Chat UX hardening) — uses new components.
5. **Phase C** (rToken report) — independent of chat.
6. **Phase E** (Landing page) — independent, last priority per §42.

## Verification Plan

### Automated Tests
```bash
npm run typecheck
npm run build
```

### Manual Verification
- Verify expanded `ResearchBrief` fields render correctly in the BriefPanel.
- Verify EvidenceRail shows domain-grouped sections (Market/OnChain/News).
- Verify rToken report shows all three evidence domains + disclaimer.
- Verify AI failure leaves evidence rail functional.
- Verify landing page loads with live scanner strip.

> [!IMPORTANT]
> This is a significant transformation touching the AI contract, multiple UI components, and a new page. The execution will be done phase-by-phase, with `typecheck` + `build` verification after each phase. No phase will land half a contract.

> [!WARNING]
> Phase A modifies the `ResearchBrief` interface and the system prompt. Existing cached briefs will not have the new fields. The validation must treat the new fields as optional (with warnings) to maintain backward compatibility until the model naturally returns them.

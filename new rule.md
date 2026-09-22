# Bitget rVue — AI Coding & Design Rules

## 1. PROJECT IDENTITY

Build **Bitget rVue**, an AI-powered research workbench for tokenized U.S. stocks (**rTokens**) traded on Bitget.

rVue is being developed for the **Bitget AI Hackathon S2 — AI Trading Desk track**.

The product is not an autonomous trading bot.

It is a **research and decision-support terminal** designed to answer one specific market question:

> **When the underlying U.S. stock market is closed but rTokens continue trading 24/7, are the off-hours token price movements justified by on-chain activity and breaking news, or is the token diverging from the underlying market?**

Every major product, design, and engineering decision should reinforce this problem.

---

# 2. CORE PRODUCT PHILOSOPHY

## Code calculates. AI interprets.

This is the most important architectural principle in the project.

The LLM must **never perform financial calculations that the application can calculate deterministically**.

TypeScript must calculate:

* Prices.
* Previous official closes.
* Spread percentages.
* Divergence.
* Percentage-point differences.
* Volume metrics.
* On-chain transfer statistics.
* Holder counts.
* Timestamps.
* Other deterministic numerical values.

These values are assembled into a structured:

`EvidencePackage`

The Qwen model receives the structured evidence and interprets it.

### Correct flow

```text
Raw Data
   ↓
Deterministic TypeScript Calculations
   ↓
EvidencePackage
   ↓
Qwen Interpretation
   ↓
ResearchBrief
   ↓
Evidence-Cited UI
```

### Incorrect flow

```text
Raw Data
   ↓
Qwen
   ↓
Qwen calculates financial metrics
   ↓
UI trusts model-generated numbers
```

Never implement the second pattern.

If a value can be calculated deterministically, calculate it in code.

---

# 3. HUMAN-IN-THE-LOOP

rVue is strictly an **advisory research system**.

It must never autonomously execute trades.

The AI may:

* Analyze market conditions.
* Explain divergence.
* Identify relevant evidence.
* Summarize news.
* Interpret on-chain activity.
* Generate research theses.
* Highlight potential signals.
* Explain risks and uncertainty.

The AI must not:

* Execute trades.
* Submit orders.
* Move funds.
* Automatically approve a trade.
* Present an advisory result as an executed action.

Persistent compliance language should clearly communicate:

**Advisory Only — Human Approval Required**

This principle must remain visible anywhere AI-generated research could be interpreted as a trading recommendation.

---

# 4. EVIDENCE DISCIPLINE

Every meaningful AI claim must be traceable to evidence.

Classify information into exactly four conceptual categories:

### FACT

Directly observed information from a source.

Example:

```text
The rToken is trading at $X.
```

### COMPUTED

A value deterministically calculated by the application.

Example:

```text
The rToken is 3.42% above the underlying stock's previous close.
```

### INTERPRETATION

An analytical conclusion generated from the available evidence.

Example:

```text
The divergence may indicate increased off-hours demand.
```

### UNKNOWN

Something that cannot be established from the available evidence.

Example:

```text
The available evidence does not establish the cause of the divergence.
```

Never allow the AI to present an unsupported interpretation as a FACT.

Never fabricate missing information.

---

# 5. CITATION-FIRST AI

Every important AI claim should reference the evidence used to support it.

The Qwen model should generate structured citations referencing:

`EvidenceItem.id`

Example:

```text
The rToken is trading 4.2% above the underlying's
previous official close. [market.divergence]
```

The frontend must resolve these citations to the underlying evidence.

Clicking a citation should:

1. Identify the referenced EvidenceItem.
2. Open or highlight the relevant evidence.
3. Scroll/focus the Evidence Rail where appropriate.
4. Make the source information immediately inspectable.

The user should never have to blindly trust an AI paragraph.

---

# 6. TIER 1 — DETERMINISTIC MARKET SCANNER

The Tier 1 scanner is a market-wide system that runs **without an LLM**.

Its responsibility is to compare live rToken prices against their native U.S. underlying stocks.

The reference point is the underlying stock's:

**previous official close**

The scanner should identify material divergence.

Primary sources:

* Bitget Public API v2.
* Yahoo Finance v8.

Relevant calculations belong in:

`lib/analysis/reference.ts`

Do not move these calculations into the LLM.

---

# 7. TIER 1 DATA FLOW

The scanner should conceptually follow:

```text
Bitget rToken Data
        +
Yahoo Finance Underlying Data
        ↓
Normalize Data
        ↓
Previous Official Close
        ↓
Deterministic Spread Calculation
        ↓
Deterministic Divergence Calculation
        ↓
Material Divergence Detection
        ↓
Scanner Result
```

The scanner must remain useful even if Qwen is unavailable.

AI is not a dependency for determining whether divergence exists.

---

# 8. TIER 2 — DEEP RESEARCH

Tier 2 performs deep research for an individual rToken.

The pipeline is:

```text
Selected rToken
      ↓
Evidence Collection
      ↓
EvidencePackage
      ↓
Qwen
      ↓
ResearchBrief
      ↓
Cited UI
```

Evidence collection belongs in:

`lib/evidence/build.ts`

The system should gather evidence across three domains.

---

# 9. MARKET EVIDENCE

Market evidence should originate from the deterministic Tier 1 analysis.

Include relevant information such as:

* rToken price.
* Underlying price.
* Previous official close.
* Spread.
* Divergence.
* Market state.
* Relevant volume metrics.
* Timestamp/freshness.

Never allow the AI to recalculate these values.

The UI should render important numeric values directly from the deterministic evidence rather than trusting numbers embedded in model prose.

---

# 10. ON-CHAIN EVIDENCE

Use Blockscout v2 for Arbitrum One on-chain information.

Relevant evidence includes:

* Token transfers.
* Transfer activity.
* Holder counts.
* Other supported token-level activity.

The purpose is to help answer:

> Is the observed rToken movement accompanied by meaningful on-chain activity?

On-chain evidence must remain distinct from AI interpretation.

---

# 11. NEWS / WEB EVIDENCE

Collect recent relevant information from:

* Google News RSS.
* Yahoo Finance RSS.

Current research window:

**Last 48 hours**, where supported by the implementation.

News evidence should help establish whether a market-moving explanation exists for observed divergence.

Do not assume that correlation proves causation.

For example:

```text
News appeared during the same period as price movement.
```

does not automatically mean:

```text
The news caused the price movement.
```

The AI should distinguish observation from interpretation.

---

# 12. QWEN INTEGRATION

Qwen is an **interpretation layer**, not a numerical calculation engine.

Integration belongs in:

`lib/ai/qwen.ts`

Prompt definitions belong in:

`lib/ai/prompts.ts`

The model receives the structured `EvidencePackage`.

It should produce a structured `ResearchBrief`.

The ResearchBrief should answer questions such as:

### What changed?

What measurable market behavior occurred?

### Why might it matter?

What could the evidence imply?

### What evidence supports the interpretation?

Reference specific EvidenceItem IDs.

### What conflicts with the thesis?

Identify contradictory or incomplete evidence.

### What remains unknown?

Explicitly identify gaps.

The model must not manufacture certainty.

---

# 13. AI OUTPUT CONTRACT

Prefer structured output over unconstrained prose.

Conceptually:

```text
ResearchBrief
├── Summary
├── What Changed
├── Why It Matters
├── Key Signals
├── Supporting Evidence
├── Conflicting Evidence
├── Risks
├── Unknowns
└── Citations
```

Every generated claim should be attributable to available evidence where appropriate.

If evidence is insufficient, the model should say so.

---

# 14. AI CHAT DESK

The `/chat` and `/chat/[id]` surfaces are the primary interactive research workbench.

The experience should feel like:

**Analyst workstation + evidence browser**

not:

**generic AI chatbot.**

The user should be able to ask questions such as:

* Why is this rToken diverging?
* What changed over the weekend?
* Is there meaningful on-chain activity?
* What news could explain this movement?
* Compare this rToken with its underlying.
* What evidence supports the current divergence?
* What evidence contradicts the thesis?

Responses should stream through Server-Sent Events.

---

# 15. CHAT CITATIONS

Chat responses should support interactive citation chips.

Example:

```text
[market.rPrice]
[market.divergence]
[chain.transfers]
[news.0]
```

Clicking a citation should connect the conversation to the exact underlying evidence.

Never make citations decorative.

They are a fundamental trust mechanism.

---

# 16. EVIDENCE RAIL

The Evidence Rail is a core product feature.

On large screens, display:

```text
┌─────────────────────────────┬─────────────────────┐
│                             │                     │
│       AI RESEARCH CHAT      │    EVIDENCE RAIL    │
│                             │                     │
│  "rAAPL diverged by..."     │ Market              │
│                             │ On-chain            │
│  [market.divergence]        │ News                │
│                             │                     │
│                             │ Raw values          │
│                             │ timestamps          │
│                             │ source references   │
└─────────────────────────────┴─────────────────────┘
```

When the user clicks a citation:

**highlight the exact evidence row.**

The user should be able to move from:

**AI claim → source evidence**

in one interaction.

---

# 17. rTOKEN BOARD

The `/rtokens` surface is the market-wide scanner.

It should be dense, sortable, and optimized for scanning.

Display useful metrics such as:

* rToken symbol.
* rToken price.
* Underlying price.
* Spread.
* Divergence.
* Market state.
* Relevant signal/status.
* Data freshness.

Avoid turning the scanner into a collection of oversized cards.

The purpose of the board is:

**Find interesting divergence quickly.**

---

# 18. rTOKEN DETAIL / REPORT

The `/rtokens/[rToken]` surface should provide a deep investigation workspace for a single asset.

Include:

### Market Metrics

* rToken price.
* Underlying reference price.
* Spread.
* Divergence.
* Relevant volume/activity.

### On-Chain Metrics

* Transfers.
* Holder count.
* Relevant activity.

### News

Recent relevant news.

### AI Research Brief

Structured interpretation generated from the EvidencePackage.

### Evidence

Allow the user to inspect the evidence behind the conclusions.

The page should answer:

> What happened, what evidence exists, and what might explain it?

---

# 19. 24/7 MARKET CONTEXT

A defining feature of rVue is the divergence created by continuous rToken trading while traditional U.S. equity markets are closed.

The interface should clearly communicate:

* Traditional market state.
* rToken trading state.
* Whether the observed movement occurred during normal market hours or off-hours.
* Relevant time context.

Do not assume the user knows whether the underlying market is open.

Make market state explicit.

---

# 20. LANDING PAGE

The `/` surface should communicate the core problem immediately.

The landing page should explain:

### Traditional U.S. stocks

Trade according to traditional market hours.

### rTokens

Can continue trading beyond those hours.

### The problem

Price can move when the underlying market is closed.

### The rVue solution

rVue combines:

* Deterministic market divergence analysis.
* On-chain evidence.
* Breaking news.
* AI interpretation.
* Human-controlled research.

The landing page should demonstrate the product rather than merely describe it.

A live scanner strip can expose real Tier 1 results.

---

# 21. APP SHELL

The application shell should feel like a professional research terminal.

Prioritize:

* Sidebar navigation.
* Persistent workspace context.
* Command palette.
* Responsive mobile drawer.
* Clear active route.
* Fast navigation between assets and research.

Primary destinations:

```text
Overview
rTokens
AI Desk
Research
```

Avoid excessive navigation.

The user should always understand:

**Where am I?**

**What asset am I investigating?**

**What evidence am I looking at?**

---

# 22. DESIGN SYSTEM

The visual language should use the existing rVue design direction.

### Chrome

Use the existing **liquid-glass material** for:

* Navigation.
* Sidebar.
* Application chrome.
* Floating controls.

### Dense Data

Use **opaque surfaces** for:

* Tables.
* Evidence rows.
* Metric grids.
* Dense analytical information.

The priority is readability.

Do not use transparency where it reduces data legibility.

---

# 23. DARK AND LIGHT THEMES

Support both:

* Dark mode.
* Light mode.

Dark mode should feel natural for a trading/research environment.

Light mode must preserve the same information hierarchy and readability.

Do not simply invert colors.

Use the existing Tailwind design tokens and theme architecture.

---

# 24. TYPOGRAPHY

Typography should prioritize:

* Numerical readability.
* Compact labels.
* Clear hierarchy.
* Strong contrast.
* Dense but comfortable information presentation.

Numbers such as:

```text
+4.82%
$124.82
1.43M
```

should be easy to scan.

Avoid excessively large marketing typography inside the terminal.

---

# 25. COLOR SEMANTICS

Colors should communicate state.

Examples:

* Positive movement.
* Negative movement.
* Warning.
* Unknown.
* Market closed.
* Data unavailable.
* AI-generated interpretation.

Do not use color as decoration.

A user should understand the meaning of a color consistently throughout the application.

---

# 26. DATA FRESHNESS

Financial and market information is time-sensitive.

Where relevant, display:

* Timestamp.
* Last updated time.
* Market state.
* Source.
* Availability.

Never imply that stale data is live.

If a source fails:

```text
Data unavailable
```

is better than:

```text
Fake value
```

Never fabricate financial information.

---

# 27. MISSING-DATA STATES

Every important surface must handle:

* Missing market data.
* Missing underlying data.
* No divergence.
* No meaningful signal.
* Missing on-chain activity.
* No relevant news.
* API failure.
* AI failure.

A "no signal" state is a legitimate result.

Do not manufacture a narrative simply because the UI needs something to display.

---

# 28. AI FAILURE STATES

If Qwen fails:

* Keep deterministic market data visible.
* Keep the Evidence Rail functional.
* Tell the user that AI synthesis failed.
* Allow retry.
* Do not fabricate a ResearchBrief.

The application must remain useful without the AI layer.

---

# 29. NETWORKING

The project uses a custom DNS-over-HTTPS client:

`lib/net/doh.ts`

This exists to handle local DNS restrictions affecting crypto/exchange domains.

Do not remove or bypass this architecture without understanding why it exists.

Network failures should be handled explicitly.

---

# 30. API ARCHITECTURE

Maintain clear separation between responsibilities.

Conceptually:

```text
/api/chat
/api/research
```

for AI/research workflows.

Market, evidence, and external data collection should remain separated from AI synthesis.

Never let UI components directly perform complex external-data orchestration when the responsibility belongs in the backend/data layer.

---

# 31. STREAMING

The AI chat uses:

**Server-Sent Events (SSE)**

Maintain streaming behavior.

The UI should:

* Render incremental responses.
* Handle connection termination.
* Handle errors.
* Preserve completed content.
* Resolve citations correctly.

Do not replace streaming with an unnecessary blocking request merely because it is easier to implement.

---

# 32. PERFORMANCE

The application is data-dense.

Optimize for:

* Fast initial render.
* Efficient streaming.
* Minimal unnecessary rerenders.
* Stable tables.
* Efficient evidence rendering.
* Appropriate caching.
* Controlled polling/subscriptions.

Do not over-engineer premature optimization.

Measure before introducing complex performance machinery.

---

# 33. SECURITY

Treat external data and AI output as untrusted input.

Validate:

* API responses.
* Model responses.
* Citation IDs.
* Evidence references.
* User input.

Never assume the model follows the expected schema.

Do not expose secrets in client-side code.

Never place API keys directly into frontend components.

---

# 34. FINANCIAL SAFETY

rVue is an analytical system.

Never turn model interpretation into a guarantee.

Avoid language such as:

* Guaranteed.
* Certain.
* Risk-free.
* Will rise.
* Will fall.

Prefer evidence-based language such as:

* The evidence indicates...
* The available data suggests...
* One possible explanation is...
* The evidence does not establish...
* This signal conflicts with...

The UI should preserve uncertainty rather than hide it.

---

# 35. COMPONENT ARCHITECTURE

Prefer focused reusable components.

Examples:

```text
<AppShell />

<Sidebar />

<CommandPalette />

<MarketStrip />

<RTokenBoard />

<RTokenRow />

<MetricGrid />

<ConversationView />

<ChatMessage />

<CitationChip />

<EvidenceRail />

<EvidenceSection />

<ResearchBrief />

<MarketStatus />

<NewsFeed />

<OnChainActivity />

<ThemeToggle />
```

Each component should have one clear responsibility.

Avoid massive components containing:

* Data fetching.
* Business logic.
* AI orchestration.
* UI rendering.
* State management

all in one file.

---

# 36. CODE QUALITY

Prefer:

* Strong TypeScript types.
* Small composable functions.
* Explicit data contracts.
* Predictable state.
* Clear error handling.
* Reusable utilities.
* Minimal duplication.

Do not introduce abstractions merely to make the code look sophisticated.

Complexity must earn its place.

---

# 37. DO NOT BREAK THE ARCHITECTURE

Before modifying an existing system:

1. Understand the current data flow.
2. Identify the source of truth.
3. Determine whether the value is deterministic or AI-generated.
4. Preserve existing contracts.
5. Check all consumers.
6. Run relevant tests/smoke checks.

Do not rewrite working architecture simply because another implementation appears cleaner.

---

# 38. DEMO DATA

If simulated/demo data is required:

* Clearly isolate it.
* Do not mix fake values with real values without labeling.
* Keep the data layer replaceable.
* Never represent simulated data as live market data.

The hackathon demo should demonstrate the architecture honestly.

---

# 39. UX DECISION RULE

Before adding a UI element, ask:

1. Does this help answer the divergence question?
2. Does this expose useful evidence?
3. Does this improve research speed?
4. Does this make the system easier to understand?
5. Does this improve trust?
6. Does this reduce ambiguity?

If the answer is no to all six, question whether the feature belongs.

---

# 40. AVOID GENERIC AI UI

Do not turn rVue into:

* A generic chatbot.
* A ChatGPT clone.
* A generic AI dashboard.
* A generic crypto terminal.
* A collection of glowing cards.

The AI should be integrated into the research workflow.

The **evidence is the product's foundation**.

The AI is the interpretation layer.

---

# 41. CORE PRODUCT LOOP

The entire application should reinforce this loop:

```text
SCAN
 ↓
DETECT DIVERGENCE
 ↓
INVESTIGATE
 ↓
COLLECT EVIDENCE
 ↓
AI INTERPRETS
 ↓
VERIFY EVIDENCE
 ↓
FORM RESEARCH THESIS
 ↓
HUMAN DECISION
```

Not:

```text
AI
 ↓
BUY/SELL
```

---

# 42. CURRENT DEVELOPMENT PRIORITIES

The current implementation is already mature.

Do not restart the project.

Current priorities are:

### Priority 1 — App Shell

Finalize:

* Sidebar.
* Navigation.
* Mobile focus-trapped drawer.
* Command palette.

### Priority 2 — rToken Board

Move the Tier 1 scanner experience from the landing page to:

`/rtokens`

Build the dedicated market-wide scanner.

### Priority 3 — Marketing Surface

Keep `/` focused on communicating the 24/7 divergence problem and product value.

### Priority 4 — UX Hardening

Stress test:

* Missing data.
* No-signal states.
* API failures.
* AI failures.
* Citation failures.
* Streaming failures.
* Mobile behavior.

### Priority 5 — Demo Preparation

Polish the complete research workflow and prepare a coherent demonstration.

Do not add random features before these priorities are stable.

---

# 43. DEFINITION OF DONE

A feature is not complete merely because the UI renders.

It should have:

* Correct data flow.
* Correct TypeScript types.
* Proper loading states.
* Proper error states.
* Proper empty states.
* Responsive behavior.
* Theme support.
* Evidence traceability where applicable.
* No fabricated financial values.
* No autonomous trading behavior.
* No broken existing functionality.

---

# 44. FINAL DESIGN PRINCIPLE

Bitget rVue should feel like a **professional AI research terminal for the 24/7 tokenized equity market**.

The product's identity comes from:

**Deterministic market analysis**
+
**On-chain evidence**
+
**Breaking news**
+
**AI interpretation**
+
**Evidence-linked research**
+
**Human judgment**

The fundamental trust model is:

> **The code tells me what happened.
> The evidence shows me why it matters.
> The AI helps me interpret it.
> I make the decision.**

Every engineering and design decision should preserve this model.

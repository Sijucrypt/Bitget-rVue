# Bitget rVue — AI Trading Desk Build Plan

> **Track:** AI Trading Desk  
> **Sub-theme:** Information Extraction & Signal Generation  
> **Build environment:** Codex  
> **Model credit:** Bitget-provided Qwen credit  
> **Deadline:** September 21, 2026  
> **Core focus:** rToken-specific intelligence — on-chain activity + rToken/native-stock price relationship

---

## 1. The Product

### Name: **Bitget rVue**

**Bitget rVue** is a research desk for tokenized U.S. stocks.

A user selects an rToken and asks:

> **"What's happening with this rToken right now, and does the token's market behavior agree with the underlying stock?"**

Bitget rVue gathers the relevant evidence, compares the rToken with its native stock, extracts meaningful changes, and produces a concise research brief.

The product is **not** an autonomous trader.

The product is **not** primarily a strategy backtester.

The product is a **research instrument that turns fragmented rToken data into usable market intelligence.**

---

# 2. The Core Problem

rTokens create a research problem that ordinary stock dashboards do not fully solve. While traditional U.S. equities have strict open and close hours, tokenized stocks turn the trading window into a 24/7 market. 

Macro events, liquidity shifts, and breaking news still happen on weekends or after hours, causing rToken prices to keep moving on-chain while the native stock is frozen at Friday's close.

A user may know:

- the native stock price (often closed/frozen);
- the rToken price (trading continuously);
- recent on-chain transactions;
- breaking weekend/after-hours news;

but still have to manually answer:

> **Are these pieces telling the same story, or is the rToken diverging from traditional market consensus?**

The desk should answer that question. 

### Example

Suppose:

```text
Native stock:       Closed at +0.8% (Friday)
rToken:             +3.1% (Saturday)
Spread:             +2.3 percentage points premium

On-chain volume:    sharply increased
Large holders:      increased activity
Recent news:        weekend regulatory update
```

The system should not simply dump these numbers onto the screen. It should explain:

> The rToken is trading at a 2.3 percentage point premium to the native stock's Friday close. This divergence is accompanied by elevated on-chain volume and aligns with breaking weekend regulatory news, reflecting 24/7 price discovery before traditional markets open.

**Evidence → interpretation → uncertainty.**

---

# 3. The Main User Flow

```text
User selects rToken
        ↓
Bitget rVue identifies the native stock
        ↓
Fetch current market data
        ↓
Fetch rToken/on-chain data
        ↓
Compare rToken vs native stock
        ↓
Fetch relevant news and external data
        ↓
Extract meaningful events/signals
        ↓
AI synthesizes the evidence
        ↓
Research brief
        ↓
User decides what to do
```

---

# 4. MVP — What We Actually Build

The biggest danger is trying to build an entire Bloomberg terminal in two weeks. The MVP needs one excellent workflow around one specific asset.

## MVP question

> **"Research this rToken and explain what is happening."**

### Required output

For one selected rToken:

1. **rToken snapshot**
   - current price
   - recent price movement
   - volume/liquidity where available

2. **Native stock comparison**
   - underlying stock price
   - rToken price movement
   - percentage difference
   - spread/divergence

3. **On-chain activity**
   - transaction activity
   - volume

4. **Relevant external information**
   - news
   - earnings
   - corporate/macro events

5. **Signal extraction**
   - what changed?
   - what agrees?
   - what disagrees?

6. **Research conclusion**
   - concise explanation
   - evidence supporting it
   - source references

---

# 5. What Makes Bitget rVue Different

The product should **cross-check information instead of merely collecting it.** 

### Case A — Confirmation
> The rToken move broadly agrees with the underlying stock and is accompanied by increased on-chain activity.

### Case B — Divergence (e.g., After-Hours)
> The rToken is materially outperforming the native stock's last closed price. The divergence is the notable observation and requires investigation.

### Case C — Weak evidence
> No meaningful divergence or unusual activity is currently evident.

**The system must be allowed to say "nothing significant."**

---

# 6. Data Architecture

```text
                ┌─────────────────┐
                │    rToken       │
                └────────┬────────┘
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
    Market Data      On-chain Data   Web/News Data
          │              │              │
          └──────────────┼──────────────┘
                         ↓
                Normalization Layer
                         ↓
                Comparison Engine
                         ↓
                 Evidence Package
                         ↓
                    Qwen / AI
                         ↓
                  Research Brief
```

**Code calculates. AI interprets.**

---

# 7. Important Calculations

## rToken/native-stock spread

```text
Spread % = ((rToken price - reference-adjusted stock value)
            / reference-adjusted stock value) × 100
```

The system must establish the correct reference relationship for each rToken. **Never compare two prices just because their tickers look related.**

---

# 8. Information Extraction

Ask the system:
> "Find information that materially changes the research picture."

The system should extract events such as:
- earnings releases
- major corporate announcements
- regulatory/macro events (including weekend news)
- unusual on-chain activity
- unusual rToken/native-stock divergence

---

# 9. Evidence Discipline

Every important claim should have a source. Distinguish between:

- **FACT:** rToken price increased 4.8%.
- **COMPUTED:** rToken outperformed the native stock by 3.6 percentage points.
- **INTERPRETATION:** The divergence may indicate token-specific demand.
- **UNKNOWN:** The available data does not establish the cause.

---

# 10. Role of Bitget/Qwen Credit

Qwen will be utilized strictly for context reasoning and development support, avoiding mathematical calculations. Its core implementations are:

1. **Market / news summarization:** Condensing verbose news and search results into readable bullet points.
2. **Sentiment and event analysis:** Categorizing whether off-chain macro events align with on-chain activity.
3. **Trading-signal reasoning:** Explaining *why* a divergence exists logically (e.g., weekend liquidity shifts) based solely on the Evidence Package.
4. **Research Q&A / workbench:** Driving the primary UI output of the research desk.
5. **Coding or data-processing assistance:** Aiding the developer in writing Node.js API wrappers, TypeScript schemas, and formatting the JSON Evidence Package.

---

# 11. Tech Stack

- **Backend:** Node.js, TypeScript, REST APIs
- **Frontend:** Next.js (App Router + route groups), TypeScript, Tailwind CSS v4 over a two-theme CSS custom-property token system (light + dark), liquid glass material for chrome only, `lucide-react` icons
- **AI / Reasoning:** Qwen through the hackathon-provided endpoint
- **Development Environment:** Google AI Pro tools for accelerating code generation and hackathon workflow orchestration
- **Web Intelligence:** External news and financial data APIs
- **Version control:** Git, GitHub (`bitget-rvue`)

---

# 12. Build Phases

## Phase 0 — Access & Environment
- Confirm core market APIs, Qwen, and basic wrappers before starting UI.

## Phase 1 — Pick One rToken
- Pick **one rToken** with reliable data and map it entirely. Then generalize.

## Phase 2 — Data Retrieval
- Structure deterministic data modules (`market/`, `onchain/`, `research/`).

## Phase 3 — Comparison Engine
- Calculate returns, spread, and divergence in code.

## Phase 4 — Research Retrieval
- Search via standard financial APIs for material developments affecting the specific asset in the last 48 hours.

## Phase 5 — Evidence Package
- Assemble the deterministic snapshot to feed into Qwen.

## Phase 6 — AI Research Layer
- Qwen receives the package and synthesizes the signal reasoning.

## Phase 7 — Dashboard
- Build the three surfaces around the research output: the liquid glass **landing page**, the **AI chat desk**, and the **rToken board/report**. All three share one app shell (sidebar with new chat, recent chats, and a link to the full rToken list/report) and one light/dark theme system.
- Authoritative detail - routes, shell, tokens, glass tiers, component inventory, API contracts and step order - lives in `Bitget_rVue_Frontend_Spec.md`.

---

# 13. Phase 7 — The Three Surfaces

The dashboard is no longer a single page. It is three surfaces sharing one design system. Authoritative detail lives in `Bitget_rVue_Frontend_Spec.md`; this section keeps the product-level shape.

## S1 — Landing page (`/`)

A liquid glass marketing surface. Its job is to state the problem precisely and prove the product is live with real numbers.

```text
GLASS NAV      logo · how it works · evidence · theme toggle · [Open the desk]
HERO           "rTokens never close. Their underlying stocks do."
               live strip: universe · flagged · scan time · generated   (real /api/scan data only)
PROBLEM        24/7 token vs. frozen official close, using the worked +2.3pp example
PIPELINE       Fetch -> Align -> Compute -> Interpret
DISCIPLINE     FACT · COMPUTED · INTERPRETATION · UNKNOWN
GUARANTEE      Code calculates. AI interprets.  (+ what we are NOT building)
PREVIEW        top 5 flagged rows -> /rtokens
FOOTER         privacy · data sources · not investment advice · AI disclosure
```

No testimonials, no invented metrics, no generic AI imagery. If the live scan fails, the strip says so.

## S2 — AI chat desk (`/chat`, `/chat/[id]`)

```text
SIDEBAR        [New chat] · ⌘K search · rToken board link
               Recent chats grouped Today / Previous 7 days / Older
               footer: theme toggle · privacy
CONVERSATION   empty state: asset pin + suggested prompts answerable from the Evidence Package
               user bubble · assistant prose block (streaming, cited, stoppable)
               numbers panel under each answer, taken from the Evidence Package
               freshness stamp on every answer
EVIDENCE RAIL  FACT / COMPUTED / INTERPRETATION / UNKNOWN items with source + observedAt
COMPOSER       glass, autosizing, Enter to send, pinned rToken chip, inline error + retry
```

Conversations persist locally under a versioned key so the demo survives a reload. "No significant divergence detected" is a normal answer and renders as one.

## S3 — rToken board and report (`/rtokens`, `/rtokens/[rToken]`)

```text
BOARD          summary chips · filters · sortable dense table (opaque, never glass)
               sorted by |divergence| desc, tie-break 24h USDT volume
               row click -> report · "Research" action -> /chat?rToken=<rToken>
               honesty footer: rChg(a) definition, thresholds, suspect-pairing rule, volume caveat
REPORT         header: rToken · underlying · instrument type · exchange · contract/chain
               metric grid: rPrice · r24h · stock + market state · session anchor
                            spread% · divergence pp vs threshold · 24h volume · bid/ask · data age
               research brief (cited) · evidence package viewer · explicit gaps · actions
```

The board is the Tier-1 scanner already in production; the report is the Tier-2 per-asset brief.

## Asset snapshot (unchanged intent, now tokenized)

```text
rToken        +4.8%
Underlying    +1.2% (Closed)
Divergence    +3.6pp
```

## Research block

```text
WHAT CHANGED
...
WHY IT MATTERS (Signal Reasoning)
...
UNCERTAINTY
...
```

Every figure above renders from the Evidence Package in `--mono`. The model supplies the prose, never the numbers.

---

# 14. The Demo

The demo should tell one story:
1. Open `/` and point at the live strip: the full rToken universe, scanned, with the current flagged count.
2. Open the desk and pin an rToken from the flagged top of the board.
3. Ask the question: "Is this rToken agreeing with its underlying, and what changed?"
4. Show the evidence being gathered: Bitget tickers, Yahoo quotes, and the window alignment to the previous official close.
5. Highlight the specific divergence (e.g., weekend price movement against a frozen close).
6. Let Qwen explain the signal, with every claim cited back to a tagged Evidence Package item.
7. Flip to light mode mid-demo to show a real product rather than a prototype.
8. Return to `/rtokens` to prove the reasoning generalizes across the whole universe.
9. **Thesis Statement:** "Bitget rVue does not tell the user what to trade. It gives them the evidence they need to decide."

---

# 15. What We Are NOT Building

- No autonomous trading
- No generic chatbot ("Ask ChatGPT about stocks")
- No AI-generated numbers or fake prediction accuracy

---

# 16. Ruthless Stress Tests

- **Stale Data:** Show freshness timestamps.
- **Missing Data:** System must continue and mark the gap.
- **No Signal:** System must output "No significant divergence detected."
- **AI Hallucination:** Every factual claim must trace to the Evidence Package.

---

# 17. Success Criteria

The demo proves that Bitget rVue retrieves, compares, cross-checks, and explains fragmented 24/7 crypto data alongside traditional stock data to produce a reliable research brief.

---

# 18. Timeline

- **Days 1-2:** APIs, access, one test rToken, and raw data layers.
- **Days 3-4:** Comparison engine and external news retrieval.
- **Days 5-6:** Qwen integration and Dashboard build.
- **Days 7-9:** End-to-end testing, error handling, stress testing, and demo prep.

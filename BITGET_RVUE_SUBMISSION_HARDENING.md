# Bitget rVue — Final Hackathon Hardening & Submission Readiness

## Purpose

This document is the **execution specification** for hardening the existing **Bitget rVue** project for hackathon submission.

Do not rebuild the product from scratch.

Do not merely describe problems.

**Audit → understand → implement → test → verify → fix remaining issues.**

The goal is a reliable, demonstrable, evidence-grounded product.

---

## 1. Product Context

**Product:** Bitget rVue

**Hackathon track:** AI Trading Desk

**Sub-theme:** Information Extraction & Signal Generation

### Core thesis

rVue is an AI-powered research desk for tokenized U.S. equities (rTokens).

rTokens trade 24/7 while their underlying U.S. equities trade during defined market sessions. This can create meaningful divergence between an rToken and its underlying stock, especially around news, announcements, earnings, macro events, and other market-moving information.

rVue helps a human researcher understand that divergence using:

- rToken market data
- underlying-stock market data
- session/time alignment
- deterministic divergence calculations
- on-chain data
- external research/news
- evidence-backed Qwen reasoning

rVue is a **research and intelligence system**, not an autonomous trading system.

### Intended workflow

```text
USER SELECTS rTOKEN
        ↓
IDENTIFY UNDERLYING STOCK
        ↓
FETCH MARKET DATA
        ↓
FETCH ON-CHAIN DATA
        ↓
ALIGN rTOKEN WITH UNDERLYING STOCK SESSION
        ↓
DETERMINISTICALLY CALCULATE DIVERGENCE
        ↓
SEARCH RELEVANT EXTERNAL INFORMATION
        ↓
BUILD VERIFIED EVIDENCE PACKAGE
        ↓
QWEN INTERPRETS THE EVIDENCE
        ↓
STRUCTURED RESEARCH BRIEF
        ↓
HUMAN MAKES FINAL DECISION
```

---

# 2. Non-Negotiable Architecture Principle

## CODE CALCULATES. AI INTERPRETS.

Deterministic application code is responsible for:

- prices
- percentage changes
- previous official close
- session alignment
- divergence
- spreads
- thresholds
- timestamps
- volume
- on-chain metrics
- freshness
- anomaly flags

Qwen is responsible for interpreting a **verified evidence package**.

Qwen must not become the source of truth for numerical market data.

Do not let Qwen independently invent, estimate, or "fill in" market values.

---

# 3. Anti-Hallucination Requirements

Truthfulness is more important than completeness.

If data is unavailable:

> Do not guess.

If a source fails:

> Do not invent a replacement value.

If two sources disagree:

> Do not silently choose one.

If a timestamp cannot be verified:

> Do not present the value as current.

If an rToken → underlying mapping cannot be verified:

> Do not infer it from ticker similarity alone.

If evidence is insufficient:

> Do not manufacture a signal.

If Qwen cannot support a conclusion from the evidence:

> Explicitly state that the evidence is insufficient.

A valid result is:

**NO MATERIAL SIGNAL**

or:

**INSUFFICIENT EVIDENCE**

This behavior is a product feature, not a failure.

---

# 4. Phase 1 — Audit the Existing Codebase

Before modifying anything:

1. Inspect the entire repository.
2. Understand the existing architecture.
3. Locate:
   - frontend
   - backend/API routes
   - market-data providers
   - rToken mapping
   - on-chain integration
   - research/news integration
   - Qwen integration
   - evidence package
   - research brief schema
   - loading states
   - empty states
   - error states
   - environment variables
   - deployment configuration
4. Trace data from source → backend → calculation → evidence → AI → UI.
5. Search for:
   - mock data
   - hardcoded values
   - placeholder values
   - fake signals
   - fake news
   - fake timestamps
   - dead integrations
   - broken routes
   - silent fallbacks
   - client-side secrets
6. Identify root causes rather than symptoms.

**Do not stop after creating an audit report. Implement the fixes.**

---

# 5. rToken Board

The rToken board is a core product surface.

It must not remain stuck in an indefinite:

> Synchronizing live universe

state.

Investigate the actual reason for any synchronization failure and fix it.

Do not mask the problem with hardcoded demo data.

For each available rToken, display as much of the following as the providers genuinely support:

- rToken symbol/name
- underlying stock
- rToken price
- underlying reference price
- rToken percentage change
- underlying percentage change
- divergence
- spread where applicable
- volume where available
- timestamp
- freshness/status
- signal/flag status
- research action

If a field cannot be obtained:

**Unavailable**

is preferable to a fabricated value.

---

# 6. Data Freshness

Every important data component must communicate freshness.

Use appropriate timestamps for:

- rToken market data
- underlying reference data
- on-chain data
- external research
- AI research generation

Do not call delayed/stale data "LIVE".

When the underlying market is closed, clearly explain that its reference value is the most recent valid official/session close.

This is central to the rVue thesis.

---

# 7. rToken → Underlying Mapping

Audit the mapping implementation.

Do not rely only on ticker-name similarity.

Where available, the mapping should explicitly contain:

- rToken identifier
- underlying symbol
- underlying company/security
- chain
- contract/address
- mapping source
- mapping status

If the mapping cannot be verified:

**Underlying mapping unverified**

and do not perform a misleading comparison.

---

# 8. Divergence Engine

Divergence must be calculated deterministically.

Conceptually:

```text
rToken change
-
underlying aligned change
=
divergence
```

Do not allow Qwen to calculate this.

The UI should make the calculation understandable.

Example:

```text
rToken:       +4.21%
Underlying:   +1.37%
Divergence:   +2.84 percentage points
```

Clearly distinguish:

- percentage change
- percentage-point divergence

Do not confuse the two.

---

# 9. Signal Generation

Signals must originate from deterministic rules and verified evidence.

Reasonable states include:

- NORMAL
- WATCH
- MATERIAL DIVERGENCE
- DATA ISSUE
- INSUFFICIENT EVIDENCE

Avoid sensational language.

A material divergence should explain:

- rToken change
- underlying change
- divergence
- configured threshold
- relevant timing
- evidence available for investigation

Do not automatically turn a divergence into:

- BUY
- SELL
- PROFIT OPPORTUNITY

unless the existing documented product logic explicitly supports such language.

The default output should remain research-oriented.

---

# 10. End-to-End Research Pipeline

The research workflow must function end-to-end:

1. Identify rToken.
2. Identify/verify underlying.
3. Retrieve market context.
4. Retrieve on-chain context.
5. Determine relevant time window.
6. Search external information.
7. Filter information by relevance and time.
8. Construct evidence package.
9. Validate evidence.
10. Send evidence package to Qwen.
11. Validate Qwen structured response.
12. Render research brief.

Do not send unsupported claims to Qwen.

---

# 11. Qwen Reasoning Rules

Qwen should be explicitly instructed that:

> You are a financial research reasoning engine. You are not the source of market data. You must reason only from the supplied evidence package.

Rules:

1. Never invent a number.
2. Never invent a source.
3. Never invent a timestamp.
4. Never claim an event occurred without evidence.
5. Never infer causation from correlation alone.
6. Distinguish FACT from INTERPRETATION.
7. Explicitly report conflicting evidence.
8. Explicitly report insufficient evidence.
9. Never fill missing fields with guesses.
10. Never create fake citations.
11. Every factual claim must reference evidence IDs.
12. Do not provide unsupported BUY/SELL instructions.
13. Do not independently recalculate deterministic metrics when trusted values are supplied.
14. Preserve uncertainty.
15. Prefer UNKNOWN over speculation.

Use strict structured output validation.

If Qwen returns malformed JSON, unsupported citations, or invalid claims:

- reject or safely repair the response
- do not silently render it as trusted research

---

# 12. Evidence Model

Preserve and strengthen the existing evidence architecture.

Evidence should contain, where available:

- evidence ID
- source name
- source URL
- source type
- retrieved timestamp
- publication timestamp
- relevant excerpt/summary
- data timestamp
- claim supported

Classify information as:

### FACT
Directly supported by a source.

### COMPUTED
Produced deterministically by rVue.

### INTERPRETATION
Reasoning derived from the evidence.

### UNKNOWN
Could not be verified.

The UI should make these distinctions understandable.

Never present:

- INTERPRETATION as FACT
- UNKNOWN as FACT
- unsupported claims as verified evidence

---

# 13. Research Brief

The final research output should contain clear sections such as:

## Executive Summary
What changed?

## Market Context
rToken vs underlying.

## Divergence
Deterministic calculated values.

## On-Chain Context
Relevant verified observations.

## External Information
Relevant news/events.

## Signal
Why the system flagged or did not flag the asset.

## Interpretation
What the evidence may indicate.

## Risks / Uncertainties
What remains unknown or conflicting.

## Evidence
Clickable source-backed evidence.

## Human Decision
Clearly communicate that rVue provides research, not autonomous execution.

---

# 14. Required No-Signal Path

If there is no meaningful divergence:

```text
NO MATERIAL SIGNAL

Current data does not show a sufficiently significant divergence
or evidence-backed event.
```

Do not force Qwen to invent an explanation.

If evidence is insufficient:

```text
INSUFFICIENT EVIDENCE

Available sources do not provide enough verified information
to explain the observed movement.
```

This is an intentional product state.

---

# 15. Error Handling

Every external dependency needs:

- loading state
- success state
- empty state
- error state

Test:

- API timeout
- API unavailable
- invalid response
- empty response
- rate limit
- malformed data
- missing timestamp
- missing price
- missing underlying
- conflicting sources
- Qwen timeout
- Qwen malformed response
- research provider failure
- on-chain provider failure

Never leave the application permanently spinning.

Never silently replace failed live data with fake data.

---

# 16. Production Data Integrity

Search the entire repository for:

- mock prices
- fake market metrics
- hardcoded signals
- fake news
- fake on-chain activity
- fake timestamps
- placeholder values

If mock data is required for development:

- isolate it explicitly
- ensure production cannot silently use it

Production must show either:

1. verified data
2. clearly labeled unavailable data
3. a clear provider/data error

Never silently fabricate completeness.

---

# 17. Landing Page

Preserve the strongest rVue product thesis.

The landing page should quickly communicate:

### rVue
**Research intelligence for tokenized U.S. equities.**

Then:

> rTokens trade 24/7. Their underlying stocks don't. rVue detects resulting divergence and investigates what may explain it using market, on-chain, and external evidence.

Also emphasize:

## CODE CALCULATES. AI INTERPRETS.

Explain:

- market calculations are deterministic
- Qwen interprets verified evidence
- humans make final decisions

Avoid generic "AI-powered trading" marketing.

---

# 18. Demo-First UX

The judge should understand the product quickly.

Primary flow:

```text
SELECT rTOKEN
      ↓
COMPARE
      ↓
INVESTIGATE
      ↓
EXPLAIN
      ↓
VERIFY EVIDENCE
```

The Research/Investigate action should be obvious.

Do not bury the core workflow under unnecessary UI.

---

# 19. The "Magic Moment"

Create a clear path such as:

```text
rNVDA

rToken:       +4.21%
Underlying:   +1.37%
Divergence:   +2.84 pp

MATERIAL DIVERGENCE

[ Investigate ]
```

Then transition into:

1. deterministic market comparison
2. on-chain context
3. external evidence
4. Qwen interpretation
5. citations

The user/judge should immediately understand why rVue is different from a generic AI chatbot.

---

# 20. Visual Information Hierarchy

Prioritize:

1. rToken
2. divergence
3. underlying comparison
4. signal state
5. evidence
6. research explanation

Secondary information can be collapsed or placed lower.

Do not make the judge hunt for the important information.

---

# 21. Architecture Explanation

Keep the architecture understandable:

```text
INGEST
Bitget / market / on-chain / research sources
        ↓
ALIGN
Market-session + timestamp normalization
        ↓
CALCULATE
Deterministic divergence + anomaly detection
        ↓
EVIDENCE
Verified evidence package
        ↓
QWEN
Evidence-grounded reasoning
        ↓
RESEARCH BRIEF
Human-readable result
```

Reinforce:

**CODE CALCULATES. AI INTERPRETS.**

---

# 22. Security

Audit all secrets.

No API keys or credentials may exist in:

- source code
- frontend bundles
- Git
- screenshots
- logs
- client-side environment variables
- README examples

Server-side secrets only.

Check `.gitignore`.

Check production environment variables.

Search repository contents for:

- API keys
- bearer tokens
- provider credentials
- secret-looking strings

If a real secret is found in tracked files/history:

- remove it from the codebase
- do not expose it
- clearly report the issue

Never put credentials into the UI.

---

# 23. Performance and Reliability

Audit:

- unnecessary repeated API calls
- request deduplication
- caching
- safe parallel requests
- timeouts
- retry behavior
- provider rate limits
- loading performance

Do not sacrifice data correctness for speed.

---

# 24. External Research Quality

Prefer authoritative and relevant sources.

For each research source, capture where possible:

- title
- source
- URL
- publication time
- retrieval time

Do not treat search snippets alone as verified facts.

If source content cannot be verified:

mark it accordingly.

---

# 25. Do Not Overbuild

Do not add:

- autonomous trading
- portfolio management
- unnecessary ML
- fake prediction accuracy
- social feeds
- unrelated agents
- unnecessary dashboards
- gamification
- unrelated features

The objective is:

**A polished, reliable MVP demonstrating the rVue thesis extremely well.**

---

# 26. Judge Simulation

After implementation, simulate:

1. Fresh application load.
2. Understand what rVue does.
3. Open rToken board.
4. Confirm data loads.
5. Select one rToken.
6. Verify underlying mapping.
7. Verify deterministic divergence.
8. Verify timestamps/freshness.
9. Open Research/Investigate.
10. Verify on-chain evidence.
11. Verify external evidence.
12. Verify Qwen interpretation.
13. Trace factual claims to evidence IDs.
14. Verify source links.
15. Test no-signal scenario.
16. Test missing-data scenario.
17. Test provider failure.
18. Refresh application.
19. Repeat core workflow.
20. Confirm no permanent loading state.

Fix every failure discovered.

---

# 27. Automated Validation

After implementation:

1. Run existing tests.
2. Run lint.
3. Run type checking.
4. Run production build.
5. Fix relevant errors.
6. Inspect routes.
7. Verify primary workflow.
8. Verify environment handling.
9. Verify no secret leakage.
10. Verify production does not use accidental mock data.

Do not claim something works unless you actually tested it.

Do not fabricate test results.

---

# 28. Submission Checklist

## Product

- [ ] Landing page clearly explains rVue.
- [ ] rToken board loads available real data.
- [ ] rToken → underlying mapping is reliable.
- [ ] Divergence is deterministic.
- [ ] Session alignment works.
- [ ] On-chain data works or clearly reports unavailable.
- [ ] External research works or clearly reports unavailable.
- [ ] Qwen receives evidence rather than unsupported claims.
- [ ] Research brief is structured.
- [ ] Evidence is traceable.
- [ ] No hallucinated numbers.
- [ ] No fabricated sources.
- [ ] No forced signal.
- [ ] No permanent loading states.
- [ ] Error states work.
- [ ] Empty states work.
- [ ] No autonomous trading.

## Security

- [ ] No secrets in frontend.
- [ ] No secrets in repository.
- [ ] Environment variables are correct.
- [ ] Production credentials remain server-side.

## UX

- [ ] Judge understands product quickly.
- [ ] Main workflow is obvious.
- [ ] Divergence is visually prominent.
- [ ] Research action is obvious.
- [ ] Evidence is easy to inspect.
- [ ] AI interpretation is visually separated from factual data.

## Demo

- [ ] One rToken can complete the full workflow.
- [ ] Full workflow works from fresh load.
- [ ] Full workflow works after refresh.
- [ ] No manual state repair is required.
- [ ] No accidental fake/demo values appear.

---

# 29. Implementation Discipline

For every problem:

```text
FIND ROOT CAUSE
      ↓
FIX ROOT CAUSE
      ↓
TEST
      ↓
VERIFY
      ↓
FIX AGAIN IF NECESSARY
```

Do not paper over backend failures with hardcoded frontend values.

Do not make the UI appear functional when the underlying system is broken.

Do not rewrite functioning components without a reason.

Preserve working architecture unless the audit proves a change is necessary.

---

# 30. Final Report

When all work is complete, report:

## CHANGED
What you actually modified.

## FIXED
What was broken and the root-cause fix.

## VERIFIED
What you actually tested successfully.

## REMAINING
Only genuine unresolved issues caused by external credentials, provider availability, deployment configuration, or other external dependencies.

## SUBMISSION STATUS
State whether the application is technically ready for submission based strictly on what you were able to verify.

Do not claim submission readiness if critical functionality remains unverified.

---

# FINAL PRODUCT STANDARD

Do not optimize for looking impressive.

Optimize for being:

- correct
- demonstrable
- evidence-grounded
- transparent
- reliable
- understandable

The ideal demo should feel like:

> **rVue detected something unusual → showed the exact numbers → showed the evidence → Qwen interpreted the evidence → every factual claim can be independently verified → the human makes the decision.**

That is the product.

Do the implementation work directly in the existing repository.

# Bitget rVue: 24/7 Tokenized Market Intelligence Terminal

## 1. Project Description

### Core Hypothesis & Thesis
Traditional equity markets are constrained by an antiquated paradigm: they shut down every evening, weekend, and holiday. However, global crypto traders continue buying and selling tokenized stocks (rTokens) on Bitget 24/7. **Our thesis is that a structural dislocation exists between the frozen "official" stock price and the live tokenized price during off-hours.** When weekend geopolitical shocks, unseasonal earnings announcements, or macro events occur, rTokens react immediately. Because conventional trading terminals cannot natively map traditional session closes to continuous 24/7 crypto curves, traders miss these pricing anomalies. Bitget rVue bridges this gap by aligning the curves and identifying material divergence spreads in real-time.

### Target User
- **Crypto-native arbitrageurs and momentum traders** looking to capture alpha on tokenized equities during weekends and market closures.
- **Traditional finance (TradFi) analysts** seeking a live "synthetic pre-market" indicator of how a stock will open on Monday based on weekend crypto trading activity.
- **DeFi researchers** who require automated, evidence-backed intelligence that synthesizes off-hours price moves with corresponding news and on-chain capital flows.

### Product Value
Bitget rVue provides an automated intelligence layer that monitors the top 150 most liquid rTokens on Bitget. It eliminates the manual friction of comparing a frozen Nasdaq quote to a live Bitget orderbook. When an anomaly is detected (e.g., rTSLA is trading +2.5% higher than TSLA's Friday close), rVue instantly compiles on-chain holder data, transfer velocities, and 48-hour news flows, delivering an AI-generated, hallucination-free research brief explaining *why* the spread exists.

---

## 2. Role of the LLM in the Project

The Language Model acts exclusively as the **Signal Reasoner and Summarizer**, strictly bounded by a deterministic evidence pipeline.

- **Specific Model Used:** Bitget's Qwen API (`qwen3.8-max`).
- **Utilization Breakdown:**
  1. **Signal Reasoning:** When a trader queries a diverging asset, rVue's backend programmatically fetches hard data (Bitget orderbook, Blockscout on-chain transfers, Yahoo Finance quotes, Google/Yahoo News). 
  2. **Hallucination Prevention (The Evidence Package):** The LLM is fed a structured JSON `EvidencePackage`. It is strictly instructed *never* to invent numbers, scrape the web, or infer pricing. It must simply interpret the provided data packet.
  3. **Output Formatting:** The LLM streams a structured JSON brief (Summary, What Changed, Why It Matters, Risks, Key Signals) back to the UI.
  4. **Post-Generation Audit:** Our custom backend deterministic engine parses the LLM's output. It verifies that every citation resolves to a real Evidence ID and audits all numbers to ensure the LLM hasn't hallucinated a price or threshold.

---

## 3. Submission Details

- **Track Selection:** AI Trading Desk
- **Sub-theme Selection:** Open Theme (Market Anomaly Detection)
- **Submission Materials:** 
  - Repository: [https://github.com/Sijucrypt/Bitget-rVue](https://github.com/Sijucrypt/Bitget-rVue)
  - *Note: Add your Vercel Live Demo Link and Video Link here.*

---

## 4. Getting Started / Local Development

### Prerequisites
- Node.js (v18+)
- A Bitget Qwen API key

### Installation

```bash
# Clone the repository
git clone https://github.com/Sijucrypt/Bitget-rVue.git
cd Bitget-rVue

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Add your QWEN_API_KEY to the .env file

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Tech Stack
- **Frontend:** Next.js (App Router), Tailwind CSS v4, Lucide React
- **Backend:** Node.js, Vercel Serverless Functions
- **AI/LLM:** Bitget Qwen API (`qwen3.8-max`)
- **Market Data:** Bitget API, Yahoo Finance, Blockscout (Arbitrum/Morph)

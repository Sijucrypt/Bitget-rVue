# Bitget rVue

**Bitget rVue** is an AI-powered terminal designed to capture the structural dislocation between 24/7 global crypto markets and traditional equity market hours. When Wall Street closes, tokenized stocks (rTokens) continue to trade continuously on Bitget. rVue identifies, explains, and evaluates these after-hours pricing divergences.

## What it is

Traditional equity markets shut down every evening, weekend, and holiday. Meanwhile, tokenized assets react to weekend geopolitical shocks, earnings announcements, and macro events immediately. This creates a significant structural divergence: the "official" price is frozen, but the live tokenized price is moving.

**Bitget rVue** serves as the intelligence layer for these moments. It scans the entire Bitget rToken universe against Yahoo Finance underlying quotes to find material spread dislocations, then uses Bitget’s Qwen AI to investigate the cause—enforcing strict anti-hallucination protocols so the AI relies exclusively on verifiable on-chain data and recent news.

## How it works

The system operates in a strict, two-tier architecture:

1. **Deterministic Scanning (Tier 1):** 
   - rVue continuously scans the top 150 most liquid rTokens on Bitget.
   - It aligns the 24h rolling crypto window with the underlying asset's *previous official close*, preventing time-window distortions.
   - It calculates the exact divergence spread (e.g., `rTSLA` vs `TSLA`).
   - Divergences exceeding strict thresholds (±0.75pp for equities, ±0.50pp for ETFs) are automatically flagged.

2. **AI-Driven Interpretation (Tier 2):**
   - When a trader investigates a flagged asset, the backend builds an **Evidence Package**. This package contains raw on-chain metrics (via Blockscout), news flow (last 48 hours), and precise market quotes.
   - This package is fed to **Bitget's Qwen AI** model with a rigid, non-negotiable prompt: *The AI must interpret the provided numbers, never invent them.*
   - Before the AI's response reaches the user, rVue's backend validates that every citation resolves to a real evidence ID and every number in the text matches the source data.

## Key Features

- **Live Divergence Board:** Telemetry tracking the highest-volume rTokens, surfacing real-time spreads against off-hours stock prices.
- **Evidence-Backed AI Chat:** Ask Qwen why an asset is moving. The AI's conclusions are deeply cited, and if it attempts to hallucinate data, the system explicitly warns the user.
- **Liquid Glass Interface:** A performant, ambient Next.js frontend built with tokenized theming (Dark & Light modes) that focuses entirely on data clarity. 

## Getting Started

### Prerequisites
- Node.js (v18+)
- A Bitget Qwen API key
- (Optional) Local DoH setup if your ISP blocks exchange API resolution.

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

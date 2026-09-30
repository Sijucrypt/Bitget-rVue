"""
Generate voiceover segments for the Bitget rVue demo video using edge-tts.
Each segment is timed to match the corresponding scene in the recording.
"""
import asyncio
import edge_tts
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "demo-recording")

# Voice: professional male narrator
VOICE = "en-US-GuyNeural"
RATE = "-5%"  # slightly slower for clarity

# Voiceover segments timed to match the Playwright recording scenes
SEGMENTS = [
    # Scene 1: Landing page (~8s of scrolling, 4 screenshots at ~2s each)
    (
        "01_landing",
        "Traditional equity markets close every evening and weekend. "
        "But on Bitget, tokenized stocks trade twenty-four seven. "
        "Bitget r-Vue captures the structural pricing gap between frozen Wall Street quotes "
        "and live r-Token prices, powered by deterministic math and Qwen AI."
    ),
    # Scene 2: Board (~8s)
    (
        "02_board",
        "The divergence board scans the top one hundred and fifty most liquid r-Tokens by volume. "
        "Each row aligns the live Bitget price against the underlying stock's previous official close, "
        "and flags material spreads exceeding our calibrated thresholds."
    ),
    # Scene 3: Chat desk (~50s)
    (
        "03_chat",
        "When a trader investigates a flagged asset, r-Vue builds an Evidence Package. "
        "It pulls live Bitget orderbook data, forty-eight-hour news flows, "
        "and on-chain transfer data from Blockscout. "
        "Bitget's Qwen AI model interprets this package under strict anti-hallucination rules. "
        "Every citation must resolve to a real evidence item. "
        "Every number is audited against the source data before reaching the user. "
        "The Evidence Rail on the right shows the raw deterministic facts: "
        "market comparison, on-chain activity, and recent news headlines."
    ),
    # Scene 4: Light theme (~2s)
    (
        "04_theme",
        "Both dark and light themes are fully supported. "
        "Bitget r-Vue. Code calculates. AI interprets. "
        "Built for the Bitget AI Hackathon, Season Two."
    ),
]

async def generate_segments():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, text in SEGMENTS:
        out_path = os.path.join(OUT_DIR, f"vo_{name}.mp3")
        print(f"  Generating {name}...")
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(out_path)
        print(f"  [OK] {out_path}")

async def main():
    print("[MIC] Generating voiceover segments...")
    await generate_segments()
    print("\n[OK] All voiceover segments generated!")
    print(f"   Output directory: {OUT_DIR}")

if __name__ == "__main__":
    asyncio.run(main())

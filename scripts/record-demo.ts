// scripts/record-demo.ts
// Automated demo walkthrough using Playwright — captures screenshots + video.
// Usage: npx playwright install chromium && npx tsx scripts/record-demo.ts
// Requires the dev server to be running on localhost:3000

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.DEMO_URL || "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "demo-recording");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: OUT_DIR,
      size: { width: 1440, height: 900 },
    },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  async function screenshot(name: string) {
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false });
    console.log(`  ✓ ${name}.png`);
  }

  async function wait(ms: number) {
    await page.waitForTimeout(ms);
  }

  // ─── Scene 1: Landing Page ─────────────────────────────────────────
  console.log("\n🎬 Scene 1: Landing Page");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await wait(2000);
  await screenshot("01_landing_hero");

  // Scroll down to show live scanner telemetry strip
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await wait(1500);
  await screenshot("02_landing_scanner_strip");

  // Scroll to problem section
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await wait(1500);
  await screenshot("03_landing_problem");

  // Scroll to pipeline / evidence discipline
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: "smooth" }));
  await wait(1500);
  await screenshot("04_landing_pipeline");

  // ─── Scene 2: Divergence Board ─────────────────────────────────────
  console.log("\n🎬 Scene 2: Divergence Board");
  await page.goto(`${BASE}/rtokens`, { waitUntil: "networkidle" });
  await wait(3000); // Let scan load
  await screenshot("05_board_overview");

  // Wait for data to populate
  await page.waitForSelector("table tbody tr", { timeout: 30000 }).catch(() => {});
  await wait(2000);
  await screenshot("06_board_with_data");

  // Scroll the table to see more rows
  await page.evaluate(() => {
    const table = document.querySelector("table");
    if (table) table.scrollTop += 300;
  });
  await wait(1000);
  await screenshot("07_board_scrolled");

  // ─── Scene 3: Chat Desk ─────────────────────────────────────────────
  console.log("\n🎬 Scene 3: AI Chat Desk");
  await page.goto(`${BASE}/chat?rToken=rTSLA`, { waitUntil: "networkidle" });
  await wait(2000);
  await screenshot("08_chat_empty_state");

  // Click suggested prompt if available
  const suggestedBtn = page.locator("button").filter({ hasText: /diverging|Compare|changed/i }).first();
  if (await suggestedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await suggestedBtn.click();
    console.log("  → Clicked suggested prompt");
    await wait(3000);
    await screenshot("09_chat_streaming_start");

    // Wait for the AI to stream a response
    await wait(15000);
    await screenshot("10_chat_response_partial");

    await wait(30000);
    await screenshot("11_chat_response_complete");
  } else {
    console.log("  ⚠ No suggested prompt found, typing manually");
    const composer = page.locator("textarea, input[type=text]").first();
    if (await composer.isVisible({ timeout: 2000 }).catch(() => false)) {
      await composer.fill("Why is rTSLA diverging from TSLA's last official close?");
      await wait(500);
      await screenshot("09_chat_typed_prompt");

      // Submit
      const submitBtn = page.locator('button[type="submit"], button:has(svg)').last();
      await submitBtn.click().catch(() => {
        composer.press("Enter");
      });
      await wait(20000);
      await screenshot("10_chat_response");
    }
  }

  // ─── Scene 4: Theme toggle ─────────────────────────────────────────
  console.log("\n🎬 Scene 4: Light theme");
  // Try toggling theme
  const themeBtn = page.locator('button[aria-label*="theme" i], button:has(svg.lucide-sun), button:has(svg.lucide-moon)').first();
  if (await themeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await themeBtn.click();
    await wait(1500);
    await screenshot("12_light_theme");
  }

  // ─── Wrap up ────────────────────────────────────────────────────────
  console.log("\n✅ Demo recording complete!");
  console.log(`   Screenshots saved to: ${OUT_DIR}/`);

  await context.close(); // This saves the video
  await browser.close();

  // Find the video file
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith(".webm"));
  if (files.length > 0) {
    const videoPath = path.join(OUT_DIR, files[files.length - 1]);
    const finalPath = path.join(OUT_DIR, "bitget-rvue-demo.webm");
    fs.renameSync(videoPath, finalPath);
    console.log(`   Video saved to: ${finalPath}`);
  }
}

main().catch((err) => {
  console.error("Demo recording failed:", err);
  process.exit(1);
});

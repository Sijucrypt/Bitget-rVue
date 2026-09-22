import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MessageSquare, LayoutDashboard, ShieldCheck, Activity } from "lucide-react";
import type { ScanSummary } from "@/lib/scanner/scan";

interface HeroProps {
  scan: ScanSummary | null;
  scanLoading?: boolean;
}

export function Hero({ scan, scanLoading = false }: HeroProps) {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        {/* Hackathon Track Tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-medium text-brand mb-6 backdrop-blur-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          <span>Bitget AI Hackathon S2 · AI Trading Desk Track</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-text sm:text-6xl sm:leading-[1.15]">
          rTokens never close. <br />
          <span className="bg-gradient-to-r from-brand via-accent to-brand bg-clip-text text-transparent">
            Their underlying stocks do.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Tokenized U.S. equities trade 24/7 on Bitget while Wall Street sleeps.
          Bitget rVue compares every live rToken against its U.S. underlying,
          anchored to the previous official close, then explains the divergence with sourced evidence.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-accent-contrast shadow-md hover:bg-brand/90 transition-all hover:shadow-brand/20"
          >
            <Icon icon={MessageSquare} size={16} />
            <span>Open the research desk</span>
          </Link>
          <Link
            href="/rtokens"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text shadow-xs hover:bg-surface-raised transition-colors"
          >
            <Icon icon={LayoutDashboard} size={16} />
            <span>See the divergence board</span>
          </Link>
        </div>

        {/* Live Stat Strip */}
        <div className="mx-auto mt-12 flex max-w-3xl flex-col sm:flex-row items-center justify-center gap-3">
          <div className="glass glass-2 flex items-center justify-center gap-4 rounded-xl px-5 py-3 text-xs sm:text-sm">
            {scanLoading ? (
              <span className="text-muted flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                Synchronizing live market data...
              </span>
            ) : scan ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <span className="font-mono text-tertiary">UNIVERSE: <strong className="text-text tabular-nums">{scan.universe}</strong></span>
                  <span className="hidden sm:inline text-border">|</span>
                  <span className="font-mono text-tertiary">FLAGGED: <strong className="text-warning tabular-nums">{scan.flagged}</strong></span>
                  <span className="hidden sm:inline text-border">|</span>
                  <span className="font-mono text-tertiary">SCAN TIME: <strong className="text-text tabular-nums">{scan.durationMs}ms</strong></span>
                  <span className="hidden sm:inline text-border">|</span>
                  <span className="font-mono text-tertiary" title={new Date(scan.generatedAt).toLocaleString()}>GENERATED: <strong className="text-text">{new Date(scan.generatedAt).toLocaleTimeString()}</strong></span>
                </div>
              </>
            ) : (
              <span className="text-muted flex items-center gap-1.5 font-mono">
                <Icon icon={Activity} size={14} className="text-warning" />
                Live data unavailable
              </span>
            )}
          </div>
        </div>

        {/* Core Principle Callout */}
        <div className="mt-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-wide font-medium text-tertiary">
          <Icon icon={ShieldCheck} size={14} className="text-positive" />
          <span>Code calculates, AI interprets</span>
        </div>
      </div>
    </section>
  );
}

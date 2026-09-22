import { Icon } from "@/components/ui/Icon";
import { Zap, Activity } from "lucide-react";

export function ProblemSection() {
  return (
    <section id="problem" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <span className="rounded-md border border-brand/20 bg-brand/10 px-2.5 py-1 font-mono text-xs font-medium text-brand">
            The Structural Dislocation
          </span>

          <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            When underlying stock exchanges close, tokenized assets continue to trade.
          </h2>

          <p className="text-sm leading-relaxed text-muted">
            Traditional equity markets shut down every evening, weekend, and holiday.
            Meanwhile, global crypto traders continue buying and selling tokenized stocks on Bitget 24/7.
            When weekend geopolitical shocks, earnings announcements, or macro events occur, rTokens react immediately—creating
            significant price divergences that conventional terminals cannot model.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
              <div className="mt-0.5 rounded-lg bg-warning/15 p-1.5 text-warning">
                <Icon icon={Zap} size={16} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text">Session Anchor Alignment</h4>
                <p className="text-xs text-muted mt-0.5">
                  Both rToken and equity are measured against the underlying’s official previous close, preventing rolling-window distortions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
              <div className="mt-0.5 rounded-lg bg-brand/15 p-1.5 text-brand">
                <Icon icon={Activity} size={16} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text">Multi-Chain On-Chain Auditing</h4>
                <p className="text-xs text-muted mt-0.5">
                  Verifies actual token transfer velocities, holder distribution, and smart contract health on Arbitrum and Morph.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Architecture Card */}
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-lg sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="font-mono text-xs font-semibold text-text uppercase">
              Divergence Anatomy
            </span>
            <span className="rounded bg-positive/15 px-2 py-0.5 font-mono text-[10px] text-positive font-medium">
              Calibrated Engine
            </span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="rounded-lg bg-surface-raised p-3 border border-border/60 flex justify-between items-center">
              <span className="text-muted">NYSE / Nasdaq State</span>
              <span className="text-warning font-semibold">CLOSED (Official Session Frozen)</span>
            </div>

            <div className="rounded-lg bg-surface-raised p-3 border border-border/60 flex justify-between items-center">
              <span className="text-muted">Bitget rToken Orderbook</span>
              <span className="text-positive font-semibold">ACTIVE 7x24 Continuous</span>
            </div>

            <div className="rounded-lg bg-surface-raised p-3 border border-border/60 flex justify-between items-center">
              <span className="text-muted">Divergence Calculation</span>
              <span className="text-text font-bold">alignedRChangePct - stockChangePct</span>
            </div>

            <div className="rounded-lg bg-surface-raised p-3 border border-border/60 flex justify-between items-center">
              <span className="text-muted">Divergence Flags</span>
              <span className="text-brand font-semibold">Equities: ±0.75pp · ETFs: ±0.50pp</span>
            </div>
          </div>

          <p className="text-[11px] text-tertiary">
            * Extreme spreads &ge;50% are automatically quarantined as mispairings rather than trade signals.
          </p>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ShieldAlert, ArrowRight } from "lucide-react";

export function Guarantees() {
  return (
    <section className="border-t border-border bg-gradient-to-b from-surface/40 to-bg px-4 py-20 sm:px-6 lg:px-8 text-center">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand shadow-xs">
          <Icon icon={ShieldAlert} size={24} />
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
          Mandatory Human-in-the-Loop
        </h2>

        <p className="text-sm leading-relaxed text-muted max-w-xl mx-auto">
          Bitget rVue refuses to execute autonomous trades. All AI outputs terminate in structured briefs for human review, approval, and execution on Bitget.
        </p>

        <div className="pt-4 flex flex-wrap justify-center gap-4">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-accent-contrast shadow-md hover:bg-brand/90 transition-all"
          >
            <span>Launch Interactive Desk</span>
            <Icon icon={ArrowRight} size={15} />
          </Link>
          <Link
            href="/rtokens"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text shadow-xs hover:bg-surface-raised transition-colors"
          >
            <span>Browse rToken Universe</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

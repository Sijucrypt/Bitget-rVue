import { Icon } from "@/components/ui/Icon";
import { CheckCircle2, XCircle } from "lucide-react";

export function EvidenceDiscipline() {
  return (
    <section id="evidence" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-surface p-8 sm:p-12 border border-border shadow-sm">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Absolute Evidence Discipline
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              General-purpose AI agents hallucinate financial data. Bitget rVue is built on a 
              zero-trust architecture where the model is legally barred from doing math.
            </p>
            
            <ul className="space-y-4 mt-6">
              <li className="flex gap-3 text-sm text-text">
                <Icon icon={CheckCircle2} size={18} className="text-positive shrink-0 mt-0.5" />
                <span><strong className="font-semibold text-text">Strict JSON Schema:</strong> Model output is constrained to a typed <code>ResearchBrief</code>.</span>
              </li>
              <li className="flex gap-3 text-sm text-text">
                <Icon icon={CheckCircle2} size={18} className="text-positive shrink-0 mt-0.5" />
                <span><strong className="font-semibold text-text">Required Citations:</strong> Every claim must cite a valid `EvidenceItem.id`. Unresolved citations render as warnings.</span>
              </li>
              <li className="flex gap-3 text-sm text-text">
                <Icon icon={CheckCircle2} size={18} className="text-positive shrink-0 mt-0.5" />
                <span><strong className="font-semibold text-text">Client-Side Audit:</strong> The UI intercepts the AI payload and verifies every number against the original Evidence Package before rendering.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-negative/20 bg-negative/5 p-6 space-y-4">
            <h3 className="font-mono text-xs font-semibold text-negative uppercase tracking-wider">
              What Bitget rVue Refuses To Be
            </h3>
            
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-muted">
                <Icon icon={XCircle} size={16} className="text-negative shrink-0 mt-0.5" />
                <span>Not an automated trading bot. No autonomous execution.</span>
              </li>
              <li className="flex gap-3 text-sm text-muted">
                <Icon icon={XCircle} size={16} className="text-negative shrink-0 mt-0.5" />
                <span>No parsing of numbers out of unstructured LLM prose.</span>
              </li>
              <li className="flex gap-3 text-sm text-muted">
                <Icon icon={XCircle} size={16} className="text-negative shrink-0 mt-0.5" />
                <span>No fabricated accuracy or missing data interpolation.</span>
              </li>
              <li className="flex gap-3 text-sm text-muted">
                <Icon icon={XCircle} size={16} className="text-negative shrink-0 mt-0.5" />
                <span>Never measures 24/7 tokens against 9-to-5 daily windows.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/lib/ui/theme";
import { useScan } from "./ScanProvider";
import { Menu, RefreshCw } from "lucide-react";
import { fmtAge } from "@/lib/format";

interface TopbarProps {
  onOpenDrawer: () => void;
}

function crumbFor(pathname: string): { label: string; mono?: string } {
  if (pathname === "/rtokens") return { label: "rToken board" };
  const report = pathname.match(/^\/rtokens\/([^/]+)$/);
  if (report) return { label: "Report", mono: decodeURIComponent(report[1]) };
  if (pathname.startsWith("/chat")) return { label: "Chat desk" };
  return { label: "" };
}

export function Topbar({ onOpenDrawer }: TopbarProps) {
  const pathname = usePathname();
  const { summary, loading, rescan } = useScan();
  const isBoard = pathname === "/rtokens";
  const crumb = crumbFor(pathname);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="glass glass-1 flex h-14 shrink-0 items-center gap-3 border-b border-glass-border px-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        className="rounded-md p-2 text-muted hover:bg-surface-raised hover:text-text lg:hidden"
      >
        <Icon icon={Menu} size={18} />
      </button>

      <div className="flex min-w-0 items-baseline gap-2">
        {crumb.mono ? <span className="font-mono text-sm font-semibold text-text">{crumb.mono}</span> : null}
        <span className={"truncate text-sm " + (crumb.mono ? "text-muted" : "font-medium text-text")}>{crumb.label}</span>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {isBoard && summary ? (
          <span className="hidden font-mono text-xs text-tertiary sm:inline" title={"generated " + new Date(summary.generatedAt).toLocaleTimeString()}>
            generated {new Date(summary.generatedAt).toLocaleTimeString()} · {fmtAge(summary.generatedAt, now)} ago
          </span>
        ) : null}
        {isBoard ? (
          <button
            type="button"
            onClick={() => void rescan(true)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface-raised hover:text-text disabled:opacity-50"
          >
            <Icon icon={RefreshCw} size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{loading ? "Scanning" : "Rescan"}</span>
          </button>
        ) : null}
        <ThemeToggle />
      </div>
    </header>
  );
}
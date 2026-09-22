"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/lib/ui/theme";
import { RecentChats } from "./RecentChats";
import { useScan } from "./ScanProvider";
import { createConversation } from "@/lib/chat/store";
import { LayoutGrid, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onOpenPalette: () => void;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ collapsed, onOpenPalette, onToggleCollapsed }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { summary } = useScan();
  const flagged = summary ? summary.flagged : null;
  const boardActive = pathname === "/rtokens";

  function handleNewChat() {
    const conversation = createConversation();
    router.push("/chat/" + conversation.id);
  }

  const rail = collapsed ? "justify-center px-0" : "";

  return (
    <aside
      aria-label="Primary"
      className={
        "glass glass-1 flex h-full shrink-0 flex-col border-r border-glass-border transition-[width] duration-200 motion-reduce:transition-none " +
        (collapsed ? "w-14" : "w-64")
      }
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-glass-border px-3">
        <Link href="/rtokens" className="flex min-w-0 flex-1 items-center gap-2" aria-label="Bitget rVue home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={26} height={26} className="shrink-0 rounded-md" />
          {!collapsed && <span className="truncate text-sm font-semibold text-text">Bitget rVue</span>}
        </Link>
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            className="rounded-md p-1.5 text-tertiary transition-colors hover:bg-surface-raised hover:text-text"
          >
            <Icon icon={collapsed ? PanelLeftOpen : PanelLeftClose} size={16} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 p-2">
        <button
          type="button"
          onClick={handleNewChat}
          title="New chat (Ctrl+Shift+O)"
          className={"flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover " + rail}
        >
          <Icon icon={Plus} size={16} />
          {!collapsed && <span>New chat</span>}
        </button>

        <button
          type="button"
          onClick={onOpenPalette}
          title="Search (Ctrl+K)"
          className={"flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-surface-raised hover:text-text " + rail}
        >
          <Icon icon={Search} size={16} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search</span>
              <kbd className="rounded border border-border bg-surface px-1 font-mono text-[10px] text-tertiary">Ctrl K</kbd>
            </>
          )}
        </button>

        <Link
          href="/rtokens"
          aria-current={boardActive ? "page" : undefined}
          title="rToken board"
          className={
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm " +
            (boardActive ? "bg-surface-raised text-text" : "text-muted hover:bg-surface-raised hover:text-text") +
            " " + rail
          }
        >
          <Icon icon={LayoutGrid} size={16} />
          {!collapsed && <span className="flex-1">rToken board</span>}
          {!collapsed && flagged !== null ? (
            <span className="rounded-full bg-accent px-1.5 font-mono text-[11px] font-medium text-accent-contrast" title={flagged + " flagged"}>
              {flagged}
            </span>
          ) : null}
        </Link>
      </div>

      {!collapsed && (
        <div className="px-4 pt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary">Recent</div>
      )}
      <RecentChats collapsed={collapsed} />

      <div className="mt-auto shrink-0 border-t border-glass-border p-2">
        <div className={"flex items-center " + (collapsed ? "flex-col gap-2" : "justify-between")}>
          <ThemeToggle />
          {!collapsed && (
            <Link href="/privacy" className="text-xs text-tertiary hover:text-text">
              Privacy
            </Link>
          )}
        </div>
        {!collapsed && (
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-tertiary">
            Data: Bitget, Yahoo Finance, public block explorers.
          </p>
        )}
      </div>
    </aside>
  );
}

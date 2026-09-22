"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useScan } from "./ScanProvider";
import { createConversation, listConversations } from "@/lib/chat/store";
import { CornerDownLeft, LayoutGrid, MessageSquare, Plus, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PaletteItem {
  key: string;
  group: string;
  label: string;
  mono?: string;
  icon: LucideIcon;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { summary } = useScan();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      {
        key: "nav-new",
        group: "Actions",
        label: "New chat",
        icon: Plus,
        run: () => {
          const conversation = createConversation();
          router.push("/chat/" + conversation.id);
        },
      },
      { key: "nav-board", group: "Actions", label: "rToken board", icon: LayoutGrid, run: () => router.push("/rtokens") },
    ];
    if (summary) {
      for (const row of summary.rows) {
        list.push({
          key: "rt-" + row.rToken,
          group: "rTokens",
          label: row.rToken,
          mono: row.ticker,
          icon: Search,
          run: () => router.push("/rtokens/" + encodeURIComponent(row.rToken)),
        });
      }
    }
    for (const conversation of listConversations()) {
      list.push({
        key: "chat-" + conversation.id,
        group: "Chats",
        label: conversation.title,
        mono: conversation.rToken ?? undefined,
        icon: MessageSquare,
        run: () => router.push("/chat/" + conversation.id),
      });
    }
    return list;
  }, [summary, router, open]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const pool = q
      ? items.filter((it) => (it.label + " " + (it.mono ?? "")).toLowerCase().includes(q))
      : items;
    return pool.slice(0, 12);
  }, [items, q]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (active >= filtered.length) setActive(Math.max(0, filtered.length - 1));
  }, [filtered.length, active]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = filtered[active];
      if (item) {
        item.run();
        onClose();
      }
    } else if (event.key === "Tab") {
      event.preventDefault();
    }
  }

  if (!open) return null;

  const groups: string[] = [];
  for (const item of filtered) if (!groups.includes(item.group)) groups.push(item.group);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="glass glass-3 w-full max-w-lg overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-glass-border px-3">
          <Icon icon={Search} size={16} className="shrink-0 text-tertiary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search rTokens, chats, actions"
            aria-label="Search"
            className="h-12 w-full bg-transparent text-sm text-text placeholder:text-tertiary focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-glass-border px-1 font-mono text-[10px] text-tertiary">esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-sm text-tertiary">No matches.</p>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary">{group}</div>
                <ul>
                  {filtered
                    .filter((item) => item.group === group)
                    .map((item) => {
                      const index = filtered.indexOf(item);
                      const isActive = index === active;
                      return (
                        <li key={item.key}>
                          <button
                            type="button"
                            onMouseEnter={() => setActive(index)}
                            onClick={() => {
                              item.run();
                              onClose();
                            }}
                            className={
                              "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm " +
                              (isActive ? "bg-accent text-accent-contrast" : "text-text hover:bg-surface-raised")
                            }
                          >
                            <Icon icon={item.icon} size={15} className={isActive ? "" : "text-tertiary"} />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.mono ? (
                              <span className={"font-mono text-[11px] " + (isActive ? "text-accent-contrast" : "text-tertiary")}>{item.mono}</span>
                            ) : null}
                            {isActive ? <Icon icon={CornerDownLeft} size={14} /> : null}
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
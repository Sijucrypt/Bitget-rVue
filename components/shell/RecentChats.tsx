"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Pencil, Trash2 } from "lucide-react";
import {
  deleteConversation,
  listConversations,
  renameConversation,
} from "@/lib/chat/store";
import type { Conversation } from "@/lib/chat/types";
import { fmtAge } from "@/lib/format";

const DAY = 86400000;
const GROUPS = ["Today", "Previous 7 days", "Older"] as const;

function groupOf(updatedAt: number, now: number): (typeof GROUPS)[number] {
  const age = now - updatedAt;
  if (age < DAY) return "Today";
  if (age < 7 * DAY) return "Previous 7 days";
  return "Older";
}

export function RecentChats({ collapsed }: { collapsed: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const pathname = usePathname();

  useEffect(() => {
    const refresh = () => {
      setConversations(listConversations());
      setNow(Date.now());
    };
    refresh();
    window.addEventListener("rvue:chats", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("rvue:chats", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (collapsed) return null;

  if (conversations.length === 0) {
    return <p className="px-3 py-2 text-xs text-tertiary">No conversations yet.</p>;
  }

  const grouped = new Map<(typeof GROUPS)[number], Conversation[]>();
  for (const label of GROUPS) grouped.set(label, []);
  for (const conversation of conversations) grouped.get(groupOf(conversation.updatedAt, now))!.push(conversation);

  return (
    <nav aria-label="Recent chats" className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      {GROUPS.map((label) => {
        const items = grouped.get(label)!;
        if (items.length === 0) return null;
        return (
          <div key={label} className="mt-3">
            <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary">{label}</div>
            <ul className="flex flex-col gap-0.5">
              {items.map((conversation) => {
                const active = pathname === "/chat/" + conversation.id;
                return (
                  <li key={conversation.id} className="group relative">
                    <Link
                      href={"/chat/" + conversation.id}
                      aria-current={active ? "page" : undefined}
                      className={
                        "flex items-center gap-2 rounded-md px-2 py-1.5 pr-14 text-sm " +
                        (active ? "bg-surface-raised text-text" : "text-muted hover:bg-surface-raised hover:text-text")
                      }
                    >
                      <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                      {conversation.rToken ? (
                        <span className="font-mono text-[11px] text-tertiary">{conversation.rToken}</span>
                      ) : null}
                      <span className="font-mono text-[11px] text-tertiary">{fmtAge(conversation.updatedAt, now)}</span>
                    </Link>
                    <span className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded bg-surface-raised group-hover:flex">
                      <button
                        type="button"
                        aria-label={"Rename " + conversation.title}
                        className="rounded p-1 text-tertiary hover:text-text"
                        onClick={() => {
                          const next = window.prompt("Rename conversation", conversation.title);
                          if (next && next.trim()) renameConversation(conversation.id, next.trim());
                        }}
                      >
                        <Icon icon={Pencil} size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label={"Delete " + conversation.title}
                        className="rounded p-1 text-tertiary hover:text-negative"
                        onClick={() => {
                          if (window.confirm("Delete this conversation?")) deleteConversation(conversation.id);
                        }}
                      >
                        <Icon icon={Trash2} size={13} />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
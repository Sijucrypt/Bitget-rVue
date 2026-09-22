"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { ScanProvider } from "./ScanProvider";
import { createConversation } from "@/lib/chat/store";

const SIDEBAR_KEY = "rvue.sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      // storage unavailable - collapse state just will not persist
    }
  }, [collapsed]);

  // Keyboard map (spec section 3.3).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (mod && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        const conversation = createConversation();
        router.push("/chat/" + conversation.id);
      } else if (mod && !event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setCollapsed((value) => !value);
      } else if (event.key === "Escape") {
        setPaletteOpen(false);
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  // Close the drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Trap focus inside the mobile drawer while open.
  useEffect(() => {
    if (!drawerOpen) return;
    const node = drawerRef.current;
    if (!node) return;
    const focusables = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'),
      );
    focusables()[0]?.focus();
    function onTrap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const elements = focusables();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    node.addEventListener("keydown", onTrap);
    return () => node.removeEventListener("keydown", onTrap);
  }, [drawerOpen]);

  return (
    <ScanProvider>
      <div className="flex h-dvh overflow-hidden">
        <div className="hidden h-full lg:block">
          <Sidebar
            collapsed={collapsed}
            onOpenPalette={() => setPaletteOpen(true)}
            onToggleCollapsed={() => setCollapsed((value) => !value)}
          />
        </div>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-scrim backdrop-blur-[2px]"
              onClick={() => setDrawerOpen(false)}
            />
            <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Navigation" className="absolute inset-y-0 left-0 h-full">
              <Sidebar
                collapsed={false}
                onOpenPalette={() => {
                  setDrawerOpen(false);
                  setPaletteOpen(true);
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenDrawer={() => setDrawerOpen(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </ScanProvider>
  );
}

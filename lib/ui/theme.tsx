"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

// Hand-rolled theme system, ~40 lines, no dependency. The blocking inline
// script in app/layout.tsx sets data-theme before first paint (no flash);
// this provider hydrates from that same attribute and never writes a
// different value on mount. Resolution order lives in the inline script:
// explicit choice (localStorage rvue.theme) -> prefers-color-scheme -> dark.

export type Theme = "light" | "dark";

const STORAGE_KEY = "rvue.theme";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable (private mode) - the attribute still applies
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Align to the attribute if the inline script or another tab changed it;
  // read-only on mount, so it never fights the no-flash script.
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") setThemeState(current);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={"Switch to " + next + " theme"}
      title={"Switch to " + next + " theme"}
    >
      <span aria-hidden="true">{theme === "dark" ? "\u263E" : "\u2600"}</span>
      <span>{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
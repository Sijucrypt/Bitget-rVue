"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { fetchScan, type ScanSummary } from "@/lib/api/client";

// One shared scan per desk session. The sidebar (flagged badge), the topbar
// (freshness + rescan) and the board all read this, so /api/scan is never hit
// more than its 60s TTL allows (spec section 12).

interface ScanContextValue {
  summary: ScanSummary | null;
  loading: boolean;
  error: string | null;
  rescan: (force?: boolean) => Promise<void>;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const rescan = useCallback(async (force: boolean = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      setSummary(await fetchScan(force));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void rescan(false);
  }, [rescan]);

  const value = useMemo(
    () => ({ summary, loading, error, rescan }),
    [summary, loading, error, rescan],
  );
  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScan(): ScanContextValue {
  const ctx = useContext(ScanContext);
  if (ctx === null) throw new Error("useScan must be used within ScanProvider");
  return ctx;
}
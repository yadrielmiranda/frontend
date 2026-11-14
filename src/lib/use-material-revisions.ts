"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMaterialRevisions, type MaterialRevisionsData } from "@/app/api/material-revisions.api";

export function useMaterialRevisions(estimateId: number) {
  const [result, setResult] = useState<{ id: number; data: MaterialRevisionsData | null; failed: boolean } | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true;
    let revision = 0;
    const refresh = async () => {
      const request = ++revision;
      try {
        const data = await getMaterialRevisions(estimateId);
        if (alive && request === revision) setResult({ id: estimateId, data, failed: false });
      } catch {
        if (alive && request === revision) setResult({ id: estimateId, data: null, failed: true });
      }
    };
    refreshRef.current = () => { void refresh(); };
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    window.addEventListener("focus", refresh);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [estimateId]);
  const refresh = useCallback(() => refreshRef.current(), []);
  const current = result?.id === estimateId ? result : null;
  return { data: current?.data ?? null, failed: current?.failed ?? false, loading: !current, refresh };
}

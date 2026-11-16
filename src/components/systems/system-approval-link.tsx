"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import {
  getSystemInstallationApproval,
  type SystemInstallationApproval,
} from "@/app/api/systems.api";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ApprovalState = SystemInstallationApproval | { status: "loading" | "error" };
type BoundApproval = { systemId: number; attempt: number; value: ApprovalState };

function hasDocumentUrl(approval: SystemInstallationApproval): boolean {
  if (approval.status !== "available") return true;
  try {
    const url = new URL(approval.url);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function SystemApprovalLink({ systemId }: { systemId?: number | null }) {
  const selectedId = typeof systemId === "number" && Number.isSafeInteger(systemId) && systemId > 0
    ? systemId : null;
  const [attempt, setAttempt] = useState(0);
  const [bound, setBound] = useState<BoundApproval | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setBound({ systemId: selectedId, attempt, value: { status: "loading" } });
    void (async () => {
      try {
        const result = await getSystemInstallationApproval(selectedId);
        if (!hasDocumentUrl(result)) throw new Error("Invalid installation document URL");
        if (active) setBound({ systemId: selectedId, attempt, value: result });
      } catch {
        if (active) setBound({ systemId: selectedId, attempt, value: { status: "error" } });
      }
    })();
    return () => { active = false; };
  }, [selectedId, attempt]);

  // Hide the previous system's link immediately, before the next effect runs.
  const state: ApprovalState | null = selectedId
    ? bound?.systemId === selectedId && bound.attempt === attempt
      ? bound.value : { status: "loading" }
    : null;
  const available = state?.status === "available" ? state : null;
  const retry = state?.status === "error";
  const label = available
    ? `Open installation approval PDF (${available.variant}, ${available.approvalId}) in a new tab`
    : !selectedId ? "Select a system to view its installation approval"
    : state?.status === "loading" ? "Loading installation approval"
    : retry ? "Installation approval could not be loaded. Click to retry."
    : state?.status === "ambiguous" ? "An exact installation approval is not available for this system"
    : "No installation approval is available for this system";
  const iconClass = "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {available ? (
          <a
            href={available.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={`${iconClass} text-blue-600 hover:bg-blue-50 hover:text-blue-800`}
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : (
          <button
            type="button"
            aria-label={label}
            aria-disabled={!retry}
            aria-busy={state?.status === "loading"}
            onClick={retry ? () => setAttempt(value => value + 1) : undefined}
            className={`${iconClass} ${retry ? "text-slate-500 hover:bg-slate-100 hover:text-slate-700" : "cursor-default text-slate-400"}`}
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-72 text-center">{label}</TooltipContent>
    </Tooltip>
  );
}

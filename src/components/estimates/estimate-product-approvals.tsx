"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, FileCheck, FileText, FolderOpen, Landmark, Loader2 } from "lucide-react";
import { getSystemsApprovals, type SystemApprovals } from "@/app/api/systems.api";
import { Button } from "@/components/ui/button";

type ApprovalState =
  | { status: "loading" | "error" }
  | { status: "ready"; systems: SystemApprovals[] };
type BoundApprovals = { key: string; attempt: number; value: ApprovalState };

function documentUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? value.trim() : null;
  } catch {
    return null;
  }
}

function SystemDocuments({ system }: { system: SystemApprovals }) {
  const links = system.status === "available" ? [
    { label: "Installation instructions", url: documentUrl(system.installationUrl), Icon: FileText },
    { label: "Evaluation report", url: documentUrl(system.evaluationUrl), Icon: FileCheck },
    { label: "Official approval record", url: documentUrl(system.officialUrl), Icon: Landmark },
  ].filter(link => link.url) : [];

  return (
    <section className="border-t border-slate-200 py-4" aria-label={`${system.systemName} product approvals`}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{system.systemName}</h4>
        {system.status === "available" && system.variant && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{system.variant}</span>
        )}
      </div>
      <p className="mb-3 text-xs text-slate-500">{[system.brandName, system.productName].filter(Boolean).join(" · ")}</p>
      {links.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {links.map(({ label, url, Icon }) => (
            <Button key={label} asChild variant="outline" size="sm" className="h-auto min-h-10 justify-start whitespace-normal py-2 text-left text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-800 sm:min-h-9">
              <a href={url!} target="_blank" rel="noopener noreferrer" aria-label={`${label} — ${system.systemName} (opens in a new tab)`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
                <ExternalLink className="ml-auto h-3 w-3" aria-hidden="true" />
              </a>
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{system.status === "ambiguous"
          ? "An exact product approval is not available for this system."
          : "No product approval documents are available for this system."}</p>
      )}
    </section>
  );
}

export function EstimateProductApprovals({ pieces }: {
  pieces: readonly { idSyst?: number | null }[];
}) {
  const key = [...new Set(pieces.map(piece => piece.idSyst)
    .filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0))]
    .sort((a, b) => a - b).join(",");
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [bound, setBound] = useState<BoundApprovals | null>(null);

  useEffect(() => {
    if (!open || !key) {
      setBound(null);
      return;
    }
    let active = true;
    const ids = key.split(",").map(Number);
    setBound({ key, attempt, value: { status: "loading" } });
    void (async () => {
      try {
        const result = await getSystemsApprovals(ids);
        const systems = result.systems;
        if (!Array.isArray(systems) || systems.length !== ids.length
          || new Set(systems.map(system => system.systemId)).size !== ids.length
          || systems.some(system => !ids.includes(system.systemId))) {
          throw new Error("Incomplete system approvals response");
        }
        const ordered = [...systems].sort((a, b) => a.systemId - b.systemId);
        if (active) setBound({ key, attempt, value: { status: "ready", systems: ordered } });
      } catch {
        if (active) setBound({ key, attempt, value: { status: "error" } });
      }
    })();
    return () => { active = false; };
  }, [key, open, attempt]);

  // A changed selection must not display links from the previous request.
  const state: ApprovalState = bound?.key === key && bound.attempt === attempt
    ? bound.value : { status: "loading" };

  return (
    <details open={open} onToggle={event => setOpen(event.currentTarget.open)}
      className="group min-w-0 rounded-xl border border-blue-200 bg-white print:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-4 text-base font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
        <FolderOpen className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
        Product approvals
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 -rotate-90 transition-transform group-open:rotate-0" aria-hidden="true" />
      </summary>
      {open && (
        <div className="px-4 pb-1">
          {!key ? (
            <p className="border-t border-slate-200 py-4 text-sm text-slate-500">Add a piece to see its product approval documents.</p>
          ) : state.status === "loading" ? (
            <p role="status" className="flex items-center gap-2 border-t border-slate-200 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading product approvals…
            </p>
          ) : state.status === "error" ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 py-4">
              <p role="status" className="text-sm text-slate-500">Product approvals could not be loaded.</p>
              <Button type="button" size="sm" variant="outline" onClick={() => setAttempt(value => value + 1)}>Retry</Button>
            </div>
          ) : state.status === "ready" ? state.systems.map(system => <SystemDocuments key={system.systemId} system={system} />) : null}
        </div>
      )}
    </details>
  );
}

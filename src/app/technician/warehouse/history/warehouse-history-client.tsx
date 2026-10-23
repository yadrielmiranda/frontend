"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { Paged, WarehouseMovement } from "@/app/api/warehouse.api";
import { technicianMaterialHistory, technicianWarehouseHistory, type TechnicianMaterialMovement } from "@/app/api/technician-warehouse.api";
import { Pagination } from "@/app/warehouse/warehouse-shared";

type Kind = "pieces" | "materials";
const date = (value: string) => new Date(value).toLocaleString();

export function TechnicianWarehouseHistory({ actorId, initialPieces, initialMaterials }: {
  actorId: number; initialPieces: Paged<WarehouseMovement>; initialMaterials: Paged<TechnicianMaterialMovement>;
}) {
  const { user, revalidate } = useAuth();
  const [kind, setKind] = useState<Kind>("pieces");
  const [pieces, setPieces] = useState(initialPieces), [materials, setMaterials] = useState(initialMaterials);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const serial = useRef(0), lock = useRef(false);
  const identity = useRef({ id: user?.id, role: user?.role?.name });
  identity.current = { id: user?.id, role: user?.role?.name };
  const ownerMatches = user?.id === actorId && user?.role?.name === "technician";
  useEffect(() => () => { serial.current++; }, []);

  async function load(page: number) {
    if (lock.current || !ownerMatches) return;
    const request = ++serial.current;
    lock.current = true; setBusy(true); setError("");
    try {
      const account = await revalidate();
      if (account?.id !== actorId || account.role?.name !== "technician" ||
          identity.current.id !== actorId || identity.current.role !== "technician")
        throw new Error("Your account has changed. Reopen your release history.");
      const query = { page, pageSize: 20 };
      const result = kind === "pieces" ? await technicianWarehouseHistory(query) : await technicianMaterialHistory(query);
      if (request !== serial.current) return;
      if (identity.current.id !== actorId || identity.current.role !== "technician")
        throw new Error("Your account has changed. Reopen your release history.");
      if (kind === "pieces") setPieces(result as Paged<WarehouseMovement>);
      else setMaterials(result as Paged<TechnicianMaterialMovement>);
    } catch (e) {
      if (request === serial.current) setError(e instanceof Error ? e.message : "Unable to load your releases.");
    } finally {
      lock.current = false;
      if (request === serial.current) setBusy(false);
    }
  }

  if (!ownerMatches) return <p role="alert" className="rounded-xl border bg-white p-5 text-sm">Verify your technician account to view your releases.</p>;
  const current = kind === "pieces" ? pieces : materials;
  return <div className="space-y-5">
    <Button asChild variant="outline" className="min-h-11"><Link href="/technician"><ArrowLeft className="mr-2 h-4 w-4" />Back to portal</Link></Button>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-slate-950">My warehouse releases</h1>
      <Button variant="outline" disabled={busy} onClick={() => void load(current.page)}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </div>
    <div className="flex gap-2" role="group" aria-label="Release history type">
      <Button variant={kind === "pieces" ? "default" : "outline"} aria-pressed={kind === "pieces"} disabled={busy} onClick={() => { setKind("pieces"); setError(""); }}>Pieces</Button>
      <Button variant={kind === "materials" ? "default" : "outline"} aria-pressed={kind === "materials"} disabled={busy} onClick={() => { setKind("materials"); setError(""); }}>Materials</Button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <div className="space-y-3" aria-busy={busy}>
      {kind === "pieces" ? pieces.items.map(movement => <article key={movement.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{movement.customerDeliveryId ? "Delivered to customer" : "Released for installation"}</p><time className="text-xs text-slate-500" dateTime={movement.createdAt}>{date(movement.createdAt)}</time></div>
        <p>Line {movement.lineNumber} · {movement.quantity} {movement.quantity === 1 ? "part" : "parts"}</p>
        <p className="text-slate-600">From {movement.fromStore?.name ?? "Unassigned"}</p>
        {movement.partDetails?.partQuantities && <p className="text-xs text-slate-600">{Object.entries(movement.partDetails.partQuantities).filter(([, amount]) => Number(amount) > 0).map(([type, amount]) => `${amount} ${type === "UNKNOWN" ? "unspecified" : type.toLowerCase()}`).join(" · ")}</p>}
        {movement.installation && <p className="text-slate-600">Installation #{movement.installation.id}{movement.installation.address ? ` · ${movement.installation.address}` : ""}</p>}
        {movement.reversed && <p className="font-medium text-amber-800">This release was reversed.</p>}
        {movement.customerDeliveryId && <Link className="inline-block min-h-11 py-2 font-medium text-red-700 underline underline-offset-2" href={`/technician/customer-deliveries/${movement.customerDeliveryId}`}>View signed receipt #{movement.customerDeliveryId}</Link>}
      </article>) : materials.items.map(movement => <article key={movement.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{movement.product.name}</p><time className="text-xs text-slate-500" dateTime={movement.createdAt}>{date(movement.createdAt)}</time></div>
        <p>{movement.quantity} {movement.presentation?.name ?? "units"}</p>
        <p className="text-slate-600">From {movement.store.name} · {movement.note}</p>
      </article>)}
      {!current.items.length && <p className="rounded-xl border bg-white px-5 py-10 text-center text-sm text-slate-600">No {kind === "pieces" ? "piece releases" : "material withdrawals"} recorded in your account yet.</p>}
    </div>
    <Pagination page={current.page} pageSize={current.pageSize} total={current.total} label="movements" disabled={busy} onPage={page => void load(page)} />
  </div>;
}

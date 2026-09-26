"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PieceModal } from "../piece-modal";
import type { PieceFormProps } from "../piece-form";
import type { PieceFormValues } from "../types";
import type { CreatePieceData } from "@/lib/types";
import { BackLink } from "@/components/navigation/back-link";
import { revisionPieceForm, revisionPieceInput } from "./piece-values";
import {
  beginMaterialRevision, calculateMaterialRevisionPiece, decideMaterialRevision, getMaterialRevisions,
  removeMaterialRevisionItem, saveMaterialRevisionPiece, submitMaterialRevision,
  type MaterialRevision, type MaterialRevisionItem, type MaterialRevisionsData, type MaterialRevisionSummary,
} from "@/app/api/material-revisions.api";

type Catalogs = Pick<PieceFormProps, "productsWithBrands" | "systemsWithConfigs" | "frameColors" | "crystals" | "tints" | "coatings" | "privacies" | "muntinPatterns" | "muntinTypes">;
type Editor = { key: string; originalPieceId?: number; itemKey?: string; initialData: PieceFormValues };
const money = (value: string | number | null | undefined) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value ?? 0));
const statusText: Record<MaterialRevision["status"], string> = {
  DRAFT: "Draft", PENDING_APPROVAL: "Awaiting owner approval", AWAITING_SIGNATURE: "Awaiting customer signature",
  APPLIED: "Applied", REJECTED: "Rejected", CANCELED: "Canceled",
};
const date = (value: string) => new Date(value).toLocaleString();
const panel = "rounded-lg border bg-white p-4 sm:p-6";

function Totals({ before, after, dealerPricing }: { before: MaterialRevisionSummary; after: MaterialRevisionSummary | null; dealerPricing: boolean }) {
  if (!after) return null;
  const rows: Array<[string, keyof MaterialRevisionSummary]> = [
    ["Material", "material"], ["Installation and services", "installation"], ["Permit and city fees", "servicesAndFees"],
    [dealerPricing ? "Total payable to company" : "Project total", "projectTotal"],
    ...(dealerPricing ? [["Customer project total", "customerProjectTotal"] as [string, keyof MaterialRevisionSummary]] : []),
    ["Payments already credited", "paid"], ["Approved credit", "approvedCredit"], ["Remaining balance", "balance"],
  ];
  return <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="mb-3 text-left text-lg font-semibold">Revised project totals</caption>
    <thead><tr className="border-b"><th className="pb-2 text-left">Amount</th><th className="pb-2 text-right">Current</th><th className="pb-2 text-right">Revised</th></tr></thead>
    <tbody>{rows.map(([label, key]) => <tr key={key} className={`border-b ${key === "projectTotal" || key === "balance" ? "font-semibold" : ""}`}><td className="py-3 pr-3">{label}</td>
      <td className="py-3 pl-3 text-right">{money(before[key] as string)}</td><td className="py-3 pl-3 text-right">{money(after[key] as string)}</td></tr>)}</tbody></table>
    <p className="mt-4 font-medium">Change in total payable: {money(Number(after.projectTotal) - Number(before.projectTotal))}</p>
    {Number(after.creditBalance) > 0 && <p className="mt-2 text-sm">Credit balance: {money(after.creditBalance)}. No refund is issued automatically.</p>}
    {after.provisionalInstallation && <p className="mt-2 text-sm text-muted-foreground">Installation is provisional until measurement and installation quote approval are complete. New units remain pending measurement.</p>}
    {after.customerTotalIncomplete && <p className="mt-2 text-sm text-muted-foreground">The customer total includes only charges currently available in the project.</p>}
    <p className="mt-2 text-sm text-muted-foreground">Payments are preserved. The deposit is credited once. Separate delivery and extra charges are not included here.</p>
  </div>;
}

function Specifications({ input, catalogs }: { input: CreatePieceData; catalogs: Catalogs }) {
  const system = catalogs.systemsWithConfigs.find(item => item.id === input.idSyst);
  const configuration = system?.sysconfs.find(item => item.idConfig === input.idConf);
  const product = catalogs.productsWithBrands.find(item => item.id === input.idProd);
  const brand = product?.brandProducts.find(item => item.brand.id === input.idBrand)?.brand;
  const options = [
    ["Active", input.idActiveOption, configuration?.activeOptions], ["Preparation", input.idPreparationOption, configuration?.preparationOptions],
    ["Sill", input.idSillOption, configuration?.sillOptions], ["Reinforcement", input.idReinforcementOption, configuration?.reinforcementOptions],
  ] as const;
  const dimensions = [
    ["Width", input.width], ["Height", input.height], ["Left height", input.heightLeft], ["Right height", input.heightRight],
    ["Leg height", input.legHeight], ["Sash height", input.sashHeight], ["Window height", input.windowHeight],
    ["Door width", input.doorWidth], ["Door height", input.doorHeight], ["Left sidelite", input.leftSideliteWidth], ["Right sidelite", input.rightSideliteWidth],
  ].filter(([, value]) => value != null && value !== "");
  return <div className="mt-2 space-y-1 text-sm text-muted-foreground">
    <p>{product?.name ?? "Product"}{brand ? ` · ${brand.name}` : ""}{configuration ? ` · Config: ${configuration.config.conf}` : ""}</p>
    <p>Quantity: {input.qty}{input.mark ? ` · Mark: ${input.mark}` : ""}{system ? ` · ${system.name}` : ""}</p>
    <p>{dimensions.map(([label, value]) => `${label}: ${value} in`).join(" · ")}</p>
    <p>Frame color: {catalogs.frameColors.find(item => item.id === input.idFC)?.color ?? "—"}{input.idTint ? ` · Glass color: ${catalogs.tints.find(item => item.id === input.idTint)?.color ?? "—"}` : ""}</p>
    {input.idCoat != null && <p>Coating: {catalogs.coatings.find(item => item.id === input.idCoat)?.name ?? "—"} · Privacy: {catalogs.privacies.find(item => item.id === input.idPrivacy)?.name ?? "—"}</p>}
    {options.filter(([, id]) => id != null).map(([name, id, list]) => <p key={name}>{name}: {list?.find(link => link.optionId === id)?.option.name ?? `Option #${id}`}</p>)}
    {input.highBottom && <p>High bottom: Yes</p>}
    {!!input.idCryst && <p>Glass: {catalogs.crystals.find(item => item.id === input.idCryst)?.glass ?? "—"} · Screen: {input.screen ? "Yes" : "No"}</p>}
    {input.leftPanels != null || input.rightPanels != null || input.panelCount != null ? <p>Panels: {input.panelCount ?? "—"} · Left: {input.leftPanels ?? "—"} · Right: {input.rightPanels ?? "—"}</p> : null}
    {input.horizontalHeights?.length ? <p>Horizontal heights: {input.horizontalHeights.join(", ")} in</p> : null}
    {input.muntin && <p>Grid: {catalogs.muntinPatterns.find(item => item.id === input.muntin?.idPattern)?.name ?? "Selected pattern"}{input.muntin.panels.map(part => ` · ${part.panelLabel}: ${part.horizontalLites} × ${part.verticalLites}`).join("")}</p>}
  </div>;
}

export function MaterialRevisionClient({ initialData, ...catalogs }: Catalogs & { initialData: MaterialRevisionsData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [reason, setReason] = useState("");
  const [factoryConfirmed, setFactoryConfirmed] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pieceId, setPieceId] = useState("");
  const current = data.current;
  useEffect(() => { setData(initialData); }, [initialData]);
  useEffect(() => {
    if (!current || current.canEdit || busy || editor) return;
    let alive = true;
    const timer = window.setInterval(async () => {
      if (document.hidden) return;
      try { const next = await getMaterialRevisions(data.estimateId); if (alive) setData(next); } catch { /* Se conserva la última revisión; Refresh permite reintentar. */ }
    }, 30000);
    return () => { alive = false; clearInterval(timer); };
  }, [current?.id, current?.status, current?.canEdit, busy, editor, data.estimateId]);
  const update = async (operation: () => Promise<MaterialRevisionsData>, success?: string) => {
    if (busy) return false;
    setBusy(true); setError("");
    try { setData(await operation()); setAccepted(false); if (success) toast.success(success); router.refresh(); return true; }
    catch (e) { const message = e instanceof Error ? e.message : "The revision could not be saved."; setError(message); toast.error(message); return false; }
    finally { setBusy(false); }
  };
  const openPiece = (input?: CreatePieceData, originalPieceId?: number, itemKey?: string) => {
    setEditor({ key: `${Date.now()}-${itemKey ?? originalPieceId ?? "new"}`, originalPieceId, itemKey,
      initialData: revisionPieceForm(input, data.defaultDealerMarkup) });
  };
  const savePiece = async (values: PieceFormValues) => {
    if (!current || !editor) return;
    if (await update(() => saveMaterialRevisionPiece(data.estimateId, current.id, {
      originalPieceId: editor.originalPieceId, itemKey: editor.itemKey, piece: revisionPieceInput(values, catalogs.productsWithBrands),
    }), "Piece saved in the revision. Original material remains unchanged.")) setEditor(null);
  };
  const confirmDecision = (decision: "CANCEL" | "REJECT") => {
    if (!current || !window.confirm(`${decision === "CANCEL" ? "Cancel" : "Reject"} this revision? The original material and payments will remain unchanged.`)) return;
    void update(() => decideMaterialRevision(data.estimateId, current.id, decision), "Revision closed. Original material and payments preserved.");
  };
  const itemCard = (item: MaterialRevisionItem, editable: boolean) => <article key={item.key} className="rounded-lg border p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide">{item.action === "ADD" ? "New piece" : "Changed piece"}</p><h3 className="mt-1 font-semibold">{item.label}</h3></div>
      {editable && <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => openPiece(item.input, item.originalPieceId ?? undefined, item.key)}>Edit change</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (current && window.confirm("Remove this pending change? The original piece will not be removed.")) void update(() => removeMaterialRevisionItem(data.estimateId, current.id, item.key)); }}>Remove change</Button></div>}</div>
    <Specifications input={item.input} catalogs={catalogs} />
    <div className="mt-3 space-y-1 text-sm">{item.changeDescription.map((change, index) => <p key={index}>{change}</p>)}</div>
    <p className="mt-3 font-medium">{data.dealerPricing ? "Dealer material subtotal" : "Material subtotal"}: {money(item.subtotal)}{item.customerSubtotal != null ? ` · Customer material subtotal: ${money(item.customerSubtotal)}` : ""}</p>
    <p className="mt-1 text-xs text-muted-foreground">Piece amounts exclude sales tax, installation and project-level discounts. The project summary below includes the applicable adjustments.</p>
  </article>;
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><BackLink href={data.orderId ? `/orders/${data.orderId}` : `/estimates/${data.estimateId}`} label={data.orderId ? "Back to order" : "Back to estimate"} />
      <h1 className="mt-3 text-2xl font-bold">Material revisions · Estimate #{data.estimateNumber}</h1></div>
      <div className="flex gap-2">{data.installationId && <Button variant="outline" asChild><Link href={`/installations/${data.installationId}`}>Installation details</Link></Button>}
        <Button variant="outline" disabled={busy || !!editor} onClick={() => void update(() => getMaterialRevisions(data.estimateId))}>Refresh</Button></div></div>
    <p className="text-sm text-muted-foreground">Only this revision changes. Original pieces, agreed prices, payment records and deposits remain in place until the required approval and signature are complete.</p>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">{error}</div>}
    {!current && data.installationRevisionId && <section className={`${panel} space-y-3`}>
      <h2 className="text-lg font-semibold">Continue the remeasurement revision</h2>
      <p className="text-sm">Measurements and additional pieces belong to the same installation revision. Continue there and submit the changes together.</p>
      <Button asChild><Link href={`/installations/${data.installationRevisionId}#material-revision`}>Continue revision</Link></Button>
    </section>}
    {!current && !data.installationRevisionId && data.canBegin && <section className={`${panel} space-y-4`}><h2 className="text-lg font-semibold">{data.canReviseExisting ? (data.orderId ? "Revise order" : "Revise material") : "Add a new piece"}</h2>
      <label className="block text-sm font-medium">Reason for the revision<textarea className="mt-2 min-h-24 w-full rounded-md border p-3" maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} placeholder="For example: Customer requested Right Active, or an additional window." /></label>
      {data.orderId && <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={factoryConfirmed} onChange={event => setFactoryConfirmed(event.target.checked)} /><span>I have verified that this order has not been sent to the manufacturer. An empty PO alone does not confirm this.</span></label>}
      {!data.canReviseExisting && <p className="text-sm text-muted-foreground">You can add new pieces before remeasurement. Existing pieces remain locked. New units will be included in the measurement visit.</p>}
      <Button disabled={busy || !reason.trim() || (!!data.orderId && !factoryConfirmed)} onClick={() => void update(() => beginMaterialRevision(data.estimateId, reason.trim(), factoryConfirmed))}>{busy ? "Preparing…" : "Start revision"}</Button>
    </section>}
    {!current && !data.installationRevisionId && !data.canBegin && data.unavailableReason && <p className={panel}>{data.unavailableReason}</p>}
    {current && <section className={`${panel} space-y-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Revision {current.version} · {statusText[current.status]}</h2>{current.canCancel && <Button variant="outline" disabled={busy} onClick={() => confirmDecision("CANCEL")}>Cancel revision</Button>}</div>
      <p className="whitespace-pre-wrap text-sm">{current.reason}</p>
      <p className="text-sm text-muted-foreground">Created {date(current.createdAt)}. Production and affected payments remain on hold while the revision is pending.</p>
      {current.canEdit && <div className="flex flex-wrap gap-3 rounded-lg bg-slate-50 p-4"><Button disabled={busy} onClick={() => openPiece()}>Add Piece</Button>
        {data.canReviseExisting && <><select aria-label="Piece to revise" className="min-w-0 max-w-full rounded-md border bg-white px-3 py-2 text-sm" value={pieceId} onChange={event => setPieceId(event.target.value)}><option value="">Select an existing piece</option>
          {data.pieces.filter(piece => !current.items.some(item => item.originalPieceId === piece.id)).map(piece => <option key={piece.id} value={piece.id}>{piece.label}</option>)}</select>
          <Button variant="outline" disabled={busy || !pieceId} onClick={() => { const piece = data.pieces.find(item => item.id === Number(pieceId)); if (piece) openPiece(piece.input, piece.id); }}>Modify Piece</Button></>}
      </div>}
      {current.items.length ? <div className="space-y-4">{current.items.map(item => itemCard(item, current.canEdit))}</div> : <p className="text-sm text-muted-foreground">No changes yet. Add a piece or modify an existing piece to calculate the revision.</p>}
      <Totals before={current.original} after={current.revised} dealerPricing={data.dealerPricing} />
      {(current.canEdit || current.canApprove) && current.items.length > 0 && <div className="space-y-4 border-t pt-4">
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>{data.isOwner ? "I accept the listed material changes, quantities, prices and updated project total." : "I have reviewed the listed changes and totals and will submit them to the estimate owner for approval."}</span></label>
        {current.requiresSignature && <p className="text-sm text-muted-foreground">A signed agreement already exists. These changes will not apply until the customer signs the updated agreement.</p>}
        <div className="flex gap-3">{current.canEdit ? <Button disabled={busy || !accepted} onClick={() => void update(() => submitMaterialRevision(data.estimateId, current.id, accepted))}>{busy ? "Saving…" : data.isOwner ? "Accept revision" : "Request owner approval"}</Button>
          : <><Button disabled={busy || !accepted} onClick={() => void update(() => decideMaterialRevision(data.estimateId, current.id, "APPROVE", accepted))}>{busy ? "Saving…" : "Accept revision"}</Button><Button variant="outline" disabled={busy} onClick={() => confirmDecision("REJECT")}>Reject revision</Button></>}</div>
      </div>}
      {current.status === "PENDING_APPROVAL" && !current.canApprove && <p className="rounded-lg border bg-slate-50 p-4 text-sm">The estimate owner must review and accept this revision. The original material has not changed.</p>}
      {current.status === "AWAITING_SIGNATURE" && <div className="space-y-3 rounded-lg border bg-slate-50 p-4"><p className="font-medium">Customer signature required</p><p className="text-sm">The owner has approved the revision. The original material and signed agreement remain in force until the customer signs the new version.</p>
        {data.canRequestSignature ? <><p className="text-sm">Open the customer report, select <strong>Include contract</strong>, and share the updated agreement. The revision applies automatically after a valid signature.</p><Button asChild variant="outline"><Link href={`/estimates/${data.estimateId}?view=public`}>Open customer report</Link></Button></>
          : <p className="text-sm">The dealer who owns the estimate must share the updated contract through the existing customer-signature flow.</p>}
      </div>}
    </section>}
    {data.history.length > 0 && <section className={`${panel} space-y-4`}><h2 className="text-xl font-semibold">Revision history</h2>{data.history.map(revision => <details key={revision.id} className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Revision {revision.version} · {statusText[revision.status]} · {date(revision.appliedAt ?? revision.closedAt ?? revision.createdAt)}</summary>
      <div className="mt-4 space-y-4"><p className="whitespace-pre-wrap text-sm">{revision.reason}</p>{revision.items.map(item => itemCard(item, false))}<Totals before={revision.original} after={revision.revised} dealerPricing={data.dealerPricing} /></div>
    </details>)}</section>}
    {editor && current?.canEdit && <PieceModal {...catalogs} open onOpenChange={open => { if (!open && !busy) setEditor(null); }} title={editor.originalPieceId ? "Revise Piece" : "Add Piece to revision"} pieceKey={editor.key} initialData={editor.initialData} index={0} onSave={savePiece} onCancel={() => { if (!busy) setEditor(null); }} canUseCustomerPricing={data.dealerPricing} estimateId={data.estimateId} startUnlocked lockQuantity={!!editor.originalPieceId} lockDealerMarkup={!!editor.originalPieceId}
      onCalculate={values => calculateMaterialRevisionPiece(data.estimateId, current.id, { originalPieceId: editor.originalPieceId, itemKey: editor.itemKey, piece: revisionPieceInput(values, catalogs.productsWithBrands) })} />}
  </div>;
}

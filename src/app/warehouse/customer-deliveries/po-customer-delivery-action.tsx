"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ClipboardCheck, Plus, RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, isApiError } from "@/app/api/_base";
import { warehouseRequestKey, type Paged } from "@/app/api/warehouse.api";
import { addCustomerDeliveryPos, createCustomerDeliveryRun, customerDeliveryRuns, recordManualCustomerDelivery, type CustomerDeliveryRun, type ManualCustomerDeliveryRequest } from "@/app/api/customer-delivery-runs.api";
import { errorMessage, Pagination } from "../warehouse-shared";
import { warehouseCustomerDeliveryPath } from "./customer-delivery-navigation";

type PendingRequest =
  | ({ action: "manual" } & ManualCustomerDeliveryRequest)
  | { action: "create"; requestKey: string; poKey: string }
  | { action: "add"; requestKey: string; poKey: string; runId: number };
const definitive = (error: unknown) => isApiError(error) && error.status >= 400 && error.status < 500 && ![401, 403, 408, 429].includes(error.status);
const positiveId = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
function readPending(key: string, poKey: string): PendingRequest | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const request = JSON.parse(raw) as PendingRequest;
  if (request?.poKey !== poKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request?.requestKey ?? "") ||
    !(request.action === "create" || (request.action === "add" && positiveId(request.runId)) ||
      (request.action === "manual" && (request.runId === undefined || positiveId(request.runId)) &&
        (request.storeId === undefined || request.storeId === null || positiveId(request.storeId))))) {
    throw new Error("The saved request could not be recovered. Reload this page before continuing.");
  }
  return request;
}

export function PoWarehouseReleaseActions({ poKey, poLabel, storeId = "all", search = "", compact = false, onInstallationRelease }: {
  poKey: string; poLabel?: string; storeId?: string; search?: string; compact?: boolean;
  onInstallationRelease?: () => void;
}) {
  const router = useRouter();
  const { user, revalidate } = useAuth();
  const actorId = user?.id;
  const actorRole = user?.role?.name;
  const allowed = actorRole === "admin" || actorRole === "technician";
  const identity = `${actorId ?? ""}:${actorRole ?? ""}:${poKey}`;
  const liveIdentity = useRef(identity);
  liveIdentity.current = identity;
  const storageKey = `customer-delivery-po:${actorId}:${poKey}`;
  const [open, setOpen] = useState(false);
  const [readyIdentity, setReadyIdentity] = useState("");
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [listError, setListError] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Paged<CustomerDeliveryRun> | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [refresh, setRefresh] = useState(0);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const listRequest = useRef(0);
  const launchingInstallation = useRef(false);
  const ready = readyIdentity === identity && allowed;
  const selected = list?.items.find(run => String(run.id) === selectedId);
  const label = poLabel || poKey;

  useEffect(() => {
    mounted.current = true;
    const connection = () => setOnline(navigator.onLine);
    connection();
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    setReadyIdentity("");
    setPending(null);
    setList(null);
    setPage(1);
    setSelectedId("");
    setError("");
    setNotice("");
    setBusy(false);
    busyRef.current = false;
    if (!allowed || !actorId) return;
    try {
      const saved = readPending(storageKey, poKey);
      setPending(saved);
      setReadyIdentity(identity);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [actorId, allowed, identity, poKey, storageKey]);

  const refreshList = useCallback(() => setRefresh(value => value + 1), []);
  useEffect(() => {
    const request = ++listRequest.current;
    if (!open || !ready || !online || pending) return;
    let cancelled = false;
    const isCurrent = () => !cancelled && mounted.current && liveIdentity.current === identity && request === listRequest.current;
    setLoading(true);
    setListError("");
    customerDeliveryRuns({ page, pageSize: 10, status: "ACTIVE" }).then(next => {
      if (!isCurrent()) return;
      const lastPage = Math.max(1, Math.ceil(next.total / next.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setList(next);
      setSelectedId(current => next.items.some(run => String(run.id) === current) ? current : "");
    }).catch(e => {
      if (isCurrent()) {
        setList(null);
        setSelectedId("");
        setListError(errorMessage(e));
      }
    }).finally(() => {
      if (isCurrent()) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, ready, online, pending, page, refresh, identity]);

  async function verifyIdentity() {
    const account = await revalidate();
    if (!mounted.current || liveIdentity.current !== identity || account?.id !== actorId || account?.role?.name !== actorRole) {
      throw new ApiError("Your session changed. Sign in with the original account and reopen this PO.", 403);
    }
  }
  function currentContext() { return mounted.current && liveIdentity.current === identity; }
  function forgetRequest() {
    localStorage.removeItem(storageKey);
    if (currentContext()) setPending(null);
  }
  function manualIntent(runId?: number): PendingRequest {
    if (storeId && storeId !== "all" && storeId !== "unassigned" && (!/^[1-9]\d*$/.test(storeId) || !positiveId(Number(storeId)))) {
      throw new Error("Choose a valid storage filter before continuing.");
    }
    return {
      action: "manual", requestKey: warehouseRequestKey(), poKey,
      ...(runId === undefined ? {} : { runId }),
      ...(storeId === "unassigned" ? { storeId: null } : storeId && storeId !== "all" ? { storeId: Number(storeId) } : {}),
    };
  }
  async function submit(request?: PendingRequest) {
    if (busyRef.current || !ready || !navigator.onLine) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    let sent = false;
    try {
      await verifyIdentity();
      // Recheck storage before a fresh intent so a recovered request is never overwritten.
      const saved = readPending(storageKey, poKey);
      if (saved && (!request || saved.requestKey !== request.requestKey)) {
        setPending(saved);
        return;
      }
      const intent = request ?? manualIntent();
      localStorage.setItem(storageKey, JSON.stringify(intent));
      setPending(intent);
      sent = true;
      const result = intent.action === "manual"
        ? await recordManualCustomerDelivery({
          requestKey: intent.requestKey, poKey: intent.poKey,
          ...(intent.runId === undefined ? {} : { runId: intent.runId }),
          ...(intent.storeId === undefined ? {} : { storeId: intent.storeId }),
        })
        : intent.action === "create"
          ? await createCustomerDeliveryRun({ requestKey: intent.requestKey, poKeys: [intent.poKey] })
          : await addCustomerDeliveryPos(intent.runId, [intent.poKey], intent.requestKey);
      if (!currentContext()) return;
      if (!positiveId(result.id) || ("runId" in intent && intent.runId !== undefined && result.id !== intent.runId)) {
        throw new Error("The delivery could not be confirmed. Retry this request to check it.");
      }
      if (result.status !== "ACTIVE") {
        forgetRequest();
        setError(`Delivery #${result.id} has already been closed. Choose another delivery to continue.`);
        refreshList();
        return;
      }
      if (!result.orders.some(order => order.key === intent.poKey)) {
        forgetRequest();
        setError("This PO is no longer in that delivery. Choose the delivery again to add it.");
        refreshList();
        return;
      }
      forgetRequest();
      if (intent.action !== "manual") {
        setNotice(`Delivery #${result.id} recovered. The earlier request only added the PO. Select it below and choose Add parts and open to record its available parts.`);
        setSelectedId(String(result.id));
        refreshList();
        return;
      }
      router.push(warehouseCustomerDeliveryPath({ runId: result.id, manual: true }));
      setOpen(false);
    } catch (e) {
      if (!currentContext()) return;
      if (definitive(e)) {
        forgetRequest();
        refreshList();
      }
      setError(sent && !definitive(e)
        ? `${errorMessage(e)} Retry this request to confirm the result.`
        : errorMessage(e));
    } finally {
      if (currentContext()) { busyRef.current = false; setBusy(false); }
    }
  }
  async function continueSelected() {
    if (!selected || pending || busyRef.current || !ready || !navigator.onLine || loading) return;
    try {
      await submit(manualIntent(selected.id));
    } catch (e) {
      if (currentContext()) setError(errorMessage(e));
    }
  }
  function changeOpen(value: boolean) {
    if (busyRef.current) return;
    if (value && ready) {
      try { setPending(readPending(storageKey, poKey)); }
      catch (e) { setReadyIdentity(""); setError(errorMessage(e)); }
      refreshList();
    }
    setOpen(value);
  }

  const installationQuery = new URLSearchParams({ search, poKey });
  if (storeId && storeId !== "all") installationQuery.set("storeId", storeId);
  const compactClass = "mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-700 underline underline-offset-2";
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{compact
        ? <button type="button" className={compactClass} aria-label={`Release parts for PO ${label}`}>Release parts<ChevronDown className="h-3.5 w-3.5" /></button>
        : <Button variant="outline">Release parts<ChevronDown className="ml-2 h-4 w-4" /></Button>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "start" : "end"} className="w-72 max-w-[calc(100vw-2rem)] rounded-xl p-2" onCloseAutoFocus={event => { if (open || launchingInstallation.current) event.preventDefault(); launchingInstallation.current = false; }}>
        <DropdownMenuLabel className="text-xs text-muted-foreground">Who are these parts for?</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allowed && <DropdownMenuItem className="items-start rounded-lg p-3" onSelect={() => changeOpen(true)}>
          <ClipboardCheck className="mt-0.5" /><span><span className="block font-medium">Deliver to customer</span><span className="mt-1 block text-xs text-muted-foreground">Choose a delivery for PO {label}.</span></span>
        </DropdownMenuItem>}
        {onInstallationRelease ? <DropdownMenuItem className="items-start rounded-lg p-3" onSelect={() => { launchingInstallation.current = true; onInstallationRelease(); }}>
          <Wrench className="mt-0.5" /><span><span className="block font-medium">Release to installation</span><span className="mt-1 block text-xs text-muted-foreground">Review this PO’s parts and confirm the release.</span></span>
        </DropdownMenuItem> : <DropdownMenuItem asChild className="items-start rounded-lg p-3"><Link href={`/warehouse/releases/new?${installationQuery}`}>
          <Wrench className="mt-0.5" /><span><span className="block font-medium">Release to installation</span><span className="mt-1 block text-xs text-muted-foreground">Choose POs and quantities. No signature.</span></span>
        </Link></DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={open && allowed} onOpenChange={changeOpen}>
      <DialogContent showCloseButton={!busy} className="max-h-[85dvh] overflow-y-auto sm:max-w-md" onEscapeKeyDown={event => { if (busyRef.current) event.preventDefault(); }} onInteractOutside={event => { if (busyRef.current) event.preventDefault(); }}>
        <DialogHeader><DialogTitle>Deliver PO {label}</DialogTitle><DialogDescription>Choose a delivery. All available parts in this view will be added for review and the customer’s signature.</DialogDescription></DialogHeader>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        {!online && <p role="status" className="text-sm text-amber-800">Reconnect to continue.</p>}
        {pending ? <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{"runId" in pending && pending.runId ? `The request for delivery #${pending.runId} is waiting for confirmation.` : "A delivery request is waiting for confirmation."}</p>
          <Button className="w-full" disabled={!ready || !online || busy} onClick={() => submit(pending)}>{busy ? "Confirming…" : "Retry request"}</Button>
        </div> : <>
          <Button className="w-full" disabled={!ready || !online || busy} onClick={() => submit()}><Plus className="mr-2 h-4 w-4" />Create delivery with this PO</Button>
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-3"><label htmlFor={`delivery-${poKey}`} className="text-sm font-medium">Or use an active delivery</label><Button variant="ghost" size="sm" disabled={!ready || !online || busy || loading} onClick={refreshList} aria-label="Refresh active deliveries"><RefreshCw className="h-4 w-4" /></Button></div>
            {listError && <p role="alert" className="text-sm text-red-700">{listError}</p>}
            {loading ? <p role="status" className="text-sm text-muted-foreground">Loading deliveries…</p> : list && list.total === 0 ? <p className="text-sm text-muted-foreground">No active deliveries.</p> : <>
              <select id={`delivery-${poKey}`} value={selectedId} onChange={event => setSelectedId(event.target.value)} disabled={!ready || !online || busy || !list} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Choose a delivery</option>
                {list?.items.map(run => <option key={run.id} value={String(run.id)}>Delivery #{run.id}{run.orders.some(order => order.key === poKey) ? " · This PO is already added" : run.orders.length ? ` · ${run.orders.slice(0, 2).map(order => `PO ${order.poNumber}`).join(", ")}${run.orders.length > 2 ? "…" : ""}` : " · No POs yet"}</option>)}
              </select>
              {list && list.total > list.pageSize && <Pagination page={page} total={list.total} pageSize={list.pageSize} onPage={next => { setSelectedId(""); setPage(next); }} disabled={busy || !online} label="deliveries" />}
              <Button variant="outline" className="w-full" disabled={!selected || !ready || !online || busy || loading} onClick={continueSelected}>Add parts and open</Button>
            </>}
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}

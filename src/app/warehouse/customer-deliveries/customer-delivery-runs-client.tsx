"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SignaturePad } from "@/components/estimates/agreements/signature-pad";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, isApiError } from "@/app/api/_base";
import type { SignatureStrokes } from "@/app/api/contracts.api";
import {
  warehouseRequestKey,
  type FactoryPartType,
  type Paged,
  type WarehouseStoreRef,
} from "@/app/api/warehouse.api";
import {
  addCustomerDeliveryPos,
  closeCustomerDeliveryRun,
  createCustomerDeliveryRun,
  customerDeliveryRun,
  customerDeliveryRuns,
  deleteCustomerDeliveryRun,
  removeCustomerDeliveryPart,
  removeCustomerDeliveryPo,
  scanCustomerDeliveryPart,
  type CloseCustomerDeliveryRun,
  type CustomerDeliveryRun,
  type CustomerDeliveryRunOrder,
} from "@/app/api/customer-delivery-runs.api";
import { ScanPad } from "../scan-pad";
import { errorMessage, Pagination } from "../warehouse-shared";
import { factoryPartLabel, factoryPartsText } from "../factory-parts";
import {
  CustomerDeliveryPrintStyles,
  CustomerDeliveryReceipt,
} from "./customer-delivery-receipt";
import { hasDeliverySignature } from "./customer-delivery-selection";
import { CustomerDeliveryPoPicker } from "./customer-delivery-po-picker";

type CreateRequest = { requestKey: string; storeId?: number | null };
type ScanStorage = { storeId: number | null; storeName: string };
type ScanOrigin = {
  requestKey: string;
  barcode: string;
  storeId: number | null;
  legacy: boolean;
};
type ScanContext = {
  runId: number;
  source: ScanStorage | null;
  sourceConfirmed?: boolean;
  reading: ScanOrigin | null;
};
type PendingClose = {
  body: CloseCustomerDeliveryRun;
  snapshot: CustomerDeliveryRun;
};
type Removal = {
  requestKey: string;
  barcode: string;
  partType: FactoryPartType;
  storeId?: number | null;
  storeName?: string;
};
type DeliveryManagement =
  | { action: "delete"; runId: number }
  | { action: "remove-po"; runId: number; requestKey: string; poKey: string; poNumber: string };
const validStoreId = (value: unknown): value is number | null =>
  value === null ||
  (typeof value === "number" && Number.isSafeInteger(value) && value > 0);
const validReading = (
  value: unknown,
): value is { requestKey: string; barcode: string } => {
  const item = value as { requestKey?: unknown; barcode?: unknown } | null;
  return Boolean(
    item &&
      typeof item.requestKey === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item.requestKey,
      ) &&
      typeof item.barcode === "string" &&
      item.barcode.trim().length > 0 &&
      item.barcode.length <= 60,
  );
};
const definitive = (error: unknown) =>
  isApiError(error) &&
  error.status >= 400 &&
  error.status < 500 &&
  ![401, 403, 408, 429].includes(error.status);

export function CustomerDeliveryRunsClient({
  actorId,
  actorRole,
  initialList,
  initialRun = null,
  technician = false,
  embedded = false,
  basePath,
  onBusy,
  onScanModeChange,
  scannerRevision = 0,
  offline = false,
  blocked = false,
  manual = false,
}: {
  actorId: number;
  actorRole: string;
  initialList: Paged<CustomerDeliveryRun>;
  initialRun?: CustomerDeliveryRun | null;
  initialStores: WarehouseStoreRef[];
  initialStoreId?: string;
  technician?: boolean;
  embedded?: boolean;
  basePath?: string;
  onBusy?: (busy: boolean) => void;
  onScanModeChange?: (active: boolean) => void;
  scannerRevision?: number;
  offline?: boolean;
  blocked?: boolean;
  manual?: boolean;
}) {
  const router = useRouter();
  const { user, revalidate } = useAuth();
  const ownerMatches = user?.id === actorId && user?.role?.name === actorRole;
  const base =
    basePath ??
    (technician
      ? "/technician/warehouse/customer-deliveries"
      : "/warehouse/customer-deliveries");
  function deliveryUrl(id?: number) {
    const url = new URL(base, "http://localhost");
    url.searchParams.delete("runId");
    url.searchParams.delete("manual");
    if (id !== undefined) url.searchParams.set("runId", String(id));
    if (manual && id !== undefined) url.searchParams.set("manual", "1");
    return `${url.pathname}${url.search}${url.hash}`;
  }
  const storagePrefix = `customer-delivery-run:${actorId}`;
  const [list, setList] = useState(initialList),
    [run, setRun] = useState(initialRun);
  const [status, setStatus] = useState<"ACTIVE" | "CLOSED">("ACTIVE");
  const [poPickerOpen, setPoPickerOpen] = useState(false);
  const [storagePickerOpen, setStoragePickerOpen] = useState(false);
  const [storageOptions, setStorageOptions] = useState<ScanStorage[] | null>(null);
  const [storageError, setStorageError] = useState("");
  const storageRequests = useRef({ serial: 0 }).current;
  const [scanContext, setScanContext] = useState<ScanContext | null>(null);
  const scanContextRef = useRef<ScanContext | null>(null);
  const [busy, setBusy] = useState(false),
    [scanning, setScanning] = useState(false),
    [ready, setReady] = useState(false);
  const [review, setReview] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [firstName, setFirstName] = useState(""),
    [lastName, setLastName] = useState("");
  const [signature, setSignature] = useState<SignatureStrokes>([]),
    [accepted, setAccepted] = useState(false),
    [acceptPartial, setAcceptPartial] = useState(false);
  const [pendingCreate, setPendingCreate] = useState<CreateRequest | null>(
      null,
    ),
    [pendingClose, setPendingClose] = useState<PendingClose | null>(null);
  const [poPrompt, setPoPrompt] = useState<{
    poNumber: string;
    barcode: string;
  } | null>(null);
  const [removePrompt, setRemovePrompt] = useState<Removal | null>(null),
    [pendingRemoval, setPendingRemoval] = useState<Removal | null>(null);
  const [managementPrompt, setManagementPrompt] = useState<DeliveryManagement | null>(null),
    [pendingManagement, setPendingManagement] = useState<DeliveryManagement | null>(null);
  const answerPo = useRef<((include: boolean) => void) | null>(null),
    lock = useRef(false);
  const liveIdentity = useRef(ownerMatches);
  liveIdentity.current = ownerMatches;
  const currentRun = useRef(run);
  currentRun.current = run;
  const disabled = busy || !ready || !ownerMatches || offline;
  const locked = Boolean(pendingClose || pendingRemoval || pendingManagement);
  const management = pendingManagement ?? managementPrompt;
  const currentScanContext =
    scanContext?.runId === run?.id ? scanContext : null;
  const scanStorage = currentScanContext?.sourceConfirmed === true
    ? currentScanContext.source : null;
  const pendingScan = Boolean(currentScanContext?.reading);
  const sourceLocked =
    disabled || scanning || pendingScan || locked || Boolean(removePrompt || managementPrompt);
  const shown = pendingClose?.snapshot ?? run;
  const receiptOrigins = new Map(
    (shown?.items.flatMap((item) => item.origins ?? []) ?? []).map((origin) => [
      origin.storeId,
      origin,
    ]),
  );
  const receiptStorage =
    receiptOrigins.size === 1
      ? [...receiptOrigins.values()][0]
      : receiptOrigins.size > 1
        ? { storeId: null, storeName: "Multiple locations" }
        : {
            storeId: shown?.storeId ?? null,
            storeName: shown?.storeName ?? "",
          };
  const allocations =
    run?.allocations ??
    run?.items.flatMap((item) =>
      item.origins?.length
        ? item.origins.map((origin) => ({ ...item, ...origin }))
        : !run.multiStore
          ? [
              {
                ...item,
                storeId: run.storeId,
                storeName: run.storeName || "Unassigned",
              },
            ]
          : [],
    ) ??
    [];
  const operationBusy =
    !ready ||
    busy ||
    scanning ||
    Boolean(pendingClose || pendingRemoval || pendingCreate || management) ||
    pendingScan;
  const parentCallbacks = useRef({ onBusy, onScanModeChange });
  parentCallbacks.current = { onBusy, onScanModeChange };

  useEffect(() => {
    setPoPickerOpen(false);
    setStoragePickerOpen(false);
    setStorageOptions(null);
    storageRequests.serial++;
    return () => { storageRequests.serial++; };
  }, [run?.id, ownerMatches, storageRequests]);

  useEffect(() => {
    onBusy?.(operationBusy);
  }, [onBusy, operationBusy]);
  useEffect(
    () => () => {
      parentCallbacks.current.onBusy?.(false);
      parentCallbacks.current.onScanModeChange?.(false);
    },
    [],
  );

  const resetSignature = () => {
    setSignature([]);
    setAccepted(false);
    setAcceptPartial(false);
  };
  function saveScanContext(value: ScanContext) {
    localStorage.setItem(
      `${storagePrefix}:source:${value.runId}`,
      JSON.stringify(value),
    );
    scanContextRef.current = value;
    setScanContext(value);
  }
  function clearScanOrigin(runId: number, requestKey: string) {
    const current = scanContextRef.current;
    if (current?.runId === runId && current.reading?.requestKey === requestKey)
      saveScanContext({ ...current, reading: null });
  }
  async function loadStorageOptions() {
    if (!run || sourceLocked) return;
    const runId = run.id;
    const request = ++storageRequests.serial;
    setStorageOptions(null);
    setStorageError("");
    try {
      const next = await customerDeliveryRun(runId);
      if (request !== storageRequests.serial ||
        currentRun.current?.id !== runId || !liveIdentity.current) return;
      if (next.status !== "ACTIVE") {
        setRun(next);
        setStoragePickerOpen(false);
        return;
      }
      if (!Array.isArray(next.availableStorages))
        throw new Error("Storage availability could not be loaded. Try again.");
      setRun(next);
      setStorageOptions(next.availableStorages);
    } catch (e) {
      if (request !== storageRequests.serial ||
        currentRun.current?.id !== runId || !liveIdentity.current) return;
      setStorageError(errorMessage(e));
    }
  }
  function chooseStorage(source: ScanStorage) {
    if (!run || sourceLocked ||
      !storageOptions?.some(option => option.storeId === source.storeId)) return;
    try {
      saveScanContext({ runId: run.id, source, sourceConfirmed: true, reading: null });
      storageRequests.serial++;
      setStoragePickerOpen(false);
      setError("");
      setNotice("");
      onScanModeChange?.(false);
    } catch {
      setError(
        "The selected storage could not be saved. Enable site storage before scanning. Nothing was sent.",
      );
    }
  }
  async function verifyIdentity() {
    const account = await revalidate();
    if (
      !liveIdentity.current ||
      account?.id !== actorId ||
      account?.role?.name !== actorRole
    )
      throw new ApiError(
        "Your account has changed. Sign in with the original account and reopen this delivery before continuing.",
        403,
      );
  }
  const restoreClose = useCallback(
    (next: CustomerDeliveryRun | null) => {
      setPendingClose(null);
      setPendingRemoval(null);
      setRemovePrompt(null);
      setReview(false);
      setStoragePickerOpen(false);
      if (!next) {
        scanContextRef.current = null;
        setScanContext(null);
        return;
      }
      const sourceKey = `${storagePrefix}:source:${next.id}`;
      const scannerKey = `warehouse-reading:customer-delivery-run:${actorId}:${next.id}`;
      const storedSource = localStorage.getItem(sourceKey);
      const sourceContext: ScanContext = storedSource
        ? (JSON.parse(storedSource) as ScanContext)
        : {
            runId: next.id,
            source: null,
            sourceConfirmed: false,
            reading: null,
          };
      const source = sourceContext?.source,
        reading = sourceContext?.reading;
      if (
        sourceContext?.runId !== next.id ||
        (sourceContext.sourceConfirmed !== undefined &&
          typeof sourceContext.sourceConfirmed !== "boolean") ||
        (source !== null &&
          (!source ||
            !validStoreId(source.storeId) ||
            typeof source.storeName !== "string" ||
            !source.storeName.trim())) ||
        (reading !== null &&
          (!validReading(reading) ||
            !validStoreId(reading.storeId) ||
            typeof reading.legacy !== "boolean" ||
            (!reading.legacy &&
              (!source || source.storeId !== reading.storeId))))
      )
        throw new Error(
          "The saved scan storage could not be recovered. Reopen the delivery with its original browser data before scanning again.",
        );
      const storedReading = localStorage.getItem(scannerKey);
      if (next.status !== "CLOSED" && storedReading) {
        const scannerReading: unknown = JSON.parse(storedReading);
        if (!validReading(scannerReading))
          throw new Error(
            "The pending scan could not be recovered. Keep this page open and contact an administrator.",
          );
        if (
          reading &&
          (reading.requestKey !== scannerReading.requestKey ||
            reading.barcode !== scannerReading.barcode)
        )
          throw new Error(
            "The pending scan does not match its saved storage. Keep this page open and contact an administrator.",
          );
        if (!reading) {
          if (storedSource && !source)
            throw new Error(
              "The pending scan has no saved storage. Keep this page open and contact an administrator.",
            );
          sourceContext.reading = {
            ...scannerReading,
            storeId: source ? source.storeId : next.storeId,
            legacy: !storedSource,
          };
        }
      } else if (next.status !== "CLOSED" && reading) {
        localStorage.setItem(
          scannerKey,
          JSON.stringify({
            requestKey: reading.requestKey,
            barcode: reading.barcode,
          }),
        );
      }
      if (next.status === "CLOSED") sourceContext.reading = null;
      localStorage.setItem(sourceKey, JSON.stringify(sourceContext));
      scanContextRef.current = sourceContext;
      setScanContext(sourceContext);
      const key = `${storagePrefix}:close:${next.id}`;
      const removalKey = `${storagePrefix}:remove:${next.id}`;
      if (next.status === "CLOSED") {
        localStorage.removeItem(key);
        localStorage.removeItem(removalKey);
        return;
      }
      const removal = localStorage.getItem(removalKey);
      if (removal) {
        const value = JSON.parse(removal) as Removal;
        if (
          !value.requestKey ||
          !value.barcode ||
          !["DOOR", "FRAME", "WINDOW"].includes(value.partType) ||
          (value.storeId !== undefined && !validStoreId(value.storeId))
        )
          throw new Error(
            "The pending correction could not be recovered. Keep this page open and contact an administrator.",
          );
        setPendingRemoval(value);
      }
      const saved = localStorage.getItem(key);
      if (saved) {
        const value = JSON.parse(saved) as PendingClose;
        if (!value.body?.requestKey || value.snapshot?.id !== next.id)
          throw new Error(
            "The pending close could not be recovered. Keep this page open and contact an administrator.",
          );
        setPendingClose(value);
        setReview(true);
        setFirstName(value.body.firstName);
        setLastName(value.body.lastName);
        setSignature(value.body.signatureStrokes);
        setAccepted(true);
        setAcceptPartial(Boolean(value.body.acceptPartial));
      }
    },
    [storagePrefix, actorId],
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}:create`);
      if (saved) {
        const value = JSON.parse(saved) as CreateRequest;
        if (
          !value.requestKey ||
          (value.storeId !== undefined && !validStoreId(value.storeId))
        )
          throw new Error("Invalid saved delivery request.");
        setPendingCreate(value);
      }
      const savedManagement = localStorage.getItem(`${storagePrefix}:management`);
      if (savedManagement) {
        const value = JSON.parse(savedManagement) as DeliveryManagement;
        if (!Number.isSafeInteger(value.runId) || value.runId < 1 ||
          !["delete", "remove-po"].includes(value.action) ||
          (value.action === "remove-po" && (!value.requestKey ||
            !/^(order|external):[1-9]\d*$/.test(value.poKey) || typeof value.poNumber !== "string")))
          throw new Error("The pending delivery change could not be recovered. Keep this page open and contact an administrator.");
        setPendingManagement(value);
      }
      restoreClose(initialRun);
      setReady(true);
    } catch (e) {
      setError(errorMessage(e));
    }
    return () => {
      answerPo.current?.(false);
      answerPo.current = null;
    };
    // Opening a run is managed below; do not overwrite a newer scan with navigation props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagePrefix]);

  useEffect(() => {
    // Also honor navigation to the list or another saved run from the app menu.
    if (initialRun?.id === currentRun.current?.id) return;
    try {
      restoreClose(initialRun);
      setRun(initialRun);
      setError("");
      setNotice("");
    } catch (e) {
      setReady(false);
      setError(errorMessage(e));
    }
    // A new server snapshot for the same run must not replace a confirmed scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRun?.id]);

  async function refreshList(page = 1, nextStatus = status) {
    if (lock.current || !ownerMatches || offline || locked || managementPrompt) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setList(
        await customerDeliveryRuns({ page, pageSize: 20, status: nextStatus }),
      );
      setStatus(nextStatus);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function chooseRun(next: CustomerDeliveryRun) {
    setRun(next);
    onScanModeChange?.(false);
    setNotice("");
    resetSignature();
    try {
      restoreClose(next);
    } catch (e) {
      setReady(false);
      throw e;
    }
    router.replace(deliveryUrl(next.id), { scroll: false });
  }
  async function openRun(id: number) {
    if (lock.current || disabled || scanning || locked || managementPrompt) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      chooseRun(await customerDeliveryRun(id));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function createDelivery() {
    if (lock.current || disabled || locked || managementPrompt || (blocked && !pendingCreate)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const body = pendingCreate ?? {
      requestKey: warehouseRequestKey(),
    };
    try {
      await verifyIdentity();
      localStorage.setItem(`${storagePrefix}:create`, JSON.stringify(body));
      setPendingCreate(body);
      const next = await createCustomerDeliveryRun(body);
      if (!liveIdentity.current) return;
      localStorage.removeItem(`${storagePrefix}:create`);
      setPendingCreate(null);
      chooseRun(next);
      setNotice("Delivery created and saved. Add the POs you plan to deliver.");
    } catch (e) {
      if (definitive(e)) {
        localStorage.removeItem(`${storagePrefix}:create`);
        setPendingCreate(null);
      }
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function addPos(poKeys: string[]): Promise<boolean> {
    if (
      !run ||
      lock.current ||
      disabled ||
      scanning ||
      pendingScan ||
      locked ||
      run.status !== "ACTIVE"
    )
      return false;
    const keys = [...new Set(poKeys)];
    if (!keys.length) return false;
    const runId = run.id;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await verifyIdentity();
      const next = await addCustomerDeliveryPos(runId, keys);
      if (!liveIdentity.current || currentRun.current?.id !== runId)
        return false;
      setRun(next);
      setPoPickerOpen(false);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function readPart(
    barcode: string,
    requestKey: string,
  ): Promise<CustomerDeliveryRun | null> {
    if (!run || !liveIdentity.current)
      throw new Error(
        "Sign in with the account that opened this delivery before scanning.",
      );
    if (pendingManagement || managementPrompt || lock.current)
      throw new ApiError("Finish the pending delivery change before scanning.", 409);
    const approvalKey = `${storagePrefix}:scan-po:${run.id}:${requestKey}`;
    let addPo = localStorage.getItem(approvalKey) === "yes";
    const context = scanContextRef.current;
    if (
      !context ||
      context.runId !== run.id ||
      (!context.reading && (!context.source || context.sourceConfirmed !== true))
    )
      throw new ApiError(
        "Choose the storage you are scanning from before recording a part.",
        400,
      );
    if (
      context.reading &&
      (context.reading.requestKey !== requestKey ||
        context.reading.barcode !== barcode)
    )
      throw new ApiError(
        "Retry the pending scan from its original storage before recording another part.",
        409,
      );
    const origin: ScanOrigin = context.reading ?? {
      requestKey,
      barcode,
      storeId: context.source!.storeId,
      legacy: false,
    };
    const sourceBody = origin.legacy ? {} : { storeId: origin.storeId };
    try {
      // Keep the source with the request before any dispatch. ScanPad stores the same key.
      saveScanContext({ ...context, reading: origin });
      await verifyIdentity();
      let next: CustomerDeliveryRun;
      try {
        next = await scanCustomerDeliveryPart(run.id, {
          barcode,
          requestKey,
          ...sourceBody,
          ...(addPo ? { addPo: true } : {}),
        });
      } catch (e) {
        const data = isApiError(e)
          ? (e.data as { code?: string; poNumber?: string })
          : null;
        if (data?.code !== "DELIVERY_PO_NOT_INCLUDED") throw e;
        setPoPrompt({ poNumber: data.poNumber ?? "", barcode });
        addPo = await new Promise<boolean>((resolve) => {
          answerPo.current = resolve;
        });
        answerPo.current = null;
        setPoPrompt(null);
        if (!addPo) {
          clearScanOrigin(run.id, requestKey);
          setNotice(
            "PO excluded. This scanned part was not added to the delivery.",
          );
          return null;
        }
        await verifyIdentity();
        localStorage.setItem(approvalKey, "yes");
        next = await scanCustomerDeliveryPart(run.id, {
          barcode,
          requestKey,
          ...sourceBody,
          addPo: true,
        });
      }
      localStorage.removeItem(approvalKey);
      if (!liveIdentity.current)
        throw new ApiError(
          "Your account has changed. Reopen this delivery with the original account.",
          403,
        );
      clearScanOrigin(run.id, requestKey);
      return next;
    } catch (e) {
      if (definitive(e)) {
        localStorage.removeItem(approvalKey);
        clearScanOrigin(run.id, requestKey);
      }
      throw e;
    }
  }
  async function reviewDelivery() {
    if (
      !run ||
      lock.current ||
      disabled ||
      scanning ||
      pendingScan ||
      locked ||
      blocked
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await customerDeliveryRun(run.id);
      setRun(next);
      resetSignature();
      setFirstName("");
      setLastName("");
      if (next.status === "ACTIVE" && next.totalParts < 1)
        throw new Error(
          "Record at least one physical part before closing the delivery.",
        );
      setReview(next.status === "ACTIVE");
      onScanModeChange?.(false);
      setNotice("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function removePart() {
    const body = pendingRemoval ?? removePrompt;
    if (
      !run ||
      !body ||
      lock.current ||
      disabled ||
      scanning ||
      pendingScan ||
      pendingClose ||
      management
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    const key = `${storagePrefix}:remove:${run.id}`;
    try {
      await verifyIdentity();
      localStorage.setItem(key, JSON.stringify(body));
      setPendingRemoval(body);
      const next = await removeCustomerDeliveryPart(run.id, {
        requestKey: body.requestKey,
        barcode: body.barcode,
        partType: body.partType,
        ...(body.storeId === undefined ? {} : { storeId: body.storeId }),
      });
      if (!liveIdentity.current) return;
      localStorage.removeItem(key);
      setPendingRemoval(null);
      setRemovePrompt(null);
      setRun(next);
      setNotice(
        "One recorded part was removed. All other saved scans remain in this delivery.",
      );
    } catch (e) {
      if (definitive(e)) {
        localStorage.removeItem(key);
        setPendingRemoval(null);
        setRemovePrompt(null);
      }
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function finishDelivery() {
    if (
      !run ||
      lock.current ||
      disabled ||
      scanning ||
      pendingScan ||
      !shown ||
      management ||
      (blocked && !pendingClose)
    )
      return;
    if (
      !pendingClose &&
      (!firstName.trim() ||
        !lastName.trim() ||
        !accepted ||
        !hasDeliverySignature(signature) ||
        (shown.hasPending && !acceptPartial))
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    const value = pendingClose ?? {
      snapshot: shown,
      body: {
        requestKey: warehouseRequestKey(),
        revision: shown.revision,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        signatureStrokes: signature,
        acceptPartial,
      },
    };
    const key = `${storagePrefix}:close:${run.id}`;
    try {
      await verifyIdentity();
      localStorage.setItem(key, JSON.stringify(value));
      setPendingClose(value);
      const next = await closeCustomerDeliveryRun(run.id, value.body);
      if (!liveIdentity.current) return;
      localStorage.removeItem(key);
      setPendingClose(null);
      setRun(next);
      setReview(false);
      resetSignature();
      setNotice(
        "Delivery closed. The signed receipt and pending pickup summary are saved.",
      );
    } catch (e) {
      if (definitive(e)) {
        localStorage.removeItem(key);
        setPendingClose(null);
        resetSignature();
        setReview(false);
        try {
          setRun(await customerDeliveryRun(run.id));
        } catch {
          /* Keep the saved run visible. */
        }
      }
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function backToList() {
    if (disabled || scanning || pendingScan || locked) return;
    if (manual) { router.push("/warehouse"); return; }
    setRun(null);
    onScanModeChange?.(false);
    setReview(false);
    resetSignature();
    setNotice("");
    setError("");
    router.replace(deliveryUrl(), { scroll: false });
    await refreshList();
  }

  function askDeleteDelivery(target: CustomerDeliveryRun) {
    if (lock.current || sourceLocked || blocked || pendingCreate ||
      target.status !== "ACTIVE" || !target.canDelete) return;
    try {
      const source = localStorage.getItem(`${storagePrefix}:source:${target.id}`);
      if ((source && (JSON.parse(source) as ScanContext).reading) ||
        localStorage.getItem(`warehouse-reading:customer-delivery-run:${actorId}:${target.id}`) ||
        localStorage.getItem(`${storagePrefix}:remove:${target.id}`) ||
        localStorage.getItem(`${storagePrefix}:close:${target.id}`)) {
        setError(`Open delivery #${target.id} and resolve its pending scan or correction before deleting it.`);
        return;
      }
    } catch {
      setError("The saved delivery state could not be checked. Open the delivery before deleting it.");
      return;
    }
    setManagementPrompt({ action: "delete", runId: target.id });
    setError("");
    setNotice("");
    onScanModeChange?.(false);
  }
  function askRemovePo(order: CustomerDeliveryRunOrder) {
    if (!run || lock.current || sourceLocked || blocked || pendingCreate ||
      run.status !== "ACTIVE" || !(order.canRemove ?? order.totalParts === 0)) return;
    setManagementPrompt({ action: "remove-po", runId: run.id,
      requestKey: warehouseRequestKey(), poKey: order.key, poNumber: order.poNumber });
    setError("");
    setNotice("");
    onScanModeChange?.(false);
  }
  async function manageDelivery() {
    const value = pendingManagement ?? managementPrompt;
    if (!value || lock.current || disabled || scanning || pendingScan ||
      pendingClose || pendingRemoval || pendingCreate || (blocked && !pendingManagement)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const key = `${storagePrefix}:management`;
    try {
      await verifyIdentity();
      localStorage.setItem(key, JSON.stringify(value));
      setPendingManagement(value);
      if (value.action === "delete") {
        await deleteCustomerDeliveryRun(value.runId);
        if (!liveIdentity.current) return;
        localStorage.removeItem(key);
        for (const suffix of ["source", "remove", "close"])
          localStorage.removeItem(`${storagePrefix}:${suffix}:${value.runId}`);
        localStorage.removeItem(`warehouse-reading:customer-delivery-run:${actorId}:${value.runId}`);
        setPendingManagement(null);
        setManagementPrompt(null);
        setList(current => ({ ...current,
          items: current.items.filter(item => item.id !== value.runId),
          total: Math.max(0, current.total - Number(current.items.some(item => item.id === value.runId))),
        }));
        if (currentRun.current?.id === value.runId) {
          setRun(null);
          restoreClose(null);
          resetSignature();
        }
        router.replace(deliveryUrl(), { scroll: false });
        setNotice(`Delivery #${value.runId} deleted.`);
        try {
          const refreshed = await customerDeliveryRuns({ page: 1, pageSize: 20, status });
          if (liveIdentity.current) setList(refreshed);
        } catch { /* The confirmed deletion is already reflected in the list. */ }
      } else {
        const next = await removeCustomerDeliveryPo(value.runId, {
          requestKey: value.requestKey, poKey: value.poKey,
        });
        if (!liveIdentity.current) return;
        localStorage.removeItem(key);
        setPendingManagement(null);
        setManagementPrompt(null);
        if (currentRun.current?.id === next.id) setRun(next);
        else chooseRun(next);
        resetSignature();
        setReview(false);
        setNotice(next.orders.some(order => order.key === value.poKey)
          ? `The previous removal was confirmed. PO ${value.poNumber} has since been added again.`
          : `PO ${value.poNumber} removed from this delivery.`);
      }
    } catch (e) {
      if (definitive(e)) {
        localStorage.removeItem(key);
        setPendingManagement(null);
        setManagementPrompt(null);
        try {
          const next = await customerDeliveryRun(value.runId);
          if (liveIdentity.current) {
            if (currentRun.current?.id === next.id) setRun(next);
            setList(current => ({ ...current, items: current.items.map(item => item.id === next.id ? next : item) }));
          }
        } catch { /* Preserve the server's rejection message. */ }
      }
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!ownerMatches)
    return (
      <p
        role="alert"
        className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        Your account has changed. Sign in with the original account and reopen
        this delivery before continuing.
      </p>
    );
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {run && !embedded && (
        <header className="space-y-2 print:hidden">
          <h1 className="text-2xl font-semibold">
            {run ? `Customer delivery #${run.id}` : "Customer deliveries"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {manual ? "The selected parts are saved in this delivery. Review them with the customer before signing."
              : "Create a delivery, add its POs, and scan each physical part. Every confirmed scan is saved so you can leave and continue later."}
          </p>
        </header>
      )}
      {offline && (
        <p role="status" className="text-sm text-slate-600">
          Connect to continue this delivery. Confirmed scans are already saved.
        </p>
      )}
      {blocked && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          A physical count is open. New scans and delivery closing are paused
          until it is closed.
        </p>
      )}
      {error && !poPickerOpen && !storagePickerOpen && !management && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      {pendingRemoval && (
        <div
          role="status"
          className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          <p>
            A part correction has not been confirmed. Check the same correction
            before continuing.
          </p>
          <Button disabled={disabled} onClick={removePart}>
            Check part correction
          </Button>
        </div>
      )}

      {!run ? (
        <>
          {pendingCreate ? (
            <section className="space-y-4 rounded-2xl border bg-white p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Check created delivery
                </h2>
              </div>
              <p className="text-sm text-amber-800">
                The previous create request has not been confirmed. Retry to
                recover the same delivery.
              </p>
              <Button disabled={disabled} onClick={createDelivery}>
                <Plus className="mr-2 size-4" />
                Check created delivery
              </Button>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Customer deliveries</h2>
                  <p className="text-sm text-slate-600">
                    Open a delivery to add POs and continue scanning saved
                    parts.
                  </p>
                </div>
                <Button disabled={disabled || blocked || locked} onClick={createDelivery}>
                  Create delivery
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={status === "ACTIVE" ? "default" : "outline"}
                  disabled={disabled || locked}
                  aria-pressed={status === "ACTIVE"}
                  onClick={() => refreshList(1, "ACTIVE")}
                >
                  Active
                </Button>
                <Button
                  variant={status === "CLOSED" ? "default" : "outline"}
                  disabled={disabled || locked}
                  aria-pressed={status === "CLOSED"}
                  onClick={() => refreshList(1, "CLOSED")}
                >
                  Closed
                </Button>
                <Button
                  variant="outline"
                  disabled={disabled || locked}
                  onClick={() => refreshList(list.page)}
                >
                  <RefreshCw className="mr-2 size-4" />
                  Refresh
                </Button>
              </div>
              {list.items.length === 0 && (
                <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  {status === "ACTIVE"
                    ? "No deliveries in progress. Create one to get started."
                    : "No closed deliveries yet."}
                </p>
              )}
              <div className="grid gap-3">
                {list.items.map((item) => (
                  <article
                    key={item.id}
                    className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold">Delivery #{item.id}</h3>
                        <span className="text-sm">
                          {item.status === "ACTIVE" ? "Active" : "Closed"}
                        </span>
                      </div>
                      <p className="break-words text-sm text-muted-foreground">
                        {item.orders
                          .map((order) => `PO ${order.poNumber}`)
                          .join(" · ") || "Add POs to get started"}
                      </p>
                      <p className="text-sm">
                        {item.totalPieces} pieces · {item.totalParts} physical
                        parts {item.status === "CLOSED" ? "delivered" : "saved"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created by {item.createdBy} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        disabled={disabled || locked}
                        onClick={() => openRun(item.id)}
                      >
                        {item.status === "CLOSED" ? "View receipt" : "Open delivery"}
                      </Button>
                      {item.status === "ACTIVE" && item.canDelete && (
                        <Button variant="ghost" size="sm"
                          className="text-red-700 hover:text-red-800"
                          disabled={disabled || locked || blocked || Boolean(pendingCreate)}
                          onClick={() => askDeleteDelivery(item)}>
                          <Trash2 className="size-4" />
                          Delete delivery
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <Pagination
                page={list.page}
                total={list.total}
                pageSize={list.pageSize}
                onPage={refreshList}
                disabled={disabled || locked}
                label="deliveries"
              />
            </section>
          )}
        </>
      ) : (
        <>
          {embedded && (
            <h2 className="text-xl font-semibold print:hidden">
              Delivery #{run.id}
            </h2>
          )}
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Button
              variant="outline"
              disabled={disabled || scanning || pendingScan || locked}
              onClick={backToList}
            >
              <ArrowLeft className="mr-2 size-4" />
              {manual ? "Back to inventory" : "Back to deliveries"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {run.status === "CLOSED" ? "Closed" : "In progress"}
            </span>
            {run.status === "ACTIVE" && run.canDelete && (
              <Button variant="ghost" size="sm"
                className="ml-auto text-red-700 hover:text-red-800"
                disabled={sourceLocked || blocked || Boolean(pendingCreate)}
                onClick={() => askDeleteDelivery(run)}>
                <Trash2 className="size-4" />
                Delete delivery
              </Button>
            )}
          </div>
          {run.status === "CLOSED" && run.delivery ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 print:hidden">
                <p className="flex items-center gap-2 font-medium text-emerald-900">
                  <CheckCircle2 className="size-5" />
                  Signed and delivered
                </p>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 size-4" />
                  Print / Save PDF
                </Button>
              </div>
              <div data-customer-delivery-print>
                <CustomerDeliveryReceipt delivery={run.delivery} />
              </div>
              <CustomerDeliveryPrintStyles />
            </>
          ) : review && shown ? (
            <section className="space-y-5">
              <h2 className="text-xl font-semibold">
                Review delivery and sign
              </h2>
              {shown.hasPending && (
                <div
                  role="alert"
                  className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
                >
                  <p className="font-semibold">Some POs are incomplete</p>
                  <p>
                    {shown.pendingPieces} pieces · {shown.pendingParts} known
                    physical parts remain pending pickup.
                    {shown.orders.some((order) => order.unknownPending)
                      ? " Some pending quantities still need confirmation."
                      : ""}
                  </p>
                  <p>
                    The customer can see the delivered parts and pending items
                    below.
                  </p>
                </div>
              )}
              <CustomerDeliveryReceipt
                showSignature={false}
                delivery={{
                  source: "WAREHOUSE",
                  storeId: receiptStorage.storeId,
                  storeName: receiptStorage.storeName,
                  firstName,
                  lastName,
                  signatureStrokes: signature,
                  items: shown.items,
                  pendingItems: shown.pendingItems,
                  orders: shown.orders,
                  totalPieces: shown.totalPieces,
                  totalParts: shown.totalParts,
                }}
              />
              <section className="space-y-4 rounded-2xl border bg-white p-5">
                <h3 className="text-lg font-semibold">
                  Recipient confirmation
                </h3>
                {pendingClose && (
                  <p
                    role="status"
                    className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                  >
                    The close request has not been confirmed. Check the same
                    delivery before making any other changes.
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-first-name">First name</Label>
                    <Input
                      id="delivery-first-name"
                      maxLength={100}
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        resetSignature();
                      }}
                      disabled={disabled || locked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-last-name">Last name</Label>
                    <Input
                      id="delivery-last-name"
                      maxLength={100}
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        resetSignature();
                      }}
                      disabled={disabled || locked}
                    />
                  </div>
                </div>
                {shown.hasPending && (
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0"
                      checked={acceptPartial}
                      onChange={(e) => setAcceptPartial(e.target.checked)}
                      disabled={disabled || locked}
                    />
                    <span>
                      Continue with a partial delivery. The remaining pieces and
                      parts are listed under Pending pickup.
                    </span>
                  </label>
                )}
                <SignaturePad
                  value={signature}
                  onChange={setSignature}
                  disabled={disabled || locked}
                />
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    disabled={disabled || locked}
                  />
                  <span>
                    I reviewed this summary and acknowledge receipt of the parts
                    listed as delivered. Pending pickup items have not been
                    received in this delivery.
                  </span>
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={
                      disabled ||
                      (blocked && !pendingClose) ||
                      (!pendingClose &&
                        (!firstName.trim() ||
                          !lastName.trim() ||
                          !hasDeliverySignature(signature) ||
                          !accepted ||
                          (shown.hasPending && !acceptPartial)))
                    }
                    onClick={finishDelivery}
                  >
                    <ClipboardCheck className="mr-2 size-4" />
                    {pendingClose
                      ? "Check delivery close"
                      : "Sign and close delivery"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={disabled || locked}
                    onClick={() => {
                      setReview(false);
                      resetSignature();
                    }}
                  >
                    {manual ? "Back to delivery" : "Continue scanning"}
                  </Button>
                </div>
              </section>
            </section>
          ) : (
            <>
              <section className="space-y-4 rounded-2xl border bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    POs in this delivery
                  </h2>
                  {manual ? <Button variant="outline" disabled={disabled || scanning || pendingScan || locked} onClick={backToList}>
                    <Plus className="mr-2 size-4" />Add another PO
                  </Button> : <Dialog
                    open={poPickerOpen}
                    onOpenChange={(open) => {
                      if (lock.current || busy || scanning) return;
                      setPoPickerOpen(open);
                      if (open) {
                        setError("");
                        setNotice("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        disabled={disabled || scanning || pendingScan || locked}
                      >
                        <Plus className="mr-2 size-4" />
                        Add POs
                      </Button>
                    </DialogTrigger>
                    {poPickerOpen && (
                      <DialogContent
                        className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl"
                        showCloseButton={!busy}
                        onEscapeKeyDown={(event) => {
                          if (lock.current || busy) event.preventDefault();
                        }}
                        onInteractOutside={(event) => {
                          if (lock.current || busy) event.preventDefault();
                        }}
                      >
                        <DialogHeader className="shrink-0 text-left">
                          <DialogTitle>Add POs</DialogTitle>
                          <DialogDescription>
                            Choose available POs from any storage location.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
                          {error && (
                            <p
                              role="alert"
                              className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
                            >
                              {error}
                            </p>
                          )}
                          <CustomerDeliveryPoPicker
                            key={`${actorId}:${run.id}`}
                            run={run}
                            technician={technician}
                            disabled={
                              disabled || scanning || pendingScan || locked
                            }
                            onAdd={addPos}
                          />
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>}
                </div>
                {run.orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No POs added yet.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {run.orders.map((order) => (
                      <li
                        key={order.key}
                        className="flex items-center gap-2 rounded-lg border bg-slate-50 py-1 pl-3 pr-1 text-sm"
                      >
                        <span className="font-semibold">
                          PO {order.poNumber}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {order.source === "EXTERNAL"
                              ? "External PO"
                              : `Order ${order.orderNumber}`}
                          </span>
                        </span>
                        <Button type="button" variant="ghost" size="icon"
                          className="size-8 text-slate-500 hover:text-red-700"
                          aria-label={`Remove PO ${order.poNumber}`}
                          title={(order.canRemove ?? order.totalParts === 0)
                            ? `Remove PO ${order.poNumber}`
                            : "Correct this PO's recorded parts before removing it."}
                          disabled={sourceLocked || blocked || Boolean(pendingCreate) ||
                            !(order.canRemove ?? order.totalParts === 0)}
                          onClick={() => askRemovePo(order)}>
                          <X className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {manual && <p className="text-sm text-muted-foreground">These parts are saved for delivery. No scanning is needed. Stock is updated when the customer signs and you close the delivery.</p>}
              {(!manual || pendingScan) && <div className="space-y-3">
                <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${!scanStorage && !pendingScan ? "border-amber-300 bg-amber-50" : "bg-white"}`}>
                  <p className="text-sm">
                    {scanStorage ? (
                      <>
                        Scanning from: <strong>{scanStorage.storeName}</strong>
                      </>
                    ) : pendingScan ? (
                      "Checking the previous scan from its original storage."
                    ) : (
                      "Choose a storage to enable scanning."
                    )}
                  </p>
                  <Dialog
                    open={storagePickerOpen}
                    onOpenChange={(open) => {
                      if (open && sourceLocked) return;
                      setStoragePickerOpen(open);
                      if (open) {
                        setError("");
                        onScanModeChange?.(false);
                        void loadStorageOptions();
                      } else {
                        storageRequests.serial++;
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant={scanStorage ? "outline" : "default"}
                        disabled={sourceLocked}
                      >
                        <Warehouse className="mr-2 size-4" />
                        {scanStorage ? "Change storage" : "Choose storage"}
                      </Button>
                    </DialogTrigger>
                    {storagePickerOpen && (
                      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                        <DialogHeader className="text-left">
                          <DialogTitle>Choose storage</DialogTitle>
                          <DialogDescription>
                            Only locations with stock for this delivery&apos;s POs are shown.
                          </DialogDescription>
                        </DialogHeader>
                        {error && (
                          <p
                            role="alert"
                            className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
                          >
                            {error}
                          </p>
                        )}
                        {storageError ? (
                          <div className="space-y-3">
                            <p role="alert" className="text-sm text-red-800">{storageError}</p>
                            <Button type="button" variant="outline" disabled={sourceLocked}
                              onClick={() => void loadStorageOptions()}>Try again</Button>
                          </div>
                        ) : storageOptions === null ? (
                          <p role="status" className="text-sm text-muted-foreground">Loading available storages…</p>
                        ) : storageOptions.length === 0 ? (
                          <p role="status" className="text-sm text-muted-foreground">
                            {run.orders.length === 0
                              ? "Add POs to this delivery before choosing a storage."
                              : "No storage has available stock for this delivery's POs."}
                          </p>
                        ) : null}
                        <div className="grid gap-2">
                          {storageOptions?.map((store) => (
                              <Button
                                key={store.storeId ?? "unassigned"}
                                type="button"
                                variant="outline"
                                className="h-auto min-h-11 justify-between whitespace-normal px-4 py-3 text-left"
                                disabled={sourceLocked}
                                aria-pressed={scanStorage?.storeId === store.storeId}
                                onClick={() => chooseStorage(store)}
                              >
                                {store.storeName}
                                {scanStorage?.storeId === store.storeId && (
                                  <CheckCircle2 className="ml-2 size-4 shrink-0 text-emerald-700" />
                                )}
                              </Button>
                            ))}
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                </div>
                <p className="text-sm text-muted-foreground">
                  Confirmed scans are saved automatically. Parts leave warehouse
                  stock when the customer signs and you close the delivery.
                </p>
                <ScanPad<CustomerDeliveryRun | null>
                  key={`${run.id}:${scannerRevision}`}
                  scope={`customer-delivery-run:${actorId}:${run.id}`}
                  persistent
                  mobileFocus
                  prominent
                  cameraDialog
                  disabled={
                    disabled ||
                    locked ||
                    poPickerOpen ||
                    storagePickerOpen ||
                    Boolean(removePrompt) ||
                    Boolean(management) ||
                    (!scanStorage && !pendingScan) ||
                    run.status !== "ACTIVE"
                  }
                  retryOnly={manual || blocked || !scanStorage}
                  onPendingChange={setScanning}
                  onScanModeChange={onScanModeChange}
                  onRead={readPart}
                  onSaved={(next) => {
                    if (
                      next &&
                      currentRun.current?.id === next.id &&
                      liveIdentity.current
                    ) {
                      setRun(next);
                      setError("");
                      setNotice(
                        `Part saved. ${next.totalParts} physical parts recorded in delivery #${next.id}.`,
                      );
                    }
                  }}
                />
              </div>}
              <section className="space-y-4 rounded-2xl border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{manual ? "Parts in this delivery" : "Scanned and saved"}</h2>
                    <p className="mt-1 text-sm">
                      {run.totalPieces} pieces · {run.totalParts} physical parts
                    </p>
                  </div>
                  <Button
                    disabled={
                      disabled ||
                      scanning ||
                      pendingScan ||
                      locked ||
                      blocked ||
                      run.totalParts < 1
                    }
                    onClick={reviewDelivery}
                  >
                    <ClipboardCheck className="mr-2 size-4" />
                    Review and close delivery
                  </Button>
                </div>
                {run.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {manual ? "No parts are recorded in this delivery." : "Scan the first physical part to begin."}
                  </p>
                ) : (
                  <ul className="divide-y">
                    {run.items.map((item) => (
                      <li key={item.lineNumber} className="space-y-1 py-3">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium">
                              {item.description ||
                                [item.product, item.system, item.configuration]
                                  .filter(Boolean)
                                  .join(" · ") ||
                                "Piece"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              PO {item.poNumber} · Line {item.lineNumber}
                              {item.mark ? ` · Mark: ${item.mark}` : ""}
                            </p>
                            <p className="mt-1 text-sm">
                              {item.quantity} physical parts
                              {item.parts
                                ? ` · ${factoryPartsText(item.parts)}`
                                : ""}
                            </p>
                            <div className="mt-3 space-y-3">
                              {allocations
                                .filter(
                                  (allocation) =>
                                    allocation.lineNumber === item.lineNumber &&
                                    allocation.quantity > 0,
                                )
                                .map((allocation) => (
                                  <div
                                    key={`${item.lineNumber}:${allocation.storeId ?? "unassigned"}`}
                                    className="space-y-2 rounded-lg border bg-slate-50 px-3 py-2"
                                  >
                                    <p className="text-xs text-slate-600">
                                      <span className="font-medium">
                                        From {allocation.storeName}
                                      </span>{" "}
                                      · {allocation.quantity}{" "}
                                      {allocation.quantity === 1
                                        ? "part"
                                        : "parts"}
                                      {allocation.parts
                                        ? ` · ${factoryPartsText(allocation.parts)}`
                                        : ""}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {(["DOOR", "FRAME", "WINDOW"] as const)
                                        .filter(
                                          (type) =>
                                            (allocation.parts?.[type] ?? 0) > 0,
                                        )
                                        .map((type) => (
                                          <Button
                                            key={type}
                                            size="sm"
                                            variant="outline"
                                            disabled={
                                              disabled ||
                                              scanning ||
                                              pendingScan ||
                                              locked
                                            }
                                            onClick={() =>
                                              setRemovePrompt({
                                                barcode: `${item.lineNumber}-${type}`,
                                                partType: type,
                                                requestKey:
                                                  warehouseRequestKey(),
                                                storeId: allocation.storeId,
                                                storeName: allocation.storeName,
                                              })
                                            }
                                          >
                                            Remove one{" "}
                                            {type === "DOOR"
                                              ? "panel"
                                              : type === "FRAME"
                                                ? "frame"
                                                : "part"}
                                            {` from ${allocation.storeName}`}
                                          </Button>
                                        ))}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}
      <AlertDialog
        open={Boolean(poPrompt)}
        onOpenChange={(open) => {
          if (!open) answerPo.current?.(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Add PO {poPrompt?.poNumber} to this delivery?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This scanned part belongs to a PO that is not included. Choose Yes
              to add its PO and save this part. Choose No to leave the PO out
              and discard this scan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => answerPo.current?.(false)}>
              No, discard scan
            </Button>
            <Button
              disabled={offline || blocked}
              onClick={() => answerPo.current?.(true)}
            >
              Yes, add PO and part
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(removePrompt)}
        onOpenChange={(open) => {
          if (!open && !pendingRemoval && !busy) setRemovePrompt(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove one recorded part?</AlertDialogTitle>
            <AlertDialogDescription>
              This corrects one saved scan of{" "}
              {removePrompt
                ? factoryPartLabel[removePrompt.partType].toLowerCase()
                : "this part"}{" "}
              for line {removePrompt?.barcode.split("-")[0]} from{" "}
              {removePrompt?.storeName ?? "its original storage"}. It does not
              remove the PO or any other scanned parts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRemoval && (
            <p
              role="status"
              className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
            >
              The correction has not been confirmed. Check it again; the same
              part will not be removed twice.
            </p>
          )}
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={busy || Boolean(pendingRemoval)}
              onClick={() => setRemovePrompt(null)}
            >
              Keep part
            </Button>
            <Button disabled={disabled} onClick={removePart}>
              {pendingRemoval ? "Check part correction" : "Remove one part"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(management)} onOpenChange={(open) => {
        if (!open && !pendingManagement && !busy) setManagementPrompt(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {management?.action === "delete" ? `Delete delivery #${management.runId}?`
                : `Remove PO ${management?.action === "remove-po" ? management.poNumber : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {management?.action === "delete"
                ? "This delivery has no recorded scans. It will be removed from the delivery list."
                : "This PO has no recorded parts in this delivery. You can add it again later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingManagement && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            This change has not been confirmed. Check it again before continuing.
          </p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <AlertDialogFooter>
            <Button variant="outline" disabled={busy || Boolean(pendingManagement)}
              onClick={() => setManagementPrompt(null)}>Cancel</Button>
            <Button variant="destructive" disabled={disabled || (blocked && !pendingManagement)} onClick={manageDelivery}>
              {pendingManagement ? "Check delivery change"
                : management?.action === "delete" ? "Confirm deletion" : "Remove PO"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {technician && !embedded && (
        <p className="print:hidden">
          <Link className="text-sm underline" href="/technician">
            Technician home
          </Link>
        </p>
      )}
    </div>
  );
}

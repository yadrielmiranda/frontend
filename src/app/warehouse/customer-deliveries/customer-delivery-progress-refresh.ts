"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  customerDeliveryRun,
  customerDeliveryRuns,
  type CustomerDeliveryRun,
} from "@/app/api/customer-delivery-runs.api";
import type { Paged } from "@/app/api/warehouse.api";
import { errorMessage } from "../warehouse-shared";

type RefreshOptions = {
  actorId: number;
  actorRole: string;
  run: CustomerDeliveryRun | null;
  list: Paged<CustomerDeliveryRun>;
  status: "ACTIVE" | "CLOSED";
  paused: boolean;
  canRefresh: () => boolean;
  onRun: (run: CustomerDeliveryRun) => void;
  onList: (list: Paged<CustomerDeliveryRun>) => void;
};

export function useCustomerDeliveryProgressRefresh(options: RefreshOptions) {
  const latest = useRef(options);
  latest.current = options;
  const generation = useRef(0);
  const inFlight = useRef(false);
  const [syncError, setSyncError] = useState("");
  const invalidateProgress = useCallback(() => { generation.current++; }, []);
  const { actorId, actorRole, run, list, status, paused } = options;
  const runId = run?.id;
  const runStatus = run?.status;

  useEffect(() => {
    let canceled = false;
    if (paused || (runId !== undefined && runStatus !== "ACTIVE")) return;

    const refresh = async () => {
      const snapshot = latest.current;
      const connected = () => typeof navigator === "undefined" || navigator.onLine !== false;
      if (canceled || inFlight.current || snapshot.paused || !connected() || !snapshot.canRefresh()) return;
      const revision = generation.current;
      const stillCurrent = () => {
        const current = latest.current;
        return !canceled && revision === generation.current && !current.paused && connected() &&
          current.canRefresh() && current.actorId === snapshot.actorId &&
          current.actorRole === snapshot.actorRole && current.run === snapshot.run &&
          current.list === snapshot.list && current.status === snapshot.status;
      };
      inFlight.current = true;
      try {
        if (snapshot.run) {
          const next = await customerDeliveryRun(snapshot.run.id);
          if (stillCurrent()) { snapshot.onRun(next); setSyncError(""); }
        } else {
          const next = await customerDeliveryRuns({
            status: snapshot.status, page: snapshot.list.page, pageSize: snapshot.list.pageSize,
          });
          if (stillCurrent()) { snapshot.onList(next); setSyncError(""); }
        }
      } catch (error) {
        if (stillCurrent()) setSyncError(`Progress could not be refreshed. ${errorMessage(error)}`);
      } finally {
        inFlight.current = false;
      }
    };

    // The initial screen is already loaded. Keep updates quiet and never replace
    // a newer scan, a signed review, or a different screen with an old response.
    const timer = setInterval(() => { void refresh(); }, 5000);
    return () => { canceled = true; clearInterval(timer); };
  }, [actorId, actorRole, runId, runStatus, list.page, list.pageSize, status, paused]);

  useEffect(() => { setSyncError(""); }, [actorId, actorRole, runId, status, list.page]);

  return { syncError, invalidateProgress };
}

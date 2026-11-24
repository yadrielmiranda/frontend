import { useEffect, useRef } from "react";
import { apiFetch } from "@/app/api/_base";

const label = /^[A-Za-z0-9_-]{1,100}$/;
const storageKey = "impact-registration-attribution-v1";
const ttl = 24 * 60 * 60 * 1000;
type Attribution = { id: string; campaign: string; ad: string; since: number };
type Stage = "opened" | "started" | "submitted" | "invalid";

export function readCampaign(search: string) {
  const params = new URLSearchParams(search);
  const campaign = params.get("utm_campaign");
  const ad = params.get("utm_content") ?? "";
  if (!campaign || !label.test(campaign) || params.getAll("utm_campaign").length !== 1 ||
      params.getAll("utm_content").length > 1 || (ad && !label.test(ad))) return null;
  return { campaign, ad };
}

export function readRegistrationSource(search: string) {
  if (!new URLSearchParams(search).has("utm_campaign")) return { campaign: "", ad: "" };
  return readCampaign(search);
}

function attempt(): Attribution | null {
  const tags = readRegistrationSource(window.location.search);
  if (!tags || typeof window.crypto?.randomUUID !== "function") return null;
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as Attribution | null;
    if (stored && stored.campaign === tags.campaign && stored.ad === tags.ad &&
        Number.isFinite(stored.since) && stored.since <= Date.now() && Date.now() - stored.since < ttl &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(stored.id)) return stored;
  } catch { /* A browser may block storage. Continue for this visit only. */ }
  const fresh = { ...tags, id: window.crypto.randomUUID(), since: Date.now() };
  try { sessionStorage.setItem(storageKey, JSON.stringify(fresh)); } catch { /* Optional analytics. */ }
  return fresh;
}

export function useRegistrationMeasurement(enabled: boolean) {
  const current = useRef<Attribution | null>(null);
  const sent = useRef(new Set<Stage>());
  function fields() {
    if (!enabled) return null;
    current.current ??= attempt();
    if (!current.current) return null;
    const { id, campaign, ad } = current.current;
    return { id, campaign, ad };
  }
  function record(stage: Stage) {
    const body = fields();
    if (!body || sent.current.has(stage)) return;
    sent.current.add(stage);
    void apiFetch("/api/registration-analytics/event", {
      method: "POST", body: { ...body, stage }, timeoutMs: 2500, suppressAuthEvent: true,
    }).catch(() => { sent.current.delete(stage); });
  }
  useEffect(() => { if (enabled) record("opened"); }, [enabled]); // One visit; re-renders do not increase counts.
  return { record, header: () => { const a = fields(); return a ? JSON.stringify(a) : undefined; } };
}

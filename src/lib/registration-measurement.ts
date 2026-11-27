import { useEffect, useRef } from "react";
import { apiFetch } from "@/app/api/_base";
import { parseCompanyCampaign, readCompanyCampaign } from "./company-campaign";

const storageKey = "impact-registration-attribution-v1";
const ttl = 24 * 60 * 60 * 1000;
type Attribution = { id: string; campaign: string; ad: string; since: number };
type Stage = "opened" | "started" | "submitted" | "invalid";

function campaignSource(tags: URLSearchParams | null) {
  const campaign = tags?.get("utm_campaign");
  return campaign ? { campaign, ad: tags?.get("utm_content") ?? "" } : null;
}

export function readCampaign(search: string) {
  return campaignSource(parseCompanyCampaign(new URLSearchParams(search)));
}

export function readRegistrationSource(search: string, stored: URLSearchParams | null = null) {
  const params = new URLSearchParams(search);
  const explicit = parseCompanyCampaign(params);
  if (!explicit) {
    if (params.has("ref") || params.has("utm_campaign")) return null;
    return { campaign: "", ad: "" };
  }
  const source = explicit.size ? explicit : stored;
  return campaignSource(source) ?? { campaign: "", ad: "" };
}

function attempt(): Attribution | null {
  const tags = readRegistrationSource(window.location.search, readCompanyCampaign());
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

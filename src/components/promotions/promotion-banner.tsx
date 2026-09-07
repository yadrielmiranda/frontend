"use client";

import { useEffect, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  Clock3,
  Info,
  ShieldCheck,
  Tag,
} from "lucide-react";
import {
  getAvailablePromotions,
  type Promotion,
} from "@/app/api/promotions.api";
import type { Estimate } from "@/lib/types";
import styles from "./promotion-banner.module.css";

function formatDeadline(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function usePromotionExpired(
  estimate?: Pick<
    Estimate,
    "promotionExpiresAt" | "promotionLockedAt" | "expiresAt"
  >,
) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    !!estimate?.promotionExpiresAt &&
    !estimate.promotionLockedAt &&
    Math.min(
      Date.parse(estimate.promotionExpiresAt),
      estimate.expiresAt ? Date.parse(estimate.expiresAt) : Infinity,
    ) <= now
  );
}
export function PromotionBanner({ estimate }: { estimate?: Estimate }) {
  const [offers, setOffers] = useState<Promotion[]>([]);
  const expired = usePromotionExpired(estimate);
  useEffect(() => {
    let alive = true;
    const load = () =>
      getAvailablePromotions(estimate?.id)
        .then((r) => {
          if (alive) setOffers(r.promotions);
        })
        .catch(() => {});
    void load();
    const timer = setInterval(load, 60000);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [estimate?.id]);
  const applied = !!estimate?.promotionExpiresAt;
  if (!offers.length && !applied) return null;

  const preserved = !!estimate?.promotionLockedAt;
  const deadline = estimate?.expiresAt ?? estimate?.promotionExpiresAt;
  const StatusIcon = expired
    ? CircleAlert
    : preserved
      ? ShieldCheck
      : CircleCheck;

  return (
    <aside className={styles.banner} aria-label="Promotions">
      {applied && (
        <div
          className={`${styles.status} ${expired ? styles.expired : preserved ? styles.preserved : styles.applied}`}
          role="status"
        >
          <StatusIcon className={styles.statusIcon} aria-hidden="true" />
          <div className={styles.statusContent}>
            <strong className={styles.statusTitle}>
              {expired
                ? "Promotion expired"
                : preserved
                  ? "Promotion preserved"
                  : "Promotion applied"}
            </strong>
            <p className={styles.statusDescription}>
              {expired ? (
                "Use Recalculate at the top of this estimate before continuing to payment."
              ) : preserved ? (
                "The agreed promotion is preserved after payment."
              ) : (
                <>
                  Estimate valid until{" "}
                  <time dateTime={deadline!} suppressHydrationWarning>
                    {formatDeadline(deadline!)}
                  </time>
                  .
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {offers.length > 0 && (
        <ul
          className={styles.offers}
          aria-label="Available material promotions"
        >
          {offers.map((offer, index) => {
            const percent = String(Number(offer.percent));
            const scope = [
              { label: "Brand", name: offer.brandName },
              { label: "Product", name: offer.productName },
              { label: "System", name: offer.systemName },
            ].filter((item) => item.name);

            return (
              <li
                key={offer.id}
                className={styles.offer}
                style={{ animationDelay: `${Math.min(index, 3) * 70}ms` }}
              >
                <div
                  className={styles.discount}
                  role="img"
                  aria-label={`${percent}% off`}
                >
                  <span
                    className={`${styles.discountValue} ${percent.length > 4 ? styles.preciseDiscount : ""}`}
                    aria-hidden="true"
                  >
                    {percent}
                    <span className={styles.percentSign}>%</span>
                  </span>
                  <span className={styles.discountLabel} aria-hidden="true">
                    off
                  </span>
                </div>

                <div className={styles.details}>
                  <p className={styles.eyebrow}>
                    <Tag aria-hidden="true" />
                    Material promotion
                  </p>
                  <p className={styles.offerTitle}>{offer.name}</p>
                  <div className={styles.scope}>
                    {scope.length ? (
                      scope.map((item) => (
                        <span
                          key={item.label}
                          className={styles.scopeTag}
                          title={`${item.label}: ${item.name}`}
                        >
                          <span className="sr-only">{item.label}: </span>
                          {item.name}
                        </span>
                      ))
                    ) : (
                      <span className={styles.allMaterials}>All materials</span>
                    )}
                  </div>
                </div>

                <div className={styles.expiry}>
                  <Clock3 aria-hidden="true" />
                  <div className={styles.expiryContent}>
                    <span className={styles.expiryLabel}>Offer ends</span>
                    <time dateTime={offer.endsAt} suppressHydrationWarning>
                      {formatDeadline(offer.endsAt)}
                    </time>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {estimate && offers.length > 0 && !applied && !preserved && !expired && (
        <p className={styles.hint}>
          <Info aria-hidden="true" />
          <span>
            Use <strong>Recalculate</strong> at the top of this estimate to
            apply eligible offers.
          </span>
        </p>
      )}
    </aside>
  );
}

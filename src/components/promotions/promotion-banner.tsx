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
  type AvailablePromotion,
} from "@/app/api/promotions.api";
import type { Estimate } from "@/lib/types";
import type { CompanyLocale } from "@/components/company/company-content";
import styles from "./promotion-banner.module.css";

const spanish = {
  "Promotions": "Promociones",
  "Promotion expired": "Promoción vencida",
  "Promotion preserved": "Promoción conservada",
  "Promotion applied": "Promoción aplicada",
  "Use Recalculate at the top of this estimate before continuing to payment.":
    "Selecciona Recalcular en la parte superior de esta cotización antes de continuar al pago.",
  "The agreed promotion is preserved after payment.": "La promoción acordada se mantiene después del pago.",
  "Estimate valid until": "Cotización válida hasta",
  "Available material promotions": "Promociones disponibles para materiales",
  "Brand": "Marca",
  "Product": "Producto",
  "System": "Sistema",
  "Automatic dealer offer": "Oferta automática para distribuidores",
  "off": "de descuento",
  "dealer": "distribuidor",
  "Material promotion": "Promoción de materiales",
  "Your discount is calculated for each eligible piece.": "Tu descuento se calcula por cada unidad elegible.",
  "All materials": "Todos los materiales",
  "Excluded products": "Productos excluidos",
  "Excluded systems": "Sistemas excluidos",
  "Offer ends": "La oferta termina",
  "Use": "Selecciona",
  "Recalculate": "Recalcular",
  "at the top of this estimate to apply eligible offers.":
    "en la parte superior de esta cotización para aplicar las ofertas disponibles.",
};

function formatDeadline(value: string, locale?: CompanyLocale) {
  const dateLocale = locale === "es" ? "es-US" : locale === "en" ? "en-US" : undefined;
  return new Date(value).toLocaleString(dateLocale, {
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
export function PromotionBanner({ estimate, locale }: { estimate?: Estimate; locale?: CompanyLocale }) {
  const t = (label: keyof typeof spanish) => locale === "es" ? spanish[label] : label;
  const [offers, setOffers] = useState<AvailablePromotion[]>([]);
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
  }, [estimate]);
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
    <aside lang={locale} className={styles.banner} aria-label={t("Promotions")}>
      {applied && (
        <div
          className={`${styles.status} ${expired ? styles.expired : preserved ? styles.preserved : styles.applied}`}
          role="status"
        >
          <StatusIcon className={styles.statusIcon} aria-hidden="true" />
          <div className={styles.statusContent}>
            <strong className={styles.statusTitle}>
              {t(expired
                ? "Promotion expired"
                : preserved
                  ? "Promotion preserved"
                  : "Promotion applied")}
            </strong>
            <p className={styles.statusDescription}>
              {expired ? (
                t("Use Recalculate at the top of this estimate before continuing to payment.")
              ) : preserved ? (
                t("The agreed promotion is preserved after payment.")
              ) : (
                <>
                  {t("Estimate valid until")}{" "}
                  <time dateTime={deadline!} suppressHydrationWarning>
                    {formatDeadline(deadline!, locale)}
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
          aria-label={t("Available material promotions")}
        >
          {offers.map((offer, index) => {
            const automatic = !!offer.automaticDealerAdjustment;
            const percent =
              offer.percent === null ? "" : String(Number(offer.percent));
            const scope = [
              { label: t("Brand"), name: offer.brandName },
              { label: t("Product"), name: offer.productName },
              { label: t("System"), name: offer.systemName },
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
                  aria-label={
                    automatic ? t("Automatic dealer offer") : `${percent}% ${t("off")}`
                  }
                >
                  {automatic ? (
                    <Tag className="size-7" aria-hidden="true" />
                  ) : (
                    <span
                      className={`${styles.discountValue} ${percent.length > 4 ? styles.preciseDiscount : ""}`}
                      aria-hidden="true"
                    >
                      {percent}
                      <span className={styles.percentSign}>%</span>
                    </span>
                  )}
                  <span className={styles.discountLabel} aria-hidden="true">
                    {t(automatic ? "dealer" : "off")}
                  </span>
                </div>

                <div className={styles.details}>
                  <p className={styles.eyebrow}>
                    <Tag aria-hidden="true" />
                    {t(automatic ? "Automatic dealer offer" : "Material promotion")}
                  </p>
                  <p className={styles.offerTitle}>{offer.name}</p>
                  {automatic && (
                    <p className="mt-1 text-sm text-slate-600">
                      {t("Your discount is calculated for each eligible piece.")}
                    </p>
                  )}
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
                      <span className={styles.allMaterials}>{t("All materials")}</span>
                    )}
                  </div>
                  {!!offer.excludedProductNames?.length && (
                    <p className="mt-2 text-xs text-slate-600">
                      {t("Excluded products")}: {offer.excludedProductNames.join(", ")}
                    </p>
                  )}
                  {!!offer.excludedSystemNames?.length && (
                    <p className="mt-1 text-xs text-slate-600">
                      {t("Excluded systems")}: {offer.excludedSystemNames.join(", ")}
                    </p>
                  )}
                </div>

                <div className={styles.expiry}>
                  <Clock3 aria-hidden="true" />
                  <div className={styles.expiryContent}>
                    <span className={styles.expiryLabel}>{t("Offer ends")}</span>
                    <time dateTime={offer.endsAt} suppressHydrationWarning>
                      {formatDeadline(offer.endsAt, locale)}
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
            {t("Use")} <strong>{t("Recalculate")}</strong>{" "}
            {t("at the top of this estimate to apply eligible offers.")}
          </span>
        </p>
      )}
    </aside>
  );
}

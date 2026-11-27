import { MaterialRevisionAccess } from "@/components/estimates/material-revisions/material-revision-access";
import { OrderReviewPanel } from "@/components/estimates/order-review-panel";
import { notFound } from "next/navigation";
import { EstimateEditorShell } from "@/components/estimates/estimate-editor-shell";

// API functions
import { getEstimate } from "@/app/api/estimates.api";
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getTints } from "@/app/api/tints.api";
import { getCoatings } from "@/app/api/coatings.api";
import { getPrivacies } from "@/app/api/privacies.api";
import { getFColors } from "@/app/api/fcolors.api";
import { getGlobalFrameColors } from "@/app/api/fcolors.api";
import { getCrystals } from "@/app/api/crystals.api";
import { getGlobalParameters } from "@/app/api/global-parameters.api";
import { getMuntinPatterns } from "@/app/api/muntin-patterns.api";
import { getMuntinTypes } from "@/app/api/muntin-types.api";
import { EstimateForm } from "@/components/estimates/estimate-form";
import { isApiError } from "@/app/api/_base";
import { getCurrentUser } from "@/lib/session";
import { getEstimateInstallation } from "@/app/api/installations.api";
import { isAdminRole, isOperatorRole } from "@/lib/rbac";
import { canEditInstallationBeforePayment } from "@/lib/installation-flow";

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const { id } = await params;
  const estimateId = Number(id);

  if (Number.isNaN(estimateId)) notFound();

  let estimate;

  try {
    estimate = await getEstimate(estimateId);
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 403)) {
      notFound();
    }
    throw e;
  }

  if (!estimate) notFound();

  const installation = await getEstimateInstallation(estimateId);

  const isOwner = user.id === estimate.idUser;
  const isPrivileged =
    isAdminRole(user.role.name) || isOperatorRole(user.role.name);
  const isActive = estimate.status?.name === "Active";
  const pendingOrderReview = estimate.status?.name === "Pending order review";

  const isPaymentLocked = (estimate.payments ?? []).some((payment) =>
    (payment.type === "MATERIAL" || payment.type === "INSTALLMENT") &&
    (payment.status === "PAID" || payment.status === "REFUNDED" ||
      Boolean(payment.paidAt) || Boolean(payment.stripeSessionId)));

  const canAccess = (isOwner || isPrivileged || estimate.dealerNetwork?.canAssist) && (isActive || pendingOrderReview || (estimate.status?.name === "Expired" && !!estimate.promotionExpiresAt)) && !estimate.order;

  if (!canAccess) notFound();

  const baseReadOnly = pendingOrderReview || isPaymentLocked || Boolean(estimate.promotionLockedAt) ||
    Boolean(estimate.manualDiscount?.lockedAt);
  const canEdit = !baseReadOnly && canEditInstallationBeforePayment(installation, estimate.payments);

  const [
    productsWithBrands,
    systemsWithConfigs,
    allFrameColors,
    globalFrameColors,
    crystals,
    tints,
    coatings,
    privacies,
    parameters,
    muntinPatterns,
    muntinTypes,
  ] = await Promise.all([
    getProductsWithBrands(),
    getSystemsWithConfigs(),
    getFColors(),
    getGlobalFrameColors(),
    getCrystals(),
    getTints(),
    getCoatings(),
    getPrivacies(),
    getGlobalParameters(),
    getMuntinPatterns({ active: true }),
    getMuntinTypes({ active: true }),
  ]);

  const salesTaxParam = parameters.find((p) => p.key === "SALES_TAX");
  const taxRate = salesTaxParam ? salesTaxParam.value : 0;
  const cardSurchargeFraction = Number(
    parameters.find((p) => p.key === "CARD_SURCHARGE_PERCENT")?.value ?? 0,
  );

  return (
    <EstimateEditorShell number={estimate.number}
      mode={pendingOrderReview ? "review" : canEdit ? "edit" : installation?.dealerMeasurementsAcceptedAt ? "measured" : "locked"}>
      {!pendingOrderReview && <MaterialRevisionAccess estimateId={estimateId} />}
      {pendingOrderReview && <OrderReviewPanel estimateId={estimateId} isAdmin={isAdminRole(user.role.name)} blockedReason={estimate.paymentSchedule?.orderReviewBlockedReason} />}
      <EstimateForm
        estimate={estimate}
        initialInstallation={installation}
        currentUserId={user.id}
        isPrivileged={isPrivileged}
        readOnly={baseReadOnly}
        taxRate={taxRate}
        cardSurchargeFraction={cardSurchargeFraction}
        productsWithBrands={productsWithBrands}
        systemsWithConfigs={systemsWithConfigs}
        frameColors={allFrameColors}
        globalFrameColors={globalFrameColors}
        crystals={crystals}
        tints={tints}
        coatings={coatings}
        privacies={privacies}
        muntinPatterns={muntinPatterns}
        muntinTypes={muntinTypes}
      />
    </EstimateEditorShell>
  );
}

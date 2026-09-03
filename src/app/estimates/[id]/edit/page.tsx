import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
import { BackLink } from "@/components/navigation/back-link";
import { getEstimateInstallation } from "@/app/api/installations.api";
import { isAdminRole, isOperatorRole } from "@/lib/rbac";

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

  const materialPayment = estimate.payments?.find(
    (payment) => payment.type === "MATERIAL",
  );
  const isPaymentLocked =
    materialPayment?.status === "PAID" ||
    Boolean(materialPayment?.stripeSessionId);

  const depositPayment = (installation?.payments ?? []).find(
    (payment) => payment.type === "INSTALLATION_DEPOSIT",
  );
  const depositCheckoutStarted =
    installation?.status !== "CANCELED" &&
    (depositPayment?.status === "PAID" ||
      Boolean(depositPayment?.stripeSessionId));
  const installationLocksOwner = Boolean(
    installation &&
    installation.status !== "DEPOSIT_PAYMENT_PENDING" &&
    installation.status !== "CANCELED",
  );

  const canAccess = (isOwner || isPrivileged) && isActive && !estimate.order;

  if (!canAccess) notFound();

  const canEdit =
    !isPaymentLocked && !installationLocksOwner && !depositCheckoutStarted;

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
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-gray-50 py-4 md:px-4 md:py-6">
      <div className="min-w-0 w-full">
        <div className="mb-4 flex items-center justify-between">
          <BackLink href="/estimates" label="Back to Estimate" />
        </div>

        <Card className="relative min-w-0 max-w-full shadow-lg">
          <CardHeader className="min-w-0 px-4 sm:px-6 sm:pr-72">
            <CardTitle className="break-words text-xl sm:text-2xl">
              Estimate #{estimate.number}
            </CardTitle>
            <CardDescription>
              {canEdit
                ? "Update the details for this estimate."
                : "Material details are locked. Remeasurement changes must be submitted through the pending Estimate revision."}
            </CardDescription>
          </CardHeader>

          <CardContent className="min-w-0 px-4 sm:px-6">
            <EstimateForm
              estimate={estimate}
              initialInstallation={installation}
              currentUserId={user.id}
              isPrivileged={isPrivileged}
              readOnly={!canEdit}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import type { RegistrationLevel } from "@/app/api/dealer-network.api";
import { dealerRegistrationUrl, type CompanyLocale } from "@/components/company/company-content";
import { hasEligibleDealerCampaign } from "./registration-pixel";
import { transferDealerReceipt } from "./dealer-submission-receipt";

export function openDealerSubmissionConfirmation(token: string, level: RegistrationLevel, locale: CompanyLocale) {
  const invitation = new URL(dealerRegistrationUrl);
  if (level !== "Dealer" || window.location.origin !== invitation.origin ||
      window.location.pathname !== invitation.pathname ||
      invitation.pathname !== `/login/dealer-registration/${encodeURIComponent(token)}` ||
      !hasEligibleDealerCampaign()) return false;
  return transferDealerReceipt({ locale });
}

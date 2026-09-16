import { getPaymentPlans } from "@/app/api/payment-plans.api";
import { PaymentPlansClient } from "./payment-plans-client";
export default async function PaymentPlansPage() {
  return (
    <div className="container mx-auto max-w-6xl py-10">
      <PaymentPlansClient initialPlans={await getPaymentPlans()} />
    </div>
  );
}

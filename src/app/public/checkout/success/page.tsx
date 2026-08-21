import { Suspense } from "react";
import PublicCheckoutSuccessContent from "./public-checkout-success-content";

export default function PublicCheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PublicCheckoutSuccessContent />
    </Suspense>
  );
}

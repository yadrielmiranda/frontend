import { Suspense } from "react";
import PublicCheckoutCancelContent from "./public-checkout-cancel-content";

export default function PublicCheckoutCancelPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PublicCheckoutCancelContent />
    </Suspense>
  );
}

// src/app/checkout/success/page.tsx

import { Suspense } from "react";
import CheckoutSuccessContent from "./checkout-success-content";

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
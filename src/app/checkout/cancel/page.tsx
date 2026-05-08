// src/app/checkout/cancel/page.tsx

import { Suspense } from "react";
import CheckoutCancelContent from "./checkout-cancel-content";

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CheckoutCancelContent />
    </Suspense>
  );
}
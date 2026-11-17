"use client";

import { Suspense } from "react";
import ReceiptEditor from "@/components/ReceiptEditor";

export default function NewReceipt() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <ReceiptEditor id="new" />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import QuotationEditor from "@/components/QuotationEditor";

export default function NewQuotation() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <QuotationEditor id="new" />
    </Suspense>
  );
}

"use client";

import { use, Suspense } from "react";
import QuotationEditor from "@/components/QuotationEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditQuotation({ params }: PageProps) {
  const resolvedParams = use(params);
  const quotationId = (!resolvedParams.id || resolvedParams.id === "undefined") ? "new" : resolvedParams.id;
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <QuotationEditor id={quotationId} />
    </Suspense>
  );
}

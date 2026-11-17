"use client";

import { use, Suspense } from "react";
import ClientQuotationViewer from "@/components/ClientQuotationViewer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ViewQuotation({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <ClientQuotationViewer id={resolvedParams.id} />
    </Suspense>
  );
}

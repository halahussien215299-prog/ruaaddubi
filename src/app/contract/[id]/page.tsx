"use client";

import { use, Suspense } from "react";
import ContractEditor from "@/components/ContractEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditContract({ params }: PageProps) {
  const resolvedParams = use(params);
  const contractId = (!resolvedParams.id || resolvedParams.id === "undefined") ? "new" : resolvedParams.id;
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <ContractEditor id={contractId} />
    </Suspense>
  );
}

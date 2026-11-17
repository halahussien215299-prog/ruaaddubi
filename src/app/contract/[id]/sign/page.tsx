"use client";

import { use, Suspense } from "react";
import ClientContractSigner from "@/components/ClientContractSigner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SignContract({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <ClientContractSigner id={resolvedParams.id} />
    </Suspense>
  );
}

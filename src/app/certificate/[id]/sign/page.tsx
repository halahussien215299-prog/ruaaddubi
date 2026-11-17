"use client";

import { Suspense, use } from "react";
import ClientCertificateSigner from "@/components/ClientCertificateSigner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SignCertificatePage({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading portal...</div>}>
      <ClientCertificateSigner id={resolvedParams.id} />
    </Suspense>
  );
}

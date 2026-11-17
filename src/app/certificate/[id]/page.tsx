"use client";

import { Suspense, use } from "react";
import CertificateEditor from "@/components/CertificateEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditCertificate({ params }: PageProps) {
  const resolvedParams = use(params);
  const certificateId = (!resolvedParams.id || resolvedParams.id === "undefined") ? "new" : resolvedParams.id;
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <CertificateEditor id={certificateId} />
    </Suspense>
  );
}

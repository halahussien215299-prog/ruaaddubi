"use client";

import { Suspense } from "react";
import CertificateEditor from "@/components/CertificateEditor";

export default function NewCertificate() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <CertificateEditor id="new" />
    </Suspense>
  );
}

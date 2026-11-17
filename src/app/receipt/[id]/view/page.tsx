"use client";

import { use, Suspense } from "react";
import ClientReceiptViewer from "@/components/ClientReceiptViewer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ViewReceipt({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <ClientReceiptViewer id={resolvedParams.id} />
    </Suspense>
  );
}

"use client";

import { Suspense, use } from "react";
import ReceiptEditor from "@/components/ReceiptEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditReceipt({ params }: PageProps) {
  const resolvedParams = use(params);
  const receiptId = (!resolvedParams.id || resolvedParams.id === "undefined") ? "new" : resolvedParams.id;
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <ReceiptEditor id={receiptId} />
    </Suspense>
  );
}

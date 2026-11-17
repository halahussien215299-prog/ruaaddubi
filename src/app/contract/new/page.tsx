"use client";

import { Suspense } from "react";
import ContractEditor from "@/components/ContractEditor";

export default function NewContract() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <ContractEditor id="new" />
    </Suspense>
  );
}

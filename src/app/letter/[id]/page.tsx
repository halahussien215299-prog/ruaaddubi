"use client";

import { useParams } from "next/navigation";
import OfficialLetterEditor from "@/components/OfficialLetterEditor";

export default function EditLetterPage() {
  const params = useParams();
  const rawId = params.id as string;
  const id = (!rawId || rawId === "undefined") ? "new" : rawId;
  return <OfficialLetterEditor id={id} />;
}

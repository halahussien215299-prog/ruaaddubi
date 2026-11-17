"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Printer, 
  Share2, 
  Plus, 
  Trash2, 
  Loader2,
  Award,
  Check,
  RotateCcw,
  PenTool
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { saveCertificate, getCertificate, getAllCertificates, Certificate, CertificateItem, getSettings, Settings } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CertificateEditorProps {
  id?: string;
}

const DEFAULT_CERTIFICATE_VALUES = {
  project: "Mr. Mohamed Villa 1 Al Aweer - Sharjah",
  systemType: "Extra Low Voltage & Wireless Home Automation & Network",
  statement: "This is to certify that M/S RUAAD SMART SMART MACHINE TRADING LLC has completed the ELV system's supply, installation, testing, and commissioning for the project mentioned above and handed it over within the stipulated period, and also maintained the quality of work.",
  checklist: [
    { id: "c-1", system: "Curtain System", remarks: "8 Curtain Motors", done: true },
    { id: "c-2", system: "Lighting Control System", remarks: "17 Lighting Switches", done: true },
    { id: "c-3", system: "Air Conditioning Control System", remarks: "6 AC Switches", done: true },
    { id: "c-4", system: "Smart Home Control System", remarks: "2 Smart Screens", done: true },
    { id: "c-5", system: "CCTV System", remarks: "All cameras which were supplied are Fixed and Programmed.", done: true },
    { id: "c-6", system: "Network / WiFi System", remarks: "3 Repeaters", done: true },
  ],
  warrantyText: "Warranty starts from date of this certificate.",
  clientName: "",
  clientSignature: "",
  clientDate: new Date().toLocaleDateString("en-GB"),
  integratorName: "RUAAD SMART SMART MACHINE TRADING LLC",
  integratorSignature: "",
  integratorDate: new Date().toLocaleDateString("en-GB"),
  address: "Business Bay – Churchill Tower, Office 404 – Floor 4, Dubai, UAE",
  website: "ruaadsmart.ae",
  phone: "+971 552067179"
};

export default function CertificateEditor({ id }: CertificateEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");
  const [settings, setSettings] = useState<Settings | null>(null);

  const isPrintMode = searchParams.get("print") === "true";

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    if (isMounted && !loading) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const downloadParam = new URLSearchParams(search).get("download");
      if (downloadParam === "true") {
        setTimeout(() => {
          handleDownloadPDF();
        }, 1200);
      }
    }
  }, [isMounted, loading]);

  const previewRef = useRef<HTMLDivElement>(null);
  const clientSigRef = useRef<SignatureCanvas>(null);
  const integratorSigRef = useRef<SignatureCanvas>(null);

  const { register, control, handleSubmit, watch, setValue, reset } = useForm<Certificate>({
    defaultValues: DEFAULT_CERTIFICATE_VALUES
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "checklist"
  });

  useEffect(() => {
    setIsMounted(true);
    if (id && id !== "new" && id !== "undefined") {
      const docId = id;
      async function loadCertificate() {
        try {
          const data = await getCertificate(docId);
          if (data) {
            reset(data);
            
            // Load signatures into canvas after rendering
            setTimeout(() => {
              if (data.clientSignature && clientSigRef.current) {
                clientSigRef.current.fromDataURL(data.clientSignature);
              }
              if (data.integratorSignature && integratorSigRef.current) {
                integratorSigRef.current.fromDataURL(data.integratorSignature);
              }
            }, 200);

          } else {
            alert("Certificate not found");
            router.push("/");
          }
        } catch (error) {
          console.error("Error loading certificate:", error);
        } finally {
          setLoading(false);
        }
      }
      loadCertificate();
    } else {
      setLoading(false);
    }
  }, [id, reset, router]);

  const onSignatureEnd = (type: "client" | "integrator") => {
    if (type === "client" && clientSigRef.current) {
      if (!clientSigRef.current.isEmpty()) {
        setValue("clientSignature", clientSigRef.current.toDataURL("image/png"));
      }
    } else if (type === "integrator" && integratorSigRef.current) {
      if (!integratorSigRef.current.isEmpty()) {
        setValue("integratorSignature", integratorSigRef.current.toDataURL("image/png"));
      }
    }
  };

  const clearSignature = (type: "client" | "integrator") => {
    if (type === "client" && clientSigRef.current) {
      clientSigRef.current.clear();
      setValue("clientSignature", "");
    } else if (type === "integrator" && integratorSigRef.current) {
      integratorSigRef.current.clear();
      setValue("integratorSignature", "");
    }
  };

  const saveDocHelper = async (data: Certificate): Promise<string> => {
    let documentId = (!id || id === "new" || id === "undefined") ? "new" : id;
    if (documentId === "new") {
      try {
        const certs = await getAllCertificates();
        let maxNum = 1000;
        certs.forEach(c => {
          if (c.id && c.id.startsWith("cert-")) {
            const numPart = c.id.slice("cert-".length);
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        });
        documentId = `cert-${maxNum + 1}`;
      } catch (err) {
        documentId = `cert-${Date.now()}`;
      }
    }
    const now = new Date().toISOString();
    const updatedDoc: Certificate = {
      ...data,
      id: documentId,
      createdAt: data.createdAt || now,
      updatedAt: now
    };
    await saveCertificate(updatedDoc);
    return documentId;
  };

  const onSubmit = async (data: Certificate) => {
    setSaving(true);
    try {
      await saveDocHelper(data);
      router.refresh();
      alert(language === "ar" ? "تم حفظ شهادة إتمام العمل بنجاح!" : "Work Completion Certificate saved successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error saving certificate:", error);
      alert(language === "ar" ? "فشل حفظ شهادة إتمام العمل." : "Failed to save certificate.");
    } finally {
      setSaving(false);
    }
  };

  const makeColorConverter = (doc: Document) => {
    const tmpCanvas = doc.createElement("canvas");
    tmpCanvas.width = 1;
    tmpCanvas.height = 1;
    const ctx = tmpCanvas.getContext("2d");
    return (color: string): string => {
      if (!ctx) return "#000000";
      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        if (a === 0) return "rgba(0,0,0,0)";
        return `rgb(${r},${g},${b})`;
      } catch {
        return "#000000";
      }
    };
  };

  const patchDocumentColors = (doc: Document) => {
    const toRgb = makeColorConverter(doc);
    doc.querySelectorAll("style").forEach((styleEl) => {
      if (!styleEl.textContent) return;
      if (styleEl.textContent.includes("oklch") || styleEl.textContent.includes("oklab") || styleEl.textContent.includes("lab(")) {
        styleEl.textContent = styleEl.textContent
          .replace(/oklch\([^)]+\)/g, (m) => toRgb(m))
          .replace(/oklab\([^)]+\)/g, (m) => toRgb(m))
          .replace(/\blab\([^)]+\)/g, (m) => toRgb(m));
      }
    });
    // Remove external link stylesheets so html2canvas never encounters un-parsed oklab/oklch rules
    doc.querySelectorAll("link[rel='stylesheet'], link[as='style']").forEach((l) => l.remove());
  };

  const bakeElementStyles = (origElement: HTMLElement, cloneElement: HTMLElement) => {
    const toRgb = makeColorConverter(document);
    const propsToCopy = [
      "display", "position", "top", "right", "bottom", "left", "float", "clear",
      "width", "height", "min-width", "min-height", "max-width", "max-height",
      "margin-top", "margin-right", "margin-bottom", "margin-left",
      "padding-top", "padding-right", "padding-bottom", "padding-left",
      "box-sizing", "overflow", "overflow-x", "overflow-y", "z-index",
      "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis",
      "justify-content", "align-items", "align-content", "gap", "row-gap", "column-gap",
      "grid-template-columns", "grid-template-rows", "grid-column", "grid-row", "grid-auto-flow",
      "font-family", "font-size", "font-weight", "font-style", "line-height",
      "text-align", "text-decoration", "direction",
      "color", "background-color", "background-image", "background-position", "background-size", "background-repeat",
      "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
      "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
      "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
      "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius",
      "box-shadow", "opacity", "object-fit"
    ];

    const origEls = [origElement, ...Array.from(origElement.querySelectorAll("*"))];
    const cloneEls = [cloneElement, ...Array.from(cloneElement.querySelectorAll("*"))];

    origEls.forEach((orig, i) => {
      const cloneEl = cloneEls[i];
      if (!(orig instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) return;
      const computed = window.getComputedStyle(orig);

      propsToCopy.forEach((prop) => {
        let val = computed.getPropertyValue(prop);
        if (!val) return;

        // Convert any oklch / oklab / lab colors to rgb
        if (val.includes("oklch") || val.includes("oklab") || val.includes("lab(")) {
          val = val
            .replace(/oklch\([^)]+\)/g, (m) => toRgb(m))
            .replace(/oklab\([^)]+\)/g, (m) => toRgb(m))
            .replace(/\blab\([^)]+\)/g, (m) => toRgb(m));
        }
        cloneEl.style.setProperty(prop, val, "important");
      });
    });
  };

  const captureElementAsCanvas = async (element: HTMLDivElement): Promise<HTMLCanvasElement> => {
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
    }

    const clone = element.cloneNode(true) as HTMLDivElement;
    clone.style.position = "absolute";
    clone.style.top = "0";
    clone.style.left = "-9999px";
    clone.style.setProperty("width", "210mm", "important");
    clone.style.setProperty("min-width", "210mm", "important");
    clone.style.setProperty("height", "297mm", "important");
    clone.style.setProperty("min-height", "297mm", "important");
    clone.style.setProperty("zoom", "1", "important");
    clone.style.setProperty("transform", "none", "important");
    document.body.appendChild(clone);

    // Save original styles and force desktop print size temporarily
    const originalCssText = element.style.cssText;
    element.style.setProperty("position", "fixed", "important");
    element.style.setProperty("z-index", "99999", "important");
    element.style.setProperty("top", "0", "important");
    element.style.setProperty("left", "0", "important");
    element.style.setProperty("width", "210mm", "important");
    element.style.setProperty("min-width", "210mm", "important");
    element.style.setProperty("transform", "none", "important");
    element.style.setProperty("zoom", "1", "important");

    // Force layout reflow
    const _reflow = element.offsetHeight;

    bakeElementStyles(element, clone);

    // Restore original styles
    element.style.cssText = originalCssText;

    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      const options = {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: Document) => {
          patchDocumentColors(clonedDoc);
        },
      };
      return await html2canvas(clone, options);
    } finally {
      document.body.removeChild(clone);
    }
  };

  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!previewRef.current) return null;
    setExporting(true);
    document.body.classList.add("pdf-generating");
    try {
      const canvas = await captureElementAsCanvas(previewRef.current);
      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      return pdf;
    } catch (error) {
      console.error("PDF generation failed:", error);
      return null;
    } finally {
      document.body.classList.remove("pdf-generating");
      setExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      const docId = await saveDocHelper(formValues);
      const targetId = (!id || id === "new" || id === "undefined") ? docId : id;
      window.open(`/certificate/${targetId}?print=true`, "_blank");
    } catch (error) {
      console.error("Print trigger failed:", error);
      window.print();
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    if (isPrintMode) {
      window.print();
    } else {
      setExporting(true);
      try {
        const docId = await saveDocHelper(formValues);
        const targetId = (!id || id === "new" || id === "undefined") ? docId : id;
        window.open(`/certificate/${targetId}?print=true`, "_blank");
      } catch (error) {
        console.error("Print trigger failed:", error);
        window.print();
      } finally {
        setExporting(false);
      }
    }
  };

  const handleShare = async () => {
    const pdf = await generatePDF();
    if (!pdf) {
      alert("Could not generate PDF for sharing.");
      return;
    }
    
    try {
      const proj = watch("project") || "Certificate";
      const blob = pdf.output("blob");
      const file = new File([blob], `Work_Completion_Certificate_${proj.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`, { type: "application/pdf" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Work Completion Certificate`,
          text: `Please find attached the completion certificate for project ${proj}.`
        });
      } else {
        handleDownloadPDF();
      }
    } catch (error) {
      console.error("Sharing failed:", error);
      handleDownloadPDF();
    }
  };

  const handleCopySignLink = () => {
    if (!id || id === "new") {
      alert(language === "ar" ? "يرجى حفظ الشهادة أولاً لتتمكن من مشاركة رابط التوقيع" : "Please save the certificate first to copy the signature link.");
      return;
    }
    const signLink = `${window.location.origin}/certificate/${id}/sign`;
    navigator.clipboard.writeText(signLink);
    alert(language === "ar" ? "تم نسخ رابط توقيع العميل بنجاح!" : "Client signing link copied successfully!");
  };

  const formValues = watch();

  if (loading || !isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
        <p className="text-slate-600 mt-2 text-sm font-medium">جاري تحميل شهادة الإنجاز...</p>
      </div>
    );
  }

  if (isPrintMode) {
    return (
      <div className="bg-slate-100 min-h-screen flex flex-col items-center justify-start p-0 m-0 w-full" style={{ direction: "ltr" }}>
        {/* Floating Print Action Bar */}
        <div className="no-print w-full bg-white border-b border-slate-200 text-slate-800 py-3 px-4 sm:px-8 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 p-1 flex items-center justify-center border border-slate-200">
              <img src="/logo.png" alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-purple-900">رواد سمارت - شهادة إنجاز الأعمال (Work Completion)</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                لحفظ المستند كملف PDF عالي الدقة، اختر "حفظ بتنسيق PDF" (Save as PDF) من نافذة الطباعة.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg border border-purple-800 shadow-xs flex items-center gap-2 text-xs transition hover:scale-[1.02] cursor-pointer"
            >
              <Printer className="w-4 h-4 text-purple-200" />
              <span>طباعة / حفظ بتنسيق PDF</span>
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium rounded-lg text-xs transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
        <div 
          ref={previewRef}
          id="certificate-preview-page"
          dir="ltr"
          className="w-[210mm] min-h-[297mm] h-auto bg-white text-zinc-900 p-[15mm] flex flex-col justify-start gap-4 relative text-xs select-none text-left print-area"
          style={{ boxSizing: "border-box", direction: "ltr" }}
        >
          <div>
            {/* Logo Top Center */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="w-28 h-28 flex items-center justify-center bg-white">
                <img 
                  src={settings?.logoBase64 || "/logo.png"} 
                  alt="Ruaad Logo" 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <h1 className="text-xl font-extrabold tracking-widest text-[#581C87] uppercase mt-4 mb-2">
                Work Completion Certificate
              </h1>
              <div className="h-0.5 w-16 rounded" style={{ backgroundColor: "rgba(88, 28, 135, 0.85)" }} />
            </div>

            {/* Project & Tech Block */}
            <div className="mt-8 space-y-3.5 text-zinc-800 leading-relaxed font-medium">
              <div>
                <span className="font-bold text-zinc-500 inline-block w-24">Project:</span>
                <span className="text-zinc-900 font-semibold border-b border-zinc-200 pb-0.5 inline-block min-w-[200px]">
                  {formValues.project || "Mr. Mohamed Villa 1 Al Aweer - Sharjah"}
                </span>
              </div>
              <div>
                <span className="font-bold text-zinc-500 inline-block w-24">System:</span>
                <span className="text-zinc-900 font-semibold border-b border-zinc-200 pb-0.5 inline-block min-w-[200px]">
                  {formValues.systemType || "Extra Low Voltage & Wireless Home Automation & Network"}
                </span>
              </div>
              
              <p className="mt-6 text-zinc-700 leading-relaxed text-justify">
                {formValues.statement}
              </p>
            </div>

            {/* Table of Handover Systems */}
            <div className="mt-8">
              <p className="font-bold text-zinc-800 mb-3 text-[10px]">
                The EXTRA LOW POWER systems are handed over as follows:
              </p>
              
              <table className="w-full border border-zinc-300 text-[10px] text-left border-collapse rounded overflow-hidden" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 font-bold text-zinc-700 text-[9px] uppercase tracking-wider">
                    <th className="p-3 border-r border-zinc-300" style={{ width: "35%" }}>System</th>
                    <th className="p-3 border-r border-zinc-300" style={{ width: "50%" }}>Remarks</th>
                    <th className="p-3 text-center" style={{ width: "15%" }}>Done</th>
                  </tr>
                </thead>
                <tbody>
                  {formValues.checklist.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-200">
                      <td className="p-2.5 border-r border-zinc-200 font-bold text-[#581C87] break-words" style={{ width: "35%" }}>{item.system || "Unnamed System"}</td>
                      <td className="p-2.5 border-r border-zinc-200 font-medium text-zinc-600 break-words" style={{ width: "50%" }}>{item.remarks || "-"}</td>
                      <td className="p-2.5 text-center font-bold text-green-600 text-sm" style={{ width: "15%" }}>
                        {item.done ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50 text-green-600 border border-green-200">✓</span>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Warranty text */}
            <p className="mt-6 font-bold text-zinc-900 border-l-2 border-[#581C87] pl-2 py-0.5">
              {formValues.warrantyText || "Warranty starts from date of this certificate."}
            </p>
          </div>

          {/* Bottom Signature Blocks & Footer */}
          <div>
            <div className="flex justify-between mt-8 gap-12 text-[10px] relative">
              
              {/* Left signature: client */}
              <div className="w-[45%] border-t border-zinc-200 pt-3 relative">
                <span className="font-bold text-zinc-400 block uppercase text-[8px] tracking-wider mb-2">Company / Client Acceptance</span>
                
                <div className="h-16 w-full border border-zinc-100 rounded flex items-center justify-center overflow-hidden" style={{ backgroundColor: "rgba(250, 250, 250, 0.3)" }}>
                  {formValues.clientSignature ? (
                    <img 
                      src={formValues.clientSignature} 
                      alt="Client Signature" 
                      className="max-h-full max-w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-zinc-300 italic text-[9px] pointer-events-none">Pending signature...</span>
                  )}
                </div>

                <div className="mt-2 text-zinc-700 space-y-0.5">
                  <div><span className="font-semibold text-zinc-500">Name:</span> {formValues.clientName || "_________________"}</div>
                  <div><span className="font-semibold text-zinc-500">Date:</span> {formValues.clientDate || "_________________"}</div>
                </div>
              </div>

              {/* Right signature: integrator */}
              <div className="w-[45%] border-t border-zinc-200 pt-3 relative">
                <span className="font-bold text-zinc-400 block uppercase text-[8px] tracking-wider mb-2">System Integrator: Ruaad Smart</span>
                
                <div className="h-16 w-full border border-zinc-100 rounded flex items-center justify-center overflow-hidden z-10" style={{ backgroundColor: "rgba(250, 250, 250, 0.3)" }}>
                  {formValues.integratorSignature ? (
                    <img 
                      src={formValues.integratorSignature} 
                      alt="Integrator Signature" 
                      className="max-h-full max-w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-zinc-300 italic text-[9px] pointer-events-none">Pending signature...</span>
                  )}
                </div>
                
                {/* Official Stamp overlay */}
                {(settings?.stampBase64 || "/stamp.png") && (
                  <div className="absolute top-2 right-12 w-24 h-24 opacity-85 mix-blend-multiply pointer-events-none z-20 flex items-center justify-center">
                    <img 
                      src={settings?.stampBase64 || "/stamp.png"} 
                      alt="Ruaad Stamp" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}

                <div className="mt-2 text-zinc-700 space-y-0.5 relative z-10">
                  <div><span className="font-semibold text-zinc-500">Name:</span> {formValues.integratorName || "RUAAD SMART SMART MACHINE TRADING LLC"}</div>
                  <div><span className="font-semibold text-zinc-500">Date:</span> {formValues.integratorDate || "_________________"}</div>
                </div>
              </div>

            </div>

            {/* Bottom footer with details */}
            <div className="border-t border-zinc-200 mt-12 pt-4 flex items-center justify-between text-[8px] text-zinc-500 uppercase tracking-wider font-semibold">
              <div>
                <span className="text-zinc-400 block">Address</span>
                <span className="text-zinc-700">{formValues.address}</span>
              </div>
              <div className="text-center">
                <span className="text-zinc-400 block">Website</span>
                <a href={`https://${formValues.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 lowecase font-bold font-sans">
                  {formValues.website}
                </a>
              </div>
              <div className="text-right">
                <span className="text-zinc-400 block">Phone</span>
                <span className="text-zinc-700">{formValues.phone}</span>
              </div>
            </div>
            
            <div className="flex justify-center mt-3 opacity-20">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src={settings?.logoBase64 || "/logo.png"} 
                  alt="Ruaad Logo Dec" 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col main-layout-container">
      {/* Editor Header */}
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print sticky top-0 z-40 shadow-xs">
        {/* Left side: Back & Title */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-700" />
                {id ? t("editTitle") : t("newCertificate")}
              </h1>
              <p className="text-xs text-slate-500 font-mono">Project: {formValues.project || "Unnamed"}</p>
            </div>
          </div>
          
          {/* Action buttons on very small mobile screens (hidden on md) */}
          <div className="flex md:hidden items-center gap-1.5">
            <button 
              type="submit" 
              form="certificate-form"
              disabled={saving}
              className="p-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white font-medium transition-all shadow-xs"
              title={t("saveBtn")}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 font-medium transition-all shadow-2xs"
              title="Download PDF"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleShare}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-all shadow-2xs"
              title={t("share")}
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={handleCopySignLink}
              className="p-2 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 font-medium transition-all shadow-2xs"
              title={language === "ar" ? "نسخ رابط التوقيع" : "Copy Client Sign Link"}
            >
              <PenTool className="w-4 h-4 text-purple-600" />
            </button>
          </div>
        </div>

        {/* Center/Right: Tabs & Desktop Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          {/* View Toggle Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto justify-around md:justify-start">
            <button 
              type="button"
              onClick={() => setPreviewTab("edit")}
              className={`flex-1 md:flex-initial px-4.5 py-1.5 text-xs font-semibold rounded-lg text-center transition-all ${previewTab === "edit" ? "bg-white text-purple-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
            >
              {t("formTab")}
            </button>
            <button 
              type="button"
              onClick={() => setPreviewTab("preview")}
              className={`flex-1 md:flex-initial px-4.5 py-1.5 text-xs font-semibold rounded-lg text-center transition-all ${previewTab === "preview" ? "bg-white text-purple-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
            >
              {t("previewTab")}
            </button>
          </div>

          {/* Desktop/Tablet Action Buttons (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              type="submit" 
              form="certificate-form"
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white font-bold text-xs transition-all hover:scale-[1.02] shadow-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t("saveBtn")}
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 font-semibold text-xs transition-all shadow-2xs"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {t("downloadPdf")}
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              {t("print")}
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              {t("share")}
            </button>
            <button 
              type="button"
              onClick={handleCopySignLink}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition-all hover:scale-[1.02] shadow-2xs"
            >
              <PenTool className="w-3.5 h-3.5 text-purple-600" />
              {language === "ar" ? "رابط توقيع العميل" : "Client Sign Link"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Split Pane */}
      <div className="flex-1 flex overflow-hidden workspace-split-pane">
        {/* Left Side: Editor Form */}
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 no-print bg-slate-100/60 ${previewTab === "preview" ? "hidden sm:block" : "block"}`}>
          <form id="certificate-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
            
            {/* Project Details Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">{t("clientInfo")}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("projectVilla")}</label>
                  <input 
                    type="text" 
                    {...register("project", { required: true })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("systemTechScope")}</label>
                  <input 
                    type="text" 
                    {...register("systemType", { required: true })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("officialStatement")}</label>
                  <textarea 
                    rows={4}
                    {...register("statement", { required: true })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Handover Systems Checklist Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t("handoverChecklist")}</h2>
                <button
                  type="button"
                  onClick={() => append({
                    id: `c-${Date.now()}-${Math.random()}`,
                    system: "",
                    remarks: "",
                    done: true
                  })}
                  className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-800 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("addSystemRow")}
                </button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 relative group hover:border-slate-300 transition-colors">
                  <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove row"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t("systemName")}</label>
                      <input 
                        type="text" 
                        {...register(`checklist.${index}.system` as const, { required: true })} 
                        placeholder="e.g. Curtain System"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:border-purple-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t("remarks")}</label>
                      <input 
                        type="text" 
                        {...register(`checklist.${index}.remarks` as const)} 
                        placeholder="e.g. 8 Curtain Motors"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:border-purple-600 outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`chk-${field.id}`}
                      {...register(`checklist.${index}.done` as const)} 
                      className="w-4 h-4 rounded text-purple-600 bg-white border-slate-300 focus:ring-purple-500"
                    />
                    <label htmlFor={`chk-${field.id}`} className="text-xs text-slate-700 font-semibold cursor-pointer">{t("markAsDone")}</label>
                  </div>
                </div>
              ))}
            </div>

            {/* Signature Pad Inputs Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">{t("clientSignature")}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Signature Canvas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">{t("clientSignature")}</label>
                    <button 
                      type="button" 
                      onClick={() => clearSignature("client")}
                      className="text-slate-500 hover:text-red-600 text-[10px] flex items-center gap-1 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" /> {t("clearSig")}
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <SignatureCanvas 
                      ref={clientSigRef}
                      canvasProps={{ className: "sigCanvas" }}
                      onEnd={() => onSignatureEnd("client")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">{t("clientSignName")}</label>
                      <input 
                        type="text" 
                        {...register("clientName")} 
                        placeholder="Print Name"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">{t("signDate")}</label>
                      <input 
                        type="text" 
                        {...register("clientDate")} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Integrator Signature Canvas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">{t("integratorSignature")}</label>
                    <button 
                      type="button" 
                      onClick={() => clearSignature("integrator")}
                      className="text-slate-500 hover:text-red-600 text-[10px] flex items-center gap-1 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" /> {t("clearSig")}
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <SignatureCanvas 
                      ref={integratorSigRef}
                      canvasProps={{ className: "sigCanvas" }}
                      onEnd={() => onSignatureEnd("integrator")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">{t("integratorSignName")}</label>
                      <input 
                        type="text" 
                        {...register("integratorName")} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">{t("signDate")}</label>
                      <input 
                        type="text" 
                        {...register("integratorDate")} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Contact Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">{t("footerContact")}</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("address")}</label>
                  <input 
                    type="text" 
                    {...register("address")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("website")}</label>
                  <input 
                    type="text" 
                    {...register("website")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("phone")}</label>
                  <input 
                    type="text" 
                    {...register("phone")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Right Side: A4 Live Preview Sheet */}
        <div className={`flex-1 bg-slate-200/80 overflow-y-auto p-8 flex flex-col items-center gap-8 border-l border-slate-300 print-area printable-area ${previewTab === "edit" ? "hidden sm:flex" : "flex"}`}>
          
          <div 
            ref={previewRef}
            id="certificate-preview-page"
            dir="ltr"
            className="w-[210mm] min-h-[297mm] h-auto bg-white text-zinc-900 shadow-2xl p-[15mm] flex flex-col justify-start gap-4 relative text-xs select-none text-left print-area printable-area"
            style={{ boxSizing: "border-box", direction: "ltr" }}
          >
            <div>
              {/* Logo Top Center */}
              <div className="flex flex-col items-center justify-center pt-2">
                <div className="w-28 h-28 flex items-center justify-center bg-white">
                  <img 
                    src={settings?.logoBase64 || "/logo.png"} 
                    alt="Ruaad Logo" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <h1 className="text-xl font-extrabold tracking-widest text-[#581C87] uppercase mt-4 mb-2">
                  Work Completion Certificate
                </h1>
                <div className="h-0.5 w-16 rounded" style={{ backgroundColor: "rgba(88, 28, 135, 0.85)" }} />
              </div>

              {/* Project & Tech Block */}
              <div className="mt-8 space-y-3.5 text-zinc-800 leading-relaxed font-medium">
                <div>
                  <span className="font-bold text-zinc-500 inline-block w-24">Project:</span>
                  <span className="text-zinc-900 font-semibold border-b border-zinc-200 pb-0.5 inline-block min-w-[200px]">
                    {formValues.project || "Mr. Mohamed Villa 1 Al Aweer - Sharjah"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-zinc-500 inline-block w-24">System:</span>
                  <span className="text-zinc-900 font-semibold border-b border-zinc-200 pb-0.5 inline-block min-w-[200px]">
                    {formValues.systemType || "Extra Low Voltage & Wireless Home Automation & Network"}
                  </span>
                </div>
                
                <p className="mt-6 text-zinc-700 leading-relaxed text-justify">
                  {formValues.statement}
                </p>
              </div>

              {/* Table of Handover Systems */}
              <div className="mt-8">
                <p className="font-bold text-zinc-800 mb-3 text-[10px]">
                  The EXTRA LOW POWER systems are handed over as follows:
                </p>
                
                <table className="w-full border border-zinc-300 text-[10px] text-left border-collapse rounded overflow-hidden" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-300 font-bold text-zinc-700 text-[9px] uppercase tracking-wider">
                      <th className="p-3 border-r border-zinc-300" style={{ width: "35%" }}>System</th>
                      <th className="p-3 border-r border-zinc-300" style={{ width: "50%" }}>Remarks</th>
                      <th className="p-3 text-center" style={{ width: "15%" }}>Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.checklist.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-200">
                        <td className="p-2.5 border-r border-zinc-200 font-bold text-[#581C87] break-words" style={{ width: "35%" }}>{item.system || "Unnamed System"}</td>
                        <td className="p-2.5 border-r border-zinc-200 font-medium text-zinc-600 break-words" style={{ width: "50%" }}>{item.remarks || "-"}</td>
                        <td className="p-2.5 text-center font-bold text-green-600 text-sm" style={{ width: "15%" }}>
                          {item.done ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50 text-green-600 border border-green-200">✓</span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Warranty text */}
              <p className="mt-6 font-bold text-zinc-900 border-l-2 border-[#581C87] pl-2 py-0.5">
                {formValues.warrantyText || "Warranty starts from date of this certificate."}
              </p>
            </div>

            {/* Bottom Signature Blocks & Footer */}
            <div>
              <div className="flex justify-between mt-8 gap-12 text-[10px] relative">
                
                {/* Left signature: client */}
                <div className="w-[45%] border-t border-zinc-200 pt-3 relative">
                  <span className="font-bold text-zinc-400 block uppercase text-[8px] tracking-wider mb-2">Company / Client Acceptance</span>
                  
                  <div className="h-16 w-full border border-zinc-100 rounded flex items-center justify-center overflow-hidden" style={{ backgroundColor: "rgba(250, 250, 250, 0.3)" }}>
                    {formValues.clientSignature ? (
                      <img 
                        src={formValues.clientSignature} 
                        alt="Client Signature" 
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-zinc-300 italic text-[9px] pointer-events-none">Pending signature...</span>
                    )}
                  </div>

                  <div className="mt-2 text-zinc-700 space-y-0.5">
                    <div><span className="font-semibold text-zinc-500">Name:</span> {formValues.clientName || "_________________"}</div>
                    <div><span className="font-semibold text-zinc-500">Date:</span> {formValues.clientDate || "_________________"}</div>
                  </div>
                </div>

                {/* Right signature: integrator */}
                <div className="w-[45%] border-t border-zinc-200 pt-3 relative">
                  <span className="font-bold text-zinc-400 block uppercase text-[8px] tracking-wider mb-2">System Integrator: Ruaad Smart</span>
                  
                  <div className="h-16 w-full border border-zinc-100 rounded flex items-center justify-center overflow-hidden z-10" style={{ backgroundColor: "rgba(250, 250, 250, 0.3)" }}>
                    {formValues.integratorSignature ? (
                      <img 
                        src={formValues.integratorSignature} 
                        alt="Integrator Signature" 
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-zinc-300 italic text-[9px] pointer-events-none">Pending signature...</span>
                    )}
                  </div>
                  
                  {/* Official Stamp overlay */}
                  <div className="absolute top-2 right-12 w-24 h-24 opacity-85 mix-blend-multiply pointer-events-none z-20 flex items-center justify-center">
                    <img 
                      src={settings?.stampBase64 || "/stamp.png"} 
                      alt="Ruaad Stamp" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="mt-2 text-zinc-700 space-y-0.5 relative z-10">
                    <div><span className="font-semibold text-zinc-500">Name:</span> {formValues.integratorName || "RUAAD SMART SMART MACHINE TRADING LLC"}</div>
                    <div><span className="font-semibold text-zinc-500">Date:</span> {formValues.integratorDate || "_________________"}</div>
                  </div>
                </div>

              </div>

              {/* Bottom footer with details */}
              <div className="border-t border-zinc-200 mt-12 pt-4 flex items-center justify-between text-[8px] text-zinc-500 uppercase tracking-wider font-semibold">
                <div>
                  <span className="text-zinc-400 block">Address</span>
                  <span className="text-zinc-700">{formValues.address}</span>
                </div>
                <div className="text-center">
                  <span className="text-zinc-400 block">Website</span>
                  <a href={`https://${formValues.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 lowecase font-bold font-sans">
                    {formValues.website}
                  </a>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 block">Phone</span>
                  <span className="text-zinc-700">{formValues.phone}</span>
                </div>
              </div>
              
              <div className="flex justify-center mt-3 opacity-20">
                <div className="w-8 h-8 flex items-center justify-center">
                  <img 
                    src={settings?.logoBase64 || "/logo.png"} 
                    alt="Ruaad Logo Dec" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

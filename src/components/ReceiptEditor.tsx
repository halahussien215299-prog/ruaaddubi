"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Save,
  Download,
  Printer,
  Share2,
  Plus,
  Loader2,
  FileText,
  RotateCcw
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { saveReceipt, getReceipt, getAllReceipts, Receipt, getSettings, Settings } from "@/lib/db";
import { generateZatcaTLV } from "@/lib/zatca";
import { useLanguage } from "@/lib/i18n";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ReceiptEditorProps {
  id?: string;
}

const DEFAULT_RECEIPT_VALUES = {
  receiptNo: "R0015",
  date: new Date().toLocaleDateString("en-GB"),
  clientName: "",
  amount: 0,
  amountInWords: "",
  paymentMethod: "cash" as const,
  chequeNo: "",
  chequeDate: "",
  bankName: "",
  receivedFor: "Advance payment for smart home supply & installation",
  receivedBy: "Ruaad Smart Smart Machine Trading LLC",
  integratorSignature: "",
  invoiceType: "standard" as const,
  clientTaxNumber: "",
  taxRate: 15,
  taxAmount: 0,
  subtotal: 0,
  zatcaQrCode: "",
  uuid: "",
};

export default function ReceiptEditor({ id }: ReceiptEditorProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");
  const [settings, setSettings] = useState<Settings | null>(null);

  const isPrintMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('print') === 'true';

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
  const sigRef = useRef<SignatureCanvas>(null);

  const { register, handleSubmit, watch, setValue, reset } = useForm<Receipt>({
    defaultValues: DEFAULT_RECEIPT_VALUES
  });

  const formValues = watch();

  useEffect(() => {
    setIsMounted(true);
    if (id && id !== "new" && id !== "undefined") {
      async function loadReceipt() {
        try {
          const data = await getReceipt(id!);
          if (data) {
            reset(data);
            setTimeout(() => {
              if (data.integratorSignature && sigRef.current) {
                sigRef.current.fromDataURL(data.integratorSignature);
              }
            }, 200);
          } else {
            alert("Receipt not found");
            router.push("/");
          }
        } catch (error) {
          console.error("Error loading receipt:", error);
        } finally {
          setLoading(false);
        }
      }
      loadReceipt();
    } else {
      async function generateSequentialReceiptNo() {
        try {
          const receipts = await getAllReceipts();
          let maxNum = 1000;
          receipts.forEach(r => {
            if (r.receiptNo) {
              const match = r.receiptNo.match(/\d+/);
              if (match) {
                const num = parseInt(match[0], 10);
                if (num > maxNum) {
                  maxNum = num;
                }
              }
            }
          });
          setValue("receiptNo", `R-${maxNum + 1}`);
        } catch (err) {
          console.error("Error generating sequential receipt no:", err);
          const randomNo = "R-" + String(Math.floor(Math.random() * 9000) + 1000);
          setValue("receiptNo", randomNo);
        } finally {
          setLoading(false);
        }
      }
      generateSequentialReceiptNo();
    }
  }, [id, reset, router, setValue]);

  const onSignatureEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setValue("integratorSignature", sigRef.current.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      setValue("integratorSignature", "");
    }
  };

  const saveDocHelper = async (data: Receipt): Promise<string> => {
    const documentId = (id && id !== "new" && id !== "undefined") ? id : `receipt-${Date.now()}`;
    const now = new Date().toISOString();

    let finalTaxRate = 0;
    let finalTaxAmount = 0;
    let finalSubtotal = Number(data.amount) || 0;
    let finalZatcaQr = "";

    if (data.invoiceType === "tax") {
      finalTaxRate = Number(settings?.taxRate ?? 15);
      finalTaxAmount = (Number(data.amount) || 0) - ((Number(data.amount) || 0) / (1 + finalTaxRate / 100));
      finalSubtotal = (Number(data.amount) || 0) - finalTaxAmount;

      const companyName = settings?.companyName || (language === "ar" ? "رواد سمارت" : "Ruaad Smart Machine Trading LLC");
      const companyTaxNo = settings?.taxNumber || "300000000000003";
      const dateStr = data.date || new Date().toLocaleDateString("en-GB");

      let parsedDateIso = now;
      try {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          parsedDateIso = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0).toISOString();
        } else {
          parsedDateIso = new Date(dateStr).toISOString();
        }
      } catch (e) {
        parsedDateIso = now;
      }

      finalZatcaQr = generateZatcaTLV(
        companyName,
        companyTaxNo,
        parsedDateIso,
        (Number(data.amount) || 0).toFixed(2),
        finalTaxAmount.toFixed(2)
      );
    }

    const updatedDoc: Receipt = {
      ...data,
      amount: Number(data.amount) || 0,
      id: documentId,
      invoiceType: data.invoiceType || "standard",
      taxRate: finalTaxRate,
      taxAmount: Number(finalTaxAmount.toFixed(2)),
      subtotal: Number(finalSubtotal.toFixed(2)),
      zatcaQrCode: finalZatcaQr,
      uuid: data.uuid || crypto.randomUUID(),
      createdAt: data.createdAt || now,
      updatedAt: now
    };
    await saveReceipt(updatedDoc);
    return documentId;
  };

  const onSubmit = async (data: Receipt) => {
    setSaving(true);
    try {
      await saveDocHelper(data);
      router.refresh();
      alert(language === "ar" ? "تم حفظ المستند بنجاح!" : "Document saved successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error saving receipt:", error);
      alert(language === "ar" ? "فشل حفظ المستند." : "Failed to save document.");
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
      if (
        styleEl.textContent.includes("oklch") ||
        styleEl.textContent.includes("oklab") ||
        styleEl.textContent.includes("lab(")
      ) {
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
      window.open(`/receipt/${targetId}?print=true`, "_blank");
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
        window.open(`/receipt/${targetId}?print=true`, "_blank");
      } catch (error) {
        console.error("Print trigger failed:", error);
        window.print();
      } finally {
        setExporting(false);
      }
    }
  };

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
        <p className="text-slate-600 mt-2 text-sm font-medium">{language === "ar" ? "جاري تحميل سند الاستلام..." : "Loading receipt editor..."}</p>
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
              <h3 className="font-bold text-sm text-purple-900">
                {formValues.invoiceType === "tax" ? "رواد سمارت - فاتورة ضريبية وسند قبض" : "رواد سمارت - سند قبض استلام مبالغ"}
              </h3>
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
          id="receipt-preview-page"
          dir="ltr"
          className="w-[210mm] min-h-[297mm] h-auto bg-white text-zinc-900 p-[12mm] flex flex-col justify-start gap-4 relative text-xs select-none text-left"
          style={{ boxSizing: "border-box" }}
        >
          <div>
            {/* Document Header */}
            <div className="flex items-start justify-between border-b-[2px] border-[#581C87] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-white">
                  <img
                    src={settings?.logoBase64 || "/logo.png"}
                    alt="Ruaad Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#581C87] font-sans m-0 leading-tight">RUAAD SMART</h2>
                  <p className="text-[9px] text-zinc-500 m-0 tracking-wider">RUAAD SMART MACHINE TRADING LLC</p>
                </div>
              </div>

              <div className="text-right">
                <div className="bg-[#581C87] text-white px-4 py-1.5 rounded font-bold text-sm tracking-wider inline-block">
                  {formValues.invoiceType === "tax" ? "TAX INVOICE" : "RECEIPT VOUCHER"}
                </div>
                <p className="text-[10px] text-[#581C87] font-bold mt-1 m-0">
                  {formValues.invoiceType === "tax" ? "فاتورة ضريبية مبسطة" : "سند قبض استلام مبالغ"}
                </p>
              </div>
            </div>

            {/* Receipt Metadata */}
            <table className="w-full border border-zinc-200 mt-4 text-[10px] border-collapse" style={{ tableLayout: "fixed" }}>
              <tbody>
                <tr className="border-b border-zinc-200">
                  <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                    <div className="flex justify-between">
                      <span>Receipt No.</span>
                      <span className="font-arabic">رقم السند</span>
                    </div>
                  </td>
                  <td className="p-2.5 border-r border-zinc-200 font-mono font-bold text-zinc-800" style={{ width: "25%" }}>{formValues.receiptNo}</td>
                  <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                    <div className="flex justify-between">
                      <span>Date</span>
                      <span className="font-arabic">التاريخ</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-zinc-700 font-semibold" style={{ width: "25%" }}>{formValues.date}</td>
                </tr>
                <tr className="border-b border-zinc-200">
                  <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                    <div className="flex justify-between">
                      <span>Amount</span>
                      <span className="font-arabic">المبلغ</span>
                    </div>
                  </td>
                  <td className="p-2.5 border-r border-zinc-200 text-[#581C87] font-bold font-mono text-sm" style={{ backgroundColor: "rgba(88, 28, 135, 0.05)", width: "25%" }}>
                    {formValues.amount ? Number(formValues.amount).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"} {settings?.currency || "AED"}
                  </td>
                  <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                    <div className="flex justify-between">
                      <span>Method</span>
                      <span className="font-arabic">طريقة الدفع</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-zinc-700 capitalize font-bold" style={{ width: "25%" }}>
                    {formValues.paymentMethod === "cash" && (language === "ar" ? "نقداً" : "Cash")}
                    {formValues.paymentMethod === "bank" && (language === "ar" ? "تحويل بنكي" : `Bank: ${formValues.bankName || ""}`)}
                    {formValues.paymentMethod === "cheque" && (language === "ar" ? `شيك: ${formValues.chequeNo || ""}` : `Cheque: ${formValues.chequeNo || ""}`)}
                  </td>
                </tr>
                {formValues.invoiceType === "tax" && (
                  <tr>
                    <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                      <div className="flex justify-between">
                        <span>Seller VAT No.</span>
                        <span className="font-arabic">الرقم الضريبي للمورد</span>
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 font-mono font-semibold text-zinc-700" style={{ width: "25%" }}>
                      {settings?.taxNumber || "300000000000003"}
                    </td>
                    <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                      <div className="flex justify-between">
                        <span>Client VAT No.</span>
                        <span className="font-arabic">الرقم الضريبي للعميل</span>
                      </div>
                    </td>
                    <td className="p-2.5 font-mono text-zinc-700 font-semibold" style={{ width: "25%" }}>
                      {formValues.clientTaxNumber || "N/A"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Core Receipt content (Legal text style) */}
            <div className="mt-4 border border-zinc-200 rounded-lg p-4 space-y-4 text-zinc-800 leading-relaxed text-justify text-[10px]">
              <div>
                <span className="font-bold text-[#581C87] inline-block w-36">
                  Received From:
                </span>
                <span className="text-zinc-900 font-bold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                  {formValues.clientName || "______________________________________"}
                </span>
                <span className="font-arabic font-bold text-zinc-500 float-right">استلمنا من</span>
              </div>

              <div>
                <span className="font-bold text-[#581C87] inline-block w-36">
                  The Sum of:
                </span>
                <span className="text-zinc-800 font-bold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                  {formValues.amountInWords || "______________________________________"}
                </span>
                <span className="font-arabic font-bold text-zinc-500 float-right">مبلغ وقدره</span>
              </div>

              {formValues.paymentMethod !== "cash" && (
                <div>
                  <span className="font-bold text-[#581C87] inline-block w-36">
                    {formValues.paymentMethod === "cheque" ? "Cheque No. & Bank:" : "Bank / Reference:"}
                  </span>
                  <span className="text-zinc-700 font-semibold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                    {formValues.paymentMethod === "cheque" ? (
                      `${formValues.chequeNo || ""} - ${formValues.bankName || ""} (${formValues.chequeDate || ""})`
                    ) : (
                      formValues.bankName || "________________________"
                    )}
                  </span>
                  <span className="font-arabic font-bold text-zinc-500 float-right">
                    {formValues.paymentMethod === "cheque" ? "شيك رقم / بنك" : "تحويل بنكي / بنك"}
                  </span>
                </div>
              )}

              <div>
                <span className="font-bold text-[#581C87] inline-block w-36">
                  Being Payment for:
                </span>
                <span className="text-zinc-700 font-medium border-b border-zinc-300 pb-0.5 inline-block min-w-[280px] whitespace-normal">
                  {formValues.receivedFor || "______________________________________"}
                </span>
                <span className="font-arabic font-bold text-zinc-500 float-right">وذلك عن قيمة</span>
              </div>
            </div>

            {/* VAT Breakdown Table (only for Tax Invoices) */}
            {formValues.invoiceType === "tax" && (
              <div className="mt-4 border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-1.5 text-[10px]">
                <div className="flex justify-between font-semibold text-zinc-700">
                  <span>Subtotal (Excl. VAT) / المجموع الفرعي (غير شامل الضريبة)</span>
                  <span className="font-mono">
                    {(Number(formValues.amount) ? (Number(formValues.amount) / (1 + Number(settings?.taxRate ?? 15) / 100)) : 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })} {settings?.currency || "AED"}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-zinc-600 border-t border-zinc-200/50 pt-1.5">
                  <span>VAT Amount ({settings?.taxRate ?? 15}%) / مبلغ ضريبة القيمة المضافة</span>
                  <span className="font-mono">
                    {(Number(formValues.amount) ? (Number(formValues.amount) - (Number(formValues.amount) / (1 + Number(settings?.taxRate ?? 15) / 100))) : 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })} {settings?.currency || "AED"}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-[#581C87] border-t border-zinc-200 pt-1.5 text-xs">
                  <span>Total (Incl. VAT) / المجموع الإجمالي (شامل الضريبة)</span>
                  <span className="font-mono">
                    {Number(formValues.amount) ? Number(formValues.amount).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"} {settings?.currency || "AED"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section: Signatures & Address info */}
          <div>
            {/* Signatures block */}
            <div className="flex w-full justify-between gap-4 border border-zinc-200 rounded-lg p-3.5" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
              <div className="w-[32%] text-center flex flex-col justify-between min-h-[90px]">
                <p className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider">
                  Client Signature / Seal <br />
                  <span className="font-arabic text-zinc-400">توقيع / ختم العميل</span>
                </p>
                <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-4" />
              </div>

              {/* ZATCA QR Code in center (only for Tax Invoices) */}
              {formValues.invoiceType === "tax" && (
                <div className="w-[32%] flex flex-col items-center justify-center min-h-[90px]">
                  {(() => {
                    const rate = Number(settings?.taxRate ?? 15);
                    const totalVal = Number(formValues.amount) || 0;
                    const taxVal = totalVal - (totalVal / (1 + rate / 100));
                    const companyName = settings?.companyName || (language === "ar" ? "رواد سمارت" : "Ruaad Smart Machine Trading LLC");
                    const companyTaxNo = settings?.taxNumber || "300000000000003";
                    const dateStr = formValues.date || new Date().toLocaleDateString("en-GB");

                    let parsedDateIso = new Date().toISOString();
                    try {
                      const parts = dateStr.split("/");
                      if (parts.length === 3) {
                        parsedDateIso = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0).toISOString();
                      } else {
                        parsedDateIso = new Date(dateStr).toISOString();
                      }
                    } catch (e) { }

                    const qrBase64 = generateZatcaTLV(
                      companyName,
                      companyTaxNo,
                      parsedDateIso,
                      totalVal.toFixed(2),
                      taxVal.toFixed(2)
                    );

                    if (!qrBase64) return null;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrBase64)}`;
                    return (
                      <div className="flex flex-col items-center gap-1">
                        <img src={qrUrl} alt="ZATCA QR Code" className="w-20 h-20 border border-zinc-200 p-0.5" />
                        <span className="text-[7px] text-zinc-400 font-sans tracking-tight">ZATCA QR Code</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className={`${formValues.invoiceType === "tax" ? "w-[32%]" : "w-[48%]"} text-center flex flex-col justify-between min-h-[90px] relative`}>
                <p className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider relative z-10">
                  Authorized Receiver Signature <br />
                  <span className="font-arabic text-zinc-400">توقيع / ختم المستلم المصرح له</span>
                </p>

                {/* Official Stamp Overlay */}
                <div className="absolute bottom-2 right-12 w-20 h-20 opacity-90 mix-blend-multiply pointer-events-none z-0 flex items-center justify-center">
                  <img
                    src={settings?.stampBase64 || "/stamp.png"}
                    alt="Ruaad Stamp"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                {formValues.integratorSignature ? (
                  <div className="w-36 h-12 mx-auto mt-2 z-10 flex items-center justify-center">
                    <img
                      src={formValues.integratorSignature}
                      alt="Receiver Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-4 z-10" />
                )}
                <p className="text-[9px] text-[#581C87] font-bold mt-1 relative z-10">{formValues.receivedBy || "Ruaad Smart Smart Machine Trading LLC"}</p>
              </div>
            </div>

            {/* Receipt Footer Contact */}
            <div className="mt-4 border-t border-zinc-200 pt-3 text-center text-zinc-500 text-[8px] flex justify-between leading-normal">
              <div>
                <span className="font-bold">Address:</span> Business Bay – Churchill Tower, Office 404 – Floor 4, Dubai, UAE
              </div>
              <div>
                <span className="font-bold">Website:</span> ruaadsmart.ae
              </div>
              <div>
                <span className="font-bold">Phone:</span> +971 552067179
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
                <FileText className="w-5 h-5 text-purple-700" />
                {id ? (language === "ar" ? "تعديل سند القبض" : "Edit Receipt") : t("newReceipt")}
              </h1>
              <p className="text-xs text-slate-500 font-mono">No: {formValues.receiptNo}</p>
            </div>
          </div>

          {/* Action buttons on very small mobile screens (hidden on md) */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
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
          </div>
        </div>

        {/* Center/Right: Tabs & Desktop Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          {/* View Toggle Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto justify-around md:justify-start">
            <button
              type="button"
              onClick={() => setPreviewTab("edit")}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${previewTab === "edit" ? "bg-white text-purple-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              {language === "ar" ? "البيانات" : "Form"}
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("preview")}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${previewTab === "preview" ? "bg-white text-purple-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              {language === "ar" ? "المعاينة الطباعية A4" : "A4 Preview"}
            </button>
          </div>

          {/* Desktop/Tablet Action Buttons (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white font-bold text-xs transition-all hover:scale-[1.02] shadow-xs"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
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
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative workspace-split-pane">

        {/* Left Side: Form Editor Panel */}
        <div className={`flex-1 p-6 overflow-y-auto no-print bg-slate-100/60 ${previewTab === "preview" ? "hidden md:block" : "block"}`}>
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">

            {/* Section: Receipt Identity */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                {language === "ar" ? "تفاصيل المستند" : "Document Details"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "نوع الفاتورة" : "Invoice Type"}</label>
                  <select
                    {...register("invoiceType")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-left"
                  >
                    <option value="standard">{language === "ar" ? "سند قبض عادي" : "Standard Voucher/Receipt"}</option>
                    <option value="tax">{language === "ar" ? "فاتورة ضريبية مبسطة" : "Tax Invoice"}</option>
                  </select>
                </div>
                {formValues.invoiceType === "tax" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "الرقم الضريبي للعميل" : "Client Tax Number"}</label>
                    <input
                      type="text"
                      {...register("clientTaxNumber")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                      placeholder="e.g. 3xxxxxxxxxxxxxx"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("receiptNo")}</label>
                  <input
                    type="text"
                    {...register("receiptNo")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("date")}</label>
                  <input
                    type="text"
                    {...register("date")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section: Client & Payment Details */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                {language === "ar" ? "تفاصيل الدفع والاستلام" : "Payment Information"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("clientName")}</label>
                  <input
                    type="text"
                    required
                    {...register("clientName")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    placeholder="e.g. Mohamed Ibrahim"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("amount")}</label>
                    <input
                      type="number"
                      step="any"
                      required
                      {...register("amount")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("amountInWords")}</label>
                    <input
                      type="text"
                      required
                      {...register("amountInWords")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                      placeholder={language === "ar" ? "مثال: فقط خمسة آلاف درهم لا غير" : "e.g. Only Five Thousand AED"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("paymentMethod")}</label>
                    <select
                      {...register("paymentMethod")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                    >
                      <option value="cash">{t("cash")}</option>
                      <option value="bank">{t("bankTransfer")}</option>
                      <option value="cheque">{t("cheque")}</option>
                    </select>
                  </div>

                  {formValues.paymentMethod !== "cash" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "اسم البنك" : "Bank Name"}</label>
                      <input
                        type="text"
                        {...register("bankName")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                        placeholder="e.g. ADCB"
                      />
                    </div>
                  )}
                </div>

                {formValues.paymentMethod === "cheque" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("chequeNo")}</label>
                      <input
                        type="text"
                        {...register("chequeNo")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("chequeDate")}</label>
                      <input
                        type="text"
                        {...register("chequeDate")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("receivedFor")}</label>
                  <textarea
                    rows={2}
                    {...register("receivedFor")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section: Received By & Signature */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                {language === "ar" ? "بيانات وتوقيع المستلم" : "Receiver Signature & Name"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("receivedBy")}</label>
                  <input
                    type="text"
                    {...register("receivedBy")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-600">{t("integratorSignatureSeal")}</label>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-600 transition-colors font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t("clearSig")}</span>
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <SignatureCanvas
                      ref={sigRef}
                      canvasProps={{ className: "sigCanvas" }}
                      onEnd={onSignatureEnd}
                    />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Right Side: A4 Live Preview Sheet */}
        <div className={`flex-1 bg-slate-200/80 overflow-y-auto p-8 flex flex-col items-center gap-8 border-l border-slate-300 print-area printable-area ${previewTab === "edit" ? "hidden md:flex" : "flex"}`}>

          <div
            ref={previewRef}
            id="receipt-preview-page"
            dir="ltr"
            className="w-[210mm] min-h-[297mm] h-auto bg-white text-zinc-900 shadow-2xl p-[12mm] flex flex-col justify-start gap-4 relative text-xs select-none text-left print-area printable-area"
            style={{ boxSizing: "border-box", direction: "ltr" }}
          >
            <div>
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-[2px] border-[#581C87] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center bg-white">
                    <img
                      src={settings?.logoBase64 || "/logo.png"}
                      alt="Ruaad Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#581C87] font-sans m-0 leading-tight">RUAAD SMART</h2>
                    <p className="text-[9px] text-zinc-500 m-0 tracking-wider">RUAAD SMART MACHINE TRADING LLC</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="bg-[#581C87] text-white px-4 py-1.5 rounded font-bold text-sm tracking-wider inline-block">
                    {formValues.invoiceType === "tax" ? "TAX INVOICE" : "RECEIPT VOUCHER"}
                  </div>
                  <p className="text-[10px] text-[#581C87] font-bold mt-1 m-0">
                    {formValues.invoiceType === "tax" ? "فاتورة ضريبية مبسطة" : "سند قبض استلام مبالغ"}
                  </p>
                </div>
              </div>

              {/* Receipt Metadata */}
              <table className="w-full border border-zinc-200 mt-4 text-[10px] border-collapse" style={{ tableLayout: "fixed" }}>
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                      <div className="flex justify-between">
                        <span>Receipt No.</span>
                        <span className="font-arabic">رقم السند</span>
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 font-mono font-bold text-zinc-800" style={{ width: "25%" }}>{formValues.receiptNo}</td>
                    <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                      <div className="flex justify-between">
                        <span>Date</span>
                        <span className="font-arabic">التاريخ</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-zinc-700 font-semibold" style={{ width: "25%" }}>{formValues.date}</td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                      <div className="flex justify-between">
                        <span>Amount</span>
                        <span className="font-arabic">المبلغ</span>
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 text-[#581C87] font-bold font-mono text-sm" style={{ backgroundColor: "rgba(88, 28, 135, 0.05)", width: "25%" }}>
                      {formValues.amount ? Number(formValues.amount).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"} {settings?.currency || "AED"}
                    </td>
                    <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                      <div className="flex justify-between">
                        <span>Method</span>
                        <span className="font-arabic">طريقة الدفع</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-zinc-700 capitalize font-bold" style={{ width: "25%" }}>
                      {formValues.paymentMethod === "cash" && (language === "ar" ? "نقداً" : "Cash")}
                      {formValues.paymentMethod === "bank" && (language === "ar" ? "تحويل بنكي" : `Bank: ${formValues.bankName || ""}`)}
                      {formValues.paymentMethod === "cheque" && (language === "ar" ? `شيك: ${formValues.chequeNo || ""}` : `Cheque: ${formValues.chequeNo || ""}`)}
                    </td>
                  </tr>
                  {formValues.invoiceType === "tax" && (
                    <tr>
                      <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                        <div className="flex justify-between">
                          <span>Seller VAT No.</span>
                          <span className="font-arabic">الرقم الضريبي للمورد</span>
                        </div>
                      </td>
                      <td className="p-2.5 border-r border-zinc-200 font-mono font-semibold text-zinc-700" style={{ width: "25%" }}>
                        {settings?.taxNumber || "300000000000003"}
                      </td>
                      <td className="bg-zinc-50 p-2.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>
                        <div className="flex justify-between">
                          <span>Client VAT No.</span>
                          <span className="font-arabic">الرقم الضريبي للعميل</span>
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-zinc-700 font-semibold" style={{ width: "25%" }}>
                        {formValues.clientTaxNumber || "N/A"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Core Receipt content (Legal text style) */}
              <div className="mt-4 border border-zinc-200 rounded-lg p-4 space-y-4 text-zinc-800 leading-relaxed text-justify text-[10px]">
                <div>
                  <span className="font-bold text-[#581C87] inline-block w-36">
                    Received From:
                  </span>
                  <span className="text-zinc-900 font-bold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                    {formValues.clientName || "______________________________________"}
                  </span>
                  <span className="font-arabic font-bold text-zinc-500 float-right">استلمنا من</span>
                </div>

                <div>
                  <span className="font-bold text-[#581C87] inline-block w-36">
                    The Sum of:
                  </span>
                  <span className="text-zinc-800 font-bold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                    {formValues.amountInWords || "______________________________________"}
                  </span>
                  <span className="font-arabic font-bold text-zinc-500 float-right">مبلغ وقدره</span>
                </div>

                {formValues.paymentMethod !== "cash" && (
                  <div>
                    <span className="font-bold text-[#581C87] inline-block w-36">
                      {formValues.paymentMethod === "cheque" ? "Cheque No. & Bank:" : "Bank / Reference:"}
                    </span>
                    <span className="text-zinc-700 font-semibold border-b border-zinc-300 pb-0.5 inline-block min-w-[280px]">
                      {formValues.paymentMethod === "cheque" ? (
                        `${formValues.chequeNo || ""} - ${formValues.bankName || ""} (${formValues.chequeDate || ""})`
                      ) : (
                        formValues.bankName || "________________________"
                      )}
                    </span>
                    <span className="font-arabic font-bold text-zinc-500 float-right">
                      {formValues.paymentMethod === "cheque" ? "شيك رقم / بنك" : "تحويل بنكي / بنك"}
                    </span>
                  </div>
                )}

                <div>
                  <span className="font-bold text-[#581C87] inline-block w-36">
                    Being Payment for:
                  </span>
                  <span className="text-zinc-700 font-medium border-b border-zinc-300 pb-0.5 inline-block min-w-[280px] whitespace-normal">
                    {formValues.receivedFor || "______________________________________"}
                  </span>
                  <span className="font-arabic font-bold text-zinc-500 float-right">وذلك عن قيمة</span>
                </div>
              </div>

              {/* VAT Breakdown Table (only for Tax Invoices) */}
              {formValues.invoiceType === "tax" && (
                <div className="mt-4 border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-1.5 text-[10px]">
                  <div className="flex justify-between font-semibold text-zinc-700">
                    <span>Subtotal (Excl. VAT) / المجموع الفرعي (غير شامل الضريبة)</span>
                    <span className="font-mono">
                      {(Number(formValues.amount) ? (Number(formValues.amount) / (1 + Number(settings?.taxRate ?? 15) / 100)) : 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })} {settings?.currency || "AED"}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-zinc-600 border-t border-zinc-200/50 pt-1.5">
                    <span>VAT Amount ({settings?.taxRate ?? 15}%) / مبلغ ضريبة القيمة المضافة</span>
                    <span className="font-mono">
                      {(Number(formValues.amount) ? (Number(formValues.amount) - (Number(formValues.amount) / (1 + Number(settings?.taxRate ?? 15) / 100))) : 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })} {settings?.currency || "AED"}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-[#581C87] border-t border-zinc-200 pt-1.5 text-xs">
                    <span>Total (Incl. VAT) / المجموع الإجمالي (شامل الضريبة)</span>
                    <span className="font-mono">
                      {Number(formValues.amount) ? Number(formValues.amount).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"} {settings?.currency || "AED"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Section: Signatures & Address info */}
            <div>
              {/* Signatures block */}
              <div className="flex w-full justify-between gap-4 border border-zinc-200 rounded-lg p-3.5" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                <div className="w-[32%] text-center flex flex-col justify-between min-h-[90px]">
                  <p className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider">
                    Client Signature / Seal <br />
                    <span className="font-arabic text-zinc-400">توقيع / ختم العميل</span>
                  </p>
                  <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-4" />
                </div>

                {/* ZATCA QR Code in center (only for Tax Invoices) */}
                {formValues.invoiceType === "tax" && (
                  <div className="w-[32%] flex flex-col items-center justify-center min-h-[90px]">
                    {(() => {
                      const rate = Number(settings?.taxRate ?? 15);
                      const totalVal = Number(formValues.amount) || 0;
                      const taxVal = totalVal - (totalVal / (1 + rate / 100));
                      const companyName = settings?.companyName || (language === "ar" ? "رواد سمارت" : "Ruaad Smart Machine Trading LLC");
                      const companyTaxNo = settings?.taxNumber || "300000000000003";
                      const dateStr = formValues.date || new Date().toLocaleDateString("en-GB");

                      let parsedDateIso = new Date().toISOString();
                      try {
                        const parts = dateStr.split("/");
                        if (parts.length === 3) {
                          parsedDateIso = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0).toISOString();
                        } else {
                          parsedDateIso = new Date(dateStr).toISOString();
                        }
                      } catch (e) { }

                      const qrBase64 = generateZatcaTLV(
                        companyName,
                        companyTaxNo,
                        parsedDateIso,
                        totalVal.toFixed(2),
                        taxVal.toFixed(2)
                      );

                      if (!qrBase64) return null;
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrBase64)}`;
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <img src={qrUrl} alt="ZATCA QR Code" className="w-20 h-20 border border-zinc-200 p-0.5" />
                          <span className="text-[7px] text-zinc-400 font-sans tracking-tight">ZATCA QR Code</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className={`${formValues.invoiceType === "tax" ? "w-[32%]" : "w-[48%]"} text-center flex flex-col justify-between min-h-[90px] relative`}>
                  <p className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider relative z-10">
                    Authorized Receiver Signature <br />
                    <span className="font-arabic text-zinc-400">توقيع / ختم المستلم المصرح له</span>
                  </p>

                  {/* Official Stamp Overlay */}
                  <div className="absolute bottom-2 right-12 w-20 h-20 opacity-90 mix-blend-multiply pointer-events-none z-0 flex items-center justify-center">
                    <img
                      src={settings?.stampBase64 || "/stamp.png"}
                      alt="Ruaad Stamp"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {formValues.integratorSignature ? (
                    <div className="w-36 h-12 mx-auto mt-2 z-10 flex items-center justify-center">
                      <img
                        src={formValues.integratorSignature}
                        alt="Receiver Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-4 z-10" />
                  )}
                  <p className="text-[9px] text-[#581C87] font-bold mt-1 relative z-10">{formValues.receivedBy || "Ruaad Smart Smart Machine Trading LLC"}</p>
                </div>
              </div>

              {/* Receipt Footer Contact */}
              <div className="mt-4 border-t border-zinc-200 pt-3 text-center text-zinc-500 text-[8px] flex justify-between leading-normal">
                <div>
                  <span className="font-bold">Address:</span> Business Bay – Churchill Tower, Office 404 – Floor 4, Dubai, UAE
                </div>
                <div>
                  <span className="font-bold">Website:</span> ruaadsmart.ae
                </div>
                <div>
                  <span className="font-bold">Phone:</span> +971 552067179
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

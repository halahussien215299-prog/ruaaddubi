"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Printer,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Receipt,
  ScrollText,
  Sparkles,
  PenTool,
  X,
  CreditCard,
  Award,
  QrCode
} from "lucide-react";
import { getSettings, Settings } from "@/lib/db";
import { generateZATCAQRCodeDataURL } from "@/lib/taxCompliance";
import SignatureCanvas from "react-signature-canvas";

interface ClientQuotationViewerProps {
  id: string;
}

export default function ClientQuotationViewer({ id }: ClientQuotationViewerProps) {
  const [quotation, setQuotation] = useState<any>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Document presentation view
  const [viewType, setViewType] = useState<"quotation" | "standard_invoice" | "tax_invoice_uae" | "tax_invoice_ksa">("quotation");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Approval modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [approving, setApproving] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);

  const sigCanvasRef = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [qRes, sData] = await Promise.all([
          fetch(`/api/quotations/${id}`),
          getSettings().catch(() => null)
        ]);

        if (!qRes.ok) {
          throw new Error("لم يتم العثور على عرض السعر المطلوب");
        }

        const qData = await qRes.json();
        if (!qRes.ok) {
          throw new Error(qData.error || "تعذر تحميل عرض السعر");
        }
        setQuotation(qData);
        setSignerName(qData.clientName || "");
        setSignerPhone(qData.contactNo || "");
        setSettings(sData);

        if (qData.contactNo && typeof window !== "undefined") {
          try {
            localStorage.setItem("ruaad_client_phone", qData.contactNo);
          } catch (e) {}
        }

        // If URL has search params or already approved, can adapt
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const v = urlParams.get("view");
          const t = urlParams.get("type");
          const j = urlParams.get("jurisdiction");
          if (v === "invoice") {
            if (t === "tax") {
              if (j === "KSA" || qData.taxJurisdiction === "KSA" || qData.currency === "SAR") {
                setViewType("tax_invoice_ksa");
              } else {
                setViewType("tax_invoice_uae");
              }
            } else {
              setViewType("standard_invoice");
            }
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "حدث خطأ أثناء تحميل عرض السعر");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPhone.trim()) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/client/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: verifyPhone.trim() }),
      });
      if (!res.ok) {
        throw new Error("رقم الجوال غير صحيح أو لم يجد مستندات مسجلة");
      }
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "فشل التحقق من رقم الجوال");
    } finally {
      setVerifying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Handle Client Official Approval
  const handleClientApprove = async () => {
    if (!signerName.trim()) {
      alert("يرجى إدخال اسم المسؤول المعتمد");
      return;
    }

    setApproving(true);
    try {
      let signatureData = "";
      if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
        signatureData = sigCanvasRef.current.getCanvas().toDataURL("image/png");
      }

      const todayStr = new Date().toLocaleDateString("en-GB");
      const updatedQuote = {
        ...quotation,
        status: "approved",
        clientAcceptanceName: signerName,
        clientAcceptanceDate: todayStr,
        clientSignature: signatureData || quotation.clientSignature,
        updatedAt: new Date().toISOString()
      };

      // 1. Save quotation as approved
      const saveRes = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedQuote)
      });
      if (!saveRes.ok) throw new Error("فشل حفظ الاعتماد");

      // 2. Trigger auto creation of Contract, Receipt, and Certificate
      const quoteNo = updatedQuote.quotationNo || id;
      const match = quoteNo.match(/\d+/);
      const suffix = match ? match[0] : String(Math.floor(Math.random() * 90000) + 10000);

      // Create Contract
      const contractClauses = [
        {
          title: "البند الأول: نطاق العمل والخدمات",
          content: `توريد وتركيب وتشغيل الأنظمة المذكورة في عرض السعر رقم (${quoteNo}) بضمان وجودة عالية.`
        },
        {
          title: "البند الثاني: التكاليف والدفعات",
          content: `القيمة الإجمالية للعقد (${updatedQuote.total?.toLocaleString("en-AE")} درهم إماراتي).`
        },
        {
          title: "البند الثالث: الضمان والدعم الفني",
          content: "ضمان شامل للمعدات والتركيب لمدة 3 سنوات من تاريخ التسليم النهائي."
        }
      ];

      await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `contract-${suffix}`,
          contractNo: `C-${suffix}`,
          date: todayStr,
          location: updatedQuote.location || "المقر الرئيسي",
          title: "عقد توريد وتركيب أنظمة ذكية",
          firstPartyName: updatedQuote.clientName,
          firstPartyPhone: signerPhone || updatedQuote.contactNo || "",
          secondPartyName: "مؤسسة رواد سمارت للأجهزة الذكية",
          totalCost: updatedQuote.total,
          clauses: contractClauses,
          firstPartySignName: signerName,
          firstPartySignDate: todayStr,
          quotationId: updatedQuote.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }).catch(console.error);

      // Create Receipt
      await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `receipt-${suffix}`,
          receiptNo: `R-${suffix}`,
          date: todayStr,
          clientName: updatedQuote.clientName,
          amount: updatedQuote.total,
          paymentMethod: "bank",
          receivedFor: `دفعة مقابل عرض السعر رقم ${quoteNo}`,
          receivedBy: "مؤسسة رواد سمارت للأجهزة الذكية",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }).catch(console.error);

      // Create Certificate
      await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `cert-${suffix}`,
          project: updatedQuote.projectReference || `مشروع ${updatedQuote.clientName}`,
          systemType: updatedQuote.items?.[0]?.description?.split('\n')[0] || "Extra Low Voltage System",
          statement: "شهادة إنجاز وتسليم أعمال الأنظمة الذكية وكاميرات المراقبة.",
          clientName: updatedQuote.clientName,
          clientDate: todayStr,
          integratorName: "مؤسسة رواد سمارت للأجهزة الذكية",
          integratorDate: todayStr,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }).catch(console.error);

      setQuotation(updatedQuote);
      setShowApprovalModal(false);
      setApprovalSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء اعتماد عرض السعر");
    } finally {
      setApproving(false);
    }
  };

  // Calculations (must be called unconditionally before early returns to satisfy Rules of Hooks)
  const isTaxUae = viewType === "tax_invoice_uae";
  const isTaxKsa = viewType === "tax_invoice_ksa";
  const isTaxView = isTaxUae || isTaxKsa;
  const isStandardInvoice = viewType === "standard_invoice";
  const isInvoice = isTaxView || isStandardInvoice;

  const currentJurisdiction = isTaxKsa ? "KSA" : (quotation?.taxJurisdiction || "UAE");
  const currency = isTaxKsa ? "SAR" : (quotation?.currency || settings?.currency || "AED");

  const items = quotation?.items || [];
  const subtotal = items.reduce((acc: number, item: any) => acc + (Number(item.qty || 0) * Number(item.unitPrice || 0)), 0);
  const discountVal = Number(quotation?.discount) || 0;
  const discountAmount = subtotal * (discountVal / 100);
  const beforeTaxTotal = Math.max(0, subtotal - discountAmount);

  const taxRate = isTaxKsa ? 15 : (isTaxUae ? 5 : 0);
  const taxAmount = isTaxView ? beforeTaxTotal * (taxRate / 100) : 0;
  const finalTotal = beforeTaxTotal + taxAmount;

  const isApproved = quotation?.status === "approved" || quotation?.status === "executed";

  // Generate ZATCA / FTA QR Code (Hook declared unconditionally at top level)
  useEffect(() => {
    if (isTaxView && quotation) {
      const seller = quotation?.companyName || settings?.companyName || "RUAAD SMART MACHINE TRADING LLC";
      const vatNo = isTaxKsa
        ? (settings?.saudiTaxNumber || quotation?.companyTaxNumber || "300000000000003")
        : (settings?.uaeTaxNumber || settings?.taxNumber || quotation?.companyTaxNumber || "100458920100003");

      generateZATCAQRCodeDataURL({
        sellerName: seller,
        vatNumber: vatNo,
        timestamp: new Date().toISOString(),
        totalWithVat: finalTotal.toFixed(2),
        vatAmount: taxAmount.toFixed(2),
      }).then((url) => {
        if (url) setQrCodeDataUrl(url);
      }).catch(console.error);
    }
  }, [isTaxView, isTaxKsa, finalTotal, taxAmount, quotation, settings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="text-sm font-arabic">جاري تحميل المستند...</span>
      </div>
    );
  }

  if (error || !quotation) {
    const isForbidden = error?.includes("صلاحية") || error?.includes("403");
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 p-6 flex flex-col items-center justify-center text-center font-arabic">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-5 border border-rose-200">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-slate-900">{isForbidden ? "وصول محظور 🔒" : "تعذر عرض المستند"}</h1>
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          {error || "عرض السعر غير موجود أو لا تملك الصلاحية للوصول إليه."}
        </p>

        {isForbidden && (
          <form onSubmit={handleVerifyPhone} className="w-full max-w-sm bg-white border border-slate-200 p-6 rounded-2xl mb-6 space-y-3 text-right shadow-sm" dir="rtl">
            <label className="block text-xs font-bold text-slate-700">هل تملك هذا المستند؟ أدخل رقم جوالك للتحقق:</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={verifyPhone}
                onChange={(e) => setVerifyPhone(e.target.value)}
                placeholder="05xxxxxxxxx"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-purple-600 outline-none dir-ltr text-right"
              />
              <button
                type="submit"
                disabled={verifying}
                className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                {verifying && <Loader2 size={14} className="animate-spin" />}
                تحقق
              </button>
            </div>
          </form>
        )}

        <Link href="/client" className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-2xs">
          العودة لبوابة العملاء
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 p-4 md:p-8 dir-ltr print:bg-white print:text-black print:p-0 font-sans" dir="ltr">

      {/* Top Controls Navbar */}
      <div className="max-w-[210mm] mx-auto mb-5 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <Link
            href="/client"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowRight size={14} className="rotate-180" />
            <span className="font-arabic">العودة للبوابة</span>
          </Link>

          {/* View Mode Toggle: Quotation vs Standard Invoice vs UAE Tax vs Saudi Tax */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 font-arabic text-xs font-bold">
            <button
              onClick={() => setViewType("quotation")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewType === "quotation"
                  ? "bg-white text-purple-800 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              📑 عرض السعر
            </button>
            <button
              onClick={() => setViewType("standard_invoice")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewType === "standard_invoice"
                  ? "bg-white text-purple-800 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              📄 فاتورة عادية (0%)
            </button>
            <button
              onClick={() => setViewType("tax_invoice_uae")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${viewType === "tax_invoice_uae"
                  ? "bg-blue-700 text-white shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>🇦🇪</span>
              <span>ضريبية إماراتية (5%)</span>
            </button>
            <button
              onClick={() => setViewType("tax_invoice_ksa")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${viewType === "tax_invoice_ksa"
                  ? "bg-emerald-700 text-white shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>🇸🇦</span>
              <span>ضريبية سعودية (15% زاتكا)</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isApproved ? (
              <button
                onClick={() => setShowApprovalModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm font-arabic cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>قبول واعتماد العرض</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-arabic">
                <CheckCircle2 size={14} />
                <span>معتمد ومقبول</span>
              </span>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer font-arabic"
            >
              <Printer size={15} />
              <span>طباعة المستند</span>
            </button>
          </div>
        </div>

        {/* Approval Banner with Instant Multi-Jurisdiction Invoice Access */}
        {isApproved && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-purple-50 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs font-arabic flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  تم اعتماد هذا العرض رسمياً! الفواتير الصادرة متاحة فوراً:
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  معتمد باسم: <strong className="text-slate-800">{quotation.clientAcceptanceName || quotation.clientName}</strong> بتاريخ: <span className="font-mono">{quotation.clientAcceptanceDate || quotation.date}</span>
                </p>
              </div>
            </div>

            {/* Quick Document Links */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewType("standard_invoice")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${viewType === "standard_invoice"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                  }`}
              >
                <FileText size={14} className="text-blue-600" />
                <span>الفاتورة العادية (0%)</span>
              </button>

              <button
                onClick={() => setViewType("tax_invoice_uae")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${viewType === "tax_invoice_uae"
                    ? "bg-blue-800 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                  }`}
              >
                <span>🇦🇪</span>
                <span>فاتورة الإمارات (5%)</span>
              </button>

              <button
                onClick={() => setViewType("tax_invoice_ksa")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${viewType === "tax_invoice_ksa"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                  }`}
              >
                <span>🇸🇦</span>
                <span>فاتورة زاتكا (15%)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main A4 Document Paper Container (Exact Official Layout) */}
      <div className="max-w-[210mm] mx-auto bg-white text-zinc-900 shadow-xl border border-slate-200/60 p-[12mm] md:p-[15mm] flex flex-col justify-between relative text-xs select-none text-left print:shadow-none print:w-full print:p-0 print:border-none">

        <div className="flex flex-col gap-3">

          {/* Document Header */}
          <div className="flex items-start justify-between border-b-[2px] border-zinc-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center bg-white">
                <img
                  src={settings?.logoBase64 || "/logo.png"}
                  alt="Ruaad Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[15px] tracking-tight text-zinc-900 leading-none">
                  {quotation.companyName || "RUAAD SMART"}
                </span>
                <span className="text-[8.5px] font-semibold text-zinc-500 tracking-wider uppercase mt-1">
                  RUAAD SMART MACHINE TRADING LLC
                </span>
                {isTaxKsa && (
                  <span className="text-[8px] font-mono font-bold text-emerald-800 mt-0.5">
                    TIN: {settings?.saudiTaxNumber || quotation.companyTaxNumber || "300000000000003"}
                  </span>
                )}
                {isTaxUae && (
                  <span className="text-[8px] font-mono font-bold text-blue-900 mt-0.5">
                    TRN: {settings?.uaeTaxNumber || settings?.taxNumber || quotation.companyTaxNumber || "100458920100003"}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className={`px-4 py-1.5 font-black text-white text-[11px] uppercase tracking-widest rounded shadow-2xs inline-block ${isTaxKsa ? "bg-emerald-800" : isTaxUae ? "bg-blue-900" : isStandardInvoice ? "bg-indigo-800" : "bg-[#581C87]"
                }`}>
                {isTaxKsa ? "SIMPLIFIED TAX INVOICE" : isTaxUae ? "TAX INVOICE" : isStandardInvoice ? "INVOICE / STATEMENT" : "QUOTATION"}
              </div>
              <div className="text-[8px] text-zinc-400 font-semibold tracking-widest uppercase mt-1">
                {isTaxKsa ? "فاتورة ضريبية مبسطة - زاتكا" : isTaxUae ? "فاتورة ضريبية معتمدة - FTA" : "Engineering & Technical Services"}
              </div>
            </div>
          </div>

          {/* Quotation Metadata Grid */}
          <div className="border border-zinc-200 rounded overflow-hidden">
            <table className="w-full border-collapse text-[8.5px]" style={{ tableLayout: "fixed", width: "100%" }}>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "30%" }} />
              </colgroup>
              <tbody>
                <tr className="border-b border-zinc-200">
                  <td className="p-1.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)", width: "20%" }}>
                    {isInvoice ? "Invoice No." : "Quotation No."}
                  </td>
                  <td className="p-1.5 font-bold font-mono text-zinc-900 border-r border-zinc-200" style={{ width: "30%" }}>
                    {isInvoice ? `INV-${quotation.quotationNo || id}` : (quotation.quotationNo || id)}
                  </td>
                  <td className="p-1.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)", width: "20%" }}>
                    Date
                  </td>
                  <td className="p-1.5 font-medium text-zinc-800" style={{ width: "30%" }}>
                    {quotation.date}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)", width: "20%" }}>
                    {isInvoice ? "Tax Type" : "Valid Until"}
                  </td>
                  <td className="p-1.5 font-medium text-zinc-800 border-r border-zinc-200" style={{ width: "30%" }}>
                    {isTaxKsa ? "Standard Rated (15% ZATCA)" : isTaxUae ? "Standard Rated (5% FTA VAT)" : isStandardInvoice ? "Zero-Rated (0% Statement)" : (quotation.validUntil || "30 Days")}
                  </td>
                  <td className="p-1.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)", width: "20%" }}>
                    Prepared By
                  </td>
                  <td className="p-1.5 font-medium text-zinc-800" style={{ width: "30%" }}>
                    {quotation.preparedBy || "Ahmed - Ruaad Smart"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Client Info Grid */}
          <div className="border border-zinc-200 rounded overflow-hidden">
            <div className="px-2 py-0.5 font-bold text-[9px] border-b border-zinc-200 uppercase tracking-wider text-[#581C87]" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)" }}>
              CLIENT INFORMATION
            </div>
            <table className="w-full border-collapse text-[8.5px]" style={{ tableLayout: "fixed", width: "100%" }}>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "30%" }} />
              </colgroup>
              <tbody>
                <tr className="border-b border-zinc-200">
                  <td className="p-1.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)", width: "20%" }}>
                    Client Name
                  </td>
                  <td colSpan={3} className="p-1.5 font-bold text-zinc-900" style={{ width: "80%" }}>
                    {quotation.clientName || "-"}
                  </td>
                </tr>
                <tr className="border-b border-zinc-200">
                  <td className="p-1.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)", width: "20%" }}>
                    Contact No.
                  </td>
                  <td className="p-1.5 font-mono text-zinc-800 border-r border-zinc-200" style={{ width: "30%" }}>
                    {quotation.contactNo || "-"}
                  </td>
                  <td className="p-1.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)", width: "20%" }}>
                    Email
                  </td>
                  <td className="p-1.5 text-zinc-800" style={{ width: "30%" }}>
                    {quotation.email || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)", width: "20%" }}>
                    Location / Area
                  </td>
                  <td className="p-1.5 text-zinc-800 border-r border-zinc-200" style={{ width: "30%" }}>
                    {quotation.locationArea || "Dubai, UAE"}
                  </td>
                  <td className="p-1.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ backgroundColor: "rgba(250, 250, 250, 0.8)", width: "20%" }}>
                    Project Ref
                  </td>
                  <td className="p-1.5 text-zinc-800 font-medium" style={{ width: "30%" }}>
                    {quotation.projectReference || "Smart Automation System"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Line Items Table */}
          <div className="border border-zinc-200 rounded overflow-hidden">
            <table className="w-full border-collapse text-[8.5px]" style={{ tableLayout: "fixed", width: "100%" }}>
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "54%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead>
                <tr className="text-white font-bold text-[8.5px] bg-[#581C87]">
                  <th className="p-1.5 text-center border-r border-purple-900/30">#</th>
                  <th className="p-1.5 text-left border-r border-purple-900/30">Description & Specifications</th>
                  <th className="p-1.5 text-center border-r border-purple-900/30">Qty</th>
                  <th className="p-1.5 text-right border-r border-purple-900/30">Unit Price</th>
                  <th className="p-1.5 text-right">Total ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {items.map((item: any, idx: number) => {
                  const lineTotal = (Number(item.qty || 0) * Number(item.unitPrice || 0));
                  return (
                    <tr key={idx} className={idx % 2 === 1 ? "bg-zinc-50/60" : "bg-white"}>
                      <td className="p-1.5 text-center text-zinc-500 font-mono border-r border-zinc-200">{idx + 1}</td>
                      <td className="p-1.5 text-zinc-800 border-r border-zinc-200 whitespace-pre-wrap leading-tight">{item.description}</td>
                      <td className="p-1.5 text-center text-zinc-800 font-mono border-r border-zinc-200">{item.qty} {item.unit || "NOS"}</td>
                      <td className="p-1.5 text-right text-zinc-800 font-mono border-r border-zinc-200">
                        {Number(item.unitPrice || 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 text-right text-zinc-900 font-mono font-bold">
                        {lineTotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary Block */}
          <div className="flex justify-end">
            <div className="w-1/2 border border-zinc-200 rounded overflow-hidden text-[8.5px]">
              <div className="flex justify-between p-1.5 border-b border-zinc-150 bg-zinc-50/70">
                <span className="font-bold text-zinc-600">Subtotal:</span>
                <span className="font-mono font-bold text-zinc-800">
                  {subtotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>

              {discountVal > 0 && (
                <div className="flex justify-between p-1.5 border-b border-zinc-150 bg-zinc-50/70 text-emerald-700">
                  <span className="font-bold">Discount ({discountVal}%):</span>
                  <span className="font-mono font-bold">
                    -{discountAmount.toLocaleString("en-AE", { minimumFractionDigits: 2 })} {currency}
                  </span>
                </div>
              )}

              {isTaxView ? (
                <>
                  <div className="flex justify-between p-1.5 border-b border-zinc-150 bg-zinc-50/70">
                    <span className="font-bold text-zinc-600">Net Taxable Amount:</span>
                    <span className="font-mono font-bold text-zinc-800">
                      {beforeTaxTotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })} {currency}
                    </span>
                  </div>
                  <div className={`flex justify-between p-1.5 border-b border-zinc-150 font-bold ${isTaxKsa ? "bg-emerald-50 text-emerald-900" : "bg-purple-50 text-purple-900"}`}>
                    <span>{isTaxKsa ? "VAT (15% ZATCA Rate):" : "VAT (5% Standard Rate):"}</span>
                    <span className="font-mono">
                      +{taxAmount.toLocaleString("en-AE", { minimumFractionDigits: 2 })} {currency}
                    </span>
                  </div>
                </>
              ) : isStandardInvoice ? (
                <div className="flex justify-between p-1.5 border-b border-zinc-150 bg-slate-50 text-slate-600 font-bold">
                  <span>VAT Rate:</span>
                  <span className="font-mono">0.00% (Zero-Rated / Statement)</span>
                </div>
              ) : null}

              <div className={`flex justify-between p-2 font-bold text-[10px] ${isTaxKsa ? "bg-emerald-100/60 text-emerald-900" : "bg-[#581C87]/10 text-[#581C87]"}`}>
                <span className="uppercase">Grand Total:</span>
                <span className="font-mono font-extrabold text-[11px]">
                  {finalTotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures & Official Stamp Grid */}
          <table className="signature-block w-full border border-zinc-200 text-[8.5px] border-collapse relative mt-2" style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: isTaxView ? "40%" : "50%" }} />
              {isTaxView && <col style={{ width: "20%" }} />}
              <col style={{ width: isTaxView ? "40%" : "50%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="p-2 border-r border-zinc-200 min-h-[75px] relative align-top" style={{ width: isTaxView ? "40%" : "50%", verticalAlign: "top" }}>
                  <div className={`font-bold border-b border-zinc-100 pb-0.5 uppercase tracking-wider ${isTaxKsa ? "text-emerald-900" : "text-[#581C87]"}`}>
                    Prepared & Approved By ({quotation.companyName || "RUAAD SMART"})
                  </div>

                  {/* Official Stamp Overlay */}
                  <div className="absolute bottom-1 right-6 w-20 h-20 opacity-90 mix-blend-multiply pointer-events-none flex items-center justify-center -rotate-6">
                    <img
                      src={settings?.stampBase64 || "/stamp.png"}
                      alt="Ruaad Stamp"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="pt-4 text-zinc-700 space-y-0.5 relative z-10">
                    <div><span className="font-bold text-zinc-400">Name:</span> {quotation.preparedByName || "Ahmed / Management"}</div>
                    <div><span className="font-bold text-zinc-400">Date:</span> {quotation.preparedByDate || quotation.date}</div>
                  </div>
                </td>

                {isTaxView && (
                  <td className="p-2 border-r border-zinc-200 min-h-[75px] align-top text-center" style={{ width: "20%", verticalAlign: "top" }}>
                    <div className="flex flex-col items-center justify-center h-full gap-1 pt-0.5">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt={isTaxKsa ? "ZATCA TLV QR Code" : "Electronic QR"}
                          className="w-14 h-14 border border-zinc-200 p-0.5 bg-white shadow-2xs"
                        />
                      ) : (
                        <div className="w-14 h-14 border border-zinc-200 bg-slate-50 flex items-center justify-center text-[8px] text-zinc-400">
                          QR Code
                        </div>
                      )}
                      <span className="text-[6.5px] text-zinc-500 font-sans tracking-tight font-semibold">
                        {isTaxKsa ? "ZATCA TLV QR (زاتكا)" : "FTA Electronic QR"}
                      </span>
                    </div>
                  </td>
                )}

                <td className="p-2 min-h-[75px] align-top" style={{ width: isTaxView ? "40%" : "50%", verticalAlign: "top" }}>
                  <div className={`font-bold border-b border-zinc-100 pb-0.5 uppercase tracking-wider ${isTaxKsa ? "text-emerald-900" : "text-[#581C87]"}`}>
                    Client Acceptance (اعتماد وقبول العميل)
                  </div>

                  {quotation.clientSignature ? (
                    <div className="h-10 my-1 flex items-center justify-center">
                      <img src={quotation.clientSignature} alt="Client Signature" className="max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-6 mb-1" />
                  )}

                  <div className="text-zinc-700 space-y-0.5 pt-1">
                    <div><span className="font-bold text-zinc-400">Name:</span> {quotation.clientAcceptanceName || "..................................................."}</div>
                    <div><span className="font-bold text-zinc-400">Date:</span> {quotation.clientAcceptanceDate || "..................................................."}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Company & Bank Details */}
          <div className="bank-details-block border border-zinc-200 text-[8.5px] rounded overflow-hidden mt-1">
            <div className="font-bold px-2 py-0.5 border-b border-zinc-200 text-[#581C87]" style={{ backgroundColor: "rgba(88, 28, 135, 0.08)" }}>
              COMPANY & BANK DETAILS
            </div>
            <div className="flex w-full border-b border-zinc-150">
              <div className="w-[50%] p-1 border-r border-zinc-200">
                <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Company Name</span>
                <span className="text-zinc-800 font-semibold text-[8.5px] leading-tight">{quotation.companyName || "RUAAD SMART SMART MACHINE TRADING LLC"}</span>
              </div>
              <div className="w-[50%] p-1">
                <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Bank Name & BIC</span>
                <span className="text-zinc-800 font-semibold text-[8.5px] leading-tight">{quotation.bankName || "Wio Bank"} - {quotation.bankBic || "WIOBAEADXXX"}</span>
              </div>
            </div>
            <div className="flex w-full border-b border-zinc-150">
              <div className="w-[50%] p-1 border-r border-zinc-200">
                <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Company Address</span>
                <span className="text-zinc-800 font-medium text-[8.5px] leading-tight">{quotation.companyAddress || "Business Bay – Churchill Tower, Office 404 – Floor 4, Dubai, UAE"}</span>
              </div>
              <div className="w-[50%] p-1">
                <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">IBAN</span>
                <span className="text-zinc-900 font-mono font-bold text-[8.5px] tracking-wider leading-tight">{quotation.bankIban || "AE590860000009974815140"}</span>
              </div>
            </div>
            <div className="flex w-full">
              <div className="w-[50%] p-1 border-r border-zinc-200">
                <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Email</span>
                <a href={`mailto:${quotation.companyEmail || "info@ruaadsmart.ae"}`} className="text-blue-600 font-semibold text-[8.5px] leading-tight">{quotation.companyEmail || "info@ruaadsmart.ae"}</a>
              </div>
              <div className="w-[50%] p-1">
                <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Bank Address</span>
                <span className="text-zinc-800 font-medium text-[8.5px] leading-tight">{quotation.bankAddress || "Dubai, UAE"}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Official Approval & Digital Signature Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-arabic">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">اعتماد وقبول عرض السعر</h3>
                  <p className="text-xs text-slate-500">رقم العرض: {quotation.quotationNo || id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الشخص المعتمد / المفوض:</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="مثال: م. محمد عبد الله"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم هاتف التواصل:</label>
                <input
                  type="tel"
                  value={signerPhone}
                  onChange={(e) => setSignerPhone(e.target.value)}
                  placeholder="+971 50 xxx xxxx"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition text-left font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">التوقيع الرقمي المعتمد:</label>
                  <button
                    type="button"
                    onClick={() => sigCanvasRef.current?.clear()}
                    className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold cursor-pointer"
                  >
                    مسح التوقيع
                  </button>
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="#0f172a"
                    canvasProps={{
                      className: "w-full h-32 cursor-crosshair",
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">وقع بيدك أو بالماوس داخل المربع أعلاه</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 leading-relaxed">
                ⚡ بمجرد الاعتماد، يتم فوراً إصدار الفاتورة العادية وبيان الحساب، الفاتورة الضريبية 5%، وعقد التوريد والتركيب المعتمد.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleClientApprove}
                disabled={approving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {approving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>اعتماد وإصدار الفواتير فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Success Celebration Modal */}
      {approvalSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-arabic">
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Sparkles size={32} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">مبروك! تم اعتماد عرض السعر بنجاح 🎉</h2>
              <p className="text-xs text-slate-600 mt-1">
                تم حفظ موافقتك الرسمية وإصدار كافة الفواتير والعقود التنفيذية فوراً.
              </p>
            </div>

            {/* Instant Document Hub */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-right">
              <button
                onClick={() => {
                  setApprovalSuccess(false);
                  setViewType("standard_invoice");
                }}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-900 flex flex-col items-start gap-1 transition-all text-xs font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0">
                    <FileText size={14} />
                  </div>
                  <span>📄 الفاتورة العادية</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal mt-1">بيان أسعار (0% ضريبة)</span>
              </button>

              <button
                onClick={() => {
                  setApprovalSuccess(false);
                  setViewType("tax_invoice_uae");
                }}
                className="p-3 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-900 flex flex-col items-start gap-1 transition-all text-xs font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                    <span>🇦🇪</span>
                  </div>
                  <span>ضريبية إماراتية</span>
                </div>
                <span className="text-[10px] text-blue-600 font-normal mt-1">5% VAT - معتمدة FTA</span>
              </button>

              <button
                onClick={() => {
                  setApprovalSuccess(false);
                  setViewType("tax_invoice_ksa");
                }}
                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-900 flex flex-col items-start gap-1 transition-all text-xs font-bold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <span>🇸🇦</span>
                  </div>
                  <span>ضريبية سعودية</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-normal mt-1">15% زاتكا مع TLV QR</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-3">
              <button
                onClick={() => setApprovalSuccess(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                استعراض المستند الآن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

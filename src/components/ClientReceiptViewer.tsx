"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Printer, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { getSettings, Settings } from "@/lib/db";

interface ClientReceiptViewerProps {
  id: string;
}

export default function ClientReceiptViewer({ id }: ClientReceiptViewerProps) {
  const [receipt, setReceipt] = useState<any>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [rRes, sData] = await Promise.all([
          fetch(`/api/receipts/${id}`),
          getSettings().catch(() => null)
        ]);

        const rData = await rRes.json();
        if (!rRes.ok) {
          throw new Error(rData.error || "تعذر تحميل الفاتورة / السند");
        }

        setReceipt(rData);
        setSettings(sData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "حدث خطأ أثناء تحميل الفاتورة");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm">جاري تحميل الفاتورة...</span>
      </div>
    );
  }

  if (error || !receipt) {
    const isForbidden = error?.includes("صلاحية") || error?.includes("403");
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-5 border border-rose-500/20">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">{isForbidden ? "وصول محظور 🔒" : "تعذر عرض المستند"}</h1>
        <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
          {error || "الفاتورة غير موجودة أو لا تملك الصلاحية للوصول إليها."}
        </p>

        {isForbidden && (
          <form onSubmit={handleVerifyPhone} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-6 rounded-2xl mb-6 space-y-3 text-right" dir="rtl">
            <label className="block text-xs font-bold text-zinc-300">هل تملك هذا المستند؟ أدخل رقم جوالك للتحقق:</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={verifyPhone}
                onChange={(e) => setVerifyPhone(e.target.value)}
                placeholder="05xxxxxxxxx"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-blue-500 outline-none dir-ltr text-right"
              />
              <button
                type="submit"
                disabled={verifying}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                {verifying && <Loader2 size={14} className="animate-spin" />}
                تحقق
              </button>
            </div>
          </form>
        )}

        <Link href="/client" className="px-6 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-xs font-semibold transition-colors">
          العودة لبوابة العملاء
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 dir-rtl print:bg-white print:text-black print:p-0" dir="rtl">
      {/* Top Navbar */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/client"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl transition-colors"
        >
          <ArrowRight size={16} />
          العودة لبوابة العملاء
        </Link>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl transition-colors shadow-lg shadow-blue-600/10 cursor-pointer"
        >
          <Printer size={16} />
          طباعة / حفظ PDF
        </button>
      </div>

      {/* Main Document Paper Container */}
      <div className="max-w-3xl mx-auto bg-white text-zinc-900 rounded-2xl shadow-2xl p-8 md:p-12 print:shadow-none print:rounded-none print:w-full print:max-w-none">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 pb-6 mb-8">
          <div>
            {settings?.logoBase64 ? (
              <Image src={settings.logoBase64} alt="Logo" width={140} height={70} className="object-contain max-h-16 mb-2" />
            ) : (
              <h2 className="text-2xl font-black tracking-wider text-zinc-900">RUAAD SMART</h2>
            )}
            <p className="text-xs text-zinc-500">RUAAD SMART MACHINE TRADING LLC</p>
            {settings?.taxNumber && <p className="text-xs font-mono text-zinc-600 mt-1">الرقم الضريبي: {settings.taxNumber}</p>}
          </div>

          <div className="text-left">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-md mb-2">
              {receipt.invoiceType === "tax" ? "فاتورة ضريبية / TAX INVOICE" : "سند قبض / RECEIPT"}
            </span>
            <p className="text-sm font-mono font-bold text-zinc-800">رقم: {receipt.receiptNo || id}</p>
            <p className="text-xs text-zinc-500">التاريخ: {receipt.date}</p>
          </div>
        </div>

        {/* Content Box */}
        <div className="space-y-6 text-sm mb-8">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-3">
            <div className="flex justify-between border-b border-zinc-200/80 pb-2">
              <span className="text-zinc-500">استلمنا من السيد / السادة:</span>
              <span className="font-bold text-zinc-900">{receipt.clientName || "غير محدد"}</span>
            </div>

            <div className="flex justify-between border-b border-zinc-200/80 pb-2">
              <span className="text-zinc-500">مبلغ وقدره:</span>
              <span className="font-extrabold text-purple-900 text-base">{(receipt.amount || 0).toLocaleString()} SAR</span>
            </div>

            {receipt.amountInWords && (
              <div className="flex justify-between border-b border-zinc-200/80 pb-2 text-xs">
                <span className="text-zinc-500">المبلغ كتابة:</span>
                <span className="font-medium text-zinc-800">{receipt.amountInWords}</span>
              </div>
            )}

            <div className="flex justify-between text-xs pt-1">
              <span className="text-zinc-500">وذلك عن:</span>
              <span className="font-medium text-zinc-800">{receipt.receivedFor || "خدمات وتوريدات"}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center justify-between text-xs text-zinc-600 bg-zinc-50 px-4 py-3 rounded-lg border border-zinc-200">
            <span>طريقة الدفع: <strong className="text-zinc-800">{receipt.paymentMethod === "cash" ? "نقداً (Cash)" : receipt.paymentMethod === "bank" ? "تحويل بنكي (Bank Transfer)" : "شيك (Cheque)"}</strong></span>
            {receipt.chequeNo && <span>رقم الشيك: <strong className="font-mono">{receipt.chequeNo}</strong></span>}
          </div>
        </div>

        {/* ZATCA QR Code & Stamp */}
        <div className="flex items-end justify-between border-t border-zinc-200 pt-6 mt-8">
          <div>
            {receipt.zatcaQrCode && (
              <div className="text-center">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(receipt.zatcaQrCode)}`} alt="ZATCA QR" className="w-24 h-24 border border-zinc-300 p-1 rounded-lg" />
                <span className="text-[10px] text-zinc-400 block mt-1">ZATCA Verified</span>
              </div>
            )}
          </div>

          {(settings?.stampBase64 || "/stamp.png") && (
            <div>
              <Image src={settings?.stampBase64 || "/stamp.png"} alt="Stamp" width={90} height={90} className="object-contain opacity-90" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

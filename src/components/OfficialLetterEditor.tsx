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
  Loader2,
  FileText,
  RotateCcw
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { getAllOfficialLetters, getOfficialLetter, saveOfficialLetter, OfficialLetter, getSettings, Settings } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface OfficialLetterEditorProps {
  id?: string;
}

const LETTER_TYPES = [
  { value: "experience", labelAr: "شهادة خبرة", labelEn: "Experience Certificate" },
  { value: "authorization", labelAr: "تفويض رسمي", labelEn: "Official Authorization" },
  { value: "salary", labelAr: "شهادة راتب", labelEn: "Salary Certificate" },
  { value: "general", labelAr: "خطاب لمن يهمه الأمر", labelEn: "To Whom It May Concern" },
  { value: "claim", labelAr: "مطالبة مالية", labelEn: "Financial Claim" },
  { value: "custom", labelAr: "عنوان مخصص", labelEn: "Custom Title" },
];

const DEFAULT_LETTER_VALUES = {
  letterNo: "L-1001",
  date: new Date().toLocaleDateString("en-GB"),
  addressedTo: "",
  letterType: "general",
  customTitle: "",
  content: "",
  signatureImage: "",
  signatoryName: "",
  signatoryTitle: "",
};

export default function OfficialLetterEditor({ id }: OfficialLetterEditorProps) {
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
    if (isPrintMode && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isPrintMode, loading]);

  const previewRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<SignatureCanvas>(null);

  const { register, handleSubmit, watch, setValue, reset } = useForm<OfficialLetter>({
    defaultValues: DEFAULT_LETTER_VALUES
  });

  const formValues = watch();

  useEffect(() => {
    setIsMounted(true);
    if (id && id !== "new" && id !== "undefined") {
      async function loadLetter() {
        try {
          const data = await getOfficialLetter(id!);
          if (data) {
            reset(data);
            setTimeout(() => {
              if (data.signatureImage && sigRef.current) {
                sigRef.current.fromDataURL(data.signatureImage);
              }
            }, 200);
          } else {
            alert("Letter not found");
            router.push("/");
          }
        } catch (error) {
          console.error("Error loading letter:", error);
        } finally {
          setLoading(false);
        }
      }
      loadLetter();
    } else {
      async function generateSequentialLetterNo() {
        try {
          const letters = await getAllOfficialLetters();
          let maxNum = 1000;
          letters.forEach(l => {
            if (l.letterNo) {
              const match = l.letterNo.match(/\d+/);
              if (match) {
                const num = parseInt(match[0], 10);
                if (num > maxNum) {
                  maxNum = num;
                }
              }
            }
          });
          setValue("letterNo", `L-${maxNum + 1}`);
        } catch (err) {
          console.error("Error generating sequential letter no:", err);
          const randomNo = "L-" + String(Math.floor(Math.random() * 9000) + 1000);
          setValue("letterNo", randomNo);
        } finally {
          setLoading(false);
        }
      }
      generateSequentialLetterNo();
    }
  }, [id, reset, router, setValue]);

  const onSignatureEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setValue("signatureImage", sigRef.current.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      setValue("signatureImage", "");
    }
  };

  const onSubmit = async (data: OfficialLetter) => {
    setSaving(true);
    try {
      const documentId = (id && id !== "new") ? id : `letter-${Date.now()}`;
      const now = new Date().toISOString();
      const updatedDoc: OfficialLetter = {
        ...data,
        id: documentId,
        createdAt: data.createdAt || now,
        updatedAt: now
      };
      await saveOfficialLetter(updatedDoc);
      router.refresh();
      alert(language === "ar" ? "تم حفظ الخطاب بنجاح!" : "Official letter saved successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error saving letter:", error);
      alert(language === "ar" ? "فشل حفظ الخطاب." : "Failed to save letter.");
    } finally {
      setSaving(false);
    }
  };

  const saveCurrentDocument = async (): Promise<string> => {
    const documentId = (id && id !== "new" && id !== "undefined") ? id : `letter-${Date.now()}`;
    const now = new Date().toISOString();
    const updatedDoc: OfficialLetter = {
      ...formValues,
      id: documentId,
      createdAt: formValues.createdAt || now,
      updatedAt: now
    };
    await saveOfficialLetter(updatedDoc);
    return documentId;
  };

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      const docId = await saveCurrentDocument();
      const targetId = (!id || id === "new" || id === "undefined") ? docId : id;
      window.open(`/letter/${targetId}?print=true`, "_blank");
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
        const docId = await saveCurrentDocument();
        const targetId = (!id || id === "new" || id === "undefined") ? docId : id;
        window.open(`/letter/${targetId}?print=true`, "_blank");
      } catch (error) {
        console.error("Print trigger failed:", error);
        window.print();
      } finally {
        setExporting(false);
      }
    }
  };

  const getLetterTitle = () => {
    if (formValues.letterType === "custom") {
      return formValues.customTitle || (language === "ar" ? "خطاب رسمي مخصص" : "Custom Official Letter");
    }
    const currentType = LETTER_TYPES.find(t => t.value === formValues.letterType);
    return language === "ar" ? currentType?.labelAr : currentType?.labelEn;
  };

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
        <p className="text-slate-600 mt-2 text-sm font-medium">{language === "ar" ? "جاري تحميل المحرر..." : "Loading editor..."}</p>
      </div>
    );
  }

  const companyNameAr = settings?.companyName || "رواد سمارت";
  const companyNameEn = "Ruaad Smart Machine Trading LLC";

  if (isPrintMode) {
    return (
      <div className="bg-slate-100 min-h-screen flex flex-col items-center justify-start p-0 m-0 w-full" style={{ direction: "rtl" }}>
        {/* Floating Print Action Bar */}
        <div className="no-print w-full bg-white border-b border-slate-200 text-slate-800 py-3 px-4 sm:px-8 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 p-1 flex items-center justify-center border border-slate-200">
              <img src="/logo.png" alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-purple-900">رواد سمارت - {getLetterTitle()}</h3>
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
          id="letter-preview-page"
          dir="rtl"
          className="w-[210mm] min-h-[297mm] h-auto bg-white text-zinc-900 p-[15mm] flex flex-col justify-between gap-6 relative text-sm select-none text-right font-arabic"
          style={{ boxSizing: "border-box" }}
        >
          {/* Top Header */}
          <div className="flex items-start justify-between border-b-[2px] border-[#581C87] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center bg-white">
                <img
                  src={settings?.logoBase64 || "/logo.png"}
                  alt="Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="text-right">
                <h2 className="text-base font-bold text-[#581C87] m-0 leading-tight">{companyNameAr}</h2>
                <p className="text-[9px] text-zinc-500 m-0 tracking-wider font-sans">{companyNameEn}</p>
              </div>
            </div>

            <div className="text-left font-sans text-[10px] text-zinc-500 leading-tight">
              <div><strong>Letter No:</strong> {formValues.letterNo}</div>
              <div><strong>Date:</strong> {formValues.date}</div>
            </div>
          </div>

          {/* Letter Body */}
          <div className="flex-1 flex flex-col pt-6 pb-12 leading-relaxed text-justify space-y-6">
            {/* Addressed To */}
            {formValues.addressedTo && (
              <div className="font-bold text-zinc-800 text-sm">
                <span>الموقر / </span>
                <span className="border-b border-zinc-300 pb-0.5 px-1">{formValues.addressedTo}</span>
              </div>
            )}

            {/* Letter Title */}
            <div className="text-center my-4">
              <h1 className="text-base font-extrabold text-[#581C87] border-b-2 border-double border-[#581C87] inline-block pb-1 px-4">
                {getLetterTitle()}
              </h1>
            </div>

            {/* Content paragraph */}
            <div className="text-zinc-800 text-xs whitespace-pre-line leading-loose min-h-[300px]">
              {formValues.content || "يرجى كتابة نص الخطاب هنا..."}
            </div>
          </div>

          {/* Bottom Stamp and Signatures */}
          <div>
            <div className="flex w-full justify-between items-end border-t border-zinc-200 pt-6">
              <div className="w-[45%] text-right space-y-1">
                <p className="font-bold text-zinc-700 text-xs">وتقبلوا وافر الاحترام والتقدير،،،</p>
                <div className="pt-4 relative min-h-[90px]">
                  <p className="text-zinc-500 text-[10px]">مُصدِر الخطاب:</p>
                  <p className="font-bold text-zinc-800 text-xs">{formValues.signatoryName || companyNameAr}</p>
                  <p className="text-zinc-500 text-[9px]">{formValues.signatoryTitle || "الإدارة العامة"}</p>

                  {/* Signature render */}
                  {formValues.signatureImage && (
                    <div className="absolute top-2 right-4 w-32 h-14 z-10 flex items-center justify-center">
                      <img
                        src={formValues.signatureImage}
                        alt="Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Stamp Column */}
              <div className="w-[45%] flex justify-center relative min-h-[90px]">
                <div className="absolute bottom-0 w-24 h-24 opacity-90 mix-blend-multiply pointer-events-none z-0">
                  <img
                    src={settings?.stampBase64 || "/stamp.png"}
                    alt="Stamp"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Receipt Footer Contact */}
            <div className="mt-8 border-t border-zinc-200 pt-3 text-center text-zinc-400 text-[8px] flex justify-between leading-normal font-sans">
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
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                {id ? (language === "ar" ? "تعديل خطاب رسمي" : "Edit Official Letter") : (language === "ar" ? "خطاب رسمي جديد" : "New Official Letter")}
              </h1>
              <p className="text-xs text-slate-500 font-mono">No: {formValues.letterNo}</p>
            </div>
          </div>

          {/* Action buttons on mobile */}
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

        {/* Desktop actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          {/* Tabs */}
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

            {/* Section: Letter Metadata */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                {language === "ar" ? "معلومات الخطاب الأساسية" : "Basic Letter Details"}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "رقم الخطاب" : "Letter No."}</label>
                  <input
                    type="text"
                    {...register("letterNo")}
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

            {/* Section: Content Details */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                {language === "ar" ? "محتوى الخطاب" : "Letter Content"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "موجه إلى" : "Addressed To"}</label>
                  <input
                    type="text"
                    required
                    {...register("addressedTo")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none text-right transition-all"
                    placeholder="مثال: مدير دائرة التخطيط العقاري"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "نوع الخطاب" : "Letter Type"}</label>
                    <select
                      {...register("letterType")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-purple-600 outline-none text-right transition-all"
                    >
                      {LETTER_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {language === "ar" ? type.labelAr : type.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formValues.letterType === "custom" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "العنوان المخصص" : "Custom Title"}</label>
                      <input
                        type="text"
                        required
                        {...register("customTitle")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 outline-none text-right transition-all"
                        placeholder="اكتب عنوان الخطاب هنا"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "تفاصيل ونص الخطاب" : "Content Details"}</label>
                  <textarea
                    rows={12}
                    required
                    {...register("content")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none text-right leading-relaxed font-arabic transition-all"
                    placeholder="اكتب تفاصيل الخطاب الرسمي كاملاً هنا..."
                  />
                </div>
              </div>
            </div>

            {/* Section: Sender Information & Signature */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                {language === "ar" ? "معلومات وتوقيع المصدر" : "Sender Details & Signature"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "اسم المصدر" : "Signatory Name"}</label>
                  <input
                    type="text"
                    {...register("signatoryName")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 outline-none transition-all"
                    placeholder="مثال: م. أحمد المطيري"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "المسمى الوظيفي" : "Signatory Title"}</label>
                  <input
                    type="text"
                    {...register("signatoryTitle")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 outline-none transition-all"
                    placeholder="مثال: المدير التنفيذي"
                  />
                </div>
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

          </form>
        </div>

        {/* Right Side: A4 Live Preview Sheet */}
        <div className={`flex-1 bg-slate-200/80 overflow-y-auto p-8 flex flex-col items-center gap-8 border-l border-slate-300 print-area printable-area ${previewTab === "edit" ? "hidden md:flex" : "flex"}`}>

          <div
            ref={previewRef}
            id="letter-preview-page"
            dir="rtl"
            className="w-[210mm] min-h-[297mm] h-auto bg-white text-zinc-900 shadow-2xl p-[15mm] flex flex-col justify-between gap-6 relative text-sm select-none text-right font-arabic print-area printable-area"
            style={{ boxSizing: "border-box", direction: "rtl" }}
          >
            <div>
              {/* Top Header */}
              <div className="flex items-start justify-between border-b-[2px] border-[#581C87] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center bg-white">
                    <img
                      src={settings?.logoBase64 || "/logo.png"}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="text-right">
                    <h2 className="text-base font-bold text-[#581C87] m-0 leading-tight">{companyNameAr}</h2>
                    <p className="text-[9px] text-zinc-500 m-0 tracking-wider font-sans">{companyNameEn}</p>
                  </div>
                </div>

                <div className="text-left font-sans text-[10px] text-zinc-500 leading-tight">
                  <div><strong>Letter No:</strong> {formValues.letterNo}</div>
                  <div><strong>Date:</strong> {formValues.date}</div>
                </div>
              </div>

              {/* Letter Body */}
              <div className="flex-1 flex flex-col pt-6 pb-12 leading-relaxed text-justify space-y-6">
                {/* Addressed To */}
                {formValues.addressedTo && (
                  <div className="font-bold text-zinc-800 text-sm">
                    <span>الموقر / </span>
                    <span className="border-b border-zinc-300 pb-0.5 px-1">{formValues.addressedTo}</span>
                  </div>
                )}

                {/* Letter Title */}
                <div className="text-center my-4">
                  <h1 className="text-base font-extrabold text-[#581C87] border-b-2 border-double border-[#581C87] inline-block pb-1 px-4">
                    {getLetterTitle()}
                  </h1>
                </div>

                {/* Content paragraph */}
                <div className="text-zinc-800 text-xs whitespace-pre-line leading-loose min-h-[300px]">
                  {formValues.content || "يرجى كتابة نص الخطاب هنا..."}
                </div>
              </div>
            </div>

            {/* Bottom Stamp and Signatures */}
            <div>
              <div className="flex w-full justify-between items-end border-t border-zinc-200 pt-6">
                <div className="w-[45%] text-right space-y-1">
                  <p className="font-bold text-zinc-700 text-xs">وتقبلوا وافر الاحترام والتقدير،،،</p>
                  <div className="pt-4 relative min-h-[90px]">
                    <p className="text-zinc-500 text-[10px]">مُصدِر الخطاب:</p>
                    <p className="font-bold text-zinc-800 text-xs">{formValues.signatoryName || companyNameAr}</p>
                    <p className="text-zinc-500 text-[9px]">{formValues.signatoryTitle || "الإدارة العامة"}</p>

                    {/* Signature render */}
                    {formValues.signatureImage && (
                      <div className="absolute top-2 right-4 w-32 h-14 z-10 flex items-center justify-center">
                        <img
                          src={formValues.signatureImage}
                          alt="Signature"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Stamp Column */}
                <div className="w-[45%] flex justify-center relative min-h-[90px]">
                  <div className="absolute bottom-0 w-24 h-24 opacity-90 mix-blend-multiply pointer-events-none z-0">
                    <img
                      src={settings?.stampBase64 || "/stamp.png"}
                      alt="Stamp"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Footer Contact */}
              <div className="mt-8 border-t border-zinc-200 pt-3 text-center text-zinc-400 text-[8px] flex justify-between leading-normal font-sans">
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

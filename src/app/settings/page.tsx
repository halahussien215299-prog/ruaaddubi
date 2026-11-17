"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Upload, Image as ImageIcon, Loader2, Download, Database, RefreshCw, KeyRound, Lock, User, Crown, Shield, ShieldCheck } from "lucide-react";
import { getSettings, saveSettings } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import Image from "next/image";
import PermissionsManagerModal from "@/components/PermissionsManagerModal";

export default function SettingsPage() {
  const { isRtl } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [stampBase64, setStampBase64] = useState<string>("");
  const [taxRate, setTaxRate] = useState<number>(5);
  const [taxNumber, setTaxNumber] = useState<string>("");
  const [taxJurisdiction, setTaxJurisdiction] = useState<"UAE" | "KSA" | "dual">("dual");
  const [uaeTaxNumber, setUaeTaxNumber] = useState<string>("100458920100003");
  const [saudiTaxNumber, setSaudiTaxNumber] = useState<string>("300000000000003");
  const [currency, setCurrency] = useState<string>("AED");

  // Admin Credentials State
  const [adminUsername, setAdminUsername] = useState<string>("admin");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [savingCreds, setSavingCreds] = useState<boolean>(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState<boolean>(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getSettings();
        if (settings.logoBase64) setLogoBase64(settings.logoBase64);
        if (settings.stampBase64) setStampBase64(settings.stampBase64);
        if (settings.taxRate !== undefined) setTaxRate(settings.taxRate);
        if (settings.taxNumber) setTaxNumber(settings.taxNumber);
        if (settings.taxJurisdiction) setTaxJurisdiction(settings.taxJurisdiction);
        if (settings.uaeTaxNumber) setUaeTaxNumber(settings.uaeTaxNumber);
        else if (settings.taxNumber) setUaeTaxNumber(settings.taxNumber);
        if (settings.saudiTaxNumber) setSaudiTaxNumber(settings.saudiTaxNumber);
        if (settings.currency) setCurrency(settings.currency);
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "stamp") => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        if (type === "logo") setLogoBase64(base64);
        if (type === "stamp") setStampBase64(base64);
      } catch (error) {
        console.error("Error reading file:", error);
        setMessage({ type: "error", text: isRtl ? "فشل قراءة الملف." : "Failed to read file." });
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveSettings({
        logoBase64,
        stampBase64,
        taxRate: Number(taxRate) || 0,
        taxNumber: uaeTaxNumber || taxNumber,
        taxJurisdiction,
        uaeTaxNumber,
        saudiTaxNumber,
        currency,
      });
      setMessage({ type: "success", text: isRtl ? "تم حفظ الإعدادات بنجاح!" : "Settings saved successfully!" });
    } catch (e) {
      console.error("Failed to save:", e);
      setMessage({ type: "error", text: isRtl ? "فشل حفظ الإعدادات." : "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Failed to export backup");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-ruaad-smart-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: "success", text: isRtl ? "تم تحميل النسخة الاحتياطية بنجاح!" : "Backup downloaded successfully!" });
    } catch (e) {
      console.error("Export backup error:", e);
      setMessage({ type: "error", text: isRtl ? "فشل تحميل النسخة الاحتياطية." : "Failed to download backup." });
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(isRtl ? "هل أنت متأكد من استعادة النسخة الاحتياطية؟ سيتم استبدال البيانات الحالية." : "Are you sure you want to restore backup? Current data will be replaced.")) {
      e.target.value = "";
      return;
    }

    setRestoring(true);
    setMessage(null);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupData),
      });

      if (!res.ok) throw new Error("Restore failed");

      setMessage({ type: "success", text: isRtl ? "تمت استعادة النسخة الاحتياطية بنجاح! يرجى إعادة تحميل الصفحة." : "Backup restored successfully! Please refresh the page." });

      const updatedSettings = await getSettings();
      if (updatedSettings.logoBase64) setLogoBase64(updatedSettings.logoBase64);
      if (updatedSettings.stampBase64) setStampBase64(updatedSettings.stampBase64);
    } catch (e) {
      console.error("Restore error:", e);
      setMessage({ type: "error", text: isRtl ? "فشل استعادة النسخة الاحتياطية. يرجى التأكد من صحة الملف." : "Failed to restore backup. Invalid JSON file." });
    } finally {
      setRestoring(false);
      e.target.value = "";
    }
  };

  const handleCredentialsChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/change-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminUsername,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: isRtl ? "تم تحديث بيانات الدخول وحفظها بنجاح في قاعدة البيانات!" : "Credentials updated & saved to Database successfully!" });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setMessage({ type: "error", text: data.error || (isRtl ? "فشل تحديث بيانات الدخول. تحقق من كلمة المرور الحالية." : "Failed to update credentials.") });
      }
    } catch (e) {
      console.error("Change credentials error:", e);
      setMessage({ type: "error", text: isRtl ? "حدث خطأ أثناء الاتصال بالخادم." : "Error communicating with server." });
    } finally {
      setSavingCreds(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-700 animate-spin" />
        <p className="text-slate-500 mt-2 text-sm">{isRtl ? "جاري تحميل الإعدادات..." : "Loading settings..."}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-8 ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium text-xs sm:text-sm">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? "ml-1.5 rotate-180" : "mr-1.5"}`} />
            {isRtl ? "العودة للوحة التحكم" : "Back to Dashboard"}
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl flex items-center transition-all disabled:opacity-50 font-semibold text-xs sm:text-sm shadow-sm shadow-purple-700/20"
          >
            {saving ? (
              <Loader2 className={`w-4 h-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`} />
            ) : (
              <Save className={`w-4 h-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            )}
            {isRtl ? "حفظ الإعدادات" : "Save Settings"}
          </button>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{isRtl ? "إعدادات النظام" : "System Settings"}</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            {isRtl
              ? "إدارة شعار الشركة، الختم، الضرائب، وبيانات حساب الدخول للوحة التحكم."
              : "Manage company logo, stamp, tax details, and admin account credentials."}
          </p>
        </div>

        {/* Global Alert Message */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 border text-xs sm:text-sm font-medium ${message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Change Credentials Section */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs">
          <h2 className="text-lg font-bold mb-1 flex items-center text-slate-900">
            <KeyRound className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'} text-amber-600`} />
            {isRtl ? "بيانات الدخول للوحة التحكم (المشرف)" : "Change Admin Credentials"}
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            {isRtl
              ? "قم بتعديل اسم المستخدم وكلمة المرور للوحة التحكم وسيتم حفظها مباشرة في قاعدة البيانات."
              : "Update your admin username & password. Saved directly in MongoDB."}
          </p>

          <form onSubmit={handleCredentialsChange} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
                <User className="w-3.5 h-3.5 ml-1 mr-1 text-slate-400" />
                {isRtl ? "اسم المستخدم" : "Username"}
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
                <Lock className="w-3.5 h-3.5 ml-1 mr-1 text-slate-400" />
                {isRtl ? "كلمة المرور الحالية (تأكيد)" : "Current Password"} <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
                <Lock className="w-3.5 h-3.5 ml-1 mr-1 text-amber-600" />
                {isRtl ? "كلمة المرور الجديدة" : "New Password"} <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={savingCreds}
              className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl flex items-center font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 cursor-pointer mt-2 shadow-xs"
            >
              {savingCreds ? (
                <Loader2 className={`w-4 h-4 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} />
              ) : (
                <KeyRound className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              )}
              {isRtl ? "تحديث وحفظ بيانات الدخول" : "Save Credentials"}
            </button>
          </form>
        </div>

        {/* General Settings Section */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900">{isRtl ? "إعدادات الهوية والمطبوعات" : "Branding & Details"}</h2>

          {/* Logo & Stamp upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {isRtl ? "شعار الشركة (Logo)" : "Company Logo"}
              </label>
              <div className="flex items-center gap-4">
                {logoBase64 ? (
                  <div className="relative w-28 h-20 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-2">
                    <Image src={logoBase64} alt="Logo" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="w-28 h-20 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">{isRtl ? "لا يوجد شعار" : "No Logo"}</span>
                  </div>
                )}
                <label className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl flex items-center font-semibold transition-all border border-slate-200 cursor-pointer text-xs shadow-2xs">
                  <Upload className={`w-3.5 h-3.5 ${isRtl ? 'ml-1.5' : 'mr-1.5'} text-purple-700`} />
                  {isRtl ? "تغيير الشعار" : "Upload Logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "logo")} />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {isRtl ? "خاتم الشركة (Stamp)" : "Company Stamp"}
              </label>
              <div className="flex items-center gap-4">
                {stampBase64 ? (
                  <div className="relative w-28 h-20 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-2">
                    <Image src={stampBase64} alt="Stamp" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="w-28 h-20 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">{isRtl ? "لا يوجد خاتم" : "No Stamp"}</span>
                  </div>
                )}
                <label className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl flex items-center font-semibold transition-all border border-slate-200 cursor-pointer text-xs shadow-2xs">
                  <Upload className={`w-3.5 h-3.5 ${isRtl ? 'ml-1.5' : 'mr-1.5'} text-purple-700`} />
                  {isRtl ? "رفع خاتم" : "Upload Stamp"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "stamp")} />
                </label>
              </div>
            </div>
          </div>

          {/* Tax Jurisdiction & Regulatory Compliance */}
          <div className="pt-4 border-t border-slate-150 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {isRtl ? "نظام الامتثال الضريبي للدولة (Tax Jurisdiction)" : "Tax Compliance Jurisdiction"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTaxJurisdiction("UAE");
                    setCurrency("AED");
                    setTaxRate(5);
                  }}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${taxJurisdiction === "UAE"
                    ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-100"
                    : "border-slate-200 bg-slate-50 hover:bg-white"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">🇦🇪</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">5% FTA</span>
                  </div>
                  <div className="mt-2">
                    <h4 className="font-bold text-xs text-slate-900">دولة الإمارات (FTA)</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">ضريبة 5% | إقرار FTA 201 | درهم (AED)</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTaxJurisdiction("KSA");
                    setCurrency("SAR");
                    setTaxRate(15);
                  }}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${taxJurisdiction === "KSA"
                    ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-100"
                    : "border-slate-200 bg-slate-50 hover:bg-white"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">🇸🇦</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">15% ZATCA</span>
                  </div>
                  <div className="mt-2">
                    <h4 className="font-bold text-xs text-slate-900">المملكة العربية السعودية (زاتكا)</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">ضريبة 15% | فوترة إلكترونية TLV QR | ريال (SAR)</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTaxJurisdiction("dual")}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${taxJurisdiction === "dual"
                    ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-100"
                    : "border-slate-200 bg-slate-50 hover:bg-white"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">🇦🇪 🇸🇦</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">نظام مزدوج</span>
                  </div>
                  <div className="mt-2">
                    <h4 className="font-bold text-xs text-slate-900">الإمارات والسعودية معاً</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">دعم الفواتير والإقرارات لكلا البلدين بمرونة كاملة</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Tax Numbers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>🇦🇪 {isRtl ? "رقم التسجيل الضريبي الإماراتي (UAE TRN)" : "UAE Tax Registration Number (TRN)"}</span>
                  <span className="text-[10px] text-slate-400">15 رقماً تبدأ بـ 100</span>
                </label>
                <input
                  type="text"
                  value={uaeTaxNumber}
                  onChange={(e) => {
                    setUaeTaxNumber(e.target.value);
                    setTaxNumber(e.target.value);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 font-mono"
                  placeholder="100458920100003"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>🇸🇦 {isRtl ? "الرقم الضريبي السعودي - زاتكا (KSA TIN)" : "Saudi Tax Number (ZATCA TIN)"}</span>
                  <span className="text-[10px] text-slate-400">15 رقماً تبدأ وتنتهي بـ 3</span>
                </label>
                <input
                  type="text"
                  value={saudiTaxNumber}
                  onChange={(e) => setSaudiTaxNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono"
                  placeholder="300000000000003"
                />
              </div>
            </div>

            {/* Tax Rate & Default Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isRtl ? "نسبة الضريبة الافتراضية (%)" : "Default Tax Rate (%)"}
                </label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 font-mono"
                  placeholder="5 أو 15"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isRtl ? "العملة الافتراضية" : "Default Currency"}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                >
                  <option value="AED">{isRtl ? "🇦🇪 درهم إماراتي (AED)" : "UAE Dirham (AED)"}</option>
                  <option value="SAR">{isRtl ? "🇸🇦 ريال سعودي (SAR)" : "Saudi Riyal (SAR)"}</option>
                  <option value="USD">{isRtl ? "🇺🇸 دولار أمريكي (USD)" : "US Dollar (USD)"}</option>
                  <option value="QAR">{isRtl ? "🇶🇦 ريال قطري (QAR)" : "Qatari Riyal (QAR)"}</option>
                  <option value="KWD">{isRtl ? "🇰🇼 دينار كويتي (KWD)" : "Kuwaiti Dinar (KWD)"}</option>
                  <option value="BHD">{isRtl ? "🇧🇭 دينار بحريني (BHD)" : "Bahraini Dinar (BHD)"}</option>
                  <option value="OMR">{isRtl ? "🇴🇲 ريال عماني (OMR)" : "Omani Rial (OMR)"}</option>
                  <option value="EGP">{isRtl ? "🇪🇬 جنيه مصري (EGP)" : "Egyptian Pound (EGP)"}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Staff Permissions Control */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-amber-50/40 border border-purple-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900">
                  {isRtl ? "صلاحيات وحسابات طاقم العمل (المحاسب والإداري)" : "Staff Permissions & Roles"}
                </h2>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  الإدارة العليا
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? "التحكم في بيانات تسجيل الدخول وتحديد الصلاحيات الدقيقة لكل من المحاسب المالي والموظف الإداري، وحجب التكاليف أو الأرباح."
                  : "Manage credentials and granular permissions for Accountant and Operations staff."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPermissionsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer shrink-0"
            >
              <Crown className="w-4 h-4 text-amber-300" />
              <span>{isRtl ? "فتح لوحة إدارة الصلاحيات" : "Manage Permissions"}</span>
            </button>
          </div>
        </div>

        {/* Database Backup & Restore Section */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs">
          <h2 className="text-lg font-bold mb-1 flex items-center text-slate-900">
            <Database className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'} text-purple-700`} />
            {isRtl ? "النسخ الاحتياطي واستعادة البيانات" : "Database Backup & Restore"}
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            {isRtl
              ? "يمكنك تحميل نسخة احتياطية من جميع عروض الأسعار والشهادات والسندات والإعدادات للاحتفاظ بها بأمان، أو استعادتها في أي وقت."
              : "Download a full backup of all quotations, certificates, receipts, and settings, or restore them anytime."}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportBackup}
              disabled={exporting}
              className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl flex items-center font-semibold text-xs transition-all border border-slate-200 shadow-2xs disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className={`w-4 h-4 animate-spin ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
              ) : (
                <Download className={`w-4 h-4 ${isRtl ? 'ml-1.5' : 'mr-1.5'} text-purple-700`} />
              )}
              {isRtl ? "تحميل نسخة احتياطية (JSON)" : "Export Backup (JSON)"}
            </button>

            <label className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl flex items-center font-semibold text-xs transition-all border border-slate-200 shadow-2xs cursor-pointer disabled:opacity-50">
              {restoring ? (
                <Loader2 className={`w-4 h-4 animate-spin ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
              ) : (
                <RefreshCw className={`w-4 h-4 ${isRtl ? 'ml-1.5' : 'mr-1.5'} text-emerald-600`} />
              )}
              <span>{isRtl ? "استعادة نسخة احتياطية" : "Restore Backup"}</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestoreBackup}
                disabled={restoring}
              />
            </label>
          </div>
        </div>

        {/* Permissions Manager Modal */}
        <PermissionsManagerModal
          isOpen={permissionsModalOpen}
          onClose={() => setPermissionsModalOpen(false)}
        />

      </div>
    </div>
  );
}

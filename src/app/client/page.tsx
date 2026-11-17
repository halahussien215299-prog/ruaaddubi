"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Phone, 
  FileText, 
  Receipt, 
  Award, 
  Calculator, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  LogOut, 
  ExternalLink, 
  ShieldCheck, 
  Briefcase, 
  Camera, 
  Sparkles,
  FileCheck2,
  ReceiptText,
  CreditCard,
  Building2,
  RefreshCw,
  FolderOpen
} from "lucide-react";

type ClientTab = "invoices" | "projects" | "receipts" | "contracts" | "quotations" | "certificates";

export default function ClientPortalPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoChecking, setAutoChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ClientTab>("invoices");

  // Step 1: Automatic detection on page load (from URL param, localStorage, or session cookie)
  useEffect(() => {
    async function checkAutoLogin() {
      setAutoChecking(true);
      try {
        let phoneToTry = "";

        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const queryPhone = urlParams.get("phone");
          const storedPhone = localStorage.getItem("ruaad_client_phone");
          phoneToTry = queryPhone || storedPhone || "";
        }

        const endpoint = phoneToTry 
          ? `/api/client/portal?phone=${encodeURIComponent(phoneToTry)}`
          : `/api/client/portal`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const result = await res.json();
          if (result.authenticated && result.phone) {
            setData(result);
            setPhone(result.phone);
            setAuthenticated(true);
            if (typeof window !== "undefined") {
              localStorage.setItem("ruaad_client_phone", result.phone);
            }

            // Smart tab selection based on available data
            if ((result.counts?.invoices || 0) > 0) {
              setActiveTab("invoices");
            } else if ((result.counts?.projects || 0) > 0) {
              setActiveTab("projects");
            } else if ((result.counts?.contracts || 0) > 0) {
              setActiveTab("contracts");
            } else if ((result.counts?.receipts || 0) > 0) {
              setActiveTab("receipts");
            }
          }
        }
      } catch (err) {
        console.warn("Auto-login error:", err);
      } finally {
        setAutoChecking(false);
      }
    }

    checkAutoLogin();
  }, []);

  // Step 2: Handle explicit phone submission from login form
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("يرجى إدخال رقم الجوال");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/client/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "لم يتم العثور على مستندات مرتبطة بهذا الرقم");
      } else {
        setData(result);
        setAuthenticated(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("ruaad_client_phone", phone.trim());
        }

        // Smart tab selection
        if ((result.counts?.invoices || 0) > 0) {
          setActiveTab("invoices");
        } else if ((result.counts?.projects || 0) > 0) {
          setActiveTab("projects");
        } else if ((result.counts?.contracts || 0) > 0) {
          setActiveTab("contracts");
        }
      }
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle Logout / Switch Phone
  const handleLogout = () => {
    setAuthenticated(false);
    setData(null);
    setPhone("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("ruaad_client_phone");
      document.cookie = "ruaad_client_phone=; path=/; max-age=0;";
    }
  };

  // Extract client primary name
  const primaryClientName = data?.clientNames?.[0] || 
    data?.invoices?.[0]?.clientName || 
    data?.contracts?.[0]?.secondPartyName || 
    data?.projects?.[0]?.clientName || 
    "عميلنا الكريم";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-arabic pb-16" dir="rtl">
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 md:py-10">
        
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-slate-200 pb-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-700 text-white flex items-center justify-center font-black text-base shadow-sm">
              RS
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">رواد سمارت للأجهزة الذكية</h1>
              <p className="text-xs text-purple-700 font-bold flex items-center gap-1 mt-0.5">
                <ShieldCheck size={13} />
                بوابة المستندات والفواتير الرقمية الرسمية
              </p>
            </div>
          </div>

          {authenticated && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl transition cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw size={13} />
                <span>تحديث</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-200 px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs"
              >
                <LogOut size={13} />
                <span>تغيير رقم الجوال</span>
              </button>
            </div>
          )}
        </header>

        {/* 1. Checking screen (during auto-login) */}
        {autoChecking ? (
          <div className="max-w-md mx-auto my-16 text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-purple-700 mx-auto" />
            <h2 className="text-base font-bold text-slate-800">جاري تحميل مستنداتك وفواتيرك تلقائياً...</h2>
            <p className="text-xs text-slate-400">لحظات ويتم استعراض فواتيرك وعقودك المسجلة</p>
          </div>
        ) : !authenticated ? (

          /* 2. Phone Entry Screen (when no active session exists) */
          <div className="max-w-md mx-auto my-10">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl">
              
              <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 mx-auto mb-5 shadow-2xs">
                <FolderOpen size={28} />
              </div>

              <h2 className="text-xl font-bold text-center text-slate-900 mb-2">
                بوابة العملاء الرقمية
              </h2>
              <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
                أدخل رقم جوالك المسجل لاستعراض كافة الفواتير الضريبية، العقود، سندات القبض، ومشاريعك الميدانية فوراً.
              </p>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Phone size={14} className="text-purple-700" />
                    رقم الجوال المسجل
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 05xxxxxxxx"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-purple-600 text-slate-900 text-left tracking-wider font-mono placeholder:text-slate-400 transition"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    يمكن إدخال رقم الجوال بصيغة محلية (05xxxx) أو دولية (+971 / +966)
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جارٍ جلب المستندات...</span>
                    </>
                  ) : (
                    <>
                      <span>استعراض فواتيري ومستنداتي تلقائياً</span>
                      <ArrowRight size={15} className="rotate-180" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (

          /* 3. Authenticated Client Portal Dashboard */
          <div className="space-y-6">

            {/* Client Welcome Banner */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-48 h-48 bg-purple-600/10 rounded-br-full pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-purple-200">جلسة العميل نشطة</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono text-[11px]">
                      {phone}
                    </span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-black">
                    مرحباً بك، {primaryClientName}
                  </h2>

                  <p className="text-xs text-purple-200/80 leading-relaxed max-w-xl">
                    جميع فواتيرك المعتمدة، العقود الرسمية، سندات القبض، ومراحل تنفيذ مشاريعك مع شركة رواد سمارت متاحة هنا بشكل تلقائي ومحدث فورياً.
                  </p>
                </div>

                {/* Quick Document Stats Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 text-center">
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs min-w-[85px]">
                    <div className="text-lg font-black font-mono text-purple-200">{data?.counts?.invoices || 0}</div>
                    <div className="text-[10px] text-white/80 font-bold">فواتير</div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs min-w-[85px]">
                    <div className="text-lg font-black font-mono text-emerald-300">{data?.counts?.projects || 0}</div>
                    <div className="text-[10px] text-white/80 font-bold">مشاريع</div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs min-w-[85px]">
                    <div className="text-lg font-black font-mono text-blue-200">{data?.counts?.contracts || 0}</div>
                    <div className="text-[10px] text-white/80 font-bold">عقود</div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs min-w-[85px]">
                    <div className="text-lg font-black font-mono text-amber-300">{data?.counts?.receipts || 0}</div>
                    <div className="text-[10px] text-white/80 font-bold">سندات قبض</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Navigation Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
              
              {/* Tab 1: Tax Invoices */}
              <button
                onClick={() => setActiveTab("invoices")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                  activeTab === "invoices"
                    ? "bg-purple-700 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <ReceiptText size={16} />
                <span>الفواتير والمبيعات الضريبية</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === "invoices" ? "bg-white/20 text-white" : "bg-purple-50 text-purple-700"
                }`}>
                  {data?.counts?.invoices || 0}
                </span>
              </button>

              {/* Tab 2: Projects */}
              <button
                onClick={() => setActiveTab("projects")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                  activeTab === "projects"
                    ? "bg-purple-700 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Briefcase size={16} />
                <span>مشاريعي والمتابعة الميدانية</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === "projects" ? "bg-white/20 text-white" : "bg-purple-50 text-purple-700"
                }`}>
                  {data?.counts?.projects || 0}
                </span>
              </button>

              {/* Tab 3: Receipts */}
              <button
                onClick={() => setActiveTab("receipts")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                  activeTab === "receipts"
                    ? "bg-purple-700 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Receipt size={16} />
                <span>سندات القبض والدفعات</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === "receipts" ? "bg-white/20 text-white" : "bg-purple-50 text-purple-700"
                }`}>
                  {data?.counts?.receipts || 0}
                </span>
              </button>

              {/* Tab 4: Contracts */}
              <button
                onClick={() => setActiveTab("contracts")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                  activeTab === "contracts"
                    ? "bg-purple-700 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <FileText size={16} />
                <span>العقود والاتفاقيات</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === "contracts" ? "bg-white/20 text-white" : "bg-purple-50 text-purple-700"
                }`}>
                  {data?.counts?.contracts || 0}
                </span>
              </button>

              {/* Tab 5: Quotations */}
              <button
                onClick={() => setActiveTab("quotations")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                  activeTab === "quotations"
                    ? "bg-purple-700 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Calculator size={16} />
                <span>عروض الأسعار</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === "quotations" ? "bg-white/20 text-white" : "bg-purple-50 text-purple-700"
                }`}>
                  {data?.counts?.quotations || 0}
                </span>
              </button>

              {/* Tab 6: Certificates */}
              <button
                onClick={() => setActiveTab("certificates")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                  activeTab === "certificates"
                    ? "bg-purple-700 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Award size={16} />
                <span>شهادات الإنجاز والضمان</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === "certificates" ? "bg-white/20 text-white" : "bg-purple-50 text-purple-700"
                }`}>
                  {data?.counts?.certificates || 0}
                </span>
              </button>

            </div>

            {/* ========================================================= */}
            {/* TAB 1: INVOICES (الفواتير الضريبية والمبيعات) */}
            {/* ========================================================= */}
            {activeTab === "invoices" && (
              <div className="space-y-4">
                {(!data?.invoices || data.invoices.length === 0) ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                    <ReceiptText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h3 className="font-bold text-sm text-slate-800">لا توجد فواتير ضريبية صادرة لهذا الرقم حتى الآن</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      يتم إصدار الفواتير الضريبية المعتمدة فور الموافقة على عروض الأسعار أو اعتماد دفعات العقود.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.invoices.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="bg-white border border-slate-200 hover:border-purple-300 rounded-3xl p-6 transition-all shadow-xs flex flex-col justify-between space-y-5"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 font-bold">
                              {inv.invoiceNo}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                              <CheckCircle2 size={12} />
                              فاتورة ضريبية معتمدة
                            </span>
                          </div>

                          <div>
                            <h3 className="font-bold text-base text-slate-900 leading-snug">
                              {inv.projectReference || `فاتورة توريد وتركيب أنظمة ذكية`}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              تاريخ الفاتورة: <span className="font-mono text-slate-700 font-semibold">{inv.date}</span>
                            </p>
                          </div>

                          {/* Financial Summary Box */}
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>المبلغ قبل الضريبة:</span>
                              <span className="font-mono font-semibold">{(inv.subtotal || inv.total).toLocaleString()} {inv.currency}</span>
                            </div>
                            {inv.vatAmount > 0 && (
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>ضريبة القيمة المضافة:</span>
                                <span className="font-mono font-semibold">{(inv.vatAmount).toLocaleString()} {inv.currency}</span>
                              </div>
                            )}
                            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold text-purple-900">
                              <span>الإجمالي النهائي المستحق:</span>
                              <span className="font-mono text-base text-purple-700">{(inv.total || 0).toLocaleString()} {inv.currency}</span>
                            </div>
                          </div>
                        </div>

                        {/* Invoice Actions */}
                        <div className="space-y-2 pt-2">
                          <Link
                            href={inv.viewUrl}
                            target="_blank"
                            className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                          >
                            <ReceiptText size={15} />
                            <span>معاينة الفاتورة الضريبية الرسمية (ZATCA / FTA) 🧾</span>
                            <ExternalLink size={13} />
                          </Link>

                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={inv.standardInvoiceUrl}
                              target="_blank"
                              className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                            >
                              <span>فاتورة قياسية</span>
                              <ExternalLink size={11} />
                            </Link>
                            <Link
                              href={inv.quotationUrl}
                              target="_blank"
                              className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                            >
                              <span>عرض السعر الأصلي</span>
                              <ExternalLink size={11} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: PROJECTS (مشاريعي ومتابعة التنفيذ الميداني) */}
            {/* ========================================================= */}
            {activeTab === "projects" && (
              <div className="space-y-4">
                {(!data?.projects || data.projects.length === 0) ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h3 className="font-bold text-sm text-slate-800">لا توجد مشاريع مسجلة بهذا الرقم حالياً</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      فور بدء مشروعك سيتم تزويدك برابط مباشر وتوثيق صور الموقع مرحلياً.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.projects.map((proj: any) => {
                      const milestones = proj.milestones || [];
                      const completedCount = milestones.filter((m: any) => m.status === "completed").length;
                      const totalCount = milestones.length || 1;
                      const percent = Math.min(100, Math.round((completedCount / totalCount) * 100));
                      const photosCount = (proj.sitePhotos || []).length;

                      return (
                        <div key={proj.id || proj._id} className="bg-white border border-slate-200 hover:border-purple-300 rounded-3xl p-6 transition-all space-y-5 flex flex-col justify-between shadow-xs">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 font-bold">
                                {proj.projectNo || "مشروع"}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                proj.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}>
                                {proj.status === "completed" ? "✅ تم التسليم" : "🚀 جاري العمل بالموقع"}
                              </span>
                            </div>

                            <h3 className="font-bold text-slate-900 text-base mb-1">{proj.title}</h3>
                            <p className="text-xs text-slate-600">الموقع: {proj.location || "الموقع الميداني"}</p>
                            {proj.targetEndDate && (
                              <p className="text-xs text-slate-400 mt-1">تاريخ التسليم المتوقع: {proj.targetEndDate}</p>
                            )}

                            {/* Progress bar */}
                            <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-700">نسبة إنجاز المشروع:</span>
                                <span className="text-purple-700 font-mono text-sm">{percent}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                                <span>{completedCount} من {totalCount} مراحل منجزة</span>
                                <span className="flex items-center gap-1 text-purple-700 font-bold">
                                  <Camera size={13} />
                                  {photosCount} صور توثيقية حية
                                </span>
                              </div>
                            </div>
                          </div>

                          <Link
                            href={`/track/${proj.id}`}
                            target="_blank"
                            className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                          >
                            <Camera size={15} />
                            <span>متابعة مسار المشروع وألبوم صور الموقع المباشر 📸</span>
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: RECEIPTS (سندات القبض والدفعات) */}
            {/* ========================================================= */}
            {activeTab === "receipts" && (
              <div className="space-y-4">
                {(!data?.receipts || data.receipts.length === 0) ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h3 className="font-bold text-sm text-slate-800">لا توجد سندات قبض مسجلة بهذا الرقم</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      تصدر سندات القبض فور استلام الدفعات المالية والنقدية أو التحويلات البنكية.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.receipts.map((receipt: any) => (
                      <div key={receipt.id || receipt._id} className="bg-white border border-slate-200 hover:border-purple-300 rounded-3xl p-6 transition-all space-y-4 flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 font-bold">
                              {receipt.receiptNo || "سند قبض"}
                            </span>
                            <span className="text-xs font-mono text-slate-500">{receipt.date}</span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-base mb-1">
                            {receipt.receivedFor || "سند استلام دفعة مالية"}
                          </h3>
                          <p className="text-xs text-slate-600">العميل المستلم منه: {receipt.clientName}</p>
                          <p className="text-xs text-slate-500 mt-1">طريقة الدفع: {receipt.paymentMethod === "bank" ? "تحويل بنكي 🏦" : receipt.paymentMethod === "cash" ? "نقداً 💵" : "شيك مصرفي 📑"}</p>

                          <div className="mt-4 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-900">المبلغ المستلم:</span>
                            <span className="text-lg font-black font-mono text-emerald-700">
                              {(receipt.amount || 0).toLocaleString()} درهم
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/receipt/${receipt.id}/view`}
                          target="_blank"
                          className="w-full py-3 bg-slate-100 hover:bg-purple-50 text-slate-800 hover:text-purple-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition border border-slate-200"
                        >
                          <Receipt size={14} />
                          <span>معاينة سند القبض المالي 📄</span>
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4: CONTRACTS (العقود ومذكرات الاتفاق) */}
            {/* ========================================================= */}
            {activeTab === "contracts" && (
              <div className="space-y-4">
                {(!data?.contracts || data.contracts.length === 0) ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h3 className="font-bold text-sm text-slate-800">لا توجد عقود مسجلة بهذا الرقم</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      تظهر هنا كافة العقود الرسمية المبرمة مع إمكانية التوقيع الإلكتروني.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.contracts.map((contract: any) => {
                      const isSigned = !!contract.secondPartySignature || !!contract.secondPartySignName;
                      return (
                        <div key={contract.id || contract._id} className="bg-white border border-slate-200 hover:border-purple-300 rounded-3xl p-6 transition-all space-y-4 flex flex-col justify-between shadow-xs">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 font-bold">
                                {contract.contractNo || "عقد اتفاق"}
                              </span>
                              {isSigned ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                  <CheckCircle2 size={12} />
                                  موقّع ومعتمد
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                                  <Clock size={12} />
                                  بانتظار التوقيع
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-slate-900 text-base mb-1">{contract.title || "عقد توريد وتركيب"}</h3>
                            <p className="text-xs text-slate-600">الطرف الأول (العميل): {contract.secondPartyName || contract.firstPartyName}</p>
                            <p className="text-xs text-slate-400 mt-1">تاريخ العقد: <span className="font-mono text-slate-700">{contract.date}</span></p>

                            {contract.totalCost && (
                              <div className="mt-3 text-sm font-black text-purple-900 font-mono">
                                القيمة الإجمالية للعقد: {Number(contract.totalCost).toLocaleString()} درهم
                              </div>
                            )}
                          </div>

                          <Link
                            href={`/contract/${contract.id}/sign`}
                            target="_blank"
                            className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                          >
                            <span>{isSigned ? "معاينة العقد الموقع 📜" : "معاينة وتوقيع العقد إلكترونياً ✍️"}</span>
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 5: QUOTATIONS (عروض الأسعار) */}
            {/* ========================================================= */}
            {activeTab === "quotations" && (
              <div className="space-y-4">
                {(!data?.quotations || data.quotations.length === 0) ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                    <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h3 className="font-bold text-sm text-slate-800">لا توجد عروض أسعار مسجلة بهذا الرقم</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      تظهر هنا كافة عروض الأسعار والمواصفات الفنية المقدمة لمشروعك.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.quotations.map((q: any) => (
                      <div key={q.id || q._id} className="bg-white border border-slate-200 hover:border-purple-300 rounded-3xl p-6 transition-all space-y-4 flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 font-bold">
                              {q.quotationNo || "عرض سعر"}
                            </span>
                            <span className="text-xs font-mono text-slate-500">{q.date}</span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-base mb-1">{q.projectReference || "عرض أسعار وتجهيزات تقنية"}</h3>
                          <p className="text-xs text-slate-600">العميل: {q.clientName}</p>

                          <div className="mt-3 text-sm font-black text-purple-900 font-mono">
                            الإجمالي: {(q.total || 0).toLocaleString()} {q.currency || "درهم"}
                          </div>
                        </div>

                        <Link
                          href={`/quotation/${q.id}/view`}
                          target="_blank"
                          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition border border-slate-200"
                        >
                          <Calculator size={14} />
                          <span>معاينة وتفاصيل عرض السعر 📑</span>
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 6: CERTIFICATES (شهادات الإنجاز والضمان) */}
            {/* ========================================================= */}
            {activeTab === "certificates" && (
              <div className="space-y-4">
                {(!data?.certificates || data.certificates.length === 0) ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                    <Award className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h3 className="font-bold text-sm text-slate-800">لا توجد شهادات إنجاز مسجلة بهذا الرقم حالياً</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      تصدر شهادات الإتمام والضمان فور انتهاء المشروع والفحص الفني.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.certificates.map((cert: any) => (
                      <div key={cert.id || cert._id} className="bg-white border border-slate-200 hover:border-purple-300 rounded-3xl p-6 transition-all space-y-4 flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 font-bold">
                              شهادة تسليم وضمان
                            </span>
                            <span className="text-xs font-mono text-slate-500">{cert.clientDate || cert.createdAt?.split("T")[0]}</span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-base mb-1">{cert.project || "شهادة إتمام وتوريد أنظمة"}</h3>
                          <p className="text-xs text-slate-600">العميل: {cert.clientName}</p>
                          <p className="text-xs text-slate-500 mt-1">الأنظمة المشمولة: {cert.systemType}</p>
                        </div>

                        <Link
                          href={`/certificate/${cert.id}/sign`}
                          target="_blank"
                          className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                        >
                          <Award size={14} />
                          <span>معاينة شهادة الإنجاز والضمان 🏆</span>
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

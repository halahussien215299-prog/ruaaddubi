"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Lock, User, Globe, AlertCircle, ShieldCheck, Crown, Briefcase, Calculator } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language, setLanguage, isRtl } = useLanguage();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("app_active_role", data.user?.role || "admin");
          localStorage.setItem("app_user_role", data.user?.role || "admin");
          localStorage.setItem("app_user_name", data.user?.name || "المستخدم");
          if (data.user?.permissions) {
            localStorage.setItem("app_user_perms", JSON.stringify(data.user.permissions));
          }
        }
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(data.error || t("invalidCredentials"));
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setError(language === "ar" ? "حدث خطأ أثناء الاتصال بالخادم." : "An error occurred connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center relative px-4 overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 right-1/4 w-[32rem] h-[32rem] bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[28rem] h-[28rem] bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher in Header */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs transition-all shadow-sm"
        >
          <Globe className="w-4 h-4 text-purple-600" />
          <span>{language === "ar" ? "English" : "العربية"}</span>
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-8 sm:p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)]">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-44 h-28 rounded-2xl overflow-hidden border border-slate-150 bg-white p-2 flex items-center justify-center mb-4 shadow-sm">
              <Image
                src="/logo.png"
                alt="Ruaad Smart Logo"
                fill
                sizes="(max-width: 768px) 176px, 176px"
                className="object-contain"
                priority
              />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 text-center font-arabic">
              {t("loginTitle")}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 text-center max-w-[290px] leading-relaxed">
              {language === "ar" 
                ? "لوحة تحكم رواد سمارت - ذكاء يحمي عالمك" 
                : "Ruaad Smart Management Portal"}
            </p>
          </div>

          {/* Executive Portal Access Banner */}
          <div className="mb-5">
            <Link
              href="/executive/login"
              className="group flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-600/10 to-amber-500/10 border border-amber-400/40 hover:border-amber-500 hover:shadow-md transition-all text-xs text-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-xs shrink-0">
                  <Crown className="w-5 h-5 text-slate-900" />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <div className="text-amber-900 font-extrabold text-xs">
                    {language === "ar" ? "بوابة الإدارة العليا والتنفيذية" : "Executive Portal"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {language === "ar" ? "دخول الملاك والإدارة العامة (رمز PIN سري)" : "Top Management & Owners Login"}
                  </div>
                </div>
              </div>
              <span className="text-amber-800 font-bold text-xs group-hover:translate-x-[-2px] transition-transform">
                {isRtl ? "دخول ⬅" : "Login ➡"}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="h-[1px] bg-slate-200 flex-1" />
            <span className="text-[11px] font-semibold text-slate-400">
              {language === "ar" ? "دخول موظفي العمليات والمحاسبة" : "Staff & Accounting Login"}
            </span>
            <div className="h-[1px] bg-slate-200 flex-1" />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t("username")}
              </label>
              <div className="relative flex items-center">
                <span className={`absolute ${isRtl ? "right-4" : "left-4"} text-slate-400`}>
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "أدخل اسم المستخدم" : "Enter username"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full bg-slate-50/70 border border-slate-200 rounded-xl py-2.5 ${
                    isRtl ? "pr-10 pl-4 text-right" : "pl-10 pr-4 text-left"
                  } text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t("password")}
              </label>
              <div className="relative flex items-center">
                <span className={`absolute ${isRtl ? "right-4" : "left-4"} text-slate-400`}>
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder={language === "ar" ? "أدخل كلمة المرور" : "Enter password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-slate-50/70 border border-slate-200 rounded-xl py-2.5 ${
                    isRtl ? "pr-10 pl-4 text-right" : "pl-10 pr-4 text-left"
                  } text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-semibold text-sm transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("authenticating")}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t("signInBtn")}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Staff Roles Assistance */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              <span>المحاسب المالي</span>
            </span>
            <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>الموظف الإداري</span>
            </span>
          </div>

          {/* Quick Info */}
          <div className="mt-8 pt-6 border-t border-slate-150 text-center">
            <p className="text-[11px] text-slate-400 font-arabic">
              {language === "ar" 
                ? "مؤسسة رواد سمارت للأجهزة الذكية © 2026" 
                : "Ruaad Smart Machine Trading LLC © 2026"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

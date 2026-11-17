"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Crown, 
  Lock, 
  User, 
  ShieldCheck, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Building2,
  CheckCircle2
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

function ExecutiveLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, isRtl } = useLanguage();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleExecutiveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          pin,
          portal: "executive",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Save role as admin / executive
        if (typeof window !== "undefined") {
          localStorage.setItem("app_active_role", "admin");
          localStorage.setItem("app_user_name", data.user?.name || "الإدارة العليا");
          localStorage.setItem("app_user_role", "admin");
          if (data.user?.permissions) {
            localStorage.setItem("app_user_perms", JSON.stringify(data.user.permissions));
          }
        }
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(data.error || (language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid executive credentials"));
      }
    } catch (err) {
      console.error(err);
      setError(language === "ar" ? "فشل الاتصال بالنظام، يرجى المحاولة لاحقاً." : "Connection failed, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#1E1035] to-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-arabic">
      {/* Ambient Luxury Lighting Orbs */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-500/15 rounded-full blur-[140px] pointer-events-none" />
      
      {/* Top Navbar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 text-xs font-semibold text-slate-200 transition-all shadow-sm"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>{language === "ar" ? "دخول الموظفين والمحاسب" : "Staff Portal"}</span>
        </Link>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
          <Crown className="w-3.5 h-3.5" />
          <span>منطقة حصرية للإدارة العليا</span>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 my-12">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-purple-500/30 p-8 sm:p-10 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.5)] relative">
          
          {/* Decorative Corner Crown Badge */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 flex items-center justify-center border-2 border-amber-200 text-slate-950">
            <Crown className="w-7 h-7" />
          </div>

          {/* Header */}
          <div className="flex flex-col items-center text-center mt-3 mb-6">
            <div className="relative w-36 h-20 rounded-xl overflow-hidden bg-white/10 border border-white/20 p-2 flex items-center justify-center mb-3">
              <Image
                src="/logo.png"
                alt="Ruaad Smart Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>بوابة الإدارة العليا والتنفيذية</span>
            </h1>
            <p className="text-xs text-purple-200/70 mt-1 max-w-[320px] leading-relaxed">
              رواد سمارت - لوحة التحكم الشاملة، العقود، والتصاريح والصلاحيات
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-start gap-2.5 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleExecutiveLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-purple-200/90 mb-1.5 text-right">
                اسم مستخدم الإدارة العليا:
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-950/70 border border-purple-500/40 rounded-xl py-2.5 px-3.5 pr-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-mono"
                  dir="ltr"
                />
                <User className="w-4 h-4 text-purple-300 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200/90 mb-1.5 text-right">
                كلمة المرور التنفيذية:
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/70 border border-purple-500/40 rounded-xl py-2.5 px-3.5 pr-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-purple-300 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200/90 mb-1.5 flex items-center justify-between">
                <span className="text-[10px] text-amber-300 font-normal">اختياري (2026)</span>
                <span>رمز التحقق الإداري (PIN):</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="PIN: 2026"
                  className="w-full bg-slate-950/70 border border-purple-500/40 rounded-xl py-2.5 px-3.5 pr-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all text-center tracking-widest font-mono"
                  dir="ltr"
                />
                <KeyRound className="w-4 h-4 text-purple-300 absolute right-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>جاري التحقق التنفيذي...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>دخول الإدارة العليا</span>
                </>
              )}
            </button>
          </form>

          {/* Security Features Footnote */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-[11px] text-purple-200/60">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>صلاحيات مطلقة</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>تحكم في الموظفين</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>تشفير 256-bit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExecutiveLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <ExecutiveLoginForm />
    </Suspense>
  );
}

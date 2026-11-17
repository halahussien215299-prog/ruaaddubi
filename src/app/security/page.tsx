"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldOff, 
  AlertTriangle, 
  AlertCircle, 
  Lock, 
  KeyRound, 
  User, 
  Users, 
  Activity, 
  RefreshCw, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Globe, 
  Laptop, 
  Smartphone, 
  Ban, 
  LogOut, 
  ArrowRight, 
  Sparkles,
  Crown,
  Calculator,
  Briefcase,
  FileText,
  Sliders,
  Check,
  Loader2,
  HardDrive
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface AuditLog {
  id: string;
  timestamp: string;
  actor: {
    username: string;
    role: "admin" | "accounting" | "operations" | "system" | "client";
    name: string;
    ip?: string;
    userAgent?: string;
    device?: string;
    browser?: string;
  };
  action: string;
  actionTitleAr: string;
  category: "auth" | "quotation" | "financial" | "hr" | "project" | "security" | "settings";
  targetId?: string;
  targetType?: string;
  details: string;
  severity: "info" | "warning" | "danger" | "success";
}

interface SecurityData {
  firewallEnabled: boolean;
  bruteForceProtection: boolean;
  maxFailedAttempts: number;
  blockDurationHours: number;
  requirePinForSensitiveActions: boolean;
  ipWhitelist: string[];
  ipBlacklist: string[];
  blockedIps: {
    ip: string;
    reason: string;
    blockedAt: string;
    attemptsCount: number;
  }[];
  activeSessions: {
    id: string;
    username: string;
    role: string;
    name: string;
    ip: string;
    device: string;
    browser: string;
    loggedInAt: string;
    lastActiveAt: string;
  }[];
  securityScore: number;
}

export default function SecurityPage() {
  const { language, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<"audit" | "firewall" | "sessions">("audit");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, securityAlerts: 0 });
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);

  // Filters for Audit Log
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  // Manual IP block state
  const [blockIpInput, setBlockIpInput] = useState("");
  const [blockReasonInput, setBlockReasonInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      const [logsRes, secRes] = await Promise.all([
        fetch("/api/audit-logs?limit=250"),
        fetch("/api/security/firewall")
      ]);

      if (logsRes.ok) {
        const logsJson = await logsRes.json();
        setLogs(logsJson.logs || []);
        if (logsJson.stats) setStats(logsJson.stats);
      }

      if (secRes.ok) {
        const secJson = await secRes.json();
        setSecurityData(secJson);
      }
    } catch (err) {
      console.error("Failed to load security data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (roleFilter !== "all" && log.actor.role !== roleFilter) return false;
      if (categoryFilter !== "all" && log.category !== categoryFilter) return false;
      if (severityFilter !== "all" && log.severity !== severityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDetails = log.details.toLowerCase().includes(q);
        const matchTitle = (log.actionTitleAr || "").toLowerCase().includes(q);
        const matchName = (log.actor.name || "").toLowerCase().includes(q);
        const matchUser = (log.actor.username || "").toLowerCase().includes(q);
        const matchIp = (log.actor.ip || "").toLowerCase().includes(q);
        const matchTarget = (log.targetId || "").toLowerCase().includes(q);
        return matchDetails || matchTitle || matchName || matchUser || matchIp || matchTarget;
      }

      return true;
    });
  }, [logs, roleFilter, categoryFilter, severityFilter, searchQuery]);

  const handleToggleRule = async (field: string, value: any) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/security/firewall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "تم تحديث قواعد جدار الحماية بنجاح." });
        loadAllData();
      } else {
        setMessage({ type: "error", text: data.error || "فشل التحديث" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "تعذر الاتصال بالخادم" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualBlockIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockIpInput.trim()) return;

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/security/firewall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block_ip",
          ip: blockIpInput.trim(),
          reason: blockReasonInput.trim() || "حظر يدوي من لوحة التحكم",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: `تم حظر عنوان الـ IP (${blockIpInput.trim()}) بنجاح.` });
        setBlockIpInput("");
        setBlockReasonInput("");
        loadAllData();
      } else {
        setMessage({ type: "error", text: data.error || "فشل حظر العنوان" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "تعذر الاتصال بالخادم" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/security/firewall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock_ip", ip }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: `تم فك الحظر عن (${ip}) بنجاح.` });
        loadAllData();
      } else {
        setMessage({ type: "error", text: data.error || "فشل فك الحظر" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "تعذر الاتصال بالخادم" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/security/firewall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "terminate_session", sessionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "تم إنهاء الجلسة وطرد المستخدم فوراً." });
        loadAllData();
      }
    } catch (e) {
      setMessage({ type: "error", text: "تعذر إنهاء الجلسة" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminateAllOtherSessions = async () => {
    if (!confirm("هل أنت متأكد من تسجيل خروج جميع الأجهزة والجلسات الأخرى؟")) return;

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/security/firewall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "terminate_all_other_sessions" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "تم إنهاء كافة الجلسات وتسجيل الخروج الجماعي." });
        loadAllData();
      }
    } catch (e) {
      setMessage({ type: "error", text: "تعذر إنهاء الجلسات" });
    } finally {
      setActionLoading(false);
    }
  };

  const exportAuditLogsCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ["Timestamp", "Role", "Username", "Actor Name", "IP", "Action", "Details", "Severity"];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.actor.role}"`,
      `"${l.actor.username}"`,
      `"${l.actor.name}"`,
      `"${l.actor.ip || ''}"`,
      `"${l.actionTitleAr || l.action}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.severity}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-ruaad-smart-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-400/40 text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
            <Crown className="w-3 h-3 text-amber-600" />
            <span>الإدارة العليا</span>
          </span>
        );
      case "accounting":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-400/40 text-emerald-900 font-bold text-[10px] px-2 py-0.5 rounded-md">
            <Calculator className="w-3 h-3 text-emerald-600" />
            <span>المحاسب المالي</span>
          </span>
        );
      case "operations":
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/15 border border-blue-400/40 text-blue-900 font-bold text-[10px] px-2 py-0.5 rounded-md">
            <Briefcase className="w-3 h-3 text-blue-600" />
            <span>الموظف الإداري</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-semibold text-[10px] px-2 py-0.5 rounded-md">
            <span>النظام / تلقائي</span>
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "danger":
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>حرج / أمان</span>
          </span>
        );
      case "warning":
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>تنبيه</span>
          </span>
        );
      case "success":
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>ناجح</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
            معلومة
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-arabic pb-16" dir={isRtl ? "rtl" : "ltr"}>
      {/* Top Banner Navigation */}
      <header className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white py-6 px-4 sm:px-8 border-b border-purple-900/40 relative overflow-hidden shadow-lg">
        {/* Ambient glow */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/15"
              title="العودة للرئيسية"
            >
              <ArrowRight className={`w-5 h-5 ${isRtl ? "" : "rotate-180"}`} />
            </Link>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Shield className="w-6 h-6 text-slate-950" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  مركز عمليات الأمان وجدار الحماية (Firewall & WAF)
                </h1>
                <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>الدرع نشط</span>
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-1 max-w-xl">
                مراقبة التهديدات، حظر الهجمات وعناوين IP، وسجل رقابي وتدقيقي كامل لكل حركة وعملية تتم في رواد سمارت
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <button
              onClick={loadAllData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "جارِ التحديث..." : "تحديث البيانات"}</span>
            </button>

            <Link
              href="/executive/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-extrabold transition shadow-sm"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>بوابة الإدارة العليا</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Notification Toast */}
        {message && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border animate-in fade-in ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Firewall Shield */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">حالة جدار الحماية</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {securityData?.firewallEnabled ? "مفعل 100%" : "معطل"}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                WAF Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              حماية ضد هجمات القوة الغاشمة وحقن البيانات
            </p>
          </div>

          {/* Card 2: Security Score */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">مستوى الأمان العام</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {securityData?.securityScore || 95}%
              </span>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                آمن ومحمي
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              معايير تشفير متوافقة مع متطلبات الشركات
            </p>
          </div>

          {/* Card 3: Blocked Threats */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">عناوين الـ IP المحظورة</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600 font-mono">
                {securityData?.blockedIps?.length || 0}
              </span>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                عناوين مشبوهة
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              تم حظرها تلقائياً بعد تجاوز المحاولات المسموحة
            </p>
          </div>

          {/* Card 4: Audit Logs Count */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">سجل العمليات والرقابة</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {stats.total.toLocaleString()}
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {stats.today} عملية اليوم
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              توثيق فوري لأي إضافة، تعديل، حذف، أو دخول
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2 flex items-center justify-between gap-3 shadow-2xs flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === "audit"
                  ? "bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>سجل تدقيق ورقابة العمليات ({filteredLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("firewall")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === "firewall"
                  ? "bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>قواعد جدار الحماية وعناوين IP</span>
            </button>

            <button
              onClick={() => setActiveTab("sessions")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === "sessions"
                  ? "bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>الجلسات النشطة والأجهزة المتصلة ({securityData?.activeSessions?.length || 0})</span>
            </button>
          </div>

          {activeTab === "audit" && (
            <button
              onClick={exportAuditLogsCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200 cursor-pointer"
              title="تصدير السجل بتنسيق CSV"
            >
              <Download className="w-3.5 h-3.5 text-purple-700" />
              <span>تصدير السجل (Excel / CSV)</span>
            </button>
          )}
        </div>

        {/* TAB 1: COMPREHENSIVE AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-5">
            {/* Search & Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Box */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، العملية، عنوان IP، المستند..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-purple-600 outline-none"
                />
              </div>

              {/* Role Filter */}
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:border-purple-600 outline-none"
                >
                  <option value="all">جميع المسؤولين والأدوار</option>
                  <option value="admin">👑 الإدارة العليا (Admin)</option>
                  <option value="accounting">💰 المحاسب المالي (Accounting)</option>
                  <option value="operations">📋 الموظف الإداري (Operations)</option>
                  <option value="system">⚙️ النظام الداخلي (System)</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:border-purple-600 outline-none"
                >
                  <option value="all">جميع أنواع العمليات</option>
                  <option value="auth">🔐 عمليات تسجيل الدخول والخروج</option>
                  <option value="quotation">📄 عروض الأسعار والفواتير</option>
                  <option value="financial">💵 السندات والمصروفات</option>
                  <option value="hr">👥 الموظفين والرواتب واليوميات</option>
                  <option value="project">🏗️ المشاريع الميدانية</option>
                  <option value="security">🛡️ أحداث الأمان وجدار الحماية</option>
                  <option value="settings">⚙️ تعديلات الصلاحيات والإعدادات</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:border-purple-600 outline-none"
                >
                  <option value="all">جميع مستويات الأهمية</option>
                  <option value="danger">🚨 حرج / إنذارات أمان</option>
                  <option value="warning">⚠️ تنبيهات</option>
                  <option value="success">✅ عمليات ناجحة</option>
                  <option value="info">ℹ️ معلومات اعتيادية</option>
                </select>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3.5">التوقيت والتاريخ</th>
                      <th className="p-3.5">المسؤول / الدور</th>
                      <th className="p-3.5">عنوان IP والجهاز</th>
                      <th className="p-3.5">العملية المنفذة</th>
                      <th className="p-3.5">التفاصيل والتغييرات</th>
                      <th className="p-3.5 text-center">الأهمية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                          <span>جارِ جلب سجلات التدقيق من قاعدة البيانات...</span>
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                          لا توجد سجلات تطابق معايير البحث الحالية.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const dateObj = new Date(log.timestamp);
                        const dateStr = dateObj.toLocaleDateString("ar-EG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        });
                        const timeStr = dateObj.toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        });

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Timestamp */}
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-bold text-slate-800">{timeStr}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{dateStr}</div>
                            </td>

                            {/* Actor */}
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className="font-extrabold text-slate-900">
                                  {log.actor.name || log.actor.username}
                                </span>
                                <div>{getRoleBadge(log.actor.role)}</div>
                              </div>
                            </td>

                            {/* IP & Device */}
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-mono text-xs text-purple-900 font-bold bg-purple-50/80 px-2 py-0.5 rounded border border-purple-200/60 inline-block">
                                {log.actor.ip || "127.0.0.1"}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                {log.actor.device?.includes("هاتف") ? (
                                  <Smartphone className="w-3 h-3 text-slate-400" />
                                ) : (
                                  <Laptop className="w-3 h-3 text-slate-400" />
                                )}
                                <span className="truncate max-w-[140px]">{log.actor.browser || log.actor.device || "متصفح ويب"}</span>
                              </div>
                            </td>

                            {/* Action Title */}
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-bold text-slate-900">{log.actionTitleAr || log.action}</div>
                              <span className="text-[10px] text-slate-400 font-mono uppercase">{log.category}</span>
                            </td>

                            {/* Details */}
                            <td className="p-3.5 max-w-md">
                              <p className="text-slate-700 leading-relaxed text-[11px] font-medium">
                                {log.details}
                              </p>
                              {log.targetId && (
                                <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                                  ID: {log.targetId}
                                </span>
                              )}
                            </td>

                            {/* Severity */}
                            <td className="p-3.5 text-center whitespace-nowrap">
                              {getSeverityBadge(log.severity)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FIREWALL RULES & IP MANAGEMENT */}
        {activeTab === "firewall" && (
          <div className="space-y-6">
            {/* Core Security Rules Settings Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">سياسات وإعدادات جدار الحماية (Firewall Policies)</h2>
                    <p className="text-xs text-slate-500">التحكم في فلاتر الحماية التلقائية ضد الهجمات والتخمين</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rule 1: Master Firewall */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">جدار حماية التطبيقات (WAF Master)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      فحص الاتصالات وعزل محاولات الهجوم وحظر عناوين الـ IP المشبوهة
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleRule("firewallEnabled", !securityData?.firewallEnabled)}
                    disabled={actionLoading}
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
                      securityData?.firewallEnabled ? "bg-purple-600 justify-end" : "bg-slate-300 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                {/* Rule 2: Brute Force Shield */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">درع الحماية ضد التخمين (Anti Brute-Force)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      حظر تلقائي فوري لأي عنوان IP يقوم بمحاولات دخول خاطئة متكررة
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleRule("bruteForceProtection", !securityData?.bruteForceProtection)}
                    disabled={actionLoading}
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
                      securityData?.bruteForceProtection ? "bg-purple-600 justify-end" : "bg-slate-300 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                {/* Rule 3: Max Attempts */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">حد المحاولات الفاشلة قبل الحظر التلقائي</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      عدد المرات المسموح بها للمستخدم بتجربة كلمة مرور خاطئة
                    </span>
                  </div>
                  <select
                    value={securityData?.maxFailedAttempts || 5}
                    onChange={(e) => handleToggleRule("maxFailedAttempts", Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:border-purple-600 outline-none"
                  >
                    <option value={3}>3 محاولات (حماية قصوى)</option>
                    <option value={5}>5 محاولات (موصى به)</option>
                    <option value={10}>10 محاولات</option>
                  </select>
                </div>

                {/* Rule 4: Sensitive Actions PIN */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">طلب رمز الـ PIN للإجراءات الحساسة</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      طلب رمز أمان الإدارة العليا عند الدخول للبوابة التنفيذية أو تعديل الصلاحيات
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleRule("requirePinForSensitiveActions", !securityData?.requirePinForSensitiveActions)}
                    disabled={actionLoading}
                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
                      securityData?.requirePinForSensitiveActions ? "bg-purple-600 justify-end" : "bg-slate-300 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </div>
            </div>

            {/* Manual IP Block Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>إضافة حظر يدوي لعنوان IP</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                يمكنك حظر أي عنوان مشبوه فورياً لمنعه من الوصول إلى أي رابط أو صفحة في النظام
              </p>

              <form onSubmit={handleManualBlockIp} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder="مثال: 192.168.1.50 أو 45.33.21.9"
                  value={blockIpInput}
                  onChange={(e) => setBlockIpInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-rose-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="سبب الحظر (اختياري: اشتباه في محاولة اختراق)"
                  value={blockReasonInput}
                  onChange={(e) => setBlockReasonInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  حظر العنوان الآن
                </button>
              </form>
            </div>

            {/* Blocked IPs Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    قائمة العناوين المحظورة حالياً ({securityData?.blockedIps?.length || 0})
                  </h3>
                  <p className="text-xs text-slate-500">أي جهاز يحمل هذا العنوان يتم رفض اتصاله بصفحة حظر فورية</p>
                </div>
              </div>

              {(!securityData?.blockedIps || securityData.blockedIps.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  لا توجد عناوين IP محظورة حالياً. جدار الحماية يعمل بشكل طبيعي والنظام نظيف.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">عنوان الـ IP المحظور</th>
                        <th className="p-3">السبب وعدد المحاولات</th>
                        <th className="p-3">تاريخ ووقت الحظر</th>
                        <th className="p-3 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {securityData.blockedIps.map((b) => (
                        <tr key={b.ip} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-rose-700">{b.ip}</td>
                          <td className="p-3 font-sans text-slate-700 font-medium">
                            {b.reason} ({b.attemptsCount || 1} محاولات)
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {new Date(b.blockedAt).toLocaleString("ar-EG")}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleUnblockIp(b.ip)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-emerald-700 font-bold text-[11px] transition cursor-pointer"
                            >
                              فك الحظر
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVE SESSIONS & CONNECTED DEVICES */}
        {activeTab === "sessions" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  الجلسات النشطة والأجهزة المتصلة حالياً ({securityData?.activeSessions?.length || 0})
                </h2>
                <p className="text-xs text-slate-500">
                  مراقبة الجلسات الحية لكافة المسؤولين وإمكانية إنهاء اتصال أي جلسة مشبوهة فوراً
                </p>
              </div>

              <button
                onClick={handleTerminateAllOtherSessions}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل خروج جماعي وطرد كل الجلسات</span>
              </button>
            </div>

            {(!securityData?.activeSessions || securityData.activeSessions.length === 0) ? (
              <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                لا توجد جلسات مسجلة حالياً.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {securityData.activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center shrink-0">
                          {session.device?.includes("هاتف") ? (
                            <Smartphone className="w-5 h-5" />
                          ) : (
                            <Laptop className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{session.name}</span>
                            <span className="text-slate-400 text-xs font-mono">(@{session.username})</span>
                          </div>
                          <div className="mt-1">{getRoleBadge(session.role)}</div>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>نشط الآن</span>
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-200/70 text-xs text-slate-600 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">عنوان الـ IP:</span>
                        <span className="font-bold text-purple-900">{session.ip}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">المتصفح والجهاز:</span>
                        <span className="text-slate-700">{session.browser} / {session.device}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">وقت تسجيل الدخول:</span>
                        <span className="text-slate-500">{new Date(session.loggedInAt).toLocaleString("ar-EG")}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleTerminateSession(session.id)}
                        disabled={actionLoading}
                        className="w-full py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        إنهاء هذه الجلسة وطرد الاتصال
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

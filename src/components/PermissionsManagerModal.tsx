"use client";

import { useState, useEffect } from "react";
import { 
  Crown, 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  User, 
  Calculator, 
  Briefcase, 
  Check, 
  X, 
  AlertCircle, 
  Save, 
  Loader2, 
  RefreshCw, 
  DollarSign, 
  HardHat, 
  Receipt, 
  Landmark, 
  Settings as SettingsIcon, 
  FileText, 
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
  Dices
} from "lucide-react";
import { 
  RolePermissions, 
  DEFAULT_ACCOUNTING_PERMISSIONS, 
  DEFAULT_OPERATIONS_PERMISSIONS 
} from "@/lib/db";

interface PermissionsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function PermissionsManagerModal({
  isOpen,
  onClose,
  onSaved
}: PermissionsManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "accountant" | "operations" | "executive">("overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

  // Accounting State
  const [accountantUsername, setAccountantUsername] = useState("accountant");
  const [accountantPassword, setAccountantPassword] = useState("");
  const [accountingPermissions, setAccountingPermissions] = useState<RolePermissions>({ ...DEFAULT_ACCOUNTING_PERMISSIONS });

  // Operations State
  const [operationsUsername, setOperationsUsername] = useState("operations");
  const [operationsPassword, setOperationsPassword] = useState("");
  const [operationsPermissions, setOperationsPermissions] = useState<RolePermissions>({ ...DEFAULT_OPERATIONS_PERMISSIONS });

  // Executive State
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [executivePin, setExecutivePin] = useState("2026");

  // Show/Hide password toggles
  const [showAccPass, setShowAccPass] = useState(false);
  const [showOpsPass, setShowOpsPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Copy credentials helper
  const handleCopyCredentials = (roleName: string, user: string, pass: string, pin?: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const text = `بيانات الدخول إلى نظام رواد سمارت:\nالرابط: ${origin}/login\nالحساب: ${roleName}\nاسم المستخدم: ${user}\nكلمة المرور: ${pass || "(كلمة المرور الحالية)"}${pin ? `\nرمز PIN الإداري: ${pin}` : ""}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRole(roleName);
      setTimeout(() => setCopiedRole(null), 3000);
    }
  };

  // Generate strong random password
  const generateRandomPassword = (targetRole: "admin" | "accountant" | "operations") => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (targetRole === "admin") {
      setAdminPassword(result);
      setShowAdminPass(true);
    } else if (targetRole === "accountant") {
      setAccountantPassword(result);
      setShowAccPass(true);
    } else if (targetRole === "operations") {
      setOperationsPassword(result);
      setShowOpsPass(true);
    }
  };

  // Load existing permissions & credentials on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setSaveSuccess(null);
    setSaveError(null);

    fetch("/api/auth/permissions")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          if (data.adminUsername) setAdminUsername(data.adminUsername);
          if (data.executivePin) setExecutivePin(data.executivePin);

          if (data.accountantUsername) setAccountantUsername(data.accountantUsername);
          if (data.accountingPermissions) {
            setAccountingPermissions({
              ...DEFAULT_ACCOUNTING_PERMISSIONS,
              ...data.accountingPermissions,
            });
          }

          if (data.operationsUsername) setOperationsUsername(data.operationsUsername);
          if (data.operationsPermissions) {
            setOperationsPermissions({
              ...DEFAULT_OPERATIONS_PERMISSIONS,
              ...data.operationsPermissions,
            });
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load permissions:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAccPerm = (key: keyof RolePermissions) => {
    setAccountingPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleOpsPerm = (key: keyof RolePermissions) => {
    setOperationsPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleResetDefaults = () => {
    if (activeTab === "accountant") {
      setAccountingPermissions({ ...DEFAULT_ACCOUNTING_PERMISSIONS });
    } else if (activeTab === "operations") {
      setOperationsPermissions({ ...DEFAULT_OPERATIONS_PERMISSIONS });
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const payload: any = {
        adminUsername,
        executivePin,
        accountantUsername,
        accountingPermissions,
        operationsUsername,
        operationsPermissions,
      };

      if (adminPassword.trim()) {
        payload.adminPassword = adminPassword.trim();
      }
      if (accountantPassword.trim()) {
        payload.accountantPassword = accountantPassword.trim();
      }
      if (operationsPassword.trim()) {
        payload.operationsPassword = operationsPassword.trim();
      }

      const res = await fetch("/api/auth/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSaveSuccess("تم حفظ وتطبيق الصلاحيات وكلمات المرور بنجاح في النظام!");
        setAccountantPassword("");
        setOperationsPassword("");
        setAdminPassword("");

        // If local user permissions changed, refresh localStorage
        if (typeof window !== "undefined") {
          const activeRole = localStorage.getItem("app_active_role");
          if (activeRole === "accounting") {
            localStorage.setItem("app_user_perms", JSON.stringify(accountingPermissions));
          } else if (activeRole === "operations") {
            localStorage.setItem("app_user_perms", JSON.stringify(operationsPermissions));
          }
        }

        if (onSaved) onSaved();
      } else {
        setSaveError(data.error || "فشل حفظ التعديلات");
      }
    } catch (err: any) {
      console.error(err);
      setSaveError("تعذر الاتصال بالخادم لحفظ الصلاحيات");
    } finally {
      setSaving(false);
    }
  };

  // Permission item component
  const PermRow = ({
    title,
    desc,
    checked,
    onToggle,
    warning,
    icon: IconComponent
  }: {
    title: string;
    desc: string;
    checked: boolean;
    onToggle: () => void;
    warning?: string;
    icon: any;
  }) => (
    <div
      onClick={onToggle}
      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
        checked
          ? "bg-purple-50/70 border-purple-200/90 shadow-2xs"
          : "bg-slate-50/60 border-slate-200/70 opacity-75 hover:opacity-100 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            checked
              ? "bg-purple-600 text-white shadow-2xs"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${checked ? "text-purple-950" : "text-slate-700"}`}>
              {title}
            </span>
            {warning && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-semibold">
                {warning}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{desc}</p>
        </div>
      </div>

      {/* Switch Toggle */}
      <div className="relative shrink-0 pr-1">
        <div
          className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${
            checked ? "bg-purple-600 justify-end" : "bg-slate-300 justify-start"
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-white shadow-xs transition-transform" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-arabic" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  إدارة الصلاحيات وحسابات النظام (الإدارة العليا)
                </h2>
                <span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  صلاحية حصرية
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                تحديد دقيق لصلاحيات المحاسب المالي والموظف الإداري، وتحديث بيانات الدخول ورمز الـ PIN
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100/90 border-b border-slate-200 p-2 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-purple-900 text-white shadow-md shadow-purple-900/30"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>🔑 التحكم في حسابات وكلمات المرور</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("operations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "operations"
                ? "bg-white text-blue-800 shadow-sm border border-blue-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>صلاحيات الموظف الإداري</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("accountant")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "accountant"
                ? "bg-white text-emerald-800 shadow-sm border border-emerald-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>صلاحيات المحاسب المالي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("executive")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "executive"
                ? "bg-white text-purple-900 shadow-sm border border-purple-300"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Crown className="w-4 h-4 text-amber-500" />
            <span>أمان الإدارة العليا ورمز PIN</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="text-xs font-semibold">جارِ تحميل إعدادات الصلاحيات من الخادم...</span>
            </div>
          ) : (
            <>
              {/* Notification Alerts */}
              {saveSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* TAB 0: MASTER PASSWORDS & CREDENTIALS OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Top Explanatory Banner */}
                  <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border border-purple-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-purple-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <KeyRound className="w-5 h-5 text-amber-300" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-purple-950">
                          التحكم المباشر في أسماء المستخدمين وكلمات المرور لكافة الحسابات
                        </h3>
                        <p className="text-[11px] text-purple-800/80 mt-0.5">
                          تغيير فوري لبيانات الدخول، توليد كلمات مرور عشوائية قوية، ونسخ بيانات الاعتماد لإرسالها للموظف
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveAll}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-700/20 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جارِ الحفظ...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>حفظ التعديلات فوراً</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 3 Main Role Accounts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Operations Staff */}
                    <div className="bg-white rounded-2xl border-2 border-blue-200/90 hover:border-blue-400 transition-all p-4.5 shadow-xs flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-slate-900">الموظف الإداري</h4>
                              <span className="text-[10px] text-blue-700 font-semibold">إدارة العمليات والمشاريع</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            نشط
                          </span>
                        </div>

                        <div className="space-y-3 pt-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              اسم المستخدم (Username):
                            </label>
                            <div className="relative flex items-center">
                              <User className="w-3.5 h-3.5 absolute right-3 text-slate-400" />
                              <input
                                type="text"
                                value={operationsUsername}
                                onChange={(e) => setOperationsUsername(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:bg-white outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-semibold text-slate-700">
                                كلمة المرور الجديدة:
                              </label>
                              <button
                                type="button"
                                onClick={() => generateRandomPassword("operations")}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                                title="توليد كلمة سر عشوائية قوية"
                              >
                                <Dices className="w-3 h-3" />
                                <span>توليد كلمة سر 🎲</span>
                              </button>
                            </div>
                            <div className="relative flex items-center">
                              <Lock className="w-3.5 h-3.5 absolute right-3 text-slate-400" />
                              <input
                                type={showOpsPass ? "text" : "password"}
                                value={operationsPassword}
                                onChange={(e) => setOperationsPassword(e.target.value)}
                                placeholder="•••••••• (الافتراضي: ops2026)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-8 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:bg-white outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowOpsPass(!showOpsPass)}
                                className="absolute left-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                {showOpsPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            💼 <strong>الصلاحيات:</strong> المشاريع والمراحل الميدانية، حضور وعمال اليومية، عروض الأسعار، والعقود.
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials("الموظف الإداري", operationsUsername, operationsPassword)}
                          className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
                        >
                          {copiedRole === "الموظف الإداري" ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">تم نسخ البيانات!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-blue-600" />
                              <span>نسخ بيانات الدخول</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 2. Financial Accountant */}
                    <div className="bg-white rounded-2xl border-2 border-emerald-200/90 hover:border-emerald-400 transition-all p-4.5 shadow-xs flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                              <Calculator className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-slate-900">المحاسب المالي</h4>
                              <span className="text-[10px] text-emerald-700 font-semibold">الإدارة المالية والضريبية</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            نشط
                          </span>
                        </div>

                        <div className="space-y-3 pt-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              اسم المستخدم (Username):
                            </label>
                            <div className="relative flex items-center">
                              <User className="w-3.5 h-3.5 absolute right-3 text-slate-400" />
                              <input
                                type="text"
                                value={accountantUsername}
                                onChange={(e) => setAccountantUsername(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-emerald-500 focus:bg-white outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-semibold text-slate-700">
                                كلمة المرور الجديدة:
                              </label>
                              <button
                                type="button"
                                onClick={() => generateRandomPassword("accountant")}
                                className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                                title="توليد كلمة سر عشوائية قوية"
                              >
                                <Dices className="w-3 h-3" />
                                <span>توليد كلمة سر 🎲</span>
                              </button>
                            </div>
                            <div className="relative flex items-center">
                              <Lock className="w-3.5 h-3.5 absolute right-3 text-slate-400" />
                              <input
                                type={showAccPass ? "text" : "password"}
                                value={accountantPassword}
                                onChange={(e) => setAccountantPassword(e.target.value)}
                                placeholder="•••••••• (الافتراضي: acc2026)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-8 py-1.5 text-xs text-slate-900 font-semibold focus:border-emerald-500 focus:bg-white outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowAccPass(!showAccPass)}
                                className="absolute left-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                {showAccPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            📊 <strong>الصلاحيات:</strong> سندات القبض والصرف، فواتير المشتريات، الإقرارات الضريبية، ومسير الرواتب.
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials("المحاسب المالي", accountantUsername, accountantPassword)}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200"
                        >
                          {copiedRole === "المحاسب المالي" ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">تم نسخ البيانات!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-emerald-600" />
                              <span>نسخ بيانات الدخول</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 3. Executive Super Admin */}
                    <div className="bg-white rounded-2xl border-2 border-purple-200/90 hover:border-purple-400 transition-all p-4.5 shadow-xs flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xs">
                              <Crown className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-slate-900">الإدارة العليا</h4>
                              <span className="text-[10px] text-purple-700 font-semibold">المدير العام والتنفيذي</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                            صلاحية عليا
                          </span>
                        </div>

                        <div className="space-y-3 pt-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              اسم المستخدم (Username):
                            </label>
                            <div className="relative flex items-center">
                              <User className="w-3.5 h-3.5 absolute right-3 text-slate-400" />
                              <input
                                type="text"
                                value={adminUsername}
                                onChange={(e) => setAdminUsername(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-purple-500 focus:bg-white outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-semibold text-slate-700">
                                كلمة المرور الجديدة:
                              </label>
                              <button
                                type="button"
                                onClick={() => generateRandomPassword("admin")}
                                className="text-[10px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer"
                                title="توليد كلمة سر عشوائية قوية"
                              >
                                <Dices className="w-3 h-3" />
                                <span>توليد كلمة سر 🎲</span>
                              </button>
                            </div>
                            <div className="relative flex items-center">
                              <Lock className="w-3.5 h-3.5 absolute right-3 text-slate-400" />
                              <input
                                type={showAdminPass ? "text" : "password"}
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                placeholder="•••••••• (الافتراضي: rowad2026)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-8 py-1.5 text-xs text-slate-900 font-semibold focus:border-purple-500 focus:bg-white outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowAdminPass(!showAdminPass)}
                                className="absolute left-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                {showAdminPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              رمز التحقق الإداري (PIN):
                            </label>
                            <div className="relative flex items-center">
                              <KeyRound className="w-3.5 h-3.5 absolute right-3 text-slate-400" />
                              <input
                                type="text"
                                maxLength={6}
                                value={executivePin}
                                onChange={(e) => setExecutivePin(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs font-mono font-bold text-purple-950 focus:border-purple-500 focus:bg-white outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials("الإدارة العليا", adminUsername, adminPassword, executivePin)}
                          className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-purple-200"
                        >
                          {copiedRole === "الإدارة العليا" ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">تم نسخ البيانات!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-purple-600" />
                              <span>نسخ بيانات الدخول</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>ملاحظة هامة:</strong> بعد تغيير أي اسم مستخدم أو كلمة مرور، اضغط على زر <strong>"حفظ التعديلات فوراً"</strong> لتطبيقها فورياً على النظام وقاعدة البيانات.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 1: FINANCIAL ACCOUNTANT */}
              {activeTab === "accountant" && (
                <div className="space-y-5">
                  {/* Account Credentials Box */}
                  <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                        <Calculator className="w-4 h-4 text-emerald-600" />
                        <span>بيانات تسجيل دخول المحاسب المالي</span>
                      </div>
                      <span className="text-[11px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
                        يستخدمها في صفحة الدخول الموحدة
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          اسم مستخدم المحاسب
                        </label>
                        <div className="relative flex items-center">
                          <User className="w-4 h-4 absolute right-3 text-slate-400" />
                          <input
                            type="text"
                            value={accountantUsername}
                            onChange={(e) => setAccountantUsername(e.target.value)}
                            placeholder="accountant"
                            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية)
                        </label>
                        <div className="relative flex items-center">
                          <Lock className="w-4 h-4 absolute right-3 text-slate-400" />
                          <input
                            type={showAccPass ? "text" : "password"}
                            value={accountantPassword}
                            onChange={(e) => setAccountantPassword(e.target.value)}
                            placeholder="•••••••• (الافتراضي: acc2026)"
                            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-9 py-2 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAccPass(!showAccPass)}
                            className="absolute left-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showAccPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Permissions List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">
                          صلاحيات النظام الممنوحة للمحاسب المالي
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          حدد الإجراءات المسموح للمحاسب المالي القيام بها
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 flex items-center gap-1 transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>استعادة التوصيات الافتراضية</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <PermRow
                        title="إصدار الفواتير الضريبية (UAE / KSA)"
                        desc="إصدار واعتماد الفواتير الضريبية المتوافقة مع الـ QR Code ورموز الضرائب"
                        checked={accountingPermissions.canIssueTaxInvoice}
                        onToggle={() => handleToggleAccPerm("canIssueTaxInvoice")}
                        icon={Landmark}
                      />

                      <PermRow
                        title="إصدار الفواتير العادية"
                        desc="إصدار فواتير بيع وخدمات مبسطة وعادية بدون ضريبة"
                        checked={accountingPermissions.canIssueStandardInvoice}
                        onToggle={() => handleToggleAccPerm("canIssueStandardInvoice")}
                        icon={Receipt}
                      />

                      <PermRow
                        title="إدارة سندات الصرف والمصروفات"
                        desc="تسجيل المصروفات وإرفاق الفواتير ومتابعة مراكز التكلفة"
                        checked={accountingPermissions.canManageExpenses}
                        onToggle={() => handleToggleAccPerm("canManageExpenses")}
                        icon={DollarSign}
                      />

                      <PermRow
                        title="إدارة سندات القبض والدفعات"
                        desc="تسجيل دفعات العملاء وسندات القبض البنكية والنقدية"
                        checked={accountingPermissions.canManageReceipts}
                        onToggle={() => handleToggleAccPerm("canManageReceipts")}
                        icon={Receipt}
                      />

                      <PermRow
                        title="عرض التكاليف وهوامش الربح الداخلية"
                        desc="الاطلاع على تكلفة شراء المواد وهوامش ربح الشركة وسند التكاليف"
                        checked={accountingPermissions.canViewCostAndProfit}
                        onToggle={() => handleToggleAccPerm("canViewCostAndProfit")}
                        warning="سري وحساس"
                        icon={ShieldCheck}
                      />

                      <PermRow
                        title="الاطلاع على الإقرارات والتقارير الضريبية"
                        desc="عرض كشف ضريبة القيمة المضافة ومسودات إقرارات FTA و ZATCA"
                        checked={accountingPermissions.canViewVatReports}
                        onToggle={() => handleToggleAccPerm("canViewVatReports")}
                        icon={FileText}
                      />

                      <PermRow
                        title="إدارة كشف الرواتب والمكافآت والخصومات"
                        desc="إصدار مسير الرواتب الشهري، حساب الإضافي، وإضافة البونص والخصم"
                        checked={accountingPermissions.canManagePayroll}
                        onToggle={() => handleToggleAccPerm("canManagePayroll")}
                        icon={Calculator}
                      />

                      <PermRow
                        title="تسجيل حضور ويوميات عمال وفنيي اليومية"
                        desc="تسجيل ساعات عمل وإضافي الفنيين والعمال في المواقع الميدانية"
                        checked={accountingPermissions.canManageDailyWorkers}
                        onToggle={() => handleToggleAccPerm("canManageDailyWorkers")}
                        icon={HardHat}
                      />

                      <PermRow
                        title="إنشاء وتعديل عروض الأسعار"
                        desc="إعداد عروض الأسعار والبنود وإرسالها للعملاء"
                        checked={accountingPermissions.canCreateQuotation}
                        onToggle={() => handleToggleAccPerm("canCreateQuotation")}
                        icon={FileText}
                      />

                      <PermRow
                        title="حذف عروض الأسعار"
                        desc="السماح بحذف عروض الأسعار نهائياً من قاعدة البيانات"
                        checked={accountingPermissions.canDeleteQuotation}
                        onToggle={() => handleToggleAccPerm("canDeleteQuotation")}
                        warning="غير موصى به"
                        icon={Trash2}
                      />

                      <PermRow
                        title="إدارة المشاريع الميدانية ومراحلها"
                        desc="تحديث مراحل التنفيذ الميدانية وتفاصيل استلام المشاريع"
                        checked={accountingPermissions.canManageProjects}
                        onToggle={() => handleToggleAccPerm("canManageProjects")}
                        icon={Briefcase}
                      />

                      <PermRow
                        title="تعديل إعدادات النظام والشعار والضرائب"
                        desc="تعديل بيانات الشركة والشعار والختم والأرقام الضريبية"
                        checked={accountingPermissions.canEditSettings}
                        onToggle={() => handleToggleAccPerm("canEditSettings")}
                        warning="إدارة عليا فقط عادةً"
                        icon={SettingsIcon}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OPERATIONS EMPLOYEE */}
              {activeTab === "operations" && (
                <div className="space-y-5">
                  {/* Operations Credentials Box */}
                  <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        <span>بيانات تسجيل دخول الموظف الإداري (إدارة العمليات)</span>
                      </div>
                      <span className="text-[11px] text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-lg">
                        يستخدمها في صفحة الدخول الموحدة
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          اسم مستخدم الموظف الإداري
                        </label>
                        <div className="relative flex items-center">
                          <User className="w-4 h-4 absolute right-3 text-slate-400" />
                          <input
                            type="text"
                            value={operationsUsername}
                            onChange={(e) => setOperationsUsername(e.target.value)}
                            placeholder="operations"
                            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية)
                        </label>
                        <div className="relative flex items-center">
                          <Lock className="w-4 h-4 absolute right-3 text-slate-400" />
                          <input
                            type={showOpsPass ? "text" : "password"}
                            value={operationsPassword}
                            onChange={(e) => setOperationsPassword(e.target.value)}
                            placeholder="•••••••• (الافتراضي: ops2026)"
                            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-9 py-2 text-xs text-slate-800 font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOpsPass(!showOpsPass)}
                            className="absolute left-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showOpsPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Permissions List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">
                          صلاحيات النظام الممنوحة للموظف الإداري
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          تحديد دقيق لما يراه الموظف الإداري (حجب التكاليف وهوامش الأرباح لحماية خصوصية الشركة)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 flex items-center gap-1 transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>استعادة التوصيات الافتراضية</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <PermRow
                        title="إدارة المشاريع الميدانية ومراحلها"
                        desc="تحديث مراحل العمل الميداني وإسناد المهام للمشاريع"
                        checked={operationsPermissions.canManageProjects}
                        onToggle={() => handleToggleOpsPerm("canManageProjects")}
                        icon={Briefcase}
                      />

                      <PermRow
                        title="تسجيل حضور ويوميات عمال وفنيي اليومية"
                        desc="تسجيل حضور وإضافي الفنيين والعمال في مواقع العمل والورشة"
                        checked={operationsPermissions.canManageDailyWorkers}
                        onToggle={() => handleToggleOpsPerm("canManageDailyWorkers")}
                        icon={HardHat}
                      />

                      <PermRow
                        title="إنشاء وتعديل عروض الأسعار"
                        desc="إعداد عروض الأسعار والبنود للعملاء وطباعتها"
                        checked={operationsPermissions.canCreateQuotation}
                        onToggle={() => handleToggleOpsPerm("canCreateQuotation")}
                        icon={FileText}
                      />

                      <PermRow
                        title="إصدار الفواتير العادية"
                        desc="إصدار فواتير بيع خدمات ومواد عادية"
                        checked={operationsPermissions.canIssueStandardInvoice}
                        onToggle={() => handleToggleOpsPerm("canIssueStandardInvoice")}
                        icon={Receipt}
                      />

                      <PermRow
                        title="عرض التكاليف وهوامش الربح الداخلية"
                        desc="الاطلاع على تكلفة شراء المواد وهامش ربح الشركة وسند التكلفة"
                        checked={operationsPermissions.canViewCostAndProfit}
                        onToggle={() => handleToggleOpsPerm("canViewCostAndProfit")}
                        warning={operationsPermissions.canViewCostAndProfit ? "مفعل (يرى الأرباح)" : "محجوب (سري)"}
                        icon={ShieldCheck}
                      />

                      <PermRow
                        title="إصدار الفواتير الضريبية (UAE / KSA)"
                        desc="اعتماد الفواتير الضريبية ذات الـ QR Code الرسمي"
                        checked={operationsPermissions.canIssueTaxInvoice}
                        onToggle={() => handleToggleOpsPerm("canIssueTaxInvoice")}
                        icon={Landmark}
                      />

                      <PermRow
                        title="إدارة المصروفات وسندات الصرف"
                        desc="تسجيل سندات الصرف والمصروفات النقدية"
                        checked={operationsPermissions.canManageExpenses}
                        onToggle={() => handleToggleOpsPerm("canManageExpenses")}
                        icon={DollarSign}
                      />

                      <PermRow
                        title="إدارة سندات القبض والدفعات"
                        desc="استلام دفعات العملاء وإصدار سندات القبض"
                        checked={operationsPermissions.canManageReceipts}
                        onToggle={() => handleToggleOpsPerm("canManageReceipts")}
                        icon={Receipt}
                      />

                      <PermRow
                        title="إدارة كشف الرواتب والمكافآت والخصومات"
                        desc="الاطلاع على رواتب الموظفين وإدارتها"
                        checked={operationsPermissions.canManagePayroll}
                        onToggle={() => handleToggleOpsPerm("canManagePayroll")}
                        icon={Calculator}
                      />

                      <PermRow
                        title="الاطلاع على الإقرارات والتقارير الضريبية"
                        desc="عرض تقارير الإقرار الضريبي وقوائم الدخل"
                        checked={operationsPermissions.canViewVatReports}
                        onToggle={() => handleToggleOpsPerm("canViewVatReports")}
                        icon={FileText}
                      />

                      <PermRow
                        title="حذف عروض الأسعار"
                        desc="حذف عروض الأسعار من النظام نهائياً"
                        checked={operationsPermissions.canDeleteQuotation}
                        onToggle={() => handleToggleOpsPerm("canDeleteQuotation")}
                        warning="غير موصى به"
                        icon={Trash2}
                      />

                      <PermRow
                        title="تعديل إعدادات النظام والشركة"
                        desc="تعديل الشعار وإعدادات الضرائب والبيانات الأساسية"
                        checked={operationsPermissions.canEditSettings}
                        onToggle={() => handleToggleOpsPerm("canEditSettings")}
                        icon={SettingsIcon}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: EXECUTIVE & PIN SECURITY */}
              {activeTab === "executive" && (
                <div className="space-y-5">
                  <div className="bg-gradient-to-br from-purple-50 via-amber-50/40 to-purple-50 border border-purple-200/90 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-700 text-amber-300 flex items-center justify-center shrink-0 shadow-sm">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-purple-950">
                          حماية وأمان حساب الإدارة العليا والتنفيذية
                        </h3>
                        <p className="text-[11px] text-purple-800/80">
                          بيانات الدخول الحصرية للمدير العام والملاك عبر بوابة الإدارة العليا (`/executive/login`)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          اسم مستخدم الإدارة العليا
                        </label>
                        <div className="relative flex items-center">
                          <User className="w-4 h-4 absolute right-3 text-slate-400" />
                          <input
                            type="text"
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                            placeholder="admin"
                            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 font-semibold focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          كلمة المرور الجديدة (اتركها فارغة للإبقاء)
                        </label>
                        <div className="relative flex items-center">
                          <Lock className="w-4 h-4 absolute right-3 text-slate-400" />
                          <input
                            type={showAdminPass ? "text" : "password"}
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="•••••••• (الافتراضي: rowad2026)"
                            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-9 py-2 text-xs text-slate-800 font-semibold focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPass(!showAdminPass)}
                            className="absolute left-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showAdminPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          رمز التحقق السري للإدارة (PIN Code)
                        </label>
                        <div className="relative flex items-center">
                          <KeyRound className="w-4 h-4 absolute right-3 text-amber-500" />
                          <input
                            type="text"
                            maxLength={8}
                            value={executivePin}
                            onChange={(e) => setExecutivePin(e.target.value)}
                            placeholder="2026"
                            className="w-full bg-white border border-amber-300 rounded-xl pr-9 pl-3 py-2 text-xs text-amber-950 font-mono font-bold tracking-widest focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-center"
                          />
                        </div>
                        <span className="text-[10px] text-amber-800 mt-1 block">
                          مطلوب للدخول من بوابة الإدارة العليا الحصرية
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Executive privileges summary card */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>امتيازات الإدارة العليا الكاملة:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed pr-2">
                      <li>صلاحية كاملة (Full Root Access) على جميع العقود والمشاريع والفواتير ودفتر اليومية.</li>
                      <li>التحكم الحصري في إظهار أو إخفاء التكاليف وأرباح الشركة عن الموظفين.</li>
                      <li>الاعتماد والختم الرسمي والتوقيع الرقمي للمدير التنفيذي والمحاسب.</li>
                      <li>تعديل بيانات الحسابات المصرفية والأرقام الضريبية وشعار المؤسسة في أي وقت.</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              إلغاء وإغلاق
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving || loading}
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-bold text-xs shadow-md shadow-purple-700/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارِ الحفظ والتطبيق...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ الصلاحيات وبيانات الدخول</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { 
  BarChart3, 
  Calendar, 
  Printer, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Clock, 
  Building2, 
  FileText, 
  Receipt as ReceiptIcon,
  CheckCircle2,
  FileSpreadsheet,
  PenTool,
  Stamp,
  Trash2,
  Check,
  RefreshCw,
  X,
  ShieldCheck,
  MapPin,
  Wrench
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { Quotation, Contract, Receipt, Expense, Employee, AttendanceRecord, PayrollRecord, Project, Settings } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";

interface ReportsModuleProps {
  quotations: Quotation[];
  contracts: Contract[];
  receipts: Receipt[];
  expenses: Expense[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  payroll: PayrollRecord[];
  projects: Project[];
  settings?: Settings | null;
}

export default function ReportsModule({
  quotations,
  contracts,
  receipts,
  expenses,
  employees,
  attendance,
  payroll,
  projects,
  settings,
}: ReportsModuleProps) {
  const { language, isRtl } = useLanguage();
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(todayStr.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(todayStr.slice(0, 4));

  // Digital Signatures & Stamp States
  const [accountantSignature, setAccountantSignature] = useState<string>("");
  const [accountantName, setAccountantName] = useState<string>("المحاسب المالي المعتمد");
  const [executiveSignature, setExecutiveSignature] = useState<string>("");
  const [executiveName, setExecutiveName] = useState<string>("المدير التنفيذي / الإدارة العامة");
  const [hasStamp, setHasStamp] = useState<boolean>(true);
  const [signingRole, setSigningRole] = useState<"accountant" | "executive" | null>(null);
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  // Load saved signatures from localStorage
  useEffect(() => {
    try {
      const savedAccSig = localStorage.getItem("ruwad_report_accountant_sig");
      const savedExecSig = localStorage.getItem("ruwad_report_executive_sig");
      const savedAccName = localStorage.getItem("ruwad_report_accountant_name");
      const savedExecName = localStorage.getItem("ruwad_report_executive_name");
      const savedStamp = localStorage.getItem("ruwad_report_stamp");
      if (savedAccSig) setAccountantSignature(savedAccSig);
      if (savedExecSig) setExecutiveSignature(savedExecSig);
      if (savedAccName) setAccountantName(savedAccName.replace(/دبي/g, "").trim());
      if (savedExecName) setExecutiveName(savedExecName.replace(/دبي/g, "").trim());
      if (savedStamp !== null) setHasStamp(savedStamp === "true");
    } catch (e) {}
  }, []);

  const handleSaveSignature = () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return;
    const dataUrl = sigCanvasRef.current.toDataURL("image/png");
    if (signingRole === "accountant") {
      setAccountantSignature(dataUrl);
      try {
        localStorage.setItem("ruwad_report_accountant_sig", dataUrl);
        localStorage.setItem("ruwad_report_accountant_name", accountantName);
      } catch (e) {}
    } else if (signingRole === "executive") {
      setExecutiveSignature(dataUrl);
      try {
        localStorage.setItem("ruwad_report_executive_sig", dataUrl);
        localStorage.setItem("ruwad_report_executive_name", executiveName);
      } catch (e) {}
    }
    setSigningRole(null);
  };

  const handleClearSignature = (role: "accountant" | "executive") => {
    if (role === "accountant") {
      setAccountantSignature("");
      try { localStorage.removeItem("ruwad_report_accountant_sig"); } catch (e) {}
    } else {
      setExecutiveSignature("");
      try { localStorage.removeItem("ruwad_report_executive_sig"); } catch (e) {}
    }
  };

  // 1. Daily Report Calculations
  const dailyReceipts = receipts.filter(r => r.date === selectedDate || r.createdAt?.startsWith(selectedDate));
  const dailyReceiptsTotal = dailyReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const dailyExpenses = expenses.filter(e => e.date === selectedDate || e.createdAt?.startsWith(selectedDate));
  const dailyExpensesTotal = dailyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const dailyNet = dailyReceiptsTotal - dailyExpensesTotal;

  const dailyAttendanceList = attendance.filter(a => a.date === selectedDate);
  const dailyPresent = dailyAttendanceList.filter(a => a.status === "present").length;
  const dailyOvertimeTotal = dailyAttendanceList.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);

  const dailyQuotes = quotations.filter(q => q.date === selectedDate || q.createdAt?.startsWith(selectedDate));
  const dailyContracts = contracts.filter(c => c.date === selectedDate || c.createdAt?.startsWith(selectedDate));

  // 2. Monthly Report Calculations
  const monthlyReceipts = receipts.filter(r => (r.date && r.date.startsWith(selectedMonth)) || r.createdAt?.startsWith(selectedMonth));
  const monthlyReceiptsTotal = monthlyReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const monthlyExpenses = expenses.filter(e => (e.date && e.date.startsWith(selectedMonth)) || e.createdAt?.startsWith(selectedMonth));
  const monthlyExpensesTotal = monthlyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const monthlyPayroll = payroll.filter(p => p.month === selectedMonth);
  const monthlyPayrollTotal = monthlyPayroll.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
  const monthlyBonusesTotal = monthlyPayroll.reduce((sum, p) => sum + (Number(p.bonus) || 0), 0);

  const totalMonthlyOutflow = monthlyExpensesTotal + monthlyPayrollTotal;
  const monthlyNetProfit = monthlyReceiptsTotal - totalMonthlyOutflow;
  const monthlyVatEst = (monthlyReceiptsTotal * 0.05) / 1.05;

  // 3. Annual / Yearly Report Calculations
  const yearlyReceipts = receipts.filter(r => (r.date && r.date.startsWith(selectedYear)) || r.createdAt?.startsWith(selectedYear));
  const yearlyReceiptsTotal = yearlyReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const yearlyExpenses = expenses.filter(e => (e.date && e.date.startsWith(selectedYear)) || e.createdAt?.startsWith(selectedYear));
  const yearlyExpensesTotal = yearlyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const yearlyPayroll = payroll.filter(p => p.month && p.month.startsWith(selectedYear));
  const yearlyPayrollTotal = yearlyPayroll.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
  const yearlyBonusesTotal = yearlyPayroll.reduce((sum, p) => sum + (Number(p.bonus) || 0), 0);

  const totalYearlyOutflow = yearlyExpensesTotal + yearlyPayrollTotal;
  const yearlyNetProfit = yearlyReceiptsTotal - totalYearlyOutflow;
  const yearlyVatEst = (yearlyReceiptsTotal * 0.05) / 1.05;

  const yearlyQuotes = quotations.filter(q => (q.date && q.date.startsWith(selectedYear)) || q.createdAt?.startsWith(selectedYear));
  const yearlyContracts = contracts.filter(c => (c.date && c.date.startsWith(selectedYear)) || c.createdAt?.startsWith(selectedYear));
  const yearlyProjects = projects.filter(p => (p.startDate && p.startDate.startsWith(selectedYear)) || p.createdAt?.startsWith(selectedYear));
  const yearlyCompletedProjects = yearlyProjects.filter(p => p.status === "completed").length;

  const MONTH_NAMES_AR = [
    "يناير (01)", "فبراير (02)", "مارس (03)", "أبريل (04)",
    "مايو (05)", "يونيو (06)", "يوليو (07)", "أغسطس (08)",
    "سبتمبر (09)", "أكتوبر (10)", "نوفمبر (11)", "ديسمبر (12)"
  ];

  const yearlyMonthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const mStr = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
    const mRecs = receipts.filter(r => (r.date && r.date.startsWith(mStr)) || r.createdAt?.startsWith(mStr));
    const mRecTotal = mRecs.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const mExps = expenses.filter(e => (e.date && e.date.startsWith(mStr)) || e.createdAt?.startsWith(mStr));
    const mExpTotal = mExps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const mPay = payroll.filter(p => p.month === mStr);
    const mPayTotal = mPay.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);

    const mOutflow = mExpTotal + mPayTotal;
    const mNet = mRecTotal - mOutflow;

    return {
      monthKey: mStr,
      nameAr: MONTH_NAMES_AR[i],
      receipts: mRecTotal,
      expenses: mExpTotal,
      payroll: mPayTotal,
      outflow: mOutflow,
      net: mNet,
      margin: mRecTotal > 0 ? Math.round((mNet / mRecTotal) * 100) : 0,
    };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Report Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print">
        {/* Report Type Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setReportType("daily")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              reportType === "daily"
                ? "bg-white text-purple-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span>{language === "ar" ? "تقرير يومي" : "Daily Report"}</span>
          </button>

          <button
            onClick={() => setReportType("weekly")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              reportType === "weekly"
                ? "bg-white text-blue-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{language === "ar" ? "تقرير أسبوعي" : "Weekly Report"}</span>
          </button>

          <button
            onClick={() => setReportType("monthly")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              reportType === "monthly"
                ? "bg-white text-emerald-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === "ar" ? "تقرير شهري شامل" : "Monthly Executive Report"}</span>
          </button>

          <button
            onClick={() => setReportType("yearly")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              reportType === "yearly"
                ? "bg-white text-indigo-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>{language === "ar" ? "تقرير سنوي شامل" : "Annual Financial Report"}</span>
          </button>
        </div>

        {/* Date / Month Picker & Print Button */}
        <div className="flex items-center gap-3">
          {reportType === "daily" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-purple-600"
            />
          )}

          {reportType === "monthly" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-purple-600"
            />
          )}

          {reportType === "yearly" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 font-arabic">{language === "ar" ? "السنة المالية:" : "Fiscal Year:"}</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-600 cursor-pointer"
              >
                {["2024", "2025", "2026", "2027", "2028"].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === "ar" ? "طباعة التقرير / PDF" : "Print Report / PDF"}</span>
          </button>
        </div>
      </div>

      {/* REPORT PRINTABLE SHEET CONTAINER */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 print:p-0 print:border-none print:shadow-none">
        
        {/* Report Official Header */}
        <div className="border-b-2 border-purple-900 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={settings?.logoBase64 || "/logo.png"} 
                alt="Logo" 
                className="max-h-full max-w-full object-contain" 
              />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 font-arabic">
                {settings?.companyName || "مؤسسة رواد سمارت للأجهزة الذكية"}
              </h2>
              <p className="text-xs text-slate-500 font-arabic">
                RUAAD SMART MACHINE TRADING LLC
              </p>
              <p className="text-[11px] text-purple-700 font-mono mt-0.5">
                {language === "ar" ? "الرقم الضريبي:" : "Tax No:"} {settings?.taxNumber || "100234567800003"}
              </p>
            </div>
          </div>

          <div className="text-right" dir="ltr">
            <div className="inline-block px-3 py-1 bg-purple-50 text-purple-800 font-bold text-xs rounded-lg border border-purple-200 font-mono mb-1">
              {reportType === "daily" ? `DAILY REPORT: ${selectedDate}` :
               reportType === "weekly" ? `WEEKLY REPORT: ${selectedDate}` :
               reportType === "monthly" ? `MONTHLY REPORT: ${selectedMonth}` :
               `ANNUAL FINANCIAL REPORT: ${selectedYear}`}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Generated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* 1. DAILY REPORT BODY */}
        {reportType === "daily" && (
          <div className="space-y-6">
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span>{language === "ar" ? `التقرير اليومي المفصل لتاريخ: ${selectedDate}` : `Daily Operations Report: ${selectedDate}`}</span>
              </h3>
              <span className="text-xs font-mono font-bold text-purple-700">
                {language === "ar" ? "ملخص الحركة الميدانية والمالية" : "Cashflow & Labor"}
              </span>
            </div>

            {/* Daily KPI summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200">
                <span className="text-xs text-slate-500 block">{language === "ar" ? "إيرادات اليوم (مقبوضات)" : "Today's Inflow"}</span>
                <span className="font-mono font-bold text-xl text-emerald-700">
                  {dailyReceiptsTotal.toLocaleString()} AED
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  {dailyReceipts.length} {language === "ar" ? "سندات قبض اليوم" : "receipts"}
                </span>
              </div>

              <div className="p-4 bg-rose-50/40 rounded-2xl border border-rose-200">
                <span className="text-xs text-slate-500 block">{language === "ar" ? "مصروفات اليوم (نفقات)" : "Today's Outflow"}</span>
                <span className="font-mono font-bold text-xl text-rose-700">
                  {dailyExpensesTotal.toLocaleString()} AED
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  {dailyExpenses.length} {language === "ar" ? "سندات صرف ومشتريات" : "expenses"}
                </span>
              </div>

              <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200">
                <span className="text-xs text-slate-500 block">{language === "ar" ? "صافي السيولة اليومية" : "Daily Net Balance"}</span>
                <span className={`font-mono font-bold text-xl ${dailyNet >= 0 ? "text-purple-900" : "text-amber-700"}`}>
                  {dailyNet.toLocaleString()} AED
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  {dailyPresent} {language === "ar" ? "فني وموظف حاضر اليوم" : "staff present"}
                </span>
              </div>
            </div>

            {/* Daily Attendance and Tasks Table */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{language === "ar" ? "حضور الموظفين والمهام الميدانية المنفذة اليوم:" : "Today's Staff Work & Tasks:"}</span>
              </h4>
              <table className="w-full text-left border-collapse text-xs border border-slate-200" dir={isRtl ? "rtl" : "ltr"}>
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-2.5">{language === "ar" ? "الموظف ونظام العمل" : "Employee & Type"}</th>
                    <th className="p-2.5 text-center">{language === "ar" ? "الحالة" : "Status"}</th>
                    <th className="p-2.5 text-center">{language === "ar" ? "ساعات العمل" : "Hours"}</th>
                    <th className="p-2.5 text-center">{language === "ar" ? "إضافي" : "Overtime"}</th>
                    <th className="p-2.5">{language === "ar" ? "الموقع الميداني / المشروع" : "Site Location / Project"}</th>
                    <th className="p-2.5">{language === "ar" ? "الدور والتخصص الميداني اليوم" : "Role & Tasks Today"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyAttendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        {language === "ar" ? "لم يتم تسجيل يوميات أو حضور لهذا اليوم." : "No attendance recorded for this date."}
                      </td>
                    </tr>
                  ) : (
                    dailyAttendanceList.map(a => {
                      const isDaily = a.employmentType === "daily" || (a.dailyWage && a.dailyWage > 0);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{a.employeeName}</div>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              isDaily
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            }`}>
                              {isDaily ? "👷‍♂️ باليومية" : "👔 شهري"}
                            </span>
                            {isDaily && a.dailyWage && a.dailyWage > 0 && (
                              <span className="text-[10px] font-mono font-bold text-emerald-700 mr-1.5 ml-1.5">
                                ({a.dailyWage} AED)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              a.status === "present" ? "bg-emerald-50 text-emerald-700" :
                              a.status === "half_day" ? "bg-amber-50 text-amber-700" :
                              a.status === "leave" ? "bg-blue-50 text-blue-700" :
                              "bg-rose-50 text-rose-700"
                            }`}>
                              {a.status === "present" ? (language === "ar" ? "حاضر" : "Present") :
                               a.status === "half_day" ? (language === "ar" ? "نصف يوم" : "Half Day") :
                               a.status === "leave" ? (language === "ar" ? "إجازة" : "Leave") :
                               (language === "ar" ? "غائب" : "Absent")}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono">{a.hoursWorked} س</td>
                          <td className="p-2.5 text-center font-mono font-bold text-amber-600">
                            {a.overtimeHours > 0 ? `+${a.overtimeHours} س` : "-"}
                          </td>
                          <td className="p-2.5 text-slate-700 font-medium">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="truncate max-w-[220px]" title={a.siteLocation || a.projectName}>
                                {a.siteLocation || a.projectName || (language === "ar" ? "الورشة المركزية" : "Main Workshop")}
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {a.roleToday ? (
                              <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md text-[10px] inline-flex items-center gap-1 border border-teal-100 mb-0.5">
                                <Wrench className="w-3 h-3 text-teal-600" />
                                <span>{a.roleToday}</span>
                              </span>
                            ) : null}
                            <div className="text-[11px] text-slate-500 line-clamp-1">{a.taskDescription || "-"}</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Daily Expenses and Receipts Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Daily Receipts */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <span className="font-bold text-xs text-emerald-800 block">
                  {language === "ar" ? "سندات القبض المسجلة اليوم" : "Today's Receipts"}
                </span>
                {dailyReceipts.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3 text-center">{language === "ar" ? "لا توجد مقبوضات مسجلة اليوم" : "No receipts today"}</p>
                ) : (
                  dailyReceipts.map(r => (
                    <div key={r.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
                      <div>
                        <span className="font-bold text-slate-800">{r.clientName}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{r.receiptNo}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">{r.amount.toLocaleString()} AED</span>
                    </div>
                  ))
                )}
              </div>

              {/* Daily Expenses */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <span className="font-bold text-xs text-rose-800 block">
                  {language === "ar" ? "سندات الصرف المسجلة اليوم" : "Today's Expenses"}
                </span>
                {dailyExpenses.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3 text-center">{language === "ar" ? "لا توجد مصروفات مسجلة اليوم" : "No expenses today"}</p>
                ) : (
                  dailyExpenses.map(e => (
                    <div key={e.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
                      <div>
                        <span className="font-bold text-slate-800">{e.recipient}</span>
                        <span className="text-[10px] text-slate-400 block">{e.description || "-"}</span>
                      </div>
                      <span className="font-mono font-bold text-rose-700">{e.amount.toLocaleString()} AED</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. WEEKLY REPORT BODY */}
        {reportType === "weekly" && (
          <div className="space-y-6">
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>{language === "ar" ? "التقرير الأسبوعي للأعمال والمشاريع والسيولة" : "Weekly Executive Status Report"}</span>
              </h3>
              <span className="text-xs font-mono font-bold text-blue-700">7-Day Period</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200">
                <span className="text-xs text-slate-500 block">{language === "ar" ? "المشاريع النشطة هذا الأسبوع" : "Active Projects"}</span>
                <span className="font-mono font-bold text-2xl text-purple-900">
                  {projects.filter(p => p.status === "in_progress").length}
                </span>
              </div>
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                <span className="text-xs text-slate-500 block">{language === "ar" ? "مقبوضات الأسبوع" : "Weekly Inflow"}</span>
                <span className="font-mono font-bold text-xl text-emerald-700">
                  {receipts.slice(0, 10).reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()} AED
                </span>
              </div>
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200">
                <span className="text-xs text-slate-500 block">{language === "ar" ? "نفقات ومشتريات الأسبوع" : "Weekly Outflow"}</span>
                <span className="font-mono font-bold text-xl text-rose-700">
                  {expenses.slice(0, 10).reduce((sum, e) => sum + (Number(e.amount) || 0), 0).toLocaleString()} AED
                </span>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200">
                <span className="text-xs text-slate-500 block">{language === "ar" ? "إجمالي ساعات العمل المسجلة" : "Total Labor Hours"}</span>
                <span className="font-mono font-bold text-2xl text-blue-700">
                  {attendance.slice(0, 30).reduce((sum, a) => sum + (Number(a.hoursWorked) || 0), 0)} س
                </span>
              </div>
            </div>

            {/* Projects Milestones */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-800">
                {language === "ar" ? "حالة تقدم المشاريع خلال هذا الأسبوع:" : "Weekly Project Status & Progress:"}
              </h4>
              <div className="space-y-2">
                {projects.map(p => (
                  <div key={p.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900">{p.title}</span>
                      <span className="text-slate-500 block text-[11px]">{p.clientName} | {p.location}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 rounded-full" 
                          style={{ width: `${p.completionRate}%` }} 
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-800 w-10 text-right">{p.completionRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. MONTHLY EXECUTIVE REPORT BODY */}
        {reportType === "monthly" && (
          <div className="space-y-6">
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <span>{language === "ar" ? `التقرير المالي والتنفيذي الشامل لشهر: ${selectedMonth}` : `Monthly Executive Financial Statement: ${selectedMonth}`}</span>
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-700">P&L + VAT Statement</span>
            </div>

            {/* Income & Expense Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Inflow */}
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 space-y-3">
                <span className="font-bold text-sm text-emerald-800 block flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  {language === "ar" ? "1. الإيرادات والتحصيلات الشهرية" : "1. Monthly Gross Inflows"}
                </span>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "سندات القبض وفواتير العملاء المحصلة" : "Receipts Collected"}</span>
                    <span className="font-mono font-bold text-slate-900">{monthlyReceiptsTotal.toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "الضريبة التقديرية (5% مقتطعة)" : "Estimated VAT"}</span>
                    <span className="font-mono font-bold text-blue-700">{monthlyVatEst.toLocaleString()} AED</span>
                  </div>
                </div>
              </div>

              {/* Outflow */}
              <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/20 space-y-3">
                <span className="font-bold text-sm text-rose-800 block flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  {language === "ar" ? "2. التكاليف والمصروفات الشهرية" : "2. Monthly Total Outflows"}
                </span>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "مسير رواتب الكادر والبدلات" : "Staff Payroll"}</span>
                    <span className="font-mono font-bold text-rose-700">{monthlyPayrollTotal.toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "مكافآت وبونص الشهر" : "Bonuses Paid"}</span>
                    <span className="font-mono font-bold text-amber-700">{monthlyBonusesTotal.toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "سندات الصرف ومشتريات المواد والمقر" : "Expenses & Operations"}</span>
                    <span className="font-mono font-bold text-rose-700">{monthlyExpensesTotal.toLocaleString()} AED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Net Summary */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-purple-300 font-semibold block">
                  {language === "ar" ? "صافي الربح التشغيلي للشهر" : "Monthly Net Operating Profit"}
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  {monthlyNetProfit.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                </span>
              </div>
              <div className="text-right text-xs text-slate-400 font-arabic">
                {language === "ar" 
                  ? "معتمد من الإدارة المالية - رواد سمارت للأجهزة الذكية" 
                  : "Certified by Financial Administration - Ruaad Smart"}
              </div>
            </div>
          </div>
        )}

        {/* 4. YEARLY EXECUTIVE & FINANCIAL REPORT BODY */}
        {reportType === "yearly" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-5 rounded-2xl border border-indigo-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-300" />
                  <span>{language === "ar" ? `التقرير المالي والتنفيذي السنوي لعام ${selectedYear}` : `Annual Executive & Financial Statement: ${selectedYear}`}</span>
                </h3>
                <p className="text-xs text-indigo-200 font-arabic">
                  {language === "ar" ? "بيان الأداء المالي، التدفقات النقدية، والأرباح التشغيلية وحصاد المشاريع المعتمدة" : "Annual P&L, Cashflows, Operating Margins & Completed Projects"}
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                <span className="text-indigo-200 font-sans">{language === "ar" ? "السنة المالية:" : "FY:"}</span>
                <span className="font-bold text-white text-sm">{selectedYear}</span>
              </div>
            </div>

            {/* 4 Annual High-Level KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800">{language === "ar" ? "إجمالي الإيرادات السنوية" : "Gross Inflows (FY)"}</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="font-mono font-bold text-xl text-emerald-700 mt-2">
                  {yearlyReceiptsTotal.toLocaleString()} AED
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-arabic">
                  {yearlyReceipts.length} {language === "ar" ? "سند قبض وفاتورة محصلة" : "receipts collected"}
                </div>
              </div>

              <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-800">{language === "ar" ? "إجمالي المنصرفات والرواتب" : "Total Outflow (FY)"}</span>
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                </div>
                <div className="font-mono font-bold text-xl text-rose-700 mt-2">
                  {totalYearlyOutflow.toLocaleString()} AED
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-arabic">
                  {yearlyExpensesTotal.toLocaleString()} مصاريف + {yearlyPayrollTotal.toLocaleString()} رواتب
                </div>
              </div>

              <div className={`p-4 rounded-2xl border shadow-2xs ${yearlyNetProfit >= 0 ? "bg-indigo-50/60 border-indigo-200" : "bg-rose-50/60 border-rose-200"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">{language === "ar" ? "صافي الربح السنوي" : "Net Profit (FY)"}</span>
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                </div>
                <div className={`font-mono font-bold text-xl mt-2 ${yearlyNetProfit >= 0 ? "text-indigo-800" : "text-rose-700"}`}>
                  {yearlyNetProfit.toLocaleString()} AED
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-arabic">
                  {language === "ar" ? "نسبة هامش الربح:" : "Margin:"}{" "}
                  <strong className="font-mono text-slate-800">
                    {yearlyReceiptsTotal > 0 ? Math.round((yearlyNetProfit / yearlyReceiptsTotal) * 100) : 0}%
                  </strong>
                </div>
              </div>

              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-900">{language === "ar" ? "حصاد المشاريع والعقود" : "Projects & Contracts"}</span>
                  <Building2 className="w-4 h-4 text-purple-600" />
                </div>
                <div className="font-mono font-bold text-xl text-purple-900 mt-2">
                  {yearlyCompletedProjects} / {yearlyProjects.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-arabic">
                  {language === "ar" ? "مشروع مكتمل | " : "completed | "} {yearlyContracts.length} {language === "ar" ? "عقد معتمد" : "contracts"}
                </div>
              </div>
            </div>

            {/* 12-Month Progression Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 font-arabic">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>{language === "ar" ? `جدول التدفقات المالية شهراً بشهر لعام ${selectedYear}:` : `Monthly Financial Progression: ${selectedYear}`}</span>
                </h4>
                <span className="text-[11px] font-mono text-slate-500">12 Months (Jan - Dec)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs" dir={isRtl ? "rtl" : "ltr"}>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-semibold font-arabic">
                      <th className="py-2.5 px-3">الشهر</th>
                      <th className="py-2.5 px-3 text-right">الإيرادات (AED)</th>
                      <th className="py-2.5 px-3 text-right">المصروفات (AED)</th>
                      <th className="py-2.5 px-3 text-right">مسير الرواتب (AED)</th>
                      <th className="py-2.5 px-3 text-right">إجمالي المنصرف (AED)</th>
                      <th className="py-2.5 px-3 text-right">صافي الشهر (AED)</th>
                      <th className="py-2.5 px-3 text-center">الهامش</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {yearlyMonthlyBreakdown.map((m) => (
                      <tr key={m.monthKey} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{m.nameAr}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                          {m.receipts > 0 ? m.receipts.toLocaleString() : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-600">
                          {m.expenses > 0 ? m.expenses.toLocaleString() : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-purple-700">
                          {m.payroll > 0 ? m.payroll.toLocaleString() : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-800 font-semibold">
                          {m.outflow > 0 ? m.outflow.toLocaleString() : "-"}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${m.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {m.net !== 0 ? `${m.net.toLocaleString()} AED` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {m.receipts > 0 ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.margin >= 25 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              m.margin >= 0 ? "bg-blue-50 text-blue-700 border border-blue-200" :
                              "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}>
                              {m.margin}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 font-mono">
                      <td className="py-3 px-3 font-sans font-extrabold">{language === "ar" ? "الإجمالي السنوي النهائي" : "Annual Grand Total"}</td>
                      <td className="py-3 px-3 text-right text-emerald-800 font-bold">{yearlyReceiptsTotal.toLocaleString()} AED</td>
                      <td className="py-3 px-3 text-right text-rose-700">{yearlyExpensesTotal.toLocaleString()} AED</td>
                      <td className="py-3 px-3 text-right text-purple-800">{yearlyPayrollTotal.toLocaleString()} AED</td>
                      <td className="py-3 px-3 text-right text-slate-900 font-extrabold">{totalYearlyOutflow.toLocaleString()} AED</td>
                      <td className={`py-3 px-3 text-right font-extrabold ${yearlyNetProfit >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                        {yearlyNetProfit.toLocaleString()} AED
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-900 text-white text-[11px] font-mono">
                          {yearlyReceiptsTotal > 0 ? Math.round((yearlyNetProfit / yearlyReceiptsTotal) * 100) : 0}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Annual Financial Statement Breakdown (P&L and VAT Summary) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 space-y-3">
                <span className="font-bold text-sm text-emerald-800 block flex items-center gap-2 font-arabic">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  {language === "ar" ? "1. بيان المقبوضات والإيرادات السنوية" : "1. Annual Revenue Statement"}
                </span>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "إجمالي الفواتير وسندات القبض المعتمدة" : "Gross Billed & Collected"}</span>
                    <span className="font-mono font-bold text-slate-900">{yearlyReceiptsTotal.toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "ضريبة القيمة المضافة المحصلة (5% VAT)" : "Estimated Output VAT (5%)"}</span>
                    <span className="font-mono font-bold text-blue-700">{yearlyVatEst.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "صافي الإيراد قبل الضريبة" : "Net Revenue Excl. VAT"}</span>
                    <span className="font-mono font-bold text-emerald-700">{(yearlyReceiptsTotal - yearlyVatEst).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-600">{language === "ar" ? "عقود المشاريع المبرمة خلال السنة" : "Contracts Executed"}</span>
                    <span className="font-mono font-bold text-purple-900">{yearlyContracts.length} {language === "ar" ? "عقود رسمية" : "contracts"}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/20 space-y-3">
                <span className="font-bold text-sm text-rose-800 block flex items-center gap-2 font-arabic">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  {language === "ar" ? "2. بيان التكاليف والرواتب السنوية" : "2. Annual Outflow Statement"}
                </span>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "إجمالي مسير رواتب الموظفين والكادر" : "Total Annual Staff Payroll"}</span>
                    <span className="font-mono font-bold text-rose-700">{yearlyPayrollTotal.toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "إجمالي المكافآت والحوافز السنوية" : "Annual Bonuses & Incentives"}</span>
                    <span className="font-mono font-bold text-amber-700">{yearlyBonusesTotal.toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">{language === "ar" ? "نفقات التشغيل وسندات الصرف والمشتريات" : "Operational & Material Outflows"}</span>
                    <span className="font-mono font-bold text-rose-700">{yearlyExpensesTotal.toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-600 font-bold">{language === "ar" ? "إجمالي النفقات والرواتب السنوية" : "Grand Total Annual Outflows"}</span>
                    <span className="font-mono font-bold text-rose-900">{totalYearlyOutflow.toLocaleString()} AED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Net Summary Banner */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-indigo-300 font-semibold block font-arabic">
                  {language === "ar" ? `صافي الأرباح التشغيلية السنوية لعام ${selectedYear}` : `Annual Net Operating Profit: FY ${selectedYear}`}
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  {yearlyNetProfit.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                </span>
              </div>
              <div className="text-right text-xs text-slate-400 font-arabic">
                {language === "ar" 
                  ? "معتمد رسمياً من الإدارة المالية والتنفيذية - رواد سمارت للأجهزة الذكية" 
                  : "Certified by Executive & Financial Administration - Ruaad Smart LLC"}
              </div>
            </div>
          </div>
        )}

        {/* Report Official Signatures Footer (Interactive Accountant & CEO Signatures) */}
        <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-slate-800 font-arabic">
          
          {/* 1. المسؤول المالي والمحاسبي */}
          <div className="space-y-2.5 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/90 relative">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>{language === "ar" ? "المسؤول المالي والمحاسبي:" : "Financial Controller:"}</span>
                </span>
                <input
                  type="text"
                  value={accountantName}
                  onChange={(e) => {
                    setAccountantName(e.target.value);
                    try { localStorage.setItem("ruwad_report_accountant_name", e.target.value); } catch(err){}
                  }}
                  className="mt-0.5 text-xs text-slate-600 bg-transparent border-b border-dashed border-slate-300 focus:border-purple-600 outline-none w-48 font-medium"
                  placeholder="اسم المحاسب..."
                />
              </div>

              {/* Action Buttons (hidden in print) */}
              <div className="flex items-center gap-1 no-print">
                <button
                  type="button"
                  onClick={() => setSigningRole("accountant")}
                  className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer"
                >
                  <PenTool className="w-3 h-3" />
                  <span>{accountantSignature ? (language === "ar" ? "إعادة التوقيع" : "Re-sign") : (language === "ar" ? "توقيع المحاسب" : "Sign")}</span>
                </button>
                {accountantSignature && (
                  <button
                    type="button"
                    onClick={() => handleClearSignature("accountant")}
                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                    title="مسح التوقيع"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Signature Area */}
            <div className="h-20 border-b border-slate-300 relative flex items-center justify-start">
              {accountantSignature ? (
                <div className="relative z-10 flex items-center gap-2">
                  <img
                    src={accountantSignature}
                    alt="Accountant Signature"
                    className="h-16 max-w-[200px] object-contain drop-shadow-xs"
                  />
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 no-print flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>تم التوقيع</span>
                  </span>
                </div>
              ) : (
                <span className="text-slate-400 text-xs italic">
                  {language === "ar" ? "(انقر فوق 'توقيع المحاسب' لرسم التوقيع هنا)" : "(Click 'Sign' to draw signature)"}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Certified Financial Controller - Ruaad Smart LLC
            </p>
          </div>

          {/* 2. الاعتماد العام / الإدارة التنفيذية */}
          <div className="space-y-2.5 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/90 relative" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-800" />
                  <span>{language === "ar" ? "الاعتماد العام / الإدارة التنفيذية:" : "Executive Approval:"}</span>
                </span>
                <input
                  type="text"
                  value={executiveName}
                  onChange={(e) => {
                    setExecutiveName(e.target.value);
                    try { localStorage.setItem("ruwad_report_executive_name", e.target.value); } catch(err){}
                  }}
                  className="mt-0.5 text-xs text-slate-600 bg-transparent border-b border-dashed border-slate-300 focus:border-purple-600 outline-none w-48 font-medium"
                  placeholder="اسم المدير التنفيذي..."
                />
              </div>

              {/* Action Buttons (hidden in print) */}
              <div className="flex items-center gap-1 no-print">
                <button
                  type="button"
                  onClick={() => {
                    const newVal = !hasStamp;
                    setHasStamp(newVal);
                    try { localStorage.setItem("ruwad_report_stamp", String(newVal)); } catch(e){}
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                    hasStamp 
                      ? "bg-purple-100 text-purple-900 border-purple-300" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                  title="إظهار/إخفاء ختم الشركة"
                >
                  <Stamp className="w-3 h-3" />
                  <span>{hasStamp ? (language === "ar" ? "الختم مفعل" : "Stamp On") : (language === "ar" ? "إضافة الختم" : "Add Stamp")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSigningRole("executive")}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-white text-[11px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer"
                >
                  <PenTool className="w-3 h-3" />
                  <span>{executiveSignature ? (language === "ar" ? "إعادة التوقيع" : "Re-sign") : (language === "ar" ? "توقيع المدير" : "Sign")}</span>
                </button>

                {executiveSignature && (
                  <button
                    type="button"
                    onClick={() => handleClearSignature("executive")}
                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                    title="مسح التوقيع"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Signature Area with Stamp Overlay */}
            <div className="h-20 border-b border-slate-300 relative flex items-center justify-start overflow-hidden">
              {/* Official Seal / Stamp */}
              {hasStamp && (
                <div className="absolute left-2 top-0 w-22 h-20 opacity-90 pointer-events-none select-none flex items-center justify-center -rotate-6">
                  <img
                    src={settings?.stampBase64 || "/stamp.png"}
                    alt="Official Company Stamp"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}

              {executiveSignature ? (
                <div className="relative z-10 flex items-center gap-2">
                  <img
                    src={executiveSignature}
                    alt="Executive Signature"
                    className="h-16 max-w-[200px] object-contain drop-shadow-xs"
                  />
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 no-print flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>معتمد</span>
                  </span>
                </div>
              ) : (
                <span className="text-slate-400 text-xs italic">
                  {language === "ar" ? "(انقر فوق 'توقيع المدير' لرسم التوقيع والاعتماد)" : "(Click 'Sign' to draw executive signature)"}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Managing Director Approval - Ruaad Smart LLC
            </p>
          </div>

        </div>

      </div>

      {/* SIGNATURE DRAWING MODAL DIALOG */}
      {signingRole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-purple-700" />
                <span>
                  {signingRole === "accountant" 
                    ? (language === "ar" ? "رسم وتوثيق توقيع المسؤول المالي والمحاسبي" : "Sign as Financial Controller")
                    : (language === "ar" ? "رسم وتوثيق توقيع المدير التنفيذي / الإدارة" : "Sign as Managing Director")}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setSigningRole(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 font-arabic">
              <p className="text-xs text-slate-500">
                {language === "ar"
                  ? "ارسم توقيعك أدناه باستخدام الماوس أو شاشة اللمس بإصبعك، وسيتم حفظه وتثبيته تلقائياً على التقرير:"
                  : "Draw your signature below using mouse or touchscreen:"}
              </p>

              {/* Signature Canvas Box */}
              <div className="border-2 border-dashed border-purple-300 rounded-2xl overflow-hidden bg-slate-50/50 shadow-inner flex items-center justify-center h-44">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor="#1e1b4b"
                  canvasProps={{
                    className: "w-full h-full cursor-crosshair",
                    style: { width: "100%", height: "176px" }
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => sigCanvasRef.current?.clear()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "مسح وإعادة الرسم" : "Clear"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSigningRole(null)}
                    className="px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    {language === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSignature}
                    className="px-5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "اعتماد وتثبيت التوقيع" : "Save Signature"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


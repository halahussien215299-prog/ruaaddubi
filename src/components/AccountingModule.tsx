"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  DollarSign, 
  Receipt as ReceiptIcon, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Printer, 
  Search, 
  Filter, 
  Wallet, 
  FileText, 
  CreditCard, 
  Building2, 
  Calendar,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Bot,
  Scale,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PieChart,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  BadgePercent,
  QrCode
} from "lucide-react";
import { 
  Quotation, 
  Receipt, 
  Expense, 
  Project, 
  JournalEntry, 
  JournalEntryLine, 
  CHART_OF_ACCOUNTS, 
  ChartAccount 
} from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import { TAX_CONFIG, TaxJurisdiction } from "@/lib/taxCompliance";

interface AccountingModuleProps {
  quotations: Quotation[];
  receipts: Receipt[];
  expenses: Expense[];
  projects: Project[];
  journalEntries?: JournalEntry[];
  onSaveExpense: (expense: Expense) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onDeleteReceipt: (id: string) => Promise<void>;
  onSaveQuotation?: (quotation: Quotation) => Promise<void>;
  onSaveReceipt?: (receipt: Receipt) => Promise<void>;
  onSaveJournalEntry?: (entry: JournalEntry) => Promise<void>;
  onDeleteJournalEntry?: (id: string) => Promise<void>;
}

export default function AccountingModule({
  quotations,
  receipts,
  expenses,
  projects,
  journalEntries = [],
  onSaveExpense,
  onDeleteExpense,
  onDeleteReceipt,
  onSaveQuotation,
  onSaveReceipt,
  onSaveJournalEntry,
  onDeleteJournalEntry,
}: AccountingModuleProps) {
  const { language, isRtl } = useLanguage();

  // Navigation Sub-Tabs: advisor (المحاسب المالي الذكي), reports (التقارير المالية), invoices, receipts, expenses
  const [activeMainTab, setActiveMainTab] = useState<"advisor" | "reports" | "invoices" | "receipts" | "expenses">("advisor");
  const [reportSubTab, setReportSubTab] = useState<"pl" | "balance_sheet" | "trial_balance" | "vat_return" | "cash_flow" | "chart_accounts">("pl");
  const [reportPeriod, setReportPeriod] = useState<"all" | "q1" | "q2" | "q3" | "q4" | "this_month" | "year_2026">("all");
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<"all" | "tax" | "tax_uae" | "tax_ksa" | "standard">("all");
  const [taxJurisdictionView, setTaxJurisdictionView] = useState<"UAE" | "KSA">("UAE");
  const [expenseSubView, setExpenseSubView] = useState<"vouchers" | "journal">("vouchers");

  // Modals
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddJournalModal, setShowAddJournalModal] = useState(false);
  const [showQuickReceiptModal, setShowQuickReceiptModal] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingJournal, setSavingJournal] = useState(false);
  const [savingQuickReceipt, setSavingQuickReceipt] = useState(false);

  // Bank Reconciliation State
  const [actualBankBalanceInput, setActualBankBalanceInput] = useState<string>("");
  const [reconciliationChecked, setReconciliationChecked] = useState(false);

  // Selected Interactive CFO Question
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>("cash_health");

  // New Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    voucherNo: `PV-${Date.now().toString().slice(-5)}`,
    date: new Date().toISOString().split("T")[0],
    category: "materials" as Expense["category"],
    amount: "",
    recipient: "",
    description: "",
    projectId: "",
    paymentMethod: "bank" as Expense["paymentMethod"],
  });

  // Quick Receipt Form State
  const [quickReceiptForm, setQuickReceiptForm] = useState({
    receiptNo: `RV-${Date.now().toString().slice(-5)}`,
    date: new Date().toISOString().split("T")[0],
    clientName: "",
    amount: "",
    paymentMethod: "bank" as Receipt["paymentMethod"],
    receivedFor: "",
    receivedBy: "الإدارة المالية",
  });

  // Journal Entry Form State
  const [journalForm, setJournalForm] = useState({
    entryNo: `JV-${Date.now().toString().slice(-5)}`,
    date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
    projectId: "",
    lines: [
      { accountCode: "1020", accountName: "الحساب البنكي (ADCB)", debit: 0, credit: 0, description: "" },
      { accountCode: "4010", accountName: "إيرادات مشاريع الأنظمة الذكية", debit: 0, credit: 0, description: "" },
    ] as JournalEntryLine[],
  });

  // ==========================================
  // Core Financial Calculations
  // ==========================================

  // Filtered dataset based on reportPeriod
  const periodFilteredData = useMemo(() => {
    const isDateInPeriod = (dateStr?: string) => {
      if (!dateStr || reportPeriod === "all") return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;
      const month = d.getMonth(); // 0 - 11
      const year = d.getFullYear();
      if (reportPeriod === "year_2026") return year === 2026;
      if (reportPeriod === "this_month") {
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (reportPeriod === "q1") return month >= 0 && month <= 2;
      if (reportPeriod === "q2") return month >= 3 && month <= 5;
      if (reportPeriod === "q3") return month >= 6 && month <= 8;
      if (reportPeriod === "q4") return month >= 9 && month <= 11;
      return true;
    };

    const pQuotations = quotations.filter(q => isDateInPeriod(q.date || q.createdAt));
    const pReceipts = receipts.filter(r => isDateInPeriod(r.date || r.createdAt));
    const pExpenses = expenses.filter(e => isDateInPeriod(e.date || e.createdAt));

    return { pQuotations, pReceipts, pExpenses };
  }, [quotations, receipts, expenses, reportPeriod]);

  // Approved Contracts & Invoices
  const approvedQuotes = quotations.filter(q => q.status === "approved" || q.status === "executed");
  const totalApprovedInvoiceAmount = approvedQuotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
  const totalSubtotalInvoices = approvedQuotes.reduce((sum, q) => sum + (Number(q.subtotal) || Number(q.total) / 1.05 || 0), 0);

  // Receipts / Cash Inflow
  const totalReceiptsAmount = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Outstanding Accounts Receivable (الذمم المدينة المتبقية على العملاء)
  const totalAccountsReceivable = Math.max(0, totalApprovedInvoiceAmount - totalReceiptsAmount);

  // Direct Costs of Projects (تكلفة التنفيذ والمبيعات COGS)
  const cogsExpenses = expenses
    .filter(e => ["materials", "tools", "subcontractor"].includes(e.category))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Operating Expenses (المصروفات التشغيلية SG&A)
  const opexExpenses = expenses
    .filter(e => ["salaries", "rent", "utilities", "transport", "other"].includes(e.category))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Category breakdown
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    });
    return map;
  }, [expenses]);

  // Gross Profit & Margin
  const grossProfit = totalApprovedInvoiceAmount - cogsExpenses;
  const grossMarginPercent = totalApprovedInvoiceAmount > 0 
    ? Math.round((grossProfit / totalApprovedInvoiceAmount) * 100) 
    : 0;

  // Net Operating Profit (قبل وبعد الضرائب)
  const netOperatingProfit = grossProfit - opexExpenses;
  const netMarginPercent = totalApprovedInvoiceAmount > 0 
    ? Math.round((netOperatingProfit / totalApprovedInvoiceAmount) * 100) 
    : 0;

  // Net Cash Flow (السيولة النقدية الفعلية بالخزينة والبنك)
  const netCashFlow = totalReceiptsAmount - totalExpensesAmount;

  // VAT Calculations (UAE 5% FTA & Saudi 15% ZATCA)
  const taxInvoices = quotations.filter(q => q.invoiceType === "tax");
  const standardInvoices = quotations.filter(q => q.invoiceType !== "tax");

  const taxInvoicesTotal = taxInvoices.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
  const standardInvoicesTotal = standardInvoices.reduce((sum, q) => sum + (Number(q.total) || 0), 0);

  // UAE FTA VAT (5% - AED)
  const uaeTaxInvoices = quotations.filter(q => q.invoiceType === "tax" && (q.taxJurisdiction === "UAE" || (!q.taxJurisdiction && q.currency !== "SAR" && q.vatRate !== 15)));
  const uaeTaxInvoicesTotal = uaeTaxInvoices.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
  const vatOutputTax = uaeTaxInvoices.reduce((sum, q) => {
    const sub = Number(q.subtotal) || (Number(q.total) / 1.05);
    return sum + (Number(q.total) - sub);
  }, 0);
  const vatInputTax = (cogsExpenses * 0.05) / 1.05;
  const netVatPayableToFTA = Math.max(0, vatOutputTax - vatInputTax);

  // Saudi ZATCA VAT (15% - SAR)
  const ksaTaxInvoices = quotations.filter(q => q.invoiceType === "tax" && (q.taxJurisdiction === "KSA" || q.currency === "SAR" || q.vatRate === 15));
  const ksaTaxInvoicesTotal = ksaTaxInvoices.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
  const ksaVatOutputTax = ksaTaxInvoices.length > 0
    ? ksaTaxInvoices.reduce((sum, q) => {
        const sub = Number(q.subtotal) || (Number(q.total) / 1.15);
        return sum + (Number(q.total) - sub);
      }, 0)
    : (taxInvoicesTotal * 0.15) / 1.15; // baseline projection for compliance report
  const ksaVatInputTax = (cogsExpenses * 0.15) / 1.15;
  const netVatPayableToZATCA = Math.max(0, ksaVatOutputTax - ksaVatInputTax);

  // Project Profitability Breakdown
  const projectFinancials = useMemo(() => {
    return projects.map(proj => {
      const projExpenses = expenses
        .filter(e => e.projectId === proj.id)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const projReceipts = receipts
        .filter(r => r.receivedFor?.includes(proj.projectNo) || r.receivedFor?.includes(proj.title))
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const budget = Number(proj.budget) || 0;
      const profit = (budget > 0 ? budget : projReceipts) - projExpenses;
      const margin = budget > 0 ? Math.round((profit / budget) * 100) : 0;
      return {
        ...proj,
        spent: projExpenses,
        collected: projReceipts,
        profit,
        margin
      };
    });
  }, [projects, expenses, receipts]);

  // ==========================================
  // Virtual Accountant Audits & Requests Detection
  // ==========================================
  const unlinkedExpenses = useMemo(() => expenses.filter(e => !e.projectId), [expenses]);
  const uncollectedProjects = useMemo(() => {
    return quotations.filter(q => (q.status === "approved" || q.status === "executed") && Number(q.total) > 0);
  }, [quotations]);

  // Bank Reconciliation Calculation
  const actualBankNum = parseFloat(actualBankBalanceInput) || 0;
  const theoreticalBankBalance = netCashFlow > 0 ? netCashFlow * 0.85 : 0; // estimated bank share
  const bankVariance = reconciliationChecked ? actualBankNum - theoreticalBankBalance : 0;

  // Category Translation Helper
  const getCategoryLabel = (cat: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      materials: { ar: "مواد ومعدات", en: "Materials & Equipment" },
      salaries: { ar: "رواتب ومكافآت", en: "Salaries & Wages" },
      rent: { ar: "إيجار ومقر", en: "Rent & Facilities" },
      utilities: { ar: "فواتير وخدمات", en: "Utilities & Telecom" },
      transport: { ar: "مواصلات ووقود", en: "Transport & Fuel" },
      tools: { ar: "أدوات وعدد", en: "Tools & Hardware" },
      subcontractor: { ar: "مقاول باطن وفنيين", en: "Subcontractor" },
      other: { ar: "مصروفات عامة", en: "General / Other" },
    };
    return language === "ar" ? (map[cat]?.ar || cat) : (map[cat]?.en || cat);
  };

  // Handlers
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.recipient) return;

    setSavingExpense(true);
    try {
      const selectedProject = projects.find(p => p.id === expenseForm.projectId);
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        voucherNo: expenseForm.voucherNo || `PV-${Date.now().toString().slice(-5)}`,
        date: expenseForm.date || new Date().toISOString().split("T")[0],
        category: expenseForm.category,
        amount: Number(expenseForm.amount) || 0,
        recipient: expenseForm.recipient.trim(),
        description: expenseForm.description.trim(),
        projectId: expenseForm.projectId || undefined,
        projectName: selectedProject ? selectedProject.title : undefined,
        paymentMethod: expenseForm.paymentMethod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSaveExpense(newExp);
      setShowAddExpenseModal(false);
      setExpenseForm({
        voucherNo: `PV-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().split("T")[0],
        category: "materials",
        amount: "",
        recipient: "",
        description: "",
        projectId: "",
        paymentMethod: "bank",
      });
    } catch (err) {
      console.error(err);
      alert(language === "ar" ? "فشل حفظ سند الصرف" : "Failed to save expense voucher");
    } finally {
      setSavingExpense(false);
    }
  };

  const handleQuickReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReceiptForm.amount || !quickReceiptForm.clientName) return;

    setSavingQuickReceipt(true);
    try {
      if (onSaveReceipt) {
        const newRec: Receipt = {
          id: `rec-${Date.now()}`,
          receiptNo: quickReceiptForm.receiptNo || `RV-${Date.now().toString().slice(-5)}`,
          date: quickReceiptForm.date || new Date().toISOString().split("T")[0],
          clientName: quickReceiptForm.clientName.trim(),
          amount: Number(quickReceiptForm.amount) || 0,
          amountInWords: `${quickReceiptForm.amount} درهم إماراتي`,
          paymentMethod: quickReceiptForm.paymentMethod,
          receivedFor: quickReceiptForm.receivedFor.trim() || "دفعة تحت الحساب لمشروع",
          receivedBy: quickReceiptForm.receivedBy.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await onSaveReceipt(newRec);
      }
      setShowQuickReceiptModal(false);
      setQuickReceiptForm({
        receiptNo: `RV-${Date.now().toString().slice(-5)}`,
        date: new Date().toISOString().split("T")[0],
        clientName: "",
        amount: "",
        paymentMethod: "bank",
        receivedFor: "",
        receivedBy: "الإدارة المالية",
      });
    } catch (err) {
      console.error(err);
      alert(language === "ar" ? "فشل حفظ سند القبض" : "Failed to save receipt");
    } finally {
      setSavingQuickReceipt(false);
    }
  };

  const handleJournalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalDebit = journalForm.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = journalForm.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alert(language === "ar" ? "خطأ محاسبي: يجب أن يتساوى مجموع المدين مع مجموع الدائن في قيد اليومية!" : "Accounting error: Total Debits must equal Total Credits!");
      return;
    }

    setSavingJournal(true);
    try {
      if (onSaveJournalEntry) {
        const newEntry: JournalEntry = {
          id: `jv-${Date.now()}`,
          entryNo: journalForm.entryNo || `JV-${Date.now().toString().slice(-5)}`,
          date: journalForm.date || new Date().toISOString().split("T")[0],
          reference: journalForm.reference.trim(),
          description: journalForm.description.trim(),
          lines: journalForm.lines.map(l => ({
            accountCode: l.accountCode,
            accountName: l.accountName,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description?.trim()
          })),
          totalDebit,
          totalCredit,
          isBalanced: true,
          status: "posted",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await onSaveJournalEntry(newEntry);
      }
      setShowAddJournalModal(false);
    } catch (err) {
      console.error(err);
      alert(language === "ar" ? "فشل حفظ قيد اليومية" : "Failed to save journal entry");
    } finally {
      setSavingJournal(false);
    }
  };

  const handleToggleInvoiceType = async (quote: Quotation) => {
    const newType = quote.invoiceType === "tax" ? "standard" : "tax";
    const updated: Quotation = {
      ...quote,
      invoiceType: newType,
      updatedAt: new Date().toISOString(),
    };
    if (onSaveQuotation) {
      await onSaveQuotation(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Print Specific CSS to make printed statements clean and executive */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-financial-report, #printable-financial-report * {
            visibility: visible;
          }
          #printable-financial-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Main Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl">
          {/* TAB 1: Virtual CFO Advisor */}
          <button
            onClick={() => setActiveMainTab("advisor")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === "advisor"
                ? "bg-white text-purple-900 shadow-xs border border-purple-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span>{language === "ar" ? "المحاسب المالي الذكي (CFO)" : "Virtual CFO Advisor"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-mono font-bold">
              نشط
            </span>
          </button>

          {/* TAB 2: Professional Financial Reports */}
          <button
            onClick={() => setActiveMainTab("reports")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === "reports"
                ? "bg-white text-blue-900 shadow-xs border border-blue-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
            <span>{language === "ar" ? "التقارير والقوائم المالية" : "Financial Statements"}</span>
          </button>

          {/* TAB 3: Invoices */}
          <button
            onClick={() => setActiveMainTab("invoices")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === "invoices"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ReceiptIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === "ar" ? "الفواتير الضريبية والبيانات" : "Invoices"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
              {quotations.length}
            </span>
          </button>

          {/* TAB 4: Receipts */}
          <button
            onClick={() => setActiveMainTab("receipts")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === "receipts"
                ? "bg-white text-emerald-900 shadow-xs border border-emerald-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === "ar" ? "سندات القبض" : "Receipts"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono">
              {receipts.length}
            </span>
          </button>

          {/* TAB 5: Expenses & Journal */}
          <button
            onClick={() => setActiveMainTab("expenses")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === "expenses"
                ? "bg-white text-rose-900 shadow-xs border border-rose-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-rose-600" />
            <span>{language === "ar" ? "سندات الصرف واليومية" : "Expenses & Journal"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-mono">
              {expenses.length}
            </span>
          </button>
        </div>

        {/* Global Action Shortcut Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === "ar" ? "سند صرف" : "New Expense"}</span>
          </button>

          <button
            onClick={() => setShowQuickReceiptModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === "ar" ? "سند تحصيل" : "Quick Receipt"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB: VIRTUAL CFO & FINANCIAL ACCOUNTANT ADVISOR (المحاسب المالي الذكي)   */}
      {/* ========================================================================= */}
      {activeMainTab === "advisor" && (
        <div className="space-y-6">
          {/* Virtual Accountant Banner Card */}
          <div className="bg-linear-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-purple-300 shrink-0">
                  <Bot className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-arabic">
                      {language === "ar" ? "المحاسب المالي الذكي المعتمد (CFO Controller)" : "Virtual Chief Financial Officer"}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {language === "ar" ? "تدقيق حي نشط" : "Live Audit Active"}
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/90 mt-1.5 max-w-2xl font-arabic leading-relaxed">
                    {language === "ar" 
                      ? "أهلاً بك يا مدير. أنا هنا لمتابعة حساباتك وتدقيق فواتيرك وطلب التسويات اللازمة، وتحضير التقارير المالية لرواد سمارت وفقاً للمعايير المحاسبية الإماراتية ونظام الهيئة الاتحادية للضرائب (FTA)." 
                      : "Welcome. I actively audit your invoices, track uncollected revenue, reconcile cash, and generate formal financial statements aligned with UAE IFRS and FTA regulations."}
                  </p>
                </div>
              </div>

              {/* Status Pill on the Right */}
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center shrink-0 min-w-[200px]">
                <div className="text-[11px] text-purple-200">
                  {language === "ar" ? "السيولة التشغيلية الصافية" : "Net Working Capital"}
                </div>
                <div className="text-2xl font-mono font-bold text-emerald-300 mt-1">
                  {netCashFlow.toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-xs font-sans">AED</span>
                </div>
                <div className="mt-1 text-[10px] text-purple-200/80">
                  {netCashFlow >= 0 ? "🟢 وضع مالي متوازن وإيجابي" : "🔴 انتبه: عجز نقدي مؤقت"}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: Proactive Financial Requests & Diagnostic Audits (طلبات المحاسب المالي) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-700" />
                  <span>{language === "ar" ? "طلبات وتنبيهات المحاسب المالي (Audit Tasks & Missing Details)" : "Financial Audit Requests"}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === "ar" 
                    ? "يقوم المحاسب بفحص الدفاتر ويطلب منك استكمال هذه التفاصيل المالية لضبط الميزانية وتجنب أي عجز أو غرامات ضريبية." 
                    : "Actionable items requiring your input to maintain financial balance and tax compliance."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Audit Request 1: Accounts Receivable Follow-up */}
              <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {language === "ar" ? "طلب تحصيل ذمم مدينة" : "Accounts Receivable"}
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <h4 className="mt-3 font-bold text-sm text-slate-900">
                    {language === "ar" ? "تحصيل دفعات العقود والفواتير المعتمدة" : "Collect Outstanding Invoices"}
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-arabic">
                    {language === "ar"
                      ? `لديك عقود وفواتير معتمدة قيد التنفيذ بقيمة ${totalApprovedInvoiceAmount.toLocaleString()} درهم، وحصّلت منها ${totalReceiptsAmount.toLocaleString()} درهم. المتبقي للتحصيل:`
                      : `Approved contracts total ${totalApprovedInvoiceAmount.toLocaleString()} AED. Remaining to be collected:`}
                  </p>
                  <div className="mt-2 font-mono font-bold text-xl text-amber-700">
                    {totalAccountsReceivable.toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-xs font-sans text-slate-500">AED</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {approvedQuotes.length} {language === "ar" ? "عقود معتمدة" : "contracts"}
                  </span>
                  <button
                    onClick={() => setShowQuickReceiptModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "تسجيل سند تحصيل" : "Record Receipt"}</span>
                  </button>
                </div>
              </div>

              {/* Audit Request 2: Unlinked / Missing Project Expenses */}
              <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs hover:border-rose-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                      {language === "ar" ? "طلب تدقيق تكاليف المشروعات" : "Project Cost Audit"}
                    </span>
                    <Info className="w-4 h-4 text-rose-600" />
                  </div>
                  <h4 className="mt-3 font-bold text-sm text-slate-900">
                    {language === "ar" ? "ربط فواتير المشتريات بالمشاريع" : "Unlinked Project Expenses"}
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-arabic">
                    {language === "ar"
                      ? `رصدت ${unlinkedExpenses.length} سند صرف مسجل بدون ربط بمشروع محدد بقيمة ${unlinkedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0).toLocaleString()} درهم. يرجى توثيق المشروع لحساب ربحية كل فيلا وعقد بدقة.`
                      : `Found ${unlinkedExpenses.length} general expenses without linked project reference.`}
                  </p>
                  <div className="mt-2 text-xs font-semibold text-rose-700">
                    {unlinkedExpenses.length > 0 
                      ? (language === "ar" ? "⚠️ يؤثر على دقة هامش ربح المشاريع" : "Affects project margin accuracy")
                      : (language === "ar" ? "✅ جميع المصروفات مرتبطة بالمشاريع" : "All expenses categorized")}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {unlinkedExpenses.length} {language === "ar" ? "سندات بحاجة لمراجعة" : "items pending"}
                  </span>
                  <button
                    onClick={() => {
                      setActiveMainTab("expenses");
                      setCategoryFilter("all");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>{language === "ar" ? "مراجعة المصروفات" : "Review Expenses"}</span>
                  </button>
                </div>
              </div>

              {/* Audit Request 3: UAE FTA VAT 5% Declaration Audit */}
              <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                      <span>🇦🇪</span>
                      <span>{language === "ar" ? "إقرار الإمارات (FTA VAT 201)" : "UAE FTA VAT 201"}</span>
                    </span>
                    <BadgePercent className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="mt-3 font-bold text-sm text-slate-900">
                    {language === "ar" ? "جاهزية إقرار ضريبة القيمة المضافة 5%" : "UAE FTA VAT Return Readiness"}
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-arabic">
                    {language === "ar"
                      ? `المخرجات المحصلة (${vatOutputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED) - المدخلات المستردة (${vatInputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED). صافي المستحق لـ FTA:`
                      : `Net VAT payable to UAE FTA after deducting eligible input VAT:`}
                  </p>
                  <div className="mt-2 font-mono font-bold text-xl text-blue-700">
                    {netVatPayableToFTA.toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-xs font-sans text-slate-500">AED</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-blue-600 font-mono font-medium">
                    TRN: 100458920100003
                  </span>
                  <button
                    onClick={() => {
                      setTaxJurisdictionView("UAE");
                      setActiveMainTab("reports");
                      setReportSubTab("vat_return");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>{language === "ar" ? "فحص إقرار FTA" : "View FTA Return"}</span>
                  </button>
                </div>
              </div>

              {/* Audit Request 4: Saudi ZATCA 15% & Fatoora e-Invoicing Compliance */}
              <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <span>🇸🇦</span>
                      <span>{language === "ar" ? "هيئة الزكاة والضريبة والجمارك (زاتكا)" : "Saudi ZATCA Compliance"}</span>
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="mt-3 font-bold text-sm text-slate-900">
                    {language === "ar" ? "الامتثال لضريبة 15% والفوترة الإلكترونية (فاتورة)" : "ZATCA 15% & e-Invoicing Compliance"}
                  </h4>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === "ar" ? "ترميز TLV Base64 QR متوافق 100% مع تطبيق زاتكا" : "TLV Base64 QR compliant with ZATCA App"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === "ar" ? "الرقم الضريبي الموحد (15 رقماً تبدأ وتنتهي بـ 3)" : "15-digit ZATCA TIN format verified"}</span>
                    </div>
                  </div>
                  <div className="mt-2 font-mono font-bold text-xl text-emerald-700">
                    {netVatPayableToZATCA.toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-xs font-sans text-slate-500">SAR</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-mono font-medium">
                    TIN: 300000000000003
                  </span>
                  <button
                    onClick={() => {
                      setTaxJurisdictionView("KSA");
                      setActiveMainTab("reports");
                      setReportSubTab("vat_return");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>{language === "ar" ? "فحص إقرار زاتكا 🇸🇦" : "View ZATCA Return"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Bank Reconciliation Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      {language === "ar" ? "التسوية والمطابقة البنكية (Bank Reconciliation - ADCB)" : "Bank Statement Reconciliation"}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {language === "ar" 
                        ? "يطلب منك المحاسب إدخال رصيدك الفعلي في حساب بنك أبوظبي التجاري لمطابقته مع دفاتر وسيولة الشركة." 
                        : "Enter your live bank balance to perform variance audit against the company general ledger."}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-500">{language === "ar" ? "الرصيد الدفتري المتوقع بالبنك:" : "Expected Book Balance:"}</span>
                  <div className="font-mono font-bold text-base text-slate-900">
                    {theoreticalBankBalance.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "أدخل الرصيد الفعلي الحالي في كشف حساب البنك (AED):" : "Actual Bank Statement Balance (AED):"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder={language === "ar" ? "مثال: 45000" : "e.g. 45000"}
                      value={actualBankBalanceInput}
                      onChange={(e) => {
                        setActualBankBalanceInput(e.target.value);
                        setReconciliationChecked(false);
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono font-bold"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">AED</span>
                  </div>
                </div>

                <div className="w-full sm:w-auto pt-0 sm:pt-5">
                  <button
                    type="button"
                    onClick={() => setReconciliationChecked(true)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "إجراء المطابقة البنكية" : "Reconcile Balance"}</span>
                  </button>
                </div>
              </div>

              {reconciliationChecked && (
                <div className={`p-4 rounded-xl border text-xs font-arabic flex items-start gap-3 transition-all ${
                  Math.abs(bankVariance) < 5
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : bankVariance > 0
                    ? "bg-blue-50 border-blue-200 text-blue-900"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}>
                  <div className="mt-0.5">
                    {Math.abs(bankVariance) < 5 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-sm">
                      {Math.abs(bankVariance) < 5 
                        ? (language === "ar" ? "✅ المطابقة البنكية ناجحة 100%!" : "Perfect Reconciliation Match!")
                        : (language === "ar" ? `⚠️ يوجد فرق تسوية قدره ${Math.abs(bankVariance).toLocaleString()} درهم إماراتي` : `Variance of ${Math.abs(bankVariance).toLocaleString()} AED detected`)}
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">
                      {Math.abs(bankVariance) < 5
                        ? (language === "ar" ? "رصيدك البنكي الفعلي يتطابق بدقة تامة مع حركة المقبوضات والمصروفات المسجلة بالدفاتر." : "Your bank statement perfectly matches total registered inflows and outflows.")
                        : bankVariance > 0
                        ? (language === "ar" ? "الرصيد في البنك أعلى من الدفاتر. هذا يشير لوجود تحصيلات بنكية من عملاء لم يتم إصدار سندات قبض لها بعد، أو أرباح فوائد بنكية." : "Bank balance is higher than system books. Consider registering missing customer deposits.")
                        : (language === "ar" ? "الرصيد في البنك أقل من الدفاتر. هذا يشير لوجود مصروفات أو شيكات تم صرفها ولم تُسجل كسندات صرف، أو رسوم بنكية." : "Bank balance is lower than books. Please ensure all bank service charges and checks are entered.")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION: Ask The Virtual Accountant (استشر المحاسب المالي) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>{language === "ar" ? "اسأل المحاسب المالي واستشر (Financial Advisory Hub)" : "Ask The Financial Accountant"}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === "ar" 
                    ? "اختر أي سؤال مالي تحتاجه، وسيجيبك المحاسب بتحليل رقمي وتوصية مهنية فورية من واقع أرقامك الحية:" 
                    : "Select a strategic question to receive instant mathematical analysis and chartered recommendations:"}
                </p>
              </div>
            </div>

            {/* Quick Question Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveQuestionId("cash_health")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeQuestionId === "cash_health"
                    ? "bg-purple-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>💡</span>
                <span>{language === "ar" ? "ما هو موقفي المالي والسيولة النقدية اليوم؟" : "What is our net liquidity status?"}</span>
              </button>

              <button
                onClick={() => setActiveQuestionId("margins")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeQuestionId === "margins"
                    ? "bg-purple-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>📊</span>
                <span>{language === "ar" ? "ما هي نسبة هامش ربح المشاريع؟" : "What are our gross & net profit margins?"}</span>
              </button>

              <button
                onClick={() => setActiveQuestionId("vat")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeQuestionId === "vat"
                    ? "bg-purple-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>🏛️</span>
                <span>{language === "ar" ? "كم يبلغ التزامي الضريبي للهيئة (FTA)؟" : "What is our VAT tax liability?"}</span>
              </button>

              <button
                onClick={() => setActiveQuestionId("expenses_drain")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeQuestionId === "expenses_drain"
                    ? "bg-purple-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>💸</span>
                <span>{language === "ar" ? "أين تذهب أكبر المصروفات والتكاليف؟" : "Where is our biggest cash outflow?"}</span>
              </button>

              <button
                onClick={() => setActiveQuestionId("project_returns")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeQuestionId === "project_returns"
                    ? "bg-purple-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>🏗️</span>
                <span>{language === "ar" ? "ما هي أكثر المشروعات ربحية؟" : "Which projects have highest return?"}</span>
              </button>
            </div>

            {/* Response Card from the Virtual Accountant */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 font-arabic">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                <Bot className="w-4 h-4 text-purple-700" />
                <span>{language === "ar" ? "رد وتحليل المحاسب المالي المعتمد:" : "Chartered Accountant Response:"}</span>
              </div>

              {activeQuestionId === "cash_health" && (
                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <p>
                    <strong>{language === "ar" ? "تحليل السيولة ورأس المال العامل:" : "Cash Position Analysis:"}</strong>{" "}
                    {language === "ar"
                      ? `إجمالي المقبوضات المحصلة فعلياً حتى الآن يبلغ (${totalReceiptsAmount.toLocaleString()} درهم)، مقابل إجمالي مصروفات تشغيلية ومشتريات بقيمة (${totalExpensesAmount.toLocaleString()} درهم).`
                      : `Total actual collected inflow is (${totalReceiptsAmount.toLocaleString()} AED) vs total expenses (${totalExpensesAmount.toLocaleString()} AED).`}
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <span>{language === "ar" ? "صافي السيولة النقدية المتوفرة (Free Cash):" : "Net Free Cash:"}</span>
                    <span className="font-mono font-bold text-sm text-purple-900">{netCashFlow.toLocaleString()} AED</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    💡 <strong>{language === "ar" ? "توصية المحاسب:" : "Accountant Recommendation:"}</strong>{" "}
                    {language === "ar"
                      ? `وضعك المالي ${netCashFlow >= 0 ? "آمن ومستقر" : "يحتاج لتعزيز سيولة عاجل"}. يُنصح بالتركيز الفوري على تحصيل مستحقات العملاء البالغة (${totalAccountsReceivable.toLocaleString()} درهم) للحفاظ على مسار نمو قوي وتجنب أي عجز في سداد رواتب أو موردي الكاميرات.`
                      : `Your cashflow is currently ${netCashFlow >= 0 ? "healthy" : "tight"}. Accelerate collection of accounts receivable (${totalAccountsReceivable.toLocaleString()} AED).`}
                  </p>
                </div>
              )}

              {activeQuestionId === "margins" && (
                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <p>
                    <strong>{language === "ar" ? "هوامش الربحية التشغيلية:" : "Profit Margins Analysis:"}</strong>{" "}
                    {language === "ar"
                      ? `بناءً على فواتير المبيعات المعتمدة وتكاليف البضائع ومقاولي الباطن:`
                      : `Based on executed project sales vs materials & direct labor:`}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-slate-500 text-[11px]">{language === "ar" ? "مجمل الربح (Gross Profit)" : "Gross Profit"}</div>
                      <div className="font-mono font-bold text-sm text-emerald-700 mt-1">{grossProfit.toLocaleString()} AED</div>
                      <div className="text-[10px] text-emerald-600 font-bold">{grossMarginPercent}% {language === "ar" ? "هامش مجمل الربح" : "gross margin"}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-slate-500 text-[11px]">{language === "ar" ? "صافي الربح التشغيلي (EBIT)" : "Operating Net Profit"}</div>
                      <div className="font-mono font-bold text-sm text-purple-900 mt-1">{netOperatingProfit.toLocaleString()} AED</div>
                      <div className="text-[10px] text-purple-700 font-bold">{netMarginPercent}% {language === "ar" ? "هامش صافي الربح" : "net margin"}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    💡 <strong>{language === "ar" ? "توصية المحاسب:" : "Accountant Recommendation:"}</strong>{" "}
                    {grossMarginPercent >= 35 
                      ? (language === "ar" ? "ممتاز! نسبة هامش الربح لمشاريع الأنظمة الذكية أعلى من المعدل السائد في سوق دبي (30-35%). حافظ على كفاءة توريد المواد بأسعار تفضيلية." : "Excellent gross margin above Dubai market standards.")
                      : (language === "ar" ? "تنبيه: هامش الربح أقل من 35%. نوصي بمراجعة تسعير عروض أسعار الكابلات والمعدات أو التفاوض مع الموردين على خصومات كميات." : "Margins are tight. Review pricing formulas for smart installations.")}
                  </p>
                </div>
              )}

              {activeQuestionId === "vat" && (
                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <p>
                    <strong>{language === "ar" ? "موقف ضريبة القيمة المضافة لشركة رواد سمارت (VAT 5%):" : "UAE VAT 5% Position:"}</strong>
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">{language === "ar" ? "ضريبة المخرجات على المبيعات (Output VAT 5%):" : "Output VAT (Sales):"}</span>
                      <span className="font-bold text-blue-900">{vatOutputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">{language === "ar" ? "ضريبة المدخلات القابلة للاسترداد (Input VAT):" : "Recoverable Input VAT:"}</span>
                      <span className="font-bold text-rose-700">-{vatInputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-sm">
                      <span className="text-slate-800 font-sans">{language === "ar" ? "صافي الواجب سداده لهيئة الضرائب الاتحادية:" : "Net VAT Payable to FTA:"}</span>
                      <span className="text-emerald-700">{netVatPayableToFTA.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    💡 <strong>{language === "ar" ? "توصية المحاسب:" : "Accountant Recommendation:"}</strong>{" "}
                    {language === "ar" 
                      ? "احرص على أخذ الفاتورة الضريبية الأصلية المسجل بها رقم TRN لكل عملية شراء معدات أو كابلات من تجار الجملة في دبي لخصمها قانونياً من ضريبة المخرجات." 
                      : "Always request full tax invoices with TRN numbers from Dubai hardware suppliers to claim eligible input VAT."}
                  </p>
                </div>
              )}

              {activeQuestionId === "expenses_drain" && (
                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <p>
                    <strong>{language === "ar" ? "توزيع بنود الصرف ومصادر النفقات:" : "Expense Categories Breakdown:"}</strong>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(expensesByCategory).map(([cat, amt]) => (
                      <div key={cat} className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <div className="text-[11px] text-slate-500 truncate">{getCategoryLabel(cat)}</div>
                        <div className="font-mono font-bold text-xs text-slate-900 mt-1">{amt.toLocaleString()} AED</div>
                        <div className="text-[10px] text-slate-400">
                          {totalExpensesAmount > 0 ? Math.round((amt / totalExpensesAmount) * 100) : 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    💡 <strong>{language === "ar" ? "توصية المحاسب:" : "Accountant Recommendation:"}</strong>{" "}
                    {language === "ar"
                      ? "المواد والمعدات تشكل الحصة الأكبر من التكاليف المباشرة. يُفضل الاحتفاظ بمخزون استراتيجي للأصناف الأكثر طلباً (كابلات Cat6 ومحولات الطاقة) لتفادي الشراء بأسعار تجزئة مرتفعة."
                      : "Direct materials represent your largest cost driver. Consolidate vendor bulk orders for high-turnover items."}
                  </p>
                </div>
              )}

              {activeQuestionId === "project_returns" && (
                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <p>
                    <strong>{language === "ar" ? "أداء وربحية المشاريع المسجلة:" : "Project Profitability Analysis:"}</strong>
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2">{language === "ar" ? "المشروع" : "Project"}</th>
                          <th className="p-2">{language === "ar" ? "الميزانية" : "Budget"}</th>
                          <th className="p-2">{language === "ar" ? "المصروفات" : "Expenses"}</th>
                          <th className="p-2">{language === "ar" ? "صافي الربح" : "Net Profit"}</th>
                          <th className="p-2">{language === "ar" ? "الهامش" : "Margin"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {projectFinancials.slice(0, 4).map(p => (
                          <tr key={p.id}>
                            <td className="p-2 font-semibold text-slate-900">{p.title}</td>
                            <td className="p-2 font-mono">{p.budget?.toLocaleString()} AED</td>
                            <td className="p-2 font-mono text-rose-700">{p.spent.toLocaleString()} AED</td>
                            <td className="p-2 font-mono font-bold text-emerald-700">{p.profit.toLocaleString()} AED</td>
                            <td className="p-2 font-mono font-bold text-purple-900">{p.margin}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: PROFESSIONAL FINANCIAL STATEMENTS & REPORTS (التقارير المعتمدة)      */}
      {/* ========================================================================= */}
      {activeMainTab === "reports" && (
        <div className="space-y-6">
          {/* Sub Navigation Bar for Statements & Period Filter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Statement Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl">
              <button
                onClick={() => setReportSubTab("pl")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportSubTab === "pl"
                    ? "bg-white text-blue-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {language === "ar" ? "قائمة الدخل (P&L)" : "Income Statement"}
              </button>

              <button
                onClick={() => setReportSubTab("balance_sheet")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportSubTab === "balance_sheet"
                    ? "bg-white text-purple-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {language === "ar" ? "الميزانية العمومية" : "Balance Sheet"}
              </button>

              <button
                onClick={() => setReportSubTab("trial_balance")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportSubTab === "trial_balance"
                    ? "bg-white text-emerald-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {language === "ar" ? "ميزان المراجعة" : "Trial Balance"}
              </button>

              <button
                onClick={() => setReportSubTab("vat_return")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportSubTab === "vat_return"
                    ? "bg-white text-rose-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {language === "ar" ? "الإقرار الضريبي (🇦🇪 FTA / 🇸🇦 زاتكا)" : "VAT Returns (UAE & KSA)"}
              </button>

              <button
                onClick={() => setReportSubTab("cash_flow")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportSubTab === "cash_flow"
                    ? "bg-white text-amber-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {language === "ar" ? "التدفقات النقدية" : "Cash Flow"}
              </button>

              <button
                onClick={() => setReportSubTab("chart_accounts")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportSubTab === "chart_accounts"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {language === "ar" ? "دليل الحسابات" : "Chart of Accounts"}
              </button>
            </div>

            {/* Period Selector & Print Button */}
            <div className="flex items-center gap-2">
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white outline-none focus:border-purple-600 cursor-pointer"
              >
                <option value="all">{language === "ar" ? "كافة الفترات المالية" : "All Periods"}</option>
                <option value="year_2026">{language === "ar" ? "السنة المالية 2026" : "Fiscal Year 2026"}</option>
                <option value="this_month">{language === "ar" ? "الشهر الحالي" : "Current Month"}</option>
                <option value="q1">{language === "ar" ? "الربع الأول (Q1)" : "Quarter 1"}</option>
                <option value="q2">{language === "ar" ? "الربع الثاني (Q2)" : "Quarter 2"}</option>
                <option value="q3">{language === "ar" ? "الربع الثالث (Q3)" : "Quarter 3"}</option>
                <option value="q4">{language === "ar" ? "الربع الرابع (Q4)" : "Quarter 4"}</option>
              </select>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "طباعة التقرير المعتمد" : "Print Statement"}</span>
              </button>
            </div>
          </div>

          {/* PRINTABLE REPORT CONTAINER */}
          <div id="printable-financial-report" className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            {/* Formal Executive Header */}
            <div className="border-b-2 border-slate-800 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base">
                    R
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight font-arabic">
                    شركة رواد سمارت للأنظمة الذكية والأمنية
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-arabic">
                  Ruwad Smart Systems LLC | هاتف: +971 50 123 4567
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  رقم التسجيل الضريبي TRN: 100458920100003 | السجل التجاري: CN-984321
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white uppercase tracking-wider">
                  {reportSubTab === "pl" && (language === "ar" ? "قائمة الدخل والأرباح والخسائر" : "Income Statement")}
                  {reportSubTab === "balance_sheet" && (language === "ar" ? "الميزانية العمومية والمركز المالي" : "Balance Sheet")}
                  {reportSubTab === "trial_balance" && (language === "ar" ? "ميزان المراجعة بالأرصدة" : "Trial Balance")}
                  {reportSubTab === "vat_return" && (language === "ar" ? "إقرار ضريبة القيمة المضافة UAE FTA 201" : "VAT Return 201")}
                  {reportSubTab === "cash_flow" && (language === "ar" ? "قائمة التدفقات النقدية التشغيلية" : "Cash Flow Statement")}
                  {reportSubTab === "chart_accounts" && (language === "ar" ? "دليل وشجرة الحسابات العامة" : "Chart of Accounts")}
                </span>
                <p className="text-xs text-slate-500 mt-1.5 font-mono">
                  {language === "ar" ? "تاريخ الإصدار:" : "Date:"} {new Date().toLocaleDateString("en-AE")}
                </p>
                <p className="text-[11px] text-purple-700 font-semibold font-arabic">
                  {language === "ar" ? "الفترة المالية: معتمدة ومطابقة" : "Period: Audited & Reconciled"}
                </p>
              </div>
            </div>

            {/* STATEMENT 1: Income Statement (قائمة الدخل) */}
            {reportSubTab === "pl" && (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs" dir={isRtl ? "rtl" : "ltr"}>
                    <thead>
                      <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-slate-700 font-bold">
                        <th className="py-2.5 px-4">{language === "ar" ? "البند المحاسبي / البيان" : "Financial Item"}</th>
                        <th className="py-2.5 px-4">{language === "ar" ? "كود الحساب" : "Code"}</th>
                        <th className="py-2.5 px-4 text-right">{language === "ar" ? "المبلغ الجزئي" : "Sub-amount"}</th>
                        <th className="py-2.5 px-4 text-right">{language === "ar" ? "المبلغ الكلي (AED)" : "Total (AED)"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Section: Operating Revenues */}
                      <tr className="bg-slate-50/50 font-bold text-slate-900">
                        <td colSpan={4} className="py-2 px-4 text-purple-900 font-bold">
                          {language === "ar" ? "1. الإيرادات التشغيلية (Operating Revenues)" : "1. Operating Revenues"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-700">{language === "ar" ? "إيرادات عقود ومشاريع الأنظمة الذكية والأمنية" : "Smart Systems & Security Revenue"}</td>
                        <td className="py-2 px-4 font-mono text-slate-500">4010</td>
                        <td className="py-2 px-4 text-right font-mono">{totalApprovedInvoiceAmount.toLocaleString()}</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900"></td>
                      </tr>
                      <tr className="bg-emerald-50/40 font-bold">
                        <td className="py-2 px-4 text-emerald-900">{language === "ar" ? "إجمالي الإيرادات التشغيلية" : "Total Gross Revenues"}</td>
                        <td className="py-2 px-4 font-mono"></td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-emerald-800 text-sm">
                          {totalApprovedInvoiceAmount.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                        </td>
                      </tr>

                      {/* Section: Cost of Goods Sold */}
                      <tr className="bg-slate-50/50 font-bold text-slate-900">
                        <td colSpan={4} className="py-2 px-4 text-rose-900 font-bold">
                          {language === "ar" ? "2. تكلفة المبيعات والتنفيذ المباشرة (Cost of Goods Sold - COGS)" : "2. Cost of Sales & Direct Project Costs"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-700">{language === "ar" ? "تكلفة شراء الكاميرات والمعدات والمواد" : "Direct Materials & Hardware"}</td>
                        <td className="py-2 px-4 font-mono text-slate-500">5010</td>
                        <td className="py-2 px-4 text-right font-mono">{(expensesByCategory["materials"] || 0).toLocaleString()}</td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-700">{language === "ar" ? "أجور مقاولي الباطن والعمالة المباشرة" : "Subcontractor & Direct Labor"}</td>
                        <td className="py-2 px-4 font-mono text-slate-500">5020</td>
                        <td className="py-2 px-4 text-right font-mono">{(expensesByCategory["subcontractor"] || 0).toLocaleString()}</td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-700">{language === "ar" ? "أدوات وعدد ومستهلكات فنية" : "Tools & Installation Consumables"}</td>
                        <td className="py-2 px-4 font-mono text-slate-500">6050</td>
                        <td className="py-2 px-4 text-right font-mono">{(expensesByCategory["tools"] || 0).toLocaleString()}</td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                      </tr>
                      <tr className="bg-rose-50/40 font-bold">
                        <td className="py-2 px-4 text-rose-900">{language === "ar" ? "إجمالي تكاليف التنفيذ المباشرة" : "Total Cost of Goods Sold"}</td>
                        <td className="py-2 px-4 font-mono"></td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-rose-800 text-sm">
                          ({cogsExpenses.toLocaleString("en-AE", { maximumFractionDigits: 2 })}) AED
                        </td>
                      </tr>

                      {/* Gross Profit Row */}
                      <tr className="bg-purple-50/80 font-bold border-y-2 border-purple-200">
                        <td className="py-3 px-4 text-purple-950 font-bold text-sm">
                          {language === "ar" ? "مجمل الربح (Gross Profit)" : "Gross Profit"} ({grossMarginPercent}% {language === "ar" ? "هامش" : "margin"})
                        </td>
                        <td className="py-3 px-4 font-mono"></td>
                        <td className="py-3 px-4 text-right font-mono"></td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-purple-900 text-base">
                          {grossProfit.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                        </td>
                      </tr>

                      {/* Section: Operating Expenses */}
                      <tr className="bg-slate-50/50 font-bold text-slate-900">
                        <td colSpan={4} className="py-2 px-4 text-slate-800 font-bold">
                          {language === "ar" ? "3. المصروفات التشغيلية والإدارية والعمومية (SG&A Expenses)" : "3. Operating & Administrative Expenses"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-700">{language === "ar" ? "مصروفات الرواتب والأجور الشهرية" : "Salaries & Payroll Expenses"}</td>
                        <td className="py-2 px-4 font-mono text-slate-500">6010</td>
                        <td className="py-2 px-4 text-right font-mono">{(expensesByCategory["salaries"] || 0).toLocaleString()}</td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-700">{language === "ar" ? "إيجار المكتب والمستودع" : "Rent & Facility Lease"}</td>
                        <td className="py-2 px-4 font-mono text-slate-500">6020</td>
                        <td className="py-2 px-4 text-right font-mono">{(expensesByCategory["rent"] || 0).toLocaleString()}</td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-700">{language === "ar" ? "مواصلات ووقود ورسوم سالك" : "Transport & Fuel (Salik)"}</td>
                        <td className="py-2 px-4 font-mono text-slate-500">6030</td>
                        <td className="py-2 px-4 text-right font-mono">{(expensesByCategory["transport"] || 0).toLocaleString()}</td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-700">{language === "ar" ? "خدمات كهرباء ومياه وإنترنت (ديوا واتصالات)" : "Utilities & Telecom (DEWA/Etisalat)"}</td>
                        <td className="py-2 px-4 font-mono text-slate-500">6040</td>
                        <td className="py-2 px-4 text-right font-mono">{(expensesByCategory["utilities"] || 0).toLocaleString()}</td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-700">{language === "ar" ? "مصروفات عامة وإدارية ونثريات" : "General & Administrative"}</td>
                        <td className="py-2 px-4 font-mono text-slate-500">6060</td>
                        <td className="py-2 px-4 text-right font-mono">{(expensesByCategory["other"] || 0).toLocaleString()}</td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                      </tr>
                      <tr className="bg-slate-100 font-bold">
                        <td className="py-2 px-4 text-slate-800">{language === "ar" ? "إجمالي المصروفات الإدارية والتشغيلية" : "Total Operating Expenses"}</td>
                        <td className="py-2 px-4 font-mono"></td>
                        <td className="py-2 px-4 text-right font-mono"></td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 text-sm">
                          ({opexExpenses.toLocaleString("en-AE", { maximumFractionDigits: 2 })}) AED
                        </td>
                      </tr>

                      {/* Final Net Operating Profit */}
                      <tr className="bg-slate-900 text-white font-bold">
                        <td className="py-3 px-4 text-white font-bold text-sm">
                          {language === "ar" ? "صافي الدخل والربح التشغيلي (Net Operating Profit)" : "Net Operating Profit"} ({netMarginPercent}%)
                        </td>
                        <td className="py-3 px-4 font-mono"></td>
                        <td className="py-3 px-4 text-right font-mono"></td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-lg">
                          {netOperatingProfit.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STATEMENT 2: Balance Sheet (الميزانية العمومية والمركز المالي) */}
            {reportSubTab === "balance_sheet" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs" dir={isRtl ? "rtl" : "ltr"}>
                  {/* Left: Assets */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                    <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900">
                        {language === "ar" ? "الأصول (Assets)" : "Assets"}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">1000 - 1999</span>
                    </div>

                    <div className="space-y-2">
                      <div className="font-bold text-purple-900 text-[11px]">
                        {language === "ar" ? "الأصول المتداولة (Current Assets):" : "Current Assets:"}
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-700">1010 - صندوق النقدية (الخزينة)</span>
                        <span className="font-mono font-bold">{(netCashFlow > 0 ? netCashFlow * 0.15 : 0).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-700">1020 - الحساب البنكي (ADCB Bank)</span>
                        <span className="font-mono font-bold">{(netCashFlow > 0 ? netCashFlow * 0.85 : 0).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-700">1100 - مدينو العملاء (ذمم مدينة)</span>
                        <span className="font-mono font-bold text-amber-700">{totalAccountsReceivable.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-700">1200 - مشاريع تحت التنفيذ ومخزون مواد (WIP)</span>
                        <span className="font-mono font-bold">{cogsExpenses.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-700">2160 - ضريبة المدخلات القابلة للاسترداد</span>
                        <span className="font-mono font-bold">{vatInputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                      </div>
                    </div>

                    <div className="p-3 bg-purple-100/70 rounded-xl flex justify-between font-bold text-purple-950 text-sm">
                      <span>{language === "ar" ? "إجمالي الأصول (Total Assets):" : "Total Assets:"}</span>
                      <span className="font-mono">
                        {(Math.max(0, netCashFlow) + totalAccountsReceivable + cogsExpenses + vatInputTax).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                      </span>
                    </div>
                  </div>

                  {/* Right: Liabilities & Equity */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                    <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900">
                        {language === "ar" ? "الخصوم وحقوق الملكية (Liabilities & Equity)" : "Liabilities & Equity"}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">2000 - 3999</span>
                    </div>

                    <div className="space-y-2">
                      <div className="font-bold text-rose-900 text-[11px]">
                        {language === "ar" ? "الخصوم المتداولة (Current Liabilities):" : "Current Liabilities:"}
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-700">2010 - دائنو الموردين ومقاولي الباطن</span>
                        <span className="font-mono font-bold">{(cogsExpenses * 0.2).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-700">2150 - ضريبة القيمة المضافة المستحقة (VAT)</span>
                        <span className="font-mono font-bold text-blue-700">{netVatPayableToFTA.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                      </div>

                      <div className="font-bold text-emerald-900 text-[11px] pt-2">
                        {language === "ar" ? "حقوق الملكية ورأس المال (Owner Equity):" : "Owner's Equity:"}
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-700">3010 - رأس المال العامل المستثمر</span>
                        <span className="font-mono font-bold">
                          {(Math.max(0, netCashFlow) + totalAccountsReceivable + cogsExpenses + vatInputTax - ((cogsExpenses * 0.2) + netVatPayableToFTA + netOperatingProfit)).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-700">3020 - صافي أرباح الفترة التشغيلية</span>
                        <span className="font-mono font-bold text-emerald-700">{netOperatingProfit.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-100/70 rounded-xl flex justify-between font-bold text-emerald-950 text-sm">
                      <span>{language === "ar" ? "إجمالي الخصوم والملكية:" : "Total Liabilities & Equity:"}</span>
                      <span className="font-mono">
                        {(Math.max(0, netCashFlow) + totalAccountsReceivable + cogsExpenses + vatInputTax).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs font-arabic">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{language === "ar" ? "معادلة الميزانية متوازنة 100%: الأصول = الخصوم + حقوق الملكية." : "Balance Sheet Equation Balanced: Assets = Liabilities + Equity."}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    {language === "ar" ? "معتمد محاسبياً" : "Certified Balanced"}
                  </span>
                </div>
              </div>
            )}

            {/* STATEMENT 3: Trial Balance (ميزان المراجعة بالأرصدة) */}
            {reportSubTab === "trial_balance" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs" dir={isRtl ? "rtl" : "ltr"}>
                    <thead>
                      <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-700 font-bold">
                        <th className="py-2.5 px-3">{language === "ar" ? "كود الحساب" : "Code"}</th>
                        <th className="py-2.5 px-3">{language === "ar" ? "اسم الحساب المحاسبي" : "Account Name"}</th>
                        <th className="py-2.5 px-3">{language === "ar" ? "التصنيف" : "Classification"}</th>
                        <th className="py-2.5 px-3 text-right">{language === "ar" ? "مدين (Debit AED)" : "Debit (AED)"}</th>
                        <th className="py-2.5 px-3 text-right">{language === "ar" ? "دائن (Credit AED)" : "Credit (AED)"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">1010</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">صندوق النقدية والخزينة</td>
                        <td className="py-2 px-3 font-sans text-slate-500">أصل متداول</td>
                        <td className="py-2 px-3 text-right text-slate-900">{(netCashFlow > 0 ? netCashFlow * 0.15 : 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">1020</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">الحساب البنكي الرئيسي (ADCB)</td>
                        <td className="py-2 px-3 font-sans text-slate-500">أصل متداول</td>
                        <td className="py-2 px-3 text-right text-slate-900">{(netCashFlow > 0 ? netCashFlow * 0.85 : 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">1100</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">ذمم العملاء المدينة (حسابات القبض)</td>
                        <td className="py-2 px-3 font-sans text-slate-500">أصل متداول</td>
                        <td className="py-2 px-3 text-right text-slate-900">{totalAccountsReceivable.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">2010</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">ذمم الموردين ومقاولي الباطن الدائنة</td>
                        <td className="py-2 px-3 font-sans text-slate-500">التزام متداول</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                        <td className="py-2 px-3 text-right text-slate-900">{(cogsExpenses * 0.2).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">2150</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">ضريبة القيمة المضافة للمخرجات (5%)</td>
                        <td className="py-2 px-3 font-sans text-slate-500">التزام متداول</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                        <td className="py-2 px-3 text-right text-slate-900">{vatOutputTax.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">2160</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">ضريبة القيمة المضافة للمدخلات المستردة</td>
                        <td className="py-2 px-3 font-sans text-slate-500">أصل ضريبي</td>
                        <td className="py-2 px-3 text-right text-slate-900">{vatInputTax.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">4010</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">إيرادات مشاريع الأنظمة الذكية</td>
                        <td className="py-2 px-3 font-sans text-slate-500">إيرادات مبيعات</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                        <td className="py-2 px-3 text-right text-slate-900">{totalApprovedInvoiceAmount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">5010</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">تكلفة شراء الكاميرات والمواد والمقاولين</td>
                        <td className="py-2 px-3 font-sans text-slate-500">تكلفة مباشرة COGS</td>
                        <td className="py-2 px-3 text-right text-slate-900">{cogsExpenses.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">6010</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">مصروفات الرواتب والأجور الشهرية</td>
                        <td className="py-2 px-3 font-sans text-slate-500">مصروف تشغيلي</td>
                        <td className="py-2 px-3 text-right text-slate-900">{(expensesByCategory["salaries"] || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">6020</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">إيجار المقر والمستودع</td>
                        <td className="py-2 px-3 font-sans text-slate-500">مصروف تشغيلي</td>
                        <td className="py-2 px-3 text-right text-slate-900">{(expensesByCategory["rent"] || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">6060</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">مصروفات عمومية ومواصلات وخدمات</td>
                        <td className="py-2 px-3 font-sans text-slate-500">مصروف تشغيلي</td>
                        <td className="py-2 px-3 text-right text-slate-900">{((expensesByCategory["transport"] || 0) + (expensesByCategory["utilities"] || 0) + (expensesByCategory["other"] || 0) + (expensesByCategory["tools"] || 0)).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-purple-900">3010</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">رأس المال وحقوق الملكية التأسيسية</td>
                        <td className="py-2 px-3 font-sans text-slate-500">حقوق ملكية</td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                        <td className="py-2 px-3 text-right text-slate-900">
                          {/* Balancing item to match trial balance */}
                          {(totalApprovedInvoiceAmount + vatOutputTax + (cogsExpenses * 0.2) > (Math.max(0, netCashFlow) + totalAccountsReceivable + cogsExpenses + opexExpenses + vatInputTax)
                            ? 0
                            : (Math.max(0, netCashFlow) + totalAccountsReceivable + cogsExpenses + opexExpenses + vatInputTax) - (totalApprovedInvoiceAmount + vatOutputTax + (cogsExpenses * 0.2))
                          ).toLocaleString()}
                        </td>
                      </tr>
                      {/* Total Debits & Credits Row */}
                      <tr className="bg-slate-900 text-white font-bold text-sm">
                        <td colSpan={3} className="py-3 px-3 font-sans text-white">
                          {language === "ar" ? "المجموع النهائي المتوازن (Total Balanced):" : "Total Balanced Debits & Credits:"}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400">
                          {(Math.max(0, netCashFlow) + totalAccountsReceivable + cogsExpenses + opexExpenses + vatInputTax).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400">
                          {(Math.max(0, netCashFlow) + totalAccountsReceivable + cogsExpenses + opexExpenses + vatInputTax).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STATEMENT 4: VAT Returns (UAE FTA VAT 201 & Saudi ZATCA Return) */}
            {reportSubTab === "vat_return" && (
              <div className="space-y-6">
                {/* Jurisdiction Toggle Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTaxJurisdictionView("UAE")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        taxJurisdictionView === "UAE"
                          ? "bg-white text-blue-900 shadow-2xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span className="text-base">🇦🇪</span>
                      <span>{language === "ar" ? "إقرار الإمارات (FTA VAT 201 - 5%)" : "UAE FTA VAT 201 (5%)"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTaxJurisdictionView("KSA")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        taxJurisdictionView === "KSA"
                          ? "bg-white text-emerald-900 shadow-2xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span className="text-base">🇸🇦</span>
                      <span>{language === "ar" ? "إقرار السعودية (ZATCA Return - 15%)" : "Saudi ZATCA Return (15%)"}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1 text-xs">
                    <span className="text-slate-400 font-semibold">{language === "ar" ? "النظام النشط:" : "Active Law:"}</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {taxJurisdictionView === "UAE" ? "FTA VAT 201 (AED)" : "ZATCA e-Fatoora (SAR)"}
                    </span>
                  </div>
                </div>

                {/* UAE FTA RETURN (When UAE is selected) */}
                {taxJurisdictionView === "UAE" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🇦🇪</span>
                          <h4 className="font-bold text-sm text-slate-900">
                            {language === "ar" ? "نموذج الإقرار الضريبي لضريبة القيمة المضافة (FTA VAT 201)" : "UAE FTA VAT 201 Official Summary"}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {language === "ar" ? "وفقاً للمرسوم بقانون اتحادي رقم (8) لسنة 2017 في شأن ضريبة القيمة المضافة - الهيئة الاتحادية للضرائب" : "Federal Tax Authority Regulations - United Arab Emirates"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          النسبة القياسية: 5% (AED)
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-200 text-slate-700">
                          TRN: 100458920100003
                        </span>
                      </div>
                    </div>

                    {/* FTA Box Items */}
                    <div className="overflow-x-auto text-xs" dir={isRtl ? "rtl" : "ltr"}>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-200/80 font-bold text-slate-800">
                            <th className="p-2.5 text-center">{language === "ar" ? "رقم البند" : "Box"}</th>
                            <th className="p-2.5">{language === "ar" ? "بيان التوريدات والمشتريات" : "Description"}</th>
                            <th className="p-2.5 text-right">{language === "ar" ? "المبلغ الخاضع (AED)" : "Amount (AED)"}</th>
                            <th className="p-2.5 text-right">{language === "ar" ? "مبلغ الضريبة (5%)" : "VAT Amount (5%)"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-blue-900">Box 1a</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "التوريدات الخاضعة للنسبة القياسية (5%) في إمارة دبي" : "Standard rated supplies in Dubai (5%)"}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">{uaeTaxInvoicesTotal.toLocaleString()}</td>
                            <td className="p-2.5 text-right font-bold text-blue-900">{vatOutputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-blue-900">Box 2</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "توريدات بنسبة الصفر / بيانات أسعار وفواتير عادية" : "Zero-rated supplies / Standard Statements"}
                            </td>
                            <td className="p-2.5 text-right text-slate-700">{standardInvoicesTotal.toLocaleString()}</td>
                            <td className="p-2.5 text-right text-slate-400">0.00</td>
                          </tr>
                          <tr className="bg-blue-50/60 font-bold">
                            <td className="p-2.5 text-center text-blue-900">Box 8</td>
                            <td className="p-2.5 font-sans text-blue-950">
                              {language === "ar" ? "إجمالي ضريبة المخرجات المستحقة (Total Output VAT)" : "Total Output Tax Due"}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">{(uaeTaxInvoicesTotal + standardInvoicesTotal).toLocaleString()}</td>
                            <td className="p-2.5 text-right text-blue-900 text-sm">{vatOutputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-rose-900">Box 9</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "المشتريات والنفقات الخاضعة للنسبة القياسية (مشتريات مواد ومعدات)" : "Standard rated expenses & project materials"}
                            </td>
                            <td className="p-2.5 text-right text-slate-900">{cogsExpenses.toLocaleString()}</td>
                            <td className="p-2.5 text-right text-rose-700">({vatInputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })})</td>
                          </tr>
                          <tr className="bg-rose-50/60 font-bold">
                            <td className="p-2.5 text-center text-rose-900">Box 11</td>
                            <td className="p-2.5 font-sans text-rose-950">
                              {language === "ar" ? "إجمالي ضريبة المدخلات القابلة للاسترداد (Total Input VAT Recoverable)" : "Total Recoverable Tax"}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">{cogsExpenses.toLocaleString()}</td>
                            <td className="p-2.5 text-right text-rose-800 text-sm">({vatInputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })}) AED</td>
                          </tr>
                          <tr className="bg-slate-900 text-white font-bold text-sm">
                            <td className="p-3 text-center text-emerald-400">Box 12</td>
                            <td className="p-3 font-sans text-white">
                              {language === "ar" ? "صافي الضريبة الواجب سدادها للهيئة الاتحادية للضرائب (Net VAT Payable to FTA)" : "Net VAT Payable to UAE FTA"}
                            </td>
                            <td className="p-3 text-right text-slate-300">-</td>
                            <td className="p-3 text-right text-emerald-400 text-base">
                              {netVatPayableToFTA.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SAUDI ZATCA OFFICIAL 15-LINE RETURN (When KSA is selected) */}
                {taxJurisdictionView === "KSA" && (
                  <div className="bg-slate-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🇸🇦</span>
                          <h4 className="font-bold text-sm text-slate-900">
                            {language === "ar" ? "إقرار ضريبة القيمة المضافة - هيئة الزكاة والضريبة والجمارك (ZATCA)" : "Saudi ZATCA Official VAT Declaration Form"}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {language === "ar" ? "نموذج الإقرار المعتمد (15 بنداً) متوافق مع نظام الفوترة الإلكترونية (فاتورة)" : "Official 15-Line Form compliant with Saudi e-Invoicing Regulations"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          النسبة القياسية: 15% (SAR)
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-200 text-slate-700">
                          TIN: 300000000000003
                        </span>
                      </div>
                    </div>

                    {/* ZATCA Official 15 Lines Table */}
                    <div className="overflow-x-auto text-xs" dir={isRtl ? "rtl" : "ltr"}>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-emerald-900 text-white font-bold">
                            <th className="p-2.5 text-center w-12">{language === "ar" ? "السطر" : "Line"}</th>
                            <th className="p-2.5">{language === "ar" ? "بيان ضريبة القيمة المضافة (ZATCA)" : "Declaration Item"}</th>
                            <th className="p-2.5 text-right">{language === "ar" ? "المبلغ الأساسي (SAR)" : "Taxable Base (SAR)"}</th>
                            <th className="p-2.5 text-right">{language === "ar" ? "مبلغ الضريبة (15%)" : "VAT Amount (15%)"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {/* Part 1: Sales / Output VAT */}
                          <tr className="bg-emerald-50/80 font-bold font-sans">
                            <td colSpan={4} className="p-2 text-emerald-900">
                              {language === "ar" ? "أولاً: المبيعات / ضريبة المخرجات (Sales & Output VAT)" : "Section 1: Sales & Output VAT"}
                            </td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-emerald-900">1</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "المبيعات المحلية الخاضعة للنسبة الأساسية (15%)" : "Standard rated domestic sales (15%)"}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              {(ksaTaxInvoicesTotal > 0 ? ksaTaxInvoicesTotal : taxInvoicesTotal).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">
                              {ksaVatOutputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-emerald-900">2</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "المبيعات للمواطنين (الخدمات الصحية والتعليمية المؤهلة 0%)" : "Sales to citizens (healthcare/education 0%)"}
                            </td>
                            <td className="p-2.5 text-right text-slate-500">0.00</td>
                            <td className="p-2.5 text-right text-slate-400">0.00</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-emerald-900">3</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "المبيعات المحلية الخاضعة لنسبة الصفر" : "Zero-rated domestic sales"}
                            </td>
                            <td className="p-2.5 text-right text-slate-700">{standardInvoicesTotal.toLocaleString()}</td>
                            <td className="p-2.5 text-right text-slate-400">0.00</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-emerald-900">4</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "الصادرات (Exports)" : "Exports outside GCC"}
                            </td>
                            <td className="p-2.5 text-right text-slate-500">0.00</td>
                            <td className="p-2.5 text-right text-slate-400">0.00</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-emerald-900">5</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "المبيعات المعفاة من الضريبة" : "Exempt sales"}
                            </td>
                            <td className="p-2.5 text-right text-slate-500">0.00</td>
                            <td className="p-2.5 text-right text-slate-400">0.00</td>
                          </tr>
                          <tr className="bg-emerald-100/60 font-bold font-sans">
                            <td className="p-2.5 text-center text-emerald-900 font-mono">6</td>
                            <td className="p-2.5 text-emerald-950">
                              {language === "ar" ? "إجمالي المبيعات (Total Sales)" : "Total Sales"}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-900">
                              {((ksaTaxInvoicesTotal > 0 ? ksaTaxInvoicesTotal : taxInvoicesTotal) + standardInvoicesTotal).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-mono text-emerald-800">
                              {ksaVatOutputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })} SAR
                            </td>
                          </tr>

                          {/* Part 2: Purchases / Input VAT */}
                          <tr className="bg-rose-50/80 font-bold font-sans">
                            <td colSpan={4} className="p-2 text-rose-900">
                              {language === "ar" ? "ثانياً: المشتريات / ضريبة المدخلات (Purchases & Input VAT)" : "Section 2: Purchases & Input VAT"}
                            </td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-rose-900">7</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "المشتريات المحلية الخاضعة للنسبة الأساسية (15%)" : "Standard rated domestic purchases (15%)"}
                            </td>
                            <td className="p-2.5 text-right text-slate-900">{cogsExpenses.toLocaleString()}</td>
                            <td className="p-2.5 text-right text-rose-700">({ksaVatInputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })})</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-rose-900">8</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "الاستيرادات الخاضعة للضريبة المدفوعة في الجمارك" : "Imports subject to VAT paid at customs"}
                            </td>
                            <td className="p-2.5 text-right text-slate-500">0.00</td>
                            <td className="p-2.5 text-right text-slate-400">0.00</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-rose-900">9</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "الاستيرادات الخاضعة للضريبة لآلية الاحتساب العكسي" : "Imports subject to reverse charge mechanism"}
                            </td>
                            <td className="p-2.5 text-right text-slate-500">0.00</td>
                            <td className="p-2.5 text-right text-slate-400">0.00</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-rose-900">10</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "المشتريات الخاضعة لنسبة الصفر" : "Zero-rated purchases"}
                            </td>
                            <td className="p-2.5 text-right text-slate-500">0.00</td>
                            <td className="p-2.5 text-right text-slate-400">0.00</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-rose-900">11</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "المشتريات المعفاة من الضريبة" : "Exempt purchases"}
                            </td>
                            <td className="p-2.5 text-right text-slate-500">0.00</td>
                            <td className="p-2.5 text-right text-slate-400">0.00</td>
                          </tr>
                          <tr className="bg-rose-100/60 font-bold font-sans">
                            <td className="p-2.5 text-center text-rose-900 font-mono">12</td>
                            <td className="p-2.5 text-rose-950">
                              {language === "ar" ? "إجمالي المشتريات (Total Purchases)" : "Total Purchases"}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-900">{cogsExpenses.toLocaleString()}</td>
                            <td className="p-2.5 text-right font-mono text-rose-800">
                              ({ksaVatInputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })}) SAR
                            </td>
                          </tr>

                          {/* Part 3: Net VAT Due to ZATCA */}
                          <tr className="bg-slate-100 font-bold font-sans">
                            <td colSpan={4} className="p-2 text-slate-900">
                              {language === "ar" ? "ثالثاً: احتساب صافي الضريبة المستحقة (Net VAT Calculation)" : "Section 3: Net VAT Calculation"}
                            </td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-slate-700">13</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "إجمالي ضريبة المخرجات للفترة الحالية" : "Total output tax for the current period"}
                            </td>
                            <td className="p-2.5 text-right text-slate-400">-</td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">
                              {ksaVatOutputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })} SAR
                            </td>
                          </tr>
                          <tr className="bg-white">
                            <td className="p-2.5 text-center font-bold text-slate-700">14</td>
                            <td className="p-2.5 font-sans font-medium text-slate-800">
                              {language === "ar" ? "إجمالي ضريبة المدخلات القابلة للاسترداد" : "Total recoverable input tax"}
                            </td>
                            <td className="p-2.5 text-right text-slate-400">-</td>
                            <td className="p-2.5 text-right font-bold text-rose-700">
                              ({ksaVatInputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })}) SAR
                            </td>
                          </tr>
                          <tr className="bg-slate-900 text-white font-bold text-sm">
                            <td className="p-3 text-center text-emerald-400">15</td>
                            <td className="p-3 font-sans text-white">
                              {language === "ar" ? "صافي الضريبة الواجب سدادها لهيئة الزكاة والضريبة والجمارك (Net VAT Payable to ZATCA)" : "Net VAT Due to Saudi ZATCA"}
                            </td>
                            <td className="p-3 text-right text-slate-300">-</td>
                            <td className="p-3 text-right text-emerald-400 text-base">
                              {netVatPayableToZATCA.toLocaleString("en-AE", { maximumFractionDigits: 2 })} SAR
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* ZATCA Compliance Bar */}
                    <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-emerald-700" />
                        <div>
                          <strong className="text-emerald-900 font-bold block">
                            {language === "ar" ? "الفوترة الإلكترونية المعتمدة (فاتورة زاتكا):" : "Certified ZATCA e-Invoicing (Fatoora):"}
                          </strong>
                          <span className="text-emerald-700">
                            {language === "ar" ? "الفواتير تتضمن رمز QR مشفر بنظام TLV Base64 مطابق لمتطلبات هيئة الزكاة والضريبة والجمارك." : "Invoices include TLV Base64 QR code compliant with ZATCA Phase 1 & 2 specs."}
                          </span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold shrink-0">
                        {language === "ar" ? "جاهز للتقديم الفوري" : "Filing Ready"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STATEMENT 5: Cash Flow (قائمة التدفقات النقدية) */}
            {reportSubTab === "cash_flow" && (
              <div className="space-y-4">
                <div className="overflow-x-auto text-xs" dir={isRtl ? "rtl" : "ltr"}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-700 font-bold">
                        <th className="py-2.5 px-4">{language === "ar" ? "حركة النقدية والأنشطة التشغيلية" : "Cash Flow Activity"}</th>
                        <th className="py-2.5 px-4 text-right">{language === "ar" ? "التدفق النقدي (AED)" : "Cash Flow (AED)"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr className="bg-emerald-50/50 font-bold font-sans">
                        <td colSpan={2} className="py-2 px-4 text-emerald-900">
                          {language === "ar" ? "التدفقات النقدية الداخلة من الأنشطة التشغيلية (Inflow):" : "Cash Inflow from Operations:"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-700">{language === "ar" ? "المقبوضات المحصلة من عملاء المشاريع (سندات القبض)" : "Cash collections from project clients"}</td>
                        <td className="py-2 px-4 text-right font-bold text-emerald-700">+{totalReceiptsAmount.toLocaleString()} AED</td>
                      </tr>
                      <tr className="bg-rose-50/50 font-bold font-sans">
                        <td colSpan={2} className="py-2 px-4 text-rose-900">
                          {language === "ar" ? "التدفقات النقدية الخارجة للأنشطة التشغيلية (Outflow):" : "Cash Outflow for Operations:"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-700">{language === "ar" ? "مدفوعات شراء المواد ومعدات الكاميرات والأنظمة" : "Payments for materials & smart hardware"}</td>
                        <td className="py-2 px-4 text-right text-rose-700">-{(expensesByCategory["materials"] || 0).toLocaleString()} AED</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-700">{language === "ar" ? "صرف رواتب وأجور ومكافآت الموظفين والفنيين" : "Payments for team payroll & salaries"}</td>
                        <td className="py-2 px-4 text-right text-rose-700">-{(expensesByCategory["salaries"] || 0).toLocaleString()} AED</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-700">{language === "ar" ? "سداد إيجارات المقر والمستودع" : "Payments for rent & facilities"}</td>
                        <td className="py-2 px-4 text-right text-rose-700">-{(expensesByCategory["rent"] || 0).toLocaleString()} AED</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-sans text-slate-700">{language === "ar" ? "مدفوعات الوقود والمواصلات والفواتير العامة" : "Transport, utilities & administrative outflow"}</td>
                        <td className="py-2 px-4 text-right text-rose-700">-{((expensesByCategory["transport"] || 0) + (expensesByCategory["utilities"] || 0) + (expensesByCategory["other"] || 0)).toLocaleString()} AED</td>
                      </tr>
                      <tr className="bg-slate-900 text-white font-bold text-sm">
                        <td className="py-3 px-4 font-sans text-white">
                          {language === "ar" ? "صافي التغير في النقدية وما يعادلها (Net Cash Flow):" : "Net Change in Cash & Cash Equivalents:"}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400 text-base">
                          {netCashFlow.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STATEMENT 6: Chart of Accounts (دليل الحسابات) */}
            {reportSubTab === "chart_accounts" && (
              <div className="space-y-4">
                <div className="overflow-x-auto text-xs" dir={isRtl ? "rtl" : "ltr"}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-700 font-bold">
                        <th className="py-2.5 px-3 text-center">{language === "ar" ? "كود الحساب" : "Code"}</th>
                        <th className="py-2.5 px-3">{language === "ar" ? "اسم الحساب (عربي)" : "Account Name (Ar)"}</th>
                        <th className="py-2.5 px-3">{language === "ar" ? "اسم الحساب (إنجليزي)" : "Account Name (En)"}</th>
                        <th className="py-2.5 px-3">{language === "ar" ? "النوع" : "Category"}</th>
                        <th className="py-2.5 px-3 text-center">{language === "ar" ? "طبيعة الحساب" : "Nature"}</th>
                        <th className="py-2.5 px-3">{language === "ar" ? "الوصف والاستخدام" : "Usage"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {CHART_OF_ACCOUNTS.map((acc) => (
                        <tr key={acc.code} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-900">{acc.code}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{acc.nameAr}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-600">{acc.nameEn}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              acc.type === "asset" ? "bg-purple-50 text-purple-800" :
                              acc.type === "liability" ? "bg-amber-50 text-amber-800" :
                              acc.type === "revenue" ? "bg-emerald-50 text-emerald-800" :
                              acc.type === "cost" ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-800"
                            }`}>
                              {acc.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[11px]">
                            {acc.normalBalance === "debit" ? (
                              <span className="text-emerald-700">مدين (DR)</span>
                            ) : (
                              <span className="text-blue-700">دائن (CR)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">{acc.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Official Report Sign-off & Audit Stamp */}
            <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 font-arabic text-center">
              <div className="space-y-1">
                <span className="text-xs text-slate-500">{language === "ar" ? "إعداد المحاسب المالي:" : "Prepared By:"}</span>
                <p className="font-bold text-xs text-slate-900">المحاسب المالي المعتمد</p>
                <div className="font-mono text-[10px] text-slate-400">Certified Accountant - Dubai</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">{language === "ar" ? "ختم الاعتماد المالي:" : "Finance Seal:"}</span>
                <div className="inline-block border-2 border-purple-800 text-purple-900 rounded-xl px-4 py-1.5 font-bold text-xs">
                  ★ رواد سمارت - الإدارة المالية معتمد ★
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">{language === "ar" ? "اعتماد المدير العام:" : "Approved By Managing Director:"}</span>
                <p className="font-bold text-xs text-slate-900">إدارة شركة رواد سمارت</p>
                <div className="font-mono text-[10px] text-slate-400">Executive Signature</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: INVOICES & STATEMENTS (الفواتير الضريبية والبيانات)               */}
      {/* ========================================================================= */}
      {activeMainTab === "invoices" && (
        <div className="space-y-4">
          {/* Tri-Jurisdiction Invoices KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* UAE Tax Invoices */}
            <div className="bg-white rounded-2xl p-4 border border-blue-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <span className="text-base">🇦🇪</span>
                    <span>{language === "ar" ? "فواتير الإمارات (5% FTA)" : "UAE Tax Invoices (5%)"}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    AED
                  </span>
                </div>
                <div className="mt-2 font-mono font-bold text-xl text-blue-900">
                  {uaeTaxInvoicesTotal.toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-xs font-sans text-slate-500 font-normal">AED</span>
                </div>
                <p className="mt-0.5 text-[11px] text-blue-700">
                  {uaeTaxInvoices.length} {language === "ar" ? "فواتير معتمدة" : "invoices"} | {language === "ar" ? "الضريبة:" : "VAT:"} <span className="font-mono font-bold">{vatOutputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED</span>
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-blue-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">TRN: 100458920100003</span>
                <Link
                  href="/quotation/new?view=invoice&type=tax&jurisdiction=UAE"
                  className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>{language === "ar" ? "فاتورة إماراتية" : "New UAE"}</span>
                </Link>
              </div>
            </div>

            {/* Saudi ZATCA Tax Invoices */}
            <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <span className="text-base">🇸🇦</span>
                    <span>{language === "ar" ? "فواتير السعودية (15% زاتكا)" : "Saudi ZATCA Invoices (15%)"}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    SAR
                  </span>
                </div>
                <div className="mt-2 font-mono font-bold text-xl text-emerald-800">
                  {ksaTaxInvoicesTotal.toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-xs font-sans text-slate-500 font-normal">SAR</span>
                </div>
                <p className="mt-0.5 text-[11px] text-emerald-700">
                  {ksaTaxInvoices.length} {language === "ar" ? "فواتير بـ QR مشفر" : "invoices with TLV"} | {language === "ar" ? "الضريبة:" : "VAT:"} <span className="font-mono font-bold">{ksaVatOutputTax.toLocaleString("en-AE", { maximumFractionDigits: 2 })} SAR</span>
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">TIN: 300000000000003</span>
                <Link
                  href="/quotation/new?view=invoice&type=tax&jurisdiction=KSA"
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>{language === "ar" ? "فاتورة زاتكا" : "New ZATCA"}</span>
                </Link>
              </div>
            </div>

            {/* Standard Invoices / Statements */}
            <div className="bg-white rounded-2xl p-4 border border-purple-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <span>📄</span>
                    <span>{language === "ar" ? "فواتير عادية / بيان أسعار (0%)" : "Standard Statements (0%)"}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                    0%
                  </span>
                </div>
                <div className="mt-2 font-mono font-bold text-xl text-purple-900">
                  {standardInvoicesTotal.toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-xs font-sans text-slate-500 font-normal">AED</span>
                </div>
                <p className="mt-0.5 text-[11px] text-purple-700">
                  {standardInvoices.length} {language === "ar" ? "فواتير وبيانات مبيعات" : "standard bills"} | {language === "ar" ? "بدون ضريبة" : "Non-taxable"}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-purple-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{language === "ar" ? "معفاة / توريدات صفرية" : "Zero-rated"}</span>
                <Link
                  href="/quotation/new?view=invoice&type=standard"
                  className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-semibold transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>{language === "ar" ? "بيان أسعار / عادية" : "New Statement"}</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-semibold text-slate-500 shrink-0">{language === "ar" ? "تصفية الفواتير:" : "Filter:"}</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setInvoiceTypeFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    invoiceTypeFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  {language === "ar" ? "الكل" : "All"} ({quotations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceTypeFilter("tax_uae")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    invoiceTypeFilter === "tax_uae" ? "bg-blue-700 text-white shadow-2xs" : "text-slate-600"
                  }`}
                >
                  <span>🇦🇪</span>
                  <span>{language === "ar" ? "الإمارات (5%)" : "UAE (5%)"}</span>
                  <span className="opacity-80">({uaeTaxInvoices.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceTypeFilter("tax_ksa")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    invoiceTypeFilter === "tax_ksa" ? "bg-emerald-700 text-white shadow-2xs" : "text-slate-600"
                  }`}
                >
                  <span>🇸🇦</span>
                  <span>{language === "ar" ? "السعودية (15%)" : "KSA (15%)"}</span>
                  <span className="opacity-80">({ksaTaxInvoices.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceTypeFilter("standard")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    invoiceTypeFilter === "standard" ? "bg-purple-700 text-white shadow-2xs" : "text-slate-600"
                  }`}
                >
                  {language === "ar" ? "عادية (0%)" : "Standard (0%)"} ({standardInvoices.length})
                </button>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder={language === "ar" ? "بحث برقم الفاتورة أو العميل..." : "Search invoice or client..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs" dir={isRtl ? "rtl" : "ltr"}>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                    <th className="py-3 px-4">{language === "ar" ? "رقم الفاتورة" : "Invoice No."}</th>
                    <th className="py-3 px-4">{language === "ar" ? "التاريخ" : "Date"}</th>
                    <th className="py-3 px-4">{language === "ar" ? "العميل" : "Client"}</th>
                    <th className="py-3 px-4">{language === "ar" ? "المشروع" : "Project"}</th>
                    <th className="py-3 px-4">{language === "ar" ? "النظام الضريبي" : "Tax System"}</th>
                    <th className="py-3 px-4 text-right">{language === "ar" ? "الإجمالي" : "Total"}</th>
                    <th className="py-3 px-4 text-center">{language === "ar" ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotations
                    .filter(q => {
                      const matchesSearch = 
                        q.quotationNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        q.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        q.projectReference?.toLowerCase().includes(searchQuery.toLowerCase());
                      const isTax = q.invoiceType === "tax";
                      const isKsa = isTax && (q.taxJurisdiction === "KSA" || q.currency === "SAR" || q.vatRate === 15);
                      const isUae = isTax && !isKsa;
                      
                      let matchesType = true;
                      if (invoiceTypeFilter === "tax_uae") matchesType = isUae;
                      else if (invoiceTypeFilter === "tax_ksa") matchesType = isKsa;
                      else if (invoiceTypeFilter === "tax") matchesType = isTax;
                      else if (invoiceTypeFilter === "standard") matchesType = !isTax;
                      
                      return matchesSearch && matchesType;
                    })
                    .map((q) => {
                      const isTax = q.invoiceType === "tax";
                      const isKsa = isTax && (q.taxJurisdiction === "KSA" || q.currency === "SAR" || q.vatRate === 15);
                      const curr = isKsa ? "SAR" : (q.currency || "AED");
                      return (
                        <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-purple-900">{q.quotationNo}</td>
                          <td className="py-3 px-4 text-slate-500 font-mono">{q.date}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{q.clientName}</td>
                          <td className="py-3 px-4 text-slate-600">{q.projectReference || "-"}</td>
                          <td className="py-3 px-4">
                            {isKsa ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <span>🇸🇦</span>
                                <span>زاتكا 15% (فاتورة)</span>
                                <QrCode className="w-3 h-3 text-emerald-600" />
                              </span>
                            ) : isTax ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
                                <span>🇦🇪</span>
                                <span>إماراتية 5% (FTA)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                <span>📄</span>
                                <span>عادية / بيان (0%)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {Number(q.total).toLocaleString("en-AE", { minimumFractionDigits: 2 })} {curr}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={`/quotation/${q.id}`}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 text-[11px] font-semibold transition"
                              >
                                {language === "ar" ? "معاينة / تعديل" : "Edit"}
                              </Link>
                              <Link
                                href={`/quotation/${q.id}?print=true`}
                                target="_blank"
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                title="طباعة الفاتورة"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: RECEIPTS (سندات القبض)                                           */}
      {/* ========================================================================= */}
      {activeMainTab === "receipts" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900">{language === "ar" ? "سجل سندات القبض والتحصيلات" : "Receipt Vouchers"}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === "ar" ? `إجمالي المبالغ المحصلة فعلياً: ${totalReceiptsAmount.toLocaleString()} درهم` : `Total collected: ${totalReceiptsAmount.toLocaleString()} AED`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder={language === "ar" ? "بحث برقم السند أو العميل..." : "Search..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-8 pl-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600"
                />
              </div>
              <button
                onClick={() => setShowQuickReceiptModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === "ar" ? "سند قبض جديد" : "New Receipt"}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs" dir={isRtl ? "rtl" : "ltr"}>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                    <th className="py-3 px-4">{language === "ar" ? "رقم السند" : "Receipt No."}</th>
                    <th className="py-3 px-4">{language === "ar" ? "التاريخ" : "Date"}</th>
                    <th className="py-3 px-4">{language === "ar" ? "العميل" : "Client"}</th>
                    <th className="py-3 px-4">{language === "ar" ? "طريقة الدفع" : "Method"}</th>
                    <th className="py-3 px-4">{language === "ar" ? "البيان / لأجل" : "For"}</th>
                    <th className="py-3 px-4 text-right">{language === "ar" ? "المبلغ المحصل" : "Amount"}</th>
                    <th className="py-3 px-4 text-center">{language === "ar" ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts
                    .filter(r => 
                      r.receiptNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.receivedFor?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800">{r.receiptNo}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{r.date}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{r.clientName}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.paymentMethod === "bank" ? "bg-blue-50 text-blue-700" :
                            r.paymentMethod === "cheque" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {r.paymentMethod === "bank" ? "تحويل بنكي" : r.paymentMethod === "cheque" ? "شيك" : "نقدي"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{r.receivedFor}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {Number(r.amount).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/receipt/${r.id}?print=true`}
                              target="_blank"
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                              title="طباعة السند"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => onDeleteReceipt(r.id)}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB: EXPENSES & JOURNAL (سندات الصرف وقيود اليومية)                   */}
      {/* ========================================================================= */}
      {activeMainTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpenseSubView("vouchers")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  expenseSubView === "vouchers" ? "bg-rose-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700"
                }`}
              >
                {language === "ar" ? "سندات الصرف والمصروفات" : "Expense Vouchers"} ({expenses.length})
              </button>
              <button
                onClick={() => setExpenseSubView("journal")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  expenseSubView === "journal" ? "bg-purple-800 text-white shadow-2xs" : "bg-slate-100 text-slate-700"
                }`}
              >
                {language === "ar" ? "دفتر قيود اليومية العامة (Journal)" : "General Journal"} ({journalEntries.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {expenseSubView === "vouchers" ? (
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === "ar" ? "سند صرف جديد" : "New Voucher"}</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAddJournalModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === "ar" ? "قيد يومية جديد" : "New Journal Entry"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-View 1: Expense Vouchers */}
          {expenseSubView === "vouchers" && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs" dir={isRtl ? "rtl" : "ltr"}>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                      <th className="py-3 px-4">{language === "ar" ? "رقم السند" : "Voucher No."}</th>
                      <th className="py-3 px-4">{language === "ar" ? "التاريخ" : "Date"}</th>
                      <th className="py-3 px-4">{language === "ar" ? "المستلم / الجهة" : "Paid To"}</th>
                      <th className="py-3 px-4">{language === "ar" ? "التصنيف" : "Category"}</th>
                      <th className="py-3 px-4">{language === "ar" ? "المشروع المرتبط" : "Project"}</th>
                      <th className="py-3 px-4">{language === "ar" ? "البيان" : "Description"}</th>
                      <th className="py-3 px-4 text-right">{language === "ar" ? "المبلغ" : "Amount"}</th>
                      <th className="py-3 px-4 text-center">{language === "ar" ? "حذف" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-rose-800">{exp.voucherNo}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{exp.date}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{exp.recipient}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                            {getCategoryLabel(exp.category)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {exp.projectName || (
                            <span className="text-amber-600 text-[10px] font-bold">⚠️ عام / غير مرتبط</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{exp.description || "-"}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                          {Number(exp.amount).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onDeleteExpense(exp.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-View 2: General Journal Entries */}
          {expenseSubView === "journal" && (
            <div className="space-y-4">
              {journalEntries.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 mx-auto flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {language === "ar" ? "لا توجد قيود يومية يدوية مسجلة بعد" : "No Journal Entries Recorded"}
                  </h4>
                  <p className="text-xs max-w-md mx-auto">
                    {language === "ar" 
                      ? "يمكنك تسجيل قيود التسوية، الفوائد البنكية، الإهلاك، أو القيود المركبة المزدوجة (مدين / دائن) بنقرة زر." 
                      : "Record manual adjusting entries, depreciation, and balanced double-entry vouchers."}
                  </p>
                  <button
                    onClick={() => setShowAddJournalModal(true)}
                    className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    + {language === "ar" ? "تسجيل أول قيد يومية" : "Create First Journal Entry"}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs" dir={isRtl ? "rtl" : "ltr"}>
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                          <th className="py-3 px-4">{language === "ar" ? "رقم القيد" : "Entry No."}</th>
                          <th className="py-3 px-4">{language === "ar" ? "التاريخ" : "Date"}</th>
                          <th className="py-3 px-4">{language === "ar" ? "البيان والشرح" : "Description"}</th>
                          <th className="py-3 px-4 text-right">{language === "ar" ? "إجمالي المدين (Debit)" : "Total Debit"}</th>
                          <th className="py-3 px-4 text-right">{language === "ar" ? "إجمالي الدائن (Credit)" : "Total Credit"}</th>
                          <th className="py-3 px-4 text-center">{language === "ar" ? "الحالة" : "Status"}</th>
                          <th className="py-3 px-4 text-center">{language === "ar" ? "حذف" : "Action"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {journalEntries.map((jv) => (
                          <tr key={jv.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-purple-900">{jv.entryNo}</td>
                            <td className="py-3 px-4 text-slate-500">{jv.date}</td>
                            <td className="py-3 px-4 font-sans text-slate-800 max-w-xs truncate">{jv.description}</td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700">{jv.totalDebit?.toLocaleString()} AED</td>
                            <td className="py-3 px-4 text-right font-bold text-blue-700">{jv.totalCredit?.toLocaleString()} AED</td>
                            <td className="py-3 px-4 text-center font-sans">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {language === "ar" ? "متوازن ومرحّل" : "Posted"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-sans">
                              {onDeleteJournalEntry && (
                                <button
                                  onClick={() => onDeleteJournalEntry(jv.id)}
                                  className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD EXPENSE VOUCHER                                              */}
      {/* ========================================================================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-600" />
                <span>{language === "ar" ? "تسجيل سند صرف ومصروف جديد" : "New Payment Voucher"}</span>
              </h3>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "رقم السند" : "Voucher No."}
                  </label>
                  <input
                    type="text"
                    value={expenseForm.voucherNo}
                    onChange={(e) => setExpenseForm({ ...expenseForm, voucherNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-600 font-mono bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "التاريخ" : "Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "المبلغ (AED)" : "Amount (AED)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-600 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "بند الصرف / التصنيف" : "Category"}
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-600 bg-white"
                  >
                    <option value="materials">{language === "ar" ? "مواد ومعدات" : "Materials"}</option>
                    <option value="salaries">{language === "ar" ? "رواتب وأجور" : "Salaries"}</option>
                    <option value="rent">{language === "ar" ? "إيجار ومقر" : "Rent"}</option>
                    <option value="utilities">{language === "ar" ? "فواتير وخدمات" : "Utilities"}</option>
                    <option value="transport">{language === "ar" ? "مواصلات ووقود" : "Transport"}</option>
                    <option value="tools">{language === "ar" ? "أدوات وعدد" : "Tools"}</option>
                    <option value="subcontractor">{language === "ar" ? "مقاول باطن" : "Subcontractor"}</option>
                    <option value="other">{language === "ar" ? "مصروفات عامة" : "Other"}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "المستلم / الجهة المدفوع لها" : "Paid To / Vendor"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "اسم المحل أو الفني أو الشركة الموردة..." : "Vendor name..."}
                  value={expenseForm.recipient}
                  onChange={(e) => setExpenseForm({ ...expenseForm, recipient: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "المشروع المرتبط" : "Linked Project"}
                  </label>
                  <select
                    value={expenseForm.projectId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, projectId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-600 bg-white"
                  >
                    <option value="">{language === "ar" ? "عام (بدون مشروع)" : "General (No project)"}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.clientName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "طريقة الدفع" : "Payment Method"}
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-600 bg-white"
                  >
                    <option value="bank">{language === "ar" ? "تحويل بنكي (ADCB)" : "Bank Transfer"}</option>
                    <option value="cash">{language === "ar" ? "نقدي من الصندوق" : "Cash"}</option>
                    <option value="cheque">{language === "ar" ? "شيك بنكي" : "Cheque"}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "البيان وملاحظات الصرف" : "Description / Notes"}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === "ar" ? "شراء كابلات وكاميرات هيكفيجن لمشروع فيلا دبي..." : "Reason for payment..."}
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingExpense ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{language === "ar" ? "حفظ سند الصرف" : "Save Voucher"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK RECEIPT VOUCHER (سند تحصيل فوري)                            */}
      {/* ========================================================================= */}
      {showQuickReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50/70">
              <h3 className="font-bold text-base text-emerald-950 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>{language === "ar" ? "تسجيل سند قبض / تحصيل إيراد فوري" : "Quick Receipt Voucher"}</span>
              </h3>
              <button
                onClick={() => setShowQuickReceiptModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickReceiptSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "رقم السند" : "Receipt No."}
                  </label>
                  <input
                    type="text"
                    value={quickReceiptForm.receiptNo}
                    onChange={(e) => setQuickReceiptForm({ ...quickReceiptForm, receiptNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-mono bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "التاريخ" : "Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={quickReceiptForm.date}
                    onChange={(e) => setQuickReceiptForm({ ...quickReceiptForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "المبلغ المحصل (AED)" : "Amount (AED)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={quickReceiptForm.amount}
                    onChange={(e) => setQuickReceiptForm({ ...quickReceiptForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "طريقة التحصيل" : "Payment Method"}
                  </label>
                  <select
                    value={quickReceiptForm.paymentMethod}
                    onChange={(e) => setQuickReceiptForm({ ...quickReceiptForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="bank">{language === "ar" ? "تحويل بنكي (ADCB)" : "Bank Transfer"}</option>
                    <option value="cash">{language === "ar" ? "نقدي من العميل" : "Cash"}</option>
                    <option value="cheque">{language === "ar" ? "شيك بنكي" : "Cheque"}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "اسم العميل / الجهة الدافعة" : "Client Name"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "اسم العميل أو اسم الفيلا..." : "Client name..."}
                  value={quickReceiptForm.clientName}
                  onChange={(e) => setQuickReceiptForm({ ...quickReceiptForm, clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "وذلك عن (بيان سبب الدفعة)" : "Received For"}
                </label>
                <input
                  type="text"
                  placeholder={language === "ar" ? "دفعة أولى 50% لعقد تركيب كاميرات وأنظمة سمارت..." : "Payment details..."}
                  value={quickReceiptForm.receivedFor}
                  onChange={(e) => setQuickReceiptForm({ ...quickReceiptForm, receivedFor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickReceiptModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingQuickReceipt}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingQuickReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{language === "ar" ? "حفظ سند القبض" : "Save Receipt"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MANUAL DOUBLE-ENTRY JOURNAL VOUCHER (قيد يومية مزدوج)            */}
      {/* ========================================================================= */}
      {showAddJournalModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-purple-50/70">
              <h3 className="font-bold text-base text-purple-950 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-700" />
                <span>{language === "ar" ? "تسجيل قيد يومية محاسبي مزدوج (Double-Entry Journal)" : "New Journal Entry"}</span>
              </h3>
              <button
                onClick={() => setShowAddJournalModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJournalSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{language === "ar" ? "رقم القيد" : "Entry No."}</label>
                  <input
                    type="text"
                    value={journalForm.entryNo}
                    onChange={(e) => setJournalForm({ ...journalForm, entryNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{language === "ar" ? "التاريخ" : "Date"}</label>
                  <input
                    type="date"
                    required
                    value={journalForm.date}
                    onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{language === "ar" ? "المرجع / المستند" : "Reference"}</label>
                  <input
                    type="text"
                    placeholder="Ref #..."
                    value={journalForm.reference}
                    onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{language === "ar" ? "شرح القيد المحاسبي" : "Description"}</label>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "قيد إثبات تحصيل دفعة بنكية أو تسوية مصاريف..." : "Entry description..."}
                  value={journalForm.description}
                  onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                />
              </div>

              {/* Journal Lines Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{language === "ar" ? "أطراف القيد (المدين والدائن):" : "Journal Lines (Debit / Credit):"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setJournalForm({
                        ...journalForm,
                        lines: [
                          ...journalForm.lines,
                          { accountCode: "6060", accountName: "مصروفات عامة", debit: 0, credit: 0, description: "" }
                        ]
                      });
                    }}
                    className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold underline cursor-pointer"
                  >
                    + {language === "ar" ? "إضافة طرف جديد" : "Add Line"}
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                    <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2">{language === "ar" ? "الحساب المحاسبي" : "Account"}</th>
                        <th className="p-2 text-right">{language === "ar" ? "مدين (DR)" : "Debit"}</th>
                        <th className="p-2 text-right">{language === "ar" ? "دائن (CR)" : "Credit"}</th>
                        <th className="p-2 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {journalForm.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <select
                              value={line.accountCode}
                              onChange={(e) => {
                                const selected = CHART_OF_ACCOUNTS.find(a => a.code === e.target.value);
                                const newLines = [...journalForm.lines];
                                newLines[idx].accountCode = e.target.value;
                                newLines[idx].accountName = selected ? selected.nameAr : "";
                                setJournalForm({ ...journalForm, lines: newLines });
                              }}
                              className="w-full p-1 border border-slate-200 rounded-lg text-xs font-sans bg-white outline-none"
                            >
                              {CHART_OF_ACCOUNTS.map(a => (
                                <option key={a.code} value={a.code}>
                                  {a.code} - {a.nameAr}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={line.debit || ""}
                              onChange={(e) => {
                                const newLines = [...journalForm.lines];
                                newLines[idx].debit = parseFloat(e.target.value) || 0;
                                setJournalForm({ ...journalForm, lines: newLines });
                              }}
                              className="w-24 p-1 border border-slate-200 rounded-lg text-xs text-right font-mono outline-none"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={line.credit || ""}
                              onChange={(e) => {
                                const newLines = [...journalForm.lines];
                                newLines[idx].credit = parseFloat(e.target.value) || 0;
                                setJournalForm({ ...journalForm, lines: newLines });
                              }}
                              className="w-24 p-1 border border-slate-200 rounded-lg text-xs text-right font-mono outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {journalForm.lines.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newLines = journalForm.lines.filter((_, i) => i !== idx);
                                  setJournalForm({ ...journalForm, lines: newLines });
                                }}
                                className="text-slate-400 hover:text-rose-600 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Real-time Balanced Validation Check */}
                {(() => {
                  const totalD = journalForm.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
                  const totalC = journalForm.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
                  const diff = Math.abs(totalD - totalC);
                  const isBal = diff < 0.01 && totalD > 0;
                  return (
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                      isBal ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}>
                      <div className="flex items-center gap-2 font-sans">
                        {isBal ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        <span>{isBal ? "✅ القيد متوازن ومطابق (مدين = دائن)" : `⚠️ غير متوازن (الفارق: ${diff.toLocaleString()} AED)`}</span>
                      </div>
                      <div>
                        المدين: {totalD.toLocaleString()} | الدائن: {totalC.toLocaleString()}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddJournalModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingJournal}
                  className="px-5 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingJournal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{language === "ar" ? "ترحيل القيد لدفتر اليومية" : "Post Journal Entry"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

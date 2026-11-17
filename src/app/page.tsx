"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  Award,
  Plus,
  Search,
  Trash2,
  Edit,
  TrendingUp,
  DollarSign,
  Activity,
  ChevronRight,
  ExternalLink,
  Loader2,
  Paperclip,
  Languages,
  Globe,
  LogOut,
  Settings as SettingsIcon,
  Receipt as ReceiptIcon,
  PenTool,
  Download,
  Printer,
  Layers,
  Menu,
  X,
  FileCheck2,
  ScrollText,
  Mail,
  LayoutDashboard,
  CheckCircle2,
  Clock,
  Ban,
  ArrowUpRight,
  HardHat,
  BadgeCheck,
  Crown,
  ShieldCheck
} from "lucide-react";
import {
  getAllQuotations,
  getAllCertificates,
  deleteQuotation,
  deleteCertificate,
  Quotation,
  Certificate,
  getAllReceipts,
  deleteReceipt,
  Receipt,
  getSettings,
  Settings,
  Contract,
  getAllContracts,
  deleteContract,
  saveQuotation,
  saveContract,
  saveReceipt,
  saveCertificate,
  getAllOfficialLetters,
  deleteOfficialLetter,
  OfficialLetter,
  Expense,
  getAllExpenses,
  saveExpense,
  deleteExpense,
  Employee,
  getAllEmployees,
  saveEmployee,
  deleteEmployee,
  AttendanceRecord,
  getAllAttendance,
  saveAttendance,
  deleteAttendance,
  PayrollRecord,
  getAllPayrollRecords,
  savePayrollRecord,
  Project,
  getAllProjects,
  saveProject,
  deleteProject,
  JournalEntry,
  getAllJournalEntries,
  saveJournalEntry,
  deleteJournalEntry
} from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PriceListTable from "@/components/PriceListTable";
import { PRICE_LIST_ITEMS } from "@/data/priceList";
import AccountingModule from "@/components/AccountingModule";
import HRModule from "@/components/HRModule";
import ProjectsModule from "@/components/ProjectsModule";
import ReportsModule from "@/components/ReportsModule";
import PermissionsManagerModal from "@/components/PermissionsManagerModal";
import {
  RolePermissions,
  DEFAULT_EXECUTIVE_PERMISSIONS,
  DEFAULT_ACCOUNTING_PERMISSIONS,
  DEFAULT_OPERATIONS_PERMISSIONS
} from "@/lib/db";
import {
  Building2,
  BarChart3,
  Users,
  Briefcase,
  FileSpreadsheet
} from "lucide-react";

export default function Dashboard() {
  const { t, language, setLanguage, isRtl } = useLanguage();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [letters, setLetters] = useState<OfficialLetter[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [mainModule, setMainModule] = useState<"contracts" | "accounting" | "hr" | "projects" | "reports">("contracts");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [statusChanging, setStatusChanging] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"quotations" | "invoices" | "contracts" | "certificates" | "receipts" | "letters" | "priceList">("quotations");
  const [settingsLogo, setSettingsLogo] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 3 Dedicated Roles: Admin/Executive, Operations Employee, Accounting
  type AppRole = "admin" | "operations" | "accounting";
  const [currentRole, setCurrentRole] = useState<AppRole>("admin");
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<RolePermissions | null>(null);

  // Approval Invoicing Modal State
  const [approvedQuoteModal, setApprovedQuoteModal] = useState<{
    quote: Quotation;
    suffix: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_active_role") as AppRole;
      if (saved && (saved === "admin" || saved === "operations" || saved === "accounting")) {
        setCurrentRole(saved);
      }
      const savedPerms = localStorage.getItem("app_user_perms");
      if (savedPerms) {
        try {
          setUserPermissions(JSON.parse(savedPerms));
        } catch (e) { }
      }
    }
  }, []);

  const handleSwitchRole = (role: AppRole) => {
    setCurrentRole(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_active_role", role);
    }
    if (role === "operations" && (mainModule === "accounting" || mainModule === "reports")) {
      setMainModule("projects");
    } else if (role === "accounting" && (mainModule === "projects" || mainModule === "hr")) {
      setMainModule("accounting");
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [
          quotes,
          certs,
          recs,
          contrs,
          settingsVal,
          lettersVal,
          expensesVal,
          employeesVal,
          attendanceVal,
          payrollVal,
          projectsVal,
          journalVal
        ] = await Promise.all([
          getAllQuotations().catch(() => []),
          getAllCertificates().catch(() => []),
          getAllReceipts().catch(() => []),
          getAllContracts().catch(() => []),
          getSettings().catch(() => null),
          getAllOfficialLetters().catch(() => []),
          getAllExpenses().catch(() => []),
          getAllEmployees().catch(() => []),
          getAllAttendance().catch(() => []),
          getAllPayrollRecords().catch(() => []),
          getAllProjects().catch(() => []),
          getAllJournalEntries().catch(() => [])
        ]);

        setQuotations(quotes || []);
        setCertificates(certs || []);
        setReceipts(recs || []);
        setContracts(contrs || []);
        setLetters(lettersVal || []);
        setExpenses(expensesVal || []);
        setEmployees(employeesVal || []);
        setAttendance(attendanceVal || []);
        setPayroll(payrollVal || []);
        setProjects(projectsVal || []);
        setJournalEntries(journalVal || []);
        if (settingsVal) {
          setSettings(settingsVal);
          if (settingsVal.logoBase64) setSettingsLogo(settingsVal.logoBase64);
        }
      } catch (error) {
        console.error("Failed to load documents:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // CRUD Handlers for New Modules
  const handleSaveExpense = async (exp: Expense) => {
    await saveExpense(exp);
    const updated = await getAllExpenses().catch(() => []);
    setExpenses(updated || []);
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذا المصروف؟" : "Are you sure you want to delete this expense?")) {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleSaveReceipt = async (receipt: Receipt) => {
    await saveReceipt(receipt);
    const updated = await getAllReceipts().catch(() => []);
    setReceipts(updated || []);
  };

  const handleSaveJournalEntry = async (entry: JournalEntry) => {
    await saveJournalEntry(entry);
    const updated = await getAllJournalEntries().catch(() => []);
    setJournalEntries(updated || []);
  };

  const handleDeleteJournalEntry = async (id: string) => {
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف قيد اليومية هذا؟" : "Are you sure you want to delete this journal entry?")) {
      await deleteJournalEntry(id);
      setJournalEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleSaveEmployee = async (emp: Employee) => {
    await saveEmployee(emp);
    const updated = await getAllEmployees().catch(() => []);
    setEmployees(updated || []);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف بيانات هذا الموظف؟" : "Are you sure you want to delete this employee?")) {
      await deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleSaveAttendance = async (rec: AttendanceRecord) => {
    await saveAttendance(rec);
    const updated = await getAllAttendance().catch(() => []);
    setAttendance(updated || []);
  };

  const handleDeleteAttendance = async (id: string) => {
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف سجل الحضور هذا؟" : "Are you sure you want to delete this attendance record?")) {
      await deleteAttendance(id);
      setAttendance(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleSavePayroll = async (rec: PayrollRecord) => {
    await savePayrollRecord(rec);
    const updated = await getAllPayrollRecords().catch(() => []);
    setPayroll(updated || []);
  };

  const handleSaveProject = async (proj: Project) => {
    await saveProject(proj);
    const updated = await getAllProjects().catch(() => []);
    setProjects(updated || []);
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذا المشروع؟" : "Are you sure you want to delete this project?")) {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSaveQuotation = async (quote: Quotation) => {
    await saveQuotation(quote);
    setQuotations(prev => prev.map(q => q.id === quote.id ? quote : q));
  };

  const handleDeleteQuotation = async (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف عرض السعر هذا؟" : "Are you sure you want to delete this quotation?")) {
      await deleteQuotation(id);
      setQuotations(quotations.filter((q) => q.id !== id));
    }
  };

  const handleDeleteCertificate = async (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف شهادة إتمام العمل هذه؟" : "Are you sure you want to delete this work completion certificate?")) {
      await deleteCertificate(id);
      setCertificates(certificates.filter((c) => c.id !== id));
    }
  };

  const handleDeleteReceipt = async (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف سند القبض هذا؟" : "Are you sure you want to delete this receipt voucher?")) {
      await deleteReceipt(id);
      setReceipts(receipts.filter((r) => r.id !== id));
    }
  };

  const handleDeleteContract = async (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذا العقد؟" : "Are you sure you want to delete this contract?")) {
      await deleteContract(id);
      setContracts(contracts.filter((c) => c.id !== id));
    }
  };

  const handleDeleteLetter = async (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذا الخطاب الرسمي؟" : "Are you sure you want to delete this official letter?")) {
      await deleteOfficialLetter(id);
      setLetters(letters.filter((l) => l.id !== id));
    }
  };

  const handleStatusChange = async (quote: Quotation, newStatus: 'pending' | 'approved' | 'executed' | 'rejected' | 'cancelled') => {
    setStatusChanging(quote.id);
    try {
      const updatedQuote = {
        ...quote,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      await saveQuotation(updatedQuote);

      if (newStatus === 'approved') {
        const getSerialSuffix = (quoteNo: string) => {
          const match = quoteNo.match(/\d+/);
          return match ? match[0] : String(Math.floor(Math.random() * 90000) + 10000);
        };
        const suffix = getSerialSuffix(quote.quotationNo);

        // 1. Auto Contract Generation
        const existingContracts = await getAllContracts();
        const alreadyHasContract = existingContracts.some(c => c.quotationId === quote.id);

        if (!alreadyHasContract) {
          const contractNo = "C-" + suffix;
          const itemLines = quote.items.map(
            (item, i) => `${i + 1} - ${item.description.split('\n')[0]} (الكمية: ${item.qty} ${item.unit})`
          ).join('\n');

          const isCctvOnly = quote.items.every(item =>
            item.description.toLowerCase().includes('cctv') ||
            item.description.toLowerCase().includes('camera') ||
            item.description.includes('كاميرا')
          );
          const isSmartOnly = quote.items.every(item =>
            !item.description.toLowerCase().includes('cctv') &&
            !item.description.toLowerCase().includes('camera') &&
            !item.description.includes('كاميرا')
          );

          let generatedTitle = "عقد توريد وتركيب أنظمة كاميرات مراقبة والبيت الذكي";
          if (isCctvOnly) generatedTitle = "عقد توريد وتركيب أنظمة كاميرات مراقبة";
          else if (isSmartOnly) generatedTitle = "عقد توريد وتركيب أنظمة البيت الذكي (Smart Home)";

          const contractClauses = [
            {
              title: "البند الأول: نطاق العمل والخدمات",
              content: `1 - يتعهد الطرف الثاني بتوريد وتركيب وتشغيل نظام متكامل في موقع الطرف الأول وفقًا لعرض السعر رقم (${quote.quotationNo}) والبنود المذكورة أدناه:\n${itemLines}\n2 - يقوم الطرف الثاني بتدريب الطرف الأول أو من يرشحه على كيفية تشغيل النظام وإعداداته.\n3 - يقوم الطرف الثانى بضبط زوايا الرؤية، إعدادات التشغيل، وكشف الحركة والبرمجة بما يتوافق مع متطلبات العميل.\n4 - يقوم الطرف الثانى بتوصيل وتهيئة الأجهزة بالشبكة الداخلية أو الإنترنت وضمان التشغيل الكامل للنظام.`
            },
            {
              title: "البند الثاني: التكاليف وطريقة الدفع",
              content: `1. التكلفة الإجمالية:\nتبلغ قيمة العقد الإجمالية (${quote.total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} درهم إماراتي) شاملة توريد المعدات والتركيب والتشغيل.\n2. جدول الدفع:\n- 30% مقدّم عند توقيع العقد.\n- 30% بعد توريد المعدات.\n- 30% بعد إتمام التركيب.\n- 10% عند تجربة النظام والتشغيل بنجاح.\n3. الضرائب والرسوم:\nيتحمل الطرف الأول أية ضرائب أو رسوم حكومية أو بلدية تتعلق بتنفيذ العقد.`
            },
            {
              title: "البند الثالث: الضمان والصيانة",
              content: `1. مدة الضمان:\nيضمن الطرف الثاني المعدات لمدة 3 سنوات من تاريخ التسليم النهائي.\n2. شروط الضمان:\nيشمل الضمان إصلاح أو استبدال أي قطعة بها عيب مصنعي دون أي تكلفة إضافية.\n3. خدمات ما بعد البيع:\nيقدم الطرف الثاني خدمات الصيانة الدورية عند الطلب، مقابل رسوم يتم الاتفاق عليها لاحقًا (إن وجدت).`
            },
            {
              title: "البند الرابع: مدة العقد",
              content: `1. مدة التنفيذ:\nمدة تنفيذ الأعمال هي 4 شهور تبدأ من تاريخ استلام الدفعة المقدمة أو أمر المباشرة بالعمل.\n2. مدة الضمان:\nتسري فترة الضمان بعد التسليم النهائي.\n3. التجديد:\nيجوز للطرفين تجديد العقد بناءً على اتفاق خطي بينهما.`
            },
            {
              title: "البند الخامس: التزامات الأطراف",
              content: `التزامات الشركة (الطرف الثاني):\n- توريد معدات جديدة وأصلية مطابقة للمواصفات.\n- تنفيذ التركيب من خلال فنيين مختصين.\n- تسليم النظام بعد التشغيل الكامل والتأكد من كفاءة الأداء.\n- تقديم التدريب والدعم الفني اللازم.\n\nالتزامات العميل (الطرف الأول):\n- تهيئة موقع التركيب وتوفير مصادر الكهرباء والإنترنت.\n- تسهيل دخول الفنيين إلى الموقع في أوقات العمل.\n- الالتزام بسداد الدفعات في المواعيد المحددة.`
            },
            {
              title: "البند السادس: شروط الإنهاء",
              content: `1. يحق لأي طرف إنهاء العقد إذا أخل الطرف الآخر بأي من التزاماته بعد إشعاره خطيًا ومنحه مهلة (7) أيام لتصحيح الوضع.\n2. في حال الإلغاء قبل بدء التنفيذ، يتم خصم التكاليف الفعلية التي تكبدها الطرف الثاني.\n3. في حال الإنهاء بعد التنفيذ، لا يحق للطرف الأول استرداد المبالغ المدفوعة عن الأعمال المنجزة.`
            },
            {
              title: "البند السابع: المسؤولية وخصوصية البيانات",
              content: `1. حدود المسؤولية:\nلا يتحمل الطرف الثاني أي مسؤولية عن سوء استخدام النظام من قبل العميل أو أطراف أخرى.\n2. خصوصية البيانات:\nيتعهد الطرف الثاني بالمحافظة على سرية جميع التسجيلات والبيانات، وعدم الاطلاع عليها أو نسخها أو مشاركتها إلا بإذن خطي من الطرف الأول.`
            },
            {
              title: "البند الثامن: القانون الواجب التطبيق وحل النزاعات",
              content: `يخضع هذا العقد لأحكام القوانين السارية في دولة الإمارات العربية المتحدة.\nفى حال نشوء أي نزاع، يتم حله وديًا، وإذا تعذر ذلك، يُحال إلى الجهات القضائية المختصة في الدولة.`
            },
            {
              title: "البند التاسع: الموقع والتوقيع",
              content: `حرر هذا العقد في إمارة دبى بتاريخ ${new Date().toLocaleDateString("en-GB")} من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها.`
            }
          ];

          const newContract = {
            id: `contract-${Date.now()}`,
            contractNo: contractNo,
            date: new Date().toLocaleDateString("en-GB"),
            location: "دبى",
            title: generatedTitle,
            firstPartyName: quote.clientName,
            firstPartyPhone: quote.contactNo || "",
            firstPartyAddress: quote.locationArea || "",
            secondPartyName: quote.companyName || "مؤسسة رواد سمارت للأجهزة الذكية",
            secondPartyAddress: quote.companyAddress || "برج تشيرشل, مكتب 404, الخليج التجاري, دبي",
            secondPartyPhone: "+971 552067179",
            totalCost: quote.total,
            totalCostWords: "",
            clauses: contractClauses,
            firstPartySignName: "",
            firstPartySignDate: new Date().toLocaleDateString("en-GB"),
            secondPartySignName: "",
            secondPartySignDate: new Date().toLocaleDateString("en-GB"),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            quotationId: quote.id
          };

          await saveContract(newContract);
          const contrs = await getAllContracts();
          setContracts(contrs);
        }

        // 2. Auto Receipt Generation
        const existingReceipts = await getAllReceipts();
        const alreadyHasReceipt = existingReceipts.some(r => r.receiptNo === `R-${suffix}`);

        if (!alreadyHasReceipt) {
          const newReceipt: Receipt = {
            id: `receipt-${Date.now()}`,
            receiptNo: `R-${suffix}`,
            date: new Date().toLocaleDateString("en-GB"),
            clientName: quote.clientName,
            amount: quote.total,
            amountInWords: "",
            paymentMethod: "bank",
            receivedFor: `Payment for quotation ${quote.quotationNo} - ${quote.projectReference || ""}`,
            receivedBy: quote.preparedBy || "RUAAD SMART SMART MACHINE TRADING LLC",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await saveReceipt(newReceipt);
          const recs = await getAllReceipts();
          setReceipts(recs);
        }

        // 3. Auto Certificate Generation
        const existingCerts = await getAllCertificates();
        const alreadyHasCert = existingCerts.some(c => c.id === `cert-${suffix}`);

        if (!alreadyHasCert) {
          const certChecklist = quote.items.map((item, index) => ({
            id: `c-${index + 1}`,
            system: item.description.split('\n')[0],
            remarks: `${item.qty} ${item.unit}`,
            done: true
          }));

          const newCertificate: Certificate = {
            id: `cert-${suffix}`,
            project: quote.projectReference || `Project for ${quote.clientName}`,
            systemType: quote.items[0]?.description.split('\n')[0] || "Extra Low Voltage System",
            statement: `This is to certify that M/S ${quote.companyName || "RUAAD SMART SMART MACHINE TRADING LLC"} has completed the systems supply, installation, testing, and commissioning for the project mentioned above and handed it over within the stipulated period, and also maintained the quality of work.`,
            checklist: certChecklist,
            warrantyText: "Warranty starts from date of this certificate.",
            clientName: quote.clientName,
            clientDate: new Date().toLocaleDateString("en-GB"),
            integratorName: quote.companyName || "RUAAD SMART SMART MACHINE TRADING LLC",
            integratorDate: new Date().toLocaleDateString("en-GB"),
            address: quote.companyAddress || "Business Bay – Churchill Tower, Office 404 – Floor 4, Dubai, UAE",
            website: "ruaadsmart.ae",
            phone: "+971 552067179",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await saveCertificate(newCertificate);
          const certs = await getAllCertificates();
          setCertificates(certs);
        }

        // Trigger Instant Dual Invoicing & Companion Docs Modal
        setApprovedQuoteModal({ quote: updatedQuote, suffix });
      }

      setQuotations(prev => prev.map(q => q.id === quote.id ? { ...q, status: newStatus } : q));
    } catch (err) {
      console.error("Failed to update status:", err);
      alert(language === "ar" ? "فشل تحديث الحالة. يرجى المحاولة مرة أخرى." : "Failed to update status. Please try again.");
    } finally {
      setStatusChanging(null);
    }
  };

  // Stats Calculations
  const totalQuotationsVal = quotations.reduce((acc, q) => acc + (q.total || 0), 0);
  const totalCostVal = quotations.reduce((acc, q) => {
    const qCost = (q.items || []).reduce((sum, item) => sum + ((item.cost || 0) * (item.qty || 0)), 0);
    return acc + qCost;
  }, 0);
  const totalMarginVal = totalQuotationsVal - totalCostVal;
  const totalReceiptsVal = receipts.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const executedQuotesCount = quotations.filter(q => q.status === "executed" || q.status === "approved").length;

  // Operations Role Specific Stats
  const activeProjectsCount = projects.filter(p => p.status === "in_progress").length;
  const todayDateStr = new Date().toISOString().split("T")[0];
  const todayStaffPresent = attendance.filter(a => a.date === todayDateStr && (a.status === "present" || a.status === "half_day")).length;
  const pendingQuotationsCount = quotations.filter(q => q.status === "pending").length;

  // Accounting Role Specific Stats
  const totalReceivablesVal = Math.max(0, totalQuotationsVal - totalReceiptsVal);
  const estimatedVatOutput = quotations.filter(q => q.invoiceType === "tax").reduce((acc, q) => acc + ((q.total || 0) * 0.05 / 1.05), 0);

  // Search filtering
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const qLower = searchQuery.toLowerCase().trim();
      if (!qLower) return true;
      return (
        (q.clientName || "").toLowerCase().includes(qLower) ||
        (q.quotationNo || "").toLowerCase().includes(qLower) ||
        (q.projectReference || "").toLowerCase().includes(qLower)
      );
    });
  }, [quotations, searchQuery]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const qLower = searchQuery.toLowerCase().trim();
      if (!qLower) return true;
      return (
        (c.firstPartyName || "").toLowerCase().includes(qLower) ||
        (c.contractNo || "").toLowerCase().includes(qLower) ||
        (c.title || "").toLowerCase().includes(qLower)
      );
    });
  }, [contracts, searchQuery]);

  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      const qLower = searchQuery.toLowerCase().trim();
      if (!qLower) return true;
      return (
        (c.clientName || "").toLowerCase().includes(qLower) ||
        (c.project || "").toLowerCase().includes(qLower) ||
        (c.systemType || "").toLowerCase().includes(qLower)
      );
    });
  }, [certificates, searchQuery]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const qLower = searchQuery.toLowerCase().trim();
      if (!qLower) return true;
      return (
        (r.clientName || "").toLowerCase().includes(qLower) ||
        (r.receiptNo || "").toLowerCase().includes(qLower) ||
        (r.receivedFor || "").toLowerCase().includes(qLower)
      );
    });
  }, [receipts, searchQuery]);

  const filteredLetters = useMemo(() => {
    return letters.filter((l) => {
      const qLower = searchQuery.toLowerCase().trim();
      if (!qLower) return true;
      return (
        (l.letterNo || "").toLowerCase().includes(qLower) ||
        (l.addressedTo || "").toLowerCase().includes(qLower) ||
        (l.customTitle || "").toLowerCase().includes(qLower)
      );
    });
  }, [letters, searchQuery]);

  const navItems = [
    { id: "quotations", label: language === "ar" ? "عروض الأسعار" : "Quotations", count: quotations.length, icon: FileText, color: "text-purple-600" },
    { id: "invoices", label: language === "ar" ? "الفواتير الضريبية" : "Tax Invoices", count: quotations.length, icon: ReceiptIcon, color: "text-emerald-600" },
    { id: "contracts", label: language === "ar" ? "العقود والاتفاقيات" : "Contracts", count: contracts.length, icon: ScrollText, color: "text-blue-600" },
    { id: "certificates", label: language === "ar" ? "شهادات الإنجاز" : "Work Certificates", count: certificates.length, icon: Award, color: "text-amber-600" },
    { id: "receipts", label: language === "ar" ? "سندات القبض" : "Receipts", count: receipts.length, icon: DollarSign, color: "text-teal-600" },
    { id: "letters", label: language === "ar" ? "الخطابات الرسمية" : "Official Letters", count: letters.length, icon: Mail, color: "text-indigo-600" },
    { id: "priceList", label: language === "ar" ? "قائمة الأسعار والأصناف" : "Price List & Catalog", count: PRICE_LIST_ITEMS.length, icon: Layers, color: "text-purple-700" },
  ];

  const mainModulesList = [
    {
      id: "contracts" as const,
      label: language === "ar" ? "العقود والعمليات" : "Contracts & Ops",
      fullLabel: language === "ar" ? "إدارة العقود والعمليات والمستندات" : "Contracts & Operations Management",
      icon: ScrollText,
      badge: quotations.length + contracts.length,
      color: "text-purple-600",
      activeBg: "bg-purple-700 text-white shadow-xs"
    },
    {
      id: "accounting" as const,
      label: language === "ar" ? "المحاسبة والمالية" : "Accounting & Finance",
      fullLabel: language === "ar" ? "المحاسبة والمالية وسندات الصرف والقبض" : "Accounting & Financial Vouchers",
      icon: DollarSign,
      badge: receipts.length + expenses.length,
      color: "text-emerald-600",
      activeBg: "bg-emerald-600 text-white shadow-xs"
    },
    {
      id: "hr" as const,
      label: language === "ar" ? "الموارد البشرية والرواتب" : "HR & Payroll",
      fullLabel: language === "ar" ? "الموارد البشرية، الموظفين، الحضور والرواتب" : "HR, Employees, Attendance & Payroll",
      icon: Users,
      badge: employees.length,
      color: "text-blue-600",
      activeBg: "bg-blue-600 text-white shadow-xs"
    },
    {
      id: "projects" as const,
      label: language === "ar" ? "إدارة المشاريع" : "Projects Management",
      fullLabel: language === "ar" ? "إدارة المشاريع والمواقع ونسب الإنجاز" : "Projects, Work Progress & Site Logs",
      icon: Building2,
      badge: projects.length,
      color: "text-amber-600",
      activeBg: "bg-amber-600 text-white shadow-xs"
    },
    {
      id: "reports" as const,
      label: language === "ar" ? "التقارير والإحصائيات" : "Reports & Analytics",
      fullLabel: language === "ar" ? "التقارير اليومية والأسبوعية والشهرية" : "Daily, Weekly & Monthly Reports",
      icon: BarChart3,
      badge: "PDF",
      color: "text-rose-600",
      activeBg: "bg-rose-600 text-white shadow-xs"
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex" style={{ direction: isRtl ? "rtl" : "ltr" }}>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Modern Fixed Sidebar */}
      <aside className={`fixed inset-y-0 ${isRtl ? "right-0" : "left-0"} z-50 w-72 bg-white border-${isRtl ? "l" : "r"} border-slate-200 flex flex-col justify-between transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : (isRtl ? "translate-x-full" : "-translate-x-full")
        }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Brand Header */}
          <div className="p-5 border-b border-slate-150 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-14 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 flex items-center justify-center shadow-xs">
                <Image
                  src={settingsLogo || "/logo.png"}
                  alt="Ruaad Smart Logo"
                  fill
                  sizes="56px"
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">رواد سمارت</h1>
                <p className="text-[10px] text-purple-700 font-semibold tracking-wide">ذكاء يحمي عالمك</p>
              </div>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Nav List */}
          <nav className="p-3.5 space-y-1.5 flex-1 overflow-y-auto">
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {language === "ar" ? "أقسام النظام الأساسية" : "ERP System Modules"}
            </div>

            {/* 5 Main Modules Switcher */}
            <div className="space-y-1">
              {mainModulesList.map((m) => {
                const isSelected = mainModule === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMainModule(m.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${isSelected
                      ? "bg-slate-900 text-white font-semibold shadow-xs"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4.5 h-4.5 ${isSelected ? "text-purple-300" : m.color}`} />
                      <span>{m.label}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                      {m.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-menu when in contracts / ops module */}
            {mainModule === "contracts" && (
              <div className="pt-3 mt-3 border-t border-slate-150 space-y-1">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {language === "ar" ? "مستندات العمليات" : "Operations Docs"}
                </div>
                {navItems.map((item) => {
                  const active = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${active
                        ? "bg-purple-50 text-purple-900 font-bold border border-purple-200/80 shadow-2xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${active ? "text-purple-700" : item.color}`} />
                        <span>{item.label}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${active ? "bg-purple-200 text-purple-900 font-bold" : "bg-slate-100 text-slate-500"
                        }`}>
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-4 px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {language === "ar" ? "النظام والإعدادات" : "System"}
            </div>

            <Link
              href="/settings"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <SettingsIcon className="w-4.5 h-4.5 text-slate-500" />
                <span>{language === "ar" ? "إعدادات الشركة والشعار" : "Company & Logo Settings"}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            {/* Exclusive Executive Permissions Management Button */}
            {currentRole === "admin" && (
              <>
                <button
                  type="button"
                  onClick={() => setPermissionsModalOpen(true)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-50 via-amber-50/50 to-purple-50 text-purple-950 border border-purple-200 hover:border-purple-300 hover:shadow-2xs transition-all cursor-pointer mt-1"
                >
                  <div className="flex items-center gap-2.5">
                    <Crown className="w-4.5 h-4.5 text-amber-500" />
                    <span>{language === "ar" ? "صلاحيات وحسابات الموظفين" : "Staff Permissions & Roles"}</span>
                  </div>
                  <span className="text-[10px] bg-amber-400/20 border border-amber-400/30 text-amber-900 font-bold px-1.5 py-0.5 rounded">👑 VIP</span>
                </button>

                <Link
                  href="/security"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-slate-900 to-purple-950 text-white hover:from-purple-950 hover:to-indigo-950 transition-all shadow-2xs mt-1"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                    <span>{language === "ar" ? "جدار الحماية وسجل العمليات" : "Firewall & Audit Logs"}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded font-mono">WAF</span>
                </Link>
              </>
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-150 space-y-3 bg-slate-50/60">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-600" />
                <span>{language === "ar" ? "اللغة (Language)" : "Language (العربية)"}</span>
              </div>
              <span className="text-[11px] font-bold text-purple-700 font-mono">
                {language === "ar" ? "العربية" : "English"}
              </span>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>{t("logoutBtn")}</span>
            </button>

            <div className="text-center text-[10px] text-slate-400 font-arabic pt-1">
              مؤسسة رواد سمارت للأجهزة الذكية © 2026
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${isRtl ? "lg:mr-72" : "lg:ml-72"}`}>
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {mainModule === "contracts"
                    ? navItems.find(i => i.id === activeTab)?.label
                    : mainModulesList.find(m => m.id === mainModule)?.fullLabel}
                </h2>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {language === "ar" ? "نظام إدارة عمليات رواد سمارت المتكامل" : "Ruaad Smart Integrated Management ERP"}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons Header */}
            <div className="flex items-center gap-2">
              <Link
                href="/quotation/new"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs transition-all shadow-sm shadow-purple-700/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t("newQuotation")}</span>
              </Link>

              <Link
                href="/contract/new"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-2xs"
              >
                <Plus className="w-4 h-4 text-purple-700" />
                <span className="hidden sm:inline">{t("newContract")}</span>
              </Link>

              <Link
                href="/receipt/new"
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-2xs"
              >
                <Plus className="w-4 h-4 text-teal-600" />
                <span>{t("newReceipt")}</span>
              </Link>

              <Link
                href="/certificate/new"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-2xs"
              >
                <Plus className="w-4 h-4 text-amber-600" />
                <span>{t("newCertificate")}</span>
              </Link>

              <Link
                href="/letter/new"
                className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-2xs"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>{language === "ar" ? "خطاب جديد" : "New Letter"}</span>
              </Link>
            </div>
          </div>

          {/* 3 Dedicated Role-Based Cockpits Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 font-arabic">
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSwitchRole("admin")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${currentRole === "admin"
                  ? "bg-white text-purple-900 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
                title="لوحة تحكم الإدارة العليا والتنفيذية"
              >
                <span>👑 الإدارة العليا</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchRole("operations")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${currentRole === "operations"
                  ? "bg-white text-blue-900 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
                title="لوحة تحكم الموظف الإداري وإدارة العمليات"
              >
                <span>📋 الموظف الإداري (العمليات)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchRole("accounting")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${currentRole === "accounting"
                  ? "bg-white text-emerald-900 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
                title="لوحة تحكم الحسابات والمالية والفواتير"
              >
                <span>💰 الحسابات والمالية</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Contextual Role Explanation Pill */}
              <div className="text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  {currentRole === "admin" && "تحكم كامل بالإدارة: عروض الأسعار، العقود، هوامش الأرباح التقديرية، والاعتمادات الرسمية."}
                  {currentRole === "operations" && "تركيز الموظف الإداري: مراحل المشاريع، عمال وفنيي اليومية بالمواقع، ومتابعة عروض الأسعار."}
                  {currentRole === "accounting" && "تركيز الحسابات: إصدار الفواتير العادية والضريبية، سندات القبض والصرف، ومسير الرواتب والبونص."}
                </span>
              </div>

              {/* Exclusive Executive Permissions Control Button */}
              {currentRole === "admin" && (
                <>
                  <button
                    type="button"
                    onClick={() => setPermissionsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs shadow-xs hover:shadow-sm transition cursor-pointer shrink-0 border border-purple-600/30"
                    title="التحكم في صلاحيات وحسابات المحاسب والموظف الإداري"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>إدارة الصلاحيات</span>
                    <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-mono">👑</span>
                  </button>

                  <Link
                    href="/security"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs shadow-xs hover:shadow-sm transition cursor-pointer shrink-0 border border-slate-700"
                    title="جدار الحماية وسجل تدقيق العمليات"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>جدار الحماية والرقابة</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Top Quick Module Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-2.5">
            {mainModulesList.map((m) => {
              const isSelected = mainModule === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMainModule(m.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-purple-300" : m.color}`} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Dashboard Main Workspace */}
        <main className="p-4 sm:p-8 space-y-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <Loader2 className="w-8 h-8 text-purple-700 animate-spin" />
              <p className="text-slate-500 mt-3 text-sm">{language === "ar" ? "جاري تحميل البيانات..." : "Loading system data..."}</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-16 bg-red-50 border border-red-200 rounded-2xl shadow-2xs">
              <p className="text-red-700 font-medium">{language === "ar" ? "فشل تحميل البيانات. يرجى التحقق من الاتصال وإعادة التحميل." : "Failed to load data. Please check your connection and refresh."}</p>
              <button onClick={() => window.location.reload()} className="mt-3 text-xs text-purple-700 font-semibold underline hover:text-purple-900">{language === "ar" ? "إعادة تحميل" : "Refresh"}</button>
            </div>
          ) : (
            <>
              {/* Accounting & Finance Module */}
              {mainModule === "accounting" && (
                <AccountingModule
                  quotations={quotations}
                  receipts={receipts}
                  expenses={expenses}
                  projects={projects}
                  journalEntries={journalEntries}
                  onSaveExpense={handleSaveExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onDeleteReceipt={handleDeleteReceipt}
                  onSaveQuotation={handleSaveQuotation}
                  onSaveReceipt={handleSaveReceipt}
                  onSaveJournalEntry={handleSaveJournalEntry}
                  onDeleteJournalEntry={handleDeleteJournalEntry}
                />
              )}

              {/* HR & Payroll Module */}
              {mainModule === "hr" && (
                <HRModule
                  employees={employees}
                  attendance={attendance}
                  payroll={payroll}
                  projects={projects}
                  settings={settings}
                  onSaveEmployee={handleSaveEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  onSaveAttendance={handleSaveAttendance}
                  onDeleteAttendance={handleDeleteAttendance}
                  onSavePayroll={handleSavePayroll}
                  onSaveProject={handleSaveProject}
                  onOpenPermissionsModal={() => setPermissionsModalOpen(true)}
                />
              )}

              {/* Projects Management Module */}
              {mainModule === "projects" && (
                <ProjectsModule
                  projects={projects}
                  quotations={quotations}
                  contracts={contracts}
                  receipts={receipts}
                  expenses={expenses}
                  attendance={attendance}
                  certificates={certificates}
                  employees={employees}
                  onSaveProject={handleSaveProject}
                  onDeleteProject={handleDeleteProject}
                />
              )}

              {/* Comprehensive Reports Module */}
              {mainModule === "reports" && (
                <ReportsModule
                  quotations={quotations}
                  contracts={contracts}
                  receipts={receipts}
                  expenses={expenses}
                  employees={employees}
                  attendance={attendance}
                  payroll={payroll}
                  projects={projects}
                  settings={settings}
                />
              )}

              {/* Contracts & Operations Module */}
              {mainModule === "contracts" && (
                <div className="space-y-6">
                  {/* Dynamic Role-Based Overview Stat Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-arabic">
                    {/* OPERATIONS DASHBOARD CARDS */}
                    {currentRole === "operations" && (
                      <>
                        <div
                          onClick={() => setMainModule("projects")}
                          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-blue-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">المشاريع والمواقع النشطة</span>
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Building2 className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-2">
                            {activeProjectsCount} <span className="text-xs font-sans text-slate-500">مشروع جاري</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-blue-700 font-medium mt-2">
                            <Activity className="w-3.5 h-3.5" />
                            <span>متابعة مراحل التركيب والتنفيذ</span>
                          </div>
                        </div>

                        <div
                          onClick={() => setMainModule("hr")}
                          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-teal-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">حضور اليوم بالمواقع الميدانية</span>
                            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Clock className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-teal-700 mt-2">
                            {todayStaffPresent} <span className="text-xs font-sans text-slate-500">فني وعامل حاضر</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-teal-700 font-medium mt-2">
                            <HardHat className="w-3.5 h-3.5" />
                            <span>توزيع المواقع واليوميات</span>
                          </div>
                        </div>

                        <div
                          onClick={() => setActiveTab("quotations")}
                          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-purple-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">عروض أسعار قيد المتابعة</span>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <FileText className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-2">
                            {pendingQuotationsCount} <span className="text-xs font-sans text-slate-500">عرض معلق</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-purple-700 font-medium mt-2">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>متابعة موافقة العملاء</span>
                          </div>
                        </div>

                        <div
                          onClick={() => setActiveTab("certificates")}
                          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-amber-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">شهادات الإنجاز والتسليم</span>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Award className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-2">
                            {certificates.length} <span className="text-xs font-sans text-slate-500">شهادة تسليم</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-amber-700 font-medium mt-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>جاهزة للاعتماد والتسليم للعميل</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ACCOUNTING DASHBOARD CARDS */}
                    {currentRole === "accounting" && (
                      <>
                        <div
                          onClick={() => setActiveTab("invoices")}
                          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-purple-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">إجمالي الفواتير الصادرة</span>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <ReceiptIcon className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-900 mt-2">
                            {totalQuotationsVal.toLocaleString("en-AE", { maximumFractionDigits: 0 })} <span className="text-xs font-sans text-slate-500">AED</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-purple-700 font-medium mt-2">
                            <FileText className="w-3.5 h-3.5" />
                            <span>فواتير عادية وضريبية 5%</span>
                          </div>
                        </div>

                        <div
                          onClick={() => setActiveTab("receipts")}
                          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-emerald-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">المقبوضات المحصلة</span>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <DollarSign className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 mt-2">
                            {totalReceiptsVal.toLocaleString("en-AE", { maximumFractionDigits: 0 })} <span className="text-xs font-sans text-slate-500">AED</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium mt-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>سندات قبض معتمدة في البنك</span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all group">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">المستحقات غير المحصلة (ذمم)</span>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Clock className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-800 mt-2">
                            {totalReceivablesVal.toLocaleString("en-AE", { maximumFractionDigits: 0 })} <span className="text-xs font-sans text-slate-500">AED</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-amber-700 font-medium mt-2">
                            <Activity className="w-3.5 h-3.5" />
                            <span>ذمم عملاء قيد التحصيل</span>
                          </div>
                        </div>

                        <div
                          onClick={() => setMainModule("accounting")}
                          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-indigo-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ضريبة القيمة المضافة (VAT 201)</span>
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Layers className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-900 mt-2">
                            {estimatedVatOutput.toLocaleString("en-AE", { maximumFractionDigits: 0 })} <span className="text-xs font-sans text-slate-500">AED</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-indigo-700 font-medium mt-2">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            <span>مخرجات ضريبية 5% مسجلة</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* EXECUTIVE / ADMIN DASHBOARD CARDS */}
                    {currentRole === "admin" && (
                      <>
                        {/* Total Pipeline Card */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all group">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("pipelineValue")}</span>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <FileText className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-2">
                            {totalQuotationsVal.toLocaleString("en-AE", { maximumFractionDigits: 0 })} <span className="text-xs font-sans text-slate-500">AED</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-purple-700 font-medium mt-2">
                            <Activity className="w-3.5 h-3.5" />
                            <span>{quotations.length} {t("quotationsTab")}</span>
                          </div>
                        </div>

                        {/* Expected Margin Card */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all group">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("margin")}</span>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <TrendingUp className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 mt-2">
                            {totalMarginVal.toLocaleString("en-AE", { maximumFractionDigits: 0 })} <span className="text-xs font-sans text-slate-500">AED</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium mt-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{language === "ar" ? "هامش ربح تنفيذي معتمد" : "Approved Margin"}</span>
                          </div>
                        </div>

                        {/* Executed & Handover Card */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all group">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{language === "ar" ? "المشاريع المنفذة" : "Executed Projects"}</span>
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Award className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-2">
                            {executedQuotesCount} <span className="text-xs font-sans text-slate-500">{language === "ar" ? "مشروع" : "projects"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-blue-700 font-medium mt-2">
                            <ScrollText className="w-3.5 h-3.5" />
                            <span>{contracts.length} {t("contractsTab")} | {certificates.length} {t("certificatesTab")}</span>
                          </div>
                        </div>

                        {/* Catalog Items Card */}
                        <div
                          onClick={() => setActiveTab("priceList")}
                          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-purple-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{language === "ar" ? "قائمة الأصناف المعتمدة" : "Catalog Items"}</span>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Layers className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-2">
                            {PRICE_LIST_ITEMS.length} <span className="text-xs font-sans text-slate-500">{language === "ar" ? "صنف" : "items"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-amber-700 font-medium mt-2">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>{language === "ar" ? "تصفح قائمة الأسعار" : "Browse Price List"}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Search & Filter Header Bar */}
                  {activeTab !== "priceList" && (
                    <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-2xs flex items-center justify-between gap-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className={`w-4 h-4 absolute top-3 ${isRtl ? "right-3.5" : "left-3.5"} text-slate-400 pointer-events-none`} />
                        <input
                          type="text"
                          placeholder={t("searchPlaceholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${isRtl ? "pr-10 pl-4" : "pl-10 pr-4"
                            } py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20`}
                        />
                      </div>

                      <div className="text-xs text-slate-500 font-medium">
                        {language === "ar" ? "فرز حسب أحدث المستندات" : "Sorted by newest"}
                      </div>
                    </div>
                  )}

                  {/* Main Content Workspace Container */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
                    {/* Quotations Tab */}
                    {activeTab === "quotations" && (
                      filteredQuotations.length === 0 ? (
                        <div className="text-center py-16 px-4">
                          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <h3 className="text-base font-bold text-slate-800">{t("noQuotesFound")}</h3>
                          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                            {searchQuery ? (language === "ar" ? "لا توجد نتائج مطابقة لبحثك." : "No quotations match your search.") : (language === "ar" ? "ابدأ بإنشاء أول عرض سعر احترافي لعملائك." : "Start by creating your first quotation.")}
                          </p>
                          {!searchQuery && (
                            <Link
                              href="/quotation/new"
                              className="inline-flex items-center gap-2 mt-4 text-xs font-semibold bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded-xl text-white shadow-sm"
                            >
                              <Plus className="w-4 h-4" /> {t("newQuotation")}
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-600 font-semibold tracking-wider">
                                <th className="py-3.5 px-5">{t("quoteNo")}</th>
                                <th className="py-3.5 px-5">{t("clientName")}</th>
                                <th className="py-3.5 px-5">{t("date")}</th>
                                <th className="py-3.5 px-5 text-right">{t("total")}</th>
                                <th className="py-3.5 px-5 text-center">{t("status")}</th>
                                <th className="py-3.5 px-5 text-center">{t("actions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {filteredQuotations.map((quote) => {
                                const statusBg =
                                  quote.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    quote.status === "executed" ? "bg-purple-50 text-purple-700 border-purple-200" :
                                      quote.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" :
                                        quote.status === "cancelled" ? "bg-slate-100 text-slate-600 border-slate-200" :
                                          "bg-amber-50 text-amber-700 border-amber-200";

                                return (
                                  <tr key={quote.id} className="hover:bg-slate-50/70 transition-colors group">
                                    <td className="py-3.5 px-5 font-mono font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                      {quote.quotationNo}
                                    </td>
                                    <td className="py-3.5 px-5 font-medium text-slate-800">
                                      <div>{quote.clientName}</div>
                                      {quote.projectReference && (
                                        <div className="text-[11px] text-slate-400 font-normal">{quote.projectReference}</div>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-5 text-slate-500 text-xs">
                                      {quote.date}
                                    </td>
                                    <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
                                      {quote.total.toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-sans">AED</span>
                                    </td>
                                    <td className="py-3.5 px-5 text-center">
                                      <select
                                        disabled={statusChanging === quote.id}
                                        value={quote.status || "pending"}
                                        onChange={(e) => handleStatusChange(quote, e.target.value as any)}
                                        className={`text-xs font-semibold rounded-lg px-2.5 py-1 border outline-none cursor-pointer ${statusBg}`}
                                      >
                                        <option value="pending">{t("statusPending")}</option>
                                        <option value="approved">{t("statusApproved")}</option>
                                        <option value="executed">{t("statusExecuted")}</option>
                                        <option value="rejected">{t("statusRejected")}</option>
                                        <option value="cancelled">{t("statusCancelled")}</option>
                                      </select>
                                    </td>
                                    <td className="py-3.5 px-5 text-center">
                                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                        {/* Dual Instant Invoice Buttons if Approved */}
                                        {quote.status === "approved" && (
                                          <>
                                            <a
                                              href={`/quotation/${quote.id || quote.quotationNo}?view=invoice&type=standard&print=true`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] transition border border-indigo-200"
                                              title="استعراض / طباعة الفاتورة العادية (0% بيان أسعار)"
                                            >
                                              📄 عادية
                                            </a>
                                            <a
                                              href={`/quotation/${quote.id || quote.quotationNo}?view=invoice&type=tax&print=true`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[10px] transition border border-purple-200"
                                              title="استعراض / طباعة الفاتورة الضريبية (5% VAT)"
                                            >
                                              🧾 ضريبية
                                            </a>
                                          </>
                                        )}

                                        <Link
                                          href={`/quotation/${quote.id || quote.quotationNo}/view`}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                          title={language === "ar" ? "معاينة العرض" : "View"}
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </Link>
                                        <a
                                          href={`/quotation/${quote.id || quote.quotationNo}?print=true`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                                          title={language === "ar" ? "طباعة / تنزيل PDF" : "Print / PDF"}
                                        >
                                          <Printer className="w-4 h-4" />
                                        </a>
                                        <Link
                                          href={`/quotation/${quote.id || quote.quotationNo}`}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                          title={t("editTitle")}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Link>
                                        <button
                                          onClick={(e) => handleDeleteQuotation(quote.id, e)}
                                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                          title={t("deleteTitle")}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {/* Invoices Tab */}
                    {activeTab === "invoices" && (
                      filteredQuotations.length === 0 ? (
                        <div className="text-center py-16 px-4">
                          <ReceiptIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <h3 className="text-base font-bold text-slate-800">{language === "ar" ? "لا توجد فواتير" : "No Invoices Found"}</h3>
                          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                            {language === "ar" ? "يمكنك إنشاء فواتير ضريبية أو فواتير عادية بيان أسعار لعملائك بسهولة." : "You can generate tax invoices or standard bills easily."}
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <Link
                              href="/quotation/new?view=invoice&type=tax"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{language === "ar" ? "فاتورة ضريبية جديدة" : "New Tax Invoice"}</span>
                            </Link>
                            <Link
                              href="/quotation/new?view=invoice&type=standard"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{language === "ar" ? "فاتورة عادية / بيان" : "New Standard Bill"}</span>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {/* Header Action Row */}
                          <div className="p-3.5 border-b border-slate-150 flex items-center justify-between gap-3 bg-slate-50/60">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-semibold">{language === "ar" ? "أنواع الفواتير المتوفرة:" : "Available Invoices:"}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold">
                                🧾 {filteredQuotations.filter(q => q.invoiceType === "tax").length} {language === "ar" ? "ضريبية (5% VAT)" : "Tax"}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                                📄 {filteredQuotations.filter(q => q.invoiceType !== "tax").length} {language === "ar" ? "عادية / بيان (0%)" : "Standard"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href="/quotation/new?view=invoice&type=tax"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-2xs transition"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{language === "ar" ? "فاتورة ضريبية" : "Tax Invoice"}</span>
                              </Link>
                              <Link
                                href="/quotation/new?view=invoice&type=standard"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{language === "ar" ? "فاتورة عادية / بيان" : "Standard Bill"}</span>
                              </Link>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-600 font-semibold tracking-wider">
                                  <th className="py-3.5 px-5">{t("invoiceNo")}</th>
                                  <th className="py-3.5 px-5">{language === "ar" ? "نوع الفاتورة" : "Type"}</th>
                                  <th className="py-3.5 px-5">{t("clientName")}</th>
                                  <th className="py-3.5 px-5">{t("date")}</th>
                                  <th className="py-3.5 px-5 text-right">{language === "ar" ? "المجموع" : "Subtotal"}</th>
                                  <th className="py-3.5 px-5 text-right">{t("total")}</th>
                                  <th className="py-3.5 px-5 text-center">{language === "ar" ? "طباعة ومعاينة" : "Actions"}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredQuotations.map((quote) => {
                                  const isTax = quote.invoiceType === "tax";
                                  return (
                                    <tr key={quote.id} className="hover:bg-slate-50/70 transition-colors group">
                                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                        INV-{quote.quotationNo.replace(/\D/g, '') || quote.quotationNo}
                                      </td>
                                      <td className="py-3.5 px-5">
                                        <button
                                          onClick={() => handleSaveQuotation({
                                            ...quote,
                                            invoiceType: isTax ? "standard" : "tax",
                                            updatedAt: new Date().toISOString()
                                          })}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${isTax
                                            ? "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100"
                                            : "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
                                            }`}
                                          title={language === "ar" ? "انقر للتبديل بين ضريبية وعادية" : "Click to toggle type"}
                                        >
                                          <span>{isTax ? "🧾" : "📄"}</span>
                                          <span>{isTax ? (language === "ar" ? "ضريبية (5% VAT)" : "Tax (5%)") : (language === "ar" ? "عادية / بيان (0%)" : "Standard (0%)")}</span>
                                        </button>
                                      </td>
                                      <td className="py-3.5 px-5 font-medium text-slate-800">
                                        <div>{quote.clientName}</div>
                                        {quote.projectReference && (
                                          <div className="text-[11px] text-slate-400 font-normal">{quote.projectReference}</div>
                                        )}
                                      </td>
                                      <td className="py-3.5 px-5 text-slate-500 text-xs">
                                        {quote.date}
                                      </td>
                                      <td className="py-3.5 px-5 text-right font-mono text-slate-600 text-xs">
                                        {(quote.subtotal || quote.total).toLocaleString("en-AE", { maximumFractionDigits: 2 })} AED
                                      </td>
                                      <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-700">
                                        {quote.total.toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-sans">AED</span>
                                      </td>
                                      <td className="py-3.5 px-5 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          {/* Print Tax */}
                                          <a
                                            href={`/quotation/${quote.id}?view=invoice&type=tax&print=true`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                                            title={language === "ar" ? "طباعة فاتورة ضريبية معتمدة" : "Print Tax Invoice"}
                                          >
                                            <span className="text-xs font-bold">🧾</span>
                                          </a>
                                          {/* Print Standard / Bayan */}
                                          <a
                                            href={`/quotation/${quote.id}?view=invoice&type=standard&print=true`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                            title={language === "ar" ? "طباعة فاتورة عادية / بيان أسعار" : "Print Standard Bill"}
                                          >
                                            <span className="text-xs font-bold">📄</span>
                                          </a>
                                          {/* View */}
                                          <Link
                                            href={`/quotation/${quote.id}?view=invoice`}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                            title={language === "ar" ? "معاينة الفاتورة" : "View Invoice"}
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                          </Link>
                                          {/* Edit */}
                                          <Link
                                            href={`/quotation/${quote.id}`}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                            title={language === "ar" ? "تعديل الفاتورة" : "Edit Invoice"}
                                          >
                                            <Edit className="w-4 h-4" />
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
                      )
                    )}

                    {/* Contracts Tab */}
                    {activeTab === "contracts" && (
                      filteredContracts.length === 0 ? (
                        <div className="text-center py-16 px-4">
                          <ScrollText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <h3 className="text-base font-bold text-slate-800">{language === "ar" ? "لم يتم العثور على عقود" : "No Contracts Found"}</h3>
                          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                            {searchQuery ? (language === "ar" ? "لا توجد نتائج مطابقة." : "No matching contracts.") : (language === "ar" ? "أنشئ عقوداً رسمية وقانونية لعملائك بسهولة." : "Create formal legal contracts for your clients.")}
                          </p>
                          {!searchQuery && (
                            <Link
                              href="/contract/new"
                              className="inline-flex items-center gap-2 mt-4 text-xs font-semibold bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded-xl text-white shadow-sm"
                            >
                              <Plus className="w-4 h-4" /> {t("newContract")}
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-600 font-semibold tracking-wider">
                                <th className="py-3.5 px-5">{t("contractNo")}</th>
                                <th className="py-3.5 px-5">{language === "ar" ? "عنوان العقد" : "Contract Title"}</th>
                                <th className="py-3.5 px-5">{language === "ar" ? "الطرف الأول (العميل)" : "First Party"}</th>
                                <th className="py-3.5 px-5">{t("date")}</th>
                                <th className="py-3.5 px-5 text-right">{t("total")}</th>
                                <th className="py-3.5 px-5 text-center">{t("actions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {filteredContracts.map((contract) => (
                                <tr key={contract.id} className="hover:bg-slate-50/70 transition-colors group">
                                  <td className="py-3.5 px-5 font-mono font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                    {contract.contractNo}
                                  </td>
                                  <td className="py-3.5 px-5 font-medium text-slate-800">
                                    {contract.title}
                                  </td>
                                  <td className="py-3.5 px-5 text-slate-700">
                                    {contract.firstPartyName}
                                  </td>
                                  <td className="py-3.5 px-5 text-slate-500 text-xs">
                                    {contract.date}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
                                    {contract.totalCost?.toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-sans">AED</span>
                                  </td>
                                  <td className="py-3.5 px-5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Link
                                        href={`/contract/${contract.id}/sign`}
                                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                                        title={language === "ar" ? "رابط توقيع العميل" : "Client Sign"}
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </Link>
                                      <a
                                        href={`/contract/${contract.id}?print=true`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                                        title={language === "ar" ? "طباعة / تنزيل PDF" : "Print / PDF"}
                                      >
                                        <Printer className="w-4 h-4" />
                                      </a>
                                      <Link
                                        href={`/contract/${contract.id}`}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                        title={t("editTitle")}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Link>
                                      <button
                                        onClick={(e) => handleDeleteContract(contract.id, e)}
                                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                        title={t("deleteTitle")}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {/* Certificates Tab */}
                    {activeTab === "certificates" && (
                      filteredCertificates.length === 0 ? (
                        <div className="text-center py-16 px-4">
                          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <h3 className="text-base font-bold text-slate-800">{t("noCertsFound")}</h3>
                          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                            {searchQuery ? (language === "ar" ? "لا توجد نتائج مطابقة." : "No matching certificates.") : (language === "ar" ? "أنشئ شهادات تسليم واستلام الأعمال لتوثيق الجودة." : "Create work completion certificates.")}
                          </p>
                          {!searchQuery && (
                            <Link
                              href="/certificate/new"
                              className="inline-flex items-center gap-2 mt-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-xl text-white shadow-sm"
                            >
                              <Plus className="w-4 h-4" /> {t("newCertificate")}
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-600 font-semibold tracking-wider">
                                <th className="py-3.5 px-5">{t("projectClient")}</th>
                                <th className="py-3.5 px-5">{t("systemTechnology")}</th>
                                <th className="py-3.5 px-5">{t("completionDate")}</th>
                                <th className="py-3.5 px-5 text-center">{t("handedOver")}</th>
                                <th className="py-3.5 px-5 text-center">{t("actions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {filteredCertificates.map((cert) => (
                                <tr key={cert.id} className="hover:bg-slate-50/70 transition-colors group">
                                  <td className="py-3.5 px-5">
                                    <div className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{cert.project}</div>
                                    <div className="text-xs text-slate-500 font-normal">{cert.clientName}</div>
                                  </td>
                                  <td className="py-3.5 px-5 text-slate-700">
                                    {cert.systemType}
                                  </td>
                                  <td className="py-3.5 px-5 text-slate-500 text-xs">
                                    {cert.clientDate || cert.integratorDate}
                                  </td>
                                  <td className="py-3.5 px-5 text-center">
                                    {cert.clientSignature ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {language === "ar" ? "موقعة ومستلمة" : "Signed"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                        <Clock className="w-3.5 h-3.5" />
                                        {language === "ar" ? "بانتظار التوقيع" : "Pending Sign"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Link
                                        href={`/certificate/${cert.id}/sign`}
                                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                                        title={language === "ar" ? "رابط توقيع العميل" : "Client Sign"}
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </Link>
                                      <a
                                        href={`/certificate/${cert.id}?print=true`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                                        title={language === "ar" ? "طباعة / تنزيل PDF" : "Print / PDF"}
                                      >
                                        <Printer className="w-4 h-4" />
                                      </a>
                                      <Link
                                        href={`/certificate/${cert.id}`}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                        title={t("editTitle")}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Link>
                                      <button
                                        onClick={(e) => handleDeleteCertificate(cert.id, e)}
                                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                        title={t("deleteTitle")}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {/* Receipts Tab */}
                    {activeTab === "receipts" && (
                      filteredReceipts.length === 0 ? (
                        <div className="text-center py-16 px-4">
                          <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <h3 className="text-base font-bold text-slate-800">{language === "ar" ? "لا توجد سندات قبض" : "No Receipts Found"}</h3>
                          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                            {searchQuery ? (language === "ar" ? "لا توجد نتائج مطابقة." : "No matching receipts.") : (language === "ar" ? "أنشئ سندات قبض رسمية بالمبالغ المستلمة من العملاء." : "Create payment receipt vouchers.")}
                          </p>
                          {!searchQuery && (
                            <Link
                              href="/receipt/new"
                              className="inline-flex items-center gap-2 mt-4 text-xs font-semibold bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-xl text-white shadow-sm"
                            >
                              <Plus className="w-4 h-4" /> {t("newReceipt")}
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-600 font-semibold tracking-wider">
                                <th className="py-3.5 px-5">{language === "ar" ? "رقم السند" : "Receipt No."}</th>
                                <th className="py-3.5 px-5">{t("clientName")}</th>
                                <th className="py-3.5 px-5">{language === "ar" ? "المستلم لأجله" : "Received For"}</th>
                                <th className="py-3.5 px-5">{t("date")}</th>
                                <th className="py-3.5 px-5 text-right">{language === "ar" ? "المبلغ المستلم" : "Amount"}</th>
                                <th className="py-3.5 px-5 text-center">{t("actions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {filteredReceipts.map((receipt) => (
                                <tr key={receipt.id} className="hover:bg-slate-50/70 transition-colors group">
                                  <td className="py-3.5 px-5 font-mono font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                                    {receipt.receiptNo}
                                  </td>
                                  <td className="py-3.5 px-5 font-medium text-slate-800">
                                    {receipt.clientName}
                                  </td>
                                  <td className="py-3.5 px-5 text-slate-600 text-xs">
                                    {receipt.receivedFor || "-"}
                                  </td>
                                  <td className="py-3.5 px-5 text-slate-500 text-xs">
                                    {receipt.date}
                                  </td>
                                  <td className="py-3.5 px-5 text-right font-mono font-bold text-teal-700">
                                    {Number(receipt.amount).toLocaleString("en-AE", { maximumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-sans">AED</span>
                                  </td>
                                  <td className="py-3.5 px-5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Link
                                        href={`/receipt/${receipt.id}/view`}
                                        className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors"
                                        title={language === "ar" ? "معاينة السند" : "View"}
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </Link>
                                      <a
                                        href={`/receipt/${receipt.id}?print=true`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                                        title={language === "ar" ? "طباعة / تنزيل PDF" : "Print / PDF"}
                                      >
                                        <Printer className="w-4 h-4" />
                                      </a>
                                      <Link
                                        href={`/receipt/${receipt.id}`}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                        title={t("editTitle")}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Link>
                                      <button
                                        onClick={(e) => handleDeleteReceipt(receipt.id, e)}
                                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                        title={t("deleteTitle")}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {/* Official Letters Tab */}
                    {activeTab === "letters" && (
                      filteredLetters.length === 0 ? (
                        <div className="text-center py-16 px-4">
                          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <h3 className="text-base font-bold text-slate-800">{language === "ar" ? "لم يتم العثور على خطابات رسمية" : "No Letters Found"}</h3>
                          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                            {searchQuery ? (language === "ar" ? "لا توجد نتائج مطابقة." : "No matching letters.") : (language === "ar" ? "أنشئ خطابات رسمية وشهادات خبرة وتفويضات بسهولة." : "Create official letters and certificates.")}
                          </p>
                          {!searchQuery && (
                            <Link
                              href="/letter/new"
                              className="inline-flex items-center gap-2 mt-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-white shadow-sm"
                            >
                              <Plus className="w-4 h-4" /> {language === "ar" ? "خطاب رسمي جديد" : "New Letter"}
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-600 font-semibold tracking-wider">
                                <th className="py-3.5 px-5">{language === "ar" ? "رقم الخطاب" : "Letter No."}</th>
                                <th className="py-3.5 px-5">{language === "ar" ? "نوع الخطاب" : "Letter Type"}</th>
                                <th className="py-3.5 px-5">{language === "ar" ? "موجه إلى" : "Addressed To"}</th>
                                <th className="py-3.5 px-5">{t("date")}</th>
                                <th className="py-3.5 px-5 text-center">{t("actions")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {filteredLetters.map((letter) => {
                                const LETTER_TYPES_LIST = [
                                  { value: "experience", labelAr: "شهادة خبرة", labelEn: "Experience Certificate" },
                                  { value: "authorization", labelAr: "تفويض رسمي", labelEn: "Official Authorization" },
                                  { value: "salary", labelAr: "شهادة راتب", labelEn: "Salary Certificate" },
                                  { value: "general", labelAr: "خطاب لمن يهمه الأمر", labelEn: "To Whom It May Concern" },
                                  { value: "claim", labelAr: "مطالبة مالية", labelEn: "Financial Claim" },
                                  { value: "custom", labelAr: "عنوان مخصص", labelEn: "Custom Title" },
                                ];
                                const letterTypeObj = LETTER_TYPES_LIST.find(t => t.value === letter.letterType);
                                const displayType = language === "ar" ? letterTypeObj?.labelAr : letterTypeObj?.labelEn;

                                return (
                                  <tr key={letter.id} className="hover:bg-slate-50/70 transition-colors group">
                                    <td className="py-3.5 px-5 font-mono font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                      {letter.letterNo}
                                    </td>
                                    <td className="py-3.5 px-5 text-slate-700 font-medium">
                                      {displayType}
                                    </td>
                                    <td className="py-3.5 px-5 text-slate-800">
                                      {letter.addressedTo}
                                    </td>
                                    <td className="py-3.5 px-5 text-slate-500 text-xs">
                                      {letter.date}
                                    </td>
                                    <td className="py-3.5 px-5 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <a
                                          href={`/letter/${letter.id}?print=true`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                                          title={language === "ar" ? "طباعة / تنزيل PDF" : "Print / PDF"}
                                        >
                                          <Printer className="w-4 h-4" />
                                        </a>
                                        <Link
                                          href={`/letter/${letter.id}`}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                          title={t("editTitle")}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Link>
                                        <button
                                          onClick={(e) => handleDeleteLetter(letter.id, e)}
                                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                          title={t("deleteTitle")}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {/* Price List Catalog Tab */}
                    {activeTab === "priceList" && (
                      <div className="p-4 sm:p-6">
                        <PriceListTable />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Approved Quotation Instant Dual Invoicing & Companion Docs Modal */}
      {approvedQuoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-arabic">
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-2xl max-w-xl w-full overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    تم اعتماد عرض السعر بنجاح! 🎉
                  </h3>
                  <p className="text-xs text-slate-500">
                    عرض رقم: <strong className="font-mono text-purple-700">{approvedQuoteModal.quote.quotationNo}</strong> للعميل ({approvedQuoteModal.quote.clientName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovedQuoteModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 leading-relaxed font-medium">
              ⚡ تم إصدار الفاتورة العادية وبيان الحساب، الفاتورة الضريبية 5%، عقد التوريد والتركيب، وسند القبض فوراً وبإمكانك استعراضها وطباعتها الآن بضغطة واحدة:
            </div>

            {/* Instant Documents 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
              {/* Standard Invoice */}
              <a
                href={`/quotation/${approvedQuoteModal.quote.id || approvedQuoteModal.quote.quotationNo}?view=invoice&type=standard&print=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 hover:bg-indigo-100 text-indigo-950 flex items-center gap-3 transition-all text-xs font-bold shadow-2xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900">📄 الفاتورة العادية</div>
                  <span className="text-[10px] text-indigo-700 font-normal block truncate">بيان أسعار 0% بدون ضريبة</span>
                </div>
              </a>

              {/* Tax Invoice */}
              <a
                href={`/quotation/${approvedQuoteModal.quote.id || approvedQuoteModal.quote.quotationNo}?view=invoice&type=tax&print=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 hover:bg-purple-100 text-purple-950 flex items-center gap-3 transition-all text-xs font-bold shadow-2xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ReceiptIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900">🧾 الفاتورة الضريبية</div>
                  <span className="text-[10px] text-purple-700 font-normal block truncate">معتمدة مع 5% VAT</span>
                </div>
              </a>

              {/* Contract */}
              <a
                href={`/contract/contract-${approvedQuoteModal.suffix}?print=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 hover:bg-blue-100 text-blue-950 flex items-center gap-3 transition-all text-xs font-bold shadow-2xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ScrollText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900">📝 عقد المشروع</div>
                  <span className="text-[10px] text-blue-700 font-normal block truncate">عقد توريد وتركيب ذكي</span>
                </div>
              </a>

              {/* Receipt */}
              <a
                href={`/receipt/receipt-${approvedQuoteModal.suffix}?print=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 hover:bg-teal-100 text-teal-950 flex items-center gap-3 transition-all text-xs font-bold shadow-2xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <DollarSign size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900">💳 سند القبض</div>
                  <span className="text-[10px] text-teal-700 font-normal block truncate">سند تحصيل دفعة المشروع</span>
                </div>
              </a>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                المجموع: {approvedQuoteModal.quote.total?.toLocaleString()} AED
              </span>
              <button
                onClick={() => setApprovedQuoteModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                إغلاق والمتابعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Management Permissions & Credentials Manager Modal */}
      <PermissionsManagerModal
        isOpen={permissionsModalOpen}
        onClose={() => setPermissionsModalOpen(false)}
      />

      {/* PWA Install Banner */}
      <PWAInstallPrompt />
    </div>
  );
}

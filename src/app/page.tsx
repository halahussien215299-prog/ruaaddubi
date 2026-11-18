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
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Sparkles
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
  ProjectMilestone,
  ProjectSiteLog,
  DEFAULT_PROJECT_MILESTONES,
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

  type MainModule = "overview" | "projects" | "sales" | "contracts" | "accounting" | "hr" | "reports";
  const [mainModule, setMainModule] = useState<MainModule>("overview");
  const [salesSubTab, setSalesSubTab] = useState<"quotations" | "priceList">("quotations");
  const [contractsSubTab, setContractsSubTab] = useState<"contracts" | "certificates" | "letters">("contracts");
  const [quotationFilterStatus, setQuotationFilterStatus] = useState<string>("all");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
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
    if (quote.status === 'approved') {
      const projs = await getAllProjects().catch(() => []);
      setProjects(projs);
    }
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

        // 4. Auto Project Generation
        const existingProjects = await getAllProjects().catch(() => []);
        const alreadyHasProject = existingProjects.some(p => p.quotationId === quote.id || p.id === `proj-${quote.id}`);

        if (!alreadyHasProject) {
          const projectNo = "PRJ-" + suffix;
          const projectTitle = quote.projectReference?.trim() || `مشروع ${quote.clientName} - أنظمة ذكية وكاميرات`;

          const initialMilestones: ProjectMilestone[] = DEFAULT_PROJECT_MILESTONES.map((m, idx) => ({
            id: `ms-${Date.now()}-${idx + 1}`,
            title: m.title,
            description: m.description,
            status: idx === 0 ? "in_progress" : "pending",
            targetDate: new Date(Date.now() + (idx + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          }));

          const initialLog: ProjectSiteLog = {
            id: `log-${Date.now()}`,
            date: new Date().toLocaleDateString("en-GB") + " " + new Date().toLocaleTimeString("ar-AE", { hour: "2-digit", minute: "2-digit" }),
            author: "النظام الذكي",
            activity: `تم اعتماد عرض السعر رقم (${quote.quotationNo}) بقيمة (${Number(quote.total || 0).toLocaleString()} AED) وإنشاء المشروع تلقائياً وبدء مرحلة المعاينة الميدانية.`,
          };

          const newProject: Project = {
            id: `proj-${quote.id}`,
            projectNo,
            title: projectTitle,
            clientName: quote.clientName,
            clientPhone: quote.contactNo || "",
            location: quote.locationArea || "الموقع الميداني",
            status: "in_progress",
            startDate: new Date().toISOString().split("T")[0],
            targetEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            budget: Number(quote.total || 0),
            contractId: `contract-${suffix}`,
            quotationId: quote.id,
            completionRate: 15,
            milestones: initialMilestones,
            siteLogs: [initialLog],
            sitePhotos: [],
            blueprints: [],
            notes: `تم إنشاء المشروع آلياً بمجرد اعتماد عرض السعر رقم ${quote.quotationNo}. جاهز للتوثيق الميداني والمخططات ومتابعة الفنيين.`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await saveProject(newProject);
          const projs = await getAllProjects();
          setProjects(projs);
        } else {
          const projs = await getAllProjects();
          setProjects(projs);
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
      id: "overview" as const,
      label: language === "ar" ? "لوحة المؤشرات" : "Dashboard",
      fullLabel: language === "ar" ? "لوحة القيادة والمؤشرات العامة" : "Command Center & Overview",
      icon: LayoutDashboard,
      badge: null,
      color: "text-purple-600",
      activeBg: "bg-purple-700 text-white shadow-xs"
    },
    {
      id: "projects" as const,
      label: language === "ar" ? "المشاريع الميدانية" : "Field Projects",
      fullLabel: language === "ar" ? "إدارة المشاريع والمواقع والمخططات الهندسية" : "Projects, Blueprints & Field Tracking",
      icon: Building2,
      badge: projects.length,
      color: "text-amber-600",
      activeBg: "bg-amber-600 text-white shadow-xs"
    },
    {
      id: "sales" as const,
      label: language === "ar" ? "عروض الأسعار والكتالوج" : "Quotes & Catalog",
      fullLabel: language === "ar" ? "إدارة عروض الأسعار ودليل الأصناف المعتمدة" : "Quotations & Catalog Price List",
      icon: FileText,
      badge: quotations.length,
      color: "text-purple-600",
      activeBg: "bg-purple-700 text-white shadow-xs"
    },
    {
      id: "contracts" as const,
      label: language === "ar" ? "العقود والمستندات" : "Contracts & Docs",
      fullLabel: language === "ar" ? "العقود الرسمية، شهادات الإنجاز والخطابات" : "Contracts, Certificates & Letters",
      icon: ScrollText,
      badge: contracts.length + certificates.length,
      color: "text-blue-600",
      activeBg: "bg-blue-600 text-white shadow-xs"
    },
    {
      id: "accounting" as const,
      label: language === "ar" ? "المالية والمحاسبة" : "Accounting & Finance",
      fullLabel: language === "ar" ? "الفواتير الضريبية، سندات القبض والصرف، وتقرير VAT" : "Invoices, Vouchers & VAT Compliance",
      icon: DollarSign,
      badge: receipts.length + expenses.length,
      color: "text-emerald-600",
      activeBg: "bg-emerald-600 text-white shadow-xs"
    },
    {
      id: "hr" as const,
      label: language === "ar" ? "فريق العمل والموارد" : "Staff & HR",
      fullLabel: language === "ar" ? "الموظفين والفنيين، الحضور واليوميات والرواتب" : "HR, Attendance, Payroll & Technicians",
      icon: Users,
      badge: employees.length,
      color: "text-teal-600",
      activeBg: "bg-teal-600 text-white shadow-xs"
    },
    {
      id: "reports" as const,
      label: language === "ar" ? "التقارير والإحصائيات" : "Reports & Analytics",
      fullLabel: language === "ar" ? "التقارير التنفيذية والمالية الشاملة" : "Executive & Financial Reports",
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
      <aside className={`fixed inset-y-0 ${isRtl ? "right-0" : "left-0"} z-50 w-72 bg-white border-${isRtl ? "l" : "r"} border-slate-200 flex flex-col justify-between transform transition-transform duration-300 lg:translate-x-0 ${
        mobileMenuOpen ? "translate-x-0 shadow-2xl" : (isRtl ? "translate-x-full" : "-translate-x-full")
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Brand Header */}
          <div className="p-5 border-b border-slate-150 flex items-center justify-between">
            <Link href="/" onClick={() => setMainModule("overview")} className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 bg-white p-1 flex items-center justify-center shadow-2xs">
                <Image
                  src={settingsLogo || "/logo.png"}
                  alt="Ruaad Smart Logo"
                  fill
                  sizes="48px"
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 leading-tight">رواد سمارت</h1>
                <p className="text-[10px] text-purple-700 font-bold tracking-wide">للأجهزة والحلول الذكية</p>
              </div>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Nav List - Categorized for Maximum Clarity */}
          <nav className="p-3.5 space-y-4 flex-1 overflow-y-auto">
            {/* 1. Core Modules */}
            <div className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {language === "ar" ? "العمليات والمشاريع" : "Core Operations"}
              </div>
              {mainModulesList.slice(0, 4).map((m) => {
                const isSelected = mainModule === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMainModule(m.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-700 text-white shadow-xs font-black"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4.5 h-4.5 ${isSelected ? "text-white" : m.color}`} />
                      <span>{m.label}</span>
                    </div>
                    {m.badge !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {m.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 2. Finance, HR & Reports */}
            <div className="space-y-1 pt-1 border-t border-slate-150">
              <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {language === "ar" ? "المالية وفريق العمل" : "Finance & Staff"}
              </div>
              {mainModulesList.slice(4).map((m) => {
                const isSelected = mainModule === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMainModule(m.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-700 text-white shadow-xs font-black"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4.5 h-4.5 ${isSelected ? "text-white" : m.color}`} />
                      <span>{m.label}</span>
                    </div>
                    {m.badge !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {m.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 3. System & Administration */}
            <div className="space-y-1 pt-1 border-t border-slate-150">
              <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {language === "ar" ? "النظام والإعدادات" : "System & Settings"}
              </div>

              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <SettingsIcon className="w-4.5 h-4.5 text-slate-500" />
                  <span>{language === "ar" ? "إعدادات الشركة والشعار" : "Company & Logo Settings"}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              {currentRole === "admin" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPermissionsModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-50 via-amber-50/50 to-purple-50 text-purple-950 border border-purple-200 hover:border-purple-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>{language === "ar" ? "صلاحيات وحسابات الموظفين" : "Staff Permissions"}</span>
                    </div>
                    <span className="text-[10px] bg-amber-400/20 text-amber-900 font-bold px-1.5 py-0.2 rounded">👑 VIP</span>
                  </button>

                  <Link
                    href="/security"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-slate-900 to-purple-950 text-white hover:from-purple-950 hover:to-indigo-950 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>{language === "ar" ? "جدار الحماية وسجل التدقيق" : "Firewall & Audit Logs"}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">WAF</span>
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-150 space-y-2.5 bg-slate-50/70">
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-600" />
                <span>{language === "ar" ? "اللغة (Language)" : "Language (العربية)"}</span>
              </div>
              <span className="text-[11px] font-bold text-purple-700 font-mono">
                {language === "ar" ? "العربية" : "English"}
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-all cursor-pointer"
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
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-purple-700 font-bold">
                <span>رواد سمارت</span>
                <span className="text-slate-300">/</span>
                <span>{mainModulesList.find(m => m.id === mainModule)?.label}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {mainModulesList.find(m => m.id === mainModule)?.fullLabel}
              </h2>
            </div>
          </div>

          {/* Quick Actions & Role Controls */}
          <div className="flex items-center gap-2.5">
            {/* Role Switcher Pill */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSwitchRole("admin")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currentRole === "admin"
                    ? "bg-white text-purple-900 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="لوحة تحكم الإدارة العليا"
              >
                👑 الإدارة
              </button>
              <button
                type="button"
                onClick={() => handleSwitchRole("operations")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currentRole === "operations"
                    ? "bg-white text-blue-900 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="الموظف الإداري والعمليات"
              >
                📋 العمليات
              </button>
              <button
                type="button"
                onClick={() => handleSwitchRole("accounting")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currentRole === "accounting"
                    ? "bg-white text-emerald-900 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="الحسابات والمالية"
              >
                💰 الحسابات
              </button>
            </div>

            {/* Powerful Single "➕ إجراء جديد" Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setQuickCreateOpen(!quickCreateOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition shadow-sm shadow-purple-700/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{language === "ar" ? "➕ إنشاء جديد" : "Create New"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${quickCreateOpen ? "rotate-180" : ""}`} />
              </button>

              {quickCreateOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setQuickCreateOpen(false)}
                  />
                  <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100 font-arabic">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {language === "ar" ? "المبيعات والمشاريع" : "Sales & Projects"}
                    </div>

                    <Link
                      href="/quotation/new"
                      onClick={() => setQuickCreateOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition"
                    >
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>{language === "ar" ? "عرض سعر جديد" : "New Quotation"}</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setQuickCreateOpen(false);
                        setMainModule("projects");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition cursor-pointer text-right"
                    >
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span>{language === "ar" ? "مشروع ميداني جديد" : "New Project"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setQuickCreateOpen(false);
                        setMainModule("sales");
                        setSalesSubTab("priceList");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition cursor-pointer text-right"
                    >
                      <Layers className="w-4 h-4 text-purple-600" />
                      <span>{language === "ar" ? "صنف جديد في الكتالوج" : "New Catalog Item"}</span>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>

                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {language === "ar" ? "العقود والمالية" : "Contracts & Finance"}
                    </div>

                    <Link
                      href="/contract/new"
                      onClick={() => setQuickCreateOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition"
                    >
                      <ScrollText className="w-4 h-4 text-blue-600" />
                      <span>{language === "ar" ? "عقد توريد وتركيب" : "New Contract"}</span>
                    </Link>

                    <Link
                      href="/receipt/new"
                      onClick={() => setQuickCreateOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition"
                    >
                      <DollarSign className="w-4 h-4 text-teal-600" />
                      <span>{language === "ar" ? "سند قبض مالي" : "New Receipt"}</span>
                    </Link>

                    <Link
                      href="/certificate/new"
                      onClick={() => setQuickCreateOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition"
                    >
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>{language === "ar" ? "شهادة إنجاز وتسليم" : "New Certificate"}</span>
                    </Link>

                    <Link
                      href="/letter/new"
                      onClick={() => setQuickCreateOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      <Mail className="w-4 h-4 text-indigo-600" />
                      <span>{language === "ar" ? "خطاب رسمي موجه" : "New Letter"}</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
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
              {/* Executive Overview Hub */}
              {mainModule === "overview" && (
                <div className="space-y-6 font-arabic">
                  {/* Executive Welcome & Hero Hub */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-purple-200 text-xs font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>نظام إدارة العمليات الذكية - رواد سمارت</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                          مرحباً بك في مركز القيادة والعمليات 🚀
                        </h2>
                        <p className="text-purple-200/80 text-xs sm:text-sm max-w-xl leading-relaxed">
                          متابعة فورية ومباشرة لكافة مشاريع الكاميرات والشبكات الميدانية، عروض الأسعار الصادرة، ونسب الإنجاز والتحصيلات المالية.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Link
                          href="/quotation/new"
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-purple-900/50 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>عرض سعر جديد</span>
                        </Link>
                        <button
                          onClick={() => setMainModule("projects")}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer"
                        >
                          <Building2 className="w-4 h-4 text-amber-300" />
                          <span>المشاريع الميدانية</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4 Interactive KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Projects Card */}
                    <div
                      onClick={() => setMainModule("projects")}
                      className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">المشاريع الميدانية</span>
                        <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Building2 className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2">
                        {activeProjectsCount} <span className="text-xs font-sans text-slate-500 font-normal">مشروع جاري</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-amber-700 font-bold mt-3 pt-2.5 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" />
                          {projects.length} إجمالي المواقع
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* 2. Quotations Card */}
                    <div
                      onClick={() => setMainModule("sales")}
                      className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-purple-400 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">عروض الأسعار</span>
                        <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-purple-900 mt-2">
                        {totalQuotationsVal.toLocaleString("en-AE", { maximumFractionDigits: 0 })} <span className="text-xs font-sans text-slate-500 font-normal">AED</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-purple-700 font-bold mt-3 pt-2.5 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {pendingQuotationsCount} معلق | {executedQuotesCount} معتمد
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* 3. Accounting & Receipts Card */}
                    <div
                      onClick={() => setMainModule("accounting")}
                      className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">التحصيلات والمالية</span>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <DollarSign className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 mt-2">
                        {totalReceiptsVal.toLocaleString("en-AE", { maximumFractionDigits: 0 })} <span className="text-xs font-sans text-slate-500 font-normal">AED</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-emerald-700 font-bold mt-3 pt-2.5 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ذمم: {totalReceivablesVal.toLocaleString("en-AE", { maximumFractionDigits: 0 })} AED
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* 4. Catalog Card */}
                    <div
                      onClick={() => {
                        setMainModule("sales");
                        setSalesSubTab("priceList");
                      }}
                      className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">كتالوج الأصناف والأسعار</span>
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Layers className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2">
                        {PRICE_LIST_ITEMS.length} <span className="text-xs font-sans text-slate-500 font-normal">صنف معتمد</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-indigo-700 font-bold mt-3 pt-2.5 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          كاميرات، شبكات، وإنذار
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Grid - مركز العمليات السريعة */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-700" />
                        <span>مركز العمليات والإجراءات السريعة</span>
                      </h3>
                      <span className="text-xs text-slate-400">وصول فوري للأقسام دون عناء</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <Link
                        href="/quotation/new"
                        className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 hover:border-purple-300 hover:bg-purple-100/60 transition-all flex flex-col items-start gap-2 group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-purple-700 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-purple-950">عرض سعر جديد</div>
                          <p className="text-[10px] text-purple-700/80 mt-0.5">تسعير احترافي للعميل</p>
                        </div>
                      </Link>

                      <button
                        onClick={() => setMainModule("projects")}
                        className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 hover:border-amber-300 hover:bg-amber-100/60 transition-all flex flex-col items-start gap-2 group cursor-pointer text-right"
                      >
                        <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-950">المشاريع والمخططات</div>
                          <p className="text-[10px] text-amber-700/80 mt-0.5">رفع مخططات ومتابعة الإنجاز</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setMainModule("sales");
                          setSalesSubTab("priceList");
                        }}
                        className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-100/60 transition-all flex flex-col items-start gap-2 group cursor-pointer text-right"
                      >
                        <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-indigo-950">كتالوج الأصناف</div>
                          <p className="text-[10px] text-indigo-700/80 mt-0.5">إضافة وتعديل بنود الأسعار</p>
                        </div>
                      </button>

                      <Link
                        href="/contract/new"
                        className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 hover:border-blue-300 hover:bg-blue-100/60 transition-all flex flex-col items-start gap-2 group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                          <ScrollText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-blue-950">عقد توريد وتركيب</div>
                          <p className="text-[10px] text-blue-700/80 mt-0.5">عقد قانوني موثق</p>
                        </div>
                      </Link>

                      <Link
                        href="/receipt/new"
                        className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-100 hover:border-teal-300 hover:bg-teal-100/60 transition-all flex flex-col items-start gap-2 group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-teal-950">سند قبض مالي</div>
                          <p className="text-[10px] text-teal-700/80 mt-0.5">تحصيل فوري لدفعة العميل</p>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* 2-Column Live Activity Stream */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 1. Projects Stream */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
                      <div className="p-4 sm:p-5 border-b border-slate-150 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4.5 h-4.5 text-amber-600" />
                          <h3 className="font-bold text-sm text-slate-900">المشاريع الميدانية النشطة</h3>
                        </div>
                        <button
                          onClick={() => setMainModule("projects")}
                          className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                        >
                          <span>عرض كل المشاريع ({projects.length})</span>
                          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      </div>

                      <div className="p-4 sm:p-5 flex-1 divide-y divide-slate-100 space-y-3">
                        {projects.length === 0 ? (
                          <div className="text-center py-12">
                            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-500">لا توجد مشاريع مسجلة حالياً.</p>
                            <button
                              onClick={() => setMainModule("projects")}
                              className="mt-3 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              ➕ إضافة أول مشروع
                            </button>
                          </div>
                        ) : (
                          projects.slice(0, 4).map((p) => {
                            const progress = p.completionRate || 0;
                            return (
                              <div key={p.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-slate-500">#{p.projectNo || p.id}</span>
                                    <h4 className="font-bold text-xs text-slate-900 truncate">{p.title}</h4>
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                    <span>العميل: {p.clientName}</span>
                                    {p.location && <span>• {p.location}</span>}
                                    {p.blueprints && p.blueprints.length > 0 && (
                                      <span className="text-blue-700 font-bold">({p.blueprints.length} مخططات)</span>
                                    )}
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                    <div
                                      className="bg-amber-500 h-full rounded-full transition-all"
                                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  <span className="font-mono font-bold text-xs text-slate-700">{progress}%</span>
                                  <button
                                    onClick={() => setMainModule("projects")}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition cursor-pointer"
                                  >
                                    فتح المشروع
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* 2. Quotations Stream */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
                      <div className="p-4 sm:p-5 border-b border-slate-150 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4.5 h-4.5 text-purple-700" />
                          <h3 className="font-bold text-sm text-slate-900">أحدث عروض الأسعار والاعتمادات</h3>
                        </div>
                        <button
                          onClick={() => setMainModule("sales")}
                          className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                        >
                          <span>عرض كل العروض ({quotations.length})</span>
                          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      </div>

                      <div className="p-4 sm:p-5 flex-1 divide-y divide-slate-100 space-y-3">
                        {quotations.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-500">لا توجد عروض أسعار مسجلة.</p>
                            <Link
                              href="/quotation/new"
                              className="inline-block mt-3 px-3 py-1.5 bg-purple-700 text-white text-xs font-bold rounded-lg"
                            >
                              ➕ إنشاء أول عرض سعر
                            </Link>
                          </div>
                        ) : (
                          quotations.slice(0, 4).map((q) => {
                            const isApproved = q.status === "approved" || q.status === "executed";
                            return (
                              <div key={q.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-purple-700">{q.quotationNo}</span>
                                    <h4 className="font-bold text-xs text-slate-900 truncate">{q.clientName}</h4>
                                    <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                                      isApproved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}>
                                      {isApproved ? "معتمد" : "قيد المتابعة"}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                    <span>{q.date}</span>
                                    <span>•</span>
                                    <span className="font-mono font-bold text-slate-800">
                                      {q.total?.toLocaleString("en-AE", { maximumFractionDigits: 0 })} AED
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {!isApproved && (
                                    <button
                                      onClick={() => handleStatusChange(q, "approved")}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer shadow-2xs"
                                      title="اعتماد فوري وتحويله لمشروع ميداني"
                                    >
                                      ⚡ اعتماد
                                    </button>
                                  )}
                                  <Link
                                    href={`/quotation/${q.id}`}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition cursor-pointer"
                                  >
                                    معاينة
                                  </Link>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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

              {/* Sales & Catalog Module */}
              {mainModule === "sales" && (
                <div className="space-y-6 font-arabic">
                  {/* Sales Subtab Bar */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSalesSubTab("quotations")}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          salesSubTab === "quotations"
                            ? "bg-purple-700 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>عروض الأسعار</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                          salesSubTab === "quotations" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {quotations.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setSalesSubTab("priceList")}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          salesSubTab === "priceList"
                            ? "bg-purple-700 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <Layers className="w-4 h-4" />
                        <span>دليل الأصناف والأسعار (الكتالوج)</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                          salesSubTab === "priceList" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {PRICE_LIST_ITEMS.length}
                        </span>
                      </button>
                    </div>

                    {salesSubTab === "quotations" && (
                      <Link
                        href="/quotation/new"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إنشاء عرض سعر جديد</span>
                      </Link>
                    )}
                  </div>

                  {/* Content of Quotations SubTab */}
                  {salesSubTab === "quotations" && (
                    <div className="space-y-4">
                      {/* Search & Status Filters */}
                      <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                          <Search className={`w-4 h-4 absolute top-3 ${isRtl ? "right-3.5" : "left-3.5"} text-slate-400 pointer-events-none`} />
                          <input
                            type="text"
                            placeholder={t("searchPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${
                              isRtl ? "pr-10 pl-4" : "pl-10 pr-4"
                            } py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20`}
                          />
                        </div>

                        <div className="text-xs text-slate-500 font-medium">
                          {language === "ar" ? "مرتبة حسب الأحدث" : "Sorted by newest"}
                        </div>
                      </div>

                      {/* Quotations Table */}
                      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
                        {
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
                      )}
                      </div>
                    </div>
                  )}

                  {/* Content of Price List SubTab */}
                  {salesSubTab === "priceList" && (
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-4 sm:p-6">
                      <PriceListTable />
                    </div>
                  )}
                </div>
              )}

              {/* Contracts & Documentation Module */}
              {mainModule === "contracts" && (
                <div className="space-y-6 font-arabic">
                  {/* Contracts Subtabs */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setContractsSubTab("contracts")}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          contractsSubTab === "contracts"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <ScrollText className="w-4 h-4" />
                        <span>العقود الرسمية</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                          contractsSubTab === "contracts" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {contracts.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setContractsSubTab("certificates")}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          contractsSubTab === "certificates"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <Award className="w-4 h-4" />
                        <span>شهادات الإنجاز والتسليم</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                          contractsSubTab === "certificates" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {certificates.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setContractsSubTab("letters")}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          contractsSubTab === "letters"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        <span>الخطابات والمراسلات</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                          contractsSubTab === "letters" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {letters.length}
                        </span>
                      </button>
                    </div>

                    <div>
                      {contractsSubTab === "contracts" && (
                        <Link
                          href="/contract/new"
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>عقد جديد</span>
                        </Link>
                      )}
                      {contractsSubTab === "certificates" && (
                        <Link
                          href="/certificate/new"
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>شهادة إنجاز جديدة</span>
                        </Link>
                      )}
                      {contractsSubTab === "letters" && (
                        <Link
                          href="/letter/new"
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>خطاب رسمي جديد</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-2xs">
                    <div className="relative max-w-md">
                      <Search className={`w-4 h-4 absolute top-3 ${isRtl ? "right-3.5" : "left-3.5"} text-slate-400 pointer-events-none`} />
                      <input
                        type="text"
                        placeholder={t("searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${
                          isRtl ? "pr-10 pl-4" : "pl-10 pr-4"
                        } py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20`}
                      />
                    </div>
                  </div>

                  {/* Subtab Content */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
                    {contractsSubTab === "contracts" && (
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
                    {contractsSubTab === "certificates" && (
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
                    {contractsSubTab === "letters" && (
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
                  </div>
                </div>
              )}

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

            <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-purple-950">
                    🏗️ تم إدراج المشروع تلقائياً في المشاريع الميدانية!
                  </h4>
                  <p className="text-[11px] text-purple-700/80">
                    رقم المشروع: <span className="font-mono font-bold">PRJ-{approvedQuoteModal.suffix}</span> - تم بدء مراحل التنفيذ وجدولة المهام.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setApprovedQuoteModal(null);
                    setMainModule("projects");
                  }}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <span>عرض في المشاريع</span>
                  <ArrowRight size={13} className="rotate-180" />
                </button>

                <a
                  href={`/track/proj-${approvedQuoteModal.quote.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                >
                  <ExternalLink size={13} />
                  <span>تتبع العميل</span>
                </a>
              </div>
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

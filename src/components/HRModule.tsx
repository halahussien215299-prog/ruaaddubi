"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Clock, 
  DollarSign, 
  Award, 
  Trash2, 
  Edit3, 
  Printer, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  X, 
  Loader2, 
  Briefcase,
  Phone,
  FileSpreadsheet,
  MapPin,
  Wrench,
  BadgeCheck,
  Building2,
  HardHat,
  Sparkles,
  Gift,
  ShieldAlert,
  CheckSquare,
  Send,
  Check,
  KeyRound,
  PenTool,
  Stamp,
  ShieldCheck,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  UploadCloud,
  Eye,
  Share2,
  Copy
} from "lucide-react";
import { 
  Employee, 
  AttendanceRecord, 
  PayrollRecord, 
  Project, 
  ProjectPhoto,
  ProjectSiteLog,
  DEFAULT_PROJECT_MILESTONES,
  saveProject,
  Settings 
} from "@/lib/db";
import { useLanguage } from "@/lib/i18n";

interface HRModuleProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  payroll: PayrollRecord[];
  projects: Project[];
  settings?: Settings | null;
  onSaveEmployee: (employee: Employee) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onSaveAttendance: (record: AttendanceRecord) => Promise<void>;
  onDeleteAttendance: (id: string) => Promise<void>;
  onSavePayroll: (record: PayrollRecord) => Promise<void>;
  onSaveProject?: (project: Project) => Promise<void>;
  onOpenPermissionsModal?: () => void;
}

export default function HRModule({
  employees,
  attendance,
  payroll,
  projects,
  settings,
  onSaveEmployee,
  onDeleteEmployee,
  onSaveAttendance,
  onDeleteAttendance,
  onSavePayroll,
  onSaveProject,
  onOpenPermissionsModal,
}: HRModuleProps) {
  const { language, isRtl } = useLanguage();
  const [subTab, setSubTab] = useState<"directory" | "attendance" | "payroll" | "technician">("attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("2026-11");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Modal States
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [savingEmp, setSavingEmp] = useState(false);

  const [showAddAttModal, setShowAddAttModal] = useState(false);
  const [savingAtt, setSavingAtt] = useState(false);

  const [showPayrollEditModal, setShowPayrollEditModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
  const [savingPayroll, setSavingPayroll] = useState(false);

  // Online Signed Salary Voucher State
  const [signingVoucherRecord, setSigningVoucherRecord] = useState<PayrollRecord | null>(null);
  const [voucherPaymentMethod, setVoucherPaymentMethod] = useState<"bank_transfer" | "cash" | "cheque">("bank_transfer");
  const [voucherPaymentDate, setVoucherPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [voucherDisbursedBy, setVoucherDisbursedBy] = useState<string>("المسؤول المالي / المحاسب");
  const [savingVoucher, setSavingVoucher] = useState(false);
  const voucherSigCanvasRef = useRef<SignatureCanvas>(null);

  // Quick Bonus & Deduction Modal State
  const [showQuickAdjModal, setShowQuickAdjModal] = useState(false);
  const [quickAdj, setQuickAdj] = useState<{
    employeeId: string;
    type: "bonus" | "deduction";
    amount: string;
    reason: string;
    month: string;
    notes: string;
  }>({
    employeeId: employees[0]?.id || "",
    type: "bonus",
    amount: "100",
    reason: "إنجاز مبكر وكفاءة في الموقع ⚡",
    month: "2026-11",
    notes: "",
  });
  const [savingAdj, setSavingAdj] = useState(false);

  // Field Technician Portal States
  const [selectedTechId, setSelectedTechId] = useState<string>(employees[0]?.id || "");
  const [techSiteLocation, setTechSiteLocation] = useState<string>(projects[0]?.title ? `${projects[0].title}` : "الورشة المركزية");
  const [techRoleToday, setTechRoleToday] = useState<string>("فني تركيب وبرمجة كاميرات وNVR");
  const [techCheckInSuccess, setTechCheckInSuccess] = useState(false);
  const [techPettyCashForm, setTechPettyCashForm] = useState({
    type: "cash_advance",
    amount: "50",
    description: "",
    submitted: false
  });
  const [techTasksChecklist, setTechTasksChecklist] = useState<Record<string, boolean>>({
    "task-1": true,
    "task-2": true,
    "task-3": false,
    "task-4": false,
    "task-5": false
  });

  // Field Project Photos & Milestone Updates
  const [techPhotoProjectId, setTechPhotoProjectId] = useState<string>(projects[0]?.id || "");
  const [techMilestoneIndex, setTechMilestoneIndex] = useState<number>(0);
  const [techMilestoneStatus, setTechMilestoneStatus] = useState<"in_progress" | "completed">("in_progress");
  const [techPhotoCaption, setTechPhotoCaption] = useState<string>("");
  const [techPhotoBase64, setTechPhotoBase64] = useState<string>("");
  const [savingTechPhoto, setSavingTechPhoto] = useState(false);
  const [techPhotoSuccess, setTechPhotoSuccess] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<ProjectPhoto | null>(null);

  // Employee Form State
  const [empForm, setEmpForm] = useState({
    empNo: `EMP-${(employees.length + 1).toString().padStart(3, "0")}`,
    name: "",
    nationalId: "",
    phone: "",
    email: "",
    role: "فني تركيبات ذكية وكاميرات",
    employmentType: "monthly" as "monthly" | "daily",
    dailyRate: "150",
    basicSalary: "",
    allowances: "",
    joinDate: new Date().toISOString().split("T")[0],
    status: "active" as Employee["status"],
    notes: "",
  });

  // Attendance Form State
  const [attForm, setAttForm] = useState({
    date: selectedDate,
    employeeId: employees[0]?.id || "",
    employmentType: "monthly" as "monthly" | "daily",
    roleToday: "فني تركيب وبرمجة كاميرات وNVR",
    siteLocation: "الورشة المركزية / عام",
    status: "present" as AttendanceRecord["status"],
    hoursWorked: "8",
    overtimeHours: "0",
    projectId: "",
    dailyWage: "150",
    taskDescription: "",
  });

  // Calculate Daily Wage Helper
  const calculateDayWage = (dailyWageStr: string, status: string, overtimeStr: string) => {
    const baseRate = Number(dailyWageStr) || 0;
    if (baseRate <= 0) return 0;
    let multiplier = 1;
    if (status === "half_day") multiplier = 0.5;
    if (status === "leave" || status === "absent") multiplier = 0;
    const overtimeHours = Number(overtimeStr) || 0;
    const hourlyRate = baseRate / 8;
    const overtimePay = overtimeHours * hourlyRate * 1.25;
    return Math.round((baseRate * multiplier) + overtimePay);
  };

  // Calculate HR KPIs
  const totalEmployeesCount = employees.length;
  const activeEmployeesCount = employees.filter(e => e.status === "active").length;
  
  const todayAttendance = attendance.filter(a => a.date === selectedDate);
  const todayPresentCount = todayAttendance.filter(a => a.status === "present" || a.status === "half_day").length;
  const todayDailyWorkers = todayAttendance.filter(a => a.employmentType === "daily" || (a.dailyWage && a.dailyWage > 0));
  const totalTodayDailyWages = todayDailyWorkers.reduce((sum, a) => sum + (Number(a.dailyWage) || 0), 0);

  const currentMonthPayroll = payroll.filter(p => p.month === selectedMonth);
  const totalMonthlyPayrollCost = currentMonthPayroll.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const totalMonthlyBonuses = currentMonthPayroll.reduce((sum, p) => sum + (p.bonus || 0), 0);

  // Handle Select Employee in Attendance Modal
  const handleSelectEmployeeForAttendance = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const isDaily = emp.employmentType === "daily" || (emp.dailyRate && emp.dailyRate > 0);
    setAttForm(prev => ({
      ...prev,
      employeeId: empId,
      employmentType: isDaily ? "daily" : "monthly",
      roleToday: emp.role || prev.roleToday,
      dailyWage: isDaily && emp.dailyRate ? String(emp.dailyRate) : (prev.dailyWage || "150"),
    }));
  };

  // Handle Select Project in Attendance Modal
  const handleSelectProjectForAttendance = (projId: string) => {
    const proj = projects.find(p => p.id === projId);
    setAttForm(prev => ({
      ...prev,
      projectId: projId,
      siteLocation: proj ? `${proj.title}${proj.location ? ' - ' + proj.location : ''}` : "الورشة المركزية / عام",
    }));
  };

  // Open Edit Employee
  const handleOpenEditEmp = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpForm({
      empNo: emp.empNo,
      name: emp.name,
      nationalId: emp.nationalId || "",
      phone: emp.phone,
      email: emp.email || "",
      role: emp.role,
      employmentType: emp.employmentType || (emp.dailyRate ? "daily" : "monthly"),
      dailyRate: emp.dailyRate ? String(emp.dailyRate) : "150",
      basicSalary: String(emp.basicSalary || ""),
      allowances: String(emp.allowances || 0),
      joinDate: emp.joinDate,
      status: emp.status,
      notes: emp.notes || "",
    });
    setShowAddEmpModal(true);
  };

  // Submit Employee
  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name || !empForm.phone) return;

    setSavingEmp(true);
    try {
      const now = new Date().toISOString();
      const updated: Employee = {
        id: editingEmp ? editingEmp.id : `emp-${Date.now()}`,
        empNo: empForm.empNo.trim(),
        name: empForm.name.trim(),
        nationalId: empForm.nationalId.trim(),
        phone: empForm.phone.trim(),
        email: empForm.email.trim(),
        role: empForm.role.trim(),
        employmentType: empForm.employmentType,
        dailyRate: empForm.employmentType === "daily" ? (Number(empForm.dailyRate) || 0) : undefined,
        basicSalary: empForm.employmentType === "monthly" ? (Number(empForm.basicSalary) || 0) : 0,
        allowances: empForm.employmentType === "monthly" ? (Number(empForm.allowances) || 0) : 0,
        joinDate: empForm.joinDate,
        status: empForm.status,
        notes: empForm.notes.trim(),
        createdAt: editingEmp ? editingEmp.createdAt : now,
        updatedAt: now,
      };

      await onSaveEmployee(updated);
      setShowAddEmpModal(false);
      setEditingEmp(null);
    } catch (err) {
      console.error(err);
      alert(language === "ar" ? "فشل حفظ بيانات الموظف" : "Failed to save employee");
    } finally {
      setSavingEmp(false);
    }
  };

  // Submit Daily Attendance
  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attForm.employeeId) return;

    setSavingAtt(true);
    try {
      const emp = employees.find(e => e.id === attForm.employeeId);
      const proj = projects.find(p => p.id === attForm.projectId);
      const isDaily = attForm.employmentType === "daily";
      const calculatedWage = isDaily 
        ? calculateDayWage(attForm.dailyWage, attForm.status, attForm.overtimeHours)
        : undefined;

      const record: AttendanceRecord = {
        id: `att-${Date.now()}`,
        date: attForm.date || selectedDate,
        employeeId: attForm.employeeId,
        employeeName: emp ? emp.name : "موظف",
        employmentType: attForm.employmentType,
        roleToday: attForm.roleToday.trim() || (emp ? emp.role : "فني"),
        siteLocation: attForm.siteLocation.trim() || (proj ? proj.title : "الورشة المركزية / عام"),
        dailyWage: calculatedWage,
        status: attForm.status,
        hoursWorked: Number(attForm.hoursWorked) || 0,
        overtimeHours: Number(attForm.overtimeHours) || 0,
        projectId: attForm.projectId || undefined,
        projectName: proj ? proj.title : undefined,
        taskDescription: attForm.taskDescription.trim(),
        createdAt: new Date().toISOString(),
      };

      await onSaveAttendance(record);
      setShowAddAttModal(false);
      setAttForm(prev => ({
        ...prev,
        hoursWorked: "8",
        overtimeHours: "0",
        taskDescription: "",
      }));
    } catch (err) {
      console.error(err);
      alert(language === "ar" ? "فشل تسجيل الحضور" : "Failed to record attendance");
    } finally {
      setSavingAtt(false);
    }
  };

  // Generate / Ensure Monthly Payroll
  const ensureMonthlyPayroll = () => {
    employees.forEach(emp => {
      const exists = payroll.some(p => p.employeeId === emp.id && p.month === selectedMonth);
      if (!exists) {
        const basic = emp.basicSalary || 0;
        const allow = emp.allowances || 0;
        const newRecord: PayrollRecord = {
          id: `pr-${emp.id}-${selectedMonth}`,
          month: selectedMonth,
          employeeId: emp.id,
          employeeName: emp.name,
          basicSalary: basic,
          allowances: allow,
          bonus: 0,
          overtimeAmount: 0,
          deductions: 0,
          advanceDeduction: 0,
          netSalary: basic + allow,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        onSavePayroll(newRecord).catch(console.error);
      }
    });
  };

  // Open Edit Payroll Bonus / Deductions
  const handleOpenEditPayroll = (rec: PayrollRecord) => {
    setSelectedPayroll({ ...rec });
    setShowPayrollEditModal(true);
  };

  // Save Payroll Record
  const handleSavePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayroll) return;

    setSavingPayroll(true);
    try {
      const net = 
        (Number(selectedPayroll.basicSalary) || 0) +
        (Number(selectedPayroll.allowances) || 0) +
        (Number(selectedPayroll.bonus) || 0) +
        (Number(selectedPayroll.overtimeAmount) || 0) -
        (Number(selectedPayroll.deductions) || 0) -
        (Number(selectedPayroll.advanceDeduction) || 0);

      const updated: PayrollRecord = {
        ...selectedPayroll,
        netSalary: Math.max(0, net),
      };

      await onSavePayroll(updated);
      setShowPayrollEditModal(false);
      setSelectedPayroll(null);
    } catch (err) {
      console.error(err);
      alert(language === "ar" ? "فشل تحديث مسير الراتب" : "Failed to update payroll");
    } finally {
      setSavingPayroll(false);
    }
  };

  // Arabic Number to Words Helper (تفقيط المبالغ بالريال/الدرهم الإماراتي)
  const numberToArabicWords = (num: number): string => {
    if (!num || num <= 0) return "صفر";
    const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
    const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
    const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

    const convertGroup = (n: number): string => {
      let res = "";
      const h = Math.floor(n / 100);
      const rem = n % 100;
      if (h > 0) res += hundreds[h];
      if (rem > 0) {
        if (res) res += " و ";
        if (rem < 20) {
          res += ones[rem];
        } else {
          const o = rem % 10;
          const t = Math.floor(rem / 10);
          if (o > 0) res += ones[o] + " و ";
          res += tens[t];
        }
      }
      return res;
    };

    const thousands = Math.floor(num / 1000);
    const remainder = Math.floor(num % 1000);
    let result = "";

    if (thousands > 0) {
      if (thousands === 1) result += "ألف";
      else if (thousands === 2) result += "ألفان";
      else if (thousands >= 3 && thousands <= 10) result += convertGroup(thousands) + " آلاف";
      else result += convertGroup(thousands) + " ألف";
    }

    if (remainder > 0) {
      if (result) result += " و ";
      result += convertGroup(remainder);
    }

    return result.trim();
  };

  // Open Online Signed Salary Voucher
  const handleOpenVoucherModal = (rec: PayrollRecord) => {
    setSigningVoucherRecord(rec);
    setVoucherPaymentMethod(rec.paymentMethod || "bank_transfer");
    setVoucherPaymentDate(rec.paymentDate || rec.signedAt?.split("T")[0] || new Date().toISOString().split("T")[0]);
    setVoucherDisbursedBy(rec.disbursedBy || "المسؤول المالي / المحاسب");
  };

  // Save Online Signed Salary Voucher
  const handleSaveSalaryVoucher = async () => {
    if (!signingVoucherRecord) return;
    
    let finalSignature = signingVoucherRecord.employeeSignature || "";
    if (voucherSigCanvasRef.current && !voucherSigCanvasRef.current.isEmpty()) {
      finalSignature = voucherSigCanvasRef.current.toDataURL("image/png");
    }

    if (!finalSignature) {
      alert(language === "ar" ? "يرجى من الموظف رسم التوقيع أولاً في الصندوق المخصص للاعتماد." : "Please have the employee draw their signature first.");
      return;
    }

    setSavingVoucher(true);
    try {
      const receiptNo = signingVoucherRecord.receiptNo || `SAL-${signingVoucherRecord.month.replace("-", "")}-${signingVoucherRecord.employeeId.slice(-4)}`;
      const updated: PayrollRecord = {
        ...signingVoucherRecord,
        status: "paid",
        receiptNo,
        paymentMethod: voucherPaymentMethod,
        paymentDate: voucherPaymentDate,
        signedAt: signingVoucherRecord.signedAt || new Date().toISOString(),
        disbursedBy: voucherDisbursedBy,
        employeeSignature: finalSignature,
      };

      await onSavePayroll(updated);
      setSigningVoucherRecord(updated);
      alert(language === "ar" ? "تم اعتماد صرف الراتب وتوثيق توقيع الموظف إلكترونياً بنجاح! ✅" : "Salary disbursed and signed successfully!");
    } catch (e) {
      console.error("Failed to save salary receipt voucher:", e);
      alert(language === "ar" ? "حدث خطأ أثناء حفظ سند الصرف." : "Failed to save salary receipt.");
    } finally {
      setSavingVoucher(false);
    }
  };

  // Quick Bonus & Deduction Actions
  const handleOpenQuickAdj = (emp?: Employee | null, type: "bonus" | "deduction" = "bonus") => {
    setQuickAdj({
      employeeId: emp?.id || employees[0]?.id || "",
      type,
      amount: "100",
      reason: type === "bonus" ? "إنجاز مبكر وكفاءة في الموقع ⚡" : "تأخير غير مبرر ⏳",
      month: selectedMonth,
      notes: "",
    });
    setShowQuickAdjModal(true);
  };

  const handleSaveQuickAdj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdj.employeeId || !quickAdj.amount) return;
    const amountVal = Number(quickAdj.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert(language === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount");
      return;
    }

    setSavingAdj(true);
    try {
      const emp = employees.find(e => e.id === quickAdj.employeeId);
      if (!emp) throw new Error("Employee not found");

      let targetRecord = payroll.find(p => p.employeeId === emp.id && p.month === quickAdj.month);
      const basic = emp.basicSalary || (emp.employmentType === "daily" ? (emp.dailyRate || 150) * 26 : 0);
      const allow = emp.allowances || 0;

      if (!targetRecord) {
        targetRecord = {
          id: `pr-${emp.id}-${quickAdj.month}`,
          month: quickAdj.month,
          employeeId: emp.id,
          employeeName: emp.name,
          basicSalary: basic,
          allowances: allow,
          bonus: 0,
          overtimeAmount: 0,
          deductions: 0,
          advanceDeduction: 0,
          netSalary: basic + allow,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
      }

      const prevBonus = Number(targetRecord.bonus) || 0;
      const prevDeductions = Number(targetRecord.deductions) || 0;
      
      const newBonus = quickAdj.type === "bonus" ? prevBonus + amountVal : prevBonus;
      const newDeductions = quickAdj.type === "deduction" ? prevDeductions + amountVal : prevDeductions;
      
      const net = (Number(targetRecord.basicSalary) || 0) + 
                  (Number(targetRecord.allowances) || 0) + 
                  newBonus + 
                  (Number(targetRecord.overtimeAmount) || 0) - 
                  newDeductions - 
                  (Number(targetRecord.advanceDeduction) || 0);

      const adjNote = `[${new Date().toLocaleDateString("en-GB")}] ${quickAdj.type === "bonus" ? "+بونص" : "-خصم"}: ${amountVal} AED (${quickAdj.reason}${quickAdj.notes ? ` - ${quickAdj.notes}` : ""})`;
      const existingNotes = targetRecord.notes ? `${targetRecord.notes}\n${adjNote}` : adjNote;

      const updatedRecord: PayrollRecord = {
        ...targetRecord,
        bonus: newBonus,
        deductions: newDeductions,
        netSalary: Math.max(0, net),
        notes: existingNotes,
      };

      await onSavePayroll(updatedRecord);
      setShowQuickAdjModal(false);
      alert(language === "ar" 
        ? `تم تسجيل ${quickAdj.type === "bonus" ? "المكافأة (البونص)" : "الخصم"} بقيمة ${amountVal} درهم للموظف (${emp.name}) بنجاح! 🎉` 
        : `Successfully applied ${quickAdj.type} of ${amountVal} AED to ${emp.name}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to apply adjustment");
    } finally {
      setSavingAdj(false);
    }
  };

  // 1-Click Fast Field Site Check-In
  const handleTechFastCheckIn = async () => {
    const tech = employees.find(e => e.id === selectedTechId);
    if (!tech) return;
    const isDaily = tech.employmentType === "daily" || (tech.dailyRate && tech.dailyRate > 0);
    const dayWage = isDaily ? (tech.dailyRate || 150) : 0;

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: tech.id,
      employeeName: tech.name,
      employmentType: isDaily ? "daily" : "monthly",
      roleToday: techRoleToday,
      siteLocation: techSiteLocation,
      date: new Date().toISOString().split("T")[0],
      status: "present",
      hoursWorked: 8,
      overtimeHours: 0,
      dailyWage: dayWage,
      taskDescription: `حضور ميداني سريع - ${techRoleToday} بالموقع (${techSiteLocation})`,
      createdAt: new Date().toISOString(),
    };

    try {
      await onSaveAttendance(newRecord);
      setTechCheckInSuccess(true);
      setTimeout(() => setTechCheckInSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert("فشل تسجيل الحضور السريع");
    }
  };

  // Field Technician Site Photo & Milestone Upload
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setTechPhotoBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitTechSitePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techPhotoBase64) {
      alert(language === "ar" ? "يرجى التقاط صورة أو اختيار صورة من جهازك أولاً" : "Please take or select a photo first");
      return;
    }

    const targetProject = projects.find(p => p.id === techPhotoProjectId) || projects[0];
    if (!targetProject) {
      alert(language === "ar" ? "يرجى اختيار المشروع أولاً" : "Please select a project");
      return;
    }

    setSavingTechPhoto(true);
    try {
      const currentTech = employees.find(e => e.id === selectedTechId);
      const techName = currentTech?.name || "فني الموقع الميداني";

      // Milestones of project
      const milestones = targetProject.milestones && targetProject.milestones.length > 0
        ? [...targetProject.milestones]
        : DEFAULT_PROJECT_MILESTONES.map((dm, idx) => ({ ...dm, id: `ms-${idx + 1}` }));

      const selectedMilestone = milestones[techMilestoneIndex] || milestones[0];

      if (selectedMilestone) {
        selectedMilestone.status = techMilestoneStatus;
        if (techMilestoneStatus === "completed" && !selectedMilestone.completedDate) {
          selectedMilestone.completedDate = new Date().toISOString().split("T")[0];
        }
        selectedMilestone.assignedTo = techName;
      }

      // Recalculate completion rate
      const completedCount = milestones.filter(m => m.status === "completed").length;
      const newCompletionRate = Math.round((completedCount / milestones.length) * 100);

      // Upload to Cloudinary CDN for high-speed delivery & lightweight DB
      let finalPhotoUrl = techPhotoBase64;
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: techPhotoBase64, folder: "ruaad_smart/site_photos" }),
        });
        if (uploadRes.ok) {
          const upJson = await uploadRes.json();
          if (upJson.url) finalPhotoUrl = upJson.url;
        }
      } catch (upErr) {
        console.warn("Cloudinary upload fallback:", upErr);
      }

      // Create new ProjectPhoto
      const newPhoto: ProjectPhoto = {
        id: `photo-${Date.now()}`,
        url: finalPhotoUrl,
        caption: techPhotoCaption.trim() || `توثيق ميداني للمرحلة: ${selectedMilestone?.title}`,
        milestoneId: selectedMilestone?.id,
        milestoneTitle: selectedMilestone?.title,
        uploadedBy: techName,
        uploadedAt: new Date().toISOString(),
        phase: selectedMilestone?.title,
      };

      // Create site log
      const newLog: ProjectSiteLog = {
        id: `log-${Date.now()}`,
        date: new Date().toLocaleDateString("en-GB") + " " + new Date().toLocaleTimeString("ar-AE", { hour: "2-digit", minute: "2-digit" }),
        author: techName,
        activity: `رفع صورة ميدانية وتحديث (${selectedMilestone?.title}) إلى: [${techMilestoneStatus === "completed" ? "مكتملة ✅" : "قيد التنفيذ ⏳"}]${techPhotoCaption ? " - " + techPhotoCaption : ""}`,
      };

      const updatedProject: Project = {
        ...targetProject,
        milestones,
        completionRate: newCompletionRate,
        status: newCompletionRate === 100 ? "completed" : targetProject.status === "planned" ? "in_progress" : targetProject.status,
        sitePhotos: [newPhoto, ...(targetProject.sitePhotos || [])],
        siteLogs: [newLog, ...(targetProject.siteLogs || [])],
        updatedAt: new Date().toISOString(),
      };

      if (onSaveProject) {
        await onSaveProject(updatedProject);
      } else {
        await saveProject(updatedProject);
      }

      setTechPhotoBase64("");
      setTechPhotoCaption("");
      setTechPhotoSuccess(true);
      setTimeout(() => setTechPhotoSuccess(false), 4000);
      alert(language === "ar" ? "تم رفع صورة الموقع وتحديث المرحلة بنجاح! تظهر الآن مباشرة للإدارة العليا وللعميل. 📸" : "Site photo and milestone saved successfully!");
    } catch (err: any) {
      console.error("Failed to upload site photo:", err);
      alert(err.message || "حدث خطأ أثناء حفظ الصورة");
    } finally {
      setSavingTechPhoto(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.empNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Top HR Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-indigo-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {language === "ar" ? "إجمالي الكادر الوظيفي" : "Total Employees"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 font-mono font-bold text-2xl text-slate-900">
            {totalEmployeesCount}
            <span className="text-xs font-sans text-slate-500 font-normal mr-1.5 ml-1.5">
              {language === "ar" ? "موظف وفني" : "Staff"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">
            {activeEmployeesCount} {language === "ar" ? "على رأس العمل (نشط)" : "Active staff"}
          </p>
        </div>

        {/* Daily Attendance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {language === "ar" ? "حضور اليوم الميداني" : "Today's Attendance"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 font-mono font-bold text-2xl text-teal-700">
            {todayPresentCount} / {activeEmployeesCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-mono">
            {selectedDate}
          </p>
        </div>

        {/* Daily Workers & Wages Today */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {language === "ar" ? "أجور عمال وفنيي اليومية لليوم" : "Today's Daily Wages"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <HardHat className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 font-mono font-bold text-2xl text-amber-800">
            {totalTodayDailyWages.toLocaleString("en-AE", { maximumFractionDigits: 2 })}
            <span className="text-xs font-sans text-slate-500 font-normal mr-1.5 ml-1.5">AED</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700 font-medium">
            {todayDailyWorkers.length} {language === "ar" ? "عمال/فنيين باليومية في المواقع" : "daily workers at sites"}
          </p>
        </div>

        {/* Monthly Payroll Total */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-purple-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {language === "ar" ? "مسير رواتب الشهر" : "Monthly Payroll Net"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 font-mono font-bold text-2xl text-purple-900">
            {totalMonthlyPayrollCost.toLocaleString("en-AE", { maximumFractionDigits: 2 })}
            <span className="text-xs font-sans text-slate-500 font-normal mr-1.5 ml-1.5">AED</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-mono">
            {language === "ar" ? `شهر ${selectedMonth}` : `Month ${selectedMonth}`}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Sub Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setSubTab("attendance")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "attendance"
                ? "bg-white text-teal-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>{language === "ar" ? "اليوميات وسجل الحضور الميداني" : "Daily Timesheets & Sites"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-mono font-bold">
              {attendance.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab("directory")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "directory"
                ? "bg-white text-indigo-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>{language === "ar" ? "دليل الموظفين والفنيين" : "Employees Directory"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
              {employees.length}
            </span>
          </button>

          <button
            onClick={() => {
              setSubTab("payroll");
              ensureMonthlyPayroll();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "payroll"
                ? "bg-white text-purple-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
            <span>{language === "ar" ? "مسير الرواتب والبونص" : "Payroll & Bonuses"}</span>
          </button>

          <button
            onClick={() => setSubTab("technician")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "technician"
                ? "bg-white text-amber-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <HardHat className="w-3.5 h-3.5 text-amber-600" />
            <span>{language === "ar" ? "بوابة الفني والموظف الميداني" : "Technician Portal"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-mono font-bold">
              ⚡ سريع
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Universal Quick Bonus / Deduct Button */}
          <button
            onClick={() => handleOpenQuickAdj()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold shadow-2xs transition cursor-pointer"
            title="إضافة مكافأة أو خصم لموظف"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>{language === "ar" ? "مكافأة / خصم سريع" : "Quick Bonus / Deduct"}</span>
          </button>

          {/* Manage Staff Passwords & Usernames Button */}
          {onOpenPermissionsModal && (
            <button
              type="button"
              onClick={onOpenPermissionsModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title={language === "ar" ? "التحكم في أسماء المستخدمين وكلمات المرور للموظفين" : "Manage Staff Credentials"}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>{language === "ar" ? "حسابات وكلمات المرور" : "Staff Credentials"}</span>
            </button>
          )}
          {subTab === "attendance" && (
            <button
              onClick={() => {
                const defaultEmp = employees[0];
                const isDaily = defaultEmp?.employmentType === "daily" || (defaultEmp?.dailyRate && defaultEmp.dailyRate > 0);
                setAttForm({
                  date: selectedDate,
                  employeeId: defaultEmp?.id || "",
                  employmentType: isDaily ? "daily" : "monthly",
                  roleToday: defaultEmp?.role || "فني تركيب وبرمجة كاميرات وNVR",
                  siteLocation: projects[0]?.title ? `${projects[0].title}${projects[0].location ? ' - ' + projects[0].location : ''}` : "الورشة المركزية / عام",
                  projectId: projects[0]?.id || "",
                  status: "present",
                  hoursWorked: "8",
                  overtimeHours: "0",
                  dailyWage: isDaily && defaultEmp?.dailyRate ? String(defaultEmp.dailyRate) : "150",
                  taskDescription: "",
                });
                setShowAddAttModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === "ar" ? "تسجيل يومية / حضور موظف" : "Record Attendance"}</span>
            </button>
          )}

          {subTab === "directory" && (
            <button
              onClick={() => {
                setEditingEmp(null);
                setEmpForm({
                  empNo: `EMP-${(employees.length + 1).toString().padStart(3, "0")}`,
                  name: "",
                  nationalId: "",
                  phone: "",
                  email: "",
                  role: "فني تركيبات ذكية وكاميرات",
                  employmentType: "monthly",
                  dailyRate: "150",
                  basicSalary: "",
                  allowances: "",
                  joinDate: new Date().toISOString().split("T")[0],
                  status: "active",
                  notes: "",
                });
                setShowAddEmpModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{language === "ar" ? "إضافة موظف جديد" : "Add Employee"}</span>
            </button>
          )}

          {subTab === "payroll" && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === "ar" ? "طباعة مسير الرواتب" : "Print Payroll"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: DAILY ATTENDANCE & SITES (اليوميات وسجل الحضور الميداني)        */}
      {/* ========================================================================= */}
      {subTab === "attendance" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
          {/* Header Bar with Date Picker and Daily Stats */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {language === "ar" ? "سجل الحضور واليوميات وأدوار الفنيين في المواقع" : "Daily Site Attendance & Worker Roles"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {language === "ar" ? "متابعة من يعمل اليوم في أي موقع ومهمته الميدانية وأجر اليومية" : "Track who is at which site, their role, and daily wage"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">{language === "ar" ? "تاريخ اليومية:" : "Date:"}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none focus:border-teal-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Daily Quick Summary Strip */}
          <div className="bg-teal-50/40 border-b border-teal-100 p-3 px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-teal-900 font-arabic">
              <HardHat className="w-4 h-4 text-amber-600" />
              <span>
                {language === "ar" ? "إجمالي الحاضرين اليوم:" : "Staff present today:"}{" "}
                <strong className="font-mono text-slate-900">{todayPresentCount}</strong> |{" "}
                {language === "ar" ? "عمال وفنيين باليومية:" : "Daily workers:"}{" "}
                <strong className="font-mono text-amber-700">{todayDailyWorkers.length}</strong>
              </span>
            </div>

            {totalTodayDailyWages > 0 && (
              <div className="flex items-center gap-1.5 font-arabic">
                <span className="text-slate-600">{language === "ar" ? "إجمالي مستحقات اليوميات لليوم:" : "Total daily wages today:"}</span>
                <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                  {totalTodayDailyWages.toLocaleString()} AED
                </span>
              </div>
            )}
          </div>

          {/* Attendance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" dir={isRtl ? "rtl" : "ltr"}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="py-3 px-3">{language === "ar" ? "التاريخ" : "Date"}</th>
                  <th className="py-3 px-3">{language === "ar" ? "الموظف / الفني" : "Worker"}</th>
                  <th className="py-3 px-3">{language === "ar" ? "دوره في الموقع اليوم" : "Role Today"}</th>
                  <th className="py-3 px-3">{language === "ar" ? "في أي موقع اليوم" : "Site Location"}</th>
                  <th className="py-3 px-3 text-center">{language === "ar" ? "الحالة" : "Attendance"}</th>
                  <th className="py-3 px-3 text-center">{language === "ar" ? "ساعات العمل" : "Hours"}</th>
                  <th className="py-3 px-3 text-center">{language === "ar" ? "إضافي" : "Overtime"}</th>
                  <th className="py-3 px-3 text-right">{language === "ar" ? "اليومية / المستحق" : "Daily Wage"}</th>
                  <th className="py-3 px-3">{language === "ar" ? "المهام المنجزة" : "Task Notes"}</th>
                  <th className="py-3 px-3 text-center">{language === "ar" ? "حذف" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Clock className="w-8 h-8 text-slate-300" />
                        <p className="font-arabic text-sm">
                          {language === "ar" ? "لم يتم تسجيل يوميات لهذا التاريخ بعد." : "No attendance recorded for this date."}
                        </p>
                        <button
                          onClick={() => setShowAddAttModal(true)}
                          className="mt-1 text-xs text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                        >
                          + {language === "ar" ? "تسجيل أول يومية لهذا اليوم" : "Record First Attendance"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  todayAttendance.map((rec) => {
                    const isDaily = rec.employmentType === "daily" || (rec.dailyWage && rec.dailyWage > 0);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-slate-500 font-mono">{rec.date}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{rec.employeeName}</div>
                          <span className={`inline-block px-1.5 py-0.2 rounded-md text-[9px] font-bold ${
                            isDaily
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          }`}>
                            {isDaily ? "👷‍♂️ باليومية" : "👔 شهري"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100 text-[11px] inline-flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-teal-600" />
                            <span>{rec.roleToday || "-"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 text-[11px] flex items-center gap-1 max-w-[200px] truncate" title={rec.siteLocation || rec.projectName}>
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>{rec.siteLocation || rec.projectName || (language === "ar" ? "الورشة المركزية" : "Main Workshop")}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            rec.status === "present" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            rec.status === "half_day" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            rec.status === "leave" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                            "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {rec.status === "present" ? (language === "ar" ? "حاضر" : "Present") :
                             rec.status === "half_day" ? (language === "ar" ? "نصف يوم" : "Half Day") :
                             rec.status === "leave" ? (language === "ar" ? "إجازة" : "Leave") :
                             (language === "ar" ? "غائب" : "Absent")}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">{rec.hoursWorked} س</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-600">
                          {rec.overtimeHours > 0 ? `+${rec.overtimeHours} س` : "-"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {isDaily && rec.dailyWage && rec.dailyWage > 0 ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                              {rec.dailyWage.toLocaleString()} AED
                            </span>
                          ) : (
                            <span className="text-slate-400 font-sans text-[11px]">- (راتب شهري)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{rec.taskDescription || "-"}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                const emp = employees.find(e => e.id === rec.employeeId);
                                handleOpenQuickAdj(emp, "bonus");
                              }}
                              className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] transition cursor-pointer border border-emerald-200"
                              title="إضافة مكافأة / بونص"
                            >
                              + بونص
                            </button>
                            <button
                              onClick={() => {
                                const emp = employees.find(e => e.id === rec.employeeId);
                                handleOpenQuickAdj(emp, "deduction");
                              }}
                              className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] transition cursor-pointer border border-rose-200"
                              title="تطبيق خصم جزائي"
                            >
                              - خصم
                            </button>
                            <button
                              onClick={() => onDeleteAttendance(rec.id)}
                              className="p-1 rounded-md bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                              title="حذف اليومية"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: EMPLOYEES DIRECTORY (دليل الموظفين والفنيين)                    */}
      {/* ========================================================================= */}
      {subTab === "directory" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              {language === "ar" ? "سجل الموظفين والمهندسين والفنيين وعمال اليومية" : "Staff Directory"}
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className={`w-4 h-4 absolute top-2.5 ${isRtl ? "right-3" : "left-3"} text-slate-400`} />
              <input
                type="text"
                placeholder={language === "ar" ? "بحث بالاسم أو الرقم أو المسمى..." : "Search employee..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2 ${isRtl ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"} bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" dir={isRtl ? "rtl" : "ltr"}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-600 font-semibold">
                  <th className="py-3 px-4">{language === "ar" ? "الرقم الوظيفي" : "Emp No."}</th>
                  <th className="py-3 px-4">{language === "ar" ? "اسم الموظف / الفني" : "Name"}</th>
                  <th className="py-3 px-4">{language === "ar" ? "المسمى الوظيفي" : "Role"}</th>
                  <th className="py-3 px-4 text-center">{language === "ar" ? "نظام العمل" : "Type"}</th>
                  <th className="py-3 px-4">{language === "ar" ? "الهاتف" : "Phone"}</th>
                  <th className="py-3 px-4 text-right">{language === "ar" ? "الراتب / اليومية" : "Rate / Basic"}</th>
                  <th className="py-3 px-4 text-center">{language === "ar" ? "الحالة" : "Status"}</th>
                  <th className="py-3 px-4 text-center">{language === "ar" ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      {language === "ar" ? "لا يوجد موظفين مسجلين حالياً. اضغط على 'إضافة موظف جديد' للبدء." : "No employees registered yet."}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isDaily = emp.employmentType === "daily" || (emp.dailyRate && emp.dailyRate > 0);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-900">{emp.empNo}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{emp.name}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{emp.role}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDaily
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          }`}>
                            {isDaily ? "👷‍♂️ باليومية" : "👔 راتب شهري"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{emp.phone}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {isDaily ? (
                            <span className="text-amber-800 font-bold">
                              {(emp.dailyRate || 0).toLocaleString()} AED / يوم
                            </span>
                          ) : (
                            <span className="text-slate-800">
                              {emp.basicSalary.toLocaleString()} AED / شهر
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            emp.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            emp.status === "on_leave" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {emp.status === "active" ? (language === "ar" ? "على رأس العمل" : "Active") :
                             emp.status === "on_leave" ? (language === "ar" ? "في إجازة" : "On Leave") :
                             (language === "ar" ? "منتهي" : "Terminated")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenQuickAdj(emp, "bonus")}
                              className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] transition cursor-pointer border border-emerald-200"
                              title="إضافة مكافأة / بونص"
                            >
                              + بونص
                            </button>
                            <button
                              onClick={() => handleOpenQuickAdj(emp, "deduction")}
                              className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] transition cursor-pointer border border-rose-200"
                              title="تطبيق خصم جزائي"
                            >
                              - خصم
                            </button>
                            <button
                              onClick={() => handleOpenEditEmp(emp)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                              title="تعديل"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteEmployee(emp.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: PAYROLL & BONUSES (مسير الرواتب والمكافآت)                      */}
      {/* ========================================================================= */}
      {subTab === "payroll" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                {language === "ar" ? "مسير الرواتب والمكافآت والبونص" : "Monthly Payroll Register"}
              </h3>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setTimeout(ensureMonthlyPayroll, 100);
                }}
                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg font-mono outline-none focus:border-purple-600"
              />
            </div>

            <div className="text-xs text-slate-500 font-arabic">
              {language === "ar" ? "إجمالي صافي المسير:" : "Total Net:"}{" "}
              <span className="font-mono font-bold text-purple-900 text-sm">
                {totalMonthlyPayrollCost.toLocaleString()} AED
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" dir={isRtl ? "rtl" : "ltr"}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="py-3 px-4">{language === "ar" ? "اسم الموظف" : "Employee"}</th>
                  <th className="py-3 px-4 text-right">{language === "ar" ? "الراتب الأساسي" : "Basic"}</th>
                  <th className="py-3 px-4 text-right">{language === "ar" ? "البدلات" : "Allowances"}</th>
                  <th className="py-3 px-4 text-right text-emerald-700">{language === "ar" ? "البونص / المكافأة" : "Bonus"}</th>
                  <th className="py-3 px-4 text-right text-amber-700">{language === "ar" ? "إضافي" : "Overtime"}</th>
                  <th className="py-3 px-4 text-right text-rose-700">{language === "ar" ? "الخصومات والسلف" : "Deductions"}</th>
                  <th className="py-3 px-4 text-right font-bold text-purple-900">{language === "ar" ? "صافي الراتب" : "Net Salary"}</th>
                  <th className="py-3 px-4 text-center">{language === "ar" ? "الحالة" : "Status"}</th>
                  <th className="py-3 px-4 text-center">{language === "ar" ? "تعديل" : "Edit"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {currentMonthPayroll.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400 font-sans">
                      {language === "ar" ? "لم يتم إنشاء مسير رواتب لهذا الشهر بعد." : "No payroll records for this month."}
                    </td>
                  </tr>
                ) : (
                  currentMonthPayroll.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">{rec.employeeName}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{rec.basicSalary?.toLocaleString()} AED</td>
                      <td className="py-3 px-4 text-right text-slate-600">{(rec.allowances || 0).toLocaleString()} AED</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {rec.bonus > 0 ? `+${rec.bonus.toLocaleString()} AED` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-700">
                        {rec.overtimeAmount > 0 ? `+${rec.overtimeAmount.toLocaleString()} AED` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-700">
                        {(rec.deductions + rec.advanceDeduction) > 0 ? `-${(rec.deductions + rec.advanceDeduction).toLocaleString()} AED` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-sm text-purple-900">
                        {rec.netSalary?.toLocaleString()} AED
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === "paid" 
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            {rec.status === "paid" ? (language === "ar" ? "تم الصرف" : "Paid") : (language === "ar" ? "معلق" : "Pending")}
                          </span>
                          {rec.employeeSignature && (
                            <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-0.5 font-arabic">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>موقّع إلكترونياً</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenVoucherModal(rec)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs font-arabic ${
                              rec.status === "paid"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white"
                            }`}
                            title={rec.status === "paid" ? "عرض وطباعة سند الراتب الموقّع" : "صرف الراتب وتوقيع إيصال الاستلام أونلاين"}
                          >
                            <PenTool className="w-3 h-3" />
                            <span>{rec.status === "paid" ? (language === "ar" ? "سند الاستلام" : "Voucher") : (language === "ar" ? "صرف وتوقيع" : "Sign & Pay")}</span>
                          </button>
                          <button
                            onClick={() => {
                              const emp = employees.find(e => e.id === rec.employeeId);
                              handleOpenQuickAdj(emp, "bonus");
                            }}
                            className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] transition cursor-pointer border border-emerald-200"
                            title="إضافة مكافأة / بونص"
                          >
                            + بونص
                          </button>
                          <button
                            onClick={() => {
                              const emp = employees.find(e => e.id === rec.employeeId);
                              handleOpenQuickAdj(emp, "deduction");
                            }}
                            className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] transition cursor-pointer border border-rose-200"
                            title="تطبيق خصم جزائي"
                          >
                            - خصم
                          </button>
                          <button
                            onClick={() => handleOpenEditPayroll(rec)}
                            className="px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold transition cursor-pointer border border-purple-200"
                          >
                            تفاصيل
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: FIELD TECHNICIAN & WORKER PORTAL (بوابة الفني والموظف الميداني) */}
      {/* ========================================================================= */}
      {subTab === "technician" && (() => {
        const currentTech = employees.find(e => e.id === selectedTechId) || employees[0];
        const techAttendance = attendance.filter(a => a.employeeId === currentTech?.id && a.date.startsWith(selectedMonth));
        const daysPresent = techAttendance.filter(a => a.status === "present" || a.status === "half_day").length;
        const totalWagesEarned = techAttendance.reduce((sum, a) => sum + (Number(a.dailyWage) || 0), 0);
        
        const currentTechPayroll = payroll.find(p => p.employeeId === currentTech?.id && p.month === selectedMonth);
        const techBonus = currentTechPayroll?.bonus || 0;
        const techDeductions = (currentTechPayroll?.deductions || 0) + (currentTechPayroll?.advanceDeduction || 0);
        const isDailyWorker = currentTech?.employmentType === "daily" || (currentTech?.dailyRate && currentTech.dailyRate > 0);
        
        const basePay = isDailyWorker ? totalWagesEarned : (currentTech?.basicSalary || 0);
        const estimatedNet = Math.max(0, basePay + techBonus - techDeductions);

        return (
          <div className="space-y-6">
            {/* Header: Technician Selector & Live Profile */}
            <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-teal-500/10 rounded-2xl border border-amber-200/80 p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                  <HardHat className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900">
                      {language === "ar" ? "بوابة الفني والموظف الميداني الذكية" : "Technician & Field Portal"}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                      {isDailyWorker ? "👷‍♂️ فني باليومية" : "👔 موظف براتب شهري"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {language === "ar" ? "تسجيل حضور سريع للمواقع، متابعة المستحقات والأجور، وقائمة مهام العمل." : "Quick site check-in, wage tracker & tasks."}
                  </p>
                </div>
              </div>

              {/* Technician Dropdown */}
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">{language === "ar" ? "الفني الحالي:" : "Technician:"}</span>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="bg-transparent font-bold text-xs text-slate-900 outline-none cursor-pointer"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Personal Earnings & Wage Ledger */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block">{language === "ar" ? "أيام العمل هذا الشهر" : "Days Worked"}</span>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                  {daysPresent} <span className="text-xs font-normal text-slate-500 font-sans">{language === "ar" ? "يوم مسجل" : "days"}</span>
                </div>
                <div className="text-[11px] text-teal-600 font-medium mt-1">
                  {isDailyWorker ? `المعدل: ${currentTech?.dailyRate || 150} AED / يوم` : `دوام كامل شهري`}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block">{language === "ar" ? "المستحق الأساسي" : "Earned Wages"}</span>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                  {basePay.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">AED</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {isDailyWorker ? `${daysPresent} يوم × ${currentTech?.dailyRate || 150} درهم` : "راتب الشهر الأساسي"}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{language === "ar" ? "المكافآت والبونص" : "Bonus Earned"}</span>
                  <button
                    onClick={() => handleOpenQuickAdj(currentTech, "bonus")}
                    className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200"
                  >
                    + إضافة
                  </button>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
                  +{techBonus.toLocaleString()} <span className="text-xs font-normal text-emerald-600 font-sans">AED</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-medium mt-1">
                  {techBonus > 0 ? "بونص تحفيزي معتمد 🏆" : "لا يوجد بونص حتى الآن"}
                </div>
              </div>

              <div className="bg-purple-900 text-white rounded-2xl p-4 shadow-sm border border-purple-800">
                <span className="text-xs font-medium text-purple-200 block">{language === "ar" ? "الصافي المستحق للاستلام" : "Net Due for Payout"}</span>
                <div className="text-2xl font-bold font-mono mt-2">
                  {estimatedNet.toLocaleString()} <span className="text-xs font-normal text-purple-300 font-sans">AED</span>
                </div>
                <div className="text-[11px] text-purple-300 mt-1">
                  {techDeductions > 0 ? `بعد خصم ${techDeductions} درهم` : "رصيد صافي جاهز للصرف"}
                </div>
              </div>
            </div>

            {/* Two Column Grid: 1-Click Site Check-In & Site Tasks Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Card 1: 1-Click Fast Site Check-In */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {language === "ar" ? "تسجيل الحضور الذاتي بالموقع الآن" : "1-Click Site Check-In"}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {language === "ar" ? "سجل تواجدك في موقع المشروع بضغطة زر واحدة" : "Instant site dispatch check-in"}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    {new Date().toLocaleTimeString("ar-AE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {techCheckInSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم تسجيل حضورك في الموقع بنجاح! تم احتساب الأجر اليومي.</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === "ar" ? "المشروع / الموقع الميداني:" : "Assigned Project Site:"}
                    </label>
                    <select
                      value={techSiteLocation}
                      onChange={(e) => setTechSiteLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-teal-600"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={`${p.title} (${p.location || 'المقر الرئيسي'})`}>
                          {p.title} - {p.location || "المقر الرئيسي"}
                        </option>
                      ))}
                      <option value="الورشة المركزية والمخزن">الورشة المركزية والمخزن</option>
                      <option value="فيلا جميرا 3 - أعمال تركيبات">فيلا جميرا 3 - أعمال تركيبات</option>
                      <option value="مكتب الخليج التجاري - تجارب وصيانة">مكتب الخليج التجاري - تجارب وصيانة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {language === "ar" ? "الدور والتخصص اليوم:" : "Role Today:"}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "📹 فني كاميرات وNVR",
                        "🏠 فني سمارت هوم",
                        "🔌 تمديدات شبكات Cat6",
                        "⛏️ مساعد وتكسير مسارات",
                        "⚡ فني كهرباء ولوحات",
                        "🛠️ فحص وصيانة طارئة"
                      ].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setTechRoleToday(chip)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                            techRoleToday === chip
                              ? "bg-teal-700 text-white shadow-2xs font-bold"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleTechFastCheckIn}
                    className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{language === "ar" ? "⚡ تسجيل حضوري الآن في الموقع" : "Instant Check-In Now"}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Today's Site Scope Checklist & Materials */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {language === "ar" ? "قائمة مهام الموقع والتنفيذ" : "Site Scope & Tasks"}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {language === "ar" ? "حدد المهام التي تم إنجازها اليوم في الموقع" : "Tick completed milestones"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                    {Object.values(techTasksChecklist).filter(Boolean).length} / 5 مكتمل
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { id: "task-1", label: "فحص مسارات الكابلات وتمديد مواسير PVC المرنة" },
                    { id: "task-2", label: "سحب كابلات الشبكة Cat6 واختبار التوصيل مع الفاحص" },
                    { id: "task-3", label: "تثبيت حوامل الكاميرات الخارجية وتوجيه الزوايا" },
                    { id: "task-4", label: "توصيل وبرمجة جهاز التسجيل NVR والربط بالشبكة" },
                    { id: "task-5", label: "الفحص التشغيلي النهائي وتدريب العميل على التطبيق" },
                  ].map((task) => (
                    <label
                      key={task.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        techTasksChecklist[task.id]
                          ? "bg-purple-50/50 border-purple-200 text-purple-900 font-bold"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!techTasksChecklist[task.id]}
                        onChange={(e) => setTechTasksChecklist({ ...techTasksChecklist, [task.id]: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span className="text-xs">{task.label}</span>
                    </label>
                  ))}
                </div>

                {/* Quick Petty Cash / Material Request Strip */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-[11px] text-amber-900 font-medium">
                        تحتاج مواد إضافية أو سلفة مواقف وبترول للموقع؟
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const note = prompt("اكتب طلبك (مثال: محتاج لفة كابلات Cat6 إضافية أو سلفة مواقف 50 درهم):");
                        if (note) {
                          alert("تم إرسال طلبك بنجاح للإدارة والمحاسبة! سيتم تزويدك فوراً.");
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition shrink-0 cursor-pointer"
                    >
                      طلب سريع
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: 📸 توثيق مراحل المشروع ورفع صور الموقع الميدانية (Site Progress & Photos Upload) */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-indigo-200/80 p-6 shadow-xs space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 font-arabic">
                          {language === "ar" ? "توثيق مراحل المشروع ورفع صور الموقع الميدانية" : "Site Progress & Photos Documentation"}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-bold font-arabic">
                          مباشر للعميل وللإدارة العليا ⚡
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-arabic">
                        {language === "ar" 
                          ? "التقط صوراً حية للتركيبات وحدد المرحلة المنجزة، لتظهر فوراً للإدارة وللعميل في لوحة التتبع." 
                          : "Upload live photos and update phase status. Visible instantly to senior management and client."}
                      </p>
                    </div>
                  </div>

                  {/* Active Project Selector */}
                  <div className="flex items-center gap-2 bg-indigo-50/60 border border-indigo-200 px-3 py-1.5 rounded-xl">
                    <Building2 className="w-4 h-4 text-indigo-700 shrink-0" />
                    <span className="text-xs font-bold text-indigo-950 font-arabic">{language === "ar" ? "المشروع:" : "Project:"}</span>
                    <select
                      value={techPhotoProjectId}
                      onChange={(e) => {
                        setTechPhotoProjectId(e.target.value);
                        setTechMilestoneIndex(0);
                      }}
                      className="bg-transparent font-bold text-xs text-indigo-950 outline-none cursor-pointer max-w-[200px] truncate"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.completionRate || 0}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Project Status Bar & Upload Form */}
                {(() => {
                  const targetProj = projects.find(p => p.id === techPhotoProjectId) || projects[0];
                  if (!targetProj) {
                    return (
                      <div className="p-6 text-center text-slate-400 font-arabic text-xs">
                        لا يوجد مشاريع مسجلة حالياً لتوثيقها.
                      </div>
                    );
                  }

                  const pMilestones = targetProj.milestones && targetProj.milestones.length > 0
                    ? targetProj.milestones
                    : DEFAULT_PROJECT_MILESTONES.map((dm, idx) => ({ ...dm, id: `ms-${idx + 1}` }));

                  const currentMs = pMilestones[techMilestoneIndex] || pMilestones[0];
                  const projectPhotos = targetProj.sitePhotos || [];

                  return (
                    <div className="space-y-6">
                      
                      {/* Project KPI & Stage Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs font-arabic">
                        <div>
                          <span className="text-slate-500 block text-[11px]">اسم العميل والموقع:</span>
                          <span className="font-bold text-slate-900 text-sm block mt-0.5">{targetProj.clientName}</span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>{targetProj.location || "المقر الرئيسي"}</span>
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-[11px]">نسبة إنجاز المشروع:</span>
                            <span className="font-mono font-bold text-indigo-700">{targetProj.completionRate || 0}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-300"
                              style={{ width: `${targetProj.completionRate || 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {pMilestones.filter(m => m.status === "completed").length} من {pMilestones.length} مراحل مكتملة
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">الصور الموثقة بالموقع:</span>
                          <span className="font-mono font-bold text-lg text-purple-900 block mt-0.5">
                            {projectPhotos.length} <span className="text-xs font-normal text-slate-500 font-sans">صورة حية</span>
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold block mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>تظهر فوراً في حساب العميل والإدارة العليا</span>
                          </span>
                        </div>
                      </div>

                      {/* Upload Form */}
                      <form onSubmit={handleSubmitTechSitePhoto} className="space-y-4 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100 font-arabic">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* 1. Milestone Selection */}
                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                              1. اختر مرحلة العمل التي توثقها الآن:
                            </label>
                            <select
                              value={techMilestoneIndex}
                              onChange={(e) => setTechMilestoneIndex(Number(e.target.value))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 shadow-2xs cursor-pointer"
                            >
                              {pMilestones.map((ms, idx) => (
                                <option key={ms.id || idx} value={idx}>
                                  {idx + 1}. {ms.title} [{ms.status === "completed" ? "✅ مكتملة" : ms.status === "in_progress" ? "⏳ جاري العمل" : "⏱️ معلقة"}]
                                </option>
                              ))}
                            </select>
                            {currentMs?.description && (
                              <p className="text-[11px] text-slate-500 mt-1 italic leading-relaxed">
                                {currentMs.description}
                              </p>
                            )}
                          </div>

                          {/* 2. Milestone Status Toggle */}
                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                              2. تحديث حالة هذه المرحلة:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setTechMilestoneStatus("in_progress")}
                                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                                  techMilestoneStatus === "in_progress"
                                    ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>قيد التنفيذ ⏳</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setTechMilestoneStatus("completed")}
                                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                                  techMilestoneStatus === "completed"
                                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تم الإنجاز بالكامل ✅</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 3. Photo Capture Box & Caption */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          
                          {/* Photo Input / Capture Box */}
                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1.5">
                              3. التقاط أو اختيار صورة الموقع:
                            </label>

                            {!techPhotoBase64 ? (
                              <label className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-2xl p-6 bg-white flex flex-col items-center justify-center gap-2 cursor-pointer transition shadow-2xs group">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 flex items-center justify-center transition">
                                  <Camera className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-xs text-indigo-950">
                                  انقر لالتقاط صورة بالكاميرا أو اختيار من المعرض
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  يدعم JPG و PNG مباشرة من كاميرا الهاتف
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={handlePhotoFileChange}
                                  className="hidden"
                                />
                              </label>
                            ) : (
                              <div className="relative rounded-2xl overflow-hidden border border-indigo-200 bg-slate-900 group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={techPhotoBase64}
                                  alt="Site Preview"
                                  className="w-full h-44 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setTechPhotoBase64("")}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>إلغاء واختيار أخرى</span>
                                  </button>
                                </div>
                                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 text-white text-[10px] font-mono">
                                  جاهزة للرفع 📸
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Caption & Quick Chips */}
                          <div className="space-y-2.5">
                            <label className="block text-xs font-bold text-slate-800">
                              4. شرح أو ملاحظة الفني على الصورة:
                            </label>
                            <textarea
                              rows={3}
                              value={techPhotoCaption}
                              onChange={(e) => setTechPhotoCaption(e.target.value)}
                              placeholder="اكتب توضيحاً لما تم إنجازه (مثال: تم سحب كابلات الكاميرات الخارجية وتوصيلها باللوحة)..."
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-indigo-600 shadow-2xs resize-none"
                            />

                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block mb-1">
                                نصوص جاهزة سريعة:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {[
                                  "🛠️ تمديد مواسير وسحب الكابلات",
                                  "📹 تثبيت الكاميرات وضبط زوايا الرؤية",
                                  "⚡ تركيب كابينة التوزيع وسويتش PoE",
                                  "🏠 تركيب وبرمجة حساسات السمارت هوم",
                                  "✅ تشغيل واختبار البث الحي بنجاح"
                                ].map(chip => (
                                  <button
                                    key={chip}
                                    type="button"
                                    onClick={() => setTechPhotoCaption(chip)}
                                    className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] border border-slate-200 transition cursor-pointer"
                                  >
                                    {chip}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={savingTechPhoto || !techPhotoBase64}
                              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer disabled:cursor-not-allowed disabled:transform-none mt-2"
                            >
                              {savingTechPhoto ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UploadCloud className="w-4 h-4" />
                              )}
                              <span>اعتماد ورفع الصورة وتحديث مسار المشروع 🚀</span>
                            </button>
                          </div>

                        </div>
                      </form>

                      {/* Site Photos Gallery for this Project */}
                      {projectPhotos.length > 0 && (
                        <div className="space-y-3 pt-2 font-arabic">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-purple-600" />
                              <span>صور الموقع الموثقة لهذا المشروع ({projectPhotos.length}):</span>
                            </h5>
                            <span className="text-[10px] text-slate-500 font-mono">
                              معروضة للعميل والإدارة العليا
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {projectPhotos.map((photo) => (
                              <div
                                key={photo.id}
                                onClick={() => setViewingPhoto(photo)}
                                className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:shadow-md transition aspect-video sm:aspect-square"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.url}
                                  alt={photo.caption || "Site photo"}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-end text-white">
                                  <span className="text-[10px] font-bold line-clamp-1 leading-tight">
                                    {photo.caption || photo.phase}
                                  </span>
                                  <span className="text-[9px] text-slate-300 font-mono">
                                    {photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleDateString("en-GB") : ""}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })()}

              </div>

            </div>
          </div>
        );
      })()}
      {showAddAttModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-teal-50/70 sticky top-0 z-10 backdrop-blur-xs">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                <span>{language === "ar" ? "تسجيل يومية وحضور موظف / فني" : "Record Daily Attendance & Role"}</span>
              </h3>
              <button
                onClick={() => setShowAddAttModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAttendanceSubmit} className="p-6 space-y-4">
              {/* Row 1: Employee and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "الموظف / الفني" : "Employee"}
                  </label>
                  <select
                    required
                    value={attForm.employeeId}
                    onChange={(e) => handleSelectEmployeeForAttendance(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-600 bg-white"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.employmentType === "daily" || (e.dailyRate && e.dailyRate > 0) ? "باليومية" : e.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "التاريخ" : "Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={attForm.date}
                    onChange={(e) => setAttForm({ ...attForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Row 2: Wage Type & Daily Rate for Today */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {language === "ar" ? "نظام العمل والحساب لليوم:" : "Wage Type for Today:"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAttForm({ ...attForm, employmentType: "monthly" })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        attForm.employmentType !== "daily"
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {language === "ar" ? "راتب شهري" : "Monthly"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttForm({ ...attForm, employmentType: "daily" })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        attForm.employmentType === "daily"
                          ? "bg-amber-600 text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {language === "ar" ? "عامل / فني باليومية" : "Daily Rate"}
                    </button>
                  </div>
                </div>

                {attForm.employmentType === "daily" && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                        {language === "ar" ? "أجر اليومية المتفق عليه (AED):" : "Daily Wage Rate (AED):"}
                      </label>
                      <input
                        type="number"
                        step="1"
                        placeholder="150"
                        value={attForm.dailyWage}
                        onChange={(e) => setAttForm({ ...attForm, dailyWage: e.target.value })}
                        className="w-full px-3 py-1.5 border border-amber-300 rounded-xl text-xs font-mono font-bold text-amber-900 outline-none focus:border-amber-600 bg-white"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-arabic">{language === "ar" ? "المستحق الفعلي اليوم:" : "Calculated Today:"}</span>
                      <div className="font-mono font-bold text-sm text-emerald-700">
                        {calculateDayWage(attForm.dailyWage, attForm.status, attForm.overtimeHours).toLocaleString()} AED
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: دوره وتخصصه في الموقع اليوم (Core Request) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-teal-600" />
                  <span>{language === "ar" ? "دوره وتخصصه في الموقع اليوم:" : "Role & Duty at Site Today:"}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "اكتب دوره اليوم (مثال: فني تركيب كاميرات، فني تمديدات، مساعد...)" : "Role today..."}
                  value={attForm.roleToday}
                  onChange={(e) => setAttForm({ ...attForm, roleToday: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-teal-600 text-slate-900"
                />

                {/* Quick Presets for Role */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "فني تركيب وبرمجة كاميرات وNVR",
                    "فني أنظمة ذكية وسمارت هوم",
                    "فني تمديدات وسحب كابلات ومواسير",
                    "مساعد فني / تكسير وتجهيز مسارات",
                    "مشرف موقع وفحص واستلام",
                    "فني كهرباء ولوحات تحكم",
                    "أعمال صيانة وإصلاح أعطال",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAttForm({ ...attForm, roleToday: preset })}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        attForm.roleToday === preset
                          ? "bg-teal-50 border-teal-300 text-teal-800 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: في أي موقع اليوم (Core Request) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>{language === "ar" ? "في أي موقع اليوم / المشروع الميداني:" : "Site Location & Project:"}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <select
                      value={attForm.projectId}
                      onChange={(e) => handleSelectProjectForAttendance(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-600 bg-white"
                    >
                      <option value="">{language === "ar" ? "اختر من المشاريع (اختياري)..." : "Select project..."}</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.clientName})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder={language === "ar" ? "اسم الموقع بالتفصيل اليوم (فيلا جميرا 3، الطابق الأرضي...)" : "Site location..."}
                      value={attForm.siteLocation}
                      onChange={(e) => setAttForm({ ...attForm, siteLocation: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-teal-600 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                  <span className="text-[10px] text-slate-400">{language === "ar" ? "مواقع سريعة:" : "Quick sites:"}</span>
                  {["الورشة المركزية / المكتب", "موقع فيلا دبي مارينا", "موقع فيلا الشيخ زايد", "موقع نخلة جميرا"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAttForm({ ...attForm, siteLocation: s })}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 5: Attendance Status, Hours, Overtime */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "حالة الحضور" : "Status"}
                  </label>
                  <select
                    value={attForm.status}
                    onChange={(e) => setAttForm({ ...attForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="present">{language === "ar" ? "حاضر" : "Present"}</option>
                    <option value="half_day">{language === "ar" ? "نصف يوم" : "Half Day"}</option>
                    <option value="leave">{language === "ar" ? "إجازة" : "Leave"}</option>
                    <option value="absent">{language === "ar" ? "غائب" : "Absent"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "ساعات العمل" : "Hours"}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={attForm.hoursWorked}
                    onChange={(e) => setAttForm({ ...attForm, hoursWorked: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "إضافي (ساعات)" : "Overtime"}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={attForm.overtimeHours}
                    onChange={(e) => setAttForm({ ...attForm, overtimeHours: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-teal-600 font-bold text-amber-600"
                  />
                </div>
              </div>

              {/* Row 6: Task Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "المهام المنجزة وملاحظات العمل اليوم" : "Work Done / Notes"}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === "ar" ? "تمديد شبكة الكاميرات، ضبط وبرمجة لوحة الإنتركم، سحب كابلات الطابق الأرضي..." : "Tasks completed..."}
                  value={attForm.taskDescription}
                  onChange={(e) => setAttForm({ ...attForm, taskDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-600"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAttModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingAtt}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingAtt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{language === "ar" ? "تسجيل اليومية" : "Save Attendance"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT EMPLOYEE (إضافة وتعديل موظف / عامل باليومية)            */}
      {/* ========================================================================= */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-indigo-50/70 sticky top-0 z-10 backdrop-blur-xs">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>{editingEmp ? (language === "ar" ? "تعديل بيانات الموظف" : "Edit Employee") : (language === "ar" ? "إضافة موظف / فني جديد" : "New Employee")}</span>
              </h3>
              <button
                onClick={() => setShowAddEmpModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEmpSubmit} className="p-6 space-y-4">
              {/* Row 1: ID and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "الرقم الوظيفي" : "Employee ID"}
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.empNo}
                    onChange={(e) => setEmpForm({ ...empForm, empNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-indigo-600 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "الحالة الوظيفية" : "Status"}
                  </label>
                  <select
                    value={empForm.status}
                    onChange={(e) => setEmpForm({ ...empForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 bg-white"
                  >
                    <option value="active">{language === "ar" ? "على رأس العمل (نشط)" : "Active"}</option>
                    <option value="on_leave">{language === "ar" ? "في إجازة" : "On Leave"}</option>
                    <option value="terminated">{language === "ar" ? "منتهي العقد" : "Terminated"}</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "الاسم الكامل" : "Full Name"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "أدخل اسم الموظف أو الفني..." : "Employee full name..."}
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
                />
              </div>

              {/* Row 3: Role and Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "المسمى الوظيفي والتخصص" : "Job Role / Title"}
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.role}
                    onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "رقم الهاتف" : "Phone"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+971 50..."
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              {/* Row 4: Employment Type Selection (Monthly vs Daily) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "نظام العمل والتوظيف" : "Employment Type"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEmpForm({ ...empForm, employmentType: "monthly" })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      empForm.employmentType !== "daily"
                        ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-bold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>👔</span>
                    <span>{language === "ar" ? "موظف براتب شهري" : "Monthly Salary"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpForm({ ...empForm, employmentType: "daily" })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      empForm.employmentType === "daily"
                        ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>👷‍♂️</span>
                    <span>{language === "ar" ? "عامل / فني باليومية" : "Daily Worker / Freelance"}</span>
                  </button>
                </div>
              </div>

              {/* Row 5: Wage Inputs according to type */}
              {empForm.employmentType === "daily" ? (
                <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    {language === "ar" ? "قيمة يومية العامل المتفق عليها (AED / اليوم)" : "Daily Wage Rate (AED / Day)"}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="مثال: 150"
                    value={empForm.dailyRate}
                    onChange={(e) => setEmpForm({ ...empForm, dailyRate: e.target.value })}
                    className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs font-mono font-bold text-amber-900 outline-none focus:border-amber-600 bg-white"
                  />
                  <p className="mt-1 text-[10px] text-amber-700">
                    {language === "ar" ? "يتم احتساب أجر اليومية تلقائياً عند تسجيل حضوره في أي موقع ميداني." : "Daily wage is calculated upon attendance check-in."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === "ar" ? "الراتب الأساسي (AED)" : "Basic Salary"}
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={empForm.basicSalary}
                      onChange={(e) => setEmpForm({ ...empForm, basicSalary: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === "ar" ? "البدلات الشهرية (AED)" : "Allowances"}
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={empForm.allowances}
                      onChange={(e) => setEmpForm({ ...empForm, allowances: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingEmp}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingEmp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{language === "ar" ? "حفظ الموظف" : "Save Employee"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT PAYROLL (تعديل مستحقات الموظف والبونص)                       */}
      {/* ========================================================================= */}
      {showPayrollEditModal && selectedPayroll && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <span>{language === "ar" ? `مستحقات: ${selectedPayroll.employeeName}` : `Payroll: ${selectedPayroll.employeeName}`}</span>
              </h3>
              <button
                onClick={() => setShowPayrollEditModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayrollSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "الأساسي + البدلات" : "Basic + Allowances"}
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700">
                    {(selectedPayroll.basicSalary + selectedPayroll.allowances).toLocaleString()} AED
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "حالة الصرف" : "Payment Status"}
                  </label>
                  <select
                    value={selectedPayroll.status}
                    onChange={(e) => setSelectedPayroll({ ...selectedPayroll, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 bg-white"
                  >
                    <option value="pending">{language === "ar" ? "بانتظار الصرف" : "Pending"}</option>
                    <option value="paid">{language === "ar" ? "تم التحويل والصرف" : "Paid"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    {language === "ar" ? "البونص / المكافأة (AED)" : "Bonus (AED)"}
                  </label>
                  <input
                    type="number"
                    value={selectedPayroll.bonus}
                    onChange={(e) => setSelectedPayroll({ ...selectedPayroll, bonus: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-700 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1">
                    {language === "ar" ? "بدل إضافي (AED)" : "Overtime Amount"}
                  </label>
                  <input
                    type="number"
                    value={selectedPayroll.overtimeAmount}
                    onChange={(e) => setSelectedPayroll({ ...selectedPayroll, overtimeAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs font-mono font-bold text-amber-700 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">
                    {language === "ar" ? "الخصومات (AED)" : "Deductions (AED)"}
                  </label>
                  <input
                    type="number"
                    value={selectedPayroll.deductions}
                    onChange={(e) => setSelectedPayroll({ ...selectedPayroll, deductions: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl text-xs font-mono font-bold text-rose-700 outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">
                    {language === "ar" ? "خصم سلفة (AED)" : "Advance Deduction"}
                  </label>
                  <input
                    type="number"
                    value={selectedPayroll.advanceDeduction}
                    onChange={(e) => setSelectedPayroll({ ...selectedPayroll, advanceDeduction: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl text-xs font-mono font-bold text-rose-700 outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Net preview */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-purple-900">{language === "ar" ? "الصافي المستحق للموظف:" : "Calculated Net Salary:"}</span>
                <span className="font-mono font-extrabold text-base text-purple-900">
                  {Math.max(
                    0,
                    (selectedPayroll.basicSalary || 0) +
                    (selectedPayroll.allowances || 0) +
                    (selectedPayroll.bonus || 0) +
                    (selectedPayroll.overtimeAmount || 0) -
                    (selectedPayroll.deductions || 0) -
                    (selectedPayroll.advanceDeduction || 0)
                  ).toLocaleString()} AED
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayrollEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingPayroll}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingPayroll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{language === "ar" ? "حفظ التعديلات" : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: QUICK BONUS & DEDUCTION MODAL (إضافة بونص أو خصم سريع)           */}
      {/* ========================================================================= */}
      {showQuickAdjModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-arabic">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  quickAdj.type === "bonus" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                }`}>
                  {quickAdj.type === "bonus" ? <Gift size={22} /> : <ShieldAlert size={22} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {quickAdj.type === "bonus" ? "إضافة مكافأة / بونص تشجيعي" : "تطبيق خصم / جزاء مالي"}
                  </h3>
                  <p className="text-xs text-slate-500">تحديث فوري لمسير الراتب ومستحقات الموظف</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickAdjModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAdj} className="space-y-4">
              {/* Type Switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuickAdj({ ...quickAdj, type: "bonus", reason: "إنجاز مبكر وكفاءة في الموقع ⚡" })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    quickAdj.type === "bonus"
                      ? "bg-emerald-600 text-white shadow-2xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Gift size={14} />
                  <span>مكافأة / بونص (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickAdj({ ...quickAdj, type: "deduction", reason: "تأخير غير مبرر ⏳" })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    quickAdj.type === "deduction"
                      ? "bg-rose-600 text-white shadow-2xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ShieldAlert size={14} />
                  <span>خصم جزائي (-)</span>
                </button>
              </div>

              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الموظف أو الفني المستهدف:</label>
                <select
                  value={quickAdj.employeeId}
                  onChange={(e) => setQuickAdj({ ...quickAdj, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-600"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role}) - {emp.employmentType === "daily" ? "يومية" : "شهري"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Quick Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المبلغ (درهم إماراتي - AED):
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={quickAdj.amount}
                  onChange={(e) => setQuickAdj({ ...quickAdj, amount: e.target.value })}
                  className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold outline-none focus:bg-white ${
                    quickAdj.type === "bonus"
                      ? "border-emerald-300 text-emerald-800 focus:border-emerald-600"
                      : "border-rose-300 text-rose-800 focus:border-rose-600"
                  }`}
                />
                <div className="flex gap-1.5 mt-2">
                  {["50", "100", "200", "500"].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuickAdj({ ...quickAdj, amount: preset })}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-mono font-bold cursor-pointer"
                    >
                      {preset} AED
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السبب / البند:</label>
                <input
                  type="text"
                  required
                  value={quickAdj.reason}
                  onChange={(e) => setQuickAdj({ ...quickAdj, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-purple-600 mb-1.5"
                />
                <div className="flex flex-wrap gap-1">
                  {(quickAdj.type === "bonus"
                    ? [
                        "⚡ إنجاز مبكر قبل الموعد",
                        "⭐ جودة استثنائية في الموقع",
                        "🏆 التزام متميز وتفاني",
                        "🛠️ حل عطل طارئ بنجاح"
                      ]
                    : [
                        "⏳ تأخير غير مبرر",
                        "❌ غياب بدون إذن مسبق",
                        "⚠️ مخالفة اشتراطات السلامة",
                        "🔧 تلف أو فقدان مواد وعدة"
                      ]
                  ).map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setQuickAdj({ ...quickAdj, reason: chip })}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شهر الاستحقاق في مسير الرواتب:</label>
                <input
                  type="month"
                  value={quickAdj.month}
                  onChange={(e) => setQuickAdj({ ...quickAdj, month: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAdjModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingAdj}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-xs cursor-pointer ${
                    quickAdj.type === "bonus"
                      ? "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300"
                      : "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300"
                  }`}
                >
                  {savingAdj ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  <span>{quickAdj.type === "bonus" ? "اعتماد المكافأة" : "اعتماد الخصم"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONLINE SIGNED SALARY VOUCHER MODAL (سند استلام الراتب والمخالصة الإلكترونية) */}
      {signingVoucherRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:m-0 print:border-none print:shadow-none print:max-w-none printable-area">
            
            {/* Modal Top Bar (Hidden on print) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm font-arabic">
                  {signingVoucherRecord.status === "paid" && signingVoucherRecord.employeeSignature
                    ? (language === "ar" ? "سند استلام الراتب المعتمد والموقّع إلكترونياً" : "Official Signed Salary Disbursement Voucher")
                    : (language === "ar" ? "صرف الراتب واعتماد إيصال الاستلام والتوقيع الإلكتروني" : "Disburse Salary & Employee Online Signature")}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "طباعة السند / PDF" : "Print Voucher"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSigningVoucherRecord(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Body */}
            <div className="p-6 sm:p-8 space-y-6 font-arabic bg-white text-slate-900" id="salary-voucher-preview-page">
              
              {/* Header: Company Info & Voucher Title */}
              <div className="border-b-2 border-purple-900 pb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings?.logoBase64 || "/logo.png"}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                      {settings?.companyName || "مؤسسة رواد سمارت للأجهزة الذكية"}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                      RUAAD SMART MACHINE TRADING LLC
                    </p>
                    <p className="text-[11px] text-purple-700 font-mono mt-0.5 font-bold">
                      {language === "ar" ? "الرقم الضريبي:" : "TRN:"} {settings?.taxNumber || "100234567800003"}
                    </p>
                  </div>
                </div>

                <div className="text-right" dir="ltr">
                  <div className="inline-block px-3 py-1 bg-purple-100 text-purple-900 font-bold text-xs rounded-lg border border-purple-300 font-mono mb-1">
                    SALARY VOUCHER
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-800">
                    {signingVoucherRecord.receiptNo || `SAL-${signingVoucherRecord.month.replace("-", "")}-${signingVoucherRecord.employeeId.slice(-4)}`}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Date: {voucherPaymentDate}
                  </div>
                </div>
              </div>

              {/* Title Banner */}
              <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-extrabold text-sm sm:text-base text-purple-950">
                  {language === "ar" ? "سند استلام وصرف راتب ومخالصة مالية" : "SALARY DISBURSEMENT & DISCHARGE RECEIPT"}
                </h3>
                <span className="text-xs text-slate-500 font-mono font-bold">
                  {language === "ar" ? `عن شهر: ${signingVoucherRecord.month}` : `Period: ${signingVoucherRecord.month}`}
                </span>
              </div>

              {/* Employee & Voucher Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">اسم الموظف:</span>
                  <span className="font-bold text-slate-900 text-sm">{signingVoucherRecord.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">المسمى الوظيفي:</span>
                  <span className="font-semibold text-slate-800">
                    {employees.find(e => e.id === signingVoucherRecord.employeeId)?.role || "موظف / فني"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">طريقة الصرف:</span>
                  <div className="no-print">
                    <select
                      value={voucherPaymentMethod}
                      onChange={(e: any) => setVoucherPaymentMethod(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-purple-900 outline-none mt-0.5 cursor-pointer"
                    >
                      <option value="bank_transfer">تحويل بنكي / WPS</option>
                      <option value="cash">نقداً (Cash)</option>
                      <option value="cheque">شيك مصرفي</option>
                    </select>
                  </div>
                  <div className="hidden print:block font-bold text-slate-900">
                    {voucherPaymentMethod === "bank_transfer" ? "تحويل بنكي / WPS" : voucherPaymentMethod === "cash" ? "نقداً" : "شيك مصرفي"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">تاريخ الصرف:</span>
                  <div className="no-print">
                    <input
                      type="date"
                      value={voucherPaymentDate}
                      onChange={(e) => setVoucherPaymentDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-slate-800 outline-none mt-0.5 cursor-pointer"
                    />
                  </div>
                  <div className="hidden print:block font-bold font-mono text-slate-900">
                    {voucherPaymentDate}
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left" dir={isRtl ? "rtl" : "ltr"}>
                  <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">بند الاستحقاق / الاستقطاع</th>
                      <th className="py-2.5 px-3 text-right">البيان</th>
                      <th className="py-2.5 px-3 text-right">المبلغ (AED)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-800">الراتب الأساسي</td>
                      <td className="py-2 px-3 text-right font-sans text-slate-500 text-[11px]">الراتب الأساسي الشهري المتعاقد عليه</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{(signingVoucherRecord.basicSalary || 0).toLocaleString()} AED</td>
                    </tr>
                    {(signingVoucherRecord.allowances || 0) > 0 && (
                      <tr>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">البدلات (سكن ومواصلات)</td>
                        <td className="py-2 px-3 text-right font-sans text-slate-500 text-[11px]">بدلات تشغيلية متفق عليها</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{(signingVoucherRecord.allowances || 0).toLocaleString()} AED</td>
                      </tr>
                    )}
                    {(signingVoucherRecord.bonus || 0) > 0 && (
                      <tr className="bg-emerald-50/30">
                        <td className="py-2 px-3 font-sans font-semibold text-emerald-800 flex items-center gap-1">
                          <Gift className="w-3 h-3 text-emerald-600" />
                          <span>مكافأة وبونص الأداء</span>
                        </td>
                        <td className="py-2 px-3 text-right font-sans text-emerald-600 text-[11px]">حافز كفاءة وإنجاز بالمشاريع</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">+{signingVoucherRecord.bonus.toLocaleString()} AED</td>
                      </tr>
                    )}
                    {(signingVoucherRecord.overtimeAmount || 0) > 0 && (
                      <tr className="bg-amber-50/30">
                        <td className="py-2 px-3 font-sans font-semibold text-amber-800">ساعات عمل إضافية</td>
                        <td className="py-2 px-3 text-right font-sans text-amber-600 text-[11px]">بدل إضافي موثق في اليوميات</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-700">+{signingVoucherRecord.overtimeAmount.toLocaleString()} AED</td>
                      </tr>
                    )}
                    {(signingVoucherRecord.deductions || 0) > 0 && (
                      <tr className="bg-rose-50/30">
                        <td className="py-2 px-3 font-sans font-semibold text-rose-800">خصومات وجزاءات</td>
                        <td className="py-2 px-3 text-right font-sans text-rose-600 text-[11px]">غياب أو تأخير مسجل</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-700">-{signingVoucherRecord.deductions.toLocaleString()} AED</td>
                      </tr>
                    )}
                    {(signingVoucherRecord.advanceDeduction || 0) > 0 && (
                      <tr className="bg-rose-50/30">
                        <td className="py-2 px-3 font-sans font-semibold text-rose-800">استقطاع سلف سابقة</td>
                        <td className="py-2 px-3 text-right font-sans text-rose-600 text-[11px]">تسوية سلفة سابقة مستحقة</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-700">-{signingVoucherRecord.advanceDeduction.toLocaleString()} AED</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-purple-900 text-white font-bold font-mono">
                      <td colSpan={2} className="py-3 px-3 font-sans font-extrabold text-sm">
                        صافي المبلغ المستحق والمستلم (Net Paid):
                      </td>
                      <td className="py-3 px-3 text-right text-base text-emerald-400 font-extrabold">
                        {signingVoucherRecord.netSalary?.toLocaleString()} AED
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount in Arabic Words (Tafqeet) */}
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold">{language === "ar" ? "المبلغ كتابةً:" : "In Words:"}</span>
                <span className="font-bold text-purple-950 font-arabic">
                  فقط {numberToArabicWords(signingVoucherRecord.netSalary)} درهماً إماراتياً لا غير.
                </span>
              </div>

              {/* Legal Acknowledgment & Settlement Statement */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-arabic">
                <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />
                  <span>إقرار استلام ومخالصة مالية نهائية عن الشهر:</span>
                </p>
                <p>
                  أقر أنا الموظف <strong>{signingVoucherRecord.employeeName}</strong>، بأنني قد استلمت كامل رواتبي ومستحقاتي وبدلاتي الموضحة أعلاه عن شهر <strong>({signingVoucherRecord.month})</strong> نقداً أو عبر الحساب البنكي، وليس لدي أي مطالبات أو حقوق مالية أو عمالية تجاه مؤسسة رواد سمارت للأجهزة الذكية عن هذه الفترة، ويُعد توقيعي الإلكتروني أدناه إبراءً تاماً وشاملاً لا رجعة فيه.
                </p>
              </div>

              {/* Signatures & Transparent Stamp Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* 1. Employee Digital Signature Area */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-purple-700" />
                      <span>توقيع واستلام الموظف:</span>
                    </span>
                    {signingVoucherRecord.employeeSignature && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>موثّق إلكترونياً</span>
                      </span>
                    )}
                  </div>

                  {/* Canvas or Displayed Signature */}
                  <div className="h-28 border-2 border-dashed border-purple-200 rounded-xl bg-white overflow-hidden flex items-center justify-center relative">
                    {signingVoucherRecord.employeeSignature ? (
                      <div className="flex flex-col items-center justify-center h-full w-full p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signingVoucherRecord.employeeSignature}
                          alt="Employee Signature"
                          className="max-h-20 object-contain drop-shadow-xs"
                        />
                        {signingVoucherRecord.signedAt && (
                          <span className="text-[9px] text-slate-400 font-mono mt-1">
                            تاريخ التوقيع: {new Date(signingVoucherRecord.signedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <SignatureCanvas
                        ref={voucherSigCanvasRef}
                        penColor="#1e1b4b"
                        canvasProps={{
                          className: "w-full h-full cursor-crosshair",
                          style: { width: "100%", height: "110px" }
                        }}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 no-print">
                    {!signingVoucherRecord.employeeSignature ? (
                      <>
                        <span>(وقع بإصبعك أو الماوس في الإطار)</span>
                        <button
                          type="button"
                          onClick={() => voucherSigCanvasRef.current?.clear()}
                          className="text-xs text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer flex items-center gap-0.5"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>مسح</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSigningVoucherRecord({
                            ...signingVoucherRecord,
                            employeeSignature: undefined,
                          });
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                      >
                        إعادة التوقيع
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Management Approval & Transparent Stamp */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-700" />
                      <span>اعتماد الإدارة والختم الرسمي:</span>
                    </span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      معتمد للصرف
                    </span>
                  </div>

                  {/* Stamp & Approver Area */}
                  <div className="h-28 border border-slate-200 rounded-xl bg-white p-3 relative flex items-center justify-between">
                    <div className="space-y-1 z-10">
                      <span className="text-[11px] text-slate-500 block">المسؤول عن الصرف:</span>
                      <input
                        type="text"
                        value={voucherDisbursedBy}
                        onChange={(e) => setVoucherDisbursedBy(e.target.value)}
                        className="text-xs font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 outline-none w-36 font-arabic"
                      />
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Financial Controller
                      </span>
                    </div>

                    {/* Official Transparent Company Stamp */}
                    <div className="w-24 h-24 opacity-90 select-none pointer-events-none -rotate-6 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={settings?.stampBase64 || "/stamp.png"}
                        alt="Company Stamp"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center font-mono">
                    Ruaad Smart LLC - Official Disbursement Seal
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Bottom Actions (Hidden on print) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
              <button
                type="button"
                onClick={() => setSigningVoucherRecord(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الإيصال / PDF</span>
                </button>

                <button
                  type="button"
                  disabled={savingVoucher}
                  onClick={handleSaveSalaryVoucher}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingVoucher ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>
                    {signingVoucherRecord.status === "paid" && signingVoucherRecord.employeeSignature
                      ? "تحديث وحفظ السند"
                      : "اعتماد الصرف وتوثيق التوقيع"}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* Full-screen Photo View Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-xs font-arabic">
                  {viewingPhoto.phase || "توثيق الموقع الميداني"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingPhoto(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-black flex items-center justify-center max-h-[70vh] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingPhoto.url}
                alt={viewingPhoto.caption || "Photo"}
                className="max-h-[65vh] max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="p-4 bg-white space-y-1 text-xs font-arabic">
              <p className="font-bold text-slate-900 text-sm">{viewingPhoto.caption || "بدون وصف"}</p>
              <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1">
                <span>بواسطة: <strong>{viewingPhoto.uploadedBy}</strong></span>
                <span className="font-mono">
                  {viewingPhoto.uploadedAt ? new Date(viewingPhoto.uploadedAt).toLocaleString() : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DB_NAME = 'ruaad_smart_dubai_db';
const DB_VERSION = 1;

export interface PurchaseInvoice {
  id: string;
  name: string;
  fileData: string; // base64 string
  fileType: string;
  uploadedAt: string;
}

export interface QuotationItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  cost?: number; // Internal cost price
  total: number;
}

export interface Quotation {
  id: string;
  quotationNo: string;
  date: string;
  validUntil: string;
  preparedBy: string;
  clientName: string;
  contactNo: string;
  email: string;
  locationArea: string;
  projectReference: string;
  items: QuotationItem[];
  subtotal: number;
  discount?: number;
  total: number;
  paymentTerms: string;
  termsConditions: string;
  preparedByName: string;
  preparedByDate: string;
  clientAcceptanceName: string;
  clientAcceptanceDate: string;
  companyName: string;
  bankName: string;
  bankIban: string;
  bankBic?: string;
  bankAddress?: string;
  companyAddress: string;
  companyEmail: string;
  purchaseInvoices?: PurchaseInvoice[];
  status?: 'pending' | 'approved' | 'executed' | 'rejected' | 'cancelled';
  invoiceType?: 'standard' | 'tax';
  taxJurisdiction?: 'UAE' | 'KSA';
  vatRate?: number;
  vatAmount?: number;
  currency?: string;
  clientTaxNumber?: string;
  companyTaxNumber?: string;
  zatcaQrCode?: string;
  clientSignature?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateItem {
  id: string;
  system: string;
  remarks: string;
  done: boolean;
}

export interface Certificate {
  id: string;
  project: string;
  systemType: string;
  statement: string;
  checklist: CertificateItem[];
  warrantyText: string;
  clientName: string;
  clientSignature?: string; // base64 signature image
  clientStamp?: string; // base64 stamp image
  clientDate: string;
  integratorName: string;
  integratorSignature?: string; // base64 signature image
  integratorDate: string;
  address: string;
  website: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

// Quotation Operations
export async function saveQuotation(quotation: Quotation): Promise<void> {
  const res = await fetch('/api/quotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quotation),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save quotation');
  }
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  const res = await fetch(`/api/quotations/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch quotation');
  return res.json();
}

export async function getAllQuotations(): Promise<Quotation[]> {
  const res = await fetch('/api/quotations', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch quotations');
  return res.json();
}

export async function deleteQuotation(id: string): Promise<void> {
  const res = await fetch(`/api/quotations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete quotation');
}

// Certificate Operations
export async function saveCertificate(certificate: Certificate): Promise<void> {
  const res = await fetch('/api/certificates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(certificate),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save certificate');
  }
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  const res = await fetch(`/api/certificates/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch certificate');
  return res.json();
}

// Certificate List Operations
export async function getAllCertificates(): Promise<Certificate[]> {
  const res = await fetch('/api/certificates', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch certificates');
  return res.json();
}

export async function deleteCertificate(id: string): Promise<void> {
  const res = await fetch(`/api/certificates/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete certificate');
}

export interface Receipt {
  id: string;
  receiptNo: string;
  date: string;
  clientName: string;
  amount: number;
  amountInWords: string;
  paymentMethod: "cash" | "bank" | "cheque";
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
  receivedFor: string;
  receivedBy: string;
  integratorSignature?: string;
  createdAt: string;
  updatedAt: string;
  // Tax Invoice Fields
  invoiceType?: "standard" | "tax";
  taxRate?: number;
  taxAmount?: number;
  subtotal?: number;
  clientTaxNumber?: string;
  zatcaQrCode?: string; // Base64 encoded TLV
  uuid?: string;        // UUIDv4 for tamper resistance
}

// Receipt Operations
export async function saveReceipt(receipt: Receipt): Promise<void> {
  const res = await fetch('/api/receipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(receipt),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save receipt');
  }
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  const res = await fetch(`/api/receipts/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch receipt');
  return res.json();
}

export async function getAllReceipts(): Promise<Receipt[]> {
  const res = await fetch('/api/receipts', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch receipts');
  return res.json();
}

export async function deleteReceipt(id: string): Promise<void> {
  const res = await fetch(`/api/receipts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete receipt');
}

export interface RolePermissions {
  canViewCostAndProfit: boolean;        // رؤية التكاليف وهامش أرباح الشركة في عروض الأسعار
  canCreateQuotation: boolean;          // إنشاء وتعديل عروض الأسعار
  canDeleteQuotation: boolean;          // حذف عروض الأسعار
  canIssueTaxInvoice: boolean;          // إصدار الفواتير الضريبية (FTA و ZATCA)
  canIssueStandardInvoice: boolean;     // إصدار الفواتير العادية وبيانات الأسعار
  canManageExpenses: boolean;           // إنشاء وتعديل وحذف سندات الصرف
  canManageReceipts: boolean;           // إنشاء وتعديل وحذف سندات القبض
  canManageProjects: boolean;           // إدارة المشاريع ونقل المراحل
  canManageDailyWorkers: boolean;       // تسجيل يوميات وحضور الفنيين والعمال
  canManagePayroll: boolean;            // إدارة مسير الرواتب والبونص والخصومات
  canViewVatReports: boolean;           // الاطلاع على الإقرارات الضريبية والقوائم المالية
  canEditSettings: boolean;             // تعديل إعدادات الشركة والأرقام الضريبية
  canManagePermissions: boolean;        // التحكم في صلاحيات المستخدمين (خاص بالإدارة العليا فقط)
}

export const DEFAULT_EXECUTIVE_PERMISSIONS: RolePermissions = {
  canViewCostAndProfit: true,
  canCreateQuotation: true,
  canDeleteQuotation: true,
  canIssueTaxInvoice: true,
  canIssueStandardInvoice: true,
  canManageExpenses: true,
  canManageReceipts: true,
  canManageProjects: true,
  canManageDailyWorkers: true,
  canManagePayroll: true,
  canViewVatReports: true,
  canEditSettings: true,
  canManagePermissions: true,
};

export const DEFAULT_ACCOUNTING_PERMISSIONS: RolePermissions = {
  canViewCostAndProfit: true,
  canCreateQuotation: true,
  canDeleteQuotation: false,
  canIssueTaxInvoice: true,
  canIssueStandardInvoice: true,
  canManageExpenses: true,
  canManageReceipts: true,
  canManageProjects: false,
  canManageDailyWorkers: true,
  canManagePayroll: true,
  canViewVatReports: true,
  canEditSettings: false,
  canManagePermissions: false,
};

export const DEFAULT_OPERATIONS_PERMISSIONS: RolePermissions = {
  canViewCostAndProfit: false,
  canCreateQuotation: true,
  canDeleteQuotation: false,
  canIssueTaxInvoice: false,
  canIssueStandardInvoice: true,
  canManageExpenses: false,
  canManageReceipts: false,
  canManageProjects: true,
  canManageDailyWorkers: true,
  canManagePayroll: false,
  canViewVatReports: false,
  canEditSettings: false,
  canManagePermissions: false,
};

export interface Settings {
  companyName?: string;
  logoBase64?: string;
  stampBase64?: string;
  taxJurisdiction?: "UAE" | "KSA" | "dual";
  taxRate?: number;    // e.g. 5 or 15
  taxNumber?: string;  // e.g. 100... or 300...
  uaeTaxNumber?: string;
  saudiTaxNumber?: string;
  currency?: string;   // e.g. "SAR", "AED", "USD", "EGP"
  // Multi-user & Permissions Credentials
  adminUsername?: string;
  adminPassword?: string;
  executivePin?: string;
  accountantUsername?: string;
  accountantPassword?: string;
  accountingPermissions?: RolePermissions;
  operationsUsername?: string;
  operationsPassword?: string;
  operationsPermissions?: RolePermissions;
}

export async function getSettings(): Promise<Settings> {
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    return {};
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save settings');
  }
}

export interface ContractClause {
  title: string;
  content: string;
}

export interface Contract {
  id: string;
  contractNo: string;
  date: string;
  location: string;
  title: string;
  firstPartyName: string;
  firstPartyPhone: string;
  firstPartyAddress: string;
  secondPartyName: string;
  secondPartyPhone: string;
  secondPartyAddress: string;
  clauses: ContractClause[];
  totalCost: number;
  totalCostWords: string;
  firstPartySignName: string;
  firstPartySignature?: string;
  firstPartyStamp?: string;
  firstPartySignDate: string;
  secondPartySignName: string;
  secondPartySignature?: string;
  secondPartySignDate: string;
  createdAt: string;
  updatedAt: string;
  quotationId?: string;
}

// Contract Operations
export async function saveContract(contract: Contract): Promise<void> {
  const res = await fetch('/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contract),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save contract');
  }
}

export async function getContract(id: string): Promise<Contract | null> {
  const res = await fetch(`/api/contracts/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch contract');
  return res.json();
}

export async function getAllContracts(): Promise<Contract[]> {
  const res = await fetch('/api/contracts', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch contracts');
  return res.json();
}

export async function deleteContract(id: string): Promise<void> {
  const res = await fetch(`/api/contracts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete contract');
}

// Official Letters Operations
export interface OfficialLetter {
  id: string;
  letterNo: string;
  date: string;
  addressedTo: string;
  letterType: string;
  customTitle?: string;
  content: string;
  signatoryName?: string;
  signatoryTitle?: string;
  signatureImage?: string;
  stampBase64?: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveOfficialLetter(letter: OfficialLetter): Promise<void> {
  const res = await fetch('/api/letters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(letter),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save official letter');
  }
}

export async function getOfficialLetter(id: string): Promise<OfficialLetter | null> {
  const res = await fetch(`/api/letters/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch official letter');
  return res.json();
}

export async function getAllOfficialLetters(): Promise<OfficialLetter[]> {
  const res = await fetch('/api/letters', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch official letters');
  return res.json();
}

export async function deleteOfficialLetter(id: string): Promise<void> {
  const res = await fetch(`/api/letters/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete official letter');
}

// ----------------------------------------------------
// 1. Accounting: Expenses & Payment Vouchers (سندات الصرف والمصروفات)
// ----------------------------------------------------
export interface Expense {
  id: string;
  voucherNo: string;
  date: string;
  category: "materials" | "salaries" | "rent" | "utilities" | "transport" | "tools" | "subcontractor" | "other";
  amount: number;
  recipient: string;
  description: string;
  projectId?: string;
  projectName?: string;
  paymentMethod: "cash" | "bank" | "cheque";
  receiptAttachment?: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveExpense(expense: Expense): Promise<void> {
  const res = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save expense');
  }
}

export async function getAllExpenses(): Promise<Expense[]> {
  const res = await fetch('/api/expenses', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return res.json();
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete expense');
}

// ----------------------------------------------------
// 2. HR: Employees (الموظفين)
// ----------------------------------------------------
export interface Employee {
  id: string;
  empNo: string;
  name: string;
  nationalId?: string;
  phone: string;
  email?: string;
  role: string;
  employmentType?: "monthly" | "daily"; // شهري أو باليومية
  dailyRate?: number; // قيمة يومية العامل/الفني بالدرهم
  basicSalary: number;
  allowances: number;
  joinDate: string;
  status: "active" | "on_leave" | "terminated";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveEmployee(employee: Employee): Promise<void> {
  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(employee),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save employee');
  }
}

export async function getAllEmployees(): Promise<Employee[]> {
  const res = await fetch('/api/employees', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch employees');
  return res.json();
}

export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete employee');
}

// ----------------------------------------------------
// 3. HR: Attendance / Daily Timesheets (اليوميات والحضور)
// ----------------------------------------------------
export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  employmentType?: "monthly" | "daily"; // شهري أو باليومية
  roleToday?: string; // دوره في الموقع اليوم (مثلاً: فني تركيب كاميرات، فني تمديدات، مساعد، لحام...)
  siteLocation?: string; // في أي موقع اليوم (اسم الموقع أو الفيلا بالتفصيل)
  dailyWage?: number; // يومية العامل / الأجر المستحق لليوم (AED)
  status: "present" | "absent" | "leave" | "half_day";
  hoursWorked: number;
  overtimeHours: number;
  projectId?: string;
  projectName?: string;
  taskDescription?: string;
  createdAt: string;
}

export async function saveAttendance(record: AttendanceRecord): Promise<void> {
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save attendance record');
  }
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  const res = await fetch('/api/attendance', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch attendance records');
  return res.json();
}

export async function deleteAttendance(id: string): Promise<void> {
  const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete attendance record');
}

// ----------------------------------------------------
// 4. HR: Payroll & Bonuses (مسير الرواتب والبونص)
// ----------------------------------------------------
export interface PayrollRecord {
  id: string;
  month: string; // YYYY-MM
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  overtimeAmount: number;
  deductions: number;
  advanceDeduction: number;
  netSalary: number;
  status: "pending" | "paid";
  paymentDate?: string;
  notes?: string;
  createdAt: string;
  // Online Signed Salary Voucher Fields
  receiptNo?: string;
  paymentMethod?: "cash" | "bank_transfer" | "cheque";
  employeeSignature?: string;
  signedAt?: string;
  disbursedBy?: string;
}

export async function savePayrollRecord(record: PayrollRecord): Promise<void> {
  const res = await fetch('/api/payroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save payroll record');
  }
}

export async function getAllPayrollRecords(): Promise<PayrollRecord[]> {
  const res = await fetch('/api/payroll', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch payroll records');
  return res.json();
}

export async function deletePayrollRecord(id: string): Promise<void> {
  const res = await fetch(`/api/payroll/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete payroll record');
}

// ----------------------------------------------------
// 5. Projects (إدارة المشاريع ومتابعة التنفيذ والصور)
// ----------------------------------------------------
export interface ProjectPhoto {
  id: string;
  url: string; // Base64 data URL or image path
  caption?: string; // وصف الصورة والعمل المنجز
  milestoneId?: string; // رقم أو معرف المرحلة
  milestoneTitle?: string; // عنوان المرحلة
  uploadedBy: string; // اسم الفني أو المهندس
  uploadedAt: string; // تاريخ وتوقيت الرفع
  phase?: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  targetDate?: string;
  completedDate?: string;
  assignedTo?: string; // Employee Name or ID
  notes?: string;
  photos?: string[];
}

export interface ProjectSiteLog {
  id: string;
  date: string;
  author: string;
  activity: string;
}

export interface Project {
  id: string;
  projectNo: string;
  title: string;
  clientName: string;
  clientPhone?: string;
  location?: string;
  status: "planned" | "in_progress" | "completed" | "on_hold";
  startDate: string;
  targetEndDate?: string;
  budget: number;
  contractId?: string;
  quotationId?: string;
  completionRate: number; // 0 - 100
  notes?: string;
  milestones?: ProjectMilestone[];
  siteLogs?: ProjectSiteLog[];
  sitePhotos?: ProjectPhoto[];
  assignedEmployees?: string[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PROJECT_MILESTONES: Omit<ProjectMilestone, "id">[] = [
  {
    title: "1. المعاينة الفنية وتخطيط مسارات الكابلات والموقع",
    description: "فحص موقع العميل، مراجعة المخططات الهندسية وتحديد أماكن الكاميرات والأجهزة ونقاط التغذية.",
    status: "completed",
  },
  {
    title: "2. توريد وتجهيز الأجهزة والمعدات والكاميرات",
    description: "توريد الكاميرات، مسجلات الفيديو NVR، السويتشات PoE، كبائن التوزيع، وحساسات البيت الذكي.",
    status: "in_progress",
  },
  {
    title: "3. التمديدات والتأسيسات الأولية (First Fix)",
    description: "سحب كابلات الشبكة Cat6، تركيب المواسير والترانك PVC، وتجهيز لوحات التوزيع.",
    status: "pending",
  },
  {
    title: "4. تركيب وتثبيت الكاميرات والأجهزة الذكية (Second Fix)",
    description: "تثبيت الكاميرات وضبط زوايا الرؤية، تركيب الشاشات، أقفال الأبواب الذكية وحساسات الحركة.",
    status: "pending",
  },
  {
    title: "5. البرمجة والربط بالشبكة وتطبيق الهاتف والتشغيل",
    description: "برمجة أجهزة التسجيل، ضبط كشف الحركة والإنذارات، والربط بتطبيق الجوال لمتابعة البث الحي.",
    status: "pending",
  },
  {
    title: "6. الفحص النهائي وتدريب العميل والتسليم (Handover)",
    description: "تسليم النظام، تدريب العميل على التشغيل، وتوقيع شهادة إتمام العمل والضمان.",
    status: "pending",
  },
];

export async function saveProject(project: Project): Promise<void> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save project');
  }
}

export async function getAllProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
}

// ----------------------------------------------------
// 6. Professional Accounting: Journal Entries & Chart of Accounts
// ----------------------------------------------------
export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  entryNo: string;
  date: string;
  reference?: string;
  description: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: "draft" | "posted";
  projectId?: string;
  projectName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartAccount {
  code: string;
  nameAr: string;
  nameEn: string;
  type: "asset" | "liability" | "equity" | "revenue" | "cost" | "expense";
  normalBalance: "debit" | "credit";
  description: string;
}

export const CHART_OF_ACCOUNTS: ChartAccount[] = [
  // Assets (الأصول)
  { code: "1010", nameAr: "صندوق النقدية (الخزينة الرئيسية)", nameEn: "Petty Cash", type: "asset", normalBalance: "debit", description: "النقدية السائلة بالخزينة الرئيسية" },
  { code: "1020", nameAr: "الحساب البنكي (بنك أبوظبي التجاري ADCB)", nameEn: "ADCB Bank Account", type: "asset", normalBalance: "debit", description: "الحساب التجاري الرئيسي للشركة" },
  { code: "1100", nameAr: "ذمم العملاء المدينة (حسابات القبض)", nameEn: "Accounts Receivable", type: "asset", normalBalance: "debit", description: "مستحقات على عملاء المشاريع الفلل والشركات" },
  { code: "1200", nameAr: "مشاريع تحت التنفيذ ومخزون مواد (WIP)", nameEn: "Work in Progress / Inventory", type: "asset", normalBalance: "debit", description: "قيمة المواد والأجهزة في المواقع قيد التركيب" },
  { code: "1300", nameAr: "أصول ثابتة (معدات وعدد وسيارات)", nameEn: "Fixed Assets & Equipment", type: "asset", normalBalance: "debit", description: "العدد الكهربائية وأجهزة الفحص وسيارات العمل" },

  // Liabilities (الخصوم والالتزامات)
  { code: "2010", nameAr: "ذمم الموردين الدائنة (حسابات الدفع)", nameEn: "Accounts Payable", type: "liability", normalBalance: "credit", description: "مستحقات لموردي الكاميرات والمواد" },
  { code: "2020", nameAr: "مستحقات مقاولي الباطن والفنيين", nameEn: "Subcontractors Payable", type: "liability", normalBalance: "credit", description: "أتعاب فنيي التمديدات المتبقية" },
  { code: "2150", nameAr: "ضريبة القيمة المضافة للمخرجات (5% المستحقة)", nameEn: "VAT Output Tax Payable (5%)", type: "liability", normalBalance: "credit", description: "الضريبة المحصلة الواجب توريدها للهيئة الاتحادية للضرائب" },
  { code: "2160", nameAr: "ضريبة القيمة المضافة للمدخلات (5% المستردة)", nameEn: "VAT Input Tax Recoverable", type: "asset", normalBalance: "debit", description: "الضريبة المدفوعة على المشتريات القابلة للاسترداد" },

  // Equity (حقوق الملكية)
  { code: "3010", nameAr: "رأس المال العامل المستثمر", nameEn: "Owner's Equity / Paid Capital", type: "equity", normalBalance: "credit", description: "رأس مال الشركة المؤسس" },
  { code: "3020", nameAr: "الأرباح المحتجزة / أرباح مدورة", nameEn: "Retained Earnings", type: "equity", normalBalance: "credit", description: "أرباح الفترات المالية السابقة" },

  // Revenues (الإيرادات)
  { code: "4010", nameAr: "إيرادات مشاريع الأنظمة الأمنية والذكية", nameEn: "Smart Systems & Security Revenue", type: "revenue", normalBalance: "credit", description: "إيرادات الفلل والقصور والشركات" },
  { code: "4020", nameAr: "إيرادات عقود الصيانة والتشغيل الدورية", nameEn: "Maintenance Contracts Revenue", type: "revenue", normalBalance: "credit", description: "عقود صيانة سنوية ومتابعة كاميرات" },

  // Direct Costs (تكاليف المشاريع المباشرة)
  { code: "5010", nameAr: "تكلفة شراء الكاميرات والمعدات والمواد", nameEn: "Direct Materials & Hardware Cost", type: "cost", normalBalance: "debit", description: "كابلات، كاميرات، NVR، سويتشات، أقفال ذكية" },
  { code: "5020", nameAr: "تكلفة مقاولي الباطن والعمالة المباشرة للمشاريع", nameEn: "Direct Subcontractor & Labor Cost", type: "cost", normalBalance: "debit", description: "أجور الفنيين والعمال في مواقع المشاريع" },

  // Operating Expenses (المصروفات التشغيلية والإدارية)
  { code: "6010", nameAr: "مصروفات الرواتب والأجور الشهرية والمكافآت", nameEn: "Salaries & Payroll Expenses", type: "expense", normalBalance: "debit", description: "رواتب الفريق الإداري والتقني وبونص الإنجاز" },
  { code: "6020", nameAr: "إيجار المقر والمستودع", nameEn: "Rent & Premises", type: "expense", normalBalance: "debit", description: "إيجار مقر ومستودع المعدات" },
  { code: "6030", nameAr: "مصروفات المواصلات وبترول السيارات", nameEn: "Fuel & Transportation", type: "expense", normalBalance: "debit", description: "وقود سيارات العمل ورسوم سالك" },
  { code: "6040", nameAr: "فواتير الكهرباء والمياه والاتصالات (ديوا واتصالات)", nameEn: "Utilities & Telecom (DEWA & Telco)", type: "expense", normalBalance: "debit", description: "فواتير كهرباء وإنترنت وهواتف العمل" },
  { code: "6050", nameAr: "أدوات وعدد صيانة ومستهلكات", nameEn: "Tools & Hardware Consumables", type: "expense", normalBalance: "debit", description: "دريلات، سلالم، مسامير وتيب" },
  { code: "6060", nameAr: "مصروفات إدارية وعمومية ونثريات وتراخيص", nameEn: "General & Administrative Expenses", type: "expense", normalBalance: "debit", description: "تجديد رخص تجارية، ضيافة، برامج سحابية" },
];

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const res = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save journal entry');
  }
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const res = await fetch('/api/journal', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch journal entries');
  return res.json();
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const res = await fetch(`/api/journal/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete journal entry');
}

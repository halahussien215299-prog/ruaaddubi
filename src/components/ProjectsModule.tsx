"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  FileText, 
  Users, 
  Layers, 
  X, 
  Loader2, 
  TrendingUp, 
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Printer,
  ChevronRight,
  PlayCircle,
  Clock4,
  CheckCircle,
  Flag,
  UserCheck,
  MessageSquare,
  Wrench,
  Camera,
  FastForward,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Share2,
  Copy,
  Image as ImageIcon,
  UploadCloud,
  Eye,
  FileCode,
  Download
} from "lucide-react";
import { 
  Project, 
  ProjectMilestone, 
  ProjectSiteLog, 
  ProjectPhoto,
  ProjectBlueprint,
  DEFAULT_PROJECT_MILESTONES, 
  Quotation, 
  Contract, 
  Receipt, 
  Expense, 
  AttendanceRecord, 
  Certificate,
  Employee
} from "@/lib/db";
import { useLanguage } from "@/lib/i18n";

interface ProjectsModuleProps {
  projects: Project[];
  quotations: Quotation[];
  contracts: Contract[];
  receipts: Receipt[];
  expenses: Expense[];
  attendance: AttendanceRecord[];
  certificates: Certificate[];
  employees?: Employee[];
  onSaveProject: (project: Project) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

export default function ProjectsModule({
  projects,
  quotations,
  contracts,
  receipts,
  expenses,
  attendance,
  certificates,
  employees = [],
  onSaveProject,
  onDeleteProject,
}: ProjectsModuleProps) {
  const { language, isRtl } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dossierTab, setDossierTab] = useState<"milestones" | "financials" | "labor" | "logs" | "photos" | "blueprints">("milestones");
  const [expandedCardProjectId, setExpandedCardProjectId] = useState<string | null>(null);

  // Photos Tab & Live Client Tracking States
  const [managementPhotoBase64, setManagementPhotoBase64] = useState<string>("");
  const [managementPhotoCaption, setManagementPhotoCaption] = useState<string>("");
  const [managementMilestoneId, setManagementMilestoneId] = useState<string>("");
  const [uploadingManagementPhoto, setUploadingManagementPhoto] = useState(false);
  const [copiedTrackingLink, setCopiedTrackingLink] = useState(false);
  const [viewingPhotoModal, setViewingPhotoModal] = useState<ProjectPhoto | null>(null);

  // Blueprints Tab States
  const [blueprintFileBase64, setBlueprintFileBase64] = useState<string>("");
  const [blueprintFileName, setBlueprintFileName] = useState<string>("");
  const [blueprintFileType, setBlueprintFileType] = useState<string>("");
  const [blueprintFileSize, setBlueprintFileSize] = useState<string>("");
  const [blueprintCategory, setBlueprintCategory] = useState<string>("مخطط شبكات وتمديدات");
  const [blueprintNotes, setBlueprintNotes] = useState<string>("");
  const [uploadingBlueprint, setUploadingBlueprint] = useState(false);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [savingProject, setSavingProject] = useState(false);

  // New Milestone Modal State
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [newMilestoneForm, setNewMilestoneForm] = useState({
    title: "",
    description: "",
    targetDate: "",
    assignedTo: ""
  });

  // New Site Log Modal State
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [newLogForm, setNewLogForm] = useState({
    date: new Date().toISOString().split("T")[0],
    author: "",
    activity: ""
  });

  // Form State
  const [projectForm, setProjectForm] = useState({
    projectNo: `PRJ-${(projects.length + 1).toString().padStart(3, "0")}`,
    title: "",
    clientName: "",
    clientPhone: "",
    location: "الموقع الميداني",
    status: "in_progress" as Project["status"],
    startDate: new Date().toISOString().split("T")[0],
    targetEndDate: "",
    budget: "",
    completionRate: "20",
    contractId: "",
    quotationId: "",
    notes: "",
  });

  // Helper to get or initialize project milestones
  const getProjectMilestones = (p: Project): ProjectMilestone[] => {
    if (p.milestones && p.milestones.length > 0) return p.milestones;
    return DEFAULT_PROJECT_MILESTONES.map((dm, idx) => ({
      id: `m-${idx + 1}`,
      title: dm.title,
      description: dm.description,
      status: idx === 0 ? "completed" : idx === 1 ? "in_progress" : "pending",
    }));
  };

  // Milestone Actions
  const handleUpdateMilestoneStatus = async (
    projectId: string, 
    milestoneId: string, 
    newStatus: "pending" | "in_progress" | "completed"
  ) => {
    const project = projects.find(p => p.id === projectId) || selectedProject;
    if (!project) return;
    const currentMilestones = getProjectMilestones(project);
    const updatedMilestones = currentMilestones.map(m => 
      m.id === milestoneId ? { ...m, status: newStatus } : m
    );
    
    // Auto-calculate completion %
    const completedCount = updatedMilestones.filter(m => m.status === "completed").length;
    const newCompletionRate = Math.round((completedCount / updatedMilestones.length) * 100);

    const updatedProject: Project = {
      ...project,
      milestones: updatedMilestones,
      completionRate: newCompletionRate,
      status: newCompletionRate >= 100 ? "completed" : project.status === "completed" ? "in_progress" : project.status,
      updatedAt: new Date().toISOString(),
    };

    await onSaveProject(updatedProject);
    if (selectedProject?.id === projectId) {
      setSelectedProject(updatedProject);
    }
  };

  const handleAdvanceNextMilestone = async (p: Project) => {
    const milestones = getProjectMilestones(p);
    const inProgressIdx = milestones.findIndex(m => m.status === "in_progress");
    const nextMilestones = milestones.map(m => ({ ...m }));

    if (inProgressIdx !== -1) {
      nextMilestones[inProgressIdx].status = "completed";
      if (inProgressIdx + 1 < nextMilestones.length) {
        nextMilestones[inProgressIdx + 1].status = "in_progress";
      }
    } else {
      const firstPending = nextMilestones.findIndex(m => m.status === "pending");
      if (firstPending !== -1) {
        nextMilestones[firstPending].status = "in_progress";
      }
    }

    const completedCount = nextMilestones.filter(m => m.status === "completed").length;
    const newRate = Math.round((completedCount / nextMilestones.length) * 100);

    const updated: Project = {
      ...p,
      milestones: nextMilestones,
      completionRate: newRate,
      status: newRate >= 100 ? "completed" : "in_progress",
      updatedAt: new Date().toISOString()
    };

    await onSaveProject(updated);
    if (selectedProject?.id === p.id) {
      setSelectedProject(updated);
    }
  };

  const handleCompleteAllMilestones = async (p: Project) => {
    const milestones = getProjectMilestones(p);
    const updatedMilestones = milestones.map(m => ({
      ...m,
      status: "completed" as const,
      completedDate: m.completedDate || new Date().toISOString().split("T")[0]
    }));
    const updated: Project = {
      ...p,
      status: "completed",
      completionRate: 100,
      milestones: updatedMilestones,
      updatedAt: new Date().toISOString()
    };
    await onSaveProject(updated);
    if (selectedProject?.id === p.id) {
      setSelectedProject(updated);
    }
  };

  const handleUpdateProjectStatus = async (project: Project, newStatus: Project["status"]) => {
    const updated: Project = {
      ...project,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    await onSaveProject(updated);
    if (selectedProject?.id === project.id) {
      setSelectedProject(updated);
    }
  };

  const handleQuickToggleMilestone = async (p: Project, milestoneId: string) => {
    const milestones = getProjectMilestones(p);
    const target = milestones.find(m => m.id === milestoneId);
    if (!target) return;
    const newStatus = target.status === "completed" ? "pending" : "completed";
    await handleUpdateMilestoneStatus(p.id, milestoneId, newStatus);
  };

  const handleSetMilestoneStatus = async (
    p: Project, 
    milestoneId: string, 
    status: "pending" | "in_progress" | "completed"
  ) => {
    await handleUpdateMilestoneStatus(p.id, milestoneId, status);
  };

  const handleAddMilestone = async () => {
    if (!selectedProject || !newMilestoneForm.title.trim()) return;
    const currentMilestones = getProjectMilestones(selectedProject);
    const newM: ProjectMilestone = {
      id: `m-${Date.now()}`,
      title: newMilestoneForm.title.trim(),
      description: newMilestoneForm.description.trim() || undefined,
      status: "pending",
      targetDate: newMilestoneForm.targetDate || undefined,
      assignedTo: newMilestoneForm.assignedTo || undefined,
    };
    const updatedMilestones = [...currentMilestones, newM];
    const completedCount = updatedMilestones.filter(m => m.status === "completed").length;
    const newRate = Math.round((completedCount / updatedMilestones.length) * 100);

    const updated: Project = {
      ...selectedProject,
      milestones: updatedMilestones,
      completionRate: newRate,
      updatedAt: new Date().toISOString()
    };

    await onSaveProject(updated);
    setSelectedProject(updated);
    setShowAddMilestoneModal(false);
    setNewMilestoneForm({ title: "", description: "", targetDate: "", assignedTo: "" });
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!selectedProject) return;
    if (!confirm(language === "ar" ? "هل أنت متأكد من حذف هذه المرحلة من المشروع؟" : "Are you sure you want to delete this phase?")) return;
    const currentMilestones = getProjectMilestones(selectedProject);
    const updatedMilestones = currentMilestones.filter(m => m.id !== milestoneId);
    const completedCount = updatedMilestones.filter(m => m.status === "completed").length;
    const newRate = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0;

    const updated: Project = {
      ...selectedProject,
      milestones: updatedMilestones,
      completionRate: newRate,
      updatedAt: new Date().toISOString()
    };

    await onSaveProject(updated);
    setSelectedProject(updated);
  };

  const handleAddSiteLog = async () => {
    if (!selectedProject || !newLogForm.activity.trim()) return;
    const newLog: ProjectSiteLog = {
      id: `log-${Date.now()}`,
      date: newLogForm.date || new Date().toISOString().split("T")[0],
      author: newLogForm.author.trim() || (language === "ar" ? "مشرف الموقع" : "Site Supervisor"),
      activity: newLogForm.activity.trim(),
    };
    const updatedLogs = [newLog, ...(selectedProject.siteLogs || [])];
    const updated: Project = {
      ...selectedProject,
      siteLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    };
    await onSaveProject(updated);
    setSelectedProject(updated);
    setShowAddLogModal(false);
    setNewLogForm({ date: new Date().toISOString().split("T")[0], author: "", activity: "" });
  };

  // Calculate Project Stats
  const totalProjectsCount = projects.length;
  const inProgressProjects = projects.filter(p => p.status === "in_progress").length;
  const completedProjects = projects.filter(p => p.status === "completed").length;
  const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

  const handleOpenAdd = () => {
    setEditingProject(null);
    setProjectForm({
      projectNo: `PRJ-${(projects.length + 1).toString().padStart(3, "0")}`,
      title: "",
      clientName: "",
      clientPhone: "",
      location: "الموقع الميداني",
      status: "in_progress",
      startDate: new Date().toISOString().split("T")[0],
      targetEndDate: "",
      budget: "",
      completionRate: "20",
      contractId: "",
      quotationId: "",
      notes: "",
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setProjectForm({
      projectNo: p.projectNo,
      title: p.title,
      clientName: p.clientName,
      clientPhone: p.clientPhone || "",
      location: p.location || "الموقع الميداني",
      status: p.status,
      startDate: p.startDate,
      targetEndDate: p.targetEndDate || "",
      budget: String(p.budget || ""),
      completionRate: String(p.completionRate || 0),
      contractId: p.contractId || "",
      quotationId: p.quotationId || "",
      notes: p.notes || "",
    });
    setShowAddModal(true);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.title || !projectForm.clientName) return;

    setSavingProject(true);
    try {
      const now = new Date().toISOString();
      const updated: Project = {
        id: editingProject ? editingProject.id : `proj-${Date.now()}`,
        projectNo: projectForm.projectNo.trim(),
        title: projectForm.title.trim(),
        clientName: projectForm.clientName.trim(),
        clientPhone: projectForm.clientPhone.trim(),
        location: projectForm.location.trim(),
        status: projectForm.status,
        startDate: projectForm.startDate,
        targetEndDate: projectForm.targetEndDate || undefined,
        budget: Number(projectForm.budget) || 0,
        completionRate: Math.min(100, Math.max(0, Number(projectForm.completionRate) || 0)),
        contractId: projectForm.contractId || undefined,
        quotationId: projectForm.quotationId || undefined,
        notes: projectForm.notes.trim(),
        milestones: editingProject?.milestones || DEFAULT_PROJECT_MILESTONES.map((dm, idx) => ({
          id: `m-${idx + 1}`,
          title: dm.title,
          description: dm.description,
          status: idx === 0 ? "completed" : idx === 1 ? "in_progress" : "pending",
        })),
        siteLogs: editingProject?.siteLogs || [],
        createdAt: editingProject ? editingProject.createdAt : now,
        updatedAt: now,
      };

      await onSaveProject(updated);
      setShowAddModal(false);
      setEditingProject(null);
      if (selectedProject?.id === updated.id) {
        setSelectedProject(updated);
      }
    } catch (err) {
      console.error(err);
      alert(language === "ar" ? "فشل حفظ بيانات المشروع" : "Failed to save project");
    } finally {
      setSavingProject(false);
    }
  };

  // Helper to calculate project financial metrics
  const getProjectFinances = (project: Project) => {
    const projExpenses = expenses.filter(e => e.projectId === project.id);
    const totalExpenses = projExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const projReceipts = receipts.filter(r => 
      r.clientName?.toLowerCase() === project.clientName?.toLowerCase() ||
      r.receivedFor?.toLowerCase().includes(project.title.toLowerCase())
    );
    const totalCollected = projReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const projContracts = contracts.filter(c => 
      c.id === project.contractId || 
      c.firstPartyName?.toLowerCase() === project.clientName?.toLowerCase()
    );
    const contractValue = projContracts.length > 0 
      ? projContracts.reduce((sum, c) => sum + (Number(c.totalCost) || 0), 0)
      : project.budget;

    // Labor cost calculation from Attendance
    const projAttendance = attendance.filter(a => a.projectId === project.id);
    const totalHours = projAttendance.reduce((sum, a) => sum + (a.hoursWorked || 0) + (a.overtimeHours || 0), 0);
    const estimatedLaborCost = totalHours * 35; // AED 35/hr average technician rate

    const netProfit = totalCollected - (totalExpenses + estimatedLaborCost);
    const marginPercent = totalCollected > 0 ? (netProfit / totalCollected) * 100 : 0;

    return {
      contractValue,
      totalCollected,
      totalExpenses,
      estimatedLaborCost,
      netProfit,
      marginPercent,
      hoursWorked: totalHours,
      receiptsCount: projReceipts.length,
      expensesCount: projExpenses.length,
    };
  };

  // Live Client Tracking Link & Photo Actions
  const handleCopyClientTrackingLink = (p: Project) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/track/${p.id}`;
    const message = `مرحباً بك عزيزي العميل (${p.clientName})،\nيمكنك متابعة مسار تنفيذ مشروعك (${p.title}) ونسبة الإنجاز وصور الموقع الميدانية الحية مباشرة عبر الرابط التالي:\n${url}\n\nتحياتنا،\nمؤسسة رواد سمارت للأجهزة الذكية`;
    navigator.clipboard.writeText(message).then(() => {
      setCopiedTrackingLink(true);
      setTimeout(() => setCopiedTrackingLink(false), 3000);
      alert(language === "ar" ? "تم نسخ رابط ورسالة متابعة المشروع بنجاح! يمكنك إرسالها للعميل عبر الواتساب." : "Tracking link copied to clipboard!");
    }).catch(() => {
      prompt("انسخ رابط التتبع المباشر للعميل:", url);
    });
  };

  const handleManagementPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setManagementPhotoBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddManagementPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !managementPhotoBase64) return;

    setUploadingManagementPhoto(true);
    try {
      const pMilestones = getProjectMilestones(selectedProject);
      const chosenMs = pMilestones.find(m => m.id === managementMilestoneId) || pMilestones[0];

      // Upload to Cloudinary CDN
      let finalPhotoUrl = managementPhotoBase64;
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: managementPhotoBase64, folder: "ruaad_smart/site_photos" }),
        });
        if (uploadRes.ok) {
          const upJson = await uploadRes.json();
          if (upJson.url) finalPhotoUrl = upJson.url;
        }
      } catch (upErr) {
        console.warn("Cloudinary upload fallback:", upErr);
      }

      const newPhoto: ProjectPhoto = {
        id: `photo-${Date.now()}`,
        url: finalPhotoUrl,
        caption: managementPhotoCaption.trim() || `توثيق مرحلة: ${chosenMs?.title || "الموقع الميداني"}`,
        milestoneId: chosenMs?.id,
        milestoneTitle: chosenMs?.title,
        uploadedBy: "الإدارة العليا / الإشراف الهندسي",
        uploadedAt: new Date().toISOString(),
        phase: chosenMs?.title,
      };

      const newLog: ProjectSiteLog = {
        id: `log-${Date.now()}`,
        date: new Date().toLocaleDateString("en-GB") + " " + new Date().toLocaleTimeString("ar-AE", { hour: "2-digit", minute: "2-digit" }),
        author: "الإدارة العليا",
        activity: `إضافة صورة توثيقية للموقع ضمن مرحلة (${chosenMs?.title || "العامة"})${managementPhotoCaption ? " - " + managementPhotoCaption : ""}`,
      };

      const updatedProject: Project = {
        ...selectedProject,
        sitePhotos: [newPhoto, ...(selectedProject.sitePhotos || [])],
        siteLogs: [newLog, ...(selectedProject.siteLogs || [])],
        updatedAt: new Date().toISOString(),
      };

      await onSaveProject(updatedProject);
      setSelectedProject(updatedProject);
      setManagementPhotoBase64("");
      setManagementPhotoCaption("");
      alert(language === "ar" ? "تمت إضافة الصورة بنجاح وتحديث معرض المشروع للعميل والإدارة!" : "Photo added successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "فشل رفع الصورة");
    } finally {
      setUploadingManagementPhoto(false);
    }
  };

  const handleDeleteSitePhoto = async (photoId: string) => {
    if (!selectedProject) return;
    if (!confirm(language === "ar" ? "هل أنت متأكد من حذف هذه الصورة من معرض المشروع؟" : "Delete this site photo?")) return;

    try {
      const updatedProject: Project = {
        ...selectedProject,
        sitePhotos: (selectedProject.sitePhotos || []).filter(p => p.id !== photoId),
        updatedAt: new Date().toISOString(),
      };
      await onSaveProject(updatedProject);
      setSelectedProject(updatedProject);
    } catch (err) {
      console.error(err);
      alert("فشل حذف الصورة");
    }
  };

  // Blueprint Handlers
  const handleBlueprintFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInKb = Math.round(file.size / 1024);
    const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    setBlueprintFileName(file.name.replace(/\.[^/.]+$/, ""));
    setBlueprintFileType(file.type || file.name.split('.').pop() || "document");
    setBlueprintFileSize(sizeStr);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBlueprintFileBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !blueprintFileBase64) return;

    setUploadingBlueprint(true);
    try {
      let finalFileUrl = blueprintFileBase64;
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            image: blueprintFileBase64, 
            folder: "ruaad_smart/blueprints",
            fileName: blueprintFileName || "blueprint"
          }),
        });
        if (uploadRes.ok) {
          const upJson = await uploadRes.json();
          if (upJson.url) finalFileUrl = upJson.url;
        }
      } catch (upErr) {
        console.warn("Cloudinary blueprint upload fallback:", upErr);
      }

      const newBlueprint: ProjectBlueprint = {
        id: `bp-${Date.now()}`,
        name: blueprintFileName.trim() || `مخطط هندسي - ${new Date().toLocaleDateString("en-GB")}`,
        url: finalFileUrl,
        fileType: blueprintFileType || "application/pdf",
        fileSize: blueprintFileSize || "1.2 MB",
        category: blueprintCategory,
        uploadedBy: "المكتب الهندسي / رواد سمارت",
        uploadedAt: new Date().toISOString().split("T")[0],
        notes: blueprintNotes.trim(),
      };

      const newLog: ProjectSiteLog = {
        id: `log-${Date.now()}`,
        date: new Date().toLocaleDateString("en-GB") + " " + new Date().toLocaleTimeString("ar-AE", { hour: "2-digit", minute: "2-digit" }),
        author: "المكتب الهندسي",
        activity: `إرفاق مخطط هندسي جديد (${newBlueprint.name}) ضمن تصنيف: ${newBlueprint.category}`,
      };

      const updatedProject: Project = {
        ...selectedProject,
        blueprints: [newBlueprint, ...(selectedProject.blueprints || [])],
        siteLogs: [newLog, ...(selectedProject.siteLogs || [])],
        updatedAt: new Date().toISOString(),
      };

      await onSaveProject(updatedProject);
      setSelectedProject(updatedProject);

      setBlueprintFileBase64("");
      setBlueprintFileName("");
      setBlueprintFileType("");
      setBlueprintFileSize("");
      setBlueprintNotes("");
      alert(language === "ar" ? "تم رفع المخطط الهندسي بنجاح وإضافته إلى ملف المشروع المعتمد!" : "Blueprint uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "فشل رفع المخطط الهندسي");
    } finally {
      setUploadingBlueprint(false);
    }
  };

  const handleDeleteBlueprint = async (blueprintId: string) => {
    if (!selectedProject) return;
    if (!confirm(language === "ar" ? "هل أنت متأكد من حذف هذا المخطط الهندسي من ملف المشروع؟" : "Delete this blueprint?")) return;

    try {
      const updatedProject: Project = {
        ...selectedProject,
        blueprints: (selectedProject.blueprints || []).filter(b => b.id !== blueprintId),
        updatedAt: new Date().toISOString(),
      };

      await onSaveProject(updatedProject);
      setSelectedProject(updatedProject);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "فشل حذف المخطط");
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Project Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Projects */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {language === "ar" ? "المشاريع الجارية والميدانية" : "Active Site Projects"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 font-mono font-bold text-2xl text-slate-900">
            {inProgressProjects}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {totalProjectsCount} {language === "ar" ? "إجمالي المشاريع المسجلة" : "Total registered projects"}
          </p>
        </div>

        {/* Card 2: Completed Projects */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {language === "ar" ? "المشاريع المنجزة والمسلمة" : "Completed Projects"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 font-mono font-bold text-2xl text-emerald-700">
            {completedProjects}
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">
            {language === "ar" ? "تم تسليمها بشهادات إنجاز" : "Handed over with certificates"}
          </p>
        </div>

        {/* Card 3: Total Portfolio Budget */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-purple-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {language === "ar" ? "إجمالي ميزانية المشاريع" : "Total Budget Pipeline"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 font-mono font-bold text-2xl text-purple-900">
            {totalBudget.toLocaleString("en-AE", { maximumFractionDigits: 2 })}
            <span className="text-xs font-sans text-slate-500 font-normal mr-1.5 ml-1.5">AED</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {language === "ar" ? "عقود أنظمة ذكية وكاميرات" : "Smart systems & CCTV contracts"}
          </p>
        </div>

        {/* Card 4: Average Progress Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {language === "ar" ? "معدل الإنجاز العام للمشاريع" : "Avg Progress Rate"}
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 font-mono font-bold text-2xl text-blue-700">
            {projects.length > 0 
              ? Math.round(projects.reduce((acc, p) => acc + (p.completionRate || 0), 0) / projects.length)
              : 0}%
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {language === "ar" ? "تحكم دقيق بمراحل التنفيذ" : "Interactive phase tracking"}
          </p>
        </div>
      </div>

      {/* Action Bar & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-purple-600 cursor-pointer"
          >
            <option value="all">{language === "ar" ? "جميع حالات المشاريع" : "All Statuses"}</option>
            <option value="in_progress">{language === "ar" ? "قيد التنفيذ" : "In Progress"}</option>
            <option value="completed">{language === "ar" ? "مكتمل ومسلّم" : "Completed"}</option>
            <option value="on_hold">{language === "ar" ? "معلق مؤقتاً" : "On Hold"}</option>
            <option value="planned">{language === "ar" ? "مخطط للبدء" : "Planned"}</option>
          </select>

          <div className="relative flex-1 sm:w-72">
            <Search className={`w-4 h-4 absolute top-2.5 ${isRtl ? "right-3" : "left-3"} text-slate-400`} />
            <input
              type="text"
              placeholder={language === "ar" ? "ابحث باسم المشروع، العميل، الموقع..." : "Search project..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-2 ${isRtl ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"} bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600`}
            />
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{language === "ar" ? "إضافة مشروع جديد" : "New Project"}</span>
        </button>
      </div>

      {/* Projects Grid / Cards */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 text-sm">
            {language === "ar" ? "لا توجد مشاريع مسجلة حالياً" : "No projects found"}
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {language === "ar" 
              ? "اضغط على زر 'إضافة مشروع جديد' لتسجيل مواقع العمل ومتابعة التكاليف والمراحل الميدانية خطوة بخطوة." 
              : "Click 'New Project' to register client sites and track project milestones."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const finances = getProjectFinances(p);
            const pMilestones = getProjectMilestones(p);
            const completedMilestones = pMilestones.filter(m => m.status === "completed").length;
            const currentMilestone = pMilestones.find(m => m.status === "in_progress") || pMilestones.find(m => m.status === "pending") || pMilestones[pMilestones.length - 1];

            const statusConfig = {
              in_progress: { labelAr: "قيد التنفيذ", labelEn: "In Progress", color: "bg-amber-50 text-amber-700 border-amber-200" },
              completed: { labelAr: "مكتمل ومسلّم", labelEn: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              on_hold: { labelAr: "معلق", labelEn: "On Hold", color: "bg-rose-50 text-rose-700 border-rose-200" },
              planned: { labelAr: "مخطط", labelEn: "Planned", color: "bg-blue-50 text-blue-700 border-blue-200" },
            }[p.status] || { labelAr: p.status, labelEn: p.status, color: "bg-slate-50 text-slate-700 border-slate-200" };

            return (
              <div 
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-purple-900 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-100">
                      {p.projectNo}
                    </span>
                    {/* Quick Interactive Status Dropdown */}
                    <select
                      value={p.status}
                      onChange={(e) => handleUpdateProjectStatus(p, e.target.value as any)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border outline-none cursor-pointer transition ${statusConfig.color}`}
                      title={language === "ar" ? "تغيير حالة المشروع بنقرة واحدة" : "Quick change project status"}
                    >
                      <option value="in_progress">{language === "ar" ? "قيد التنفيذ ⏳" : "In Progress"}</option>
                      <option value="completed">{language === "ar" ? "مكتمل ومسلّم ✅" : "Completed"}</option>
                      <option value="on_hold">{language === "ar" ? "معلق مؤقتاً ⏸️" : "On Hold"}</option>
                      <option value="planned">{language === "ar" ? "مخطط للبدء 📋" : "Planned"}</option>
                    </select>
                  </div>

                  {/* Title & Client */}
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{p.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <span className="font-medium text-slate-700">{p.clientName}</span>
                    {p.location && (
                      <span className="flex items-center gap-0.5 text-slate-400">
                        <MapPin className="w-3 h-3" />
                        {p.location}
                      </span>
                    )}
                  </p>

                  {/* Visual & Interactive Milestones Stepper Box */}
                  <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-bold flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5 text-purple-600" />
                        <span>{language === "ar" ? "مراحل المشروع:" : "Project Phases:"}</span>
                        <span className="text-purple-700 font-mono font-bold">({completedMilestones}/{pMilestones.length})</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                          {p.completionRate}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedCardProjectId(expandedCardProjectId === p.id ? null : p.id)}
                          className="text-[11px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-0.5 cursor-pointer underline px-1"
                          title="عرض قائمة المراحل والتحكم السريع"
                        >
                          <span>{expandedCardProjectId === p.id ? (language === "ar" ? "إخفاء" : "Hide") : (language === "ar" ? "تحكم سريع" : "Quick Control")}</span>
                          {expandedCardProjectId === p.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* The 6 Interactive Clickable Milestone Segments */}
                    <div className="flex items-center gap-1.5 w-full">
                      {pMilestones.map((m, idx) => {
                        const isDone = m.status === "completed";
                        const isInProgress = m.status === "in_progress";
                        return (
                          <button
                            key={m.id || idx}
                            type="button"
                            onClick={() => handleQuickToggleMilestone(p, m.id)}
                            title={`${m.title}\nالحالة: ${isDone ? "مكتملة ✅" : isInProgress ? "قيد العمل ⏳" : "معلقة ⏸️"}\n(انقر لتغيير الحالة فوراً)`}
                            className={`h-7 flex-1 rounded-lg transition-all duration-150 flex items-center justify-center font-mono font-bold text-[11px] cursor-pointer shadow-2xs border ${
                              isDone 
                                ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600" 
                                : isInProgress 
                                ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300 ring-offset-1" 
                                : "bg-white hover:bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {isDone ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Current Milestone Label & Quick Advance Button */}
                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
                      <div className="text-slate-600 text-[11px] truncate flex items-center gap-1" title={currentMilestone?.title}>
                        <span className="text-slate-400 font-semibold">{language === "ar" ? "المرحلة:" : "Phase:"}</span>
                        <span className="font-bold text-slate-900 truncate">{currentMilestone?.title}</span>
                      </div>

                      {p.completionRate < 100 ? (
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAdvanceNextMilestone(p)}
                            className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
                            title="إتمام المرحلة الحالية والانتقال للمرحلة التالية بنقرة واحدة"
                          >
                            <FastForward className="w-3 h-3" />
                            <span>{language === "ar" ? "المرحلة التالية" : "Next Phase"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCompleteAllMilestones(p)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
                            title="إتمام كافة مراحل المشروع 100% بنقرة واحدة"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{language === "ar" ? "إتمام الكل 100%" : "All 100%"}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          🎉 مكتمل 100%
                        </span>
                      )}
                    </div>

                    {/* EXPANDED INLINE STAGES CHECKLIST (Direct One-Click Control inside the Card) */}
                    {expandedCardProjectId === p.id && (
                      <div className="pt-3 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span>{language === "ar" ? "تحكم سريع في كل مرحلة:" : "Quick Stage Toggles:"}</span>
                          <span className="text-[10px] text-slate-400">{language === "ar" ? "انقر لاختيار الحالة مباشرة" : "Click status"}</span>
                        </div>
                        
                        <div className="space-y-1.5">
                          {pMilestones.map((m, idx) => (
                            <div 
                              key={m.id || idx}
                              className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition ${
                                m.status === "completed" 
                                  ? "bg-emerald-50/60 border-emerald-200 text-emerald-950" 
                                  : m.status === "in_progress" 
                                  ? "bg-amber-50/60 border-amber-200 text-amber-950" 
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                                  m.status === "completed" ? "bg-emerald-600 text-white" :
                                  m.status === "in_progress" ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-700"
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="font-semibold text-[11px] truncate">{m.title}</span>
                              </div>

                              {/* 3 Quick One-Click Status Buttons */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSetMilestoneStatus(p, m.id, "completed")}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                    m.status === "completed"
                                      ? "bg-emerald-600 text-white shadow-2xs"
                                      : "bg-white text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200"
                                  }`}
                                  title="تعيين كمكتملة"
                                >
                                  ✓ {language === "ar" ? "مكتمل" : "Done"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetMilestoneStatus(p, m.id, "in_progress")}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                    m.status === "in_progress"
                                      ? "bg-amber-500 text-white shadow-2xs"
                                      : "bg-white text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-slate-200"
                                  }`}
                                  title="تعيين كقيد العمل"
                                >
                                  ⏳ {language === "ar" ? "جاري" : "In Progress"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetMilestoneStatus(p, m.id, "pending")}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                    m.status === "pending"
                                      ? "bg-slate-600 text-white shadow-2xs"
                                      : "bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200"
                                  }`}
                                  title="تعيين كمعلقة / لم تبدأ"
                                >
                                  ⏸️ {language === "ar" ? "معلقة" : "Pending"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financial Summary */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{language === "ar" ? "قيمة المشروع / العقد" : "Contract Value"}</span>
                      <span className="font-mono font-bold text-slate-800">
                        {(finances.contractValue || 0).toLocaleString()} AED
                      </span>
                    </div>
                    <div className="text-left" dir="ltr">
                      <span className="text-[10px] text-slate-400 block text-right" dir={isRtl ? "rtl" : "ltr"}>
                        {language === "ar" ? "المصروفات الفعلية" : "Expenses"}
                      </span>
                      <span className="font-mono font-bold text-rose-600">
                        {finances.totalExpenses.toLocaleString()} AED
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedProject(p);
                      setDossierTab("milestones");
                    }}
                    className="flex-1 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "تحكم في المراحل والتفاصيل" : "Milestones & Control"}</span>
                  </button>

                  {/* WhatsApp Quick Contact */}
                  {(() => {
                    const linkedQ = quotations.find(q => q.id === p.quotationId || q.quotationNo === p.projectNo || q.clientName === p.clientName);
                    const phone = p.clientPhone || linkedQ?.contactNo;
                    if (!phone) return null;
                    const cleanPhone = phone.replace(/[^0-9]/g, "");
                    return (
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                        title={language === "ar" ? `مراسلة العميل واتساب (${phone})` : "WhatsApp Client"}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    );
                  })()}

                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    title={language === "ar" ? "تعديل" : "Edit"}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteProject(p.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                    title={language === "ar" ? "حذف" : "Delete"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Details Dossier Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    {selectedProject.projectNo}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{selectedProject.location}</span>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-500 font-mono">{selectedProject.startDate}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-900">{selectedProject.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === "ar" ? "العميل:" : "Client:"} <span className="font-semibold text-slate-700">{selectedProject.clientName}</span> | {selectedProject.clientPhone || "-"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyClientTrackingLink(selectedProject)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs font-arabic"
                  title="مشاركة رابط تتبع المشروع المباشر مع العميل"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedTrackingLink ? "تم النسخ! ✅" : (language === "ar" ? "رابط العميل (واتساب)" : "Share with Client")}</span>
                </button>
                <Link
                  href={`/track/${selectedProject.id}`}
                  target="_blank"
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition flex items-center gap-1 cursor-pointer font-arabic"
                  title="معاينة شاشة تتبع العميل المباشرة"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{language === "ar" ? "معاينة التتبع" : "Live View"}</span>
                </Link>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs font-arabic"
                  title={language === "ar" ? "طباعة تقرير تقدم المشروع" : "Print Dossier"}
                >
                  <Printer className="w-3.5 h-3.5 text-purple-700" />
                  <span className="hidden sm:inline">{language === "ar" ? "طباعة التقرير" : "Print Report"}</span>
                </button>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Navigation Sub-Tabs */}
            <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-2 bg-white overflow-x-auto scrollbar-none">
              <button
                onClick={() => setDossierTab("milestones")}
                className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
                  dossierTab === "milestones"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Flag className="w-4 h-4" />
                <span>{language === "ar" ? "مراحل المشروع والتحكم (وصل فين)" : "Phases & Milestones"}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono">
                  {getProjectMilestones(selectedProject).length}
                </span>
              </button>

              <button
                onClick={() => setDossierTab("financials")}
                className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
                  dossierTab === "financials"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>{language === "ar" ? "التكاليف والمصروفات والأرباح" : "Financial Audit"}</span>
              </button>

              <button
                onClick={() => setDossierTab("labor")}
                className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
                  dossierTab === "labor"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{language === "ar" ? "فريق العمل واليوميات" : "Labor & Team"}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
                  {attendance.filter(a => a.projectId === selectedProject.id).length}
                </span>
              </button>

              <button
                onClick={() => setDossierTab("logs")}
                className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
                  dossierTab === "logs"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{language === "ar" ? "سجل العمليات الميدانية (Site Logs)" : "Site Activity Logs"}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
                  {(selectedProject.siteLogs || []).length}
                </span>
              </button>

              <button
                onClick={() => setDossierTab("photos")}
                className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
                  dossierTab === "photos"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{language === "ar" ? "صور ومراحل الموقع الميدانية" : "Site Photos & Live Stream"}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 text-[10px] font-mono font-bold">
                  {(selectedProject.sitePhotos || []).length}
                </span>
              </button>

              <button
                onClick={() => setDossierTab("blueprints")}
                className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
                  dossierTab === "blueprints"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>{language === "ar" ? "المخططات والملفات الهندسية" : "Blueprints & Engineering Files"}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                  {(selectedProject.blueprints || []).length}
                </span>
              </button>
            </div>

            {/* Content Tabs / Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: Milestones & Stages (وصل فين واتحكم فيها) */}
              {dossierTab === "milestones" && (
                <div className="space-y-5">
                  {/* Top Milestones Progress Card */}
                  <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-700" />
                        <h4 className="font-bold text-sm text-purple-900">
                          {language === "ar" ? "لوحة التحكم في مسار مراحل المشروع" : "Project Phases Controller"}
                        </h4>
                      </div>
                      <p className="text-xs text-purple-700">
                        {language === "ar" 
                          ? "يمكنك تغيير حالة أي مرحلة بالضغط عليها مباشرة، وسيتم تحديث نسبة الإنجاز تلقائياً."
                          : "Click any phase button to update status. Overall progress updates automatically."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-center bg-white px-4 py-2 rounded-xl border border-purple-200">
                        <span className="text-[10px] text-slate-500 block">{language === "ar" ? "نسبة الإنجاز" : "Progress"}</span>
                        <span className="font-mono font-bold text-lg text-purple-900">{selectedProject.completionRate}%</span>
                      </div>
                      <button
                        onClick={() => setShowAddMilestoneModal(true)}
                        className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{language === "ar" ? "إضافة مرحلة مخصصة" : "Add Phase"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Milestones Cards List */}
                  <div className="space-y-3">
                    {getProjectMilestones(selectedProject).map((m, index) => {
                      const isDone = m.status === "completed";
                      const isInProg = m.status === "in_progress";
                      const isPending = m.status === "pending";

                      return (
                        <div 
                          key={m.id || index}
                          className={`p-4 rounded-2xl border transition-all ${
                            isDone 
                              ? "bg-emerald-50/50 border-emerald-200/90" 
                              : isInProg 
                              ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-300/30 shadow-xs" 
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-xs ${
                                isDone 
                                  ? "bg-emerald-600 text-white" 
                                  : isInProg 
                                  ? "bg-amber-500 text-white" 
                                  : "bg-slate-100 text-slate-500"
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <h5 className={`font-bold text-xs sm:text-sm ${
                                  isDone ? "text-emerald-950" : isInProg ? "text-amber-950 font-extrabold" : "text-slate-800"
                                }`}>
                                  {m.title}
                                </h5>
                                {m.description && (
                                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.description}</p>
                                )}
                                {(m.targetDate || m.assignedTo) && (
                                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                                    {m.targetDate && (
                                      <span className="flex items-center gap-1 font-mono">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        {m.targetDate}
                                      </span>
                                    )}
                                    {m.assignedTo && (
                                      <span className="flex items-center gap-1 font-medium text-slate-700">
                                        <UserCheck className="w-3 h-3 text-purple-600" />
                                        {m.assignedTo}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status Control Buttons Group */}
                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                              <button
                                onClick={() => handleUpdateMilestoneStatus(selectedProject.id, m.id, "pending")}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                  isPending
                                    ? "bg-slate-800 text-white shadow-2xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <Clock4 className="w-3 h-3" />
                                <span>{language === "ar" ? "معلقة" : "Pending"}</span>
                              </button>

                              <button
                                onClick={() => handleUpdateMilestoneStatus(selectedProject.id, m.id, "in_progress")}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                  isInProg
                                    ? "bg-amber-500 text-white shadow-2xs font-bold"
                                    : "bg-amber-100/70 text-amber-800 hover:bg-amber-200"
                                }`}
                              >
                                <PlayCircle className="w-3 h-3" />
                                <span>{language === "ar" ? "قيد التنفيذ" : "In Progress"}</span>
                              </button>

                              <button
                                onClick={() => handleUpdateMilestoneStatus(selectedProject.id, m.id, "completed")}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                  isDone
                                    ? "bg-emerald-600 text-white shadow-2xs font-bold"
                                    : "bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200"
                                }`}
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>{language === "ar" ? "مكتملة" : "Done"}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteMilestone(m.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title={language === "ar" ? "حذف المرحلة" : "Delete Phase"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 6: Blueprints & Engineering Files (المخططات والملفات الهندسية) */}
              {dossierTab === "blueprints" && (
                <div className="space-y-6">
                  {/* Top Info Banner */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-purple-50 border border-blue-150 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-blue-700" />
                        <h4 className="font-bold text-sm text-blue-950">
                          {language === "ar" ? "أرشيف المخططات والملفات الهندسية للمشروع" : "Project Blueprints & Engineering Files Archive"}
                        </h4>
                      </div>
                      <p className="text-xs text-blue-800/80 leading-relaxed">
                        {language === "ar"
                          ? "رفع وحفظ مخططات الكاميرات، التمديدات الشبكية، إنذار الحريق، والتصاميم المعمارية بصيغ PDF أو صور أو كراسات المواصفات، وتظهر للعميل في صفحة التتبع."
                          : "Upload blueprints, cabling, CCTV layout, and specs in PDF/images. Visible to client."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1.5 rounded-xl bg-blue-100/80 text-blue-800 text-xs font-mono font-bold">
                        {(selectedProject.blueprints || []).length} {language === "ar" ? "مخططات معتمدة" : "files"}
                      </span>
                    </div>
                  </div>

                  {/* Upload Blueprint Form */}
                  <form onSubmit={handleAddBlueprint} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <h5 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-purple-700" />
                      <span>{language === "ar" ? "رفع مخطط هندسي جديد للمشروع" : "Upload New Blueprint / File"}</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "تصنيف المخطط" : "Category"}
                        </label>
                        <select
                          value={blueprintCategory}
                          onChange={(e) => setBlueprintCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-600 cursor-pointer"
                        >
                          <option value="مخطط شبكات وتمديدات">مخطط شبكات وتمديدات (Network & Cabling)</option>
                          <option value="مخطط كاميرات المراقبة">مخطط كاميرات المراقبة (CCTV Layout)</option>
                          <option value="مخطط إنذار ومكافحة حريق">مخطط إنذار ومكافحة حريق (Fire Alarm)</option>
                          <option value="مخطط معماري وديكور">مخطط معماري وديكور (Architectural)</option>
                          <option value="مخطط أنظمة ذكية وتحكم">مخطط أنظمة ذكية وتحكم (Smart Home)</option>
                          <option value="كراسة الشروط والمواصفات">كراسة الشروط والمواصفات (Specifications)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "اسم / وصف المخطط" : "Blueprint Title"}
                        </label>
                        <input
                          type="text"
                          required
                          value={blueprintFileName}
                          onChange={(e) => setBlueprintFileName(e.target.value)}
                          placeholder={language === "ar" ? "مثال: المخطط التنفيذي للطابق الأرضي - كاميرات" : "e.g. Ground Floor CCTV Layout"}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "ملف المخطط (PDF / صورة / مستند)" : "File (PDF, CAD, Image)"}
                        </label>
                        <label className="w-full px-3 py-2 bg-white hover:bg-slate-100 border border-dashed border-purple-300 rounded-xl text-xs font-semibold text-purple-700 text-center cursor-pointer transition flex items-center justify-center gap-1.5 truncate">
                          <UploadCloud className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="truncate">
                            {blueprintFileBase64 
                              ? (blueprintFileSize ? `جاهز (${blueprintFileSize})` : "تم اختيار الملف") 
                              : (language === "ar" ? "اختر ملف PDF أو صورة" : "Choose File")}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,image/*,.dwg,.dxf,.cad,.doc,.docx"
                            onChange={handleBlueprintFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={blueprintNotes}
                          onChange={(e) => setBlueprintNotes(e.target.value)}
                          placeholder={language === "ar" ? "ملاحظات إضافية للمهندسين أو الفنيين (اختياري)..." : "Additional engineering notes (optional)..."}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!blueprintFileBase64 || uploadingBlueprint}
                        className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                      >
                        {uploadingBlueprint ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{language === "ar" ? "جاري الرفع إلى السحابة..." : "Uploading..."}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{language === "ar" ? "إضافة المخطط للمشروع" : "Add Blueprint"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Blueprints Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-purple-600" />
                        <span>{language === "ar" ? "المخططات الهندسية المعتمدة للمشروع" : "Approved Project Blueprints"}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                          {(selectedProject.blueprints || []).length}
                        </span>
                      </h5>
                    </div>

                    {(!selectedProject.blueprints || selectedProject.blueprints.length === 0) ? (
                      <div className="p-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                        <FileCode className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">
                          {language === "ar" ? "لا توجد مخططات هندسية مرفوعة لهذا المشروع حتى الآن" : "No blueprints uploaded yet"}
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          {language === "ar"
                            ? "يمكنك رفع ملفات الـ PDF والتصاميم الهندسية من النموذج أعلاه ليتمكن المهندسون والفنيون والعميل من الاطلاع عليها."
                            : "Upload PDF or image blueprints above to share with technicians and client."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedProject.blueprints.map((bp) => {
                          const isPdf = bp.fileType?.includes("pdf") || bp.name.toLowerCase().endsWith(".pdf") || bp.url.toLowerCase().endsWith(".pdf");
                          const isImage = bp.fileType?.includes("image") || bp.url.match(/\.(jpeg|jpg|png|webp|svg)/i);

                          return (
                            <div
                              key={bp.id}
                              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                            >
                              <div className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                      isPdf ? "bg-rose-50 text-rose-600 border border-rose-200" :
                                      isImage ? "bg-purple-50 text-purple-600 border border-purple-200" :
                                      "bg-blue-50 text-blue-600 border border-blue-200"
                                    }`}>
                                      {isPdf ? <FileText className="w-5 h-5" /> : isImage ? <ImageIcon className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
                                    </div>
                                    <div>
                                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                        {bp.category}
                                      </span>
                                      <h6 className="font-bold text-xs text-slate-900 mt-1 line-clamp-2 leading-snug" title={bp.name}>
                                        {bp.name}
                                      </h6>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBlueprint(bp.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title={language === "ar" ? "حذف المخطط" : "Delete"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {bp.notes && (
                                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-150 leading-relaxed">
                                    {bp.notes}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                  <span>{bp.uploadedBy || "المكتب الهندسي"}</span>
                                  <span className="font-mono">{bp.fileSize || bp.uploadedAt}</span>
                                </div>
                              </div>

                              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                                <a
                                  href={bp.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{language === "ar" ? "معاينة الملف" : "View"}</span>
                                </a>

                                <a
                                  href={bp.url}
                                  download={bp.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs transition shadow-2xs"
                                  title={language === "ar" ? "تحميل الملف" : "Download"}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Financials & Profitability */}
              {dossierTab === "financials" && (
                <div className="space-y-6">
                  {(() => {
                    const fin = getProjectFinances(selectedProject);
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-purple-50/60 p-4 rounded-2xl border border-purple-100 text-center">
                        <div>
                          <span className="text-[10px] text-slate-500 block">{language === "ar" ? "ميزانية العقد" : "Contract Value"}</span>
                          <span className="font-mono font-bold text-sm text-slate-900">{fin.contractValue.toLocaleString()} AED</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">{language === "ar" ? "المحصل من العميل" : "Collected Inflow"}</span>
                          <span className="font-mono font-bold text-sm text-emerald-700">{fin.totalCollected.toLocaleString()} AED</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">{language === "ar" ? "المصروفات والتكاليف" : "Total Outflow"}</span>
                          <span className="font-mono font-bold text-sm text-rose-700">{fin.totalExpenses.toLocaleString()} AED</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">{language === "ar" ? "صافي أرباح المشروع" : "Net Margin"}</span>
                          <span className={`font-mono font-bold text-sm ${fin.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {fin.netProfit.toLocaleString()} AED
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Linked Expenses Section */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>{language === "ar" ? "سندات الصرف ومشتريات هذا المشروع" : "Project Expenses"}</span>
                      <span className="text-slate-400 font-normal">
                        {expenses.filter(e => e.projectId === selectedProject.id).length} {language === "ar" ? "سندات صرف" : "vouchers"}
                      </span>
                    </h4>
                    {expenses.filter(e => e.projectId === selectedProject.id).length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-slate-200">
                        {language === "ar" ? "لا توجد مصروفات مسجلة على هذا المشروع مباشرة بعد." : "No expenses recorded on this project yet."}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {expenses.filter(e => e.projectId === selectedProject.id).map(exp => (
                          <div key={exp.id} className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-mono font-bold text-rose-700 mr-2">{exp.voucherNo}</span>
                              <span className="font-medium text-slate-800">{exp.recipient}</span>
                              <p className="text-[11px] text-slate-500 mt-0.5">{exp.description || "-"}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-rose-600 block">{exp.amount.toLocaleString()} AED</span>
                              <span className="text-[10px] text-slate-400 font-mono">{exp.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: Blueprints & Engineering Files (المخططات والملفات الهندسية) */}
              {dossierTab === "blueprints" && (
                <div className="space-y-6">
                  {/* Top Info Banner */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-purple-50 border border-blue-150 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-blue-700" />
                        <h4 className="font-bold text-sm text-blue-950">
                          {language === "ar" ? "أرشيف المخططات والملفات الهندسية للمشروع" : "Project Blueprints & Engineering Files Archive"}
                        </h4>
                      </div>
                      <p className="text-xs text-blue-800/80 leading-relaxed">
                        {language === "ar"
                          ? "رفع وحفظ مخططات الكاميرات، التمديدات الشبكية، إنذار الحريق، والتصاميم المعمارية بصيغ PDF أو صور أو كراسات المواصفات، وتظهر للعميل في صفحة التتبع."
                          : "Upload blueprints, cabling, CCTV layout, and specs in PDF/images. Visible to client."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1.5 rounded-xl bg-blue-100/80 text-blue-800 text-xs font-mono font-bold">
                        {(selectedProject.blueprints || []).length} {language === "ar" ? "مخططات معتمدة" : "files"}
                      </span>
                    </div>
                  </div>

                  {/* Upload Blueprint Form */}
                  <form onSubmit={handleAddBlueprint} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <h5 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-purple-700" />
                      <span>{language === "ar" ? "رفع مخطط هندسي جديد للمشروع" : "Upload New Blueprint / File"}</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "تصنيف المخطط" : "Category"}
                        </label>
                        <select
                          value={blueprintCategory}
                          onChange={(e) => setBlueprintCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-600 cursor-pointer"
                        >
                          <option value="مخطط شبكات وتمديدات">مخطط شبكات وتمديدات (Network & Cabling)</option>
                          <option value="مخطط كاميرات المراقبة">مخطط كاميرات المراقبة (CCTV Layout)</option>
                          <option value="مخطط إنذار ومكافحة حريق">مخطط إنذار ومكافحة حريق (Fire Alarm)</option>
                          <option value="مخطط معماري وديكور">مخطط معماري وديكور (Architectural)</option>
                          <option value="مخطط أنظمة ذكية وتحكم">مخطط أنظمة ذكية وتحكم (Smart Home)</option>
                          <option value="كراسة الشروط والمواصفات">كراسة الشروط والمواصفات (Specifications)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "اسم / وصف المخطط" : "Blueprint Title"}
                        </label>
                        <input
                          type="text"
                          required
                          value={blueprintFileName}
                          onChange={(e) => setBlueprintFileName(e.target.value)}
                          placeholder={language === "ar" ? "مثال: المخطط التنفيذي للطابق الأرضي - كاميرات" : "e.g. Ground Floor CCTV Layout"}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "ملف المخطط (PDF / صورة / مستند)" : "File (PDF, CAD, Image)"}
                        </label>
                        <label className="w-full px-3 py-2 bg-white hover:bg-slate-100 border border-dashed border-purple-300 rounded-xl text-xs font-semibold text-purple-700 text-center cursor-pointer transition flex items-center justify-center gap-1.5 truncate">
                          <UploadCloud className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="truncate">
                            {blueprintFileBase64 
                              ? (blueprintFileSize ? `جاهز (${blueprintFileSize})` : "تم اختيار الملف") 
                              : (language === "ar" ? "اختر ملف PDF أو صورة" : "Choose File")}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,image/*,.dwg,.dxf,.cad,.doc,.docx"
                            onChange={handleBlueprintFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={blueprintNotes}
                          onChange={(e) => setBlueprintNotes(e.target.value)}
                          placeholder={language === "ar" ? "ملاحظات إضافية للمهندسين أو الفنيين (اختياري)..." : "Additional engineering notes (optional)..."}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!blueprintFileBase64 || uploadingBlueprint}
                        className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                      >
                        {uploadingBlueprint ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{language === "ar" ? "جاري الرفع إلى السحابة..." : "Uploading..."}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{language === "ar" ? "إضافة المخطط للمشروع" : "Add Blueprint"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Blueprints Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-purple-600" />
                        <span>{language === "ar" ? "المخططات الهندسية المعتمدة للمشروع" : "Approved Project Blueprints"}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                          {(selectedProject.blueprints || []).length}
                        </span>
                      </h5>
                    </div>

                    {(!selectedProject.blueprints || selectedProject.blueprints.length === 0) ? (
                      <div className="p-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                        <FileCode className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">
                          {language === "ar" ? "لا توجد مخططات هندسية مرفوعة لهذا المشروع حتى الآن" : "No blueprints uploaded yet"}
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          {language === "ar"
                            ? "يمكنك رفع ملفات الـ PDF والتصاميم الهندسية من النموذج أعلاه ليتمكن المهندسون والفنيون والعميل من الاطلاع عليها."
                            : "Upload PDF or image blueprints above to share with technicians and client."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedProject.blueprints.map((bp) => {
                          const isPdf = bp.fileType?.includes("pdf") || bp.name.toLowerCase().endsWith(".pdf") || bp.url.toLowerCase().endsWith(".pdf");
                          const isImage = bp.fileType?.includes("image") || bp.url.match(/\.(jpeg|jpg|png|webp|svg)/i);

                          return (
                            <div
                              key={bp.id}
                              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                            >
                              <div className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                      isPdf ? "bg-rose-50 text-rose-600 border border-rose-200" :
                                      isImage ? "bg-purple-50 text-purple-600 border border-purple-200" :
                                      "bg-blue-50 text-blue-600 border border-blue-200"
                                    }`}>
                                      {isPdf ? <FileText className="w-5 h-5" /> : isImage ? <ImageIcon className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
                                    </div>
                                    <div>
                                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                        {bp.category}
                                      </span>
                                      <h6 className="font-bold text-xs text-slate-900 mt-1 line-clamp-2 leading-snug" title={bp.name}>
                                        {bp.name}
                                      </h6>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBlueprint(bp.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title={language === "ar" ? "حذف المخطط" : "Delete"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {bp.notes && (
                                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-150 leading-relaxed">
                                    {bp.notes}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                  <span>{bp.uploadedBy || "المكتب الهندسي"}</span>
                                  <span className="font-mono">{bp.fileSize || bp.uploadedAt}</span>
                                </div>
                              </div>

                              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                                <a
                                  href={bp.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{language === "ar" ? "معاينة الملف" : "View"}</span>
                                </a>

                                <a
                                  href={bp.url}
                                  download={bp.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs transition shadow-2xs"
                                  title={language === "ar" ? "تحميل الملف" : "Download"}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Labor & Assigned Team */}
              {dossierTab === "labor" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                      {language === "ar" ? "سجل حضور ويوميات الفنيين في موقع المشروع" : "Site Labor & Work Logs"}
                    </h4>
                    <span className="text-xs font-semibold text-purple-700">
                      {attendance.filter(a => a.projectId === selectedProject.id).length} {language === "ar" ? "يومية عمل مسجلة" : "entries"}
                    </span>
                  </div>

                  {attendance.filter(a => a.projectId === selectedProject.id).length === 0 ? (
                    <div className="p-8 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 border border-slate-200">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      {language === "ar" ? "لم يتم تسجيل يوميات فنيين مرتبطة بهذا المشروع بعد." : "No labor timesheets assigned to this project yet."}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attendance.filter(a => a.projectId === selectedProject.id).map(att => (
                        <div key={att.id} className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-900 mr-2">{att.employeeName}</span>
                            <span className="text-slate-500 font-mono text-[11px]">{att.date}</span>
                            <p className="text-[11px] text-slate-600 mt-0.5">{att.taskDescription || "-"}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-800 block">{att.hoursWorked} {language === "ar" ? "ساعات" : "hrs"}</span>
                            {att.overtimeHours > 0 && (
                              <span className="text-[10px] text-amber-600 font-mono">+{att.overtimeHours} إضافي</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Site Activity Logs */}
              {dossierTab === "logs" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                      {language === "ar" ? "سجل الأحداث والملاحظات الميدانية للمشروع" : "Site Activity & Daily Logs"}
                    </h4>
                    <button
                      onClick={() => setShowAddLogModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === "ar" ? "تسجيل نشاط ميداني" : "Add Site Log"}</span>
                    </button>
                  </div>

                  {(!selectedProject.siteLogs || selectedProject.siteLogs.length === 0) ? (
                    <div className="p-8 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 border border-slate-200">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      {language === "ar" 
                        ? "لا توجد سجلات ميدانية مدونة بعد. اضغط على 'تسجيل نشاط ميداني' لتوثيق أعمال اليوم بالموقع." 
                        : "No site logs added yet."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedProject.siteLogs.map(log => (
                        <div key={log.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-purple-900">{log.author}</span>
                            <span className="font-mono text-slate-400 text-[11px]">{log.date}</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{log.activity}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: Site Photos & Stages Live Stream (توثيق الموقع والصور الميدانية) */}
              {dossierTab === "photos" && (
                <div className="space-y-6">
                  {/* Tracking link & Share Bar */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50 border border-purple-100 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-purple-700" />
                        <h4 className="font-bold text-sm text-purple-950">
                          {language === "ar" ? "ألبوم التوثيق الميداني المباشر للعميل والإدارة" : "Field Photo Stream for Client & Management"}
                        </h4>
                      </div>
                      <p className="text-xs text-purple-800/80 leading-relaxed">
                        {language === "ar"
                          ? "جميع الصور التي يرفعها الفني من الموقع تظهر هنا فوراً، ويستطيع العميل متابعتها عبر رابط التتبع المباشر بدون تسجيل دخول."
                          : "Photos uploaded by field technicians appear here instantly and can be tracked by the client via direct link."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleCopyClientTrackingLink(selectedProject)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title={language === "ar" ? "نسخ رابط واتساب للعميل" : "Copy WhatsApp link"}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{copiedTrackingLink ? (language === "ar" ? "تم النسخ بنجاح!" : "Copied!") : (language === "ar" ? "مشاركة الرابط للعميل" : "Share Client Link")}</span>
                      </button>

                      <a
                        href={`/track/${selectedProject.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{language === "ar" ? "معاينة صفحة العميل" : "Preview Client View"}</span>
                      </a>
                    </div>
                  </div>

                  {/* Upload photo by management */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <h5 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-purple-700" />
                      <span>{language === "ar" ? "إضافة صورة ميدانية من الإدارة مباشرة" : "Upload Site Photo (Management)"}</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "المرحلة المرتبطة" : "Linked Milestone"}
                        </label>
                        <select
                          value={managementMilestoneId}
                          onChange={(e) => setManagementMilestoneId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-600"
                        >
                          <option value="">{language === "ar" ? "عام / بدون مرحلة محددة" : "General / No Milestone"}</option>
                          {(selectedProject.milestones || []).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title} ({m.status === "completed" ? "✅ مكتملة" : m.status === "in_progress" ? "⏳ جارية" : "⏱️ معلقة"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "وصف / تعليق الصورة" : "Photo Caption / Note"}
                        </label>
                        <input
                          type="text"
                          value={managementPhotoCaption}
                          onChange={(e) => setManagementPhotoCaption(e.target.value)}
                          placeholder={language === "ar" ? "مثال: انتهاء تمديد كابلات الحريق والتحكم..." : "e.g. Completed wiring..."}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                        />
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-2">
                        <label className="flex-1 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 text-center cursor-pointer transition flex items-center justify-center gap-1.5 truncate">
                          <ImageIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="truncate">{managementPhotoBase64 ? (language === "ar" ? "تم اختيار صورة" : "Selected") : (language === "ar" ? "اختر صورة" : "Choose")}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleManagementPhotoChange}
                            className="hidden"
                          />
                        </label>

                        <button
                          onClick={handleAddManagementPhoto}
                          disabled={!managementPhotoBase64 || uploadingManagementPhoto}
                          className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                        >
                          {uploadingManagementPhoto ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          <span>{language === "ar" ? "إضافة" : "Add"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Photos Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-purple-600" />
                        <span>{language === "ar" ? "صور المشروع التوثيقية المعتمدة" : "Project Site Gallery"}</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                          {(selectedProject.sitePhotos || []).length}
                        </span>
                      </h5>
                    </div>

                    {(!selectedProject.sitePhotos || selectedProject.sitePhotos.length === 0) ? (
                      <div className="p-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                        <Camera className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">
                          {language === "ar" ? "لا توجد صور ميدانية مرفوعة لهذا المشروع حتى الآن" : "No site photos uploaded yet"}
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          {language === "ar"
                            ? "يقوم الفني بالتقاط الصور من الموقع عبر بوابته الميدانية، وتظهر هنا وتلقائياً للعميل."
                            : "Technicians can capture and upload photos directly from their field portal."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedProject.sitePhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
                          >
                            <div className="relative aspect-video bg-slate-100 overflow-hidden">
                              <img
                                src={photo.url}
                                alt={photo.caption || "Site photo"}
                                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingPhotoModal(photo)}
                                  className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl transition cursor-pointer shadow-md"
                                  title={language === "ar" ? "تكبير الصورة" : "Zoom photo"}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSitePhoto(photo.id)}
                                  className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer shadow-md"
                                  title={language === "ar" ? "حذف الصورة" : "Delete photo"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {photo.phase && (
                                <span className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                                  {photo.phase}
                                </span>
                              )}
                            </div>

                            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                              {photo.caption && (
                                <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                                  {photo.caption}
                                </p>
                              )}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                <span className="font-medium text-purple-700 truncate max-w-[120px]">
                                  {photo.uploadedBy || "فني الموقع"}
                                </span>
                                <span className="font-mono">{photo.uploadedAt}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* TAB 6: Blueprints & Engineering Files (المخططات والملفات الهندسية) */}
              {dossierTab === "blueprints" && (
                <div className="space-y-6">
                  {/* Top Info Banner */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-purple-50 border border-blue-150 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-blue-700" />
                        <h4 className="font-bold text-sm text-blue-950">
                          {language === "ar" ? "أرشيف المخططات والملفات الهندسية للمشروع" : "Project Blueprints & Engineering Files Archive"}
                        </h4>
                      </div>
                      <p className="text-xs text-blue-800/80 leading-relaxed">
                        {language === "ar"
                          ? "رفع وحفظ مخططات الكاميرات، التمديدات الشبكية، إنذار الحريق، والتصاميم المعمارية بصيغ PDF أو صور أو كراسات المواصفات، وتظهر للعميل في صفحة التتبع."
                          : "Upload blueprints, cabling, CCTV layout, and specs in PDF/images. Visible to client."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1.5 rounded-xl bg-blue-100/80 text-blue-800 text-xs font-mono font-bold">
                        {(selectedProject.blueprints || []).length} {language === "ar" ? "مخططات معتمدة" : "files"}
                      </span>
                    </div>
                  </div>

                  {/* Upload Blueprint Form */}
                  <form onSubmit={handleAddBlueprint} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <h5 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-purple-700" />
                      <span>{language === "ar" ? "رفع مخطط هندسي جديد للمشروع" : "Upload New Blueprint / File"}</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "تصنيف المخطط" : "Category"}
                        </label>
                        <select
                          value={blueprintCategory}
                          onChange={(e) => setBlueprintCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-600 cursor-pointer"
                        >
                          <option value="مخطط شبكات وتمديدات">مخطط شبكات وتمديدات (Network & Cabling)</option>
                          <option value="مخطط كاميرات المراقبة">مخطط كاميرات المراقبة (CCTV Layout)</option>
                          <option value="مخطط إنذار ومكافحة حريق">مخطط إنذار ومكافحة حريق (Fire Alarm)</option>
                          <option value="مخطط معماري وديكور">مخطط معماري وديكور (Architectural)</option>
                          <option value="مخطط أنظمة ذكية وتحكم">مخطط أنظمة ذكية وتحكم (Smart Home)</option>
                          <option value="كراسة الشروط والمواصفات">كراسة الشروط والمواصفات (Specifications)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "اسم / وصف المخطط" : "Blueprint Title"}
                        </label>
                        <input
                          type="text"
                          required
                          value={blueprintFileName}
                          onChange={(e) => setBlueprintFileName(e.target.value)}
                          placeholder={language === "ar" ? "مثال: المخطط التنفيذي للطابق الأرضي - كاميرات" : "e.g. Ground Floor CCTV Layout"}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "ملف المخطط (PDF / صورة / مستند)" : "File (PDF, CAD, Image)"}
                        </label>
                        <label className="w-full px-3 py-2 bg-white hover:bg-slate-100 border border-dashed border-purple-300 rounded-xl text-xs font-semibold text-purple-700 text-center cursor-pointer transition flex items-center justify-center gap-1.5 truncate">
                          <UploadCloud className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="truncate">
                            {blueprintFileBase64 
                              ? (blueprintFileSize ? `جاهز (${blueprintFileSize})` : "تم اختيار الملف") 
                              : (language === "ar" ? "اختر ملف PDF أو صورة" : "Choose File")}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,image/*,.dwg,.dxf,.cad,.doc,.docx"
                            onChange={handleBlueprintFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={blueprintNotes}
                          onChange={(e) => setBlueprintNotes(e.target.value)}
                          placeholder={language === "ar" ? "ملاحظات إضافية للمهندسين أو الفنيين (اختياري)..." : "Additional engineering notes (optional)..."}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!blueprintFileBase64 || uploadingBlueprint}
                        className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                      >
                        {uploadingBlueprint ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{language === "ar" ? "جاري الرفع إلى السحابة..." : "Uploading..."}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{language === "ar" ? "إضافة المخطط للمشروع" : "Add Blueprint"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Blueprints Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-purple-600" />
                        <span>{language === "ar" ? "المخططات الهندسية المعتمدة للمشروع" : "Approved Project Blueprints"}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                          {(selectedProject.blueprints || []).length}
                        </span>
                      </h5>
                    </div>

                    {(!selectedProject.blueprints || selectedProject.blueprints.length === 0) ? (
                      <div className="p-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                        <FileCode className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">
                          {language === "ar" ? "لا توجد مخططات هندسية مرفوعة لهذا المشروع حتى الآن" : "No blueprints uploaded yet"}
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          {language === "ar"
                            ? "يمكنك رفع ملفات الـ PDF والتصاميم الهندسية من النموذج أعلاه ليتمكن المهندسون والفنيون والعميل من الاطلاع عليها."
                            : "Upload PDF or image blueprints above to share with technicians and client."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(selectedProject.blueprints || []).map((bp) => {
                          const isPdf = bp.fileType?.includes("pdf") || bp.name.toLowerCase().endsWith(".pdf") || bp.url.toLowerCase().endsWith(".pdf");
                          const isImage = bp.fileType?.includes("image") || bp.url.match(/\.(jpeg|jpg|png|webp|svg)/i);

                          return (
                            <div
                              key={bp.id}
                              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                            >
                              <div className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                      isPdf ? "bg-rose-50 text-rose-600 border border-rose-200" :
                                      isImage ? "bg-purple-50 text-purple-600 border border-purple-200" :
                                      "bg-blue-50 text-blue-600 border border-blue-200"
                                    }`}>
                                      {isPdf ? <FileText className="w-5 h-5" /> : isImage ? <ImageIcon className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
                                    </div>
                                    <div>
                                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                        {bp.category}
                                      </span>
                                      <h6 className="font-bold text-xs text-slate-900 mt-1 line-clamp-2 leading-snug" title={bp.name}>
                                        {bp.name}
                                      </h6>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBlueprint(bp.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title={language === "ar" ? "حذف المخطط" : "Delete"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {bp.notes && (
                                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-150 leading-relaxed">
                                    {bp.notes}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                  <span>{bp.uploadedBy || "المكتب الهندسي"}</span>
                                  <span className="font-mono">{bp.fileSize || bp.uploadedAt}</span>
                                </div>
                              </div>

                              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                                <a
                                  href={bp.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{language === "ar" ? "معاينة الملف" : "View"}</span>
                                </a>

                                <a
                                  href={bp.url}
                                  download={bp.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs transition shadow-2xs"
                                  title={language === "ar" ? "تحميل الملف" : "Download"}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: Blueprints & Engineering Files (المخططات والملفات الهندسية) */}
              {dossierTab === "blueprints" && (
                <div className="space-y-6">
                  {/* Top Info Banner */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-purple-50 border border-blue-150 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-blue-700" />
                        <h4 className="font-bold text-sm text-blue-950">
                          {language === "ar" ? "أرشيف المخططات والملفات الهندسية للمشروع" : "Project Blueprints & Engineering Files Archive"}
                        </h4>
                      </div>
                      <p className="text-xs text-blue-800/80 leading-relaxed">
                        {language === "ar"
                          ? "رفع وحفظ مخططات الكاميرات، التمديدات الشبكية، إنذار الحريق، والتصاميم المعمارية بصيغ PDF أو صور أو كراسات المواصفات، وتظهر للعميل في صفحة التتبع."
                          : "Upload blueprints, cabling, CCTV layout, and specs in PDF/images. Visible to client."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1.5 rounded-xl bg-blue-100/80 text-blue-800 text-xs font-mono font-bold">
                        {(selectedProject.blueprints || []).length} {language === "ar" ? "مخططات معتمدة" : "files"}
                      </span>
                    </div>
                  </div>

                  {/* Upload Blueprint Form */}
                  <form onSubmit={handleAddBlueprint} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <h5 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-purple-700" />
                      <span>{language === "ar" ? "رفع مخطط هندسي جديد للمشروع" : "Upload New Blueprint / File"}</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "تصنيف المخطط" : "Category"}
                        </label>
                        <select
                          value={blueprintCategory}
                          onChange={(e) => setBlueprintCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-600 cursor-pointer"
                        >
                          <option value="مخطط شبكات وتمديدات">مخطط شبكات وتمديدات (Network & Cabling)</option>
                          <option value="مخطط كاميرات المراقبة">مخطط كاميرات المراقبة (CCTV Layout)</option>
                          <option value="مخطط إنذار ومكافحة حريق">مخطط إنذار ومكافحة حريق (Fire Alarm)</option>
                          <option value="مخطط معماري وديكور">مخطط معماري وديكور (Architectural)</option>
                          <option value="مخطط أنظمة ذكية وتحكم">مخطط أنظمة ذكية وتحكم (Smart Home)</option>
                          <option value="كراسة الشروط والمواصفات">كراسة الشروط والمواصفات (Specifications)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "اسم / وصف المخطط" : "Blueprint Title"}
                        </label>
                        <input
                          type="text"
                          required
                          value={blueprintFileName}
                          onChange={(e) => setBlueprintFileName(e.target.value)}
                          placeholder={language === "ar" ? "مثال: المخطط التنفيذي للطابق الأرضي - كاميرات" : "e.g. Ground Floor CCTV Layout"}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {language === "ar" ? "ملف المخطط (PDF / صورة / مستند)" : "File (PDF, CAD, Image)"}
                        </label>
                        <label className="w-full px-3 py-2 bg-white hover:bg-slate-100 border border-dashed border-purple-300 rounded-xl text-xs font-semibold text-purple-700 text-center cursor-pointer transition flex items-center justify-center gap-1.5 truncate">
                          <UploadCloud className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="truncate">
                            {blueprintFileBase64 
                              ? (blueprintFileSize ? `جاهز (${blueprintFileSize})` : "تم اختيار الملف") 
                              : (language === "ar" ? "اختر ملف PDF أو صورة" : "Choose File")}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,image/*,.dwg,.dxf,.cad,.doc,.docx"
                            onChange={handleBlueprintFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={blueprintNotes}
                          onChange={(e) => setBlueprintNotes(e.target.value)}
                          placeholder={language === "ar" ? "ملاحظات إضافية للمهندسين أو الفنيين (اختياري)..." : "Additional engineering notes (optional)..."}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!blueprintFileBase64 || uploadingBlueprint}
                        className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                      >
                        {uploadingBlueprint ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{language === "ar" ? "جاري الرفع إلى السحابة..." : "Uploading..."}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{language === "ar" ? "إضافة المخطط للمشروع" : "Add Blueprint"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Blueprints Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-purple-600" />
                        <span>{language === "ar" ? "المخططات الهندسية المعتمدة للمشروع" : "Approved Project Blueprints"}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                          {(selectedProject.blueprints || []).length}
                        </span>
                      </h5>
                    </div>

                    {(!selectedProject.blueprints || selectedProject.blueprints.length === 0) ? (
                      <div className="p-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                        <FileCode className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">
                          {language === "ar" ? "لا توجد مخططات هندسية مرفوعة لهذا المشروع حتى الآن" : "No blueprints uploaded yet"}
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          {language === "ar"
                            ? "يمكنك رفع ملفات الـ PDF والتصاميم الهندسية من النموذج أعلاه ليتمكن المهندسون والفنيون والعميل من الاطلاع عليها."
                            : "Upload PDF or image blueprints above to share with technicians and client."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedProject.blueprints.map((bp) => {
                          const isPdf = bp.fileType?.includes("pdf") || bp.name.toLowerCase().endsWith(".pdf") || bp.url.toLowerCase().endsWith(".pdf");
                          const isImage = bp.fileType?.includes("image") || bp.url.match(/\.(jpeg|jpg|png|webp|svg)/i);

                          return (
                            <div
                              key={bp.id}
                              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                            >
                              <div className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                      isPdf ? "bg-rose-50 text-rose-600 border border-rose-200" :
                                      isImage ? "bg-purple-50 text-purple-600 border border-purple-200" :
                                      "bg-blue-50 text-blue-600 border border-blue-200"
                                    }`}>
                                      {isPdf ? <FileText className="w-5 h-5" /> : isImage ? <ImageIcon className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
                                    </div>
                                    <div>
                                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                        {bp.category}
                                      </span>
                                      <h6 className="font-bold text-xs text-slate-900 mt-1 line-clamp-2 leading-snug" title={bp.name}>
                                        {bp.name}
                                      </h6>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBlueprint(bp.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title={language === "ar" ? "حذف المخطط" : "Delete"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {bp.notes && (
                                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-150 leading-relaxed">
                                    {bp.notes}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                  <span>{bp.uploadedBy || "المكتب الهندسي"}</span>
                                  <span className="font-mono">{bp.fileSize || bp.uploadedAt}</span>
                                </div>
                              </div>

                              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                                <a
                                  href={bp.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{language === "ar" ? "معاينة الملف" : "View"}</span>
                                </a>

                                <a
                                  href={bp.url}
                                  download={bp.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs transition shadow-2xs"
                                  title={language === "ar" ? "تحميل الملف" : "Download"}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedProject(null);
                  handleOpenEdit(selectedProject);
                }}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                {language === "ar" ? "تعديل بيانات المشروع العامة" : "Edit Project Details"}
              </button>
              <button
                onClick={() => setSelectedProject(null)}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                {language === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Milestone Modal */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-purple-700" />
                <span>{language === "ar" ? "إضافة مرحلة جديدة للمشروع" : "Add Custom Milestone"}</span>
              </h4>
              <button onClick={() => setShowAddMilestoneModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "اسم المرحلة" : "Milestone Title"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فحص واختبار شبكة الكاميرات مع البلدية"
                  value={newMilestoneForm.title}
                  onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "الوصف والمواصفات" : "Description"}
                </label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات وتفاصيل تسليم هذه المرحلة..."
                  value={newMilestoneForm.description}
                  onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "التاريخ المستهدف" : "Target Date"}
                  </label>
                  <input
                    type="date"
                    value={newMilestoneForm.targetDate}
                    onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, targetDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "المسؤول / الفني" : "Assigned To"}
                  </label>
                  <select
                    value={newMilestoneForm.assignedTo}
                    onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 bg-white"
                  >
                    <option value="">{language === "ar" ? "اختر فني / مهندس" : "Select Technician"}</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-150 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddMilestoneModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold transition"
              >
                {language === "ar" ? "إضافة المرحلة" : "Add Phase"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Site Log Modal */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-700" />
                <span>{language === "ar" ? "تسجيل تقرير نشاط ميداني" : "Add Site Activity Log"}</span>
              </h4>
              <button onClick={() => setShowAddLogModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "التاريخ" : "Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={newLogForm.date}
                    onChange={(e) => setNewLogForm({ ...newLogForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "كاتب التقرير / المهندس" : "Supervisor / Author"}
                  </label>
                  <input
                    type="text"
                    placeholder="م. مصطفى"
                    value={newLogForm.author}
                    onChange={(e) => setNewLogForm({ ...newLogForm, author: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "تفاصيل ما تم إنجازه في الموقع اليوم" : "Activity / Progress Details"}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="تم الانتهاء من تمديدات السقف وسحب كابلات الكاميرات الخارجية وتوصيل السويتش الرئيسي..."
                  value={newLogForm.activity}
                  onChange={(e) => setNewLogForm({ ...newLogForm, activity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-150 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddLogModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleAddSiteLog}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold transition"
              >
                {language === "ar" ? "حفظ التقرير الميداني" : "Save Log"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-700" />
                <span>{editingProject ? (language === "ar" ? "تعديل بيانات المشروع" : "Edit Project") : (language === "ar" ? "إضافة مشروع جديد" : "New Project")}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "رقم المشروع" : "Project No."}
                  </label>
                  <input
                    type="text"
                    required
                    value={projectForm.projectNo}
                    onChange={(e) => setProjectForm({ ...projectForm, projectNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "حالة المشروع" : "Status"}
                  </label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 bg-white cursor-pointer"
                  >
                    <option value="in_progress">{language === "ar" ? "قيد التنفيذ" : "In Progress"}</option>
                    <option value="completed">{language === "ar" ? "مكتمل ومسلّم" : "Completed"}</option>
                    <option value="on_hold">{language === "ar" ? "معلق مؤقتاً" : "On Hold"}</option>
                    <option value="planned">{language === "ar" ? "مخطط للبدء" : "Planned"}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "اسم المشروع / الموقع" : "Project Title"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مشروع فيلا سكنية - كاميرات وشبكات ذكية"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "اسم العميل" : "Client Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={projectForm.clientName}
                    onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "رقم الهاتف" : "Phone"}
                  </label>
                  <input
                    type="text"
                    placeholder="+971 50..."
                    value={projectForm.clientPhone}
                    onChange={(e) => setProjectForm({ ...projectForm, clientPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "الموقع / الإمارة" : "Location"}
                  </label>
                  <input
                    type="text"
                    value={projectForm.location}
                    onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "الميزانية التقديرية (AED)" : "Budget (AED)"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "تاريخ البدء" : "Start Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "تاريخ التسليم المتوقع" : "Target Completion Date"}
                  </label>
                  <input
                    type="date"
                    value={projectForm.targetEndDate}
                    onChange={(e) => setProjectForm({ ...projectForm, targetEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "ملاحظات إضافية" : "Notes"}
                </label>
                <textarea
                  rows={2}
                  value={projectForm.notes}
                  onChange={(e) => setProjectForm({ ...projectForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingProject}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {savingProject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProject ? (language === "ar" ? "حفظ التعديلات" : "Update Project") : (language === "ar" ? "إنشاء المشروع" : "Create Project")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Photo Zoom Modal */}
      {viewingPhotoModal && (
        <div
          className="fixed inset-0 z-70 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewingPhotoModal(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-black/40 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingPhotoModal(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>
            <img
              src={viewingPhotoModal.url}
              alt={viewingPhotoModal.caption || "Site Photo"}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
            {viewingPhotoModal.caption && (
              <p className="mt-2 text-white text-xs text-center font-arabic bg-black/60 px-4 py-1.5 rounded-xl">
                {viewingPhotoModal.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

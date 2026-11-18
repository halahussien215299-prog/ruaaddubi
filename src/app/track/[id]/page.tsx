"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  Clock, 
  CircleDashed, 
  Camera, 
  Calendar, 
  MapPin, 
  User, 
  Share2, 
  MessageCircle, 
  PhoneCall, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  Printer, 
  Eye, 
  ShieldCheck, 
  Building2, 
  Sparkles,
  Layers,
  ChevronRight,
  ReceiptText,
  FileText,
  FolderOpen,
  ExternalLink,
  FileCode,
  Download
} from "lucide-react";
import { Project, ProjectMilestone, ProjectPhoto, getSettings } from "@/lib/db";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientProjectTrackerPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<Project | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<ProjectPhoto | null>(null);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [projRes, setRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          getSettings().catch(() => null)
        ]);

        if (!projRes.ok) {
          throw new Error("لم يتم العثور على المشروع المطلوب أو قد يكون الرابط غير صحيح");
        }

        const projData = await projRes.json();
        setProject(projData);
        setSettings(setRes);

        if (projData.clientPhone && typeof window !== "undefined") {
          try {
            localStorage.setItem("ruaad_client_phone", projData.clientPhone);
          } catch (e) {}
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "حدث خطأ أثناء تحميل بيانات المشروع");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  // Copy tracking link
  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Milestones calculation
  const milestones: ProjectMilestone[] = project?.milestones || [];
  const completedMilestones = milestones.filter(m => m.status === "completed").length;
  const inProgressMilestones = milestones.filter(m => m.status === "in_progress").length;
  const totalMilestones = milestones.length || 1;
  const progressPercent = Math.min(100, Math.round((completedMilestones / totalMilestones) * 100));

  // Current active milestone (in_progress or next pending)
  const currentMilestone = milestones.find(m => m.status === "in_progress") || 
                           milestones.find(m => m.status === "pending") ||
                           milestones[milestones.length - 1];

  // Photos list
  const photos: ProjectPhoto[] = project?.sitePhotos || [];
  const filteredPhotos = selectedPhaseFilter === "all" 
    ? photos 
    : photos.filter(p => p.phase === selectedPhaseFilter || p.milestoneId === selectedPhaseFilter);

  // WhatsApp Support Link
  const supportPhone = settings?.phone || "971500000000";
  const cleanPhone = supportPhone.replace(/[^0-9]/g, "");
  const whatsappMsg = encodeURIComponent(
    `مرحباً رواد سمارت، أستفسر عن مسار مشروعي (${project?.title || ""}) رقم (${project?.projectNo || projectId})`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMsg}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-500 gap-3 font-arabic" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-purple-700" />
        <h2 className="text-base font-bold text-slate-800">جاري تحميل بيانات تتبع المشروع...</h2>
        <p className="text-xs text-slate-400">لحظات ويتم مزامنة أحدث مراحل وصور الموقع الحية</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-arabic" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">تعذر فتح صفحة تتبع المشروع</h1>
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          {error || "المشروع غير موجود أو تم إيقاف الرابط المباشر. يرجى التواصل مع الدعم الفني."}
        </p>
        <Link 
          href="/client" 
          className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          العودة لبوابة العملاء
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 font-arabic pb-16" dir="rtl">
      
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-9 object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
                RS
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 leading-tight">
                {settings?.companyName || "رواد سمارت للأجهزة الذكية"}
              </h1>
              <span className="text-[10px] text-purple-700 font-bold flex items-center gap-1">
                <ShieldCheck size={11} />
                بوابة التتبع الميداني المباشر للعملاء
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="نسخ رابط التتبع"
            >
              <Share2 size={13} />
              <span>{copiedLink ? "تم النسخ!" : "مشاركة"}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="hidden sm:flex px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition items-center gap-1.5 cursor-pointer"
            >
              <Printer size={13} />
              <span>طباعة التقرير</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">

        {/* Hero Card: Project Title & Progress */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-purple-600/5 rounded-br-full -z-0 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            {/* Title & Metadata */}
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-mono text-xs font-bold border border-purple-100">
                  {project.projectNo}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  project.status === "completed"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : project.status === "in_progress"
                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}>
                  {project.status === "completed" ? "✅ تم تسليم المشروع" : project.status === "in_progress" ? "🚀 جاري العمل بالموقع" : "⏱️ في مرحلة التجهيز"}
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-snug">
                {project.title}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-400">العميل:</span>
                  <span className="font-bold text-slate-800">{project.clientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-400">الموقع:</span>
                  <span className="font-semibold text-slate-800">{project.location || "الموقع الميداني"}</span>
                </div>
                {project.targetEndDate && (
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <span className="text-slate-400">موعد التسليم المتوقع:</span>
                    <span className="font-mono font-bold text-purple-800">{project.targetEndDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Circular Progress Gauge */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-[160px]">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-purple-600 transition-all duration-1000 ease-out"
                    strokeDasharray={`${progressPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900 font-mono leading-none">{progressPercent}%</span>
                  <span className="text-[10px] text-slate-400 font-bold mt-0.5">نسبة الإنجاز</span>
                </div>
              </div>

              <div className="mt-2 text-center text-[11px] text-slate-500 font-medium">
                {completedMilestones} من {totalMilestones} مراحل منجزة
              </div>
            </div>
          </div>

          {/* Current Active Milestone Highlight */}
          {currentMilestone && (
            <div className="mt-6 pt-5 border-t border-slate-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-purple-700">المرحلة الحالية قيد الإنجاز:</div>
                  <div className="text-sm font-bold text-slate-900">{currentMilestone.title}</div>
                </div>
              </div>
              <div className="text-xs font-semibold text-purple-800 bg-purple-100 px-3 py-1 rounded-xl">
                {currentMilestone.status === "completed" ? "✅ المرحلة مكتملة" : "⏳ جاري العمل الميداني"}
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Milestones Roadmap (مسار مراحل المشروع) */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-700" />
              <h3 className="font-extrabold text-base text-slate-900">مسار ومراحل تنفيذ المشروع</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {completedMilestones}/{totalMilestones} مراحل مكتملة
            </span>
          </div>

          {/* Horizontal / Grid Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {milestones.map((m, idx) => {
              const isCompleted = m.status === "completed";
              const isInProgress = m.status === "in_progress";
              const isPending = m.status === "pending";

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isCompleted
                      ? "bg-emerald-50/40 border-emerald-200"
                      : isInProgress
                      ? "bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-xs"
                      : "bg-slate-50/60 border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : isInProgress
                          ? "bg-purple-700 text-white animate-pulse"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {idx + 1}
                      </span>
                      <h4 className={`text-xs font-bold leading-tight ${
                        isCompleted ? "text-emerald-950" : isInProgress ? "text-purple-950" : "text-slate-700"
                      }`}>
                        {m.title}
                      </h4>
                    </div>

                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                        مكتملة ✅
                      </span>
                    )}
                    {isInProgress && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-900 text-[10px] font-bold shrink-0">
                        قيد العمل ⏳
                      </span>
                    )}
                    {isPending && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-semibold shrink-0">
                        معلقة ⏱️
                      </span>
                    )}
                  </div>

                  {m.description && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {m.description}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {m.completedDate ? `أنجزت في: ${m.completedDate}` : m.targetDate ? `تاريخ الهدف: ${m.targetDate}` : "المرحلة مجدولة"}
                    </span>
                    {photos.filter(p => p.milestoneId === m.id).length > 0 && (
                      <span className="text-purple-700 font-bold flex items-center gap-1">
                        <Camera size={11} />
                        {photos.filter(p => p.milestoneId === m.id).length} صور
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Live Field Photos Stream (📸 توثيق الموقع والصور الميدانية) */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-700" />
                <h3 className="font-extrabold text-base text-slate-900">ألبوم التوثيق الميداني المباشر من الموقع</h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold font-mono">
                  {photos.length}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                يقوم فريق العمل والفنيون برفع صور توثيقية حية لكل مرحلة من مراحل التنفيذ لضمان أعلى معايير الجودة والشفافية.
              </p>
            </div>

            {/* Filter by milestone */}
            {milestones.length > 0 && photos.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setSelectedPhaseFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    selectedPhaseFilter === "all"
                      ? "bg-purple-700 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  جميع الصور ({photos.length})
                </button>
                {milestones.map(m => {
                  const mCount = photos.filter(p => p.milestoneId === m.id || p.phase === m.title).length;
                  if (mCount === 0) return null;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedPhaseFilter(m.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        selectedPhaseFilter === m.id
                          ? "bg-purple-700 text-white shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {m.title} ({mCount})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Photos Stream Grid */}
          {filteredPhotos.length === 0 ? (
            <div className="py-12 px-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
              <Camera className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">لا توجد صور ميدانية مرفوعة حالياً في هذا القسم</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                سيقوم فريقنا الفني برفع صور التوثيق الميدانية مباشرة من موقع العمل فور بدء الأعمال التركيبية أو تمديد الشبكات.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setViewingPhoto(photo)}
                  className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.caption || "صورة من موقع العمل"}
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-900 text-xs font-bold flex items-center gap-1 shadow-md">
                        <Eye size={14} />
                        تكبير الصورة
                      </span>
                    </div>

                    {photo.phase && (
                      <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs">
                        {photo.phase}
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                      {photo.caption || "توثيق مرحلي لأعمال الموقع"}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-purple-700">
                        {photo.uploadedBy || "فني الموقع"}
                      </span>
                      <span className="font-mono">{photo.uploadedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Approved Blueprints & Engineering Plans (المخططات والتصاميم الهندسية المعتمدة) */}
        {project.blueprints && project.blueprints.length > 0 && (
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-700" />
                <h3 className="font-extrabold text-base text-slate-900">المخططات والتصاميم الهندسية المعتمدة للمشروع</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                  {project.blueprints.length}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                المكتب الهندسي - رواد سمارت
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {project.blueprints.map((bp) => {
                const isPdf = bp.fileType?.includes("pdf") || bp.name.toLowerCase().endsWith(".pdf") || bp.url.toLowerCase().endsWith(".pdf");
                const isImage = bp.fileType?.includes("image") || bp.url.match(/\.(jpeg|jpg|png|webp|svg)/i);

                return (
                  <div
                    key={bp.id}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3 shadow-2xs hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPdf ? "bg-rose-50 text-rose-600 border border-rose-200" :
                        isImage ? "bg-purple-50 text-purple-600 border border-purple-200" :
                        "bg-blue-50 text-blue-600 border border-blue-200"
                      }`}>
                        {isPdf ? <FileText size={18} /> : isImage ? <Camera size={18} /> : <FileCode size={18} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 mb-1">
                          {bp.category}
                        </span>
                        <h5 className="font-bold text-xs text-slate-900 truncate" title={bp.name}>
                          {bp.name}
                        </h5>
                        {bp.notes && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {bp.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{bp.uploadedAt}</span>
                      <div className="flex items-center gap-2">
                        <a
                          href={bp.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                        >
                          <Eye size={12} />
                          <span>معاينة</span>
                        </a>
                        <a
                          href={bp.url}
                          download={bp.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs transition shadow-2xs"
                          title="تحميل المخطط"
                        >
                          <Download size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section: Project Invoices & Documents (الفواتير والمستندات الخاصة بالمشروع) */}
        <section className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-purple-700" />
              <h3 className="font-extrabold text-base text-slate-900">الفواتير والمستندات الرسمية الخاصة بالمشروع</h3>
            </div>
            <Link
              href={`/client?phone=${encodeURIComponent(project.clientPhone || "")}`}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition"
            >
              <span>فتح بوابة فواتيري الكاملة</span>
              <ChevronRight size={14} className="rotate-180" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {project.quotationId && (
              <Link
                href={`/quotation/${project.quotationId}/view?view=invoice&type=tax`}
                target="_blank"
                className="p-4 bg-purple-50/60 hover:bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between gap-3 transition shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ReceiptText size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-purple-950 group-hover:text-purple-700">الفاتورة الضريبية الرسمية</h5>
                    <p className="text-[11px] text-slate-500">معتمدة مع رمز الاستجابة ZATCA/FTA</p>
                  </div>
                </div>
                <ExternalLink size={14} className="text-purple-600 shrink-0" />
              </Link>
            )}

            {project.contractId && (
              <Link
                href={`/contract/${project.contractId}/sign`}
                target="_blank"
                className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 transition shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 group-hover:text-purple-700">عقد تنفيذ المشروع</h5>
                    <p className="text-[11px] text-slate-500">العقد الرسمي المبرم والبنود</p>
                  </div>
                </div>
                <ExternalLink size={14} className="text-slate-600 shrink-0" />
              </Link>
            )}

            <Link
              href={`/client?phone=${encodeURIComponent(project.clientPhone || "")}`}
              className="p-4 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 transition shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FolderOpen size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-emerald-950 group-hover:text-emerald-700">أرشيف كافة المستندات والسندات</h5>
                  <p className="text-[11px] text-slate-500">سندات القبض، شهادات الضمان والإنجاز</p>
                </div>
              </div>
              <ExternalLink size={14} className="text-emerald-600 shrink-0" />
            </Link>
          </div>
        </section>

        {/* Section 4: Contact & Direct Inquiries */}
        <section className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
          <div className="space-y-2 text-center md:text-right">
            <h4 className="text-lg font-black flex items-center justify-center md:justify-start gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              <span>هل لديك أي استفسار أو ملاحظة حول مسار المشروع؟</span>
            </h4>
            <p className="text-xs text-purple-200/80 max-w-xl leading-relaxed">
              فريق خدمة العملاء والإشراف الهندسي في شركة رواد سمارت متاح للرد على أي استفسارات تخص مشروعك في أي وقت.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg hover:shadow-emerald-500/20"
            >
              <MessageCircle size={16} />
              <span>محادثة واتساب مباشرة</span>
            </a>

            {settings?.phone && (
              <a
                href={`tel:${cleanPhone}`}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-2"
              >
                <PhoneCall size={15} />
                <span>اتصال هاتفي</span>
              </a>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 pt-4 pb-8 space-y-1">
          <p className="font-semibold text-slate-600">
            {settings?.companyName || "رواد سمارت للأجهزة الذكية"} • RUAAD SMART
          </p>
          <p className="text-[11px]">
            جميع الحقوق محفوظة © {new Date().getFullYear()} — نظام إدارة وتتبع المشاريع الذكية
          </p>
        </footer>

      </main>

      {/* Full Photo Zoom Modal */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewingPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] bg-slate-900 rounded-3xl overflow-hidden flex flex-col items-center justify-center p-3 shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition cursor-pointer text-lg font-bold"
            >
              ✕
            </button>

            <img
              src={viewingPhoto.url}
              alt={viewingPhoto.caption || "صورة الموقع"}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl"
            />

            <div className="w-full mt-3 p-3 bg-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-right">
              <div>
                {viewingPhoto.phase && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white text-[10px] font-bold ml-2">
                    {viewingPhoto.phase}
                  </span>
                )}
                <span className="text-xs text-white font-medium">
                  {viewingPhoto.caption || "توثيق مرحلي لأعمال الموقع الميدانية"}
                </span>
              </div>
              <div className="text-[10px] text-purple-200 font-mono">
                {viewingPhoto.uploadedBy} • {viewingPhoto.uploadedAt}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

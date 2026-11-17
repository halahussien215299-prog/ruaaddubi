"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Download, 
  Loader2,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  FileText,
  PenTool,
  Upload,
  AlertCircle
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { saveContract, getContract, Contract, getSettings, Settings } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";

interface ClientContractSignerProps {
  id: string;
}

function getClauseSplitIndex(clauses: Array<{ title: string; content: string }>): number {
  if (!clauses || clauses.length === 0) return 3;
  const clause1Lines = clauses[0]?.content ? clauses[0].content.split('\n').length : 4;
  if (clause1Lines > 8) {
    return 2;
  } else if (clause1Lines > 4) {
    return 3;
  }
  return 4;
}

export default function ClientContractSigner({ id }: ClientContractSignerProps) {
  const { language } = useLanguage();

  const [contract, setContract] = useState<Contract | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [signed, setSigned] = useState(false);

  const [signerName, setSignerName] = useState("");
  const [signDate, setSignDate] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [firstPartyStamp, setFirstPartyStamp] = useState("");

  const previewRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [contractData, settingsData] = await Promise.all([
          getContract(id),
          getSettings()
        ]);

        if (contractData) {
          setContract(contractData);
          setSignerName(contractData.firstPartySignName || contractData.firstPartyName || "");
          setFirstPartyStamp(contractData.firstPartyStamp || "");
          
          // Set signature date to today's date if not signed, else load signed date
          if (contractData.firstPartySignature) {
            setSigned(true);
            setSignDate(contractData.firstPartySignDate || "");
            setSignatureData(contractData.firstPartySignature);
          } else {
            const today = new Date();
            const formattedDate = today.toLocaleDateString("en-GB"); // DD/MM/YYYY
            setSignDate(formattedDate);
          }
        }
        if (settingsData) {
          setSettings(settingsData);
        }
      } catch (err) {
        console.error("Error loading contract:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    if (signed && signatureData && sigRef.current) {
      // Delay to ensure canvas is mounted and sized
      const timer = setTimeout(() => {
        if (sigRef.current) {
          sigRef.current.fromDataURL(signatureData);
          sigRef.current.off();
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [signed, signatureData]);

  const handleSignatureEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setSignatureData(sigRef.current.toDataURL("image/png"));
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(language === "ar" ? "حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت." : "Image size is too large. Please select an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFirstPartyStamp(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearStamp = () => {
    setFirstPartyStamp("");
  };

  const handleClearSignature = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      setSignatureData("");
    }
  };

  const handleSignContract = async () => {
    if (!contract) return;
    if (!signerName.trim()) {
      alert(language === "ar" ? "يرجى كتابة الاسم الكامل للموقّع" : "Please enter the signatory's full name");
      return;
    }
    if (!signatureData) {
      alert(language === "ar" ? "يرجى رسم التوقيع أولاً" : "Please draw your signature first");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const todayFormatted = new Date().toLocaleDateString("en-GB");
      const updatedContract: Contract = {
        ...contract,
        firstPartySignName: signerName,
        firstPartySignDate: todayFormatted,
        firstPartySignature: signatureData,
        firstPartyStamp: firstPartyStamp || undefined,
        updatedAt: now
      };

      await saveContract(updatedContract);
      setContract(updatedContract);
      setSignDate(todayFormatted);
      setSigned(true);
      
      if (sigRef.current) {
        sigRef.current.off();
      }

      alert(language === "ar" ? "تم توقيع واعتماد العقد بنجاح! 🎉" : "Contract signed and approved successfully!");
    } catch (error) {
      console.error("Signing failed:", error);
      alert(language === "ar" ? "فشل حفظ التوقيع، يرجى المحاولة لاحقاً" : "Failed to save signature, please try again later");
    } finally {
      setSaving(false);
    }
  };

  // Canvas-based oklch→rgb converter for html2canvas compatibility
  const makeColorConverter = (doc: Document) => {
    const tmpCanvas = doc.createElement("canvas");
    tmpCanvas.width = 1;
    tmpCanvas.height = 1;
    const ctx = tmpCanvas.getContext("2d");
    return (color: string): string => {
      if (!ctx) return "#000000";
      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        if (a === 0) return "rgba(0,0,0,0)";
        return `rgb(${r},${g},${b})`;
      } catch {
        return "#000000";
      }
    };
  };

  const patchDocumentColors = (doc: Document) => {
    const toRgb = makeColorConverter(doc);

    if (!doc.querySelector("link[href*='Cairo']")) {
      const link = doc.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap";
      doc.head.appendChild(link);
    }

    doc.querySelectorAll("style").forEach((styleEl) => {
      if (!styleEl.textContent) return;
      if (styleEl.textContent.includes("oklch") || styleEl.textContent.includes("oklab") || styleEl.textContent.includes("lab(")) {
        styleEl.textContent = styleEl.textContent
          .replace(/oklch\([^)]+\)/g, (m) => toRgb(m))
          .replace(/oklab\([^)]+\)/g, (m) => toRgb(m))
          .replace(/\blab\([^)]+\)/g, (m) => toRgb(m));
      }
    });
    doc.querySelectorAll("link[rel='stylesheet']:not([href*='Cairo']), link[as='style']").forEach((l) => l.remove());
  };

  const bakeElementStyles = (origElement: HTMLElement, cloneElement: HTMLElement) => {
    const toRgb = makeColorConverter(document);
    const propsToCopy = [
      "display", "position", "top", "right", "bottom", "left", "float", "clear",
      "width", "height", "min-width", "min-height", "max-width", "max-height",
      "margin-top", "margin-right", "margin-bottom", "margin-left",
      "padding-top", "padding-right", "padding-bottom", "padding-left",
      "box-sizing", "overflow", "overflow-x", "overflow-y", "z-index",
      "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis",
      "justify-content", "align-items", "align-content", "gap", "row-gap", "column-gap",
      "grid-template-columns", "grid-template-rows", "grid-column", "grid-row", "grid-auto-flow",
      "font-family", "font-size", "font-weight", "font-style", "line-height",
      "text-align", "text-decoration", "direction", "letter-spacing", "word-spacing",
      "color", "background-color", "background-image", "background-position", "background-size", "background-repeat",
      "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
      "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
      "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius",
      "box-shadow", "opacity", "object-fit"
    ];

    const origEls = [origElement, ...Array.from(origElement.querySelectorAll("*"))];
    const cloneEls = [cloneElement, ...Array.from(cloneElement.querySelectorAll("*"))];

    origEls.forEach((orig, i) => {
      const cloneEl = cloneEls[i];
      if (!(orig instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) return;
      const computed = window.getComputedStyle(orig);

      propsToCopy.forEach((prop) => {
        let val = computed.getPropertyValue(prop);
        if (!val) return;

        if (prop === "font-family") {
          val = "Cairo, 'Segoe UI', Tahoma, Arial, sans-serif";
        }
        if (prop === "letter-spacing") {
          val = "normal";
        }

        if (val.includes("oklch") || val.includes("oklab") || val.includes("lab(")) {
          val = val
            .replace(/oklch\([^)]+\)/g, (m) => toRgb(m))
            .replace(/oklab\([^)]+\)/g, (m) => toRgb(m))
            .replace(/\blab\([^)]+\)/g, (m) => toRgb(m));
        }
        cloneEl.style.setProperty(prop, val, "important");
      });
    });
  };

  const captureElementAsCanvas = async (element: HTMLDivElement): Promise<HTMLCanvasElement> => {
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
    }

    const clone = element.cloneNode(true) as HTMLDivElement;
    clone.style.position = "absolute";
    clone.style.top = "0";
    clone.style.left = "-9999px";
    clone.style.setProperty("width", "210mm", "important");
    clone.style.setProperty("min-width", "210mm", "important");
    if (element.clientHeight > 0) {
      clone.style.setProperty("height", `${element.clientHeight}px`, "important");
      clone.style.setProperty("min-height", `${element.clientHeight}px`, "important");
    } else {
      clone.style.setProperty("height", "auto", "important");
    }
    clone.style.setProperty("zoom", "1", "important");
    clone.style.setProperty("transform", "none", "important");
    document.body.appendChild(clone);

    const originalCssText = element.style.cssText;
    element.style.setProperty("position", "fixed", "important");
    element.style.setProperty("z-index", "99999", "important");
    element.style.setProperty("top", "0", "important");
    element.style.setProperty("left", "0", "important");
    element.style.setProperty("width", "210mm", "important");
    element.style.setProperty("min-width", "210mm", "important");
    element.style.setProperty("transform", "none", "important");
    element.style.setProperty("zoom", "1", "important");

    bakeElementStyles(element, clone);

    element.style.cssText = originalCssText;

    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      const options = {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: Document) => {
          patchDocumentColors(clonedDoc);
        },
      };
      return await html2canvas(clone, options);
    } finally {
      document.body.removeChild(clone);
    }
  };

  const handleDownloadPDF = async () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-purple-700 animate-spin" />
        <p className="text-zinc-600 text-sm font-medium">{language === "ar" ? "جاري تحميل العقد..." : "Loading contract..."}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="p-4 bg-red-50 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900">{language === "ar" ? "خطأ في التحميل" : "Loading Error"}</h1>
        <p className="text-zinc-500 text-sm max-w-md">
          {language === "ar" ? "حدث خطأ أثناء تحميل بيانات العقد. يرجى التحقق من الاتصال." : "An error occurred while loading the contract. Please check your connection."}
        </p>
        <button onClick={() => window.location.reload()} className="px-5 py-2 bg-purple-800 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors">
          {language === "ar" ? "إعادة المحاولة" : "Try Again"}
        </button>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="p-4 bg-zinc-100 rounded-full">
          <FileText className="w-12 h-12 text-zinc-400" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900">{language === "ar" ? "العقد غير موجود" : "Contract Not Found"}</h1>
        <p className="text-zinc-500 text-sm max-w-md">
          {language === "ar" 
            ? "الرابط الذي تحاول الوصول إليه غير صحيح أو تم حذف العقد." 
            : "The link you are trying to access is incorrect or the contract has been deleted."}
        </p>
      </div>
    );
  }

  const splitIndex = getClauseSplitIndex(contract.clauses || []);
  const page1Clauses = (contract.clauses || []).slice(0, splitIndex);
  const page2Clauses = (contract.clauses || []).slice(splitIndex);

  return (
    <div className="min-h-screen bg-slate-100 text-zinc-900 flex flex-col" dir="rtl">
      {/* ── Sticky Header ── */}
      <header className="bg-white border-b border-zinc-200 py-3 px-4 sm:px-6 flex items-center justify-between no-print shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-purple-700 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-zinc-900">
              {language === "ar" ? "بوابة توقيع العقد الإلكتروني" : "E-Contract Signing Portal"}
            </h1>
            <p className="text-xs text-zinc-500 hidden sm:block truncate max-w-xs">
              {contract.title || (language === "ar" ? "عقد توريد وتركيب" : "Supply & Installation Contract")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">
            #{contract.contractNo}
          </span>
          {signed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-purple-900 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === "ar" ? "تم التوقيع" : "Signed"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <PenTool className="w-3.5 h-3.5 animate-pulse" />
              {language === "ar" ? "بانتظار توقيعك" : "Awaiting Signature"}
            </span>
          )}
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden client-signer-layout">
        
        {/* Right Pane: A4 Preview Container */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-2 sm:p-6 md:p-8 flex justify-center print-area printable-area client-signer-preview">
          <div className="w-full max-w-[210mm] sm:w-[210mm] flex flex-col gap-6 print:gap-0">
            <div 
              ref={previewRef}
              id="contract-preview-wrapper"
              className="flex flex-col gap-6 print:gap-0"
            >
              {/* Continuous Flow Contract Page */}
              <div 
                id="contract-preview-page-continuous"
                dir="rtl"
                className="continuous-flow-page w-full max-w-[210mm] sm:w-[210mm] bg-white text-zinc-900 p-6 sm:p-10 md:px-[14mm] md:py-[12mm] shadow-md sm:shadow-2xl rounded-lg sm:rounded-none relative flex flex-col font-arabic pdf-preview-container print-area printable-area"
                style={{ boxSizing: "border-box" }}
              >
                {/* Legal Contract Header */}
                <div className="flex items-start justify-between border-b border-zinc-200 pb-3 mb-3">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-purple-900 leading-tight">
                      {contract.title || "عقد توريد وتركيب"}
                    </h1>
                    <div className="flex flex-col gap-0.5 mt-0.5 text-[10px] text-zinc-500">
                      <div>رقم العقد: <span className="font-mono text-zinc-800 font-semibold">{contract.contractNo}</span></div>
                      <div>التاريخ: <span className="text-zinc-800 font-semibold">{contract.date}</span></div>
                    </div>
                  </div>
                  <div className="text-left">
                    {settings?.logoBase64 ? (
                      <div className="w-24 h-12 flex items-center justify-start">
                        <img 
                          src={settings.logoBase64} 
                          alt="Company Logo" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="font-bold text-sm tracking-wider text-purple-900">
                        {contract.secondPartyName?.toUpperCase() || "RUAAD SMART"}
                      </div>
                    )}
                    <p className="text-[8px] text-zinc-400 mt-0.5">
                      {language === "ar" ? "التصميم الداخلي والخدمات الفنية" : "Interior Design & Technical Services"}
                    </p>
                  </div>
                </div>

                {/* Parties Section */}
                <div className="mb-3 space-y-0.5 bg-zinc-50 p-2 border border-zinc-150 rounded-lg">
                  <p className="text-[10px] font-bold text-purple-900 mb-1">أطراف الاتفاقية:</p>
                  <div className="grid grid-cols-2 gap-4 text-[10px] leading-snug">
                    {/* الطرف الأول */}
                    <div className="space-y-0.5 border-l border-zinc-200 pl-2">
                      <p className="font-bold text-zinc-800">الطرف الأول (العميل):</p>
                      <p><span className="text-zinc-400">الاسم:</span> <span className="font-semibold">{contract.firstPartyName}</span></p>
                      <p><span className="text-zinc-400">الهاتف:</span> <span className="font-mono">{contract.firstPartyPhone}</span></p>
                      <p><span className="text-zinc-400">العنوان:</span> <span>{contract.firstPartyAddress}</span></p>
                    </div>
                    {/* الطرف الثاني */}
                    <div className="space-y-0.5 pr-2">
                      <p className="font-bold text-zinc-800">الطرف الثاني (الشركة):</p>
                      <p><span className="text-zinc-400">الاسم:</span> <span className="font-semibold">{contract.secondPartyName}</span></p>
                      <p><span className="text-zinc-400">الهاتف:</span> <span className="font-mono">{contract.secondPartyPhone}</span></p>
                      <p><span className="text-zinc-400">العنوان:</span> <span>{contract.secondPartyAddress}</span></p>
                    </div>
                  </div>
                </div>

                {/* Clauses Section */}
                <div className="space-y-2 text-[9.5px] text-zinc-700 leading-normal text-justify pr-1 mb-4">
                  {(contract.clauses || []).map((clause, index) => (
                    <div key={index} className="space-y-0.5">
                      <h3 className="font-bold text-purple-900 border-r-2 border-purple-700 pr-1.5 py-0.5 text-[10px]">
                        {clause.title}
                      </h3>
                      <div className="whitespace-pre-line text-[9px] leading-relaxed text-zinc-600 pr-2 font-sans">
                        {clause.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Signatures & Stamps Footer ── */}
                <div className="border-t border-zinc-200 pt-3 mt-auto keep-together">
                  <p className="text-[9px] font-bold text-zinc-400 mb-2 text-center tracking-wider uppercase">
                    {language === "ar" ? "التوقيعات والاعتمادات" : "Signatures & Approvals"}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* الطرف الأول - العميل */}
                    <div className="space-y-1.5 text-center bg-zinc-50/50 p-2 rounded-lg border border-zinc-100">
                      <p className="font-bold text-purple-900 text-[10px] border-b border-zinc-150 pb-0.5">الطرف الأول (العميل)</p>
                      <div className="text-[9px] text-right space-y-0.5">
                        <p><span className="text-zinc-400">الاسم: </span><span className="font-semibold">{signerName || "___________________"}</span></p>
                        <p><span className="text-zinc-400">التاريخ: </span><span className="font-semibold">{signDate || "___________________"}</span></p>
                      </div>
                      
                      {/* Signature & Stamp Row */}
                      <div className="flex gap-2 items-center justify-center mt-1">
                        {/* Signature Box */}
                        <div className="flex-1 h-12 border border-zinc-200 rounded-md flex items-center justify-center bg-white overflow-hidden">
                          {signatureData ? (
                            <img src={signatureData} alt="First Party Signature" className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-[8px] text-zinc-300 italic">بانتظار التوقيع</span>
                          )}
                        </div>
                        {/* Stamp Box */}
                        {firstPartyStamp && (
                          <div className="w-14 h-12 border border-dashed border-zinc-200 rounded-md flex items-center justify-center bg-white overflow-hidden p-0.5">
                            <img src={firstPartyStamp} alt="Client Stamp" className="h-full object-contain opacity-75" />
                          </div>
                        )}
                      </div>
                      <p className="text-[7.5px] text-zinc-400 italic mt-0.5">توقيع وختم الطرف الأول</p>
                    </div>

                    {/* الطرف الثاني - الشركة */}
                    <div className="space-y-1.5 text-center bg-zinc-50/50 p-2 rounded-lg border border-zinc-100">
                      <p className="font-bold text-purple-900 text-[10px] border-b border-zinc-150 pb-0.5">الطرف الثاني (الشركة)</p>
                      <div className="text-[9px] text-right space-y-0.5">
                        <p><span className="text-zinc-400">الاسم: </span><span className="font-semibold">{contract.secondPartySignName || settings?.companyName || contract.secondPartyName || "___________________"}</span></p>
                        <p><span className="text-zinc-400">التاريخ: </span><span className="font-semibold">{contract.secondPartySignDate || contract.date || "___________________"}</span></p>
                      </div>

                      {/* Signature & Stamp Row */}
                      <div className="flex gap-2 items-center justify-center mt-1">
                        {/* Signature Box */}
                        <div className="flex-1 h-12 border border-zinc-200 rounded-md flex items-center justify-center bg-white overflow-hidden">
                          {contract.secondPartySignature ? (
                            <img src={contract.secondPartySignature} alt="Second Party Signature" className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-[8px] text-zinc-300 italic">بانتظار التوقيع</span>
                          )}
                        </div>
                        {/* Stamp Box */}
                        {(settings?.stampBase64 || "/stamp.png") && (
                          <div className="w-14 h-12 border border-dashed border-zinc-200 rounded-md flex items-center justify-center bg-white overflow-hidden p-0.5">
                            <img src={settings?.stampBase64 || "/stamp.png"} alt="Company Stamp" className="h-full object-contain opacity-75" />
                          </div>
                        )}
                      </div>
                      <p className="text-[7.5px] text-zinc-400 italic mt-0.5">توقيع وختم الطرف الثاني</p>
                    </div>
                  </div>

                  {/* Legal Notice */}
                  <div className="mt-2 pt-1.5 border-t border-zinc-100 text-center">
                    <p className="text-[7.5px] text-zinc-400 leading-relaxed">
                      {language === "ar"
                        ? "بالتوقيع أعلاه، يُقرّ الطرف الأول بأنه قرأ وفهم جميع بنود هذا العقد ويوافق على الالتزام بها بشكل كامل."
                        : "By signing above, the First Party acknowledges reading, understanding, and agreeing to all terms of this contract."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Signature Sidebar ── */}
        <div className="w-full lg:w-[380px] bg-white border-t lg:border-t-0 lg:border-r border-zinc-200 flex flex-col no-print shadow-xl client-signer-sidebar">
          {/* Sidebar Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-100 bg-zinc-50 flex-shrink-0">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-purple-700" />
              {language === "ar" ? "اعتماد وتوقيع الاتفاقية" : "Sign Agreement"}
            </h2>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              {language === "ar" 
                ? "راجع بنود العقد بدقة، ثم أدخل اسمك وارسم توقيعك لإتمام العملية."
                : "Review all clauses carefully, then enter your name and draw your signature."}
            </p>
          </div>
          {/* Sidebar Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Already Signed Banner */}
            {signed && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6 text-purple-700 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-purple-900">{language === "ar" ? "تم توقيع العقد بنجاح!" : "Contract Signed!"}</p>
                  <p className="text-[10px] text-purple-700 mt-0.5">{language === "ar" ? `تاريخ التوقيع: ${signDate}` : `Signed on: ${signDate}`}</p>
                </div>
              </div>
            )}

            {/* Input Name */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-700">
                {language === "ar" ? "اسم الموقّع (الطرف الأول):" : "Signatory Full Name (Client):"}
              </label>
              <input 
                type="text" 
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                disabled={signed}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-purple-700 transition-colors disabled:opacity-50"
                placeholder={language === "ar" ? "اكتب اسمك الكامل هنا" : "Enter your full name"}
              />
            </div>

            {/* Input Date */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-700">
                {language === "ar" ? "تاريخ التوقيع:" : "Signature Date:"}
              </label>
              <input 
                type="text" 
                value={signDate}
                disabled
                className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-600 outline-none select-none opacity-80"
              />
            </div>

            {/* Signature Canvas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-700">
                  {language === "ar" ? "التوقيع:" : "Signature:"}
                  {!signed && <span className="text-red-500 mr-1">*</span>}
                </label>
                {!signed && signatureData && (
                  <button 
                    type="button" 
                    onClick={handleClearSignature}
                    className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-600 font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {language === "ar" ? "مسح" : "Clear"}
                  </button>
                )}
              </div>
              <div className={`rounded-xl overflow-hidden border-2 transition-colors ${signed ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-300 hover:border-zinc-400 bg-zinc-50"}` }>
                <SignatureCanvas 
                  ref={sigRef}
                  onEnd={handleSignatureEnd}
                  canvasProps={{
                    className: "w-full",
                    style: { height: "140px", touchAction: "none" }
                  }}
                  backgroundColor="rgba(0,0,0,0)"
                />
              </div>
              {!signed && !signatureData && (
                <p className="text-[9.5px] text-zinc-400 text-center">
                  {language === "ar" ? "ارسم توقيعك هنا بالإصبع أو الماوس" : "Draw your signature with finger or mouse"}
                </p>
              )}
            </div>

            {/* Stamp / Logo Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-700">
                {language === "ar" ? "ختم أو شعار العميل (اختياري):" : "Client Stamp/Logo (Optional):"}
              </label>
              {!signed ? (
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-zinc-300 border-dashed rounded-lg cursor-pointer hover:bg-zinc-50 hover:border-zinc-400 transition-colors relative overflow-hidden">
                    {firstPartyStamp ? (
                      <>
                        <img 
                          src={firstPartyStamp} 
                          alt="Stamp Preview" 
                          className="h-full object-contain p-2"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            clearStamp();
                          }}
                          className="absolute top-1 left-1 bg-red-600 hover:bg-red-700 text-white rounded p-1 text-[10px] z-20 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                        <p className="text-xs text-zinc-600">
                          {language === "ar" ? "اضغط لرفع الختم/الشعار" : "Click to upload stamp/logo"}
                        </p>
                        <p className="text-[9px] text-zinc-400 mt-0.5">PNG, JPG (Max 2MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleStampUpload}
                      className="hidden" 
                    />
                  </label>
                </div>
              ) : (
                firstPartyStamp ? (
                  <div className="h-20 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center p-2">
                    <img 
                      src={firstPartyStamp} 
                      alt="Uploaded Client Stamp" 
                      className="h-full object-contain opacity-80"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-400 italic">
                    {language === "ar" ? "لم يتم إرفاق ختم للعميل" : "No client stamp uploaded"}
                  </p>
                )
              )}
            </div>
          </div>{/* end scrollable content */}

          {/* ── Fixed Action Buttons ── */}
          <div className="p-4 sm:p-5 border-t border-zinc-100 space-y-3 bg-white flex-shrink-0">
            {!signed ? (
              <button
                onClick={handleSignContract}
                disabled={saving || !signerName.trim() || !signatureData}
                className="w-full py-3 rounded-xl bg-purple-800 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === "ar" ? "جاري الحفظ..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <PenTool className="w-4 h-4" />
                    {language === "ar" ? "توقيع واعتماد العقد" : "Sign & Approve Contract"}
                  </>
                )}
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <CheckCircle2 className="w-6 h-6 text-purple-700 mx-auto mb-1" />
                <p className="text-xs font-bold text-purple-900">
                  {language === "ar" ? "تم التوقيع بنجاح" : "Signed Successfully"}
                </p>
              </div>
            )}

            <button
              onClick={handleDownloadPDF}
              disabled={exporting}
              className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === "ar" ? "جاري التصدير..." : "Exporting..."}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {language === "ar" ? "تحميل نسخة PDF" : "Download PDF"}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Printer, 
  Share2, 
  Plus, 
  Trash2, 
  Loader2,
  FileText,
  DollarSign,
  Undo,
  Paperclip,
  Eye,
  Percent,
  TrendingUp,
  X,
  Layers
} from "lucide-react";
import PriceListPickerModal from "@/components/PriceListPickerModal";
import { saveQuotation, getQuotation, getAllQuotations, Quotation, QuotationItem, PurchaseInvoice, getSettings, Settings, saveContract, getAllContracts } from "@/lib/db";
import { useLanguage } from "@/lib/i18n";
import { generateZatcaTLV } from "@/lib/zatca";
import { generateZATCAQRCodeDataURL } from "@/lib/taxCompliance";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface QuotationEditorProps {
  id?: string;
}

const DEFAULT_QUOTATION_VALUES = {
  quotationNo: "",
  date: new Date().toLocaleDateString("en-GB"),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB"),
  preparedBy: "",
  status: "pending" as const,
  invoiceType: "standard" as const,
  taxJurisdiction: "UAE" as const,
  vatRate: 5,
  vatAmount: 0,
  currency: "AED",
  companyTaxNumber: "100458920100003",
  zatcaQrCode: "",
  clientTaxNumber: "",
  clientName: "",
  contactNo: "",
  email: "",
  locationArea: "",
  projectReference: "",
  items: [
    {
      id: "item-1",
      description: "",
      qty: 1,
      unit: "Units",
      unitPrice: 0,
      cost: 0,
      total: 0
    }
  ],
  subtotal: 0,
  discount: 0,
  total: 0,
  paymentTerms: "Immediate Payment",
  termsConditions: "https://ruaadsmart.ae/terms",
  preparedByName: "",
  preparedByDate: new Date().toLocaleDateString("en-GB"),
  clientAcceptanceName: "",
  clientAcceptanceDate: "",
  companyName: "RUAAD SMART SMART MACHINE TRADING LLC",
  bankName: "Abu Dhabi Commercial Bank",
  bankIban: "AE350030014245437920001",
  bankBic: "ADCBAEAA",
  bankAddress: "Dubai, UAE",
  companyAddress: "Business Bay – Churchill Tower, Office 404 – Floor 4, Dubai, UAE",
  companyEmail: "info@ruaadsmart.ae",
  purchaseInvoices: []
};

export default function QuotationEditor({ id }: QuotationEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language, isRtl } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "client-preview" | "company-preview">("edit");
  const [viewInvoice, setViewInvoice] = useState<PurchaseInvoice | null>(null);
  const [isInvoiceMode, setIsInvoiceMode] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isPriceListOpen, setIsPriceListOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [canViewCostAndProfit, setCanViewCostAndProfit] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeRole = localStorage.getItem("app_active_role");
      const userPermsStr = localStorage.getItem("app_user_perms");
      if (userPermsStr) {
        try {
          const perms = JSON.parse(userPermsStr);
          if (perms.canViewCostAndProfit !== undefined) {
            setCanViewCostAndProfit(Boolean(perms.canViewCostAndProfit));
          }
        } catch (e) {}
      } else if (activeRole === "operations") {
        setCanViewCostAndProfit(false);
      }
    }
  }, []);

  const isPrintMode = searchParams.get("print") === "true";
  const versionParam = searchParams.get("version");

  const { register, control, handleSubmit, watch, setValue, reset, getValues } = useForm<Quotation>({
    defaultValues: DEFAULT_QUOTATION_VALUES
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch("items") || [];
  const watchedInvoices = watch("purchaseInvoices") || [];

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const companyPageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    const view = searchParams.get("view");
    const type = searchParams.get("type");
    const jurisdiction = searchParams.get("jurisdiction");

    if (jurisdiction === "KSA") {
      setValue("taxJurisdiction", "KSA");
      setValue("currency", "SAR");
    } else if (jurisdiction === "UAE") {
      setValue("taxJurisdiction", "UAE");
      setValue("currency", "AED");
    }

    if (view === "invoice") {
      setPreviewTab("client-preview");
      setIsInvoiceMode(true);
      if (type === "tax" || type === "standard") {
        setValue("invoiceType", type);
      }
    } else if (type === "tax" || type === "standard") {
      setValue("invoiceType", type);
    }
  }, [searchParams, setValue]);

  useEffect(() => {
    if (isPrintMode && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isPrintMode, loading]);

  const handleAddFromPriceList = (selectedItems: { description: string; qty: number; unit: string; unitPrice: number; cost: number }[]) => {
    const currentItems = getValues("items") || [];
    if (currentItems.length === 1 && !currentItems[0].description) {
      remove(0);
    }
    selectedItems.forEach((item) => {
      append({
        id: `item-${Date.now()}-${Math.random()}`,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        unitPrice: item.unitPrice,
        cost: item.cost,
        total: item.qty * item.unitPrice,
      });
    });
  };
  
  useEffect(() => {
    if (id && id !== "new" && id !== "undefined") {
      const docId = id;
      async function loadQuotation() {
        try {
          const data = await getQuotation(docId);
          if (data) {
            reset(data);
          } else {
            const all = await getAllQuotations();
            if (all && all.length > 0) {
              reset(all[0]);
            } else {
              alert("Quotation not found");
              router.push("/");
            }
          }
        } catch (error) {
          console.error("Error loading quotation:", error);
        } finally {
          setLoading(false);
        }
      }
      loadQuotation();
    } else if (isPrintMode) {
      async function loadLatestForPrint() {
        try {
          const all = await getAllQuotations();
          if (all && all.length > 0) {
            reset(all[0]);
          }
        } catch (err) {
          console.error("Error loading latest for print:", err);
        } finally {
          setLoading(false);
        }
      }
      loadLatestForPrint();
    } else {
      async function generateSequentialNo() {
        try {
          const quotes = await getAllQuotations();
          const prefix = "V";
          let maxNum = 1000;
          quotes.forEach(q => {
            if (q.quotationNo && q.quotationNo.toUpperCase().startsWith(prefix)) {
              const numPart = q.quotationNo.slice(prefix.length);
              const num = parseInt(numPart, 10);
              if (!isNaN(num) && num > maxNum) {
                maxNum = num;
              }
            }
          });
          const nextNo = `${prefix}${maxNum + 1}`;
          setValue("quotationNo", nextNo);
        } catch (err) {
          console.error("Error generating sequential quotation no:", err);
          const randomNo = "V" + String(Math.floor(Math.random() * 90000) + 10000);
          setValue("quotationNo", randomNo);
        } finally {
          setLoading(false);
        }
      }
      generateSequentialNo();
    }
  }, [id, reset, setValue, router]);

  // Calculate totals on the fly
  const watchedDiscount = Number(watch("discount")) || 0;
  const subtotal = watchedItems.reduce((acc, item) => acc + (item.qty || 0) * (item.unitPrice || 0), 0);
  const discountAmount = subtotal * (watchedDiscount / 100);
  const beforeTaxTotal = Math.max(0, subtotal - discountAmount);

  // Multi-Jurisdiction VAT Calculations (UAE 5% FTA vs Saudi 15% ZATCA)
  const watchedTaxJurisdiction = watch("taxJurisdiction") || "UAE";
  const isTaxInvoice = isInvoiceMode && watch("invoiceType") === "tax";
  const taxRate = isTaxInvoice
    ? (watchedTaxJurisdiction === "KSA" ? 15 : Number(settings?.taxRate ?? 5))
    : 0;
  const taxAmount = isTaxInvoice ? beforeTaxTotal * (taxRate / 100) : 0;
  const total = beforeTaxTotal + taxAmount;
  const currency = watchedTaxJurisdiction === "KSA" ? "SAR" : (watch("currency") || settings?.currency || "AED");

  // Real-time offline ZATCA QR Code Generator
  useEffect(() => {
    if (isTaxInvoice) {
      const isKsa = watchedTaxJurisdiction === "KSA";
      const seller = watch("companyName") || settings?.companyName || "RUAAD SMART SMART MACHINE TRADING LLC";
      const vatNo = isKsa
        ? (settings?.saudiTaxNumber || "300000000000003")
        : (settings?.uaeTaxNumber || settings?.taxNumber || "100458920100003");

      generateZATCAQRCodeDataURL({
        sellerName: seller,
        vatNumber: vatNo,
        timestamp: new Date().toISOString(),
        totalWithVat: total.toFixed(2),
        vatAmount: taxAmount.toFixed(2),
      }).then((url) => {
        if (url) {
          setQrCodeDataUrl(url);
          setValue("zatcaQrCode", url);
        }
      }).catch(console.error);
    }
  }, [isTaxInvoice, watchedTaxJurisdiction, total, taxAmount, settings, setValue]);

  // Calculate internal cost and margins
  const totalCost = watchedItems.reduce((acc, item) => acc + ((item.cost || 0) * (item.qty || 0)), 0);
  const totalRevenue = beforeTaxTotal; // Revenue excluding VAT
  const profitMargin = totalRevenue - totalCost;
  const marginPercentage = totalRevenue > 0 ? (profitMargin / totalRevenue) * 100 : 0;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    const newInvoices: PurchaseInvoice[] = [];
    for (const file of filesArray) {
      try {
        const base64Data = await fileToBase64(file);
        newInvoices.push({
          id: `inv-${Date.now()}-${Math.random()}`,
          name: file.name,
          fileData: base64Data,
          fileType: file.type,
          uploadedAt: new Date().toLocaleDateString("en-GB")
        });
      } catch (err) {
        console.error("Error converting file to base64:", err);
      }
    }
    
    setValue("purchaseInvoices", [...watchedInvoices, ...newInvoices]);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setValue("purchaseInvoices", watchedInvoices.filter((inv) => inv.id !== invoiceId));
  };

  const saveDocHelper = async (data: Quotation): Promise<string> => {
    const documentId = (id && id !== "new" && id !== "undefined") ? id : `quote-${Date.now()}`;
    const now = new Date().toISOString();
    
    const processedItems = data.items.map(item => ({
      ...item,
      total: (item.qty || 0) * (item.unitPrice || 0)
    }));
    const calculatedSubtotal = processedItems.reduce((acc, item) => acc + item.total, 0);

    const discountVal = Number(data.discount) || 0;
    const discountAmount = calculatedSubtotal * (discountVal / 100);
    const beforeTaxTotal = Math.max(0, calculatedSubtotal - discountAmount);

    const isTax = isInvoiceMode && data.invoiceType === "tax";
    const isKsa = data.taxJurisdiction === "KSA";
    const currentTaxRate = isTax ? (isKsa ? 15 : Number(settings?.taxRate ?? 5)) : 0;
    const currentTaxAmount = isTax ? beforeTaxTotal * (currentTaxRate / 100) : 0;
    const calculatedTotal = beforeTaxTotal + currentTaxAmount;

    const updatedDoc: Quotation = {
      ...data,
      items: processedItems,
      id: documentId,
      subtotal: calculatedSubtotal,
      discount: discountVal,
      total: calculatedTotal,
      invoiceType: data.invoiceType || "standard",
      taxJurisdiction: data.taxJurisdiction || "UAE",
      vatRate: currentTaxRate,
      vatAmount: currentTaxAmount,
      currency: isKsa ? "SAR" : (data.currency || settings?.currency || "AED"),
      companyTaxNumber: isKsa 
        ? (settings?.saudiTaxNumber || "300000000000003") 
        : (settings?.uaeTaxNumber || settings?.taxNumber || "100458920100003"),
      zatcaQrCode: qrCodeDataUrl || data.zatcaQrCode || "",
      clientTaxNumber: data.clientTaxNumber || "",
      createdAt: data.createdAt || now,
      updatedAt: now
    };
    await saveQuotation(updatedDoc);

    // If quotation is approved, check and auto-create contract
    if (updatedDoc.status === 'approved') {
      try {
        const existingContracts = await getAllContracts();
        const alreadyHasContract = existingContracts.some(c => c.quotationId === updatedDoc.id);
        
        if (!alreadyHasContract) {
          const randomNo = "C" + String(Math.floor(Math.random() * 90000) + 10000);
          
          const itemLines = updatedDoc.items.map(
            (item, i) => `${i + 1} - ${item.description.split('\n')[0]} (الكمية: ${item.qty} ${item.unit})`
          ).join('\n');

          const isCctvOnly = updatedDoc.items.every(item => 
            item.description.toLowerCase().includes('cctv') || 
            item.description.toLowerCase().includes('camera') || 
            item.description.includes('كاميرا')
          );
          const isSmartOnly = updatedDoc.items.every(item => 
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
              content: `1 - يتعهد الطرف الثاني بتوريد وتركيب وتشغيل نظام متكامل في موقع الطرف الأول وفقًا لعرض السعر رقم (${updatedDoc.quotationNo}) والبنود المذكورة أدناه:
${itemLines}
2 - يقوم الطرف الثاني بتدريب الطرف الأول أو من يرشحه على كيفية تشغيل النظام وإعداداته.
3 - يقوم الطرف الثانى بضبط زوايا الرؤية، إعدادات التشغيل، وكشف الحركة والبرمجة بما يتوافق مع متطلبات العميل.
4 - يقوم الطرف الثانى بتوصيل وتهيئة الأجهزة بالشبكة الداخلية أو الإنترنت وضمان التشغيل الكامل للنظام.`
            },
            {
              title: "البند الثاني: التكاليف وطريقة الدفع",
              content: `1. التكلفة الإجمالية:
تبلغ قيمة العقد الإجمالية (${updatedDoc.total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} درهم إماراتي) شاملة توريد المعدات والتركيب والتشغيل.
2. جدول الدفع:
- 30% مقدّم عند توقيع العقد.
- 30% بعد توريد المعدات.
- 30% بعد إتمام التركيب.
- 10% عند تجربة النظام والتشغيل بنجاح.
3. الضرائب والرسوم:
يتحمل الطرف الأول أية ضرائب أو رسوم حكومية أو بلدية تتعلق بتنفيذ العقد.`
            },
            {
              title: "البند الثالث: الضمان والصيانة",
              content: `1. مدة الضمان:
يضمن الطرف الثاني المعدات لمدة 3 سنوات من تاريخ التسليم النهائي.
2. شروط الضمان:
يشمل الضمان إصلاح أو استبدال أي قطعة بها عيب مصنعي دون أي تكلفة إضافية.
3. خدمات ما بعد البيع:
يقدم الطرف الثاني خدمات الصيانة الدورية عند الطلب، مقابل رسوم يتم الاتفاق عليها لاحقًا (إن وجدت).`
            },
            {
              title: "البند الرابع: مدة العقد",
              content: `1. مدة التنفيذ:
مدة تنفيذ الأعمال هي 4 شهور تبدأ من تاريخ استلام الدفعة المقدمة أو أمر المباشرة بالعمل.
2. مدة الضمان:
تسري فترة الضمان بعد التسليم النهائي.
3. التجديد:
يجوز للطرفين تجديد العقد بناءً على اتفاق خطي بينهما.`
            },
            {
              title: "البند الخامس: التزامات الأطراف",
              content: `التزامات الشركة (الطرف الثاني):
- توريد معدات جديدة وأصلية مطابقة للمواصفات.
- تنفيذ التركيب من خلال فنيين مختصين.
- تسليم النظام بعد التشغيل الكامل والتأكد من كفاءة الأداء.
- تقديم التدريب والدعم الفني اللازم.

التزامات العميل (الطرف الأول):
- تهيئة موقع التركيب وتوفير مصادر الكهرباء والإنترنت.
- تسهيل دخول الفنيين إلى الموقع في أوقات العمل.
- الالتزام بسداد الدفعات في المواعيد المحددة.`
            },
            {
              title: "البند السادس: شروط الإنهاء",
              content: `1. يحق لأي طرف إنهاء العقد إذا أخل الطرف الآخر بأي من التزاماته بعد إشعاره خطيًا ومنحه مهلة (7) أيام لتصحيح الوضع.
2. في حال الإلغاء قبل بدء التنفيذ، يتم خصم التكاليف الفعلية التي تكبدها الطرف الثاني.
3. في حال الإنهاء بعد التنفيذ، لا يحق للطرف الأول استرداد المبالغ المدفوعة عن الأعمال المنجزة.`
            },
            {
              title: "البند السابع: المسؤولية وخصوصية البيانات",
              content: `1. حدود المسؤولية:
لا يتحمل الطرف الثاني أي مسؤولية عن سوء استخدام النظام من قبل العميل أو أطراف أخرى.
2. خصوصية البيانات:
يتعهد الطرف الثاني بالمحافظة على سرية جميع التسجيلات والبيانات، وعدم الاطلاع عليها أو نسخها أو مشاركتها إلا بإذن خطي من الطرف الأول.`
            },
            {
              title: "البند الثامن: القانون الواجب التطبيق وحل النزاعات",
              content: `يخضع هذا العقد لأحكام القوانين السارية في دولة الإمارات العربية المتحدة.
فى حال نشوء أي نزاع، يتم حله وديًا، وإذا تعذر ذلك، يُحال إلى الجهات القضائية المختصة في الدولة.`
            },
            {
              title: "البند التاسع: الموقع والتوقيع",
              content: `حرر هذا العقد في إمارة دبى بتاريخ ${new Date().toLocaleDateString("en-GB")} من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها.`
            }
          ];

          const newContract = {
            id: `contract-${Date.now()}`,
            contractNo: randomNo,
            date: new Date().toLocaleDateString("en-GB"),
            location: "دبى",
            title: generatedTitle,
            firstPartyName: updatedDoc.clientName,
            firstPartyPhone: updatedDoc.contactNo || "",
            firstPartyAddress: updatedDoc.locationArea || "",
            secondPartyName: updatedDoc.companyName || "رواد سمارت للخدمات الفنية ذ.م.م",
            secondPartyAddress: updatedDoc.companyAddress || "الخليج التجاري - برج تشرشل، مكتب 404 - الطابق 4، دبي، الإمارات العربية المتحدة",
            secondPartyPhone: "+971 552067179",
            totalCost: updatedDoc.total,
            totalCostWords: "",
            clauses: contractClauses,
            firstPartySignName: "",
            firstPartySignDate: new Date().toLocaleDateString("en-GB"),
            secondPartySignName: "",
            secondPartySignDate: new Date().toLocaleDateString("en-GB"),
            createdAt: now,
            updatedAt: now,
            quotationId: updatedDoc.id
          };

          await saveContract(newContract);
        }
      } catch (contractErr) {
        console.error("Failed to auto-generate contract:", contractErr);
      }
    }
    return documentId;
  };

  const onSubmit = async (data: Quotation) => {
    setSaving(true);
    try {
      await saveDocHelper(data);
      router.refresh();
      alert(language === "ar" ? "تم حفظ عرض السعر بنجاح!" : "Quotation saved successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error saving quotation:", error);
      alert(language === "ar" ? "فشل حفظ عرض السعر." : "Failed to save quotation.");
    } finally {
      setSaving(false);
    }
  };

  // Create a tiny canvas-based oklch→rgb converter
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

  // Patch all style tags and element inline styles in a cloned document
  const patchDocumentColors = (doc: Document) => {
    const toRgb = makeColorConverter(doc);
    doc.querySelectorAll("style").forEach((styleEl) => {
      if (!styleEl.textContent) return;
      if (
        styleEl.textContent.includes("oklch") ||
        styleEl.textContent.includes("oklab") ||
        styleEl.textContent.includes("lab(")
      ) {
        styleEl.textContent = styleEl.textContent
          .replace(/oklch\([^)]+\)/g, (m) => toRgb(m))
          .replace(/oklab\([^)]+\)/g, (m) => toRgb(m))
          .replace(/\blab\([^)]+\)/g, (m) => toRgb(m));
      }
    });
    // Remove external link stylesheets so html2canvas never encounters un-parsed oklab/oklch rules
    doc.querySelectorAll("link[rel='stylesheet'], link[as='style']").forEach((l) => l.remove());
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
      "text-align", "text-decoration", "direction",
      "color", "background-color", "background-image", "background-position", "background-size", "background-repeat",
      "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
      "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
      "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
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

        // Convert any oklch / oklab / lab colors to rgb
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
    clone.style.setProperty("height", "297mm", "important");
    clone.style.setProperty("min-height", "297mm", "important");
    clone.style.setProperty("zoom", "1", "important");
    clone.style.setProperty("transform", "none", "important");
    document.body.appendChild(clone);

    // Save original styles and force desktop print size temporarily
    const originalCssText = element.style.cssText;
    element.style.setProperty("position", "fixed", "important");
    element.style.setProperty("z-index", "99999", "important");
    element.style.setProperty("top", "0", "important");
    element.style.setProperty("left", "0", "important");
    element.style.setProperty("width", "210mm", "important");
    element.style.setProperty("min-width", "210mm", "important");
    element.style.setProperty("transform", "none", "important");
    element.style.setProperty("zoom", "1", "important");

    // Force layout reflow
    const _reflow = element.offsetHeight;

    bakeElementStyles(element, clone);

    // Restore original styles
    element.style.cssText = originalCssText;

    await new Promise((resolve) => setTimeout(resolve, 150));
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

  // Generate PDF from DOM
  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!page1Ref.current) return null;
    
    setExporting(true);
    document.body.classList.add("pdf-generating");
    try {
      const canvas = await captureElementAsCanvas(page1Ref.current);
      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      return pdf;
    } catch (error) {
      console.error("PDF generation failed:", error);
      return null;
    } finally {
      document.body.classList.remove("pdf-generating");
      setExporting(false);
    }
  };

  const generateCompanyPDF = async (): Promise<jsPDF | null> => {
    if (!companyPageRef.current) return null;
    setExporting(true);
    document.body.classList.add("pdf-generating");
    try {
      const canvas = await captureElementAsCanvas(companyPageRef.current);
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      return pdf;
    } catch (error) {
      console.error("Company PDF generation failed:", error);
      return null;
    } finally {
      document.body.classList.remove("pdf-generating");
      setExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      const docId = await saveDocHelper(formValues);
      const targetId = (!id || id === "new" || id === "undefined") ? docId : id;
      window.open(`/quotation/${targetId}?print=true${isInvoiceMode ? "&view=invoice" : ""}`, "_blank");
    } catch (error) {
      console.error("Print trigger failed:", error);
      window.print();
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadCompanyPDF = async () => {
    setExporting(true);
    try {
      const docId = await saveDocHelper(formValues);
      const targetId = (!id || id === "new" || id === "undefined") ? docId : id;
      window.open(`/quotation/${targetId}?print=true&version=company`, "_blank");
    } catch (error) {
      console.error("Print trigger failed:", error);
      window.print();
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    if (isPrintMode) {
      window.print();
    } else {
      setExporting(true);
      try {
        const docId = await saveDocHelper(formValues);
        const targetId = (!id || id === "new" || id === "undefined") ? docId : id;
        window.open(`/quotation/${targetId}?print=true${isInvoiceMode ? "&view=invoice" : ""}`, "_blank");
      } catch (error) {
        console.error("Print trigger failed:", error);
        window.print();
      } finally {
        setExporting(false);
      }
    }
  };

  const handleShare = async () => {
    const pdf = await generatePDF();
    if (!pdf) {
      alert("Could not generate PDF for sharing.");
      return;
    }
    
    try {
      const qNo = watch("quotationNo") || "Document";
      const prefix = isInvoiceMode ? "Invoice" : "Quotation";
      const blob = pdf.output("blob");
      const file = new File([blob], `Ruaad_${prefix}_${qNo}.pdf`, { type: "application/pdf" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ruaad ${prefix} ${qNo}`,
          text: `Please find attached our ${prefix.toLowerCase()} ${qNo} from Ruaad Smart.`
        });
      } else {
        handleDownloadPDF();
      }
    } catch (error) {
      console.error("Sharing failed:", error);
      handleDownloadPDF();
    }
  };

  const formValues = watch();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
        <p className="text-slate-600 mt-2 text-sm font-medium">جاري تحميل عرض السعر...</p>
      </div>
    );
  }

  if (isPrintMode) {
    const showCompany = versionParam === 'company' && canViewCostAndProfit;
    return (
      <div className="bg-slate-100 min-h-screen flex flex-col items-center justify-start p-0 m-0 w-full" style={{ direction: "ltr" }}>
        {/* Floating Print Action Bar (Hidden when printing) */}
        <div className="no-print w-full bg-white border-b border-slate-200 text-slate-800 py-3 px-4 sm:px-8 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 p-1 flex items-center justify-center border border-slate-200">
              <img src="/logo.png" alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-purple-900">
                {showCompany ? "رواد سمارت - سند التكاليف والأرباح" : (isInvoiceMode ? "رواد سمارت - فاتورة" : "رواد سمارت - عرض سعر")}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                لحفظ المستند كملف PDF عالي الدقة، اختر "حفظ بتنسيق PDF" (Save as PDF) من نافذة الطباعة.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg border border-purple-800 shadow-xs flex items-center gap-2 text-xs transition hover:scale-[1.02] cursor-pointer"
            >
              <Printer className="w-4 h-4 text-purple-200" />
              <span>طباعة / حفظ بتنسيق PDF</span>
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium rounded-lg text-xs transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
        {showCompany ? (
          <div 
            ref={companyPageRef}
            id="company-costing-page"
            dir="ltr"
            className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] bg-white text-zinc-900 p-[15mm] flex flex-col gap-6 relative text-xs select-none text-left"
            style={{ boxSizing: "border-box", direction: "ltr" }}
          >
            <div>
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-[2px] border-zinc-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center bg-white">
                    <img 
                      src={settings?.logoBase64 || "/logo.png"} 
                      alt="Ruaad Logo" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#581C87] font-sans m-0 leading-tight">RUAAD SMART</h2>
                    <p className="text-[9px] text-zinc-500 m-0 tracking-wider">INTERNAL COSTING & PROFIT SHEET</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="bg-zinc-800 text-white px-4 py-1.5 rounded font-bold text-sm tracking-wider inline-block">
                    INTERNAL USE ONLY
                  </div>
                  <p className="text-[9px] text-red-500 font-bold mt-1 m-0">سند التكاليف والأرباح الداخلية للشركة</p>
                </div>
              </div>

              {/* Quotation Identity Info */}
              <div className="grid grid-cols-4 border border-zinc-200 mt-4 text-[10px]">
                <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#581C87]">Quotation No.</div>
                <div className="p-2 border-r border-b border-zinc-200 font-mono font-bold text-zinc-700">{formValues.quotationNo}</div>
                <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#581C87]">Date</div>
                <div className="p-2 border-b border-zinc-200 text-zinc-700">{formValues.date}</div>

                <div className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#581C87]">Client Name</div>
                <div className="p-2 border-r border-zinc-200 text-zinc-800 font-semibold col-span-3">{formValues.clientName || "-"}</div>
              </div>

              {/* Cost & Profit Margin Analysis Card */}
              <div className="mt-4 grid grid-cols-3 gap-4 border border-zinc-200 rounded-lg p-4" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                <div className="text-center p-2 border-r border-zinc-200">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px] mb-1">Total Client Price (Revenue)</span>
                  <span className="text-zinc-900 font-extrabold text-sm font-mono">{totalRevenue.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED</span>
                  {watchedDiscount > 0 && (
                    <span className="block text-[7px] text-zinc-400 font-bold mt-0.5">(Discount: {watchedDiscount}% / -{(subtotal * (watchedDiscount / 100)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED)</span>
                  )}
                </div>
                <div className="text-center p-2 border-r border-zinc-200">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px] mb-1">Total Cost Price</span>
                  <span className="text-zinc-900 font-extrabold text-sm font-mono">{totalCost.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED</span>
                </div>
                <div className="text-center p-2">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px] mb-1">Expected Profit Margin</span>
                  <span className={`font-extrabold text-sm font-mono ${profitMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {profitMargin.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED <br/>
                    <span className="text-[10px] opacity-80">({marginPercentage.toFixed(1)}%)</span>
                  </span>
                </div>
              </div>

              {/* Cost Breakdown Table */}
              <div className="mt-4">
                <p className="font-bold text-zinc-800 mb-2 text-[10px] uppercase tracking-wider">Cost breakdown per line item:</p>
                <table className="w-full border border-zinc-200 text-[9px] text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-800 text-white font-bold text-[9px]">
                      <th className="p-2 w-8 text-center border-r border-zinc-700 font-bold">#</th>
                      <th className="p-2 border-r border-zinc-700 font-bold">Description</th>
                      <th className="p-2 w-12 text-center border-r border-zinc-700 font-bold">Qty</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Unit Cost (AED)</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Total Cost (AED)</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Unit Price (AED)</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Total Price (AED)</th>
                      <th className="p-2 w-20 text-right font-bold">Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.items.map((item, idx) => {
                      const itemCost = (item.cost || 0) * (item.qty || 0);
                      const itemRevenue = (item.unitPrice || 0) * (item.qty || 0);
                      const itemProfit = itemRevenue - itemCost;
                      const itemProfitPercent = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0;
                      
                      return (
                        <tr key={item.id || idx} className="border-b border-zinc-200 hover:bg-zinc-50/25">
                          <td className="p-2 text-center border-r border-zinc-200 font-semibold text-zinc-500">{idx + 1}</td>
                          <td className="p-2 border-r border-zinc-200 text-zinc-800 leading-normal truncate max-w-[150px]">
                            {item.description ? item.description.split("\n")[0] : "-"}
                          </td>
                          <td className="p-2 text-center border-r border-zinc-200 text-zinc-700">{item.qty || 0}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-600 font-mono">{(item.cost || 0).toLocaleString()}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-700 font-mono">{itemCost.toLocaleString()}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-600 font-mono">{(item.unitPrice || 0).toLocaleString()}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-700 font-mono">{itemRevenue.toLocaleString()}</td>
                          <td className={`p-2 text-right font-bold font-mono ${itemProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {itemProfit.toLocaleString()} <span className="text-[8px] font-normal">({itemProfitPercent.toFixed(0)}%)</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Attached Invoices */}
              {watchedInvoices.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold text-zinc-800 mb-2 text-[10px] uppercase tracking-wider">Attached Purchase Invoices / فواتير الشراء المرفقة:</p>
                  <table className="w-full border border-zinc-200 text-[9px] text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-zinc-700 font-bold">
                        <th className="p-2 border-r border-zinc-200 font-bold">Invoice File Name</th>
                        <th className="p-2 border-r border-zinc-200 text-center font-bold">Type</th>
                        <th className="p-2 text-center font-bold">Uploaded At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchedInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-zinc-200">
                          <td className="p-2 border-r border-zinc-200 font-medium text-zinc-800">{inv.name}</td>
                          <td className="p-2 border-r border-zinc-200 text-center text-zinc-500">{inv.fileType.split("/")[1]?.toUpperCase() || "PDF"}</td>
                          <td className="p-2 text-center text-zinc-500">{inv.uploadedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Verification Footer Statement */}
            <div className="border-t border-zinc-200 pt-4 text-center mt-auto">
              <p className="italic text-zinc-400 text-[8px] m-0">
                Confidential Document. For internal accounting and profit audit purposes only.
              </p>
            </div>
          </div>
        ) : (
          <div 
            ref={page1Ref}
            id="quotation-page-1"
            dir="ltr"
            className="w-[210mm] min-h-[297mm] h-auto bg-white text-zinc-900 p-[12mm] flex flex-col justify-start gap-3 relative text-xs select-none text-left print-area"
            style={{ boxSizing: "border-box", direction: "ltr" }}
          >
            <div>
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-[2px] border-[#581C87] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-white">
                    <img 
                      src={settings?.logoBase64 || "/logo.png"} 
                      alt="Ruaad Logo" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#581C87] font-sans m-0 leading-tight">RUAAD SMART</h2>
                    <p className="text-[8px] text-zinc-500 m-0 tracking-wider">RUAAD SMART MACHINE TRADING LLC</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-white px-3 py-1 rounded font-bold text-xs tracking-wider inline-block ${
                    isInvoiceMode 
                      ? (isTaxInvoice ? "bg-[#581C87]" : "bg-emerald-700") 
                      : "bg-[#581C87]"
                  }`}>
                    {isInvoiceMode 
                      ? (isTaxInvoice ? (language === "ar" ? "فاتورة ضريبية معتمدة" : "TAX INVOICE") : (language === "ar" ? "فاتورة عادية / بيان أسعار" : "STANDARD INVOICE / STATEMENT")) 
                      : (language === "ar" ? "عرض سعر رسمي" : "QUOTATION")}
                  </div>
                  <p className="text-[8px] text-zinc-500 mt-0.5 m-0">
                    {isInvoiceMode 
                      ? (isTaxInvoice ? (language === "ar" ? "خاضعة لضريبة القيمة المضافة 5%" : "Subject to 5% UAE VAT") : (language === "ar" ? "بيان حساب ومطالبة مالية" : "Statement of Account / Bill")) 
                      : "Engineering & Technical Services"}
                  </p>
                </div>
              </div>

              {/* Metadata Grid Table */}
              <table className="w-full border border-zinc-200 mt-2 text-[9px] border-collapse" style={{ tableLayout: "fixed" }}>
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>{isInvoiceMode ? t("invoiceNo") : "Quotation No."}</td>
                    <td className="p-1.5 border-r border-zinc-200 font-mono font-bold text-zinc-700" style={{ width: "25%" }}>{formValues.quotationNo}</td>
                    <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>{isInvoiceMode ? "Invoice Date" : "Date"}</td>
                    <td className="p-1.5 text-zinc-700" style={{ width: "25%" }}>{formValues.date}</td>
                  </tr>
                  <tr>
                    <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>{isInvoiceMode ? "Due Date" : "Valid Until"}</td>
                    <td className="p-1.5 border-r border-zinc-200 text-zinc-700" style={{ width: "25%" }}>{formValues.validUntil}</td>
                    <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Prepared By</td>
                    <td className="p-1.5 text-zinc-700" style={{ width: "25%" }}>{formValues.preparedBy}</td>
                  </tr>
                </tbody>
              </table>

              {/* Client Info Grid Table */}
              <div className="mt-2">
                <div className={`font-bold px-2 py-0.5 text-[9px] tracking-wider rounded-t border-t border-l border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ backgroundColor: isInvoiceMode ? "rgba(88, 28, 135, 0.08)" : "rgba(88, 28, 135, 0.08)" }}>
                  CLIENT INFORMATION
                </div>
                <table className="w-full border border-zinc-200 text-[9px] border-collapse" style={{ tableLayout: "fixed" }}>
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Client Name</td>
                      <td colSpan={3} className="p-1.5 font-semibold text-zinc-800" style={{ width: "75%" }}>{formValues.clientName || "-"}</td>
                    </tr>
                    {isTaxInvoice && (
                      <tr className="border-b border-zinc-200">
                        <td className="bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 text-[#581C87]" style={{ width: "25%" }}>Client VAT No.</td>
                        <td colSpan={3} className="p-1.5 font-mono font-bold text-zinc-800" style={{ width: "75%" }}>{formValues.clientTaxNumber || "N/A"}</td>
                      </tr>
                    )}
                    <tr className="border-b border-zinc-200">
                      <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Email</td>
                      <td className="p-1.5 border-r border-zinc-200 text-zinc-700" style={{ width: "25%" }}>{formValues.email || "-"}</td>
                      <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Contact No.</td>
                      <td className="p-1.5 text-zinc-700" style={{ width: "25%" }}>{formValues.contactNo || "-"}</td>
                    </tr>
                    <tr>
                      <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Project Reference</td>
                      <td className="p-1.5 border-r border-zinc-200 text-zinc-700 break-words" style={{ width: "25%" }}>{formValues.projectReference || "-"}</td>
                      <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Location / Area</td>
                      <td className="p-1.5 text-zinc-700 break-words" style={{ width: "25%" }}>{formValues.locationArea || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Items Table */}
              <div className="mt-2">
                <table className="w-full border border-zinc-200 text-[8.5px] text-left border-collapse" style={{ tableLayout: "fixed", width: "100%" }}>
                  <colgroup>
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "55%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <thead>
                    <tr className={`text-white font-bold text-[8.5px] ${isInvoiceMode ? "bg-[#581C87]" : "bg-[#581C87]"}`}>
                      <th className={`p-1 text-center border-r ${isInvoiceMode ? "border-purple-800" : "border-purple-800"}`} style={{ width: "5%" }}>#</th>
                      <th className={`p-1 border-r ${isInvoiceMode ? "border-purple-800" : "border-purple-800"}`} style={{ width: "55%" }}>Description / Scope of Work</th>
                      <th className={`p-1 text-center border-r ${isInvoiceMode ? "border-purple-800" : "border-purple-800"}`} style={{ width: "10%" }}>Qty</th>
                      <th className={`p-1 text-right border-r ${isInvoiceMode ? "border-purple-800" : "border-purple-800"}`} style={{ width: "15%" }}>Unit Price (AED)</th>
                      <th className="p-1 text-right" style={{ width: "15%" }}>Total (AED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-zinc-200 hover:bg-zinc-50/40">
                        <td className="p-1 text-center border-r border-zinc-200 font-semibold text-zinc-500">{idx + 1}</td>
                        <td className="p-1 border-r border-zinc-200 text-zinc-800 leading-tight whitespace-pre-line font-medium break-words">
                          {item.description || "No description"}
                        </td>
                        <td className="p-1 text-center border-r border-zinc-200 text-zinc-700">
                          {item.qty ? Number(item.qty).toFixed(2) : "0.00"} {item.unit || "Units"}
                        </td>
                        <td className="p-1 text-right border-r border-zinc-200 text-zinc-700 font-mono">
                          {item.unitPrice ? Number(item.unitPrice).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"}
                        </td>
                        <td className="p-1 text-right text-zinc-900 font-bold font-mono">
                          {((item.qty || 0) * (item.unitPrice || 0)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                        </td>
                      </tr>
                    ))}

                    {/* Subtotal, Discount, VAT, TOTAL Rows */}
                    <tr className="totals-block font-bold text-zinc-700 border-t border-zinc-200" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                      <td colSpan={3} className="p-1 border-r border-zinc-200">&nbsp;</td>
                      <td className={`p-1 text-right border-r border-zinc-200 font-bold ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`}>
                        {isTaxInvoice ? (language === "ar" ? "المجموع الفرعي (غير شامل الضريبة):" : "Subtotal (Excl. VAT):") : "Subtotal:"}
                      </td>
                      <td className="p-1 text-right font-mono font-bold text-zinc-800">
                        {subtotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                      </td>
                    </tr>
                    {watchedDiscount > 0 && (
                      <tr className="totals-block font-bold text-zinc-650 border-t border-zinc-200" style={{ backgroundColor: "rgba(254, 242, 242, 0.5)" }}>
                        <td colSpan={3} className="p-1 border-r border-zinc-200">&nbsp;</td>
                        <td className="p-1 text-right border-r border-zinc-200 text-red-650">
                          {language === "ar" ? `الخصم (${watchedDiscount}%):` : `Discount (${watchedDiscount}%):`}
                        </td>
                        <td className="p-1 text-right font-mono font-bold text-red-650">
                          -{(subtotal * (watchedDiscount / 100)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} {currency}
                        </td>
                      </tr>
                    )}
                    {isTaxInvoice && (
                      <>
                        <tr className="totals-block font-bold text-zinc-750 border-t border-zinc-200" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                          <td colSpan={3} className="p-1 border-r border-zinc-200">&nbsp;</td>
                          <td className="p-1 text-right border-r border-zinc-200 text-[#581C87] font-bold">
                            {language === "ar" ? "الوعاء الضريبي:" : "Taxable Amount:"}
                          </td>
                          <td className="p-1 text-right font-mono font-bold text-zinc-800">
                            {beforeTaxTotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })} {currency}
                          </td>
                        </tr>
                        <tr className="totals-block font-bold text-zinc-750 border-t border-zinc-200" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                          <td colSpan={3} className="p-1 border-r border-zinc-200">&nbsp;</td>
                          <td className="p-1 text-right border-r border-zinc-200 text-[#581C87] font-bold">
                            {language === "ar" 
                              ? (watchedTaxJurisdiction === "KSA" ? `ضريبة القيمة المضافة (15% زاتكا):` : `ضريبة القيمة المضافة (5% FTA):`) 
                              : `VAT (${taxRate}%):`}
                          </td>
                          <td className="p-1 text-right font-mono font-bold text-zinc-800">
                            {taxAmount.toLocaleString("en-AE", { minimumFractionDigits: 2 })} {currency}
                          </td>
                        </tr>
                      </>
                    )}
                    <tr className="totals-block font-bold text-zinc-900" style={{ backgroundColor: isInvoiceMode ? "rgba(88, 28, 135, 0.05)" : "rgba(88, 28, 135, 0.05)" }}>
                      <td colSpan={3} className="p-1 border-r border-zinc-200">&nbsp;</td>
                      <td className={`p-1 text-right border-r border-zinc-200 text-[10px] font-bold ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`}>
                        {isTaxInvoice ? (language === "ar" ? "الإجمالي شامل الضريبة:" : "TOTAL (Incl. VAT):") : "TOTAL:"}
                      </td>
                      <td className={`p-1 text-right font-mono text-[10px] font-bold ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`}>
                        {total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} {currency}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms and Conditions Section */}
              <div className="terms-block mt-2 border border-zinc-200 rounded">
                <div className={`px-2 py-0.5 font-bold text-[9px] border-b border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ backgroundColor: "rgba(250, 250, 250, 0.8)" }}>
                  TERMS & CONDITIONS
                </div>
                <table className="w-full border-collapse text-[8.5px]" style={{ tableLayout: "fixed", width: "100%" }}>
                  <colgroup>
                    <col style={{ width: "50%" }} />
                    <col style={{ width: "50%" }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="p-1.5 border-r border-zinc-200 align-top">
                        <span className="font-bold text-zinc-500">Payment terms: </span>
                        <span className="text-zinc-800 font-semibold">{formValues.paymentTerms || "Immediate Payment"}</span>
                      </td>
                      <td className="p-1.5 align-top">
                        <span className="font-bold text-zinc-500">Terms & Conditions: </span>
                        <a href={formValues.termsConditions} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline text-[8.5px]">
                          {formValues.termsConditions}
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signature Blocks */}
              <table className="signature-block w-full mt-2 border border-zinc-200 text-[8.5px] border-collapse relative" style={{ tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                  <col style={{ width: isTaxInvoice ? "40%" : "50%" }} />
                  {isTaxInvoice && <col style={{ width: "20%" }} />}
                  <col style={{ width: isTaxInvoice ? "40%" : "50%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="p-2 border-r border-zinc-200 min-h-[75px] relative align-top" style={{ verticalAlign: "top" }}>
                      <div className={`font-bold border-b border-zinc-100 pb-0.5 uppercase tracking-wider ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`}>
                        Prepared & Approved By ({formValues.companyName || "RUAAD SMART"})
                      </div>
                      
                      {/* Official Stamp Overlay */}
                      <div className="absolute bottom-1 right-6 w-20 h-20 opacity-90 mix-blend-multiply pointer-events-none flex items-center justify-center -rotate-6">
                        <img 
                          src={settings?.stampBase64 || "/stamp.png"} 
                          alt="Ruaad Stamp" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      
                      <div className="pt-4 text-zinc-700 space-y-0.5 relative z-10">
                        <div><span className="font-bold text-zinc-400">Name:</span> {formValues.preparedByName || "mostafa"}</div>
                        <div><span className="font-bold text-zinc-400">Date:</span> {formValues.preparedByDate}</div>
                      </div>
                    </td>

                    {isTaxInvoice && (
                      <td className="p-2 border-r border-zinc-200 min-h-[75px] align-top text-center" style={{ verticalAlign: "top" }}>
                        <div className="flex flex-col items-center justify-center h-full gap-1 pt-1">
                          {qrCodeDataUrl ? (
                            <img src={qrCodeDataUrl} alt="ZATCA / FTA QR Code" className="w-14 h-14 border border-zinc-200 p-0.5 bg-white shadow-2xs" />
                          ) : (
                            <div className="w-14 h-14 border border-zinc-200 bg-slate-50 flex items-center justify-center text-[7px] text-zinc-400">
                              QR Code
                            </div>
                          )}
                          <span className="text-[6px] text-zinc-500 font-sans tracking-tight font-semibold">
                            {watchedTaxJurisdiction === "KSA" ? "ZATCA TLV QR (زاتكا)" : "FTA Electronic QR"}
                          </span>
                        </div>
                      </td>
                    )}

                    <td className="p-2 min-h-[75px] align-top" style={{ verticalAlign: "top" }}>
                      <div className={`font-bold border-b border-zinc-100 pb-0.5 uppercase tracking-wider ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`}>
                        Client Acceptance
                      </div>
                      
                      <div className="border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-6 mb-1" />
                      <div className="text-zinc-700 space-y-0.5 pt-1">
                        <div><span className="font-bold text-zinc-400">Name:</span> {formValues.clientAcceptanceName || "..................................................."}</div>
                        <div><span className="font-bold text-zinc-400">Date:</span> {formValues.clientAcceptanceDate || "..................................................."}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Company & Bank Details */}
              <div className="bank-details-block border border-zinc-200 mt-2 text-[8.5px] rounded overflow-hidden">
                <div className={`font-bold px-2 py-0.5 border-b border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ backgroundColor: isInvoiceMode ? "rgba(88, 28, 135, 0.08)" : "rgba(88, 28, 135, 0.08)" }}>
                  COMPANY & BANK DETAILS
                </div>
                <div className="flex w-full border-b border-zinc-150">
                  <div className="w-[50%] p-1 border-r border-zinc-200">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Company Name</span>
                    <span className="text-zinc-800 font-semibold text-[8.5px] leading-tight">{formValues.companyName || "RUAAD SMART SMART MACHINE TRADING LLC"}</span>
                  </div>
                  <div className="w-[50%] p-1">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Bank Name & BIC</span>
                    <span className="text-zinc-800 font-semibold text-[8.5px] leading-tight">{formValues.bankName || "Abu Dhabi Commercial Bank"} - {formValues.bankBic || "ADCBAEAA"}</span>
                  </div>
                </div>
                <div className="flex w-full border-b border-zinc-150">
                  <div className="w-[50%] p-1 border-r border-zinc-200">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Company Address</span>
                    <span className="text-zinc-800 font-medium text-[8.5px] leading-tight">{formValues.companyAddress || "Business Bay – Churchill Tower, Office 404 – Floor 4, Dubai, UAE"}</span>
                  </div>
                  <div className="w-[50%] p-1">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">IBAN</span>
                    <span className="text-zinc-900 font-mono font-bold text-[8.5px] tracking-wider leading-tight">{formValues.bankIban || "AE350030014245437920001"}</span>
                  </div>
                </div>
                <div className="flex w-full">
                  <div className="w-[50%] p-1 border-r border-zinc-200">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Email</span>
                    <a href={`mailto:${formValues.companyEmail || "info@ruaadsmart.ae"}`} className="text-blue-600 font-semibold text-[8.5px] leading-tight">{formValues.companyEmail || "info@ruaadsmart.ae"}</a>
                  </div>
                  <div className="w-[50%] p-1">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Bank Address</span>
                    <span className="text-zinc-800 font-medium text-[8.5px] leading-tight">{formValues.bankAddress || "Dubai, UAE"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col main-layout-container">
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print sticky top-0 z-40 shadow-xs">
        {/* Left side: Back & Title */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                {id ? t("editTitle") : t("newQuotation")}
              </h1>
              <p className="text-xs text-slate-500 font-mono">No: {formValues.quotationNo}</p>
            </div>
          </div>
          
          {/* Action buttons on very small mobile screens (hidden on md) */}
          <div className="flex md:hidden items-center gap-1.5">
            <button 
              type="submit" 
              form="quotation-form"
              disabled={saving}
              className="p-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white font-medium transition-all shadow-xs"
              title={t("saveBtn")}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
            <button 
              onClick={previewTab === "company-preview" ? handleDownloadCompanyPDF : handleDownloadPDF}
              disabled={exporting}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 font-medium transition-all shadow-2xs"
              title={t("downloadPdf")}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleShare}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-all shadow-2xs"
              title={t("share")}
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center/Right: Tabs & Desktop Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          {/* Document Type Selector (Visible only in Client Preview mode) */}
          {previewTab === "client-preview" && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto justify-around md:justify-start">
              <button 
                type="button"
                onClick={() => setIsInvoiceMode(false)}
                className={`flex-1 md:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg text-center transition-all ${!isInvoiceMode ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t("quotationMode")}
              </button>
              <button 
                type="button"
                onClick={() => setIsInvoiceMode(true)}
                className={`flex-1 md:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg text-center transition-all ${isInvoiceMode ? "bg-[#581C87] text-white shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t("invoiceMode")}
              </button>
            </div>
          )}

          {/* View Toggle Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto justify-around md:justify-start">
            <button 
              type="button"
              onClick={() => setPreviewTab("edit")}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg text-center transition-all ${previewTab === "edit" ? "bg-white text-purple-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
            >
              {t("formTab")}
            </button>
            <button 
              type="button"
              onClick={() => setPreviewTab("client-preview")}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg text-center transition-all ${previewTab === "client-preview" ? "bg-white text-purple-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
            >
              {t("clientTab")}
            </button>
            {canViewCostAndProfit && (
              <button 
                type="button"
                onClick={() => setPreviewTab("company-preview")}
                className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg text-center transition-all ${previewTab === "company-preview" ? "bg-white text-purple-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                {t("companyTab")}
              </button>
            )}
          </div>

          {/* Desktop/Tablet Action Buttons (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              type="submit" 
              form="quotation-form"
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white font-bold text-xs transition-all hover:scale-[1.02] shadow-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t("saveBtn")}
            </button>
            <button 
              onClick={previewTab === "company-preview" ? handleDownloadCompanyPDF : handleDownloadPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 font-semibold text-xs transition-all shadow-2xs"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {t("downloadPdf")}
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              {t("print")}
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              {t("share")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Split Pane */}
      <div className="flex-1 flex overflow-hidden workspace-split-pane">
        {/* Left Side: Editor Form */}
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 no-print bg-slate-100/60 ${previewTab !== "edit" ? "hidden" : "block"}`}>
          <form id="quotation-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
            
            {/* Quotation Metadata Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">{t("docDetails")}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("quoteNo")}</label>
                  <input 
                    type="text" 
                    {...register("quotationNo", { required: true })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("preparedBy")}</label>
                  <input 
                    type="text" 
                    {...register("preparedBy", { required: true })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("date")}</label>
                  <input 
                    type="text" 
                    {...register("date", { required: true })} 
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("validUntil")}</label>
                  <input 
                    type="text" 
                    {...register("validUntil", { required: true })} 
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("status")}</label>
                  <select 
                    {...register("status")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  >
                    <option value="pending">{t("statusPending")}</option>
                    <option value="approved">{t("statusApproved")}</option>
                    <option value="executed">{t("statusExecuted")}</option>
                    <option value="rejected">{t("statusRejected")}</option>
                    <option value="cancelled">{t("statusCancelled")}</option>
                  </select>
                </div>
              </div>
            </div>

             {/* Client Info Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">{t("clientInfo")}</h2>
              
              <div className="space-y-4 pb-3 border-b border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{language === "ar" ? "نوع الفاتورة والاحتساب:" : "Invoice Type & Calculation:"}</label>
                    <select
                      {...register("invoiceType")}
                      onChange={(e) => {
                        const val = e.target.value as "standard" | "tax";
                        setValue("invoiceType", val);
                        if (val === "tax") {
                          setIsInvoiceMode(true);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-left"
                    >
                      <option value="standard">{language === "ar" ? "📄 بيان أسعار / فاتورة عادية (0% بدون ضريبة)" : "📄 Standard Invoice / Statement (0% Tax)"}</option>
                      <option value="tax">{language === "ar" ? "🧾 فاتورة ضريبية رسمية معتمدة" : "🧾 Official Tax Invoice"}</option>
                    </select>
                  </div>

                  {watch("invoiceType") === "tax" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        {language === "ar" ? "النظام الضريبي للدولة:" : "Tax Jurisdiction:"}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setValue("taxJurisdiction", "UAE");
                            setValue("currency", "AED");
                            setValue("vatRate", 5);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            watchedTaxJurisdiction === "UAE"
                              ? "bg-blue-50 text-blue-900 border-blue-400 ring-2 ring-blue-100"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                          }`}
                        >
                          <span>🇦🇪</span>
                          <span>{language === "ar" ? "الإمارات (5% FTA)" : "UAE (5%)"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setValue("taxJurisdiction", "KSA");
                            setValue("currency", "SAR");
                            setValue("vatRate", 15);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            watchedTaxJurisdiction === "KSA"
                              ? "bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-100"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                          }`}
                        >
                          <span>🇸🇦</span>
                          <span>{language === "ar" ? "السعودية (15% زاتكا)" : "KSA (15%)"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {watch("invoiceType") === "tax" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                      <span>
                        {watchedTaxJurisdiction === "KSA"
                          ? (language === "ar" ? "🇸🇦 الرقم الضريبي للعميل (ZATCA TIN)" : "Client Saudi TIN")
                          : (language === "ar" ? "🇦🇪 رقم التسجيل الضريبي للعميل (UAE TRN)" : "Client UAE TRN")}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {watchedTaxJurisdiction === "KSA" ? "15 رقماً تبدأ وتنتهي بـ 3" : "15 رقماً تبدأ بـ 100"}
                      </span>
                    </label>
                    <input 
                      type="text" 
                      {...register("clientTaxNumber")} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all font-mono"
                      placeholder={watchedTaxJurisdiction === "KSA" ? "300xxxxxxxxxxxx" : "100xxxxxxxxxxxx"}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("clientName")}</label>
                  <input 
                    type="text" 
                    {...register("clientName", { required: true })} 
                    placeholder="e.g. Client / Project Owner Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("contactNo")}</label>
                    <input 
                      type="text" 
                      {...register("contactNo")} 
                      placeholder="e.g. +971 50..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("email")}</label>
                    <input 
                      type="text" 
                      {...register("email")} 
                      placeholder="e.g. info@client.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("locationArea")}</label>
                    <input 
                      type="text" 
                      {...register("locationArea")} 
                      placeholder="e.g. Dubai Marina"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("projectRef")}</label>
                    <input 
                      type="text" 
                      {...register("projectReference")} 
                      placeholder="e.g. Villa Automation"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t("lineItems")}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPriceListOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-all shadow-2xs"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {language === "ar" ? "قائمة الأسعار (68 صنف)" : "Price List (68 items)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => append({
                      id: `item-${Date.now()}-${Math.random()}`,
                      description: "",
                      qty: 1,
                      unit: "Units",
                      unitPrice: 0,
                      cost: 0,
                      total: 0
                    })}
                    className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-800 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" /> {t("addItem")}
                  </button>
                </div>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 relative group hover:border-slate-300 transition-colors">
                  <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {t("description")} #{index + 1}
                    </label>
                    <textarea 
                      {...register(`items.${index}.description` as const, { required: true })}
                      rows={3}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none leading-normal font-mono"
                    />
                  </div>

                  <div className={`grid grid-cols-2 ${canViewCostAndProfit ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-3`}>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("qty")}</label>
                      <input 
                        type="number" 
                        step="any"
                        {...register(`items.${index}.qty` as const, { required: true, valueAsNumber: true })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-purple-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("unit")}</label>
                      <input 
                        type="text" 
                        {...register(`items.${index}.unit` as const)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-purple-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("unitPrice")}</label>
                      <input 
                        type="number" 
                        step="any"
                        {...register(`items.${index}.unitPrice` as const, { required: true, valueAsNumber: true })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-purple-600 outline-none font-mono"
                      />
                    </div>
                    {canViewCostAndProfit && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("costPerUnit")}</label>
                        <input 
                          type="number" 
                          step="any"
                          {...register(`items.${index}.cost` as const, { valueAsNumber: true })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-purple-600 outline-none font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Discount / Totals summary inside editor */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Percent className="w-4 h-4 text-slate-400" />
                    <label className="text-xs font-semibold text-slate-600">{t("discount")}</label>
                  </div>
                  <input 
                    type="number" 
                    step="any"
                    {...register("discount")}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right text-slate-900 focus:bg-white focus:border-purple-600 outline-none font-mono font-bold"
                  />
                </div>

                <div className={`grid ${canViewCostAndProfit ? "grid-cols-3" : "grid-cols-1"} gap-4 text-center`}>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("total")}</span>
                    <span className="text-base font-bold text-slate-900">{totalRevenue.toLocaleString("en-AE", { minimumFractionDigits: 1 })} AED</span>
                  </div>
                  {canViewCostAndProfit && (
                    <>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("totalCost")}</span>
                        <span className="text-base font-bold text-slate-700">{totalCost.toLocaleString("en-AE", { minimumFractionDigits: 1 })} AED</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1 text-emerald-600">{t("profitMargin")}</span>
                        <span className={`text-base font-bold ${profitMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {profitMargin.toLocaleString("en-AE", { minimumFractionDigits: 1 })} AED
                          <span className="block text-xs font-medium text-emerald-600/80 mt-0.5">({marginPercentage.toFixed(0)}%)</span>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Purchase Invoice Attachment Section */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-purple-600" />
                {t("attachInvoices")}
              </h2>
              
              <div className="space-y-4">
                {/* Upload Button */}
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="invoice-upload" className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-purple-400 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Paperclip className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-xs text-slate-600 font-bold">{t("uploadInvoiceBtn")}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG up to 5MB</p>
                    </div>
                    <input 
                      type="file" 
                      id="invoice-upload" 
                      multiple 
                      accept="image/*,application/pdf" 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>

                {/* Uploaded List */}
                {watchedInvoices.length > 0 && (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-200">
                    {watchedInvoices.map((inv) => (
                      <div key={inv.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <div className="truncate pr-4">
                            <p className="font-semibold text-slate-800 truncate">{inv.name}</p>
                            <p className="text-[10px] text-slate-500">{t("uploadedAt")}: {inv.uploadedAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setViewInvoice(inv)}
                            className="p-1 px-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {t("viewFile")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="p-1 px-2.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 font-semibold shadow-2xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t("deleteFile")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Terms and Signatures Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">{t("termsConditions")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("paymentTerms")}</label>
                  <input 
                    type="text" 
                    {...register("paymentTerms")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("termsLink")}</label>
                  <input 
                    type="text" 
                    {...register("termsConditions")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("preparedByName")}</label>
                  <input 
                    type="text" 
                    {...register("preparedByName")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("preparedByDate")}</label>
                  <input 
                    type="text" 
                    {...register("preparedByDate")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Company & Bank Details Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">{t("companyBankDetails")}</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("companyName")}</label>
                    <input 
                      type="text" 
                      {...register("companyName")} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("bankName")}</label>
                    <input 
                      type="text" 
                      {...register("bankName")} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("iban")}</label>
                  <input 
                    type="text" 
                    {...register("bankIban")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">BIC / Swift</label>
                    <input 
                      type="text" 
                      {...register("bankBic")} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bank Address</label>
                    <input 
                      type="text" 
                      {...register("bankAddress")} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("companyAddress")}</label>
                  <input 
                    type="text" 
                    {...register("companyAddress")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t("companyEmail")}</label>
                  <input 
                    type="text" 
                    {...register("companyEmail")} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Side: A4 Live Preview Sheets (Client) */}
        <div className={`bg-slate-200/80 overflow-y-auto p-8 flex flex-col items-center gap-8 border-l border-slate-300 ${
          previewTab === "company-preview" ? "no-print" : "print-area printable-area"
        } ${
          previewTab === "edit" 
            ? "hidden lg:flex lg:w-[48%] xl:w-[45%]" 
            : previewTab === "client-preview" 
              ? "flex-1 flex" 
              : "hidden"
        }`}>
          
          {/* SINGLE DYNAMIC CONTINUOUS SHEET (A4 MIN HEIGHT) */}
          <div 
            ref={page1Ref}
            id="quotation-page-1"
            dir="ltr"
            className="w-[210mm] min-h-[297mm] h-auto bg-white text-zinc-900 shadow-2xl p-[12mm] flex flex-col justify-start gap-3 relative text-xs select-none text-left print-area printable-area"
            style={{ boxSizing: "border-box", direction: "ltr" }}
          >
            <div>
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-[2px] border-[#581C87] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-white">
                    <img 
                      src={settings?.logoBase64 || "/logo.png"} 
                      alt="Ruaad Logo" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#581C87] font-sans m-0 leading-tight">RUAAD SMART</h2>
                    <p className="text-[8px] text-zinc-500 m-0 tracking-wider">RUAAD SMART MACHINE TRADING LLC</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-white px-3 py-1 rounded font-bold text-xs tracking-wider inline-block ${isInvoiceMode ? "bg-[#581C87]" : "bg-[#581C87]"}`}>
                    {isInvoiceMode ? t("invoiceTitle") : "QUOTATION"}
                  </div>
                  <p className="text-[8px] text-zinc-500 mt-0.5 m-0">Engineering & Technical Services</p>
                </div>
              </div>

              {/* Metadata Grid Table */}
              <table className="w-full border border-zinc-200 mt-2 text-[9px] border-collapse" style={{ tableLayout: "fixed" }}>
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>{isInvoiceMode ? t("invoiceNo") : "Quotation No."}</td>
                    <td className="p-1.5 border-r border-zinc-200 font-mono font-bold text-zinc-700" style={{ width: "25%" }}>{formValues.quotationNo}</td>
                    <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>{isInvoiceMode ? "Invoice Date" : "Date"}</td>
                    <td className="p-1.5 text-zinc-700" style={{ width: "25%" }}>{formValues.date}</td>
                  </tr>
                  <tr>
                    <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>{isInvoiceMode ? "Due Date" : "Valid Until"}</td>
                    <td className="p-1.5 border-r border-zinc-200 text-zinc-700" style={{ width: "25%" }}>{formValues.validUntil}</td>
                    <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Prepared By</td>
                    <td className="p-1.5 text-zinc-700" style={{ width: "25%" }}>{formValues.preparedBy}</td>
                  </tr>
                </tbody>
              </table>

              {/* Client Info Grid Table */}
              <div className="mt-2">
                <div className={`font-bold px-2 py-0.5 text-[9px] tracking-wider rounded-t border-t border-l border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ backgroundColor: isInvoiceMode ? "rgba(88, 28, 135, 0.08)" : "rgba(88, 28, 135, 0.08)" }}>
                  CLIENT INFORMATION
                </div>
                <table className="w-full border border-zinc-200 text-[9px] border-collapse" style={{ tableLayout: "fixed" }}>
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Client Name</td>
                      <td colSpan={3} className="p-1.5 font-semibold text-zinc-800" style={{ width: "75%" }}>{formValues.clientName || "-"}</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Email</td>
                      <td className="p-1.5 border-r border-zinc-200 text-zinc-700" style={{ width: "25%" }}>{formValues.email || "-"}</td>
                      <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Contact No.</td>
                      <td className="p-1.5 text-zinc-700" style={{ width: "25%" }}>{formValues.contactNo || "-"}</td>
                    </tr>
                    <tr>
                      <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Project Reference</td>
                      <td className="p-1.5 border-r border-zinc-200 text-zinc-700 break-words" style={{ width: "25%" }}>{formValues.projectReference || "-"}</td>
                      <td className={`bg-zinc-50 p-1.5 font-bold border-r border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "25%" }}>Location / Area</td>
                      <td className="p-1.5 text-zinc-700 break-words" style={{ width: "25%" }}>{formValues.locationArea || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Items Table */}
              <div className="mt-2">
                <table className="w-full border border-zinc-200 text-[8.5px] text-left border-collapse" style={{ tableLayout: "fixed", width: "100%" }}>
                  <colgroup>
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "55%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <thead>
                    <tr className={`text-white font-bold text-[8.5px] ${isInvoiceMode ? "bg-[#581C87]" : "bg-[#581C87]"}`}>
                      <th className={`p-1 text-center border-r ${isInvoiceMode ? "border-purple-800" : "border-purple-800"}`} style={{ width: "5%" }}>#</th>
                      <th className={`p-1 border-r ${isInvoiceMode ? "border-purple-800" : "border-purple-800"}`} style={{ width: "55%" }}>Description / Scope of Work</th>
                      <th className={`p-1 text-center border-r ${isInvoiceMode ? "border-purple-800" : "border-purple-800"}`} style={{ width: "10%" }}>Qty</th>
                      <th className={`p-1 text-right border-r ${isInvoiceMode ? "border-purple-800" : "border-purple-800"}`} style={{ width: "15%" }}>Unit Price (AED)</th>
                      <th className="p-1 text-right" style={{ width: "15%" }}>Total (AED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-zinc-200 hover:bg-zinc-50/40">
                        <td className="p-1 text-center border-r border-zinc-200 font-semibold text-zinc-500" style={{ width: "5%" }}>{idx + 1}</td>
                        <td className="p-1 border-r border-zinc-200 text-zinc-800 leading-tight whitespace-pre-line font-medium break-words" style={{ width: "55%" }}>
                          {item.description || "No description"}
                        </td>
                        <td className="p-1 text-center border-r border-zinc-200 text-zinc-700" style={{ width: "10%" }}>
                          {item.qty ? Number(item.qty).toFixed(2) : "0.00"} {item.unit || "Units"}
                        </td>
                        <td className="p-1 text-right border-r border-zinc-200 text-zinc-700 font-mono" style={{ width: "15%" }}>
                          {item.unitPrice ? Number(item.unitPrice).toLocaleString("en-AE", { minimumFractionDigits: 2 }) : "0.00"}
                        </td>
                        <td className="p-1 text-right text-zinc-900 font-bold font-mono" style={{ width: "15%" }}>
                          {((item.qty || 0) * (item.unitPrice || 0)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                        </td>
                      </tr>
                    ))}

                    {/* Subtotal, Discount, TOTAL Rows */}
                    <tr className="totals-block font-bold text-zinc-700 border-t border-zinc-200" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                      <td colSpan={3} className="p-1 border-r border-zinc-200" style={{ width: "70%" }}>&nbsp;</td>
                      <td className={`p-1 text-right border-r border-zinc-200 font-bold ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "15%" }}>Subtotal:</td>
                      <td className="p-1 text-right font-mono font-bold text-zinc-800" style={{ width: "15%" }}>
                        {subtotal.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                      </td>
                    </tr>
                    {watchedDiscount > 0 && (
                      <tr className="totals-block font-bold text-zinc-650 border-t border-zinc-200" style={{ backgroundColor: "rgba(254, 242, 242, 0.5)" }}>
                        <td colSpan={3} className="p-1 border-r border-zinc-200" style={{ width: "70%" }}>&nbsp;</td>
                        <td className="p-1 text-right border-r border-zinc-200 text-red-650" style={{ width: "15%" }}>Discount ({watchedDiscount}%):</td>
                        <td className="p-1 text-right font-mono font-bold text-red-650" style={{ width: "15%" }}>
                          -{(subtotal * (watchedDiscount / 100)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                        </td>
                      </tr>
                    )}
                    <tr className="totals-block font-bold text-zinc-900" style={{ backgroundColor: isInvoiceMode ? "rgba(88, 28, 135, 0.05)" : "rgba(88, 28, 135, 0.05)" }}>
                      <td colSpan={3} className="p-1 border-r border-zinc-200" style={{ width: "70%" }}>&nbsp;</td>
                      <td className={`p-1 text-right border-r border-zinc-200 text-[10px] font-bold ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "15%" }}>TOTAL:</td>
                      <td className={`p-1 text-right font-mono text-[10px] font-bold ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ width: "15%" }}>
                        {total.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms and Conditions Section */}
              <div className="terms-block mt-2 border border-zinc-200 rounded">
                <div className={`px-2 py-0.5 font-bold text-[9px] border-b border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ backgroundColor: "rgba(250, 250, 250, 0.8)" }}>
                  TERMS & CONDITIONS
                </div>
                <table className="w-full border-collapse text-[8.5px]" style={{ tableLayout: "fixed", width: "100%" }}>
                  <colgroup>
                    <col style={{ width: "50%" }} />
                    <col style={{ width: "50%" }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="p-1.5 border-r border-zinc-200 align-top" style={{ width: "50%" }}>
                        <span className="font-bold text-zinc-500">Payment terms: </span>
                        <span className="text-zinc-800 font-semibold">{formValues.paymentTerms || "Immediate Payment"}</span>
                      </td>
                      <td className="p-1.5 align-top" style={{ width: "50%" }}>
                        <span className="font-bold text-zinc-500">Terms & Conditions: </span>
                        <a href={formValues.termsConditions} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline text-[8.5px]">
                          {formValues.termsConditions}
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signature Blocks */}
              <table className="signature-block w-full mt-2 border border-zinc-200 text-[8.5px] border-collapse relative" style={{ tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                  <col style={{ width: "50%" }} />
                  <col style={{ width: "50%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="w-[50%] p-2 border-r border-zinc-200 min-h-[75px] relative align-top" style={{ width: "50%", verticalAlign: "top" }}>
                      <div className={`font-bold border-b border-zinc-100 pb-0.5 uppercase tracking-wider ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`}>
                        Prepared & Approved By (رواد سمارت)
                      </div>
                      
                      {/* Official Stamp Overlay */}
                      <div className="absolute bottom-1 right-6 w-20 h-20 opacity-90 mix-blend-multiply pointer-events-none flex items-center justify-center -rotate-6">
                        <img 
                          src={settings?.stampBase64 || "/stamp.png"} 
                          alt="Ruaad Stamp" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      
                      <div className="pt-4 text-zinc-700 space-y-0.5 relative z-10">
                        <div><span className="font-bold text-zinc-400">Name:</span> {formValues.preparedByName || "mostafa"}</div>
                        <div><span className="font-bold text-zinc-400">Date:</span> {formValues.preparedByDate}</div>
                      </div>
                    </td>

                    <td className="w-[50%] p-2 min-h-[75px] align-top" style={{ width: "50%", verticalAlign: "top" }}>
                      <div className={`font-bold border-b border-zinc-100 pb-0.5 uppercase tracking-wider ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`}>
                        Client Acceptance
                      </div>
                      
                      <div className="border-b border-dashed border-zinc-300 w-2/3 mx-auto mt-6 mb-1" />
                      <div className="text-zinc-700 space-y-0.5 pt-1">
                        <div><span className="font-bold text-zinc-400">Name:</span> {formValues.clientAcceptanceName || "..................................................."}</div>
                        <div><span className="font-bold text-zinc-400">Date:</span> {formValues.clientAcceptanceDate || "..................................................."}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Company & Bank Details */}
              <div className="bank-details-block border border-zinc-200 mt-2 text-[8.5px] rounded overflow-hidden">
                <div className={`font-bold px-2 py-0.5 border-b border-zinc-200 ${isInvoiceMode ? "text-[#581C87]" : "text-[#581C87]"}`} style={{ backgroundColor: isInvoiceMode ? "rgba(88, 28, 135, 0.08)" : "rgba(88, 28, 135, 0.08)" }}>
                  COMPANY & BANK DETAILS
                </div>
                <div className="flex w-full border-b border-zinc-150">
                  <div className="w-[50%] p-1 border-r border-zinc-200">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Company Name</span>
                    <span className="text-zinc-800 font-semibold text-[8.5px] leading-tight">{formValues.companyName || "RUAAD SMART SMART MACHINE TRADING LLC"}</span>
                  </div>
                  <div className="w-[50%] p-1">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Bank Name & BIC</span>
                    <span className="text-zinc-800 font-semibold text-[8.5px] leading-tight">{formValues.bankName || "Abu Dhabi Commercial Bank"} - {formValues.bankBic || "ADCBAEAA"}</span>
                  </div>
                </div>
                <div className="flex w-full border-b border-zinc-150">
                  <div className="w-[50%] p-1 border-r border-zinc-200">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Company Address</span>
                    <span className="text-zinc-800 font-medium text-[8.5px] leading-tight">{formValues.companyAddress || "Business Bay – Churchill Tower, Office 404 – Floor 4, Dubai, UAE"}</span>
                  </div>
                  <div className="w-[50%] p-1">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">IBAN</span>
                    <span className="text-zinc-900 font-mono font-bold text-[8.5px] tracking-wider leading-tight">{formValues.bankIban || "AE350030014245437920001"}</span>
                  </div>
                </div>
                <div className="flex w-full">
                  <div className="w-[50%] p-1 border-r border-zinc-200">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Email</span>
                    <a href={`mailto:${formValues.companyEmail || "info@ruaadsmart.ae"}`} className="text-blue-600 font-semibold text-[8.5px] leading-tight">{formValues.companyEmail || "info@ruaadsmart.ae"}</a>
                  </div>
                  <div className="w-[50%] p-1">
                    <span className="font-bold text-zinc-400 block uppercase text-[7.5px] mb-0.5">Bank Address</span>
                    <span className="text-zinc-800 font-medium text-[8.5px] leading-tight">{formValues.bankAddress || "Dubai, UAE"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* PAGE 3: COMPANY INTERNAL COSTING SHEET */}
        {canViewCostAndProfit && (
        <div className={`bg-slate-200/80 overflow-y-auto p-8 flex flex-col items-center gap-8 border-l border-slate-300 ${
          previewTab === "company-preview" ? "print-area printable-area" : "no-print"
        } ${
          previewTab === "company-preview" ? "flex-1 flex" : "hidden"
        }`}>
          <div 
            ref={companyPageRef}
            id="company-costing-page"
            dir="ltr"
            className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] bg-white text-zinc-900 shadow-2xl p-[15mm] flex flex-col gap-6 relative text-xs select-none text-left"
            style={{ boxSizing: "border-box", direction: "ltr" }}
          >
            <div>
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-[2px] border-zinc-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center bg-white">
                    <img 
                      src={settings?.logoBase64 || "/logo.png"} 
                      alt="Ruaad Logo" 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#581C87] font-sans m-0 leading-tight">RUAAD SMART</h2>
                    <p className="text-[9px] text-zinc-500 m-0 tracking-wider">INTERNAL COSTING & PROFIT SHEET</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="bg-zinc-800 text-white px-4 py-1.5 rounded font-bold text-sm tracking-wider inline-block">
                    INTERNAL USE ONLY
                  </div>
                  <p className="text-[9px] text-red-500 font-bold mt-1 m-0">سند التكاليف والأرباح الداخلية للشركة</p>
                </div>
              </div>

              {/* Quotation Identity Info */}
              <div className="grid grid-cols-4 border border-zinc-200 mt-4 text-[10px]">
                <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#581C87]">Quotation No.</div>
                <div className="p-2 border-r border-b border-zinc-200 font-mono font-bold text-zinc-700">{formValues.quotationNo}</div>
                <div className="bg-zinc-50 p-2 font-bold border-r border-b border-zinc-200 text-[#581C87]">Date</div>
                <div className="p-2 border-b border-zinc-200 text-zinc-700">{formValues.date}</div>

                <div className="bg-zinc-50 p-2 font-bold border-r border-zinc-200 text-[#581C87]">Client Name</div>
                <div className="p-2 border-r border-zinc-200 text-zinc-800 font-semibold col-span-3">{formValues.clientName || "-"}</div>
              </div>

              {/* Cost & Profit Margin Analysis Card */}
              <div className="mt-4 grid grid-cols-3 gap-4 border border-zinc-200 rounded-lg p-4" style={{ backgroundColor: "rgba(250, 250, 250, 0.5)" }}>
                <div className="text-center p-2 border-r border-zinc-200">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px] mb-1">Total Client Price (Revenue)</span>
                  <span className="text-zinc-900 font-extrabold text-sm font-mono">{totalRevenue.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED</span>
                  {watchedDiscount > 0 && (
                    <span className="block text-[7px] text-zinc-400 font-bold mt-0.5">(Discount: {watchedDiscount}% / -{(subtotal * (watchedDiscount / 100)).toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED)</span>
                  )}
                </div>
                <div className="text-center p-2 border-r border-zinc-200">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px] mb-1">Total Cost Price</span>
                  <span className="text-zinc-900 font-extrabold text-sm font-mono">{totalCost.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED</span>
                </div>
                <div className="text-center p-2">
                  <span className="font-bold text-zinc-500 block uppercase text-[8px] mb-1">Expected Profit Margin</span>
                  <span className={`font-extrabold text-sm font-mono ${profitMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {profitMargin.toLocaleString("en-AE", { minimumFractionDigits: 2 })} AED <br/>
                    <span className="text-[10px] opacity-80">({marginPercentage.toFixed(1)}%)</span>
                  </span>
                </div>
              </div>

              {/* Cost Breakdown Table */}
              <div className="mt-4">
                <p className="font-bold text-zinc-800 mb-2 text-[10px] uppercase tracking-wider">Cost breakdown per line item:</p>
                <table className="w-full border border-zinc-200 text-[9px] text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-800 text-white font-bold text-[9px]">
                      <th className="p-2 w-8 text-center border-r border-zinc-700 font-bold">#</th>
                      <th className="p-2 border-r border-zinc-700 font-bold">Description</th>
                      <th className="p-2 w-12 text-center border-r border-zinc-700 font-bold">Qty</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Unit Cost (AED)</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Total Cost (AED)</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Unit Price (AED)</th>
                      <th className="p-2 w-20 text-right border-r border-zinc-700 font-bold">Total Price (AED)</th>
                      <th className="p-2 w-20 text-right font-bold">Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.items.map((item, idx) => {
                      const itemCost = (item.cost || 0) * (item.qty || 0);
                      const itemRevenue = (item.unitPrice || 0) * (item.qty || 0);
                      const itemProfit = itemRevenue - itemCost;
                      const itemProfitPercent = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0;
                      
                      return (
                        <tr key={item.id || idx} className="border-b border-zinc-200 hover:bg-zinc-50/25">
                          <td className="p-2 text-center border-r border-zinc-200 font-semibold text-zinc-500">{idx + 1}</td>
                          <td className="p-2 border-r border-zinc-200 text-zinc-800 leading-normal truncate max-w-[150px]">
                            {item.description ? item.description.split("\n")[0] : "-"}
                          </td>
                          <td className="p-2 text-center border-r border-zinc-200 text-zinc-700">{item.qty || 0}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-600 font-mono">{(item.cost || 0).toLocaleString()}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-700 font-mono">{itemCost.toLocaleString()}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-600 font-mono">{(item.unitPrice || 0).toLocaleString()}</td>
                          <td className="p-2 text-right border-r border-zinc-200 text-zinc-700 font-mono">{itemRevenue.toLocaleString()}</td>
                          <td className={`p-2 text-right font-bold font-mono ${itemProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {itemProfit.toLocaleString()} <span className="text-[8px] font-normal">({itemProfitPercent.toFixed(0)}%)</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Attached Invoices */}
              {watchedInvoices.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold text-zinc-800 mb-2 text-[10px] uppercase tracking-wider">Attached Purchase Invoices / فواتير الشراء المرفقة:</p>
                  <table className="w-full border border-zinc-200 text-[9px] text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-zinc-700 font-bold">
                        <th className="p-2 border-r border-zinc-200 font-bold">Invoice File Name</th>
                        <th className="p-2 border-r border-zinc-200 text-center font-bold">Type</th>
                        <th className="p-2 text-center font-bold">Uploaded At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchedInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-zinc-200">
                          <td className="p-2 border-r border-zinc-200 font-medium text-zinc-800">{inv.name}</td>
                          <td className="p-2 border-r border-zinc-200 text-center text-zinc-500">{inv.fileType.split("/")[1]?.toUpperCase() || "PDF"}</td>
                          <td className="p-2 text-center text-zinc-500">{inv.uploadedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Verification Footer Statement */}
            <div className="border-t border-zinc-200 pt-4 text-center">
              <p className="italic text-zinc-400 text-[8px] m-0">
                Confidential Document. For internal accounting and profit audit purposes only.
              </p>
            </div>
          </div>
        </div>
        )}

      </div>

      {/* Full Screen File View Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            <header className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 text-slate-900">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                <h3 className="text-sm font-semibold truncate max-w-md">{viewInvoice.name}</h3>
              </div>
              <button 
                onClick={() => setViewInvoice(null)}
                className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="flex-1 bg-slate-100 flex items-center justify-center p-6 overflow-hidden">
              {viewInvoice.fileType.startsWith("image/") ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={viewInvoice.fileData} 
                    alt={viewInvoice.name} 
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              ) : (
                <iframe 
                  src={viewInvoice.fileData} 
                  title={viewInvoice.name}
                  className="w-full h-full border-0 rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Price List Picker Modal */}
      <PriceListPickerModal
        isOpen={isPriceListOpen}
        onClose={() => setIsPriceListOpen(false)}
        onSelectItems={handleAddFromPriceList}
      />
    </div>
  );
}

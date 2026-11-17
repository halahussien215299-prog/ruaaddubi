import QRCode from "qrcode";

export type TaxJurisdiction = "UAE" | "KSA";

export interface ZATCATLVParams {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO format or YYYY-MM-DDTHH:mm:ssZ
  totalWithVat: string | number;
  vatAmount: string | number;
}

/**
 * Generate ZATCA compliant TLV (Tag-Length-Value) Base64 string
 * Tag 1: Seller's Name
 * Tag 2: Seller's Tax Number (15 digits)
 * Tag 3: Timestamp (ISO 8601)
 * Tag 4: Invoice Total (with VAT)
 * Tag 5: Total VAT
 */
export function generateZATCATLVBase64(params: ZATCATLVParams): string {
  const formatTag = (tagNum: number, valueStr: string): Uint8Array => {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(valueStr);
    const tagBytes = new Uint8Array(2 + valueBytes.length);
    tagBytes[0] = tagNum;
    tagBytes[1] = valueBytes.length;
    tagBytes.set(valueBytes, 2);
    return tagBytes;
  };

  const seller = formatTag(1, params.sellerName || "رواد سمارت");
  const vatNo = formatTag(2, params.vatNumber || "300000000000003");
  const time = formatTag(3, params.timestamp || new Date().toISOString());
  const total = formatTag(4, Number(params.totalWithVat || 0).toFixed(2));
  const vat = formatTag(5, Number(params.vatAmount || 0).toFixed(2));

  const totalLength = seller.length + vatNo.length + time.length + total.length + vat.length;
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of [seller, vatNo, time, total, vat]) {
    combined.set(part, offset);
    offset += part.length;
  }

  // Convert Uint8Array to binary string then base64
  let binaryString = "";
  for (let i = 0; i < combined.length; i++) {
    binaryString += String.fromCharCode(combined[i]);
  }

  if (typeof btoa !== "undefined") {
    return btoa(binaryString);
  } else if (typeof Buffer !== "undefined") {
    return Buffer.from(combined).toString("base64");
  }
  return "";
}

/**
 * Generate QR Code Data URL from ZATCA TLV Base64 payload
 */
export async function generateZATCAQRCodeDataURL(params: ZATCATLVParams): Promise<string> {
  const base64TLV = generateZATCATLVBase64(params);
  try {
    return await QRCode.toDataURL(base64TLV, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  } catch (err) {
    console.error("Failed to generate ZATCA QR Code:", err);
    return "";
  }
}

/**
 * Standard configuration for UAE and Saudi Arabia
 */
export const TAX_CONFIG = {
  UAE: {
    countryName: "دولة الإمارات العربية المتحدة",
    countryNameEn: "United Arab Emirates",
    flag: "🇦🇪",
    authorityName: "الهيئة الاتحادية للضرائب (FTA)",
    authorityNameEn: "Federal Tax Authority (FTA)",
    vatRate: 5,
    currency: "AED",
    currencyAr: "درهم إماراتي",
    taxIdLabel: "رقم التسجيل الضريبي (TRN)",
    taxIdPlaceholder: "100234567800003",
    lawReference: "وفقاً للمرسوم بقانون اتحادي رقم (8) لسنة 2017 في شأن ضريبة القيمة المضافة",
    returnFormName: "إقرار ضريبة القيمة المضافة 201 (FTA VAT 201)",
    standardRateDescription: "التوريدات الخاضعة للنسبة الأساسية (5%)",
  },
  KSA: {
    countryName: "المملكة العربية السعودية",
    countryNameEn: "Kingdom of Saudi Arabia",
    flag: "🇸🇦",
    authorityName: "هيئة الزكاة والضريبة والجمارك (ZATCA)",
    authorityNameEn: "Zakat, Tax and Customs Authority (ZATCA)",
    vatRate: 15,
    currency: "SAR",
    currencyAr: "ريال سعودي",
    taxIdLabel: "الرقم الضريبي (TIN / VAT Number)",
    taxIdPlaceholder: "300123456700003",
    lawReference: "وفقاً لنظام ضريبة القيمة المضافة ولائحة الفاتورة الإلكترونية (فاتورة)",
    returnFormName: "إقرار ضريبة القيمة المضافة المعتمد (ZATCA VAT Return)",
    standardRateDescription: "المبيعات المحلية الخاضعة للنسبة الأساسية (15%)",
  },
};

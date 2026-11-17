import { NextResponse, NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Helper to generate all potential string/digit variations for a phone number (UAE & KSA)
function getPhoneVariants(rawInput: string): string[] {
  if (!rawInput) return [];
  const cleanInput = rawInput.trim();
  const digitsOnly = cleanInput.replace(/\D/g, '');
  if (!digitsOnly) return [cleanInput];

  const variants = new Set<string>();
  variants.add(cleanInput);
  variants.add(digitsOnly);

  // Extract last 9 digits (common for Saudi 05xxxxxxxx and UAE 05xxxxxxxx)
  if (digitsOnly.length >= 8) {
    const last9 = digitsOnly.slice(-9);
    const last8 = digitsOnly.slice(-8);

    variants.add(last9);
    variants.add('0' + last9);
    variants.add('966' + last9);
    variants.add('+966' + last9);
    variants.add('971' + last9);
    variants.add('+971' + last9);

    variants.add(last8);
    variants.add('0' + last8);
  }

  return Array.from(variants);
}

// Core database search function for a client's records
async function searchClientDocuments(phone: string) {
  const variants = getPhoneVariants(phone);
  if (variants.length === 0) return null;

  // Build regex filters for case-insensitive phone matching
  const regexList = variants.map(v => new RegExp(v.replace('+', '\\+'), 'i'));

  const client = await clientPromise;
  const dbs = [client.db('ruaad_smart_dubai_db'), client.db()];

  let allContracts: any[] = [];
  let allQuotations: any[] = [];
  let allCertificates: any[] = [];
  let allReceipts: any[] = [];
  let allProjects: any[] = [];

  const phoneFilter = (fields: string[]) => ({
    $or: fields.map(field => ({ [field]: { $in: regexList } }))
  });

  // Step 1: Initial query by phone variations across all document collections
  for (const db of dbs) {
    try {
      // Query contracts by client phone
      const dbContracts = await db.collection('contracts').find(
        phoneFilter(['secondPartyPhone', 'firstPartyPhone', 'phone', 'clientPhone', 'contactNo'])
      ).toArray();
      allContracts = allContracts.concat(dbContracts);

      // Query quotations by phone
      const dbQuotations = await db.collection('quotations').find(
        phoneFilter(['contactNo', 'phone', 'clientPhone', 'firstPartyPhone', 'secondPartyPhone'])
      ).toArray();
      allQuotations = allQuotations.concat(dbQuotations);

      // Query certificates by phone
      const dbCertificates = await db.collection('certificates').find(
        phoneFilter(['phone', 'contactNo', 'clientPhone'])
      ).toArray();
      allCertificates = allCertificates.concat(dbCertificates);

      // Query receipts by phone (if field exists)
      const dbReceipts = await db.collection('receipts').find(
        phoneFilter(['phone', 'contactNo', 'clientPhone'])
      ).toArray();
      allReceipts = allReceipts.concat(dbReceipts);

      // Query projects by phone
      const dbProjects = await db.collection('projects').find(
        phoneFilter(['clientPhone', 'phone', 'contactNo'])
      ).toArray();
      allProjects = allProjects.concat(dbProjects);
    } catch (dbErr) {
      console.warn('Error querying database iteration:', dbErr);
    }
  }

  // Deduplicate helper
  const uniqueById = (arr: any[]) => {
    const seen = new Set();
    return arr.filter(item => {
      const idKey = item.id || (item._id ? item._id.toString() : JSON.stringify(item));
      if (seen.has(idKey)) return false;
      seen.add(idKey);
      return true;
    });
  };

  let uniqueContracts = uniqueById(allContracts);
  let uniqueQuotations = uniqueById(allQuotations);
  let uniqueProjects = uniqueById(allProjects);

  // Step 2: Extract discovered client names and document references
  const discoveredNames = new Set<string>();
  uniqueContracts.forEach(c => {
    if (c.secondPartyName) discoveredNames.add(c.secondPartyName.trim());
    if (c.clientName) discoveredNames.add(c.clientName.trim());
  });
  uniqueQuotations.forEach(q => {
    if (q.clientName) discoveredNames.add(q.clientName.trim());
  });
  uniqueProjects.forEach(p => {
    if (p.clientName) discoveredNames.add(p.clientName.trim());
  });

  const clientNames = Array.from(discoveredNames).filter(n => n.length >= 2);

  // Collect discovered document references (quotation numbers, contract numbers, project numbers)
  const discoveredRefs = new Set<string>();
  uniqueQuotations.forEach(q => {
    if (q.quotationNo) discoveredRefs.add(q.quotationNo);
    if (q.id) discoveredRefs.add(q.id);
  });
  uniqueContracts.forEach(c => {
    if (c.contractNo) discoveredRefs.add(c.contractNo);
    if (c.id) discoveredRefs.add(c.id);
  });
  uniqueProjects.forEach(p => {
    if (p.projectNo) discoveredRefs.add(p.projectNo);
    if (p.id) discoveredRefs.add(p.id);
    if (p.quotationId) discoveredRefs.add(p.quotationId);
    if (p.contractId) discoveredRefs.add(p.contractId);
  });

  const docRefs = Array.from(discoveredRefs).filter(Boolean);

  // Step 3: Multi-factor cross-query using client names and document numbers
  // This is essential for Receipts and Certificates which identify clients by Name or Project Ref
  if (clientNames.length > 0 || docRefs.length > 0) {
    const nameRegexList = clientNames.map(name => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    const refRegexList = docRefs.map(ref => new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

    for (const db of dbs) {
      try {
        // Query Receipts by clientName OR receivedFor containing document reference
        const linkedReceipts = await db.collection('receipts').find({
          $or: [
            ...(nameRegexList.length > 0 ? [{ clientName: { $in: nameRegexList } }] : []),
            ...(refRegexList.length > 0 ? [{ receivedFor: { $in: refRegexList } }] : []),
            ...(refRegexList.length > 0 ? [{ receiptNo: { $in: refRegexList } }] : [])
          ]
        }).toArray();
        allReceipts = allReceipts.concat(linkedReceipts);

        // Query Certificates by clientName or project title
        const linkedCerts = await db.collection('certificates').find({
          $or: [
            ...(nameRegexList.length > 0 ? [{ clientName: { $in: nameRegexList } }] : []),
            ...(refRegexList.length > 0 ? [{ project: { $in: refRegexList } }] : [])
          ]
        }).toArray();
        allCertificates = allCertificates.concat(linkedCerts);

        // Query additional Projects by client name or quotation/contract ID
        const linkedProjects = await db.collection('projects').find({
          $or: [
            ...(nameRegexList.length > 0 ? [{ clientName: { $in: nameRegexList } }] : []),
            ...(docRefs.length > 0 ? [{ quotationId: { $in: docRefs } }] : []),
            ...(docRefs.length > 0 ? [{ contractId: { $in: docRefs } }] : [])
          ]
        }).toArray();
        allProjects = allProjects.concat(linkedProjects);

        // Query additional Quotations matching client name if phone was missing
        if (nameRegexList.length > 0) {
          const linkedQuotes = await db.collection('quotations').find({
            clientName: { $in: nameRegexList }
          }).toArray();
          allQuotations = allQuotations.concat(linkedQuotes);
        }

        // Query additional Contracts matching second party client name
        if (nameRegexList.length > 0) {
          const linkedContracts = await db.collection('contracts').find({
            secondPartyName: { $in: nameRegexList }
          }).toArray();
          allContracts = allContracts.concat(linkedContracts);
        }
      } catch (err) {
        console.warn('Cross-collection query error:', err);
      }
    }
  }

  // Final deduplication
  uniqueContracts = uniqueById(allContracts);
  uniqueQuotations = uniqueById(allQuotations);
  uniqueProjects = uniqueById(allProjects);
  const uniqueCertificates = uniqueById(allCertificates);
  const uniqueReceipts = uniqueById(allReceipts);

  // Sort each list by newest first
  const sortByDate = (arr: any[]) => {
    return arr.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
  };

  sortByDate(uniqueContracts);
  sortByDate(uniqueQuotations);
  sortByDate(uniqueProjects);
  sortByDate(uniqueCertificates);
  sortByDate(uniqueReceipts);

  // Step 4: Map Quotations to Sales Invoices / Tax Invoices explicitly
  // Quotations serve as official sales and tax invoices in Ruaad Smart
  const uniqueInvoices = uniqueQuotations.map(q => {
    const isTaxKsa = q.taxJurisdiction === "KSA" || q.currency === "SAR";
    const invoiceType = isTaxKsa ? "tax_invoice_ksa" : "tax_invoice_uae";
    const invoiceNumber = q.quotationNo 
      ? q.quotationNo.replace(/^Q-/, "INV-").replace(/^EST-/, "INV-")
      : `INV-${q.id?.slice(-6) || "001"}`;

    return {
      id: q.id,
      invoiceNo: invoiceNumber,
      quotationNo: q.quotationNo || "Q-001",
      date: q.date || new Date().toISOString().split("T")[0],
      clientName: q.clientName || "عميل مميز",
      projectReference: q.projectReference || "مشروع أنظمة ذكية",
      subtotal: q.subtotal || q.total || 0,
      vatAmount: q.vatAmount || 0,
      total: q.total || 0,
      currency: q.currency || "AED",
      taxJurisdiction: q.taxJurisdiction || "UAE",
      status: q.status || "approved",
      viewUrl: `/quotation/${q.id}/view?view=invoice&type=tax`,
      standardInvoiceUrl: `/quotation/${q.id}/view?view=invoice`,
      quotationUrl: `/quotation/${q.id}/view`,
      itemsCount: Array.isArray(q.items) ? q.items.length : 0,
    };
  });

  return {
    phone: phone.trim(),
    clientNames,
    counts: {
      invoices: uniqueInvoices.length,
      receipts: uniqueReceipts.length,
      projects: uniqueProjects.length,
      contracts: uniqueContracts.length,
      quotations: uniqueQuotations.length,
      certificates: uniqueCertificates.length,
      totalDocuments: uniqueInvoices.length + uniqueReceipts.length + uniqueProjects.length + uniqueContracts.length + uniqueCertificates.length
    },
    invoices: uniqueInvoices,
    receipts: uniqueReceipts,
    projects: uniqueProjects,
    contracts: uniqueContracts,
    quotations: uniqueQuotations,
    certificates: uniqueCertificates,
  };
}

// GET handler: automatically loads documents by phone query param OR session cookie
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const phoneParam = url.searchParams.get('phone');
    const cookiePhone = request.cookies.get('ruaad_client_phone')?.value;

    const phone = phoneParam || cookiePhone;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ 
        authenticated: false, 
        message: 'لا يوجد جلسة رقم جوال نشطة' 
      }, { status: 401 });
    }

    const data = await searchClientDocuments(phone);
    if (!data) {
      return NextResponse.json({ error: 'رقم الجوال غير صحيح' }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      ...data
    });

    // Refresh cookie
    response.cookies.set('ruaad_client_phone', phone.trim(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return response;
  } catch (error) {
    console.error('Error in GET /api/client/portal:', error);
    return NextResponse.json({ error: 'فشل تحميل بيانات العميل تلقائياً' }, { status: 500 });
  }
}

// POST handler: processes phone submission from client login form
export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'يرجى إدخال رقم الجوال' }, { status: 400 });
    }

    const data = await searchClientDocuments(phone);
    if (!data) {
      return NextResponse.json({ error: 'رقم الجوال غير صحيح' }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      ...data
    });

    // Set cookie for client phone session
    response.cookies.set('ruaad_client_phone', phone.trim(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return response;
  } catch (error) {
    console.error('Error in POST /api/client/portal:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الاستعلام عن بيانات العميل' }, { status: 500 });
  }
}

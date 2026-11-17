import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { recordAuditLogServer } from '@/lib/audit';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const rawQuotations = await db.collection('quotations').find({}).toArray();
    // Ensure every quotation has a valid id field and clean serialization
    const quotations = rawQuotations.map((q: any) => ({
      ...q,
      id: q.id || q.quotationNo || (q._id ? q._id.toString() : `quote-${Date.now()}`)
    }));
    // Sort by updatedAt descending
    quotations.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    return NextResponse.json(quotations);
  } catch (e) {
    console.error('Error fetching quotations:', e);
    return NextResponse.json({ error: 'Failed to fetch quotations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing quotation ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    
    // Remove immutable MongoDB _id if present to prevent update errors
    delete body._id;

    // Upsert quotation using ID
    const result = await db.collection('quotations').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );

    await recordAuditLogServer(request, {
      actor: { 
        username: body.preparedBy || 'مسؤول النظام', 
        role: 'operations', 
        name: body.preparedBy || 'الموظف المسؤول' 
      },
      action: body.isInvoice ? 'INVOICE_SAVED' : 'QUOTATION_SAVED',
      actionTitleAr: body.isInvoice ? 'حفظ / إصدار فاتورة' : 'حفظ / تعديل عرض سعر',
      category: 'quotation',
      targetId: body.id,
      targetType: body.isInvoice ? 'فاتورة' : 'عرض سعر',
      details: `تم ${result.upsertedCount ? 'إنشاء' : 'تحديث'} ${body.isInvoice ? 'فاتورة' : 'عرض سعر'} رقم [${body.quotationNo || body.id}] للعميل (${body.clientName || 'غير محدد'}) بإجمالي [${Number(body.total || 0).toLocaleString()} AED].`,
      severity: 'info',
    });
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving quotation:', e);
    return NextResponse.json({ error: 'Failed to save quotation' }, { status: 500 });
  }
}

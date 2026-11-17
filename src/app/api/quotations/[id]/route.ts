import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { isClientAuthorizedForDocument } from '@/lib/clientAuth';
import { recordAuditLogServer } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    
    let quotation = null;
    if (id && id !== 'undefined' && id !== 'null' && id !== 'new') {
      quotation = await db.collection('quotations').findOne({ id });
      if (!quotation) {
        quotation = await db.collection('quotations').findOne({ quotationNo: id });
      }
    }
    
    // If not found or if id is undefined/new, fallback to the latest quotation
    if (!quotation) {
      const latest = await db.collection('quotations').find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(1).toArray();
      if (latest && latest.length > 0) {
        quotation = latest[0];
      }
    }

    if (!quotation) {
      return NextResponse.json({ error: 'عرض السعر غير موجود' }, { status: 404 });
    }

    // Ensure quotation has an explicit string id
    if (!quotation.id) {
      quotation.id = quotation.quotationNo || (quotation._id ? quotation._id.toString() : `quote-${Date.now()}`);
    }

    // Check authorization for client phone session or admin
    const auth = isClientAuthorizedForDocument(quotation, request);
    if (!auth.allowed) {
      return NextResponse.json(
        { error: 'عفواً، لا تملك الصلاحية للوصول لهذا المستند. هذا المستند لا يخص رقم الجوال المسجل لديك.' },
        { status: 403 }
      );
    }

    return NextResponse.json(quotation);
  } catch (e) {
    console.error(`Error fetching quotation:`, e);
    return NextResponse.json({ error: 'Failed to fetch quotation' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const result = await db.collection('quotations').deleteOne({ id });

    await recordAuditLogServer(request, {
      actor: { username: 'admin', role: 'admin', name: 'المسؤول' },
      action: 'QUOTATION_DELETED',
      actionTitleAr: 'حذف عرض سعر من النظام',
      category: 'quotation',
      targetId: id,
      targetType: 'عرض سعر',
      details: `تم حذف المستند رقم [${id}] نهائياً من قاعدة البيانات.`,
      severity: 'warning',
    });

    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error(`Error deleting quotation:`, e);
    return NextResponse.json({ error: 'Failed to delete quotation' }, { status: 500 });
  }
}

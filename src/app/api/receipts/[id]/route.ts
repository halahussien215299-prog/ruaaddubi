import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { isClientAuthorizedForDocument } from '@/lib/clientAuth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const receipt = await db.collection('receipts').findOne({ id });

    if (!receipt) {
      return NextResponse.json({ error: 'السند / الفاتورة غير موجودة' }, { status: 404 });
    }

    // Check authorization
    const auth = isClientAuthorizedForDocument(receipt, request);
    if (!auth.allowed) {
      return NextResponse.json(
        { error: 'عفواً، لا تملك الصلاحية للوصول لهذا المستند. هذا المستند لا يخص رقم الجوال المسجل لديك.' },
        { status: 403 }
      );
    }

    return NextResponse.json(receipt);
  } catch (e) {
    console.error(`Error fetching receipt:`, e);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
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
    const result = await db.collection('receipts').deleteOne({ id });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error(`Error deleting receipt:`, e);
    return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 });
  }
}

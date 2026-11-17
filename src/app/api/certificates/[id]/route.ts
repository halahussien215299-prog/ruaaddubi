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
    const certificate = await db.collection('certificates').findOne({ id });

    if (!certificate) {
      return NextResponse.json({ error: 'شهادة الإنجاز غير موجودة' }, { status: 404 });
    }

    // Check authorization
    const auth = isClientAuthorizedForDocument(certificate, request);
    if (!auth.allowed) {
      return NextResponse.json(
        { error: 'عفواً، لا تملك الصلاحية للوصول لهذه الشهادة. هذه الشهادة لا تخص رقم الجوال المسجل لديك.' },
        { status: 403 }
      );
    }

    return NextResponse.json(certificate);
  } catch (e) {
    console.error(`Error fetching certificate:`, e);
    return NextResponse.json({ error: 'Failed to fetch certificate' }, { status: 500 });
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
    const result = await db.collection('certificates').deleteOne({ id });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error(`Error deleting certificate:`, e);
    return NextResponse.json({ error: 'Failed to delete certificate' }, { status: 500 });
  }
}

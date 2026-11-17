import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { isClientAuthorizedForDocument } from '@/lib/clientAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    
    // First try ruaad_smart_dubai_db, then fallback to default db
    let db = client.db('ruaad_smart_dubai_db');
    let contract = await db.collection('contracts').findOne({ id });
    
    if (!contract) {
      db = client.db();
      contract = await db.collection('contracts').findOne({ id });
    }

    if (!contract) {
      return NextResponse.json({ error: 'العقد غير موجود' }, { status: 404 });
    }

    // Check authorization
    const auth = isClientAuthorizedForDocument(contract, request);
    if (!auth.allowed) {
      return NextResponse.json(
        { error: 'عفواً، لا تملك الصلاحية للوصول لهذا العقد. هذا العقد لا يخص رقم الجوال المسجل لديك.' },
        { status: 403 }
      );
    }

    return NextResponse.json(contract, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    console.error(`Error fetching contract:`, e);
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 });
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
    const result = await db.collection('contracts').deleteOne({ id });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error(`Error deleting contract:`, e);
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
  }
}

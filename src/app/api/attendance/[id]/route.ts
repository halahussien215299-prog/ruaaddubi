import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const record = await db.collection('attendance').findOne({ id });

    if (!record) {
      return NextResponse.json({ error: 'سجل الحضور غير موجود' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (e) {
    console.error(`Error fetching attendance record:`, e);
    return NextResponse.json({ error: 'Failed to fetch attendance record' }, { status: 500 });
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
    const result = await db.collection('attendance').deleteOne({ id });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error(`Error deleting attendance record:`, e);
    return NextResponse.json({ error: 'Failed to delete attendance record' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');

    const result = await db.collection('items').deleteOne({ id });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'فشل حذف الصنف' }, { status: 500 });
  }
}

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
    const expense = await db.collection('expenses').findOne({ id });

    if (!expense) {
      return NextResponse.json({ error: 'المصروف غير موجود' }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (e) {
    console.error(`Error fetching expense:`, e);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
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
    const result = await db.collection('expenses').deleteOne({ id });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error(`Error deleting expense:`, e);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}


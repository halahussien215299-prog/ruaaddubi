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
    
    await db.collection('journal_entries').deleteOne({ id });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting journal entry:', e);
    return NextResponse.json({ error: 'Failed to delete journal entry' }, { status: 500 });
  }
}


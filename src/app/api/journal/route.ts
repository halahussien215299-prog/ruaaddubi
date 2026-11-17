import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const entries = await db.collection('journal_entries').find({}).toArray();
    entries.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    return NextResponse.json(entries);
  } catch (e) {
    console.error('Error fetching journal entries:', e);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing journal entry ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    
    delete body._id;

    const result = await db.collection('journal_entries').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving journal entry:', e);
    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 });
  }
}


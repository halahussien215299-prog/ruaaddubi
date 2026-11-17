import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const records = await db.collection('attendance').find({}).toArray();
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json(records);
  } catch (e) {
    console.error('Error fetching attendance records:', e);
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing attendance ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    
    delete body._id;

    const result = await db.collection('attendance').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving attendance record:', e);
    return NextResponse.json({ error: 'Failed to save attendance record' }, { status: 500 });
  }
}


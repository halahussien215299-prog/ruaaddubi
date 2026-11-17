import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const expenses = await db.collection('expenses').find({}).toArray();
    expenses.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    return NextResponse.json(expenses);
  } catch (e) {
    console.error('Error fetching expenses:', e);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    
    delete body._id;

    const result = await db.collection('expenses').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving expense:', e);
    return NextResponse.json({ error: 'Failed to save expense' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const employees = await db.collection('employees').find({}).toArray();
    employees.sort((a, b) => (a.empNo || '').localeCompare(b.empNo || ''));
    return NextResponse.json(employees);
  } catch (e) {
    console.error('Error fetching employees:', e);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    
    delete body._id;

    const result = await db.collection('employees').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving employee:', e);
    return NextResponse.json({ error: 'Failed to save employee' }, { status: 500 });
  }
}


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
    const employee = await db.collection('employees').findOne({ id });

    if (!employee) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (e) {
    console.error(`Error fetching employee:`, e);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
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
    const result = await db.collection('employees').deleteOne({ id });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error(`Error deleting employee:`, e);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}


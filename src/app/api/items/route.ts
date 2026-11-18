import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { PRICE_LIST_ITEMS } from '@/data/priceList';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    
    // Check if items collection has records
    let items = await db.collection('items').find({}).toArray();

    // If empty in fresh database, seed from initial catalog items
    if (items.length === 0) {
      const initialItems = PRICE_LIST_ITEMS.map((item, idx) => ({
        ...item,
        id: item.id || `prod-${idx + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      await db.collection('items').insertMany(initialItems as any);
      items = initialItems as any;
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching price list items:', error);
    // Fallback to static catalog if DB is momentarily unreachable
    return NextResponse.json(PRICE_LIST_ITEMS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.description || !body.description.trim()) {
      return NextResponse.json({ error: 'يرجى كتابة اسم أو وصف الصنف' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');

    const item = {
      id: body.id || `prod-${Date.now()}`,
      category: body.category?.trim() || 'ACCESSORIES',
      supplier: body.supplier?.trim() || 'رواد سمارت',
      description: body.description.trim(),
      cost: Number(body.cost) || 0,
      unitPrice: Number(body.unitPrice) || 0,
      unit: body.unit?.trim() || 'Pcs',
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    delete (item as any)._id;

    await db.collection('items').replaceOne(
      { id: item.id },
      item,
      { upsert: true }
    );

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Error saving item:', error);
    return NextResponse.json({ error: 'فشل حفظ الصنف في قاعدة البيانات' }, { status: 500 });
  }
}

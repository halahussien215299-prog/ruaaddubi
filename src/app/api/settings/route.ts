import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import fs from 'fs';
import path from 'path';

function getDefaultLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  } catch (err) {
    console.error('Failed to read default logo:', err);
  }
  return '';
}

function getDefaultStampBase64(): string {
  try {
    const stampPath = path.join(process.cwd(), 'public', 'stamp.png');
    if (fs.existsSync(stampPath)) {
      const buffer = fs.readFileSync(stampPath);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  } catch (err) {
    console.error('Failed to read default stamp:', err);
  }
  return '';
}

export async function GET() {
  try {
    const defaultLogo = getDefaultLogoBase64();
    const defaultStamp = getDefaultStampBase64();
    let settings = null;

    try {
      const client = await clientPromise;
      const db = client.db('ruaad_smart_dubai_db');
      settings = await db.collection('settings').findOne({ id: 'global_settings' });
    } catch (dbErr) {
      console.warn('Could not connect to MongoDB for settings, using defaults:', dbErr);
    }

    const mergedSettings = {
      companyName: 'رواد سمارت للأجهزة الذكية',
      currency: 'AED',
      taxRate: 5,
      taxNumber: '100234567800003',
      logoBase64: defaultLogo,
      stampBase64: defaultStamp,
      ...(settings || {})
    };

    if (!mergedSettings.logoBase64 && defaultLogo) {
      mergedSettings.logoBase64 = defaultLogo;
    }

    if (!mergedSettings.stampBase64 && defaultStamp) {
      mergedSettings.stampBase64 = defaultStamp;
    }

    return NextResponse.json(mergedSettings);
  } catch (e) {
    console.error('Error fetching settings:', e);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    
    const settingsData = { ...body, id: 'global_settings', updatedAt: new Date().toISOString() };
    delete settingsData._id;

    const result = await db.collection('settings').updateOne(
      { id: 'global_settings' },
      { $set: settingsData },
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving settings:', e);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

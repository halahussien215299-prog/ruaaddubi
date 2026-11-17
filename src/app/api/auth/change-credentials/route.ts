import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { currentPassword, newUsername, newPassword } = await request.json();

    const inputCurrentPassword = (currentPassword || '').trim();
    const inputNewUsername = (newUsername || '').trim();
    const inputNewPassword = (newPassword || '').trim();

    if (!inputCurrentPassword || !inputNewPassword) {
      return NextResponse.json({ error: 'جميع الحقول المطلوبة يجب ملؤها' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const settings = await db.collection('settings').findOne({ id: 'global_settings' });

    const expectedPassword = (settings?.adminPassword || process.env.ADMIN_PASSWORD || 'vibel213@').trim();

    if (inputCurrentPassword !== expectedPassword) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
    }

    const updatedUsername = inputNewUsername || settings?.adminUsername || process.env.ADMIN_USERNAME || 'admin';

    await db.collection('settings').updateOne(
      { id: 'global_settings' },
      {
        $set: {
          adminUsername: updatedUsername,
          adminPassword: inputNewPassword,
          updatedAt: new Date().toISOString(),
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'تم تغيير اسم المستخدم وكلمة المرور وتخزينهما في MongoDB بنجاح',
      username: updatedUsername,
    });
  } catch (e) {
    console.error('Change credentials error:', e);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ البيانات في MongoDB' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { recordAuditLogServer } from '@/lib/audit';
import { 
  DEFAULT_EXECUTIVE_PERMISSIONS, 
  DEFAULT_ACCOUNTING_PERMISSIONS, 
  DEFAULT_OPERATIONS_PERMISSIONS 
} from '@/lib/db';

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const settings = await db.collection('settings').findOne({ id: 'global_settings' });

    return NextResponse.json({
      adminUsername: settings?.adminUsername || process.env.ADMIN_USERNAME || 'admin',
      executivePin: settings?.executivePin || '2026',
      accountantUsername: settings?.accountantUsername || 'accountant',
      accountingPermissions: settings?.accountingPermissions || DEFAULT_ACCOUNTING_PERMISSIONS,
      operationsUsername: settings?.operationsUsername || 'operations',
      operationsPermissions: settings?.operationsPermissions || DEFAULT_OPERATIONS_PERMISSIONS,
    });
  } catch (err: any) {
    console.error('Failed to get permissions:', err);
    return NextResponse.json({
      adminUsername: 'admin',
      executivePin: '2026',
      accountantUsername: 'accountant',
      accountingPermissions: DEFAULT_ACCOUNTING_PERMISSIONS,
      operationsUsername: 'operations',
      operationsPermissions: DEFAULT_OPERATIONS_PERMISSIONS,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      adminUsername,
      adminPassword,
      executivePin,
      accountantUsername,
      accountantPassword,
      accountingPermissions,
      operationsUsername,
      operationsPassword,
      operationsPermissions,
    } = body;

    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');

    const updateFields: any = {
      updatedAt: new Date().toISOString(),
    };

    if (adminUsername) updateFields.adminUsername = adminUsername.trim();
    if (adminPassword) updateFields.adminPassword = adminPassword.trim();
    if (executivePin) updateFields.executivePin = executivePin.trim();

    if (accountantUsername) updateFields.accountantUsername = accountantUsername.trim();
    if (accountantPassword) updateFields.accountantPassword = accountantPassword.trim();
    if (accountingPermissions) updateFields.accountingPermissions = accountingPermissions;

    if (operationsUsername) updateFields.operationsUsername = operationsUsername.trim();
    if (operationsPassword) updateFields.operationsPassword = operationsPassword.trim();
    if (operationsPermissions) updateFields.operationsPermissions = operationsPermissions;

    await db.collection('settings').updateOne(
      { id: 'global_settings' },
      { $set: updateFields },
      { upsert: true }
    );

    await recordAuditLogServer(request, {
      actor: { username: 'admin', role: 'admin', name: 'الإدارة العليا' },
      action: 'PERMISSIONS_UPDATED',
      actionTitleAr: 'تعديل صلاحيات وحسابات الموظفين',
      category: 'settings',
      details: 'قامت الإدارة العليا بتحديث صلاحيات وبيانات دخول المحاسب المالي أو الموظف الإداري ورمز PIN الإداري.',
      severity: 'warning',
      metadata: {
        updatedFields: Object.keys(updateFields).filter(k => !k.includes('Password')),
      }
    });

    return NextResponse.json({ success: true, message: 'تم تحديث حسابات وصلاحيات الموظفين بنجاح' });
  } catch (err: any) {
    console.error('Failed to save permissions:', err);
    return NextResponse.json({ error: 'فشل حفظ الصلاحيات' }, { status: 500 });
  }
}

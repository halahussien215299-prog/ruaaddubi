import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { recordAuditLogServer } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');

    const query: any = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    if (role && role !== 'all') {
      query['actor.role'] = role;
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { details: regex },
        { actionTitleAr: regex },
        { 'actor.name': regex },
        { 'actor.username': regex },
        { 'actor.ip': regex },
        { targetId: regex },
      ];
    }

    const logs = await db
      .collection('audit_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    // Map _id to clean string
    const cleanLogs = logs.map((l: any) => ({
      ...l,
      _id: l._id?.toString(),
    }));

    // Summary statistics for the dashboard
    const totalEvents = await db.collection('audit_logs').countDocuments();
    const securityEventsCount = await db.collection('audit_logs').countDocuments({ category: 'security' });
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEventsCount = await db.collection('audit_logs').countDocuments({
      timestamp: { $gte: todayStr }
    });

    return NextResponse.json({
      logs: cleanLogs,
      stats: {
        total: totalEvents,
        today: todayEventsCount,
        securityAlerts: securityEventsCount,
      }
    });
  } catch (err: any) {
    console.error('Failed to get audit logs:', err);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { actor, action, actionTitleAr, category, details, severity, targetId, targetType, metadata } = body;

    if (!action || !details) {
      return NextResponse.json({ error: 'Missing required audit fields' }, { status: 400 });
    }

    const created = await recordAuditLogServer(request, {
      actor: actor || { username: 'system', role: 'system', name: 'النظام الداخلي' },
      action,
      actionTitleAr: actionTitleAr || action,
      category: category || 'quotation',
      details,
      severity: severity || 'info',
      targetId,
      targetType,
      metadata,
    });

    return NextResponse.json({ success: true, log: created });
  } catch (err: any) {
    console.error('Failed to record audit log:', err);
    return NextResponse.json({ error: 'Failed to record audit log' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');

    // Retain security and auth logs, clean older general logs if requested
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = await db.collection('audit_logs').deleteMany({
      category: { $nin: ['security', 'auth'] },
      timestamp: { $lt: thirtyDaysAgo }
    });

    await recordAuditLogServer(request, {
      actor: { username: 'admin', role: 'admin', name: 'الإدارة العليا' },
      action: 'AUDIT_LOGS_PURGED',
      actionTitleAr: 'تنظيف وأرشفة سجلات العمليات القديمة',
      category: 'settings',
      details: `تم تنظيف سجلات العمليات الأقدم من 30 يوماً بنجاح. تم حذف ${result.deletedCount} سجل غير حرج.`,
      severity: 'warning',
    });

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (err: any) {
    console.error('Failed to purge logs:', err);
    return NextResponse.json({ error: 'Failed to purge audit logs' }, { status: 500 });
  }
}

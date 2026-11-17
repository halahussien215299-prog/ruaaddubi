import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { recordAuditLogServer } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');

    let settings: any = await db.collection('security_settings').findOne({ id: 'firewall_settings' });
    const globalSettings = await db.collection('settings').findOne({ id: 'global_settings' });

    if (!settings) {
      settings = {
        id: 'firewall_settings',
        firewallEnabled: true,
        bruteForceProtection: true,
        maxFailedAttempts: 5,
        blockDurationHours: 24,
        requirePinForSensitiveActions: true,
        ipWhitelist: ['127.0.0.1'],
        ipBlacklist: [],
        blockedIps: [],
        activeSessions: [],
      };
      await db.collection('security_settings').insertOne(settings);
    }

    // Calculate a dynamic Security Health Score
    let score = 70;
    if (settings.firewallEnabled) score += 10;
    if (settings.bruteForceProtection) score += 10;
    if (globalSettings?.executivePin && globalSettings.executivePin !== '1234') score += 5;
    if (globalSettings?.adminPassword && globalSettings.adminPassword !== 'admin') score += 5;

    return NextResponse.json({
      firewallEnabled: settings.firewallEnabled ?? true,
      bruteForceProtection: settings.bruteForceProtection ?? true,
      maxFailedAttempts: settings.maxFailedAttempts || 5,
      blockDurationHours: settings.blockDurationHours || 24,
      requirePinForSensitiveActions: settings.requirePinForSensitiveActions ?? true,
      ipWhitelist: settings.ipWhitelist || ['127.0.0.1'],
      ipBlacklist: settings.ipBlacklist || [],
      blockedIps: settings.blockedIps || [],
      activeSessions: settings.activeSessions || [],
      securityScore: Math.min(score, 100),
      executivePinSet: Boolean(globalSettings?.executivePin),
    });
  } catch (err: any) {
    console.error('Failed to get security settings:', err);
    return NextResponse.json({ error: 'Failed to fetch firewall settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      action, 
      ip, 
      reason, 
      sessionId, 
      firewallEnabled, 
      bruteForceProtection, 
      maxFailedAttempts,
      requirePinForSensitiveActions 
    } = body;

    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');

    let settings: any = await db.collection('security_settings').findOne({ id: 'firewall_settings' });
    if (!settings) {
      settings = {
        id: 'firewall_settings',
        firewallEnabled: true,
        bruteForceProtection: true,
        maxFailedAttempts: 5,
        ipWhitelist: ['127.0.0.1'],
        ipBlacklist: [],
        blockedIps: [],
        activeSessions: [],
      };
    }

    if (action === 'block_ip') {
      if (!ip) return NextResponse.json({ error: 'IP address required' }, { status: 400 });
      const blacklist = settings.ipBlacklist || [];
      if (!blacklist.includes(ip)) blacklist.push(ip);

      const blockedIps = settings.blockedIps || [];
      if (!blockedIps.some((b: any) => b.ip === ip)) {
        blockedIps.unshift({
          ip,
          reason: reason || 'حظر يدوي بواسطة مسؤول النظام',
          blockedAt: new Date().toISOString(),
          attemptsCount: 1,
        });
      }

      await db.collection('security_settings').updateOne(
        { id: 'firewall_settings' },
        { $set: { ipBlacklist: blacklist, blockedIps, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );

      await recordAuditLogServer(request, {
        actor: { username: 'admin', role: 'admin', name: 'الإدارة العليا' },
        action: 'FIREWALL_IP_BLOCKED_MANUAL',
        actionTitleAr: 'حظر عنوان IP يدوياً من جدار الحماية',
        category: 'security',
        details: `تم حظر العنوان [${ip}] يدوياً من قِبل الإدارة. السبب: ${reason || 'غير محدد'}.`,
        severity: 'danger',
      });

      return NextResponse.json({ success: true, message: `تم حظر الـ IP ${ip} بنجاح` });
    }

    if (action === 'unblock_ip') {
      if (!ip) return NextResponse.json({ error: 'IP address required' }, { status: 400 });
      const blacklist = (settings.ipBlacklist || []).filter((item: string) => item !== ip);
      const blockedIps = (settings.blockedIps || []).filter((b: any) => b.ip !== ip);

      await db.collection('security_settings').updateOne(
        { id: 'firewall_settings' },
        { $set: { ipBlacklist: blacklist, blockedIps, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );

      await recordAuditLogServer(request, {
        actor: { username: 'admin', role: 'admin', name: 'الإدارة العليا' },
        action: 'FIREWALL_IP_UNBLOCKED',
        actionTitleAr: 'إلغاء حظر عنوان IP من جدار الحماية',
        category: 'security',
        details: `تم فك حظر العنوان [${ip}] واستعادة وصوله للنظام.`,
        severity: 'info',
      });

      return NextResponse.json({ success: true, message: `تم فك الحظر عن ${ip} بنجاح` });
    }

    if (action === 'terminate_session') {
      if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
      const activeSessions = (settings.activeSessions || []).filter((s: any) => s.id !== sessionId);

      await db.collection('security_settings').updateOne(
        { id: 'firewall_settings' },
        { $set: { activeSessions, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );

      await recordAuditLogServer(request, {
        actor: { username: 'admin', role: 'admin', name: 'الإدارة العليا' },
        action: 'SESSION_TERMINATED',
        actionTitleAr: 'إنهاء جلسة مستخدم نشطة فورياً',
        category: 'security',
        details: `تم طرد وإنهاء الجلسة [${sessionId}] فورياً من لوحة الأمان.`,
        severity: 'warning',
      });

      return NextResponse.json({ success: true, message: 'تم إنهاء الجلسة وطرد الاتصال فوراً' });
    }

    if (action === 'terminate_all_other_sessions') {
      // Clear all sessions
      await db.collection('security_settings').updateOne(
        { id: 'firewall_settings' },
        { $set: { activeSessions: [], updatedAt: new Date().toISOString() } },
        { upsert: true }
      );

      await recordAuditLogServer(request, {
        actor: { username: 'admin', role: 'admin', name: 'الإدارة العليا' },
        action: 'ALL_SESSIONS_REVOKED',
        actionTitleAr: 'إنهاء كافة الجلسات النشطة وتسجيل خروج جماعي',
        category: 'security',
        details: 'تم إجراء تسجيل خروج قسري لجميع الجلسات النشطة لتعزيز الأمان.',
        severity: 'danger',
      });

      return NextResponse.json({ success: true, message: 'تم إنهاء جميع الجلسات بنجاح' });
    }

    // Updating core rules
    const updateFields: any = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof firewallEnabled === 'boolean') updateFields.firewallEnabled = firewallEnabled;
    if (typeof bruteForceProtection === 'boolean') updateFields.bruteForceProtection = bruteForceProtection;
    if (typeof maxFailedAttempts === 'number') updateFields.maxFailedAttempts = maxFailedAttempts;
    if (typeof requirePinForSensitiveActions === 'boolean') {
      updateFields.requirePinForSensitiveActions = requirePinForSensitiveActions;
    }

    await db.collection('security_settings').updateOne(
      { id: 'firewall_settings' },
      { $set: updateFields },
      { upsert: true }
    );

    await recordAuditLogServer(request, {
      actor: { username: 'admin', role: 'admin', name: 'الإدارة العليا' },
      action: 'FIREWALL_CONFIG_UPDATED',
      actionTitleAr: 'تحديث قواعد جدار الحماية وأمان النظام',
      category: 'settings',
      details: 'تم تحديث سياسات الحماية وإعدادات جدار الحماية والـ WAF بنجاح.',
      severity: 'info',
      metadata: updateFields,
    });

    return NextResponse.json({ success: true, message: 'تم حفظ وتطبيق قواعد جدار الحماية بنجاح' });
  } catch (err: any) {
    console.error('Failed to update firewall settings:', err);
    return NextResponse.json({ error: 'Failed to update firewall settings' }, { status: 500 });
  }
}

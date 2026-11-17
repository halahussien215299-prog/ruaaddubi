import clientPromise from '@/lib/mongodb';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: {
    username: string;
    role: "admin" | "accounting" | "operations" | "system" | "client";
    name: string;
    ip?: string;
    userAgent?: string;
    device?: string;
    browser?: string;
  };
  action: string;
  actionTitleAr: string;
  category: "auth" | "quotation" | "financial" | "hr" | "project" | "security" | "settings";
  targetId?: string;
  targetType?: string;
  details: string;
  severity: "info" | "warning" | "danger" | "success";
  metadata?: Record<string, any>;
}

export function extractClientInfo(request?: Request | null): {
  ip: string;
  userAgent: string;
  device: string;
  browser: string;
} {
  if (!request) {
    return { ip: '127.0.0.1', userAgent: 'Internal / Server', device: 'Server', browser: 'Internal' };
  }

  const headers = request.headers;
  const forwardedFor = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip');
  
  let ip = cfConnectingIp || realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : '') || '127.0.0.1';
  if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';

  const userAgent = headers.get('user-agent') || 'Unknown';
  let device = 'كمبيوتر شخصي (Desktop)';
  if (/mobile|android|iphone|ipad/i.test(userAgent)) {
    device = /tablet|ipad/i.test(userAgent) ? 'جهاز لوحي (Tablet)' : 'هاتف ذكي (Mobile)';
  }

  let browser = 'متصفح ويب';
  if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Google Chrome';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Apple Safari';
  else if (/firefox/i.test(userAgent)) browser = 'Mozilla Firefox';
  else if (/edg/i.test(userAgent)) browser = 'Microsoft Edge';

  return { ip, userAgent, device, browser };
}

export async function recordAuditLogServer(
  request: Request | null,
  entry: {
    actor: {
      username: string;
      role: "admin" | "accounting" | "operations" | "system" | "client";
      name: string;
      ip?: string;
    };
    action: string;
    actionTitleAr: string;
    category: "auth" | "quotation" | "financial" | "hr" | "project" | "security" | "settings";
    targetId?: string;
    targetType?: string;
    details: string;
    severity?: "info" | "warning" | "danger" | "success";
    metadata?: Record<string, any>;
  }
) {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const clientInfo = extractClientInfo(request);

    const logDoc: AuditLogItem = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor: {
        username: entry.actor.username,
        role: entry.actor.role,
        name: entry.actor.name,
        ip: entry.actor.ip || clientInfo.ip,
        userAgent: clientInfo.userAgent,
        device: clientInfo.device,
        browser: clientInfo.browser,
      },
      action: entry.action,
      actionTitleAr: entry.actionTitleAr,
      category: entry.category,
      targetId: entry.targetId,
      targetType: entry.targetType,
      details: entry.details,
      severity: entry.severity || "info",
      metadata: entry.metadata || {},
    };

    await db.collection('audit_logs').insertOne(logDoc);
    return logDoc;
  } catch (err) {
    console.error('Failed to write audit log to database:', err);
    return null;
  }
}

// Track failed login attempts for firewall brute-force mitigation
export async function trackLoginAttempt(
  request: Request,
  username: string,
  success: boolean,
  role?: string,
  actorName?: string
) {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_dubai_db');
    const clientInfo = extractClientInfo(request);
    const ip = clientInfo.ip;

    const security = (await db.collection('security_settings').findOne({ id: 'firewall_settings' })) || {
      firewallEnabled: true,
      bruteForceProtection: true,
      maxFailedAttempts: 5,
      ipWhitelist: ['127.0.0.1'],
      ipBlacklist: [],
      blockedIps: [],
      activeSessions: [],
    };

    if (success) {
      // Clear failed attempts counter for this IP
      await db.collection('failed_attempts').deleteMany({ ip });

      // Record active session
      const newSession = {
        id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username,
        role: role || 'admin',
        name: actorName || username,
        ip,
        device: clientInfo.device,
        browser: clientInfo.browser,
        loggedInAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      // Keep up to 25 latest active sessions
      const existingSessions = (security.activeSessions || []).filter(
        (s: any) => s.username !== username || s.ip !== ip
      );
      existingSessions.unshift(newSession);

      await db.collection('security_settings').updateOne(
        { id: 'firewall_settings' },
        { 
          $set: { 
            activeSessions: existingSessions.slice(0, 25),
            updatedAt: new Date().toISOString()
          } 
        },
        { upsert: true }
      );

      // Audit Log
      await recordAuditLogServer(request, {
        actor: {
          username,
          role: (role as any) || "admin",
          name: actorName || username,
          ip,
        },
        action: "AUTH_LOGIN_SUCCESS",
        actionTitleAr: "تسجيل دخول ناجح إلى النظام",
        category: "auth",
        details: `قام المستخدم (${username} - ${actorName || ''}) بتسجيل الدخول بنجاح من جهاز [${clientInfo.device} / ${clientInfo.browser}] وعنوان IP [${ip}].`,
        severity: "success",
      });

      return { allowed: true };
    } else {
      // Failed attempt
      const now = new Date();
      await db.collection('failed_attempts').insertOne({
        ip,
        username,
        timestamp: now.toISOString(),
      });

      const failedCount = await db.collection('failed_attempts').countDocuments({ ip });

      // Audit Log
      await recordAuditLogServer(request, {
        actor: {
          username: username || "unknown",
          role: "system",
          name: "محاولة غير مصرح بها",
          ip,
        },
        action: "AUTH_LOGIN_FAILED",
        actionTitleAr: "محاولة تسجيل دخول فاشلة",
        category: "security",
        details: `محاولة دخول فاشلة بالاسم (${username}) من عنوان IP [${ip}] باستخدام جهاز [${clientInfo.device}]. المحاولة رقم ${failedCount}.`,
        severity: failedCount >= 3 ? "danger" : "warning",
      });

      // If exceeds max attempts and brute force is enabled, block IP
      const maxAllowed = security.maxFailedAttempts || 5;
      if (security.bruteForceProtection && failedCount >= maxAllowed) {
        const isWhitelisted = (security.ipWhitelist || []).includes(ip);
        if (!isWhitelisted) {
          const blockedList = security.blockedIps || [];
          if (!blockedList.some((b: any) => b.ip === ip)) {
            blockedList.unshift({
              ip,
              reason: `تجاوز الحد الأقصى للمحاولات الفاشلة (${failedCount}/${maxAllowed})`,
              blockedAt: new Date().toISOString(),
              attemptsCount: failedCount,
            });

            await db.collection('security_settings').updateOne(
              { id: 'firewall_settings' },
              { $set: { blockedIps: blockedList, updatedAt: new Date().toISOString() } },
              { upsert: true }
            );

            await recordAuditLogServer(request, {
              actor: { username: "FIREWALL_SYSTEM", role: "system", name: "جدار الحماية التلقائي", ip },
              action: "FIREWALL_IP_BLOCKED",
              actionTitleAr: "حظر عنوان IP مشبوه بواسطة جدار الحماية",
              category: "security",
              details: `تم تفعيل الحظر التلقائي للعنوان [${ip}] بعد رصد هجوم محتمل لتخمين كلمات المرور (Brute Force Protection).`,
              severity: "danger",
            });
          }
        }
      }

      return { allowed: true, failedCount };
    }
  } catch (err) {
    console.error('Error tracking login attempt:', err);
    return { allowed: true };
  }
}

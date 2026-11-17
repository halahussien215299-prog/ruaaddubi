import { NextRequest } from 'next/server';

export function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw.trim();
  // Return last 9 digits if length >= 9
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

export function extractDocumentPhones(doc: any): string[] {
  if (!doc) return [];
  const phones = new Set<string>();

  const fields = [
    'contactNo',
    'phone',
    'clientPhone',
    'firstPartyPhone',
    'secondPartyPhone',
  ];

  for (const field of fields) {
    if (doc[field] && typeof doc[field] === 'string') {
      const norm = normalizePhone(doc[field]);
      if (norm) phones.add(norm);
    }
  }

  return Array.from(phones);
}

export function isClientAuthorizedForDocument(doc: any, request: NextRequest | Request): { allowed: boolean; isAdmin: boolean; clientPhone: string | null } {
  // Check Admin Session Cookie
  let cookieHeader = '';
  if ('cookies' in request && typeof (request as any).cookies?.get === 'function') {
    const sessionToken = (request as any).cookies.get('nexus_session')?.value;
    const expectedToken = process.env.SESSION_TOKEN || 'ruaad_secure_session_token_2026_xyz';
    if (sessionToken && sessionToken === expectedToken) {
      return { allowed: true, isAdmin: true, clientPhone: null };
    }
    const clientPhoneCookie = (request as any).cookies.get('ruaad_client_phone')?.value;
    if (clientPhoneCookie) {
      cookieHeader = clientPhoneCookie;
    }
  } else if ('headers' in request) {
    cookieHeader = request.headers.get('cookie') || '';
  }

  // Parse ruaad_client_phone from cookie string if needed
  let clientPhone: string | null = null;
  if (cookieHeader.includes('ruaad_client_phone=')) {
    const match = cookieHeader.match(/ruaad_client_phone=([^;]+)/);
    if (match && match[1]) {
      clientPhone = decodeURIComponent(match[1]);
    }
  } else if (cookieHeader && !cookieHeader.includes('=')) {
    clientPhone = cookieHeader;
  }

  if (!clientPhone) {
    return { allowed: false, isAdmin: false, clientPhone: null };
  }

  const normClientPhone = normalizePhone(clientPhone);
  if (!normClientPhone) {
    return { allowed: false, isAdmin: false, clientPhone: null };
  }

  const docPhones = extractDocumentPhones(doc);
  const isMatch = docPhones.some(dp => dp === normClientPhone || dp.endsWith(normClientPhone) || normClientPhone.endsWith(dp));

  return {
    allowed: isMatch,
    isAdmin: false,
    clientPhone,
  };
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('nexus_session')?.value;
  const expectedToken = process.env.SESSION_TOKEN || 'ruaad_secure_session_token_2026_xyz';

  // 1. Static assets & Login pages are always public
  const isStaticOrAuth = 
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/client') ||
    pathname === '/login' ||
    pathname.startsWith('/executive/login') ||
    pathname.startsWith('/admin/login') ||
    pathname === '/client' ||
    pathname.startsWith('/track/') ||
    pathname === '/track' ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png' ||
    pathname === '/logo.jpg' ||
    pathname === '/stamp.png' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    /\.(png|jpe?g|svg|ico|webp|gif|json)$/i.test(pathname);

  if (isStaticOrAuth) {
    return NextResponse.next();
  }

  // 2. Client View / Sign Routes (ONLY sign or view pages, NOT edit/new pages)
  // e.g. /contract/123/sign or /contract/sign/123
  const isClientSignOrView = 
    /\/contract\/[^\/]+\/sign\/?$/.test(pathname) ||
    /\/certificate\/[^\/]+\/sign\/?$/.test(pathname) ||
    /\/quotation\/[^\/]+\/view\/?$/.test(pathname) ||
    /\/receipt\/[^\/]+\/view\/?$/.test(pathname) ||
    /\/letter\/[^\/]+\/view\/?$/.test(pathname) ||
    /\/track\/[^\/]+\/?$/.test(pathname);

  // Public API GET endpoints required for loading the document on sign/view pages
  const isPublicReadApi = 
    (request.method === 'GET' && (
      pathname.startsWith('/api/contracts/') ||
      pathname.startsWith('/api/certificates/') ||
      pathname.startsWith('/api/quotations/') ||
      pathname.startsWith('/api/receipts/') ||
      pathname.startsWith('/api/letters/') ||
      pathname.startsWith('/api/projects/') ||
      pathname === '/api/settings'
    ));

  if (isClientSignOrView || isPublicReadApi) {
    return NextResponse.next();
  }

  // 3. Any other route (including /contract/[id] editing, /contract/new, /settings, API POST/DELETE) REQUIRES ADMIN SESSION
  if (!sessionToken || sessionToken !== expectedToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

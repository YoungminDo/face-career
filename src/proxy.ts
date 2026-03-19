import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 보호된 라우트: 비로그인 시 /login 리다이렉트
  const PROTECTED = ['/diagnosis', '/result', '/report', '/mypage'];
  const isProtected = PROTECTED.some(p => req.nextUrl.pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 로그인 상태에서 /login 접근 시 홈으로
  if (req.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/diagnosis/:path*', '/result/:path*', '/report/:path*', '/mypage/:path*', '/login'],
};
import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Allow login page and api routes through
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const auth = request.cookies.get('wm_auth')
  if (!auth || auth.value !== process.env.AUTH_TOKEN) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

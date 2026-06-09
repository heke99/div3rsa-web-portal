import { NextResponse, type NextRequest } from 'next/server'

const ACCOUNTING_HOST = 'accounting.div3rsa.com'
const passthroughPrefixes = ['/login', '/reset-password', '/auth', '/api', '/_next', '/favicon.ico', '/onboarding/change-password']

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  if (host !== ACCOUNTING_HOST) return NextResponse.next()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  if (pathname === '/' || pathname === '/dashboard') {
    url.pathname = '/accounting'
    return NextResponse.rewrite(url)
  }

  if (pathname.startsWith('/accounting') || passthroughPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  url.pathname = `/accounting${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Build a response we can mutate cookies on
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session (rotates tokens if needed)
  const { data: { user } } = await supabase.auth.getUser()

  const isLoggedIn = !!user
  const isLoginPage = pathname === '/login'
  const isAdminRoute = pathname.startsWith('/admin')
  const isParentRoute = pathname.startsWith('/parent')

  // Unauthenticated → login
  if (!isLoggedIn && (isAdminRoute || isParentRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Already logged in → don't show login page
  if (isLoggedIn && isLoginPage) {
    // Determine role to redirect correctly
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const dest = profile?.role === 'admin' ? '/admin' : '/parent'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Role mismatch checks (prevent a parent accessing /admin and vice versa)
  if (isLoggedIn && (isAdminRoute || isParentRoute)) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (isAdminRoute && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/parent', request.url))
    }
    if (isParentRoute && profile?.role !== 'parent') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}

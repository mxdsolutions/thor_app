import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Middleware Error: Missing Supabase environment variables.')
        return response
    }

    try {
        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.getClaims()
        const isAuthenticated = !error && !!data?.claims?.sub

        const isDashboardOrOnboarding =
            request.nextUrl.pathname.startsWith('/dashboard') ||
            request.nextUrl.pathname.startsWith('/onboarding')

        if (!isAuthenticated && isDashboardOrOnboarding) {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }

        // Admin-only gate: if authenticated, verify user has admin role
        if (isAuthenticated && isDashboardOrOnboarding) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.claims.sub as string)
                .single()

            if (!profile || profile.role !== 'admin') {
                // Sign out the non-admin user and redirect to login
                await supabase.auth.signOut()
                const url = request.nextUrl.clone()
                url.pathname = '/'
                url.searchParams.set('error', 'admin_only')
                return NextResponse.redirect(url)
            }
        }

        const isAuthRoute =
            request.nextUrl.pathname === '/' ||
            request.nextUrl.pathname.startsWith('/signup') ||
            request.nextUrl.pathname.startsWith('/forgot-password')
            // Note: /reset-password is intentionally excluded — after PKCE code exchange the
            // user is temporarily authenticated as a recovery session and must reach the page.

        if (isAuthenticated && isAuthRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    } catch (e) {
        console.error('Middleware error:', e)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

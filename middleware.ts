import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// In-memory tenant cache (module scope persists across requests in the same worker)
const tenantCache = new Map<string, { tenantId: string; slug: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

// Platform domains that are NOT tenant custom domains
const PLATFORM_DOMAINS = [
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'admin.mxdsolutions.com.au',
    'localhost',
    'localhost:3000',
    'localhost:3001',
].filter(Boolean);

function isPlatformDomain(hostname: string): boolean {
    return PLATFORM_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
}

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

        // --- Tenant Resolution ---
        const hostname = request.headers.get('host')?.replace(/:\d+$/, '') || ''
        let tenantId: string | null = null
        let tenantSlug: string | null = null

        if (!isPlatformDomain(hostname)) {
            // Custom domain: look up tenant by domain
            const cached = tenantCache.get(`domain:${hostname}`)
            if (cached && cached.expiresAt > Date.now()) {
                tenantId = cached.tenantId
                tenantSlug = cached.slug
            } else {
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('id, slug')
                    .eq('custom_domain', hostname)
                    .eq('domain_verified', true)
                    .single()

                if (tenant) {
                    tenantId = tenant.id
                    tenantSlug = tenant.slug
                    tenantCache.set(`domain:${hostname}`, {
                        tenantId: tenant.id,
                        slug: tenant.slug,
                        expiresAt: Date.now() + CACHE_TTL_MS,
                    })
                }
            }
        } else {
            // Check for subdomain (e.g., companyslug.platform.com)
            const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'admin.mxdsolutions.com.au'
            const fullHost = request.headers.get('host') || ''
            if (fullHost.endsWith(`.${platformDomain}`) && fullHost !== platformDomain) {
                const subdomain = fullHost.replace(`.${platformDomain}`, '').split(':')[0]
                if (subdomain && subdomain !== 'www') {
                    const cached = tenantCache.get(`slug:${subdomain}`)
                    if (cached && cached.expiresAt > Date.now()) {
                        tenantId = cached.tenantId
                        tenantSlug = cached.slug
                    } else {
                        const { data: tenant } = await supabase
                            .from('tenants')
                            .select('id, slug')
                            .eq('slug', subdomain)
                            .eq('status', 'active')
                            .single()

                        if (tenant) {
                            tenantId = tenant.id
                            tenantSlug = tenant.slug
                            tenantCache.set(`slug:${subdomain}`, {
                                tenantId: tenant.id,
                                slug: tenant.slug,
                                expiresAt: Date.now() + CACHE_TTL_MS,
                            })
                        }
                    }
                }
            }
        }

        // Fall back to JWT claims for tenant
        if (!tenantId && isAuthenticated && data?.claims) {
            tenantId = (data.claims as Record<string, unknown>).app_metadata
                ? ((data.claims as Record<string, unknown>).app_metadata as Record<string, string>)?.active_tenant_id || null
                : null
        }

        // Inject tenant context headers
        if (tenantId) {
            response.headers.set('x-tenant-id', tenantId)
            if (tenantSlug) {
                response.headers.set('x-tenant-slug', tenantSlug)
            }
        }

        // --- Auth Routing ---
        const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
        const isOnboarding = request.nextUrl.pathname.startsWith('/onboarding')
        const isPlatformAdmin = request.nextUrl.pathname.startsWith('/platform-admin')

        if (!isAuthenticated && (isDashboard || isOnboarding || isPlatformAdmin)) {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
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

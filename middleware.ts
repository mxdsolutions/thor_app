import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// In-memory tenant cache (module scope persists across requests in the same worker)
const tenantCache = new Map<string, { tenantId: string; slug: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds
const CACHE_MAX_SIZE = 500;

function getCachedTenant(key: string) {
    const cached = tenantCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        tenantCache.delete(key);
        return null;
    }
    return cached;
}

function setCachedTenant(key: string, tenantId: string, slug: string) {
    // Evict expired entries if cache is getting large
    if (tenantCache.size >= CACHE_MAX_SIZE) {
        const now = Date.now();
        for (const [k, v] of tenantCache) {
            if (v.expiresAt <= now) tenantCache.delete(k);
        }
        // If still too large after evicting expired, clear oldest half
        if (tenantCache.size >= CACHE_MAX_SIZE) {
            const keys = [...tenantCache.keys()];
            for (let i = 0; i < keys.length / 2; i++) tenantCache.delete(keys[i]);
        }
    }
    tenantCache.set(key, { tenantId, slug, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Platform domains that are NOT tenant custom domains
const PLATFORM_DOMAINS = [
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'admin.mxdsolutions.com.au',
    'localhost',
    'localhost:3000',
    'localhost:3001',
    'localhost:3002',
].filter(Boolean);

function isPlatformDomain(hostname: string): boolean {
    return PLATFORM_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
}

type SupabaseMiddlewareClient = ReturnType<typeof createServerClient>

interface TenantInfo {
    tenantId: string
    slug: string
}

/** Look up tenant by verified custom domain, with caching. */
async function resolveCustomDomainTenant(
    supabase: SupabaseMiddlewareClient,
    hostname: string
): Promise<TenantInfo | null> {
    const cached = getCachedTenant(`domain:${hostname}`)
    if (cached) {
        return { tenantId: cached.tenantId, slug: cached.slug }
    }

    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug')
        .eq('custom_domain', hostname)
        .eq('domain_verified', true)
        .single()

    if (tenant) {
        setCachedTenant(`domain:${hostname}`, tenant.id, tenant.slug)
        return { tenantId: tenant.id, slug: tenant.slug }
    }

    return null
}

/** Look up tenant by subdomain (e.g. companyslug.platform.com), with caching. */
async function resolveSubdomainTenant(
    supabase: SupabaseMiddlewareClient,
    host: string
): Promise<TenantInfo | null> {
    const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'admin.mxdsolutions.com.au'
    if (!host.endsWith(`.${platformDomain}`) || host === platformDomain) {
        return null
    }

    const subdomain = host.replace(`.${platformDomain}`, '').split(':')[0]
    if (!subdomain || subdomain === 'www') {
        return null
    }

    const cached = getCachedTenant(`slug:${subdomain}`)
    if (cached) {
        return { tenantId: cached.tenantId, slug: cached.slug }
    }

    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, slug')
        .eq('slug', subdomain)
        .eq('status', 'active')
        .single()

    if (tenant) {
        setCachedTenant(`slug:${subdomain}`, tenant.id, tenant.slug)
        return { tenantId: tenant.id, slug: tenant.slug }
    }

    return null
}

/** Extract tenant ID from JWT app_metadata claims. */
function resolveTenantFromJWT(claims: Record<string, unknown>): string | null {
    const appMetadata = claims.app_metadata as Record<string, string> | undefined
    return appMetadata?.active_tenant_id || null
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
        const fullHost = request.headers.get('host') || ''
        let tenantId: string | null = null
        let tenantSlug: string | null = null

        if (!isPlatformDomain(hostname)) {
            const result = await resolveCustomDomainTenant(supabase, hostname)
            if (result) {
                tenantId = result.tenantId
                tenantSlug = result.slug
            }
        } else {
            const result = await resolveSubdomainTenant(supabase, fullHost)
            if (result) {
                tenantId = result.tenantId
                tenantSlug = result.slug
            }
        }

        // Fall back to JWT claims for tenant
        if (!tenantId && isAuthenticated && data?.claims) {
            tenantId = resolveTenantFromJWT(data.claims as Record<string, unknown>)
        }

        // Inject tenant context headers (set on request so server components can read them)
        if (tenantId) {
            request.headers.set('x-tenant-id', tenantId)
            if (tenantSlug) {
                request.headers.set('x-tenant-slug', tenantSlug)
            }
            // Recreate response with updated request headers
            response = NextResponse.next({
                request: { headers: request.headers },
            })
        }

        // --- Auth Routing ---
        const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
        const isOnboarding = request.nextUrl.pathname.startsWith('/onboarding')
        const isPlatformAdmin = request.nextUrl.pathname.startsWith('/platform-admin')
        const isReport = request.nextUrl.pathname.startsWith('/report')

        if (!isAuthenticated && (isDashboard || isOnboarding || isPlatformAdmin || isReport)) {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }

        // Platform admin gate: only users with is_platform_admin can access /platform-admin/*
        // Uses getUser() (server call) instead of JWT claims because app_metadata
        // updates may not be reflected in the cached JWT token immediately.
        if (isPlatformAdmin && isAuthenticated) {
            const { data: { user } } = await supabase.auth.getUser();
            const isAdmin = user?.app_metadata?.is_platform_admin === true;
            if (!isAdmin) {
                const url = request.nextUrl.clone()
                url.pathname = '/dashboard'
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

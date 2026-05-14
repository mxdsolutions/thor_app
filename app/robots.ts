import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://buildthor.com.au";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/", "/features", "/pricing", "/about", "/contact", "/login", "/signup"],
                disallow: ["/dashboard", "/platform-admin", "/onboarding", "/api", "/auth", "/r", "/report"],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}

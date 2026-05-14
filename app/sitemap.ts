import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://buildthor.com.au";

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();
    return [
        { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
        { url: `${SITE_URL}/features`, lastModified, changeFrequency: "monthly", priority: 0.95 },
        { url: `${SITE_URL}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.9 },
        { url: `${SITE_URL}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
        { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "monthly", priority: 0.6 },
        { url: `${SITE_URL}/login`, lastModified, changeFrequency: "yearly", priority: 0.5 },
        { url: `${SITE_URL}/signup`, lastModified, changeFrequency: "yearly", priority: 0.7 },
    ];
}

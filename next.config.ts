import path from "path";
import type { NextConfig } from "next";

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  // Ensure Turbopack uses web_admin as project root in monorepo
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Temporary pre-launch lockdown — public marketing + new-user signup all
  // funnel into the waiting list. /login and password reset stay reachable so
  // existing accounts can still get in. Remove this block at launch.
  async redirects() {
    const targets = [
      "/",
      "/features",
      "/features/:path*",
      "/pricing",
      "/pricing/:path*",
      "/about",
      "/about/:path*",
      "/contact",
      "/contact/:path*",
      "/signup",
      "/signup/:path*",
    ];
    return targets.map((source) => ({
      source,
      destination: "/waitinglist",
      permanent: false,
    }));
  },
};

export default nextConfig;

import path from "path";
import type { NextConfig } from "next";

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
    outputFileTracingRoot: projectRoot,
};

export default nextConfig;

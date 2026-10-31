import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  experimental: {
    // serverActions enabled by default in Next.js 15
  },
};

export default nextConfig;

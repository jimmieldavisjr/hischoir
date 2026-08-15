import type { NextConfig } from "next";

/**
 * Vercel builds and serves this app directly from `.next`; no standalone
 * output or asset copying is involved. The API lives on Railway and is
 * reached over the network via NEXT_PUBLIC_API_URL.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
};

export default nextConfig;

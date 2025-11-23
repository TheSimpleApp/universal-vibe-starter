import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 with Turbopack (cutting-edge!)
  // Known issue: Production builds fail on Windows due to Turbopack path bug
  // Workaround: Build on Mac/Linux or use CI/CD (GitHub Actions, Vercel)
  // Dev works perfectly everywhere: npm run dev --turbo
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      { hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
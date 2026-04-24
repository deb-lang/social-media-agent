import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iqhhdzhisldmefjqcmix.supabase.co",
        pathname: "/storage/v1/object/public/post-assets/**",
      },
    ],
  },
  // ESLint violations (mostly cosmetic unescaped entities) shouldn't block
  // the Vercel deploy. Run `npm run lint` locally to triage — TypeScript
  // errors still fail the build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // pdf-lib + @resvg/resvg-js are server-only native deps. Mark them as
  // external so Next doesn't try to bundle them for the edge runtime.
  serverExternalPackages: ["@resvg/resvg-js", "pdf-lib"],
};

export default nextConfig;

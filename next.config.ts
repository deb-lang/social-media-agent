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
  // pdf-lib + @resvg/resvg-js are server-only native deps. Mark them as
  // external so Next doesn't try to bundle them for the edge runtime.
  // (Next.js 16 no longer runs ESLint at build time — `next lint` was
  // removed; lint with `eslint .` separately.)
  serverExternalPackages: ["@resvg/resvg-js", "pdf-lib"],

  // Note: TTF font files live in /public/fonts/ which Vercel auto-bundles
  // with serverless functions — no outputFileTracingIncludes needed.
};

export default nextConfig;

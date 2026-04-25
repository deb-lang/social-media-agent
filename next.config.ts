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

  // CRITICAL: Vercel's serverless bundler only ships JS files imported via
  // `import`/`require`. Static assets (font files read via fs.readFileSync)
  // are excluded by default → Resvg renders blank text in production.
  // Force-include the Poppins + Inter woff2 files for every route that
  // calls lib/image-generator.ts.
  outputFileTracingIncludes: {
    "/api/generate": [
      "./node_modules/@fontsource/poppins/files/poppins-latin-*-normal.woff2",
      "./node_modules/@fontsource/inter/files/inter-latin-*-normal.woff2",
      "./public/logo.png",
    ],
    "/api/posts/[id]/regenerate": [
      "./node_modules/@fontsource/poppins/files/poppins-latin-*-normal.woff2",
      "./node_modules/@fontsource/inter/files/inter-latin-*-normal.woff2",
      "./public/logo.png",
    ],
    "/api/recycle/scan": [
      "./node_modules/@fontsource/poppins/files/poppins-latin-*-normal.woff2",
      "./node_modules/@fontsource/inter/files/inter-latin-*-normal.woff2",
      "./public/logo.png",
    ],
  },
};

export default nextConfig;

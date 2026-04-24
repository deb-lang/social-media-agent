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
};

export default nextConfig;

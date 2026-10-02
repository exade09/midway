import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The share-card renderer reads its fonts and backdrop from disk at request time.
  outputFileTracingIncludes: {
    "/r/[id]/opengraph-image": ["./assets/**/*"],
  },
  images: { unoptimized: true },
};

export default nextConfig;

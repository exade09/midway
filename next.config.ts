import type { NextConfig } from "next";

const securityHeaders = [
  // A site that asks for wallet signatures must never be framed by someone else's page.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The share-card renderer reads its fonts and backdrop from disk at request time.
  outputFileTracingIncludes: {
    "/r/[id]/opengraph-image": ["./assets/fonts/**/*"],
    "/opengraph-image": ["./assets/fonts/**/*"],
  },
  images: { unoptimized: true },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Art is cached for a day and refreshed in the background, so swapping a file under the same name still lands.
      { source: "/art/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
};

export default nextConfig;

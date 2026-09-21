import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cover buku di /rekomendasi diambil langsung dari sumber eksternal
    // (belum di-upload ke public/), jadi domainnya perlu di-whitelist
    // biar next/image mau ngoptimasi & nge-render-nya.
    remotePatterns: [
      { protocol: "https", hostname: "api.seekquel.app" },
      { protocol: "https", hostname: "cdn.gramedia.com" },
    ],
  },
};

export default nextConfig;

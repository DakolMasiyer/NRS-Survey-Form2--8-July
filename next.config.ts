import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The checklist was first published at /spaff; keep any shared links and QR codes working.
      { source: "/spaff", destination: "/staff", permanent: false },
    ];
  },
};

export default nextConfig;

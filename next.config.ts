import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Printed QR codes were first issued for survey.dako.studio; keep them working on the new host.
      {
        source: "/:path*",
        has: [{ type: "host", value: "survey.dako.studio" }],
        destination: "https://nrssurvey.dako.studio/:path*",
        permanent: false,
      },
      // The checklist was first published at /spaff; keep any shared links and QR codes working.
      { source: "/spaff", destination: "/staff", permanent: false },
    ];
  },
};

export default nextConfig;

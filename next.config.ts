import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // @ts-ignore
  allowedDevOrigins: ["http://192.168.2.107:3000", "192.168.2.107"]
};

export default nextConfig;
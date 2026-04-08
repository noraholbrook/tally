import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  experimental: { serverActions: { allowedOrigins: ["localhost:3000", "tally-production-d8df.up.railway.app"] } },
};
export default nextConfig;

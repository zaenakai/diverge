import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["../../packages/core"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;

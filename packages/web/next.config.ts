import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["../../packages/core"],
  serverExternalPackages: ["pg"],
  output: "standalone",

};

export default nextConfig;

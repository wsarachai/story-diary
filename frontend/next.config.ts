import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the slim Docker runtime image (docker-compose.yml at repo root).
  output: "standalone",
};

export default nextConfig;

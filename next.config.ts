import type { NextConfig } from "next";
import { readProjectConfig } from "./scripts/project-config.mjs";
readProjectConfig();
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: { unoptimized: true },
  poweredByHeader: false,
  devIndicators: false,
};
export default nextConfig;

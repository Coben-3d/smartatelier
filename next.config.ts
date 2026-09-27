import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["sharp"],
  devIndicators: false,
  turbopack: { root: process.cwd() },
};
export default config;

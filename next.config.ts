import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["sharp", "@openai/codex-sdk"],
  devIndicators: false,
  turbopack: { root: process.cwd() },
};
export default config;

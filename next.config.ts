// next.config.ts
import path from "node:path";
import type { NextConfig } from "next";

const allowedOriginsEnv = process.env.ALLOWED_DEV_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: allowedOrigins,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@worldcoin/mini-apps-ui-kit-react/styles.css": path.join(
        process.cwd(),
        "node_modules/@worldcoin/mini-apps-ui-kit-react/dist/globals.css",
      ),
    };

    return config;
  },
};

export default nextConfig;


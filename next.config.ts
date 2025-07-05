// next.config.ts
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
};

export default nextConfig;


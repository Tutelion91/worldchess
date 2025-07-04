// next.config.ts
import type { NextConfig } from "next";

const allowedOriginsEnv = process.env.ALLOWED_DEV_ORIGINS || ''
const allowedOrigins = allowedOriginsEnv
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

// Always allow the local dev origin to avoid warnings when ALLOWED_DEV_ORIGINS
// is not configured. Add additional domains via the environment variable.
if (allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:3000')
}

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: allowedOrigins,
  },
};

export default nextConfig;


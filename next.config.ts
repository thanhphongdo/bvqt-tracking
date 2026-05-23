import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phone/tablet on local LAN to hit `pnpm dev` server (e.g. 192.168.x.x:3000).
  // Add additional IPs/hosts here if needed.
  allowedDevOrigins: ["192.168.1.99", "192.168.1.*", "10.0.0.*"],
};

export default nextConfig;

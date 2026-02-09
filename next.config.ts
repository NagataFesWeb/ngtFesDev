import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow access from local network (LAN) IP
  // Note: This option suppresses the 'Cross origin request detected' warning in dev
  // and allows Server Actions to work across the network.
  experimental: {
    serverActions: {
      allowedOrigins: ['192.168.11.21:3000', 'localhost:3000']
    }
  }
};

export default nextConfig;

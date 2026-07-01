import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

function pwaDeploymentId() {
  if (process.env.NEXT_DEPLOYMENT_ID) {
    return process.env.NEXT_DEPLOYMENT_ID;
  }

  try {
    const source = readFileSync(resolve("public", "admin-sw-version.js"), "utf8");
    return source.match(/=\s*"([^"]+)"/)?.[1] ?? "development";
  } catch {
    return "development";
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  deploymentId: pwaDeploymentId(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8055"
      }
    ]
  }
};

export default nextConfig;

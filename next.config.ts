import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent folder would otherwise be inferred as root.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;

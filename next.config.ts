import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Prevents Turbopack from mis-detecting the workspace root when a stray
  // lockfile exists elsewhere on the machine (e.g. in the home directory) —
  // without this, it can end up file-watching far more than this project,
  // which spikes CPU/fan noise and can crash the dev server.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

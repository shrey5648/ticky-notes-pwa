import path from "node:path";
import { fileURLToPath } from "node:url";

import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: { skipWaiting: true },
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A lockfile exists further up the tree; pin the trace root to this project
  // so the build doesn't infer the wrong workspace.
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "www.google.com" },
    ],
  },
  async redirects() {
    return [
      // Sign-up and sign-in are one flow: a one-time code both creates the
      // account and signs it in. Kept so older links don't 404.
      { source: "/register", destination: "/login", permanent: false },
    ];
  },
};

export default withPWA(nextConfig);

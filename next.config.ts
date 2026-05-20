import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const isProd = process.env.NODE_ENV === "production";

const withPWA = withPWAInit({
  dest: "public",
  disable: !isProd,
});

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/website-invoice-management" : undefined,
  images: {
    unoptimized: true,
  },
};

export default withPWA(nextConfig);

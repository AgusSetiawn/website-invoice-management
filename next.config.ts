import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const isProd = process.env.NODE_ENV === "production";
const isCapacitor = process.env.IS_CAPACITOR === "true";

const withPWA = withPWAInit({
  dest: "public",
  disable: !isProd || isCapacitor,
});

const nextConfig: NextConfig = {
  output: "export",
  basePath: isCapacitor ? undefined : (isProd ? "/website-invoice-management" : undefined),
  images: {
    unoptimized: true,
  },
};

export default withPWA(nextConfig);

import type { NextConfig } from "next";

const domains: string[] = [];
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    domains.push(url.hostname);
  } catch (e) {
    console.warn("Invalid NEXT_PUBLIC_SUPABASE_URL", e);
  }
}

const nextConfig: NextConfig = {
  images: {
    domains,
  },
};

export default nextConfig;

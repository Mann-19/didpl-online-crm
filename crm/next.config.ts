import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['jspdf', 'jspdf-autotable'],
  experimental: {
    optimizePackageImports: ['@supabase/ssr', '@supabase/supabase-js'],
  },
};

export default nextConfig;
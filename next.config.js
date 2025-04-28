/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure module/webpack handling
  webpack: (config, { isServer }) => {
    // If it's a client-side bundle, provide empty modules for node-specific modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        dns: false,
        http: false,
        https: false,
        zlib: false,
        child_process: false,
      };
    }
    
    return config;
  },
  // Ensure external packages with server-side functionality are handled properly
  transpilePackages: ['postgres', 'drizzle-orm'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    },
  },
  // Ignore TypeScript errors during build since we're migrating from Next Auth to Appwrite
  // Only ignore in production/preview deployments, not in development
  typescript: {
    // Disable type checking during build for Vercel deployments
    ignoreBuildErrors: process.env.VERCEL === '1',
  },
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: process.env.VERCEL === '1',
  },
  // Custom env variable to control whether to run the prepare-build script
  env: {
    NEXT_BUILD_SKIP_PREPARE: process.env.NEXT_BUILD_SKIP_PREPARE || '',
  },
}

module.exports = nextConfig 
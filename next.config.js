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
    serverActions: true,
  },
}

module.exports = nextConfig 
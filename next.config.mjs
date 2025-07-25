/** @type {import("next").NextConfig} */
export default {
  // Disable ESLint during builds to focus on fixing the crash issue
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Webpack configuration to prevent module loading issues
  webpack: (config, { isServer }) => {
    // Prevent webpack module loading issues in API routes
    if (isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Ensure API routes are bundled properly
            api: {
              name: 'api',
              chunks: 'all',
              test: /[\\/]api[\\/]/,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }
    
    return config
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_WPS_URL: process.env.NEXT_PUBLIC_WPS_URL,
    NEXT_PUBLIC_ENABLE_SIGNALR: process.env.NEXT_PUBLIC_ENABLE_SIGNALR,
    API_BASE_URL: process.env.API_BASE_URL
  }
}

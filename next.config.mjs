import withSerwistInit from "@serwist/next"

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disable the SW in development so HMR isn't fighting a cache.
  disable: process.env.NODE_ENV === "development",
  // Reload open clients once a new SW takes control.
  reloadOnOnline: true,
})

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Minimal dev configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Ensure API routes are included in standalone build
  outputFileTracingIncludes: {
    '/api/**/*': ['./app/api/**/*'],
  },
  
  // Set hostname for custom domain support
  env: {
    HOSTNAME: '0.0.0.0',
  },
  
  // Simplified webpack configuration
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'jsdom']
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    
    // Watch options for development
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
          '**/build/**',
          '**/coverage/**'
        ],
        poll: false,
      }
    }
    
    return config
  }
}

export default withSerwist(nextConfig)

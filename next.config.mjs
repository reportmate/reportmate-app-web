/** @type {import("next").NextConfig} */
export default {
  // Minimal dev configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Set explicit output file tracing root - conditional for Docker
  ...(process.env.DOCKER_BUILD ? {} : {
    outputFileTracingRoot: "C:\\Users\\rchristiansen\\DevOps\\ReportMate",
  }),
  
  // Simplified webpack configuration
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'jsdom']
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
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

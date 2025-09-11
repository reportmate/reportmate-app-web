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
  }
}

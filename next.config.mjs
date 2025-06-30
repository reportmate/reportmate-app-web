/** @type {import("next").NextConfig} */
export default {
  // Use standalone output for Docker builds (enables API routes)
  // Use static export only for static hosting deployments
  ...(process.env.DOCKER_BUILD === 'true' ? {
    output: 'standalone',
    eslint: {
      // Disable ESLint during production builds in Docker
      ignoreDuringBuilds: true,
    },
    typescript: {
      // Disable TypeScript checking during production builds in Docker
      ignoreBuildErrors: true,
    },
  } : process.env.STATIC_EXPORT === 'true' ? {
    output: 'export',
    trailingSlash: true,
    skipTrailingSlashRedirect: true,
    distDir: 'out',
  } : {
    // Default to standalone for server-side features
    output: 'standalone',
  }),
  
  // Disable image optimization for static export only
  images: {
    unoptimized: process.env.STATIC_EXPORT === 'true'
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_WPS_URL: process.env.NEXT_PUBLIC_WPS_URL,
    NEXT_PUBLIC_ENABLE_SIGNALR: process.env.NEXT_PUBLIC_ENABLE_SIGNALR,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL
  }
}

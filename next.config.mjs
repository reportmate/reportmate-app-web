/** @type {import("next").NextConfig} */
const nextConfig = {
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

  // Server-side external packages (replaces webpack externals)
  serverExternalPackages: ['canvas', 'jsdom'],

  // Turbopack configuration (default bundler in Next.js 16)
  turbopack: {
    resolveAlias: {
      fs: { browser: './empty-module.js' },
      net: { browser: './empty-module.js' },
      tls: { browser: './empty-module.js' },
    },
  },

  // Webpack configuration (used when explicitly opting into webpack)
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

export default nextConfig

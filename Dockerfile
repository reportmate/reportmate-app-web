# Frontend Dockerfile for Next.js
# Use Node.js 20 LTS for better security and performance
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install pnpm
RUN npm install -g pnpm

# Set environment variable for Docker build
ENV DOCKER_BUILD=true

# Accept build args for version tracking
ARG IMAGE_TAG=unknown
ARG BUILD_TIME=""
ARG BUILD_ID=""

# Set build-time environment variables
ENV CONTAINER_IMAGE_TAG=${IMAGE_TAG}
ENV BUILD_TIME=${BUILD_TIME}
ENV BUILD_ID=${BUILD_ID}

# Build the app
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

# Copy build args from builder stage for runtime
ARG IMAGE_TAG=unknown
ARG BUILD_TIME=""
ARG BUILD_ID=""

# Set runtime environment variables for version tracking
ENV CONTAINER_IMAGE_TAG=${IMAGE_TAG}
ENV BUILD_TIME=${BUILD_TIME}
ENV BUILD_ID=${BUILD_ID}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]

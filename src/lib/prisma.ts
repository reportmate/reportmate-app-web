// Note: Using direct import to avoid TypeScript issues during build
const { PrismaClient } = require('@prisma/client')

// Global variable to store the Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

// Reuse the same Prisma client in development to avoid connection pool exhaustion
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Test database connection
export async function testDatabaseConnection() {
  try {
    await prisma.$connect()
    console.log('[DB] Prisma connected to database successfully')
    return true
  } catch (error) {
    console.error('[DB] Prisma connection failed:', error)
    return false
  }
}

export default prisma

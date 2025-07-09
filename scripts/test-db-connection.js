#!/usr/bin/env node

/**
 * Database connectivity test script
 * Tests connection to PostgreSQL database for ReportMate
 */

const { PrismaClient } = require('@prisma/client')

async function testDatabaseConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  })

  try {
    console.log('🔍 Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Test query execution
    console.log('🔍 Testing query execution...')
    const deviceCount = await prisma.device.count()
    console.log(`✅ Query successful - Found ${deviceCount} devices`)
    
    // Test transaction
    console.log('🔍 Testing transaction...')
    await prisma.$transaction(async (tx) => {
      const result = await tx.device.findFirst()
      console.log(`✅ Transaction successful - Sample device: ${result?.name || 'No devices found'}`)
    })
    
    // Test migration status
    console.log('🔍 Checking migration status...')
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 5
    `
    console.log(`✅ Latest migrations:`)
    migrations.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration.migration_name} (${migration.finished_at})`)
    })
    
    console.log('\n🎉 All database tests passed!')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    
    // Provide helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Possible solutions:')
      console.error('   - Check if PostgreSQL is running')
      console.error('   - Verify DATABASE_URL environment variable')
      console.error('   - For containers: ensure postgres service is up')
    }
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Possible solutions:')
      console.error('   - Check database credentials in DATABASE_URL')
      console.error('   - Verify user exists and has proper permissions')
    }
    
    if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('\n💡 Possible solutions:')
      console.error('   - Run: pnpm prisma migrate deploy')
      console.error('   - Or: pnpm prisma db push')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  console.error('\n💡 Set it with: export DATABASE_URL="postgresql://user:password@host:port/database"')
  process.exit(1)
}

console.log(`🔗 Using database: ${process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@')}`)

testDatabaseConnection()

// Database connection utility for production PostgreSQL
import { Pool } from 'pg'

// Create a connection pool to the production database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000 // Return error after 2 seconds if can't get connection
})

// Test the connection on startup
pool.on('connect', () => {
  console.log('[DB] Connected to production PostgreSQL database')
})

pool.on('error', (err: Error) => {
  console.error('[DB] PostgreSQL pool error:', err)
})

export { pool }

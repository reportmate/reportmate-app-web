#!/bin/bash
# Script to copy problematic events from production to local database
# This will help reproduce the crash locally

echo "🔄 Importing large payload events from production to local database..."

# Source production environment variables
if [ -f "../../.env.production" ]; then
    source ../../.env.production
    PROD_DB_URL="postgresql://reportmate:${DB_PASSWORD}@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require"
else
    echo "❌ .env.production not found"
    exit 1
fi

# Local database URL
LOCAL_DB_URL="postgresql://reportmate:reportmate123@localhost:5432/reportmate"

echo "📊 Finding events with large payloads in production..."

# Export large events from production
psql "$PROD_DB_URL" -c "
COPY (
    SELECT id, device_id, event_type, payload, created_at 
    FROM events 
    WHERE length(payload::text) > 100000 
    ORDER BY length(payload::text) DESC 
    LIMIT 10
) TO STDOUT WITH CSV HEADER
" > large_events.csv

if [ ! -s large_events.csv ]; then
    echo "❌ No large events found in production or connection failed"
    exit 1
fi

echo "📥 Importing large events to local database..."

# Import to local database
psql "$LOCAL_DB_URL" -c "
-- Ensure events table exists
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    device_id TEXT,
    event_type TEXT,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clear existing events to avoid conflicts
DELETE FROM events;
"

# Import the CSV
psql "$LOCAL_DB_URL" -c "\COPY events(id, device_id, event_type, payload, created_at) FROM 'large_events.csv' WITH CSV HEADER"

echo "✅ Large payload events imported successfully!"
echo "🚀 Now run 'pnpm dev' and navigate to the dashboard to reproduce the crash"

# Clean up
rm large_events.csv

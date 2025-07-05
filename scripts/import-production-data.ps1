# PowerShell script to import large payload events from production to local database
# This will help reproduce the crash locally on Windows

Write-Host "🔄 Importing large payload events from production to local database..." -ForegroundColor Cyan

# Check if .env.production exists
$envFile = "..\..\env.production"
if (-Not (Test-Path $envFile)) {
    Write-Host "❌ .env.production not found" -ForegroundColor Red
    exit 1
}

# Read environment variables (you'll need to set these manually or use a .env parser)
Write-Host "📝 Please ensure you have the following environment variables set:" -ForegroundColor Yellow
Write-Host "   - DB_PASSWORD (from Azure PostgreSQL)" -ForegroundColor Yellow
Write-Host "   - Or run this in Git Bash with the shell script version" -ForegroundColor Yellow

# Connection strings
$prodDbUrl = "postgresql://reportmate:${env:DB_PASSWORD}@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require"
$localDbUrl = "postgresql://reportmate:reportmate123@localhost:5432/reportmate"

Write-Host "📊 Finding events with large payloads in production..." -ForegroundColor Cyan

# For Windows, we'll use psql if available, or provide instructions
try {
    # Export large events from production (requires psql in PATH)
    $query = @"
COPY (
    SELECT id, device_id, event_type, payload, created_at 
    FROM events 
    WHERE length(payload::text) > 100000 
    ORDER BY length(payload::text) DESC 
    LIMIT 10
) TO STDOUT WITH CSV HEADER
"@

    & psql $prodDbUrl -c $query > large_events.csv

    if (-Not (Test-Path "large_events.csv") -or (Get-Item "large_events.csv").Length -eq 0) {
        Write-Host "❌ No large events found in production or connection failed" -ForegroundColor Red
        Write-Host "💡 Try Option 1: Connect local dev directly to production database" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "📥 Importing large events to local database..." -ForegroundColor Cyan

    # Import to local database
    $setupQuery = @"
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
"@

    & psql $localDbUrl -c $setupQuery
    & psql $localDbUrl -c "\COPY events(id, device_id, event_type, payload, created_at) FROM 'large_events.csv' WITH CSV HEADER"

    Write-Host "✅ Large payload events imported successfully!" -ForegroundColor Green
    Write-Host "🚀 Now run 'pnpm dev' and navigate to the dashboard to reproduce the crash" -ForegroundColor Green

    # Clean up
    Remove-Item "large_events.csv" -ErrorAction SilentlyContinue

} catch {
    Write-Host "❌ psql not found or connection failed" -ForegroundColor Red
    Write-Host "💡 Alternative: Use Option 1 to connect local dev directly to production database" -ForegroundColor Yellow
    Write-Host "💡 Or install PostgreSQL client tools and run the bash script in Git Bash" -ForegroundColor Yellow
}

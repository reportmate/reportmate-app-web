const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function checkDeviceStatus() {
  try {
    // Check device basic info
    const deviceResult = await pool.query('SELECT id, serial_number, device_id, last_seen, status FROM devices WHERE serial_number = $1', ['0F33V9G25083HJ']);
    
    if (deviceResult.rows.length === 0) {
      console.log('Device not found');
      return;
    }
    
    const device = deviceResult.rows[0];
    console.log('Device row:', device);
    
    if (device.last_seen) {
      const lastSeen = new Date(device.last_seen);
      const now = new Date();
      const hoursDiff = (now - lastSeen) / (1000 * 60 * 60);
      console.log('Hours since last seen:', hoursDiff.toFixed(2));
      console.log('Should be active (< 24h):', hoursDiff < 24);
      console.log('Current time (UTC):', now.toISOString());
      console.log('Last seen (UTC):', lastSeen.toISOString());
    }
    
    // Check for recent events (warning/error)
    const eventsResult = await pool.query(`
      SELECT event_type, created_at, message 
      FROM events 
      WHERE device_id = $1 
      AND created_at >= NOW() - INTERVAL '24 hours'
      AND event_type IN ('warning', 'error')
      ORDER BY created_at DESC
      LIMIT 10
    `, [device.id]);
    
    console.log('\nRecent warning/error events:', eventsResult.rows.length);
    eventsResult.rows.forEach(event => {
      console.log(`  ${event.event_type}: ${event.message} (${event.created_at})`);
    });
    
    // Check install module for errors
    const installsResult = await pool.query('SELECT data FROM installs WHERE device_id = $1', [device.id]);
    if (installsResult.rows.length > 0) {
      const installsData = installsResult.rows[0].data;
      console.log('\nInstalls module data available');
      
      // Look for any errors in install data
      if (installsData.items) {
        const errorItems = installsData.items.filter(item => 
          item.currentStatus && (item.currentStatus.toLowerCase().includes('error') || item.currentStatus.toLowerCase().includes('warning'))
        );
        console.log(`Install items with warnings/errors: ${errorItems.length}`);
        errorItems.forEach(item => {
          console.log(`  ${item.displayName}: ${item.currentStatus}`);
        });
      }
    } else {
      console.log('\nNo installs module data found');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkDeviceStatus();

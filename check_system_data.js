const { Client } = require('pg');

const connectionString = "postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require";
const client = new Client({ connectionString });

client.connect().then(() => {
    // First get the device ID
    return client.query('SELECT id FROM devices WHERE serial_number = $1', ['0F33V9G25083HJ']);
}).then((result) => {
    if (result.rows.length === 0) {
        throw new Error('Device not found');
    }
    const deviceId = result.rows[0].id;
    console.log('Device ID:', deviceId);
    // Now get the system data
    return client.query('SELECT data FROM system WHERE device_id = $1', [deviceId]);
}).then((result) => {
    if (result.rows.length > 0) {
        console.log('System data for device 0F33V9G25083HJ:');
        console.log(JSON.stringify(result.rows[0].data, null, 2));
        
        // Check specifically for operatingSystem data
        const systemData = result.rows[0].data;
        if (systemData.operatingSystem) {
            console.log('\n=== Operating System Data ===');
            console.log('Name:', systemData.operatingSystem.name);
            console.log('Edition:', systemData.operatingSystem.edition);
            console.log('Version:', systemData.operatingSystem.version);
            console.log('Display Version:', systemData.operatingSystem.displayVersion);
            console.log('Build:', systemData.operatingSystem.build);
            console.log('Architecture:', systemData.operatingSystem.architecture);
            console.log('Locale:', systemData.operatingSystem.locale);
            console.log('Time Zone:', systemData.operatingSystem.timeZone);
            console.log('Active Keyboard Layout:', systemData.operatingSystem.activeKeyboardLayout);
            console.log('Feature Update:', systemData.operatingSystem.featureUpdate);
        } else {
            console.log('\n❌ No operatingSystem object found in system data');
        }
    } else {
        console.log('No system data found for device 0F33V9G25083HJ');
    }
    return client.end();
}).catch(err => {
    console.error('Error:', err);
    client.end();
    process.exit(1);
});

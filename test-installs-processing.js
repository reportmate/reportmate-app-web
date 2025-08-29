// Test the installs data processing with real data from the attachment
const { processInstallsData } = require('./src/lib/data-processing/component-data.ts');

// Real device data from the attachment (truncated for testing)
const testDeviceData = {
  "deviceId": "79349310-287D-8166-52FC-0644E27378F7",
  "serialNumber": "0F33V9G25083HJ",
  "lastSeen": "2025-08-27T05:31:41.578239+00:00",
  "clientVersion": "1.0.0",
  "modules": {
    "installs": {
      "cimian": {
        "items": [
          {
            "id": "articwolf",
            "type": "cimian",
            "itemName": "ArticWolf",
            "itemType": "unknown",
            "displayName": "ArticWolf",
            "updateCount": 0,
            "failureCount": 0,
            "installCount": 0,
            "currentStatus": "Error",
            "installMethod": "unknown",
            "latestVersion": "Unknown",
            "totalSessions": 1,
            "recentAttempts": [
              {
                "action": "general",
                "status": "Failed",
                "timestamp": "2025-08-26T21:59:51-07:00",
                "session_id": "2025-08-26-215944"
              }
            ],
            "installedVersion": "",
            "lastAttemptStatus": "",
            "lastSeenInSession": "2025-08-26-215944",
            "installLoopDetected": false
          }
        ],
        "config": {
          "Debug": false,
          "Verbose": false,
          "Catalogs": "[]",
          "LogLevel": "",
          "RepoPath": "C:\\Users\\rchristiansen\\DevOps\\Cimian\\deployment",
          "CachePath": "C:\\ProgramData\\ManagedInstalls\\cache",
          "CheckOnly": false,
          "CloudBucket": "",
          "DefaultArch": "x64,arm64",
          "InstallPath": "",
          "NoPreflight": false,
          "CatalogsPath": "C:\\ProgramData\\ManagedInstalls\\catalogs",
          "CloudProvider": "none",
          "DefaultCatalog": "Development",
          "ForceBasicAuth": false,
          "LocalManifests": "[]",
          "SoftwareRepoURL": "https://cimian.ecuad.ca/deployment",
          "ClientIdentifier": "Assigned/Staff/IT/B1115/RodChristiansen",
          "OpenImportedYaml": true,
          "LocalOnlyManifest": "",
          "PreflightFailureAction": "",
          "PostflightFailureAction": ""
        },
        "events": [
          {
            "error": "",
            "level": "ERROR",
            "action": "",
            "status": "Failed",
            "message": "Item not found in any catalog",
            "package": "ArticWolf",
            "version": "",
            "eventType": "general",
            "sessionId": "2025-08-26-215944",
            "timestamp": "2025-08-26T21:59:51-07:00"
          }
        ],
        "version": "25.8.24.1113",
        "pendingPackages": [
          "CimianPreflight",
          "FortiClient-VPN",
          "ArticWolf",
          "Chrome",
          "Zoom",
          "Cimian",
          "CimianAuth"
        ],
        "collectedAt": "2025-08-27T05:31:41.578239+00:00",
        "lastCheckIn": "2025-08-27T05:31:35.1490585Z"
      }
    }
  }
};

console.log('Testing processInstallsData with real device data...');
console.log('=====================================');

try {
  const result = processInstallsData(testDeviceData);
  
  console.log('✅ Processing completed successfully!');
  console.log('📊 Results:');
  console.log(`   Total Packages: ${result.totalPackages}`);
  console.log(`   Installed: ${result.installed}`);
  console.log(`   Pending: ${result.pending}`);
  console.log(`   Failed: ${result.failed}`);
  console.log(`   System: ${result.systemName}`);
  console.log(`   Last Update: ${result.lastUpdate}`);
  
  if (result.config) {
    console.log('⚙️  Configuration:');
    console.log(`   Type: ${result.config.type}`);
    console.log(`   Version: ${result.config.version}`);
    console.log(`   Repo URL: ${result.config.softwareRepoURL}`);
    console.log(`   Manifest: ${result.config.manifest}`);
    console.log(`   Run Type: ${result.config.runType}`);
    console.log(`   Duration: ${result.config.duration}`);
  }
  
  if (result.packages && result.packages.length > 0) {
    console.log('📦 Packages:');
    result.packages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.displayName} (${pkg.status}) - ${pkg.description || 'No description'}`);
    });
  }
  
  if (result.messages) {
    if (result.messages.errors && result.messages.errors.length > 0) {
      console.log('❌ Errors:');
      result.messages.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (result.messages.warnings && result.messages.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.messages.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
  }
  
} catch (error) {
  console.error('❌ Processing failed:', error.message);
  console.error(error.stack);
}
